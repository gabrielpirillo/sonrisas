'use server';

import { revalidatePath } from 'next/cache';
import sharp from 'sharp';
import { getAuthContext } from '@/lib/auth/context';
import { storage } from '@/lib/storage';
import { saveWidgetConfig } from '@/lib/widgetConfig.server';
import { DEFAULT_WIDGET_CONFIG, type WidgetConfig } from '@/lib/widgetConfig';

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

/** Solo owner/admin de la clínica activa y sin impersonación. */
async function editableClinic(): Promise<{ clinicId: string } | { error: string }> {
    const ctx = await getAuthContext();
    if (!ctx) return { error: 'Tu sesión expiró. Vuelve a entrar.' };
    if (!ctx.clinic) return { error: 'Selecciona una clínica primero.' };
    if (ctx.impersonatedBy) return { error: 'No disponible durante una impersonación (solo lectura).' };
    if (ctx.role && !['owner', 'admin'].includes(ctx.role)) return { error: 'Solo los administradores pueden cambiar el widget.' };
    return { clinicId: ctx.clinic.id };
}

export async function saveWidgetConfigAction(config: WidgetConfig): Promise<Result<WidgetConfig>> {
    const c = await editableClinic();
    if ('error' in c) return { ok: false, error: c.error };
    try {
        const saved = await saveWidgetConfig(c.clinicId, config);
        revalidatePath('/administracion/widget');
        return { ok: true, data: saved };
    } catch (err) {
        console.error('[widget] save failed:', err);
        return { ok: false, error: 'No se pudo guardar. Inténtalo de nuevo.' };
    }
}

export async function resetWidgetConfigAction(): Promise<Result<WidgetConfig>> {
    return saveWidgetConfigAction(DEFAULT_WIDGET_CONFIG);
}

/** Sube el logo (PNG/JPG/WEBP/SVG ≤ 2 MB), lo normaliza a PNG ≤ 600 px y devuelve su URL. */
export async function uploadWidgetLogoAction(formData: FormData): Promise<Result<string>> {
    const c = await editableClinic();
    if ('error' in c) return { ok: false, error: c.error };
    const file = formData.get('file');
    if (!(file instanceof File)) return { ok: false, error: 'Selecciona una imagen.' };
    if (file.size > 2 * 1024 * 1024) return { ok: false, error: 'El logo debe pesar menos de 2 MB.' };
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
        return { ok: false, error: 'Formato no admitido. Usa PNG, JPG, WEBP o SVG.' };
    }
    try {
        const input = Buffer.from(await file.arrayBuffer());
        const png = await sharp(input, { density: 300 })
            .resize({ width: 600, height: 240, fit: 'inside', withoutEnlargement: true })
            .png()
            .toBuffer();
        const key = `branding/${c.clinicId}/logo-${Date.now()}.png`;
        await storage.uploadFile('uploads', key, png, 'image/png');
        return { ok: true, data: `/api/storage/uploads/${key}` };
    } catch (err) {
        console.error('[widget] logo upload failed:', err);
        return { ok: false, error: 'No se pudo procesar el logo. Prueba con otra imagen.' };
    }
}
