'use server';

/**
 * Datos y acciones del panel de plataforma (super-admin).
 * Todo exige requirePlatformAdmin().
 */
import { db } from '@/lib/db';
import { requirePlatformAdmin } from '@/lib/auth/platform';
import { adjustCredits } from '@/lib/billing/credits';
import { logAudit } from '@/lib/services/backendService';
import { stripeEnabled } from '@/lib/billing/stripe';
import { flexpriceEnabled } from '@/lib/billing/flexprice';
import { revalidatePath } from 'next/cache';

export interface PlatformOverview {
    clinics: number;
    users: number;
    creditsInCirculation: number;
    creditsSold: number;       // suma de topups
    creditsAdjusted: number;   // suma de ajustes manuales
    images: number;
    videos: number;
    leads: number;
    revenueCents: number; // ingresos reales (Stripe) registrados en topups
    plans: Array<{ plan: string; count: number }>;
}

export async function getPlatformOverview(): Promise<PlatformOverview> {
    await requirePlatformAdmin();
    const q = async (sql: string) => (await db.queryOne<{ n: string }>(sql, []))?.n ?? '0';

    const [clinics, users, circ, sold, adj, images, videos, leads, revenue] = await Promise.all([
        q('SELECT count(*)::text n FROM clinics'),
        q('SELECT count(*)::text n FROM "user"'),
        q('SELECT COALESCE(sum(credit_balance),0)::text n FROM clinics'),
        q("SELECT COALESCE(sum(credits_delta),0)::text n FROM credit_ledger WHERE kind='topup'"),
        q("SELECT COALESCE(sum(credits_delta),0)::text n FROM credit_ledger WHERE kind='adjust'"),
        q("SELECT count(*)::text n FROM generations WHERE type='image'"),
        q("SELECT count(*)::text n FROM generations WHERE type='video'"),
        q('SELECT count(*)::text n FROM leads'),
        q("SELECT COALESCE(sum(amount_cents),0)::text n FROM credit_purchases WHERE status = 'paid'"),
    ]);
    const plans = await db.query<{ plan: string; count: number }>(
        'SELECT plan, count(*)::int AS count FROM clinics GROUP BY plan ORDER BY count DESC',
        []
    );

    return {
        clinics: +clinics, users: +users, creditsInCirculation: +circ,
        creditsSold: +sold, creditsAdjusted: +adj, images: +images, videos: +videos,
        leads: +leads, revenueCents: Math.round(+revenue), plans: plans.rows,
    };
}

// ── Series de uso (últimos 30 días) ─────────────────────────────────────────
export async function getUsageSeries(): Promise<Array<{ date: string; images: number; videos: number }>> {
    await requirePlatformAdmin();
    const r = await db.query<{ date: string; type: string; n: number }>(
        `SELECT to_char(created_at::date,'YYYY-MM-DD') AS date, type, count(*)::int AS n
         FROM generations
         WHERE created_at >= now() - interval '30 days' AND type IN ('image','video')
         GROUP BY 1,2 ORDER BY 1`,
        []
    );
    const map = new Map<string, { date: string; images: number; videos: number }>();
    for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        map.set(d, { date: d, images: 0, videos: 0 });
    }
    for (const row of r.rows) {
        const e = map.get(row.date);
        if (e) { if (row.type === 'image') e.images = row.n; else e.videos = row.n; }
    }
    return [...map.values()];
}

// ── Usuarios (todas las clínicas) ───────────────────────────────────────────
export interface PlatformUser {
    id: string; email: string; name: string | null; createdAt: string;
    orgs: number; clinics: string; banned: boolean; role: string | null;
}
export async function getAllUsers(search?: string): Promise<PlatformUser[]> {
    await requirePlatformAdmin();
    const like = `%${(search || '').toLowerCase()}%`;
    const r = await db.query<PlatformUser>(
        `SELECT u.id, u.email, u.name, u."createdAt" AS "createdAt",
                COALESCE(u.banned, false) AS banned, u.role,
                (SELECT count(*)::int FROM member m WHERE m."userId" = u.id) AS orgs,
                COALESCE((SELECT string_agg(o.name, ', ') FROM member m
                          JOIN organization o ON o.id = m."organizationId" WHERE m."userId" = u.id), '') AS clinics
         FROM "user" u
         WHERE ($1 = '%%' OR lower(u.email) LIKE $1 OR lower(coalesce(u.name,'')) LIKE $1)
         ORDER BY u."createdAt" DESC LIMIT 200`,
        [like]
    );
    return r.rows;
}

