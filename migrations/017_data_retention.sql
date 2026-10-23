-- Retención y borrado de datos (RGPD/LOPDGDD, Ley 25.326 y normativa LATAM).
--
-- 1. Plazos de conservación por clínica (editables por owner/admin):
--    - retention_photos_days: simulaciones (imágenes/vídeos generados). 30–365, 90 por defecto.
--    - retention_leads_days: ficha completa del paciente. 180–1825, 730 (24 meses) por defecto.
--    Las selfies originales (bucket uploads) se borran siempre a las 24 h.
-- 2. Baja de la clínica: deletion_requested_at marca la solicitud; el job de
--    retención borra todo a los 30 días salvo que se cancele antes.
-- 3. Compras de créditos: se conservan por obligación contable aunque se borre
--    la clínica. clinic_id pasa a ON DELETE SET NULL y se guarda una instantánea
--    del nombre, id y país de facturación de la clínica.

ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS retention_photos_days INTEGER NOT NULL DEFAULT 90;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS retention_leads_days INTEGER NOT NULL DEFAULT 730;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS deletion_requested_by TEXT;

ALTER TABLE public.clinics DROP CONSTRAINT IF EXISTS clinics_retention_photos_days_check;
ALTER TABLE public.clinics ADD CONSTRAINT clinics_retention_photos_days_check
    CHECK (retention_photos_days BETWEEN 30 AND 365);
ALTER TABLE public.clinics DROP CONSTRAINT IF EXISTS clinics_retention_leads_days_check;
ALTER TABLE public.clinics ADD CONSTRAINT clinics_retention_leads_days_check
    CHECK (retention_leads_days BETWEEN 180 AND 1825);

CREATE INDEX IF NOT EXISTS idx_clinics_deletion_requested
    ON public.clinics(deletion_requested_at) WHERE deletion_requested_at IS NOT NULL;

-- Índices para que el job recorra por antigüedad sin escanear todo.
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON public.generations(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_clinic_created ON public.leads(clinic_id, created_at);

-- Compras: se conservan al borrar la clínica (contabilidad).
ALTER TABLE public.credit_purchases ADD COLUMN IF NOT EXISTS clinic_name_snapshot TEXT;
ALTER TABLE public.credit_purchases ADD COLUMN IF NOT EXISTS clinic_id_snapshot UUID;
ALTER TABLE public.credit_purchases ADD COLUMN IF NOT EXISTS billing_country_snapshot TEXT;

UPDATE public.credit_purchases p
   SET clinic_name_snapshot = c.name,
       clinic_id_snapshot = c.id,
       billing_country_snapshot = c.billing_country
  FROM public.clinics c
 WHERE c.id = p.clinic_id AND p.clinic_id_snapshot IS NULL;

ALTER TABLE public.credit_purchases ALTER COLUMN clinic_id DROP NOT NULL;
ALTER TABLE public.credit_purchases DROP CONSTRAINT IF EXISTS credit_purchases_clinic_id_fkey;
ALTER TABLE public.credit_purchases ADD CONSTRAINT credit_purchases_clinic_id_fkey
    FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL;

-- Las compras nuevas guardan la instantánea al crearse (sin tocar el código de billing).
CREATE OR REPLACE FUNCTION public.credit_purchases_snapshot()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.clinic_id IS NOT NULL AND NEW.clinic_id_snapshot IS NULL THEN
        SELECT c.name, c.id, c.billing_country
          INTO NEW.clinic_name_snapshot, NEW.clinic_id_snapshot, NEW.billing_country_snapshot
          FROM public.clinics c WHERE c.id = NEW.clinic_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_credit_purchases_snapshot ON public.credit_purchases;
CREATE TRIGGER trigger_credit_purchases_snapshot
    BEFORE INSERT ON public.credit_purchases
    FOR EACH ROW
    EXECUTE FUNCTION public.credit_purchases_snapshot();
