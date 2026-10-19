'use client';
import { useState, type MouseEvent, type ReactNode } from 'react';
import { MotionConfig, motion, useReducedMotion } from 'framer-motion';
import NumberFlow, { type Format } from '@number-flow/react';
import { ArrowRight, MessageCircle, Sparkles, TrendingUp, Trophy } from 'lucide-react';
import { formatMoney, fromMinor, minorDigits } from './format';
import './value.css';

type Props = {
    /** Precio de un crédito en unidad mínima (puede tener decimales: 9900 / 200 = 49,5). */
    costPerCreditCents: number;
    currency: string;
    imageCredits: number;
    videoCredits: number;
};

/** Ticket medio por defecto (editable): magnitud razonable para cada moneda. */
const TICKET_DEFAULT: Record<string, number> = {
    usd: 1500, eur: 1500, gbp: 1500, ars: 1500000, clp: 1500000,
    mxn: 25000, cop: 6000000, pen: 5000, uyu: 60000, brl: 8000,
};

const EASE = [0.22, 1, 0.36, 1] as const;
const rise = {
    hidden: { opacity: 0, y: 22 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const grouped = (n: number) => n.toLocaleString('es', { useGrouping: 'always', maximumFractionDigits: 1 });

const num = (v: string) => {
    const n = Number(v.replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : 0;
};

export function ValueSection({ costPerCreditCents, currency, imageCredits, videoCredits }: Props) {
    const cur = currency.toLowerCase();
    const ticketDefault = TICKET_DEFAULT[cur] ?? 1500;
    const reduce = useReducedMotion();

    const [visits, setVisits] = useState(1000);
    const [tryPct, setTryPct] = useState(5);
    const [closePct, setClosePct] = useState(10);
    const [ticket, setTicket] = useState(ticketDefault);
    const [adCost, setAdCost] = useState(0);

    // Coste por simulación / vídeo en unidad mínima.
    const simMinor = costPerCreditCents * imageCredits;
    const videoMinor = costPerCreditCents * videoCredits;
    const simMajor = fromMinor(simMinor, cur);

    const leads = Math.round(visits * (tryPct / 100));
    const patients = leads * (closePct / 100);
    const revenue = patients * ticket;
    const investment = leads * simMajor;
    const roi = investment > 0 ? revenue / investment : 0;
    const adSpend = adCost > 0 ? leads * adCost : 0;
    const saving = adSpend - investment;

    const zeroDec = minorDigits(cur) === 0;
    const moneyFmt = (v: number): Format => {
        const digits = zeroDec || v >= 100 || Number.isInteger(v) ? 0 : 2;
        return {
            style: 'currency',
            currency: cur.toUpperCase(),
            useGrouping: 'always',
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
        };
    };
    const moneyText = (v: number) => {
        try {
            return new Intl.NumberFormat('es', moneyFmt(v)).format(v);
        } catch {
            return v.toLocaleString('es', { maximumFractionDigits: 2, useGrouping: 'always' });
        }
    };

    const invShare = revenue > 0 ? Math.min(1, Math.max(investment / revenue, 0.006)) : 0;

    function goToPackages(e: MouseEvent<HTMLAnchorElement>) {
        const el = document.getElementById('paquetes');
        if (!el) return;
        e.preventDefault();
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', '#paquetes');
    }

    return (
        <MotionConfig reducedMotion="user">
            <section className="vs" aria-labelledby="vs-title">
                {/* 1 · Titular con el coste real */}
                <motion.header
                    className="vs-head"
                    variants={rise}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.3 }}
                >
                    <div className="vs-head-copy">
                        <span className="mono vs-eyebrow">EL RETORNO DE TUS CRÉDITOS</span>
                        <h2 id="vs-title" className="vs-title">
                            Una simulación cuesta menos que un café. <span>Un paciente nuevo, mucho más.</span>
                        </h2>
                        <p className="lead vs-sub">
                            Cada crédito convierte una visita a tu web en un lead que ya se ha visto con su nueva sonrisa
                            y te ha dejado su WhatsApp.
                        </p>
                    </div>
                    <div className="vs-price" aria-label="Coste real por simulación">
                        <span className="mono vs-price-label">TU COSTE REAL</span>
                        <strong className="vs-price-num"><span className="vs-approx">≈</span>{formatMoney(Math.round(simMinor), cur)}</strong>
                        <span className="vs-price-unit">por simulación</span>
                        {videoCredits > 0 && (
                            <span className="vs-price-alt">≈ {formatMoney(Math.round(videoMinor), cur)} por vídeo</span>
                        )}
                        <span className="vs-price-note">Con el paquete más conveniente</span>
                    </div>
                </motion.header>

                {/* 2 · Calculadora de retorno */}
                <motion.div
                    className="vs-calc"
                    variants={rise}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.05 }}
                >
                    <div className="vs-inputs">
                        <div className="vs-inputs-head">
                            <span className="mono vs-eyebrow">CALCULADORA</span>
                            <h3 className="vs-h3">Haz la cuenta <span>con tus números</span></h3>
                            <p className="vs-hint">Mueve los controles o escribe tu cifra. Todo son tus estimaciones.</p>
                        </div>

                        <Field
                            id="vs-visits"
                            label="Visitas mensuales a tu web"
                            value={visits}
                            onChange={setVisits}
                            min={100}
                            max={20000}
                            step={100}
                            display={grouped(visits)}
                        />
                        <Field
                            id="vs-try"
                            label="Visitantes que prueban el simulador"
                            value={tryPct}
                            onChange={setTryPct}
                            min={0.5}
                            max={30}
                            step={0.5}
                            suffix="%"
                            display={`${tryPct.toLocaleString('es')} %`}
                        />
                        <Field
                            id="vs-close"
                            label="Leads que terminan en tratamiento"
                            value={closePct}
                            onChange={setClosePct}
                            min={1}
                            max={60}
                            step={1}
                            suffix="%"
                            display={`${closePct.toLocaleString('es')} %`}
                        />
                        <Field
                            id="vs-ticket"
                            label="Valor medio de un tratamiento estético"
                            value={ticket}
                            onChange={setTicket}
                            min={ticketDefault / 10}
                            max={ticketDefault * 10}
                            step={ticketDefault / 50}
                            suffix={cur.toUpperCase()}
                            display={moneyText(ticket)}
                        />
                        <OptionalField
                            id="vs-adcost"
                            label="¿Cuánto te cuesta hoy un lead en publicidad?"
                            value={adCost}
                            onChange={setAdCost}
                            suffix={cur.toUpperCase()}
                        />
                    </div>

                    <div className="vs-results" aria-label="Resultado estimado al mes">
                        <span className="vs-results-orb" aria-hidden />
                        <span className="mono vs-results-eyebrow">CADA MES, CON TUS NÚMEROS</span>

                        <dl className="vs-kpis">
                            <Kpi label="Leads con foto y WhatsApp">
                                <NumberFlow value={leads} locales="es" format={{ useGrouping: 'always' }} />
                            </Kpi>
                            <Kpi label="Pacientes nuevos">
                                <NumberFlow value={patients} locales="es" format={{ maximumFractionDigits: 1, useGrouping: 'always' }} />
                            </Kpi>
                            <Kpi label="Ingresos estimados" wide>
                                <NumberFlow value={revenue} locales="es" format={moneyFmt(revenue)} />
                            </Kpi>
                            <Kpi label="Inversión en créditos" wide>
                                <NumberFlow value={investment} locales="es" format={moneyFmt(investment)} />
                            </Kpi>
                        </dl>

                        <div className="vs-roi">
                            <div className="vs-roi-figure">
                                <span className="mono vs-roi-label">RETORNO</span>
                                <span className="vs-roi-num">
                                    {roi > 0 ? (
                                        <NumberFlow
                                            value={roi}
                                            locales="es"
                                            prefix="×"
                                            format={{ maximumFractionDigits: roi >= 10 ? 0 : 1, useGrouping: 'always' }}
                                        />
                                    ) : (
                                        '—'
                                    )}
                                </span>
                            </div>
                            <p className="vs-roi-copy">
                                {roi > 0 ? (
                                    <>Por cada <strong>{moneyText(1)}</strong> en créditos, <strong>{moneyText(roi)}</strong> estimados en tratamientos.</>
                                ) : (
                                    'Ajusta tus números para ver el retorno.'
                                )}
                            </p>
                        </div>

                        <div className="vs-bars" aria-hidden>
                            <div className="vs-bar-row">
                                <span className="vs-bar-name">Inversión</span>
                                <div className="vs-bar-track">
                                    <motion.span
                                        className="vs-bar vs-bar-inv"
                                        initial={false}
                                        animate={{ width: `${invShare * 100}%` }}
                                        transition={{ duration: 0.7, ease: EASE }}
                                    />
                                </div>
                                <span className="vs-bar-val">{moneyText(investment)}</span>
                            </div>
                            <div className="vs-bar-row">
                                <span className="vs-bar-name">Ingresos</span>
                                <div className="vs-bar-track">
                                    <motion.span
                                        className="vs-bar vs-bar-rev"
                                        initial={false}
                                        animate={{ width: revenue > 0 ? '100%' : '0%' }}
                                        transition={{ duration: 0.7, ease: EASE }}
                                    />
                                </div>
                                <span className="vs-bar-val">{moneyText(revenue)}</span>
                            </div>
                        </div>

                        {adSpend > 0 && (
                            <div className="vs-ads">
                                <span className="mono vs-ads-label">AHORRO FRENTE A PUBLICIDAD</span>
                                <strong className="vs-ads-num">
                                    <NumberFlow value={Math.max(saving, 0)} locales="es" format={moneyFmt(Math.max(saving, 0))} />
                                </strong>
                                <span className="vs-ads-copy">
                                    Esos {grouped(leads)} leads te costarían {moneyText(adSpend)} en anuncios.
                                </span>
                            </div>
                        )}

                        <p className="vs-foot">
                            Estimación con tus propios números; los resultados reales dependen de tu web, tu oferta y tu
                            seguimiento. Calculada con 1 simulación por lead.
                        </p>
                    </div>
                </motion.div>

                {/* 3 · Beneficios con datos verificados */}
                <motion.ul
                    className="vs-benefits"
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.1 }}
                    variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
                >
                    <Benefit
                        icon={<Sparkles size={18} />}
                        stat="5 de 5"
                        statNote="indicadores mejoraron"
                        title="Más pacientes convencidos"
                        body="Ver su sonrisa simulada mejora la comprensión, la confianza y la disposición a aceptar el tratamiento."
                        source="Ensayo aleatorizado · Scientific Reports 2026 · 60 pacientes"
                    />
                    <Benefit
                        icon={<MessageCircle size={18} />}
                        stat="hasta 7×"
                        statNote="más probable que califique"
                        title="Responde primero, cierra más"
                        body="Contactar a un lead web en la primera hora lo hace hasta 7 veces más propenso a calificar. Te llega con foto y WhatsApp: escríbele en minutos."
                        source="Harvard Business Review · 2011"
                    />
                    <Benefit
                        icon={<Trophy size={18} />}
                        stat="889"
                        statNote="evaluadores"
                        title="Tu clínica, por delante de la competencia"
                        body="La misma cara con una sonrisa cuidada se percibe más atractiva y competente. Enséñaselo antes que nadie."
                        source="AJODO · 2011 · 889 evaluadores"
                    />
                </motion.ul>

                {/* 4 · CTA */}
                <motion.div
                    className="vs-cta"
                    variants={rise}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.5 }}
                >
                    <div className="vs-cta-copy">
                        <span className="vs-cta-ic" aria-hidden><TrendingUp size={18} /></span>
                        <p>
                            <strong>Invertir en créditos es invertir en pacientes.</strong>{' '}
                            <span>Recarga y deja que tu web trabaje por ti.</span>
                        </p>
                    </div>
                    <a href="#paquetes" className="btn btn-primary vs-cta-btn" onClick={goToPackages}>
                        Elegir un paquete <ArrowRight size={17} aria-hidden />
                    </a>
                </motion.div>
            </section>
        </MotionConfig>
    );
}