// ── Audit log de plataforma ─────────────────────────────────────────────────
export async function getPlatformAudit(): Promise<Array<{ created_at: string; action: string; details: any }>> {
    await requirePlatformAdmin();
    const r = await db.query(
        `SELECT created_at, action, details FROM audit_logs
         WHERE action LIKE 'PLATFORM_%' ORDER BY created_at DESC LIMIT 100`,
        []
    );
    return r.rows as any;
}

// ── Suspender / activar clínica ─────────────────────────────────────────────
export async function setClinicStatus(clinicId: string, status: 'active' | 'suspended'): Promise<{ ok: boolean; error?: string }> {
    try {
        const actor = await requirePlatformAdmin();
        await db.query('UPDATE clinics SET status = $1 WHERE id = $2', [status, clinicId]);
        await logAudit('PLATFORM_SET_STATUS', { clinicId, status, actor });
        revalidatePath('/superadmin');
        revalidatePath(`/superadmin/clinicas/${clinicId}`);
        return { ok: true };
    } catch (e: any) {
        return { ok: false, error: e.message };
    }
}

// ── Configuración: costos de crédito + salud del sistema ────────────────────
export async function getCreditCosts(): Promise<Array<{ action: string; credits: number }>> {
    await requirePlatformAdmin();
    const r = await db.query<{ action: string; credits: number }>('SELECT action, credits FROM credit_costs ORDER BY action', []);
    return r.rows;
}

export async function setCreditCost(action: string, credits: number): Promise<{ ok: boolean; error?: string }> {
    try {
        const actor = await requirePlatformAdmin();
        if (!['image', 'video'].includes(action) || !Number.isInteger(credits) || credits < 0) {
            return { ok: false, error: 'Datos inválidos' };
        }
        await db.query(
            `INSERT INTO credit_costs (action, credits) VALUES ($1, $2)
             ON CONFLICT (action) DO UPDATE SET credits = EXCLUDED.credits, updated_at = now()`,
            [action, credits]
        );
        await logAudit('PLATFORM_SET_COST', { action, credits, actor });
        revalidatePath('/superadmin/config');
        return { ok: true };
    } catch (e: any) {
        return { ok: false, error: e.message };
    }
}

/** Registra en auditoría el inicio de una impersonación (acción sensible). */
export async function logImpersonationStart(targetUserId: string, targetEmail: string): Promise<void> {
    try {
        const actor = await requirePlatformAdmin();
        await logAudit('PLATFORM_IMPERSONATE', { actor, targetUserId, targetEmail });
    } catch (e) {
        console.error('[platform] logImpersonationStart failed:', e);
    }
}

export async function getSystemHealth(): Promise<Record<string, boolean>> {
    await requirePlatformAdmin();
    let dbOk = false;
    try { await db.query('SELECT 1', []); dbOk = true; } catch { dbOk = false; }
    return {
        database: dbOk,
        stripe: stripeEnabled(),
        flexprice: flexpriceEnabled(),
        google: Boolean(process.env.GOOGLE_API_KEY),
        smtp: Boolean(process.env.SMTP_HOSTNAME && process.env.SMTP_USER && process.env.SMTP_PASS),
    };
}

export interface ClinicRow {
    id: string; name: string; slug: string; plan: string; status: string;
    credit_balance: number; created_at: string; org_id: string | null;
    members: number; leads: number; images: number; videos: number;
}

