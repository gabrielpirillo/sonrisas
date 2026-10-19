import { db } from '@/lib/db';
import { normalizeWidgetConfig, type WidgetConfig } from '@/lib/widgetConfig';

export interface PublicWidgetConfig {
    config: WidgetConfig;
    clinicName: string;
    updatedAt: string | null;
}

/** Configuración pública del widget a partir de la clave de la clínica (o la clínica por defecto). */
export async function getWidgetConfigByKey(key: string | null): Promise<PublicWidgetConfig | null> {
    const row = key && /^[0-9a-f]{16,64}$/i.test(key)
        ? await db.queryOne<{ name: string; widget_config: unknown; widget_config_updated_at: string | null }>(
            'SELECT name, widget_config, widget_config_updated_at FROM clinics WHERE public_widget_key = $1',
            [key]
        )
        : await db.queryOne<{ name: string; widget_config: unknown; widget_config_updated_at: string | null }>(
            "SELECT name, widget_config, widget_config_updated_at FROM clinics WHERE slug = 'default'",
            []
        );
    if (!row) return null;
    return { config: normalizeWidgetConfig(row.widget_config), clinicName: row.name, updatedAt: row.widget_config_updated_at };
}

export async function getWidgetConfigByClinicId(clinicId: string): Promise<PublicWidgetConfig | null> {
    const row = await db.queryOne<{ name: string; widget_config: unknown; widget_config_updated_at: string | null }>(
        'SELECT name, widget_config, widget_config_updated_at FROM clinics WHERE id = $1',
        [clinicId]
    );
    if (!row) return null;
    return { config: normalizeWidgetConfig(row.widget_config), clinicName: row.name, updatedAt: row.widget_config_updated_at };
}

export async function saveWidgetConfig(clinicId: string, raw: unknown): Promise<WidgetConfig> {
    const config = normalizeWidgetConfig(raw);
    await db.query(
        'UPDATE clinics SET widget_config = $1, widget_config_updated_at = now() WHERE id = $2',
        [JSON.stringify(config), clinicId]
    );
    return config;
}
