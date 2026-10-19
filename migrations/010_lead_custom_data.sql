-- Respuestas a los campos adicionales que cada clínica configura en su widget.
-- Formato: { "<id_campo>": { "label": "...", "value": "..." } }
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS custom_data JSONB NOT NULL DEFAULT '{}'::jsonb;
