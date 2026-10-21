/**
 * Utilidades de formato para créditos y paquetes (cliente y servidor).
 * Los importes se guardan en la unidad mínima que usa Stripe: centavos en
 * casi todas las monedas, pero el peso chileno (CLP) no tiene decimales.
 */

/** Monedas admitidas como precio base de un paquete (las mismas que valida el servidor). */
export const CURRENCIES = ['usd', 'eur', 'ars', 'mxn', 'cop', 'pen', 'uyu', 'brl', 'gbp'] as const;

/** Tope de Stripe: 8 dígitos en la unidad mínima. */
export const STRIPE_MAX_MINOR = 99_999_999;

const ZERO_DECIMAL = new Set(['clp', 'pyg']);

/** Dígitos de la unidad mínima (2 → centavos, 0 → sin decimales). */
export function minorDigits(currency: string): number {
    return ZERO_DECIMAL.has(currency.toLowerCase()) ? 0 : 2;
}

/** Unidad mínima → importe en la moneda (p. ej. 9900 usd → 99). */
export function fromMinor(amount: number, currency: string): number {
    return amount / 10 ** minorDigits(currency);
}

/**
 * Importe en la moneda → unidad mínima. NaN si no es válido.
 * - Coma = decimales: "39,90" → 3990.
 * - Un punto con 1–2 decimales también es decimal: "39.90" → 3990.
 * - Puntos en grupos de 3 son separador de miles: "39.900" → 39900 (unidades),
 *   "1.500.000" → 1500000, "1.500,50" → 1500,50.
 */
export function toMinor(value: string, currency: string): number {
    const s = value.trim().replace(/\s/g, '');
    let clean: string;
    if (/^\d+$/.test(s)) clean = s;
    else if (/^\d+,\d+$/.test(s)) clean = s.replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) clean = s.replace(/\./g, '');
    else if (/^\d{1,3}(\.\d{3})+,\d+$/.test(s)) clean = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d+\.\d{1,2}$/.test(s)) clean = s;
    else return NaN;
    return Math.round(Number(clean) * 10 ** minorDigits(currency));
}

const fmtCache = new Map<string, Intl.NumberFormat>();
function moneyFormatter(currency: string, maxDigits?: number): Intl.NumberFormat {
    const key = `${currency}:${maxDigits ?? 'd'}`;
    let f = fmtCache.get(key);
    if (!f) {
        try {
            f = new Intl.NumberFormat('es', {
                style: 'currency',
                currency: currency.toUpperCase(),
                ...(maxDigits != null ? { minimumFractionDigits: 0, maximumFractionDigits: maxDigits } : {}),
            });
        } catch {
            f = new Intl.NumberFormat('es', { maximumFractionDigits: 2 });
        }
        fmtCache.set(key, f);
    }
    return f;
}

/** Formatea un importe en unidad mínima, p. ej. 9900 usd → "99,00 US$". */
export function formatMoney(amountMinor: number, currency: string): string {
    const v = fromMinor(amountMinor, currency);
    // Importes redondos sin decimales: "39 US$", "55.000 ARS".
    return (Number.isInteger(v) ? moneyFormatter(currency, 0) : moneyFormatter(currency)).format(v);
}

/** Precio por crédito con hasta 3 decimales para que no se pierda la diferencia. */
export function formatUnitPrice(amountMinor: number, credits: number, currency: string): string {
    if (!credits) return '—';
    const digits = minorDigits(currency) === 0 ? 1 : 3;
    return moneyFormatter(currency, digits).format(fromMinor(amountMinor, currency) / credits);
}

export const fmtInt = (n: number) => n.toLocaleString('es');
