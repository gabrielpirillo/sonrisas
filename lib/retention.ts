/**
 * Retención, borrado y portabilidad de datos de pacientes.
 *
 * - runRetention(): job periódico (cron protegido + instrumentation cada 6 h).
 *     1. Bajas de clínica vencidas (30 días tras la solicitud) → borrado total.
 *     2. Leads más antiguos que clinics.retention_leads_days → borrado total.
 *     3. Simulaciones (imágenes/vídeos) más antiguas que retention_photos_days
 *        → se borran los archivos y se ponen a NULL las rutas en la BD.
 *     4. Selfies originales (bucket uploads) con más de 24 h → borradas.
 *     5. Red de seguridad: archivos generados con más de 365 días (máximo
 *        permitido) aunque no estén referenciados.
 *   Deja una entrada en audit_logs solo con contadores (sin datos personales).
 * - eraseLeads(): derecho de supresión (lead + simulaciones + consentimientos
 *   + análisis + archivos). Lo usan el panel, el job y la baja de clínica.
 * - exportLeadData(): derecho de acceso/portabilidad (JSON).
 *
 * Nunca se borra un archivo que otra fila sigue referenciando (p. ej. las
 * imágenes de demo compartidas) ni los prefijos protegidos (logos de clínica).
 */
import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { iterateAllFiles, deleteKeysBatched } from '@/lib/storage';
import { SIGNED_URL_TTL, appOrigin, signStoredRef } from '@/lib/signedUrl';
import { RETENTION_LIMITS, UPLOAD_TTL_HOURS, CLINIC_DELETION_GRACE_DAYS } from '@/lib/retentionLimits';