function Kpi({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
    return (
        <div className={`vs-kpi${wide ? ' vs-kpi-wide' : ''}`}>
            <dt>{label}</dt>
            <dd>{children}</dd>
        </div>
    );
}

function Field(props: {
    id: string;
    label: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step: number;
    display: string;
    suffix?: string;
}) {
    const { id, label, value, onChange, min, max, step, display, suffix } = props;
    const fill = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    return (
        <div className="vs-field">
            <div className="vs-field-top">
                <label htmlFor={`${id}-range`} className="vs-label">
                    {label}
                    <span className="vs-tag">tu estimación</span>
                </label>
                <div className="vs-num">
                    <input
                        id={`${id}-num`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={step}
                        value={Number.isFinite(value) ? value : ''}
                        onChange={(e) => onChange(num(e.target.value))}
                        aria-label={`${label} (valor exacto)`}
                    />
                    {suffix && <span aria-hidden>{suffix}</span>}
                </div>
            </div>
            <input
                id={`${id}-range`}
                className="vs-range"
                type="range"
                min={min}
                max={max}
                step={step}
                value={Math.min(max, Math.max(min, value))}
                onChange={(e) => onChange(Number(e.target.value))}
                aria-valuetext={display}
                style={{ ['--fill' as string]: `${fill}%` }}
            />
        </div>
    );
}

function OptionalField({
    id,
    label,
    value,
    onChange,
    suffix,
}: {
    id: string;
    label: string;
    value: number;
    onChange: (v: number) => void;
    suffix: string;
}) {
    return (
        <div className="vs-field vs-field-opt">
            <div className="vs-field-top">
                <label htmlFor={id} className="vs-label">
                    {label}
                    <span className="vs-tag">opcional</span>
                </label>
                <div className="vs-num">
                    <input
                        id={id}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        placeholder="—"
                        value={value > 0 ? value : ''}
                        onChange={(e) => onChange(num(e.target.value))}
                    />
                    <span aria-hidden>{suffix}</span>
                </div>
            </div>
            <p className="vs-hint">Si lo indicas, comparamos con lo que pagas por cada lead en anuncios.</p>
        </div>
    );
}

function Benefit({
    icon,
    stat,
    statNote,
    title,
    body,
    source,
}: {
    icon: ReactNode;
    stat: string;
    statNote: string;
    title: string;
    body: string;
    source: string;
}) {
    return (
        <motion.li className="vs-benefit" variants={rise}>
            <div className="vs-benefit-top">
                <span className="vs-benefit-ic" aria-hidden>{icon}</span>
                <span className="vs-benefit-stat">
                    <strong>{stat}</strong>
                    <span>{statNote}</span>
                </span>
            </div>
            <h3 className="vs-benefit-title">{title}</h3>
            <p className="vs-benefit-body">{body}</p>
            <span className="mono vs-benefit-src">Fuente: {source}</span>
        </motion.li>
    );
}
