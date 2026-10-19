-- Personalización del widget por clínica (colores, textos, contacto, opciones).
-- El widget la lee por su clave pública, así el código de instalación no cambia.
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS widget_config JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS widget_config_updated_at TIMESTAMPTZ;
