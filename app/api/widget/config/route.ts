/**
 * Configuración pública del widget: GET /api/widget/config?key=<clave pública>
 * Sin datos sensibles (colores, textos, WhatsApp y opciones). Caché corta para
 * que los cambios del panel se vean en segundos.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWidgetConfigByKey } from '@/lib/widgetConfig.server';
import { DEFAULT_WIDGET_CONFIG } from '@/lib/widgetConfig';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const key = req.nextUrl.searchParams.get('key');
    try {
        const data = await getWidgetConfigByKey(key);
        return NextResponse.json(
            data ?? { config: DEFAULT_WIDGET_CONFIG, clinicName: '', updatedAt: null },
            { headers: { 'Cache-Control': 'public, max-age=15, stale-while-revalidate=60', 'Access-Control-Allow-Origin': '*' } }
        );
    } catch (err) {
        console.error('[widget/config] error:', err);
        return NextResponse.json({ config: DEFAULT_WIDGET_CONFIG, clinicName: '', updatedAt: null });
    }
}
