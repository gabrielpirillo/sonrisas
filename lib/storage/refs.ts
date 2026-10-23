/**
 * Referencias a objetos del almacenamiento (sin dependencias de S3 ni de Next,
 * para poder usarse en rutas, server actions y scripts de prueba).
 *
 * Formatos que pueden aparecer guardados en la base de datos:
 *  - "/api/storage/<bucket>/<key>"           (formato actual, sin firma)
 *  - "https://host/api/storage/<bucket>/<key>" (URLs absolutas antiguas)
 *  - "https://minio/<bucket>/<key>"           (URL directa de MinIO, antiguas)
 *  - ".../storage/v1/object/public/<bucket>/<key>" (Supabase, legacy)
 *  - "<key>" a secas                          (clave del bucket por defecto, p. ej. vídeos)
 *
 * Claves nuevas: aleatorias (randomUUID) y con el prefijo de la clínica cuando
 * se conoce: "c/<clinicId>/<carpeta>/<uuid>.<ext>". Sin clínica: "p/<carpeta>/<uuid>.<ext>".
 */
import { randomUUID } from 'node:crypto';

export const STORAGE_ROUTE_PREFIX = '/api/storage/';
export const STORAGE_BUCKETS = ['generated', 'uploads'] as const;
export type StorageBucket = (typeof STORAGE_BUCKETS)[number];

export interface StorageRef {
    bucket: StorageBucket;
    key: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLINIC_KEY_RE = /^c\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i;

export function isStorageBucket(v: unknown): v is StorageBucket {
    return typeof v === 'string' && (STORAGE_BUCKETS as readonly string[]).includes(v);
}

/** Clave segura: sin "..", sin segmentos vacíos, sin "\" ni caracteres de control. */
export function isSafeKey(key: string): boolean {
    if (!key || key.length > 512) return false;
    if (key.startsWith('/') || key.includes('\\')) return false;
    if (/[\u0000-\u001f\u007f]/.test(key)) return false;
    return key.split('/').every((seg) => seg !== '' && seg !== '.' && seg !== '..');
}

/**
 * Objetos públicos a propósito (no son datos personales): los logos de marca
 * de las clínicas que el widget muestra a cualquiera -> uploads/branding/...
 */
export function isPublicObject(bucket: string, key: string): boolean {
    return bucket === 'uploads' && key.startsWith('branding/') && isSafeKey(key);
}

/** Id de clínica codificado en la clave ("c/<uuid>/..."), o null en claves antiguas. */
export function clinicIdFromKey(key: string): string | null {
    const m = CLINIC_KEY_RE.exec(key);
    return m ? m[1].toLowerCase() : null;
}

/** Ruta (sin firma) para guardar en la base de datos: "/api/storage/<bucket>/<key>". */
export function storagePath(bucket: string, key: string): string {
    return `${STORAGE_ROUTE_PREFIX}${bucket}/${key}`;
}

function safeDecode(s: string): string | null {
    try {
        return decodeURIComponent(s);
    } catch {
        return null;
    }
}

function refFromPathname(pathname: string): StorageRef | null {
    // /api/storage/<bucket>/<key>
    const i = pathname.indexOf(STORAGE_ROUTE_PREFIX);
    let rest: string | null = null;
    if (i !== -1) rest = pathname.slice(i + STORAGE_ROUTE_PREFIX.length);
    else {
        // Supabase legacy: /storage/v1/object/public/<bucket>/<key>
        const sb = '/storage/v1/object/public/';
        const j = pathname.indexOf(sb);
        if (j !== -1) rest = pathname.slice(j + sb.length);
        // MinIO directo: /<bucket>/<key>
        else rest = pathname.replace(/^\/+/, '');
    }
    const decoded = rest === null ? null : safeDecode(rest);
    if (!decoded) return null;
    const slash = decoded.indexOf('/');
    if (slash <= 0) return null;
    const bucket = decoded.slice(0, slash);
    const key = decoded.slice(slash + 1);
    if (!isStorageBucket(bucket) || !isSafeKey(key)) return null;
    return { bucket, key };
}

/**
 * Convierte un valor guardado (URL absoluta antigua, ruta /api/storage/...,
 * URL directa de MinIO o clave a secas) en { bucket, key }. Ignora la query
 * (?exp=&sig=). Devuelve null si no apunta a nuestro almacenamiento.
 */
export function parseStorageRef(
    value: unknown,
    defaultBucket: StorageBucket = 'generated'
): StorageRef | null {
    if (typeof value !== 'string') return null;
    const v = value.trim();
    if (!v || v === 'unknown' || v.startsWith('data:') || v.startsWith('blob:')) return null;

    if (/^https?:\/\//i.test(v)) {
        try {
            return refFromPathname(new URL(v).pathname);
        } catch {
            return null;
        }
    }
    if (v.startsWith('/')) {
        const pathname = v.split(/[?#]/)[0];
        if (!pathname.startsWith(STORAGE_ROUTE_PREFIX)) return null;
        return refFromPathname(pathname);
    }
    // Clave a secas (sin query)
    const key = v.split(/[?#]/)[0];
    return isSafeKey(key) ? { bucket: defaultBucket, key } : null;
}

/** Clave nueva no adivinable. Con clínica: c/<clinicId>/<folder>/<uuid>.<ext>. */
export function newObjectKey(opts: { clinicId?: string | null; folder: string; ext: string }): string {
    const folder = opts.folder.replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'misc';
    const ext = opts.ext.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 5) || 'bin';
    const clinic = opts.clinicId && UUID_RE.test(opts.clinicId) ? opts.clinicId.toLowerCase() : null;
    const name = `${randomUUID()}.${ext}`;
    return clinic ? `c/${clinic}/${folder}/${name}` : `p/${folder}/${name}`;
}
