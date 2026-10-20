'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Plus, RotateCcw, Save, Star, Trash2 } from 'lucide-react';
import { savePackageAction } from '@/lib/billing/actions';
import { CURRENCIES, formatMoney, formatUnitPrice, fromMinor, minorDigits, toMinor } from '@/components/panel/credits/format';
import '@/components/panel/credits/credits.css';

/** Mismo formato que devuelve listAllPackagesAction (CreditPackageRow). */
export type PackageRow = {
    id: string;
    name: string;
    credits: number;
    price_cents: number;
    currency: string;
    prices?: Record<string, number>;
    badge: string | null;
    highlight: boolean;
    active: boolean;
    sort: number;
};

type Draft = {
    key: string;
    saved: boolean;
    id: string;
    name: string;
    credits: string;
    price: string;
    currency: string;
    /** Precio para España (EUR) y Argentina (ARS); vacío = se cobra el precio base. */
    priceEur: string;
    priceArs: string;
    badge: string;
    highlight: boolean;
    active: boolean;
    sort: string;
};

const priceText = (cents: number, currency: string) => {
    const v = fromMinor(cents, currency);
    return minorDigits(currency) === 0 ? String(v) : v.toFixed(2).replace('.', ',');
};

const toDraft = (r: PackageRow): Draft => ({
    key: `s:${r.id}`,
    saved: true,
    id: r.id,
    name: r.name,
    credits: String(r.credits),
    price: priceText(r.price_cents, r.currency),
    currency: r.currency,
    priceEur: r.prices?.eur ? priceText(r.prices.eur, 'eur') : '',
    priceArs: r.prices?.ars ? priceText(r.prices.ars, 'ars') : '',
    badge: r.badge ?? '',
    highlight: r.highlight,
    active: r.active,
    sort: String(r.sort),
});

const same = (a: Draft, b: Draft) =>
    a.id === b.id && a.name === b.name && a.credits === b.credits && a.price === b.price && a.currency === b.currency &&
    a.priceEur === b.priceEur && a.priceArs === b.priceArs &&
    a.badge === b.badge && a.highlight === b.highlight && a.active === b.active && a.sort === b.sort;

/** Validación local (la del servidor manda; esto es solo para avisar antes). */
function validate(d: Draft): string | null {
    if (!/^[a-z0-9_-]{2,32}$/.test(d.id.trim().toLowerCase())) return 'Identificador: minúsculas, números, - y _ (2–32).';
    if (!d.name.trim()) return 'Ponle un nombre al paquete.';
    const credits = Number(d.credits);
    if (!Number.isInteger(credits) || credits <= 0 || credits > 100000) return 'Créditos: un entero entre 1 y 100.000.';
    const cents = toMinor(d.price, d.currency);
    if (!Number.isFinite(cents)) return 'Precio inválido.';
    if (cents < 50) return minorDigits(d.currency) === 0 ? 'Precio mínimo: 50.' : 'Precio mínimo: 0,50.';
    if (cents > 10_000_000) return 'Precio demasiado alto.';
    for (const [label, v, cur] of [['EUR', d.priceEur, 'eur'], ['ARS', d.priceArs, 'ars']] as const) {
        if (!v.trim()) continue;
        const c = toMinor(v, cur);
        if (!Number.isFinite(c) || c < 50) return `Precio en ${label} inválido.`;
    }
    if (d.sort.trim() && !/^-?\d+$/.test(d.sort.trim())) return 'Orden: un número entero.';
    return null;
}

let seq = 0;

