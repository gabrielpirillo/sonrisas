'use server';

/**
 * Server actions de billing para el panel (autenticado con Better Auth).
 * Usan la organización activa → clínica enlazada.
 */
import { db } from '@/lib/db';
import { getAuthContext, requireAuthContext } from '@/lib/auth/context';
import { getStripe, getPackage, stripeEnabled, CREDIT_PACKAGES } from '@/lib/billing/stripe';

export interface BillingOverview {
    clinic: { id: string; name: string; credit_balance: number; public_widget_key: string } | null;
    costs: Array<{ action: string; credits: number }>;
    packages: Array<{ id: string; label: string; credits: number; available: boolean }>;
    recentLedger: Array<{
        created_at: string;
        action: string | null;
        kind: string;
        credits_delta: number;
        balance_after: number;
    }>;
    stripeEnabled: boolean;
}

export async function getBillingOverview(): Promise<BillingOverview> {
    const ctx = await getAuthContext();
    const clinic = ctx?.clinic ?? null;

    const costs = await db.query<{ action: string; credits: number }>(
        'SELECT action, credits FROM credit_costs ORDER BY action',
        []
    );

    let recentLedger: BillingOverview['recentLedger'] = [];
    if (clinic) {
        const ledger = await db.query(
            `SELECT created_at, action, kind, credits_delta, balance_after
             FROM credit_ledger WHERE clinic_id = $1
             ORDER BY created_at DESC LIMIT 25`,
            [clinic.id]
        );
        recentLedger = ledger.rows as any;
    }

    return {
        clinic: clinic
            ? {
                  id: clinic.id,
                  name: clinic.name,
                  credit_balance: clinic.credit_balance,
                  public_widget_key: clinic.public_widget_key,
              }
            : null,
        costs: costs.rows,
        packages: CREDIT_PACKAGES.map((p) => ({
            id: p.id,
            label: p.label,
            credits: p.credits,
            available: Boolean(p.priceId),
        })),
        recentLedger,
        stripeEnabled: stripeEnabled(),
    };
}

/** Crea una sesión de Stripe Checkout para comprar un paquete de créditos. */
export async function createCheckoutSession(
    packageId: string
): Promise<{ url?: string; error?: string }> {
    try {
        const ctx = await requireAuthContext(['owner', 'admin']);
        if (ctx.impersonatedBy) return { error: 'No disponible durante una impersonación (solo lectura).' };
        if (!ctx.clinic) return { error: 'No hay clínica activa.' };
        if (!stripeEnabled()) return { error: 'Stripe no está configurado.' };

        const pkg = getPackage(packageId);
        if (!pkg) return { error: 'Paquete inválido.' };
        if (!pkg.priceId) return { error: `Falta STRIPE_PRICE para "${pkg.id}".` };

        const stripe = getStripe();
        let stripeCustomerId = ctx.clinic.stripe_customer_id;
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                name: ctx.clinic.name,
                metadata: { clinic_id: ctx.clinic.id },
            });
            stripeCustomerId = customer.id;
            await db.query('UPDATE clinics SET stripe_customer_id = $1 WHERE id = $2', [
                stripeCustomerId,
                ctx.clinic.id,
            ]);
        }

        const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '';
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            customer: stripeCustomerId,
            line_items: [{ price: pkg.priceId, quantity: 1 }],
            metadata: { clinic_id: ctx.clinic.id, package_id: pkg.id, credits: String(pkg.credits) },
            success_url: `${appUrl}/administracion/creditos?status=success`,
            cancel_url: `${appUrl}/administracion/creditos?status=cancel`,
        });

        return { url: session.url ?? undefined };
    } catch (e: any) {
        return { error: e.message || 'Error al crear el checkout.' };
    }
}
