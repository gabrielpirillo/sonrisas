-- Paquetes de créditos editables (superadmin) y registro de compras con Stripe.
-- El importe a cobrar SIEMPRE sale de aquí (servidor), nunca del navegador.

CREATE TABLE IF NOT EXISTS public.credit_packages (
    id TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9_-]{2,32}$'),
    name TEXT NOT NULL,
    credits INTEGER NOT NULL CHECK (credits > 0 AND credits <= 100000),
    price_cents INTEGER NOT NULL CHECK (price_cents >= 50 AND price_cents <= 10000000),
    currency TEXT NOT NULL DEFAULT 'usd' CHECK (currency ~ '^[a-z]{3}$'),
    badge TEXT,
    highlight BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    sort INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.credit_packages (id, name, credits, price_cents, currency, badge, highlight, sort) VALUES
    ('inicio', 'Inicio', 50, 2900, 'usd', NULL, false, 1),
    ('clinica', 'Clínica', 200, 9900, 'usd', 'Recomendado', true, 2),
    ('crecimiento', 'Crecimiento', 600, 24900, 'usd', 'Mejor precio', false, 3)
ON CONFLICT (id) DO NOTHING;

-- Una fila por intento de compra. El webhook solo acredita si el importe y la
-- moneda que confirma Stripe coinciden con lo registrado aquí.
CREATE TABLE IF NOT EXISTS public.credit_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    user_id TEXT,
    package_id TEXT NOT NULL,
    package_name TEXT NOT NULL,
    credits INTEGER NOT NULL CHECK (credits > 0),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    currency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'failed', 'refunded')),
    stripe_session_id TEXT UNIQUE,
    stripe_payment_intent TEXT,
    receipt_url TEXT,
    paid_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_clinic ON public.credit_purchases(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_pi ON public.credit_purchases(stripe_payment_intent) WHERE stripe_payment_intent IS NOT NULL;

-- Eventos de Stripe ya procesados (defensa extra ante reintentos/duplicados).
CREATE TABLE IF NOT EXISTS public.stripe_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
