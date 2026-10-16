/**
 * Utilidades de seguridad compartidas.
 *
 * - Token interno: las rutas /api/ai/* solo deben llamarse desde el propio
 *   servidor (server actions → localhost). Se firma con un secreto derivado del
 *   secreto de auth, así no hace falta una variable de entorno nueva.
 * - Allowlist de URLs de imagen: evita SSRF cuando una server action recibe una
 *   URL y la descarga.
 * - Rate limit en memoria por IP para las acciones públicas del widget.
 * - Contexto de clínica obligatorio para las acciones del panel.
 */
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, type AuthContext } from '@/lib/auth/context';

// ── Token interno ──────────────────────────────────────────────────────────
const INTERNAL_HEADER = 'x-internal-token';

let processFallback: string | null = null;

function internalSecret(): string {
    const base =
        process.env.INTERNAL_API_SECRET ||
        process.env.BETTER_AUTH_SECRET ||
        process.env.NEXTAUTH_SECRET;
    if (base) return createHash('sha256').update(`smilefast-internal:${base}`).digest('hex');
    // Sin secretos configurados: token aleatorio por proceso (server actions y
    // rutas corren en el mismo proceso de Node).
    if (!processFallback) processFallback = randomBytes(32).toString('hex');
    return processFallback;
}

/** Cabeceras para llamadas servidor → /api/ai/*. */
export function internalHeaders(): Record<string, string> {
    return { 'Content-Type': 'application/json', [INTERNAL_HEADER]: internalSecret() };
}

/** Devuelve una respuesta 403 si la petición no viene del propio servidor. */
export function rejectIfNotInternal(req: NextRequest): NextResponse | null {
    const got = req.headers.get(INTERNAL_HEADER) || '';
    const expected = internalSecret();
    const ok =
        got.length === expected.length &&
        timingSafeEqual(Buffer.from(got), Buffer.from(expected));
    return ok ? null : NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ── Allowlist de imágenes (anti-SSRF) ──────────────────────────────────────
function trustedPrefixes(): string[] {
    const port = process.env.PORT || '3000';
    const bases = [
        process.env.NEXTAUTH_URL,
        process.env.APP_URL,
        process.env.BETTER_AUTH_URL,
        `http://localhost:${port}`,
    ]
        .filter(Boolean)
        .map((u) => `${String(u).replace(/\/$/, '')}/api/storage/`);
    const storage = [process.env.MINIO_PUBLIC_URL, process.env.NEXT_PUBLIC_STORAGE_URL]
        .filter(Boolean)
        .map((u) => `${String(u).replace(/\/$/, '')}/`);
    return [...bases, ...storage];
}

/** True si la URL apunta a nuestro propio almacenamiento. */
export function isTrustedImageUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
        const normalized = parsed.toString();
        return trustedPrefixes().some((p) => normalized.startsWith(p));
    } catch {
        return false;
    }
}

/** Descarga una imagen solo si es de nuestro almacenamiento; si no, lanza. */
export async function fetchTrustedImage(url: string): Promise<ArrayBuffer> {
    if (!isTrustedImageUrl(url)) throw new Error('Origen de imagen no permitido');
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`No se pudo descargar la imagen (${res.status})`);
    return res.arrayBuffer();
}

// ── Rate limit en memoria ──────────────────────────────────────────────────
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Ventana fija. Devuelve true si la petición entra dentro del límite. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || b.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        if (buckets.size > 5000) {
            for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
        }
        return true;
    }
    b.count += 1;
    return b.count <= limit;
}

/** IP del cliente (detrás del proxy de Easypanel/Traefik). */
export function ipFromRequest(req: NextRequest): string {
    return (
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        req.headers.get('x-real-ip') ||
        'unknown'
    );
}

/** IP del cliente dentro de una server action. */
export async function ipFromHeaders(): Promise<string> {
    const h = await headers();
    return h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'unknown';
}

// ── Escapado para SVG/XML ──────────────────────────────────────────────────
export function escapeXml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// ── Contexto de clínica para el panel ──────────────────────────────────────
export type ClinicContext = AuthContext & { clinic: NonNullable<AuthContext['clinic']> };

/**
 * Exige sesión con una clínica activa. Devuelve el contexto o una respuesta de
 * error lista para devolver desde la ruta.
 */
export async function requireClinic(): Promise<
    { ctx: ClinicContext; error?: undefined } | { ctx?: undefined; error: NextResponse }
> {
    const ctx = await getAuthContext();
    if (!ctx) return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
    if (!ctx.clinic) {
        return { error: NextResponse.json({ error: 'Sin clínica activa' }, { status: 403 }) };
    }
    return { ctx: ctx as ClinicContext };
}
