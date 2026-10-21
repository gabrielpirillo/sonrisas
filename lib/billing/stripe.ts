/**
 * Cliente de Stripe (solo servidor).
 *
 * Stripe es únicamente la pasarela para comprar créditos prepago. Los paquetes
 * y precios viven en la base de datos (credit_packages) y el importe se envía a
 * Checkout con `price_data` calculado en el servidor: el navegador nunca decide
 * cuánto se cobra ni cuántos créditos se suman.
 */
import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
    if (!_stripe) {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
        _stripe = new Stripe(key, {
            maxNetworkRetries: 2,
            timeout: 20_000,
            appInfo: { name: 'Smile Fast' },
        });
    }
    return _stripe;
}

/** Hay clave secreta y secreto de webhook: sin webhook no se pueden acreditar compras. */
export function stripeEnabled(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

/** 'live' | 'test' según la clave configurada (para avisos en el panel). */
export function stripeMode(): 'live' | 'test' | null {
    const key = process.env.STRIPE_SECRET_KEY || '';
    if (key.startsWith('sk_live_') || key.startsWith('rk_live_')) return 'live';
    if (key.startsWith('sk_test_') || key.startsWith('rk_test_')) return 'test';
    return null;
}

/** URL pública de la app para los retornos de Checkout (nunca del header Host). */
export function appBaseUrl(): string {
    const url = process.env.APP_URL || process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || '';
    return url.replace(/\/+$/, '');
}

/** Columna de clinics con el customer de Stripe del modo de la clave actual. */
export function customerColumn(): 'stripe_customer_id_live' | 'stripe_customer_id_test' {
    return stripeMode() === 'test' ? 'stripe_customer_id_test' : 'stripe_customer_id_live';
}

function originOf(url: string): string | null {
    try {
        const u = new URL(url);
        return u.protocol === 'https:' || u.protocol === 'http:' ? u.origin : null;
    } catch {
        return null;
    }
}

/**
 * Base para success/cancel de Checkout: el Origin de la petición solo si está
 * en la allowlist (APP_URL + TRUSTED_ORIGINS); si no, APP_URL.
 */
export function checkoutBaseUrl(requestOrigin: string | null | undefined): string {
    const base = appBaseUrl();
    const origin = requestOrigin ? originOf(requestOrigin) : null;
    if (!origin) return base;
    if (origin === originOf(base)) return base;
    const trusted = (process.env.TRUSTED_ORIGINS || '')
        .split(',')
        .map((o) => originOf(o.trim()))
        .filter(Boolean);
    return trusted.includes(origin) ? origin : base;
}

/** URL https alojada por Stripe (checkout.stripe.com u otro *.stripe.com). */
export function isStripeHostedUrl(url: string | null | undefined): url is string {
    if (!url) return false;
    try {
        const u = new URL(url);
        return u.protocol === 'https:' && (u.hostname === 'stripe.com' || u.hostname.endsWith('.stripe.com'));
    } catch {
        return false;
    }
}
