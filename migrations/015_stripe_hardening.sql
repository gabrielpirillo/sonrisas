-- Endurecimiento del flujo de compra con Stripe.

-- 1) Customer de Stripe por modo (live/test): un id creado con una clave no
--    existe con la otra. Los ids actuales se crearon con la clave LIVE.
--    La columna legacy stripe_customer_id se conserva (solo lectura).
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS stripe_customer_id_live TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS stripe_customer_id_test TEXT;
UPDATE public.clinics SET stripe_customer_id_live = stripe_customer_id
WHERE stripe_customer_id IS NOT NULL AND stripe_customer_id_live IS NULL;

-- 2) Webhook: un evento solo cuenta como procesado cuando su manejo terminó bien.
--    Los eventos ya registrados se procesaron (antes se borraban si fallaban).
ALTER TABLE public.stripe_events ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
UPDATE public.stripe_events SET processed_at = received_at WHERE processed_at IS NULL;

-- 3) Nuevo estado `review` (pago cobrado que no coincide con lo registrado) y
--    motivo del estado para diagnóstico.
DO $$
DECLARE r record;
BEGIN
    FOR r IN SELECT conname FROM pg_constraint
             WHERE conrelid = 'public.credit_purchases'::regclass AND contype = 'c'
               AND pg_get_constraintdef(oid) ILIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE public.credit_purchases DROP CONSTRAINT %I', r.conname);
    END LOOP;
END $$;
ALTER TABLE public.credit_purchases ADD CONSTRAINT credit_purchases_status_check
    CHECK (status IN ('pending', 'paid', 'expired', 'failed', 'refunded', 'review'));
ALTER TABLE public.credit_purchases ADD COLUMN IF NOT EXISTS status_reason TEXT;

-- 4) Importe reembolsado (unidad mínima) para calcular ingresos netos.
ALTER TABLE public.credit_purchases ADD COLUMN IF NOT EXISTS amount_refunded_cents INTEGER NOT NULL DEFAULT 0
    CHECK (amount_refunded_cents >= 0);
-- Relleno desde el ledger: la clave idempotente guarda el acumulado reembolsado
-- (stripe-refund:<charge>:<amount_refunded>).
UPDATE public.credit_purchases p
SET amount_refunded_cents = LEAST(p.amount_cents, sub.refunded)
FROM (
    SELECT metadata->>'purchase_id' AS pid, MAX(split_part(idempotency_key, ':', 3)::bigint) AS refunded
    FROM public.credit_ledger
    WHERE metadata->>'reason' = 'stripe_refund' AND idempotency_key ~ '^stripe-refund:[^:]+:[0-9]{1,12}$'
    GROUP BY 1
) sub
WHERE p.id::text = sub.pid;
UPDATE public.credit_purchases SET amount_refunded_cents = amount_cents
WHERE status = 'refunded' AND amount_refunded_cents < amount_cents;

-- 5) Conciliación periódica de compras pendientes.
CREATE INDEX IF NOT EXISTS idx_credit_purchases_pending ON public.credit_purchases(created_at)
    WHERE status = 'pending' AND stripe_session_id IS NOT NULL;