export function PackagesEditor({ initial, loadError }: { initial: PackageRow[]; loadError?: string }) {
    const router = useRouter();
    const [rows, setRows] = useState<Draft[]>(() => initial.map(toDraft));
    const [base, setBase] = useState<Record<string, Draft>>(() => Object.fromEntries(initial.map((r) => [`s:${r.id}`, toDraft(r)])));
    const [saving, setSaving] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    // Paquete recién creado: se enfoca su nombre y se lleva a la vista.
    const focusNext = useRef<string | null>(null);
    useEffect(() => {
        const key = focusNext.current;
        if (!key) return;
        focusNext.current = null;
        const el = document.getElementById(`pe-${key}-name`);
        if (!el) return;
        el.focus({ preventScroll: true });
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.closest('.pe-row')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });

    const set = (key: string, patch: Partial<Draft>) => {
        setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
        setErrors((e) => { if (!e[key]) return e; const n = { ...e }; delete n[key]; return n; });
    };

    function addNew() {
        seq += 1;
        const maxSort = rows.reduce((m, r) => Math.max(m, Number(r.sort) || 0), 0);
        const key = `n:${Date.now()}:${seq}`;
        setRows((rs) => [
            { key, saved: false, id: '', name: '', credits: '100', price: '', currency: rs[0]?.currency || 'usd', priceEur: '', priceArs: '', badge: '', highlight: false, active: true, sort: String(maxSort + 1) },
            ...rs,
        ]);
        focusNext.current = key;
    }

    async function save(d: Draft) {
        const err = validate(d);
        if (err) {
            setErrors((e) => ({ ...e, [d.key]: err }));
            toast.error(err);
            return;
        }
        if (!d.saved && rows.some((r) => r.saved && r.id === d.id.trim().toLowerCase())) {
            const msg = 'Ya existe un paquete con ese identificador.';
            setErrors((e) => ({ ...e, [d.key]: msg }));
            toast.error(msg);
            return;
        }
        setSaving(d.key);
        let res: { ok: true } | { ok: false; error: string };
        try {
            res = await savePackageAction({
                id: d.id.trim().toLowerCase(),
                name: d.name.trim(),
                credits: Number(d.credits),
                price_cents: toMinor(d.price, d.currency),
                currency: d.currency,
                prices: {
                    ...(d.priceEur.trim() ? { eur: toMinor(d.priceEur, 'eur') } : {}),
                    ...(d.priceArs.trim() ? { ars: toMinor(d.priceArs, 'ars') } : {}),
                },
                badge: d.badge.trim() || null,
                highlight: d.highlight,
                active: d.active,
                sort: Number(d.sort.trim() || 0),
            });
        } catch {
            res = { ok: false, error: 'No se pudo guardar. Revisa tu conexión.' };
        }
        setSaving(null);
        if (!res.ok) {
            setErrors((e) => ({ ...e, [d.key]: res.error }));
            toast.error(res.error);
            return;
        }
        const savedDraft: Draft = { ...d, id: d.id.trim().toLowerCase(), name: d.name.trim(), badge: d.badge.trim(), saved: true };
        setRows((rs) => rs.map((r) => (r.key === d.key ? savedDraft : r)));
        setBase((b) => ({ ...b, [d.key]: savedDraft }));
        toast.success(d.saved ? `Paquete «${savedDraft.name}» actualizado` : `Paquete «${savedDraft.name}» creado`);
        router.refresh();
    }

    function revert(d: Draft) {
        if (!d.saved) {
            setRows((rs) => rs.filter((r) => r.key !== d.key));
        } else if (base[d.key]) {
            set(d.key, base[d.key]);
        }
        setErrors((e) => { const n = { ...e }; delete n[d.key]; return n; });
    }

    const featuredActive = rows.filter((r) => r.saved && r.active && r.highlight).length;

    if (loadError) {
        return <p className="cr-blocked" role="alert">{loadError}</p>;
    }

    return (
        <MotionConfig reducedMotion="user">
            <div className="pe-top">
                <p className="lead" style={{ fontSize: 13.5 }}>
                    Lo que ven y pagan las clínicas. El importe se cobra siempre desde aquí (servidor). Los paquetes inactivos no se muestran.
                    Los precios de España y Argentina son opcionales: si quedan vacíos se cobra el precio base.
                </p>
                <button type="button" className="btn btn-primary btn-sm" onClick={addNew}>
                    <Plus size={15} aria-hidden /> Nuevo paquete
                </button>
            </div>

            {featuredActive > 1 && (
                <div className="cr-testmode" role="note" style={{ marginBottom: 14 }}>
                    <AlertTriangle size={14} aria-hidden />
                    <span>Hay {featuredActive} paquetes destacados activos. Lo ideal es destacar solo uno.</span>
                </div>
            )}

            {rows.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-ic"><Star size={22} /></span>
                    <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>No hay paquetes</strong>
                    <span style={{ fontSize: 14 }}>Crea el primero con «Nuevo paquete».</span>
                </div>
            ) : (
                <div className="pe-list">
                    <AnimatePresence initial={false}>
                        {rows.map((d) => {
                            const dirty = !d.saved || !base[d.key] || !same(d, base[d.key]);
                            const cents = toMinor(d.price, d.currency);
                            const credits = Number(d.credits);
                            const unit = Number.isFinite(cents) && credits > 0 ? formatUnitPrice(cents, credits, d.currency) : '—';
                            const total = Number.isFinite(cents) ? formatMoney(cents, d.currency) : '—';
                            const busy = saving === d.key;
                            const err = errors[d.key];
                            const fid = (f: string) => `pe-${d.key}-${f}`;
                            return (
                                <motion.div
                                    key={d.key}
                                    layout
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                    className={`pe-row${d.active ? '' : ' pe-row-off'}${d.highlight ? ' pe-row-hl' : ''}${!d.saved ? ' pe-row-new' : ''}${dirty ? ' pe-row-dirty' : ''}`}
                                >
                                    <div className="pe-row-head">
                                        <div className="pe-title">
                                            <strong>{d.name.trim() || 'Nuevo paquete'}</strong>
                                            {!d.saved && <span className="pe-tag pe-tag-new">Sin guardar</span>}
                                            {d.saved && dirty && <span className="pe-tag">Cambios sin guardar</span>}
                                            {!d.active && <span className="pe-tag pe-tag-off">Inactivo</span>}
                                        </div>
                                        <div className="pe-calc" aria-live="polite">
                                            <span>{total}</span>
                                            <span className="cr-dim">· {unit} / crédito</span>
                                        </div>
                                    </div>

                                    <div className="pe-grid">
                                        <label className="pe-f pe-f-id" htmlFor={fid('id')}>
                                            <span className="mono">ID</span>
                                            <input
                                                id={fid('id')}
                                                className="field pe-in"
                                                value={d.id}
                                                onChange={(e) => set(d.key, { id: e.target.value.toLowerCase() })}
                                                readOnly={d.saved}
                                                aria-readonly={d.saved}
                                                placeholder="p. ej. clinica"
                                                maxLength={32}
                                                autoComplete="off"
                                                spellCheck={false}
                                                title={d.saved ? 'El identificador no se puede cambiar una vez guardado' : undefined}
                                            />
                                        </label>
                                        <label className="pe-f pe-f-wide" htmlFor={fid('name')}>
                                            <span className="mono">Nombre</span>
                                            <input id={fid('name')} className="field pe-in" value={d.name} maxLength={40} onChange={(e) => set(d.key, { name: e.target.value })} placeholder="p. ej. Clínica" />
                                        </label>
                                        <label className="pe-f pe-f-credits" htmlFor={fid('credits')}>
                                            <span className="mono">Créditos</span>
                                            <input id={fid('credits')} className="field pe-in" type="number" min={1} max={100000} step={1} inputMode="numeric" enterKeyHint="next" value={d.credits} onChange={(e) => set(d.key, { credits: e.target.value })} />
                                        </label>
                                        <label className="pe-f pe-f-price" htmlFor={fid('price')}>
                                            <span className="mono">Precio</span>
                                            <input id={fid('price')} className="field pe-in" inputMode="decimal" value={d.price} onChange={(e) => set(d.key, { price: e.target.value })} placeholder={minorDigits(d.currency) === 0 ? '9900' : '99,00'} />
                                        </label>
                                        <label className="pe-f pe-f-cur" htmlFor={fid('cur')}>
                                            <span className="mono">Moneda</span>
                                            <select id={fid('cur')} className="field pe-in" value={d.currency} onChange={(e) => set(d.key, { currency: e.target.value })}>
                                                {CURRENCIES.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                                            </select>
                                        </label>
                                        <label className="pe-f pe-f-eur" htmlFor={fid('eur')}>
                                            <span className="mono">España (EUR)</span>
                                            <input id={fid('eur')} className="field pe-in" inputMode="decimal" value={d.priceEur} onChange={(e) => set(d.key, { priceEur: e.target.value })} placeholder="Opcional" title="Vacío = precio base" />
                                        </label>
                                        <label className="pe-f pe-f-ars" htmlFor={fid('ars')}>
                                            <span className="mono">Argentina (ARS)</span>
                                            <input id={fid('ars')} className="field pe-in" inputMode="decimal" value={d.priceArs} onChange={(e) => set(d.key, { priceArs: e.target.value })} placeholder="Opcional" title="Vacío = precio base" />
                                        </label>
                                        <label className="pe-f pe-f-badge" htmlFor={fid('badge')}>
                                            <span className="mono">Etiqueta</span>
                                            <input id={fid('badge')} className="field pe-in" value={d.badge} maxLength={24} onChange={(e) => set(d.key, { badge: e.target.value })} placeholder="Recomendado" />
                                        </label>
                                        <label className="pe-f pe-f-sort" htmlFor={fid('sort')}>
                                            <span className="mono">Orden</span>
                                            <input id={fid('sort')} className="field pe-in" type="number" step={1} inputMode="numeric" value={d.sort} onChange={(e) => set(d.key, { sort: e.target.value })} />
                                        </label>
                                    </div>

                                    {err && <p className="pe-err" role="alert">{err}</p>}
                                    <div className="pe-row-foot">
                                        <div className="pe-toggles">
                                            <Toggle label="Destacado" checked={d.highlight} onChange={(v) => set(d.key, { highlight: v })} />
                                            <Toggle label="Activo" checked={d.active} onChange={(v) => set(d.key, { active: v })} />
                                        </div>
                                        <div className="pe-actions">
                                            {dirty && (
                                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => revert(d)} disabled={busy}>
                                                    {d.saved ? <><RotateCcw size={14} aria-hidden /> Descartar</> : <><Trash2 size={14} aria-hidden /> Quitar</>}
                                                </button>
                                            )}
                                            <button type="button" className="btn btn-primary btn-sm" onClick={() => save(d)} disabled={busy || !dirty}>
                                                {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Save size={14} aria-hidden />}
                                                {d.saved ? 'Guardar' : 'Crear paquete'}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </MotionConfig>
    );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button type="button" role="switch" aria-checked={checked} className={`pe-sw${checked ? ' pe-sw-on' : ''}`} onClick={() => onChange(!checked)}>
            <span className="pe-sw-track" aria-hidden><span className="pe-sw-thumb" /></span>
            {label}
        </button>
    );
}
