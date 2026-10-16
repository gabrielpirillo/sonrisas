/**
 * Stripe client + credit package catalog.
 *
 * Stripe is used purely as the payment rail for buying prepaid credits. The
 * app drives its own Checkout flow (lib/billing/credits.topUp is invoked from
 * the webhook on a completed payment). No subscriptions are used here.
 */
import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
    if (!_stripe) {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
        // No apiVersion pin → uses the Stripe account's default API version.
        _stripe = new Stripe(key);
    }
    return _stripe;
}

export function stripeEnabled(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Credit packages offered for purchase. `priceId` is the Stripe Price created
 * in your Stripe dashboard (one-time price). Configure the ids via env so the
 * catalog can change without code edits. Amounts are illustrative defaults
 * derived from the cost analysis (~4x markup); tune to your margin target.
 */
export interface CreditPackage {
    id: string;
    label: string;
    credits: number;
    priceId: string | undefined;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
    { id: 'starter', label: '50 créditos', credits: 50, priceId: process.env.STRIPE_PRICE_STARTER },
    { id: 'growth', label: '200 créditos', credits: 200, priceId: process.env.STRIPE_PRICE_GROWTH },
    { id: 'pro', label: '1000 créditos', credits: 1000, priceId: process.env.STRIPE_PRICE_PRO },
];

export function getPackage(id: string): CreditPackage | undefined {
    return CREDIT_PACKAGES.find((p) => p.id === id);
}
