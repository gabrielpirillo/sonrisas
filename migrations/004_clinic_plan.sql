-- ============================================================
-- Migration 004: plan por clínica (para el panel de plataforma)
-- ============================================================
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
CREATE INDEX IF NOT EXISTS idx_clinics_plan ON public.clinics(plan);
