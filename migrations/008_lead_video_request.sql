-- Momento en que el paciente pidió ver su vídeo en consulta (desde el widget).
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS video_requested_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_leads_video_requested ON public.leads(clinic_id, video_requested_at) WHERE video_requested_at IS NOT NULL;
