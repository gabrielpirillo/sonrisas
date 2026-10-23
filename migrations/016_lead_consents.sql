-- Registro verificable de los consentimientos del paciente (RGPD/LOPDGDD,
-- Ley 25.326 y normativa LATAM). Una fila por consentimiento y lead, con el
-- texto exacto y la versión mostrados. Nunca se guarda la IP en claro: solo
-- sha256(IP + secreto del servidor).
CREATE TABLE IF NOT EXISTS public.lead_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
    kind TEXT NOT NULL CHECK (kind IN ('age', 'terms_privacy', 'photo_processing', 'marketing')),
    granted BOOLEAN NOT NULL,
    text TEXT NOT NULL,
    version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_hash TEXT,
    user_agent TEXT CHECK (user_agent IS NULL OR char_length(user_agent) <= 300)
);

CREATE INDEX IF NOT EXISTS idx_lead_consents_lead_id ON public.lead_consents(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_consents_clinic_id ON public.lead_consents(clinic_id);
