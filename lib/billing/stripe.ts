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