/** Igual que lib/auth/platform, sin arrastrar la capa de auth (el job corre sin petición). */
function isPlatformAdminEmail(email: string): boolean {
    const list = (process.env.PLATFORM_ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    return list.includes(email.toLowerCase());
}

// ── Referencias a archivos ────────────────────────────────────────────────
type Bucket = 'generated' | 'uploads';
const BUCKETS: Bucket[] = ['generated', 'uploads'];

/** Prefijos que nunca borra la retención: logos de clínica y recursos de demo compartidos. */
const PROTECTED_PREFIXES: Record<Bucket, string[]> = {
    uploads: ['branding/'],
    generated: ['demo/'],
};

export interface StorageRef {
    bucket: Bucket;
    key: string;
    /** Clave cuya referencia en BD protege a esta (variantes derivadas, p. ej. _watermarked). */
    guard?: string;
}

const isProtected = (r: StorageRef) => PROTECTED_PREFIXES[r.bucket].some((p) => r.key.startsWith(p));

/**
 * Convierte lo que guarda la BD (clave suelta, /api/storage/<bucket>/<key>,
 * URL completa del proxy o de MinIO, formato Supabase) en {bucket, key}.
 * Una clave suelta es ambigua: se devuelve una referencia por cada bucket
 * candidato (borrar una clave inexistente no falla).
 */
export function parseStorageRef(ref: unknown, fallbackBuckets: Bucket[]): StorageRef[] {
    if (typeof ref !== 'string') return [];
    let s = ref.trim();
    if (!s || s === 'unknown' || s.startsWith('data:') || s.startsWith('blob:')) return [];

    const fromPath = (path: string): StorageRef[] => {
        const parts = path.split('/').filter(Boolean).map((p) => {
            try { return decodeURIComponent(p); } catch { return p; }
        });
        const [bucket, ...rest] = parts;
        if (!bucket || rest.length === 0 || !BUCKETS.includes(bucket as Bucket)) return [];
        const key = rest.join('/');
        if (key.includes('..')) return [];
        return [{ bucket: bucket as Bucket, key }];
    };

    s = s.split('#')[0];
    const supa = s.indexOf('/storage/v1/object/public/');
    if (supa >= 0) return fromPath(s.slice(supa + '/storage/v1/object/public/'.length).split('?')[0]);

    let pathname: string | null = null;
    if (/^https?:\/\//i.test(s)) {
        try { pathname = new URL(s).pathname; } catch { return []; }
    } else if (s.startsWith('/')) {
        pathname = s.split('?')[0];
    }
    if (pathname !== null) {
        const api = pathname.indexOf('/api/storage/');
        if (api >= 0) return fromPath(pathname.slice(api + '/api/storage/'.length));
        return fromPath(pathname); // URL directa de MinIO: /<bucket>/<key>
    }

    const key = s.split('?')[0].replace(/^\/+/, '');
    if (!key || key.includes('..')) return [];
    return fallbackBuckets.map((bucket) => ({ bucket, key }));
}

/** Busca rutas de almacenamiento dentro del JSON de metadata (escenas, fuentes…). */
function refsInMetadata(meta: unknown, depth = 0): StorageRef[] {
    if (depth > 4 || meta == null) return [];
    if (typeof meta === 'string') {
        return meta.includes('/api/storage/') || meta.includes('/storage/v1/object/public/')
            ? parseStorageRef(meta, [])
            : [];
    }
    if (Array.isArray(meta)) return meta.flatMap((m) => refsInMetadata(m, depth + 1));
    if (typeof meta === 'object') return Object.values(meta as Record<string, unknown>).flatMap((m) => refsInMetadata(m, depth + 1));
    return [];
}

interface GenRow {
    id: string;
    type: string | null;
    input_path: string | null;
    output_path: string | null;
    metadata: unknown;
}

/** Todos los archivos asociados a una generación (salida, entrada, marca de agua, escenas). */
function refsForGeneration(g: GenRow): StorageRef[] {
    const out: StorageRef[] = [];
    for (const r of parseStorageRef(g.output_path, ['generated'])) {
        out.push(r);
        if (r.bucket === 'generated' && /\.(jpe?g|png|webp)$/i.test(r.key) && !/_watermarked\.jpg$/i.test(r.key)) {
            out.push({ bucket: 'generated', key: r.key.replace(/\.(jpe?g|png|webp)$/i, '') + '_watermarked.jpg', guard: r.key });
        }
    }
    // Imagen: la entrada suele ser la selfie (uploads); vídeo: la escena generada.
    out.push(...parseStorageRef(g.input_path, g.type === 'video' ? ['generated'] : ['uploads', 'generated']));
    out.push(...refsInMetadata(g.metadata));
    return out;
}

function dedupeRefs(refs: StorageRef[]): StorageRef[] {
    const seen = new Map<string, StorageRef>();
    for (const r of refs) {
        const id = `${r.bucket}:${r.key}`;
        if (!seen.has(id)) seen.set(id, r);
    }
    return [...seen.values()];
}

/**
 * Quita las referencias que alguna fila que NO se va a borrar sigue usando
 * (generaciones o leads fuera de los conjuntos excluidos) y los prefijos protegidos.
 */
async function onlyUnreferenced(refs: StorageRef[], excludeGenIds: string[], excludeLeadIds: string[]): Promise<StorageRef[]> {
    const candidates = dedupeRefs(refs).filter((r) => !isProtected(r));
    if (candidates.length === 0) return [];
    const guards = Array.from(new Set(candidates.map((r) => r.guard ?? r.key)));
    const res = await db.query<{ k: string }>(
        `SELECT k FROM unnest($1::text[]) AS k
         WHERE EXISTS (
                SELECT 1 FROM generations g
                 WHERE NOT (g.id = ANY($2::uuid[]))
                   AND (g.output_path = k OR g.input_path = k
                        OR right(g.output_path, length(k) + 1) = '/' || k
                        OR right(split_part(g.input_path, '?', 1), length(k) + 1) = '/' || k
                        OR right(split_part(g.output_path, '?', 1), length(k) + 1) = '/' || k))
            OR EXISTS (
                SELECT 1 FROM leads l
                 WHERE NOT (l.id = ANY($3::uuid[]))
                   AND (l.video_path = k OR right(l.video_path, length(k) + 1) = '/' || k))`,
        [guards, excludeGenIds, excludeLeadIds]
    );
    const stillUsed = new Set(res.rows.map((r) => r.k));
    return candidates.filter((r) => !stillUsed.has(r.guard ?? r.key));
}

/** Borra los archivos agrupados por bucket. Lanza si falla el almacenamiento. */
async function deleteRefs(refs: StorageRef[]): Promise<number> {
    let n = 0;
    for (const bucket of BUCKETS) {
        const keys = refs.filter((r) => r.bucket === bucket).map((r) => r.key);
        if (keys.length > 0) n += await deleteKeysBatched(bucket, keys);
    }
    return n;
}

// ── Auditoría sin datos personales ────────────────────────────────────────
/** Hash estable e irreversible del id del lead (para auditoría sin datos personales). */
export function leadIdHash(leadId: string): string {
    const secret = process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'smilefast';
    return createHash('sha256').update(`lead:${leadId}:${secret}`).digest('hex').slice(0, 24);
}

async function audit(action: string, details: Record<string, unknown>, userId?: string | null) {
    try {
        await db.query('INSERT INTO audit_logs (action, details, user_id) VALUES ($1, $2, $3)', [
            action,
            JSON.stringify(details),
            userId ?? null,
        ]);
    } catch (e) {
        console.error('[retention] no se pudo registrar la auditoría', e);
    }
}

// ── Supresión de leads ────────────────────────────────────────────────────
export interface EraseResult {
    leads: number;
    generations: number;
    files: number;
}

/**
 * Borra por completo leads (ficha, simulaciones, análisis, consentimientos,
 * entradas de auditoría que los mencionan y todos sus archivos).
 * Si se pasa clinicId, solo actúa sobre leads de esa clínica.
 * Lanza si falla el borrado de archivos (para no dejar archivos huérfanos sin
 * rastro): el llamador puede reintentar.
 */
export async function eraseLeads(leadIds: string[], opts: { clinicId?: string } = {}): Promise<EraseResult> {
    if (leadIds.length === 0) return { leads: 0, generations: 0, files: 0 };
    const leads = await db.query<{ id: string; video_path: string | null }>(
        `SELECT id, video_path FROM leads WHERE id = ANY($1::uuid[]) ${opts.clinicId ? 'AND clinic_id = $2' : ''}`,
        opts.clinicId ? [leadIds, opts.clinicId] : [leadIds]
    );
    const ids = leads.rows.map((l) => l.id);
    if (ids.length === 0) return { leads: 0, generations: 0, files: 0 };

    const gens = await db.query<GenRow>(
        'SELECT id, type, input_path, output_path, metadata FROM generations WHERE lead_id = ANY($1::uuid[])',
        [ids]
    );
    const analysis = await db.query<{ img: string | null }>(
        "SELECT result->>'generated_image' AS img FROM analysis_results WHERE lead_id = ANY($1::uuid[])",
        [ids]
    );

    const refs: StorageRef[] = [
        ...gens.rows.flatMap(refsForGeneration),
        ...leads.rows.flatMap((l) => parseStorageRef(l.video_path, ['generated'])),
        ...analysis.rows.flatMap((a) => parseStorageRef(a.img, ['generated'])),
    ];
    const genIds = gens.rows.map((g) => g.id);
    const toDelete = await onlyUnreferenced(refs, genIds, ids);
    const files = await deleteRefs(toDelete);

    await db.transaction(async (client) => {
        // Entradas de auditoría antiguas que guardaban el id/email del lead.
        await client.query(
            `DELETE FROM audit_logs WHERE details->>'leadId' = ANY($1::text[]) OR details->>'lead_id' = ANY($1::text[])`,
            [ids]
        );
        // generations, analysis_results y lead_consents caen por ON DELETE CASCADE.
        await client.query('DELETE FROM generations WHERE lead_id = ANY($1::uuid[])', [ids]);
        await client.query('DELETE FROM leads WHERE id = ANY($1::uuid[])', [ids]);
    });

    return { leads: ids.length, generations: genIds.length, files };
}

/** Supresión pedida desde el panel: un lead de la clínica activa, con auditoría. */
export async function eraseLeadForClinic(leadId: string, clinicId: string, actorUserId: string): Promise<EraseResult | null> {
    const owned = await db.queryOne('SELECT 1 FROM leads WHERE id = $1 AND clinic_id = $2', [leadId, clinicId]);
    if (!owned) return null;
    const result = await eraseLeads([leadId], { clinicId });
    await audit('LEAD_ERASED', {
        lead_hash: leadIdHash(leadId),
        clinic_id: clinicId,
        generations: result.generations,
        files: result.files,
    }, actorUserId);
    return result;
}

// ── Exportación (acceso / portabilidad) ───────────────────────────────────
/**
 * Enlace firmado y absoluto (válido 7 días, como en los correos) para que el
 * paciente pueda descargar sus imágenes sin sesión en el panel.
 */
function fileLink(value: unknown, bucket: Bucket): string | null {
    const ref = parseStorageRef(value, [bucket])[0];
    if (!ref) return null;
    const signed = signStoredRef(`/api/storage/${ref.bucket}/${ref.key}`, SIGNED_URL_TTL.email, ref.bucket);
    return signed ? `${appOrigin()}${signed}` : null;
}

async function tableExists(name: string): Promise<boolean> {
    const r = await db.queryOne<{ ok: boolean }>('SELECT to_regclass($1) IS NOT NULL AS ok', [`public.${name}`]);
    return Boolean(r?.ok);
}

/** Datos completos de un lead de la clínica, listos para descargar como JSON. */
export async function exportLeadData(leadId: string, clinicId: string): Promise<Record<string, unknown> | null> {
    const lead = await db.queryOne(
        `SELECT l.id, l.created_at, l.name, l.email, l.phone, l.status, l.marketing_consent,
                l.survey_data, l.custom_data, l.video_requested_at, l.video_path,
                c.name AS clinic_name, c.retention_leads_days, c.retention_photos_days
         FROM leads l JOIN clinics c ON c.id = l.clinic_id
         WHERE l.id = $1 AND l.clinic_id = $2`,
        [leadId, clinicId]
    );
    if (!lead) return null;

    const gens = await db.query<GenRow & { created_at: string; status: string | null; metadata: { purged_at?: string } | null }>(
        `SELECT id, created_at, type, status, input_path, output_path, metadata
         FROM generations WHERE lead_id = $1 ORDER BY created_at ASC`,
        [leadId]
    );
    const consents = (await tableExists('lead_consents'))
        ? (await db.query<{ kind: string; granted: boolean; text: string; version: string; created_at: string }>(
            `SELECT kind, granted, text, version, created_at FROM lead_consents
             WHERE lead_id = $1 ORDER BY created_at ASC`,
            [leadId]
        )).rows
        : [];

    const customAnswers = Object.values((lead.custom_data || {}) as Record<string, { label?: string; value?: unknown }>)
        .filter((a) => a && typeof a === 'object')
        .map((a) => ({ pregunta: a.label ?? null, respuesta: a.value ?? null }));

    return {
        formato: 'smilefast.export.v1',
        exportado_el: new Date().toISOString(),
        responsable_del_tratamiento: lead.clinic_name,
        plazos_de_conservacion: {
            ficha_dias: lead.retention_leads_days,
            simulaciones_dias: lead.retention_photos_days,
            selfie_original_horas: UPLOAD_TTL_HOURS,
        },
        paciente: {
            id: lead.id,
            creado_el: lead.created_at,
            nombre: lead.name,
            email: lead.email,
            telefono: lead.phone,
            estado: lead.status,
            acepta_comunicaciones: lead.marketing_consent,
            pidio_video_el: lead.video_requested_at,
        },
        cuestionario: lead.survey_data ?? {},
        respuestas_personalizadas: customAnswers,
        consentimientos: consents.map((c) => ({
            tipo: c.kind,
            otorgado: c.granted,
            texto: c.text,
            version: c.version,
            fecha: c.created_at,
        })),
        simulaciones: gens.rows.map((g) => ({
            id: g.id,
            creada_el: g.created_at,
            tipo: g.type,
            estado: g.status,
            archivo: fileLink(g.output_path, 'generated'),
            imagen_original: fileLink(g.input_path, g.type === 'video' ? 'generated' : 'uploads'),
            eliminada_por_retencion: Boolean(g.metadata?.purged_at),
        })),
        video_compartido: fileLink(lead.video_path, 'generated'),
        nota: 'Los enlaces a imágenes y vídeos caducan a los 7 días y solo funcionan mientras los archivos se conserven según los plazos indicados.',
    };
}

// ── Job de retención ──────────────────────────────────────────────────────
export interface RetentionReport {
    skipped?: 'locked';
    uploads_deleted: number;
    selfie_sessions_deleted: number;
    photos_purged: number;
    photo_files_deleted: number;
    generated_orphans_deleted: number;
    leads_deleted: number;
    lead_files_deleted: number;
    clinics_deleted: number;
    ai_audit_entries_deleted: number;
    errors: number;
    duration_ms: number;
}

const BATCH = 200;

/** Selfies originales: todo lo del bucket uploads con más de 24 h (salvo logos). */
async function sweepUploads(report: RetentionReport, now: Date) {
    const cutoff = now.getTime() - UPLOAD_TTL_HOURS * 3_600_000;
    let pending: string[] = [];
    const flush = async () => {
        if (pending.length === 0) return;
        report.uploads_deleted += await deleteKeysBatched('uploads', pending);
        pending = [];
    };
    for await (const f of iterateAllFiles('uploads')) {
        if (f.key === '.emptyFolderPlaceholder') continue;
        if (PROTECTED_PREFIXES.uploads.some((p) => f.key.startsWith(p))) continue;
        if (!f.lastModified || f.lastModified.getTime() > cutoff) continue;
        pending.push(f.key);
        if (pending.length >= 1000) await flush();
    }
    await flush();

    // Referencias en BD a selfies ya borradas.
    await db.query(
        `UPDATE generations SET input_path = NULL
         WHERE input_path IS NOT NULL AND created_at < $1
           AND (input_path LIKE '%/api/storage/uploads/%' OR input_path LIKE '%/uploads/%')`,
        [new Date(cutoff)]
    );
    const s = await db.query('DELETE FROM selfie_sessions WHERE created_at < $1', [new Date(cutoff)]);
    report.selfie_sessions_deleted += s.rowCount ?? 0;
}

/** Simulaciones de una clínica más antiguas que su plazo: archivos fuera, rutas a NULL. */
async function purgePhotos(report: RetentionReport, clinicId: string | null, days: number) {
    for (let guard = 0; guard < 1000; guard++) {
        const rows = await db.query<GenRow>(
            `SELECT g.id, g.type, g.input_path, g.output_path, g.metadata
             FROM generations g LEFT JOIN leads l ON l.id = g.lead_id
             WHERE COALESCE(g.clinic_id, l.clinic_id) IS NOT DISTINCT FROM $1
               AND g.created_at < now() - make_interval(days => $2)
               AND (g.output_path IS NOT NULL OR g.input_path IS NOT NULL)
               AND COALESCE(g.metadata->>'demo', '') <> 'true'
             ORDER BY g.created_at ASC
             LIMIT ${BATCH}`,
            [clinicId, days]
        );
        if (rows.rows.length === 0) return;
        const ids = rows.rows.map((r) => r.id);
        const toDelete = await onlyUnreferenced(rows.rows.flatMap(refsForGeneration), ids, []);
        report.photo_files_deleted += await deleteRefs(toDelete);

        const outputs = rows.rows.map((r) => r.output_path).filter((p): p is string => Boolean(p));
        await db.query(
            `UPDATE generations
                SET input_path = NULL, output_path = NULL,
                    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('purged_at', now(), 'purged_reason', 'retention')
              WHERE id = ANY($1::uuid[])`,
            [ids]
        );
        if (outputs.length > 0) {
            await db.query('UPDATE leads SET video_path = NULL WHERE video_path = ANY($1::text[])', [outputs]);
        }
        report.photos_purged += ids.length;
        if (rows.rows.length < BATCH) return;
    }
}

/** Leads de una clínica (o sin clínica) más antiguos que su plazo: borrado total. */
async function purgeLeads(report: RetentionReport, clinicId: string | null, days: number) {
    for (let guard = 0; guard < 1000; guard++) {
        const rows = await db.query<{ id: string }>(
            `SELECT id FROM leads
             WHERE clinic_id IS NOT DISTINCT FROM $1 AND created_at < now() - make_interval(days => $2)
             ORDER BY created_at ASC LIMIT 100`,
            [clinicId, days]
        );
        if (rows.rows.length === 0) return;
        const r = await eraseLeads(rows.rows.map((x) => x.id));
        report.leads_deleted += r.leads;
        report.lead_files_deleted += r.files;
        if (rows.rows.length < 100) return;
    }
}

/** Red de seguridad: nada generado sobrevive más allá del plazo máximo permitido. */
async function sweepGeneratedBackstop(report: RetentionReport, now: Date) {
    const cutoff = now.getTime() - RETENTION_LIMITS.photos.max * 86_400_000;
    let pending: string[] = [];
    for await (const f of iterateAllFiles('generated')) {
        if (PROTECTED_PREFIXES.generated.some((p) => f.key.startsWith(p))) continue;
        if (!f.lastModified || f.lastModified.getTime() > cutoff) continue;
        pending.push(f.key);
        if (pending.length >= 1000) {
            report.generated_orphans_deleted += await deleteKeysBatched('generated', pending);
            pending = [];
        }
    }
    if (pending.length > 0) report.generated_orphans_deleted += await deleteKeysBatched('generated', pending);
}

/**
 * Borrado definitivo de una clínica: leads y archivos, logos, organización y
 * miembros (solo se borran las cuentas que no pertenecen a otra organización y
 * no son super-admin). Las compras se conservan anonimizadas por contabilidad.
 */
export async function deleteClinicCompletely(clinicId: string): Promise<{ leads: number; files: number; users: number }> {
    const clinic = await db.queryOne<{ id: string; name: string; org_id: string | null; billing_country: string | null }>(
        'SELECT id, name, org_id, billing_country FROM clinics WHERE id = $1',
        [clinicId]
    );
    if (!clinic) return { leads: 0, files: 0, users: 0 };

    let leads = 0;
    let files = 0;
    for (let guard = 0; guard < 10_000; guard++) {
        const rows = await db.query<{ id: string }>('SELECT id FROM leads WHERE clinic_id = $1 LIMIT 100', [clinicId]);
        if (rows.rows.length === 0) break;
        const r = await eraseLeads(rows.rows.map((x) => x.id), { clinicId });
        leads += r.leads;
        files += r.files;
    }

    // Generaciones sin lead (huérfanas) de la clínica.
    const orphans = await db.query<GenRow>(
        'SELECT id, type, input_path, output_path, metadata FROM generations WHERE clinic_id = $1',
        [clinicId]
    );
    if (orphans.rows.length > 0) {
        const ids = orphans.rows.map((g) => g.id);
        files += await deleteRefs(await onlyUnreferenced(orphans.rows.flatMap(refsForGeneration), ids, []));
        await db.query('DELETE FROM generations WHERE id = ANY($1::uuid[])', [ids]);
    }

    // Logos de la clínica y cualquier objeto con su prefijo (claves nuevas c/<clinicId>/...).
    const prefixes: Array<[Bucket, string]> = [
        ['uploads', `branding/${clinicId}/`],
        ['uploads', `c/${clinicId}/`],
        ['generated', `c/${clinicId}/`],
    ];
    for (const [bucket, prefix] of prefixes) {
        const keys: string[] = [];
        for await (const f of iterateAllFiles(bucket, prefix)) keys.push(f.key);
        files += await deleteKeysBatched(bucket, keys);
    }

    let users = 0;
    await db.transaction(async (client) => {
        // Compras: se conservan (obligación contable) con instantánea y sin usuario.
        await client.query(
            `UPDATE credit_purchases
                SET clinic_name_snapshot = COALESCE(clinic_name_snapshot, $2),
                    clinic_id_snapshot = COALESCE(clinic_id_snapshot, $1),
                    billing_country_snapshot = COALESCE(billing_country_snapshot, $3),
                    user_id = NULL, updated_at = now()
              WHERE clinic_id = $1`,
            [clinicId, clinic.name, clinic.billing_country]
        );

        if (clinic.org_id) {
            const members = await client.query<{ userId: string }>(
                'SELECT "userId" FROM member WHERE "organizationId" = $1',
                [clinic.org_id]
            );
            await client.query('UPDATE session SET "activeOrganizationId" = NULL WHERE "activeOrganizationId" = $1', [clinic.org_id]);
            // member e invitation caen por ON DELETE CASCADE.
            await client.query('DELETE FROM organization WHERE id = $1', [clinic.org_id]);

            for (const { userId } of members.rows) {
                const u = await client.query<{ email: string; role: string | null; others: number }>(
                    `SELECT u.email, u.role,
                            (SELECT count(*)::int FROM member m WHERE m."userId" = u.id) AS others
                     FROM "user" u WHERE u.id = $1`,
                    [userId]
                );
                const row = u.rows[0];
                if (!row || row.others > 0 || isPlatformAdminEmail(row.email) || row.role === 'admin') continue;
                // session y account caen por ON DELETE CASCADE.
                await client.query('DELETE FROM "user" WHERE id = $1', [userId]);
                users++;
            }
        }
        // credit_ledger cae por cascada; credit_purchases queda con clinic_id NULL.
        await client.query('DELETE FROM clinics WHERE id = $1', [clinicId]);
    });

    await audit('CLINIC_DELETED', { clinic_id: clinicId, leads, files, users_deleted: users });
    return { leads, files, users };
}

/** Ejecuta un paso del job sin que un fallo detenga los demás. */
async function step(report: RetentionReport, name: string, fn: () => Promise<void>) {
    try {
        await fn();
    } catch (e) {
        report.errors++;
        console.error(`[retention] fallo en ${name}:`, e);
    }
}

/**
 * Job completo. Usa un advisory lock para que dos instancias no lo ejecuten a
 * la vez (devuelve skipped: 'locked').
 */
export async function runRetention(opts: { now?: Date } = {}): Promise<RetentionReport> {
    const now = opts.now ?? new Date();
    const started = Date.now();
    const report: RetentionReport = {
        uploads_deleted: 0,
        selfie_sessions_deleted: 0,
        photos_purged: 0,
        photo_files_deleted: 0,
        generated_orphans_deleted: 0,
        leads_deleted: 0,
        lead_files_deleted: 0,
        clinics_deleted: 0,
        ai_audit_entries_deleted: 0,
        errors: 0,
        duration_ms: 0,
    };

    const lockClient = await db.getClient();
    try {
        const lock = await lockClient.query<{ ok: boolean }>('SELECT pg_try_advisory_lock(727017) AS ok');
        if (!lock.rows[0]?.ok) return { ...report, skipped: 'locked' };

        try {
            // 1. Bajas de clínica vencidas.
            const due = await db.query<{ id: string }>(
                `SELECT id FROM clinics
                 WHERE deletion_requested_at IS NOT NULL
                   AND deletion_requested_at <= now() - make_interval(days => $1)`,
                [CLINIC_DELETION_GRACE_DAYS]
            );
            for (const c of due.rows) {
                await step(report, `baja de clínica ${c.id}`, async () => {
                    await deleteClinicCompletely(c.id);
                    report.clinics_deleted++;
                });
            }

            // 2 y 3. Plazos por clínica (y leads sin clínica con los valores por defecto).
            const clinics = await db.query<{ id: string; retention_photos_days: number; retention_leads_days: number }>(
                'SELECT id, retention_photos_days, retention_leads_days FROM clinics'
            );
            const targets: Array<{ id: string | null; photos: number; leads: number }> = [
                ...clinics.rows.map((c) => ({ id: c.id, photos: c.retention_photos_days, leads: c.retention_leads_days })),
                { id: null, photos: RETENTION_LIMITS.photos.default, leads: RETENTION_LIMITS.leads.default },
            ];
            for (const t of targets) {
                await step(report, `leads ${t.id ?? 'sin clínica'}`, () => purgeLeads(report, t.id, t.leads));
                await step(report, `simulaciones ${t.id ?? 'sin clínica'}`, () => purgePhotos(report, t.id, t.photos));
            }

            // 4. Selfies originales > 24 h.
            await step(report, 'uploads', () => sweepUploads(report, now));

            // 5. Red de seguridad en generated.
            await step(report, 'generated', () => sweepGeneratedBackstop(report, now));

            // Registros de IA (texto del análisis facial) más allá del plazo por defecto.
            await step(report, 'audit IA', async () => {
                const r = await db.query(
                    `DELETE FROM audit_logs WHERE action LIKE 'AI\\_%' AND created_at < now() - make_interval(days => $1)`,
                    [RETENTION_LIMITS.photos.default]
                );
                report.ai_audit_entries_deleted += r.rowCount ?? 0;
            });
        } finally {
            await lockClient.query('SELECT pg_advisory_unlock(727017)').catch(() => {});
        }
    } finally {
        lockClient.release();
    }

    report.duration_ms = Date.now() - started;
    // Solo contadores: nada de ids, nombres ni emails.
    await audit('RETENTION_RUN', { ...report });
    return report;
}
