-- Moneda según el país de facturación de la clínica:
-- España → EUR, Argentina → ARS, resto del mundo → USD.
-- price_cents/currency siguen siendo el precio base en USD; `prices` guarda los
-- importes en otras monedas (en céntimos/centavos), p. ej. {"eur": 3900, "ars": 4500000}.
ALTER TABLE public.credit_packages ADD COLUMN IF NOT EXISTS prices JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS billing_country TEXT CHECK (billing_country ~ '^[A-Z]{2}$');

-- Catálogo acordado: Inicio 39, Profesional 99, Ahorro 249 (USD y EUR).
-- Los precios en pesos argentinos se cargan desde Superadmin → Configuración.
UPDATE public.credit_packages SET name = 'Inicio', price_cents = 3900, currency = 'usd',
    prices = jsonb_set(prices, '{eur}', '3900'), badge = NULL, highlight = false, sort = 1, updated_at = now()
WHERE id = 'inicio';
UPDATE public.credit_packages SET name = 'Profesional', price_cents = 9900, currency = 'usd',
    prices = jsonb_set(prices, '{eur}', '9900'), badge = 'Recomendado', highlight = true, sort = 2, updated_at = now()
WHERE id = 'clinica';
UPDATE public.credit_packages SET name = 'Ahorro', price_cents = 24900, currency = 'usd',
    prices = jsonb_set(prices, '{eur}', '24900'), badge = 'Mejor precio', highlight = false, sort = 3, updated_at = now()
WHERE id = 'crecimiento';