export async function getClinicsList(): Promise<ClinicRow[]> {
    await requirePlatformAdmin();
    const r = await db.query<ClinicRow>(
        `SELECT c.id, c.name, c.slug, c.plan, c.status, c.credit_balance,
                c.created_at, c.org_id,
                (SELECT count(*)::int FROM member m WHERE m."organizationId" = c.org_id) AS members,
                (SELECT count(*)::int FROM leads l WHERE l.clinic_id = c.id) AS leads,
                (SELECT count(*)::int FROM generations g WHERE g.clinic_id = c.id AND g.type='image') AS images,
                (SELECT count(*)::int FROM generations g WHERE g.clinic_id = c.id AND g.type='video') AS videos
         FROM clinics c
         ORDER BY c.created_at DESC`,
        []
    );
    return r.rows;
}

export interface ClinicDetail extends ClinicRow {
    public_widget_key: string;
    stripe_customer_id: string | null;
    flexprice_customer_id: string | null;
    membersList: Array<{ email: string; role: string; createdAt: string }>;
    ledger: Array<{ created_at: string; action: string | null; kind: string; credits_delta: number; balance_after: number }>;
}

export async function getClinicDetail(clinicId: string): Promise<ClinicDetail | null> {
    await requirePlatformAdmin();
    const c = await db.queryOne<any>(
        `SELECT c.*,
                (SELECT count(*)::int FROM member m WHERE m."organizationId" = c.org_id) AS members,
                (SELECT count(*)::int FROM leads l WHERE l.clinic_id = c.id) AS leads,
                (SELECT count(*)::int FROM generations g WHERE g.clinic_id = c.id AND g.type='image') AS images,
                (SELECT count(*)::int FROM generations g WHERE g.clinic_id = c.id AND g.type='video') AS videos
         FROM clinics c WHERE c.id = $1`,
        [clinicId]
    );
    if (!c) return null;

    const members = c.org_id
        ? await db.query<{ email: string; role: string; createdAt: string }>(
              `SELECT u.email, m.role, m."createdAt"
               FROM member m JOIN "user" u ON u.id = m."userId"
               WHERE m."organizationId" = $1 ORDER BY m."createdAt"`,
              [c.org_id]
          )
        : { rows: [] as any[] };

    const ledger = await db.query(
        `SELECT created_at, action, kind, credits_delta, balance_after
         FROM credit_ledger WHERE clinic_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [clinicId]
    );

    return { ...c, membersList: members.rows, ledger: ledger.rows } as ClinicDetail;
}

// ── Acciones ────────────────────────────────────────────────────────────────
export async function setClinicPlan(clinicId: string, plan: string): Promise<{ ok: boolean; error?: string }> {
    try {
        await requirePlatformAdmin();
        const allowed = ['free', 'starter', 'pro', 'enterprise'];
        if (!allowed.includes(plan)) return { ok: false, error: 'Plan inválido' };
        await db.query('UPDATE clinics SET plan = $1 WHERE id = $2', [plan, clinicId]);
        await logAudit('PLATFORM_SET_PLAN', { clinicId, plan, actor: await requirePlatformAdmin() });
        revalidatePath('/superadmin');
        revalidatePath(`/superadmin/clinicas/${clinicId}`);
        return { ok: true };
    } catch (e: any) {
        return { ok: false, error: e.message };
    }
}

export async function grantClinicCredits(
    clinicId: string, delta: number, reason: string
): Promise<{ ok: boolean; balanceAfter?: number; error?: string }> {
    try {
        const actor = await requirePlatformAdmin();
        const res = await adjustCredits({ clinicId, delta, reason: reason || 'ajuste manual', actor });
        if (!res.ok) return { ok: false, error: res.reason === 'insufficient' ? 'Saldo insuficiente para descontar' : (res.reason || 'error') };
        await logAudit('PLATFORM_ADJUST_CREDITS', { clinicId, delta, reason, actor, balanceAfter: res.balanceAfter });
        revalidatePath('/superadmin');
        revalidatePath(`/superadmin/clinicas/${clinicId}`);
        return { ok: true, balanceAfter: res.balanceAfter };
    } catch (e: any) {
        return { ok: false, error: e.message };
    }
}
