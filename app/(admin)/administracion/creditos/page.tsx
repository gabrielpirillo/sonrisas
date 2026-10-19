import { getBillingOverview } from '@/lib/billing/actions';
import { isImpersonating } from '@/lib/auth/context';
import { BuyCredits } from '@/components/panel/BuyCredits';
import { BalanceHero } from '@/components/panel/credits/BalanceHero';
import { CheckoutReturn } from '@/components/panel/credits/CheckoutReturn';
import { CreditsHistory } from '@/components/panel/credits/CreditsHistory';
import { ValueSection } from '@/components/panel/credits/ValueSection';
import { PageHead } from '@/components/admin/qoves/PageHead';

export const dynamic = 'force-dynamic';

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === 'string' && v.length <= 200 ? v : undefined);
const iso = (d: string | Date) => {
    const t = new Date(d);
    return Number.isNaN(t.getTime()) ? new Date(0).toISOString() : t.toISOString();
};

export default async function CreditosPage({ searchParams }: { searchParams: Promise<SP> }) {
    const [data, impersonating, sp] = await Promise.all([getBillingOverview(), isImpersonating(), searchParams]);
    const balance = data.clinic?.credit_balance ?? 0;
    const cost = (a: string) => {
        const c = data.costs.find((x) => x.action === a)?.credits;
        return c && c > 0 ? c : null;
    };
    const imageCost = cost('image');
    const videoCost = cost('video');

    // Sección de valor: precio por crédito del paquete activo más conveniente (en su moneda).
    const pricedPkgs = data.packages.filter((p) => p.credits > 0 && p.priceCents > 0);
    const valueCurrency = pricedPkgs[0]?.currency ?? null;
    const unitCents = pricedPkgs.filter((p) => p.currency === valueCurrency).map((p) => p.priceCents / p.credits);
    const costPerCreditCents = unitCents.length ? Math.min(...unitCents) : 0;

    const purchases = data.purchases.map((p) => ({ ...p, createdAt: iso(p.createdAt) }));
    const ledger = data.recentLedger.map((l) => ({ ...l, created_at: iso(l.created_at) }));

    return (
        <div className="admin-page">
            <PageHead
                eyebrow="FACTURACIÓN"
                title="Créditos"
                accent="de tu clínica"
                subtitle="Cada simulación consume créditos de tu saldo. Recarga cuando lo necesites."
            />

            <BalanceHero
                balance={balance}
                clinicName={data.clinic?.name ?? null}
                imageCost={imageCost}
                videoCost={videoCost}
                canRecharge={data.stripeEnabled && data.canBuy}
            />

            <section id="paquetes" className="card cr-buy-card" aria-labelledby="cr-buy-title">
                <div className="cr-buy-head">
                    <span className="mono" style={{ fontSize: 9.5, color: 'var(--blue-deep)' }}>RECARGAR</span>
                    {data.stripeEnabled ? (
                        <>
                            <h2 id="cr-buy-title" className="cr-h2">Elige tu paquete <span>de créditos</span></h2>
                            <p className="lead cr-buy-sub">Pago único, sin suscripción. Los créditos se suman a tu saldo en cuanto se confirma el pago.</p>
                        </>
                    ) : (
                        <h2 id="cr-buy-title" className="cr-h2">Recarga <span>tu saldo</span></h2>
                    )}
                </div>
                <BuyCredits
                    billingCountry={data.billingCountry}
                    packages={data.packages}
                    imageCost={imageCost}
                    videoCost={videoCost}
                    stripeEnabled={data.stripeEnabled}
                    stripeMode={data.stripeMode}
                    canBuy={data.canBuy}
                    impersonating={impersonating}
                    hasClinic={Boolean(data.clinic)}
                />
            </section>

            {valueCurrency && costPerCreditCents > 0 && imageCost && (
                <ValueSection
                    costPerCreditCents={costPerCreditCents}
                    currency={valueCurrency}
                    imageCredits={imageCost}
                    videoCredits={videoCost ?? 0}
                />
            )}

            <CreditsHistory purchases={purchases} ledger={ledger} />

            <CheckoutReturn compra={one(sp.compra)} sessionId={one(sp.session_id)} estado={one(sp.estado)} />
        </div>
    );
}
