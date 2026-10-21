/** Paquetes de créditos (tabla credit_packages). Solo servidor. */
import { db } from '@/lib/db';
import { convertFromUsd, currencyForCountry } from '@/lib/billing/fx';

export interface CreditPackageRow {
    id: string;
    name: string;
    credits: number;
    /** Precio base (USD por defecto). */
    price_cents: number;
    currency: string;
    /** Precios en otras monedas, en céntimos: { eur?: number; ars?: number }. */
    prices: Record<string, number>;
    badge: string | null;
    highlight: boolean;
    active: boolean;
    sort: number;
}

const COLS = 'id, name, credits, price_cents, currency, prices, badge, highlight, active, sort';

export async function listPackages(opts: { includeInactive?: boolean } = {}): Promise<CreditPackageRow[]> {
    const res = await db.query<CreditPackageRow>(
        `SELECT ${COLS} FROM credit_packages ${opts.includeInactive ? '' : 'WHERE active'} ORDER BY sort, price_cents`,
        []
    );
    return res.rows;
}

export async function getActivePackage(id: string): Promise<CreditPackageRow | null> {
    if (typeof id !== 'string' || !/^[a-z0-9_-]{2,32}$/.test(id)) return null;
    return db.queryOne<CreditPackageRow>(`SELECT ${COLS} FROM credit_packages WHERE id = $1 AND active`, [id]);
}

// ── Moneda por país de facturación ──────────────────────────────────────────
export { currencyForCountry } from '@/lib/billing/fx';

/**
 * Precio que paga una clínica según su país: el precio base en USD convertido
 * al tipo de cambio del día. Si el superadmin fijó un precio manual en esa
 * moneda (columna prices), se usa ese.
 */
export async function resolvePrice(pkg: CreditPackageRow, country: string | null | undefined): Promise<{ priceCents: number; currency: string }> {
    const cur = currencyForCountry(country);
    if (cur === 'usd' || pkg.currency !== 'usd') return { priceCents: pkg.price_cents, currency: pkg.currency };
    const manual = pkg.prices?.[cur];
    if (Number.isInteger(manual) && (manual as number) >= 50) return { priceCents: manual as number, currency: cur };
    return convertFromUsd(pkg.price_cents, cur);
}

/** Valida y guarda un paquete (superadmin). Devuelve error legible o null. */
export async function upsertPackage(p: Partial<CreditPackageRow>): Promise<string | null> {
    const id = String(p.id || '').trim().toLowerCase();
    const name = String(p.name || '').trim().slice(0, 40);
    const credits = Number(p.credits);
    const price = Number(p.price_cents);
    const currency = String(p.currency || 'usd').trim().toLowerCase();
    if (!/^[a-z0-9_-]{2,32}$/.test(id)) return 'El identificador solo admite minúsculas, números, - y _ (2–32).';
    if (!name) return 'Ponle un nombre al paquete.';
    if (!Number.isInteger(credits) || credits <= 0 || credits > 100000) return 'Créditos: un entero entre 1 y 100.000.';
    if (!Number.isInteger(price) || price < 50 || price > 10_000_000) return 'Precio inválido (mínimo 0,50).';
    if (!['usd', 'eur', 'ars', 'mxn', 'cop', 'pen', 'uyu', 'brl', 'gbp'].includes(currency)) return 'Moneda no admitida.';
    // Precios locales opcionales (EUR para España, ARS para Argentina).
    const prices: Record<string, number> = {};
    for (const cur of ['eur', 'ars'] as const) {
        const v = p.prices?.[cur];
        if (v === undefined || v === null || (v as unknown) === '') continue;
        const n = Number(v);
        if (!Number.isInteger(n) || n < 50 || n > 1_000_000_000) return `Precio en ${cur.toUpperCase()} inválido.`;
        prices[cur] = n;
    }
    await db.query(
        `INSERT INTO credit_packages (id, name, credits, price_cents, currency, badge, highlight, active, sort, prices, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
         ON CONFLICT (id) DO UPDATE SET name=$2, credits=$3, price_cents=$4, currency=$5, badge=$6,
             highlight=$7, active=$8, sort=$9, prices=$10, updated_at=now()`,
        [id, name, credits, price, currency, p.badge ? String(p.badge).trim().slice(0, 24) || null : null,
         Boolean(p.highlight), p.active !== false, Number.isInteger(Number(p.sort)) ? Number(p.sort) : 0, JSON.stringify(prices)]
    );
    return null;
}
