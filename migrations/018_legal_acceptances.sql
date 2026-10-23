-- Aceptación de los textos legales por las clínicas (términos, contrato de
-- encargo de tratamiento y política de privacidad). Una fila por usuario,
-- documento y versión. Nunca se guarda la IP en claro: solo
-- sha256(IP + secreto del servidor).
CREATE TABLE IF NOT EXISTS public.legal_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
    document TEXT NOT NULL CHECK (document IN ('terms', 'dpa', 'privacy')),
    version TEXT NOT NULL CHECK (char_length(version) <= 40),
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_hash TEXT,
    user_agent TEXT CHECK (user_agent IS NULL OR char_length(user_agent) <= 300)
);

-- Idempotencia: aceptar dos veces la misma versión (mismo usuario y clínica) no duplica filas.
CREATE UNIQUE INDEX IF NOT EXISTS uq_legal_acceptances_user_clinic_doc_version
    ON public.legal_acceptances(user_id, COALESCE(clinic_id, '00000000-0000-0000-0000-000000000000'::uuid), document, version);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_clinic
    ON public.legal_acceptances(clinic_id, document, version);
