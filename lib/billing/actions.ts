'use server';

/**
 * Server actions de créditos para el panel (Better Auth → clínica activa).
 * Comprar: solo owner/admin, nunca durante una impersonación.
 */
import { db } from '@/lib/db';
import { getAuthContext } from '@/lib/auth/context';
import { getPlatformAdmin } from '@/lib/auth/platform';
import { rateLimit } from '@/lib/security';
import { appBaseUrl, getStripe, stripeEnabled, stripeMode } from '@/lib/billing/stripe';
import { getActivePackage, listPackages, upsertPackage, type CreditPackageRow } from '@/lib/billing/packages';
import { fulfillCheckoutSession, type PurchaseRow } from '@/lib/billing/purchases';

export interface PublicPackage {
    id: string;
    name: string;
    credits: number;
    priceCents: number;
    currency: string;
    badge: string | null;
    highlight: boolean;
}

export interface PurchaseSummary {
    id: string;
    createdAt: string;
    packageName: string;
    credits: number;
    amountCents: number;
    currency: string;
    status: PurchaseRow['status'];
    receiptUrl: string | null;
}

export interface BillingOverview {
    clinic: { id: string; name: string; credit_balance: number } | null;
    costs: Array<{ action: string; credits: number }>;
    packages: PublicPackage[];
    purchases: PurchaseSummary[];
    recentLedger: Array<{ created_at: string; action: string | null; kind: string; credits_delta: number; balance_after: number }>;
    stripeEnabled: boolean;
    stripeMode: 'live' | 'test' | null;
    canBuy: boolean;
}

const toPublic = (p: CreditPackageRow): PublicPackage => ({
    id: p.id, name: p.name, credits: p.credits, priceCents: p.price_cents, currency: p.currency, badge: p.badge, highlight: p.highlight,
});

const toSummary = (p: PurchaseRow): PurchaseSummary => ({
    id: p.id, createdAt: p.created_at, packageName: p.package_name, credits: p.credits, amountCents: p.amount_cents,
    currency: p.currency, status: p.status, receiptUrl: p.receipt_url,
});

export async function getBillingOverview(): Promise<BillingOverview> {
    const ctx = await getAuthContext();
    const clinic = ctx?.clinic ?? null;
    const [costs, packages] = await Promise.all([
        db.query<{ action: string; credits: number }>('SELECT action, credits FROM credit_costs ORDER BY action', []),
        listPackages(),
    ]);

    let recentLedger: BillingOverview['recentLedger'] = [];
    let purchases: PurchaseSummary[] = [];
    if (clinic) {
        const [ledger, buys] = await Promise.all([
            db.query(`SELECT created_at, action, kind, credits_delta, balance_after FROM credit_ledger
                      WHERE clinic_id = $1 ORDER BY created_at DESC LIMIT 25`, [clinic.id]),
            db.query<PurchaseRow>(`SELECT * FROM credit_purchases WHERE clinic_id = $1 AND status <> 'pending'
                      ORDER BY created_at DESC LIMIT 20`, [clinic.id]),
        ]);
        recentLedger = ledger.rows as BillingOverview['recentLedger'];
        purchases = buys.rows.map(toSummary);
    }

    const canBuy = Boolean(clinic && !ctx?.impersonatedBy && (!ctx?.role || ['owner', 'admin'].includes(ctx.role)));
    return {
        clinic: clinic ? { id: clinic.id, name: clinic.name, credit_balance: clinic.credit_balance } : null,
        costs: costs.rows,
        packages: packages.map(toPublic),
        purchases,
        recentLedger,
        stripeEnabled: stripeEnabled(),
        stripeMode: stripeMode(),
        canBuy,
    };
}

/**
 * Crea la compra en la base de datos y una sesión de Stripe Checkout con el
 * importe calculado aquí. Devuelve la URL de pago (dominio checkout.stripe.com).
 */
