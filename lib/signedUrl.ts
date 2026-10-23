/**
 * URLs firmadas (HMAC-SHA256) y con caducidad para servir fotos y resultados
 * de pacientes a través de /api/storage/<bucket>/<key>?exp=<unix>&sig=<b64url>.
 *
 * Secreto: STORAGE_URL_SECRET; si no existe, se deriva de BETTER_AUTH_SECRET
 * (o NEXTAUTH_SECRET). Solo servidor: nunca importar desde componentes cliente.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import {
    STORAGE_ROUTE_PREFIX,
    isPublicObject,
    isSafeKey,
    isStorageBucket,
    parseStorageRef,
    type StorageBucket,
    type StorageRef,
} from '@/lib/storage/refs';

/** Caducidades por contexto (segundos). */
export const SIGNED_URL_TTL = {
    widget: 2 * 60 * 60, // resultado en el widget / sesión del paciente
    admin: 60 * 60, // panel de la clínica (además tiene acceso por sesión)
    email: 7 * 24 * 60 * 60, // enlaces en correos
} as const;

/** Ninguna firma puede durar más que esto (aunque alguien pida más). */
const MAX_TTL_SECONDS = 8 * 24 * 60 * 60;

let processFallback: Buffer | null = null;
let warned = false;

function signingKey(): Buffer {
    const explicit = process.env.STORAGE_URL_SECRET;
    if (explicit) return createHash('sha256').update(`smilefast-storage-url:${explicit}`).digest();
    const base = process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (base) return createHash('sha256').update(`smilefast-storage-url:${base}`).digest();
    // Sin secreto: clave aleatoria por proceso (las URLs dejan de valer al reiniciar).
    if (!warned) {
        console.warn('[signedUrl] Sin STORAGE_URL_SECRET ni BETTER_AUTH_SECRET: usando clave temporal por proceso.');
        warned = true;
    }
    if (!processFallback) processFallback = randomBytes(32);
    return processFallback;
}

function nowSeconds(): number {
    return Math.floor(Date.now() / 1000);
}

function computeSig(bucket: string, key: string, exp: number): string {
    return createHmac('sha256', signingKey()).update(`v1\n${bucket}\n${key}\n${exp}`).digest('base64url');
}

function encodeKey(key: string): string {
    return key.split('/').map(encodeURIComponent).join('/');
}

/**
 * Ruta firmada relativa: /api/storage/<bucket>/<key>?exp=<unix>&sig=<b64url>.
 * Relativa a propósito: funciona en <img>, <video>, fetch y CSS del mismo origen.
 */
export function signStoragePath(bucket: string, key: string, ttlSeconds: number): string {
    if (!isStorageBucket(bucket) || !isSafeKey(key)) throw new Error('Referencia de almacenamiento inválida');
    const ttl = Math.min(Math.max(1, Math.floor(ttlSeconds)), MAX_TTL_SECONDS);
    const exp = nowSeconds() + ttl;
    return `${STORAGE_ROUTE_PREFIX}${bucket}/${encodeKey(key)}?exp=${exp}&sig=${computeSig(bucket, key, exp)}`;
}

export type SignatureCheck =
    | { ok: true; remainingSeconds: number }
    | { ok: false; reason: 'missing' | 'malformed' | 'expired' | 'invalid' };

/** Verificación en tiempo constante de exp/sig para bucket+key (key ya decodificada). */
export function verifyStorageSignature(
    bucket: string,
    key: string,
    exp: string | null | undefined,
    sig: string | null | undefined
): SignatureCheck {
    if (!exp || !sig) return { ok: false, reason: 'missing' };
    if (!/^\d{1,12}$/.test(exp) || !/^[A-Za-z0-9_-]{43}$/.test(sig)) return { ok: false, reason: 'malformed' };
    const expNum = Number(exp);
    const remaining = expNum - nowSeconds();
    if (remaining <= 0) return { ok: false, reason: 'expired' };
    if (remaining > MAX_TTL_SECONDS) return { ok: false, reason: 'invalid' };
    const expected = Buffer.from(computeSig(bucket, key, expNum));
    const got = Buffer.from(sig);
    if (got.length !== expected.length || !timingSafeEqual(got, expected)) return { ok: false, reason: 'invalid' };
    return { ok: true, remainingSeconds: remaining };
}

/**
 * Si `url` (relativa o absoluta) es una URL /api/storage/... con firma válida y
 * vigente, devuelve { bucket, key }. Sirve como "prueba de posesión" cuando el
 * cliente nos devuelve una URL que le dimos antes.
 */
export function verifySignedStorageUrl(url: unknown): StorageRef | null {
    if (typeof url !== 'string' || !url) return null;
    let parsed: URL;
    try {
        parsed = new URL(url, 'http://local.invalid');
    } catch {
        return null;
    }
    if (!parsed.pathname.startsWith(STORAGE_ROUTE_PREFIX)) return null;
    const ref = parseStorageRef(parsed.pathname);
    if (!ref) return null;
    const check = verifyStorageSignature(ref.bucket, ref.key, parsed.searchParams.get('exp'), parsed.searchParams.get('sig'));
    return check.ok ? ref : null;
}

/**
 * Convierte un valor guardado en la base de datos (URL absoluta antigua, ruta
 * /api/storage/... o clave a secas) en una URL firmada. Los objetos públicos
 * (logos de marca) se devuelven sin firma. Devuelve null si no es nuestro.
 */
export function signStoredRef(
    value: unknown,
    ttlSeconds: number,
    defaultBucket: StorageBucket = 'generated'
): string | null {
    const ref = parseStorageRef(value, defaultBucket);
    if (!ref) return null;
    if (isPublicObject(ref.bucket, ref.key)) return `${STORAGE_ROUTE_PREFIX}${ref.bucket}/${encodeKey(ref.key)}`;
    return signStoragePath(ref.bucket, ref.key, ttlSeconds);
}

/** Origen público de la app para URLs absolutas (correos). */
export function appOrigin(): string {
    return String(process.env.APP_URL || process.env.NEXTAUTH_URL || process.env.BETTER_AUTH_URL || '').replace(/\/$/, '');
}

/** URL firmada absoluta (para correos u otros contextos fuera de la app). */
export function absoluteSignedUrl(bucket: string, key: string, ttlSeconds: number = SIGNED_URL_TTL.email): string {
    return `${appOrigin()}${signStoragePath(bucket, key, ttlSeconds)}`;
}
