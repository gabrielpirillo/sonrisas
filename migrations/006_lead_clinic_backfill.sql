-- 006 · Asignar clínica a los leads que quedaron sin ella
--
-- Hasta ahora el widget creaba leads sin clinic_id. El panel pasa a filtrar
-- estrictamente por clínica, así que esos leads se asignan a la clínica
-- `default` (la que adopta la primera organización) y sus generaciones heredan
-- la clínica del lead. Idempotente: se puede ejecutar varias veces.

DO $$
DECLARE
    v_default UUID;
BEGIN
    SELECT id INTO v_default FROM public.clinics WHERE slug = 'default';
    IF v_default IS NULL THEN
        RAISE NOTICE 'No existe la clínica default; no hay nada que asignar.';
        RETURN;
    END IF;

    UPDATE public.leads SET clinic_id = v_default WHERE clinic_id IS NULL;

    UPDATE public.generations g
       SET clinic_id = l.clinic_id
      FROM public.leads l
     WHERE g.lead_id = l.id
       AND g.clinic_id IS DISTINCT FROM l.clinic_id;
END $$;
