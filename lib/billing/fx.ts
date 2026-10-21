/**
 * Moneda por país y tipo de cambio desde USD (solo servidor).
 *
 * Los paquetes tienen su precio base en USD. Para cada país de facturación se
 * convierte al tipo de cambio del día (cacheado 6 h, con valores de respaldo si
 * el proveedor no responde) y se redondea a un importe "limpio".
 */

export type BillingCurrency = 'usd' | 'eur' | 'ars' | 'cop' | 'clp' | 'uyu' | 'pyg';

/** País (ISO-2) → moneda de cobro. Ecuador usa USD. Resto del mundo: USD. */
const COUNTRY_CURRENCY: Record<string, BillingCurrency> = {
    ES: 'eur', AR: 'ars', CO: 'cop', CL: 'clp', UY: 'uyu', PY: 'pyg', EC: 'usd',
};

export function currencyForCountry(country: string | null | undefined): BillingCurrency {
    return (country && COUNTRY_CURRENCY[country.toUpperCase()]) || 'usd';
}

/** Monedas sin decimales en Stripe. */
export const ZERO_DECIMAL = new Set(['clp', 'pyg']);

/** Redondeo comercial por moneda (en unidades, no en centavos). */
const ROUND_TO: Record<BillingCurrency, number> = {
    usd: 1, eur: 1, ars: 1000, cop: 1000, clp: 100, uyu: 10, pyg: 1000,
};

/** Respaldo aproximado (USD → moneda) por si el proveedor no está disponible. */
const FALLBACK: Record<BillingCurrency, number> = {
    usd: 1, eur: 0.92, ars: 1400, cop: 4000, clp: 950, uyu: 40, pyg: 7900,
};

/** Tope de Stripe: 8 dígitos en la unidad mínima. */
const STRIPE_MAX_MINOR = 99_999_999;

let cache: { at: number; rates: Record<string, number> } | null = null;
const TTL = 6 * 60 * 60_000;

async function usdRates(): Promise<Record<string, number>> {
    if (cache && Date.now() - cache.at < TTL) return cache.rates;
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD', {
            signal: AbortSignal.timeout(4000),
            cache: 'no-store',
        });
        const json = (await res.json()) as { result?: string; rates?: Record<string, number> };
        if (json.result === 'success' && json.rates) {
            const rates: Record<string, number> = {};
            for (const cur of Object.keys(FALLBACK) as BillingCurrency[]) {
                const r = Number(json.rates[cur.toUpperCase()]);
                // Valor plausible (entre la mitad y 3× el respaldo) o se ignora.
                rates[cur] = r > FALLBACK[cur] / 2 && r < FALLBACK[cur] * 3 ? r : FALLBACK[cur];
            }
            cache = { at: Date.now(), rates };
            return rates;
        }
    } catch {
        /* sin red: respaldo */
    }
    if (cache) return cache.rates;
    return { ...FALLBACK };
}

/**
 * Convierte un precio en centavos de USD a la moneda del país.
 * Devuelve USD si la moneda es USD o si el importe superaría el tope de Stripe.
 */
export async function convertFromUsd(usdCents: number, cur: BillingCurrency): Promise<{ priceCents: number; currency: string }> {
    if (cur === 'usd') return { priceCents: usdCents, currency: 'usd' };
    const rate = (await usdRates())[cur] ?? FALLBACK[cur];
    const step = ROUND_TO[cur];
    const units = Math.max(step, Math.round(((usdCents / 100) * rate) / step) * step);
    const minor = ZERO_DECIMAL.has(cur) ? units : units * 100;
    if (minor > STRIPE_MAX_MINOR) return { priceCents: usdCents, currency: 'usd' };
    return { priceCents: minor, currency: cur };
}
