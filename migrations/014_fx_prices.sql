-- Precios locales por tipo de cambio: se borran los importes fijos en EUR/ARS
-- para que cada país pague el precio en USD convertido al cambio del día.
UPDATE credit_packages SET prices = '{}'::jsonb;
