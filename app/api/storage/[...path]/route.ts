/**
 * API Route: proxy de almacenamiento (MinIO) con control de acceso.
 *
 *   /api/storage/<bucket>/<key>?exp=<unix>&sig=<b64url>
 *
 * Fotos de pacientes (uploads) y resultados (generated) son datos personales.
 * Se sirven solo si:
 *   (a) la URL lleva una firma HMAC válida y vigente (lib/signedUrl.ts), o
 *   (b) hay sesión del panel y la clínica activa es dueña del objeto
 *       (prefijo c/<clinicId>/ o referencia en la base de datos), o
 *   (c) la sesión es de un super-admin de plataforma.
 * Excepción pública a propósito: uploads/branding/... (logos de las clínicas
 * que muestra el widget). Ver isPublicObject en lib/storage/refs.ts.
 */
import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { isPublicObject, isSafeKey, isStorageBucket, type StorageBucket } from '@/lib/storage/refs';
import { verifyStorageSignature } from '@/lib/signedUrl';

export const dynamic = 'force-dynamic';

const CONTENT_TYPES: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    mp4: 'video/mp4',
};

const MAX_PRIVATE_CACHE = 3600;

type Access =
    | { ok: true; cache: string; cors: boolean }
    | { ok: false };

function deny(status: 403 | 404 | 400, msg: string) {
    return new NextResponse(msg, {
        status,
        headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
    });
}

/** Sesión del panel: super-admin o clínica activa dueña del objeto. */
async function sessionAccess(bucket: StorageBucket, key: string): Promise<boolean> {
    try {
        // Import diferido: las peticiones firmadas no necesitan cargar auth.
        const [{ getAuthContext }, { isPlatformAdminEmail }, { clinicCanAccessObject }] = await Promise.all([
            import('@/lib/auth/context'),
            import('@/lib/auth/platform'),
            import('@/lib/storage/access'),
        ]);
        const ctx = await getAuthContext();
        if (!ctx) return false;
        if (isPlatformAdminEmail(ctx.email)) return true;
        if (!ctx.clinic?.id) return false;
        return await clinicCanAccessObject(ctx.clinic.id, bucket, key);
    } catch (e) {
        console.error('[storage-proxy] session check failed:', (e as Error)?.message);
        return false;
    }
}

async function checkAccess(req: NextRequest, bucket: StorageBucket, key: string): Promise<Access> {
    if (isPublicObject(bucket, key)) {
        return { ok: true, cache: 'public, max-age=3600', cors: true };
    }

    const sp = req.nextUrl.searchParams;
    const sig = verifyStorageSignature(bucket, key, sp.get('exp'), sp.get('sig'));
    if (sig.ok) {
        const maxAge = Math.max(0, Math.min(sig.remainingSeconds, MAX_PRIVATE_CACHE));
        return { ok: true, cache: `private, max-age=${maxAge}`, cors: true };
    }

    // Sin firma válida (o caducada): el panel puede seguir viendo lo suyo por sesión.
    if (await sessionAccess(bucket, key)) {
        return { ok: true, cache: 'private, max-age=600', cors: false };
    }
    return { ok: false };
}

/** Rango simple "bytes=a-b" (necesario para <video> en Safari). */
function parseRange(header: string | null, size: number): { start: number; end: number } | null | 'invalid' {
    if (!header) return null;
    const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
    if (!m || (m[1] === '' && m[2] === '')) return 'invalid';
    let start: number;
    let end: number;
    if (m[1] === '') {
        const suffix = Number(m[2]);
        start = Math.max(0, size - suffix);
        end = size - 1;
    } else {
        start = Number(m[1]);
        end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
    }
    if (start > end || start >= size) return 'invalid';
    return { start, end };
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;

    if (!path || path.length < 2) return deny(400, 'Invalid path');

    // Primer segmento: bucket; resto: clave.
    const bucket = path[0];
    const key = path.slice(1).join('/');

    if (!isStorageBucket(bucket)) return deny(403, 'Invalid bucket');
    if (!isSafeKey(key)) return deny(400, 'Invalid path');

    // Autorización ANTES de tocar el almacenamiento (no revelar si existe).
    const access = await checkAccess(req, bucket, key);
    if (!access.ok) return deny(403, 'Forbidden');

    let buffer: Buffer;
    try {
        buffer = await storage.downloadFileAsBuffer(bucket, key);
    } catch (error) {
        console.error('[storage-proxy] Error:', (error as Error)?.message);
        return deny(404, 'File not found');
    }

    const ext = key.split('.').pop()?.toLowerCase();
    const contentType = CONTENT_TYPES[ext || ''] || 'application/octet-stream';

    const headers: Record<string, string> = {
        'Content-Type': contentType,
        'Cache-Control': access.cache,
        'X-Robots-Tag': 'noindex, nofollow',
        'X-Content-Type-Options': 'nosniff',
        'Accept-Ranges': 'bytes',
    };
    if (access.cors) headers['Access-Control-Allow-Origin'] = '*';
    else headers['Vary'] = 'Cookie';

    const range = parseRange(req.headers.get('range'), buffer.length);
    if (range === 'invalid') {
        return new NextResponse(null, {
            status: 416,
            headers: { ...headers, 'Content-Range': `bytes */${buffer.length}` },
        });
    }
    if (range) {
        const chunk = buffer.subarray(range.start, range.end + 1);
        return new NextResponse(new Uint8Array(chunk), {
            status: 206,
            headers: {
                ...headers,
                'Content-Length': chunk.length.toString(),
                'Content-Range': `bytes ${range.start}-${range.end}/${buffer.length}`,
            },
        });
    }

    return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: { ...headers, 'Content-Length': buffer.length.toString() },
    });
}
