/**
 * Enlace antiguo al vídeo de un lead: /api/video/<leadId>.
 * Ya no hace de proxy público: redirige a una URL firmada de corta duración
 * del proxy de almacenamiento (que soporta Range para el reproductor).
 * El id del lead (UUID aleatorio) es la capacidad, igual que /simulacion/<id>.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signStoredRef } from '@/lib/signedUrl'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const noStore = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }

    if (!UUID_RE.test(id || '')) {
        return new NextResponse('Video no encontrado', { status: 404, headers: noStore })
    }

    const lead = await db.queryOne(
        'SELECT video_path FROM leads WHERE id = $1',
        [id]
    );

    const signed = lead?.video_path ? signStoredRef(lead.video_path, 15 * 60, 'generated') : null
    if (!signed) {
        return new NextResponse('Video no encontrado', { status: 404, headers: noStore })
    }

    // Location relativa (RFC 7231): no depende del Host que vea el servidor detrás del proxy.
    return new NextResponse(null, {
        status: 302,
        headers: { ...noStore, Location: signed, 'Referrer-Policy': 'no-referrer' },
    })
}
