'use client';
import NumberFlow from '@number-flow/react';
import { ArrowDown, Coins, Image as ImageIcon, Video } from 'lucide-react';
import { useMounted } from './useMounted';
import './credits.css';

export const LOW_BALANCE = 10;

type Props = {
    balance: number;
    clinicName: string | null;
    imageCost: number | null;
    videoCost: number | null;
    /** Muestra el enlace "Recargar" hacia los paquetes. */
    canRecharge: boolean;
};

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function BalanceHero({ balance, clinicName, imageCost, videoCost, canRecharge }: Props) {
    const mounted = useMounted();
    // Cuenta desde 0 tras hidratar; luego anima cada cambio (p. ej. tras una compra).
    const shown = mounted ? balance : 0;
    const sims = imageCost ? Math.floor(balance / imageCost) : null;
    const videos = videoCost ? Math.floor(balance / videoCost) : null;
    const low = balance < LOW_BALANCE;
    const empty = balance <= 0;

    return (
        <section className={`cr-hero${low ? ' cr-hero-low' : ''}`} aria-labelledby="cr-hero-label">
            <span className="cr-hero-orb" aria-hidden />
            <span className="cr-hero-grid" aria-hidden />

            <div className="cr-hero-main">
                <div className="cr-hero-top">
                    <span id="cr-hero-label" className="mono cr-hero-eyebrow">
                        SALDO DISPONIBLE{clinicName ? ` · ${clinicName}` : ''}
                    </span>
                    <span className="cr-hero-coin" aria-hidden><Coins size={19} /></span>
                </div>

                <div className="cr-hero-figure">
                    <NumberFlow
                        className="cr-hero-num"
                        value={shown}
                        locales="es"
                        format={{ useGrouping: true }}
                        transformTiming={{ duration: 1100, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
                        spinTiming={{ duration: 1100, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
                        aria-hidden
                    />
                    <span className="sr-only">{balance.toLocaleString('es')} créditos</span>
                    <span className="cr-hero-unit" aria-hidden>{plural(balance, 'crédito', 'créditos')}</span>
                </div>

                {low && (
                    <div className="cr-low" role="status">
                        <span className="cr-low-dot" aria-hidden />
                        <span className="cr-low-msg">
                            {empty
                                ? 'Sin saldo: tus pacientes no podrán generar simulaciones.'
                                : 'Saldo bajo: recarga pronto para no frenar a tus pacientes.'}
                        </span>
                        {canRecharge && (
                            <a href="#paquetes" className="cr-low-link">
                                Recargar <ArrowDown size={13} aria-hidden />
                            </a>
                        )}
                    </div>
                )}
            </div>

            <div className="cr-hero-side">
                <span className="mono cr-side-label" aria-hidden>TE ALCANZA PARA</span>
                <dl className="cr-eq-list">
                <div className="cr-eq">
                    <dt className="sr-only">Simulaciones</dt>
                    <dd>
                        <span className="cr-eq-ic" aria-hidden><ImageIcon size={16} /></span>
                        <span className="cr-eq-body">
                            <strong>
                                {sims == null ? '—' : <>≈ <NumberFlow value={mounted ? sims : 0} locales="es" /></>}
                            </strong>
                            <span>{sims === 1 ? 'simulación' : 'simulaciones'}{imageCost ? ` · ${imageCost} ${plural(imageCost, 'crédito', 'créditos')} c/u` : ''}</span>
                        </span>
                    </dd>
                </div>
                <div className="cr-eq">
                    <dt className="sr-only">Vídeos</dt>
                    <dd>
                        <span className="cr-eq-ic" aria-hidden><Video size={16} /></span>
                        <span className="cr-eq-body">
                            <strong>
                                {videos == null ? '—' : <>≈ <NumberFlow value={mounted ? videos : 0} locales="es" /></>}
                            </strong>
                            <span>{videos === 1 ? 'vídeo' : 'vídeos'}{videoCost ? ` · ${videoCost} ${plural(videoCost, 'crédito', 'créditos')} c/u` : ''}</span>
                        </span>
                    </dd>
                </div>
                </dl>
            </div>
        </section>
    );
}