export async function createCheckoutSession(packageId: string): Promise<{ url?: string; error?: string }> {
    const ctx = await getAuthContext();
    if (!ctx) return { error: 'Tu sesión expiró. Vuelve a entrar.' };
    if (!ctx.clinic) return { error: 'Selecciona una clínica primero.' };
    if (ctx.impersonatedBy) return { error: 'No disponible durante una impersonación (solo lectura).' };
    if (ctx.role && !['owner', 'admin'].includes(ctx.role)) return { error: 'Solo los administradores de la clínica pueden comprar créditos.' };
    if (!stripeEnabled()) return { error: 'Los pagos aún no están activados.' };
    if (!rateLimit(`checkout:${ctx.clinic.id}`, 8, 60 * 60_000)) {
        return { error: 'Demasiados intentos de compra. Espera unos minutos.' };
    }

    const pkg = await getActivePackage(packageId);
    if (!pkg) return { error: 'Ese paquete ya no está disponible.' };
    const base = appBaseUrl();
    if (!/^https:\/\//.test(base) && process.env.NODE_ENV === 'production') {
        return { error: 'Configuración de URL incompleta.' };
    }

    try {
        const purchase = await db.queryOne<PurchaseRow>(
            `INSERT INTO credit_purchases (clinic_id, user_id, package_id, package_name, credits, amount_cents, currency)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [ctx.clinic.id, ctx.userId ?? null, pkg.id, pkg.name, pkg.credits, pkg.price_cents, pkg.currency]
        );
        if (!purchase) return { error: 'No se pudo iniciar la compra.' };

        const stripe = getStripe();
        let customerId = ctx.clinic.stripe_customer_id;
        if (!customerId) {
            const customer = await stripe.customers.create(
                { name: ctx.clinic.name, email: ctx.email || undefined, metadata: { clinic_id: ctx.clinic.id } },
                { idempotencyKey: `customer:${ctx.clinic.id}` }
            );
            customerId = customer.id;
            await db.query('UPDATE clinics SET stripe_customer_id = $1 WHERE id = $2 AND stripe_customer_id IS NULL', [customerId, ctx.clinic.id]);
        }

        const description = `${pkg.credits} créditos para simulaciones de sonrisa`;
        const session = await stripe.checkout.sessions.create(
            {
                mode: 'payment',
                customer: customerId,
                client_reference_id: purchase.id,
                locale: 'es',
                line_items: [{
                    quantity: 1,
                    price_data: {
                        currency: pkg.currency,
                        unit_amount: pkg.price_cents,
                        product_data: { name: `Smile Fast · Paquete ${pkg.name}`, description },
                    },
                }],
                metadata: { purchase_id: purchase.id, clinic_id: ctx.clinic.id, package_id: pkg.id },
                payment_intent_data: { description, metadata: { purchase_id: purchase.id, clinic_id: ctx.clinic.id } },
                success_url: `${base}/administracion/creditos?compra=${purchase.id}&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${base}/administracion/creditos?compra=${purchase.id}&estado=cancelada`,
                expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
            },
            { idempotencyKey: `checkout:${purchase.id}` }
        );

        await db.query('UPDATE credit_purchases SET stripe_session_id = $1, updated_at = now() WHERE id = $2', [session.id, purchase.id]);
        if (!session.url?.startsWith('https://checkout.stripe.com/')) return { error: 'No se pudo abrir el pago.' };
        return { url: session.url };
    } catch (e) {
        console.error('[billing] createCheckoutSession failed:', e);
        return { error: 'No se pudo abrir el pago. Inténtalo de nuevo en unos minutos.' };
    }
}

/**
 * Estado de una compra de la clínica activa (para la vuelta desde Stripe).
 * Si sigue pendiente, consulta a Stripe y acredita si ya está pagada.
 */
export async function getPurchaseStatus(purchaseId: string): Promise<
    { ok: true; status: PurchaseRow['status']; credits: number; balance: number } | { ok: false; error: string }
> {
    if (typeof purchaseId !== 'string' || !/^[0-9a-f-]{36}$/i.test(purchaseId)) return { ok: false, error: 'Compra no encontrada.' };
    const ctx = await getAuthContext();
    if (!ctx?.clinic) return { ok: false, error: 'Sesión no válida.' };
    if (!rateLimit(`purchase-status:${ctx.clinic.id}`, 60, 10 * 60_000)) return { ok: false, error: 'Demasiadas consultas.' };

    let purchase = await db.queryOne<PurchaseRow>('SELECT * FROM credit_purchases WHERE id = $1 AND clinic_id = $2', [purchaseId, ctx.clinic.id]);
    if (!purchase) return { ok: false, error: 'Compra no encontrada.' };

    if (purchase.status === 'pending' && purchase.stripe_session_id && stripeEnabled()) {
        try {
            const r = await fulfillCheckoutSession(purchase.stripe_session_id);
            if (r.purchase) purchase = r.purchase;
        } catch (e) {
            console.error('[billing] getPurchaseStatus fulfill failed:', e);
        }
    }
    const bal = await db.queryOne<{ credit_balance: number }>('SELECT credit_balance FROM clinics WHERE id = $1', [ctx.clinic.id]);
    return { ok: true, status: purchase.status, credits: purchase.credits, balance: bal?.credit_balance ?? 0 };
}

// ── Superadmin: catálogo de paquetes ───────────────────────────────────────

export async function listAllPackagesAction(): Promise<CreditPackageRow[] | { error: string }> {
    if (!(await getPlatformAdmin())) return { error: 'No autorizado.' };
    return listPackages({ includeInactive: true });
}

export async function savePackageAction(p: Partial<CreditPackageRow>): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!(await getPlatformAdmin())) return { ok: false, error: 'No autorizado.' };
    const err = await upsertPackage(p);
    return err ? { ok: false, error: err } : { ok: true };
}
