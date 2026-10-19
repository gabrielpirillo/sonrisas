-- La clínica por defecto (slug 'default') es la que recibe los leads de la
-- demo pública (/demo, widget sin clave). Le damos un saldo inicial para que la
-- simulación funcione, solo si nunca tuvo movimientos de créditos.
WITH target AS (
    SELECT c.id, c.credit_balance
    FROM public.clinics c
    WHERE c.slug = 'default'
      AND NOT EXISTS (SELECT 1 FROM public.credit_ledger l WHERE l.clinic_id = c.id)
),
upd AS (
    UPDATE public.clinics c
    SET credit_balance = t.credit_balance + 200
    FROM target t
    WHERE c.id = t.id
    RETURNING c.id, c.credit_balance
)
INSERT INTO public.credit_ledger (clinic_id, action, kind, credits_delta, balance_after, idempotency_key, metadata)
SELECT id, 'topup', 'adjust', 200, credit_balance, 'demo-initial-credits-' || id, '{"reason":"Saldo inicial de la demo pública"}'::jsonb
FROM upd;
