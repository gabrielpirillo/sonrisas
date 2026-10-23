/**
 * ¿Puede una clínica ver este objeto del almacenamiento?
 *
 * - Claves nuevas "c/<clinicId>/...": decide el prefijo (y nada más).
 * - Claves antiguas: se busca la clave en las tablas que la referencian
 *   (generations.input_path/output_path, leads.video_path, el id del lead como
 *   primer segmento en generated/<leadId>/..., analysis_results.generated_image),
 *   limitadas a la clínica.
 */
import { db } from '@/lib/db';
import { clinicIdFromKey, storagePath, type StorageBucket } from '@/lib/storage/refs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** La clave y, si es una copia con marca de agua, sus posibles originales. */
function candidateKeys(key: string): string[] {
    const out = [key];
    const m = /^(.*)_watermarked\.jpg$/i.exec(key);
    if (m) for (const ext of ['jpg', 'jpeg', 'png', 'webp']) out.push(`${m[1]}.${ext}`);
    return out;
}

/** Pura (testeable): ¿decide el prefijo? true/false, o null si hay que mirar la base. */
export function prefixDecision(clinicId: string, key: string): boolean | null {
    const owner = clinicIdFromKey(key);
    if (owner) return owner === clinicId.toLowerCase();
    return null;
}

export async function clinicCanAccessObject(clinicId: string, bucket: StorageBucket, key: string): Promise<boolean> {
    if (!clinicId) return false;
    const byPrefix = prefixDecision(clinicId, key);
    if (byPrefix !== null) return byPrefix;

    const keys = candidateKeys(key);
    // Formas en que pueden estar guardadas: ruta /api/storage/... (también como
    // sufijo de una URL absoluta antigua) y, en generated, la clave a secas.
    const suffixes = keys.map((k) => storagePath(bucket, k));
    const exact = bucket === 'generated' ? keys : [];
    const firstSeg = key.split('/')[0];
    const leadIdSeg = bucket === 'generated' && UUID_RE.test(firstSeg) ? firstSeg : null;

    const row = await db.queryOne(
        `SELECT 1 AS ok WHERE
            EXISTS (
                SELECT 1 FROM generations g
                WHERE g.clinic_id = $1 AND (
                    g.output_path = ANY($2::text[]) OR g.input_path = ANY($2::text[])
                    OR EXISTS (
                        SELECT 1 FROM unnest($3::text[]) s
                        WHERE right(g.output_path, length(s)) = s OR right(g.input_path, length(s)) = s
                    )
                )
            )
            OR EXISTS (SELECT 1 FROM leads l WHERE l.clinic_id = $1 AND l.video_path = ANY($2::text[]))
            OR ($4::uuid IS NOT NULL AND EXISTS (SELECT 1 FROM leads l WHERE l.clinic_id = $1 AND l.id = $4::uuid))
            OR EXISTS (
                SELECT 1 FROM analysis_results a JOIN leads l ON l.id = a.lead_id
                WHERE l.clinic_id = $1 AND a.result->>'generated_image' = ANY($2::text[])
            )`,
        [clinicId, exact, suffixes, leadIdSeg]
    );
    return Boolean(row);
}
