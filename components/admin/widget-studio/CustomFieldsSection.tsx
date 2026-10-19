"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, Reorder, motion, useDragControls, useReducedMotion } from "framer-motion";
import {
    AlignLeft, ArrowDown, ArrowUp, CalendarDays, ChevronsUpDown, CircleDot, Copy, GripVertical, Hash,
    Lock, Mail, Pencil, Phone, Plus, SquareCheck, Trash2, Type, User, X, Check, Wand2, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { CUSTOM_FIELD_TYPES, MAX_CUSTOM_FIELDS, type CustomField, type CustomFieldType, type WidgetConfig } from "@/lib/widgetConfig";
import { Block, TextField, Toggle } from "./fields";
import { FIELD_LIMITS, customFieldErrors, hasFieldErrors, type SectionId } from "./validation";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const TYPE_META: Record<CustomFieldType, { icon: React.ComponentType<{ size?: number }>; desc: string }> = {
    text: { icon: Type, desc: "Una línea: ciudad, tratamiento previo…" },
    textarea: { icon: AlignLeft, desc: "Respuesta larga o comentarios." },
    select: { icon: ChevronsUpDown, desc: "Lista desplegable; se elige una opción." },
    radio: { icon: CircleDot, desc: "Pocas opciones visibles; se elige una." },
    checkbox: { icon: SquareCheck, desc: "Una casilla para marcar sí o no." },
    number: { icon: Hash, desc: "Solo números: edad, presupuesto…" },
    date: { icon: CalendarDays, desc: "Selector de fecha." },
};
const typeLabel = (t: CustomFieldType) => CUSTOM_FIELD_TYPES.find((x) => x.type === t)?.label ?? t;
const hasOptions = (t: CustomFieldType) => t === "select" || t === "radio";
const hasPlaceholder = (t: CustomFieldType) => t === "text" || t === "textarea" || t === "number" || t === "select";

/** Plantillas útiles para clínicas dentales (un clic). */
const TEMPLATES: Omit<CustomField, "id">[] = [
    { label: "¿Qué te gustaría mejorar?", type: "select", required: false, placeholder: "Elige una opción", options: ["Color / blanqueamiento", "Alineación", "Dientes faltantes", "Forma o tamaño", "Otro"] },
    { label: "¿Cuándo te gustaría empezar?", type: "radio", required: false, options: ["Lo antes posible", "En 1–3 meses", "Más adelante"] },
    { label: "Tratamiento de interés", type: "select", required: false, placeholder: "Elige un tratamiento", options: ["Ortodoncia invisible", "Carillas", "Implantes", "Blanqueamiento", "Diseño de sonrisa", "No lo sé todavía"] },
    { label: "¿Tienes seguro dental?", type: "radio", required: false, options: ["Sí", "No"] },
    { label: "Comentarios", type: "textarea", required: false, placeholder: "Cuéntanos lo que quieras" },
    { label: "Fecha preferida para tu visita", type: "date", required: false },
];

function slugId(label: string) {
    return label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32) || "campo";
}
function uniqueId(base: string, taken: CustomField[]) {
    const ids = new Set(taken.map((f) => f.id));
    let id = base;
    let n = 2;
    while (ids.has(id)) id = `${base}_${n++}`.slice(0, 40);
    return id;
}
const randomId = () => `campo_${Math.random().toString(36).slice(2, 8)}`;

/* ════════════════════════════════════════════════════════════════════════ */

export function CustomFieldsSection({
    draft,
    setFields,
    goTo,
}: {
    draft: WidgetConfig;
    setFields: (f: CustomField[]) => void;
    goTo: (tab: SectionId) => void;
}) {
    const fields = draft.customFields;
    const [editingId, setEditingId] = useState<string | null>(null);
    const [picking, setPicking] = useState(false);
    const reduceMotion = useReducedMotion();
    const full = fields.length >= MAX_CUSTOM_FIELDS;

    const update = (id: string, p: Partial<CustomField>) => setFields(fields.map((f) => (f.id === id ? { ...f, ...p } : f)));
    const remove = (id: string) => {
        const f = fields.find((x) => x.id === id);
        setFields(fields.filter((x) => x.id !== id));
        if (editingId === id) setEditingId(null);
        toast(`Campo «${f?.label || "sin título"}» eliminado`, { description: "Guarda y publica para aplicarlo." });
    };
    const move = (idx: number, dir: -1 | 1) => {
        const to = idx + dir;
        if (to < 0 || to >= fields.length) return;
        const next = [...fields];
        [next[idx], next[to]] = [next[to], next[idx]];
        setFields(next);
    };
    const duplicate = (f: CustomField) => {
        if (full) return;
        const copy: CustomField = { ...f, id: uniqueId(f.id + "_copia", fields), label: f.label ? `${f.label} (copia)`.slice(0, FIELD_LIMITS.label) : "", options: f.options ? [...f.options] : undefined };
        const idx = fields.findIndex((x) => x.id === f.id);
        const next = [...fields];
        next.splice(idx + 1, 0, copy);
        setFields(next);
        setEditingId(copy.id);
    };
    const addOfType = (type: CustomFieldType) => {
        if (full) return;
        const f: CustomField = { id: uniqueId(randomId(), fields), label: "", type, required: false, options: hasOptions(type) ? ["", ""] : undefined };
        setFields([...fields, f]);
        setPicking(false);
        setEditingId(f.id);
    };
    const addTemplate = (t: Omit<CustomField, "id">) => {
        if (full) return;
        const f: CustomField = { ...t, id: uniqueId(slugId(t.label), fields), options: t.options ? [...t.options] : undefined };
        setFields([...fields, f]);
        toast.success(`Añadido: ${t.label}`);
    };
    const usedLabels = new Set(fields.map((f) => f.label.trim().toLowerCase()));

    return (
        <>
            <Block title="Campos fijos" description="Siempre forman parte del formulario.">
                <ul className="ws-base-fields">
                    <BaseRow icon={<User size={16} />} label="Nombre completo" badge="Obligatorio" />
                    <BaseRow icon={<Mail size={16} />} label="Correo electrónico" badge="Obligatorio" />
                    <BaseRow
                        icon={<Phone size={16} />}
                        label="Teléfono / WhatsApp"
                        badge={draft.features.askPhone ? "Obligatorio" : "Desactivado"}
                        off={!draft.features.askPhone}
                        action={<button type="button" className="ws-link-btn" onClick={() => goTo("features")} title="Activar o desactivar en Funciones">Ajustar</button>}
                    />
                    <BaseRow icon={<ShieldCheck size={16} />} label="Mayoría de edad y aceptación de privacidad" badge="Obligatorio" />
                </ul>
            </Block>

            <Block
                title="Tus preguntas"
                description="Pide los datos que necesitas para preparar la consulta. Aparecen después de los campos fijos."
                aside={<span className={"ws-count-pill" + (full ? " is-full" : "")}>{fields.length}/{MAX_CUSTOM_FIELDS}</span>}
            >
                {fields.length === 0 && !picking && (
                    <div className="ws-fields-empty">
                        <span className="empty-ic" aria-hidden><Plus size={20} /></span>
                        <strong>Aún no hay preguntas adicionales</strong>
                        <span>Añade un campo o empieza con una plantilla.</span>
                    </div>
                )}

                <Reorder.Group axis="y" values={fields} onReorder={setFields} className="ws-cf-list" as="ol">
                    <AnimatePresence initial={false}>
                        {fields.map((f, i) => (
                            <FieldCard
                                key={f.id}
                                field={f}
                                index={i}
                                count={fields.length}
                                editing={editingId === f.id}
                                canDuplicate={!full}
                                onEdit={() => setEditingId(editingId === f.id ? null : f.id)}
                                onChange={(p) => update(f.id, p)}
                                onRemove={() => remove(f.id)}
                                onDuplicate={() => duplicate(f)}
                                onMove={(d) => move(i, d)}
                            />
                        ))}
                    </AnimatePresence>
                </Reorder.Group>

                <AnimatePresence initial={false} mode="wait">
                    {picking ? (
                        <motion.div
                            key="picker"
                            className="ws-type-picker"
                            initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={reduceMotion ? undefined : { opacity: 0, y: 6, scale: 0.98 }}
                            transition={{ duration: 0.22, ease: EASE_OUT }}
                        >
                            <div className="ws-type-picker-head">
                                <strong>¿Qué tipo de campo?</strong>
                                <button type="button" className="icon-btn" onClick={() => setPicking(false)} aria-label="Cerrar selector de tipo"><X size={15} /></button>
                            </div>
                            <div className="ws-type-grid">
                                {CUSTOM_FIELD_TYPES.map((t, i) => {
                                    const Icon = TYPE_META[t.type].icon;
                                    return (
                                        <motion.button
                                            key={t.type}
                                            type="button"
                                            className="ws-type-opt"
                                            onClick={() => addOfType(t.type)}
                                            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: reduceMotion ? 0 : i * 0.03, duration: 0.2 }}
                                        >
                                            <span className="ws-type-ic" aria-hidden><Icon size={17} /></span>
                                            <span className="ws-type-name">{t.label}</span>
                                            <span className="ws-type-desc">{TYPE_META[t.type].desc}</span>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="add" className="ws-add-row" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduceMotion ? undefined : { opacity: 0 }}>
                            <button type="button" className="btn btn-white btn-sm" onClick={() => { setPicking(true); setEditingId(null); }} disabled={full}>
                                <Plus size={15} aria-hidden /> Añadir campo
                            </button>
                            {full && <span className="ws-hint" style={{ margin: 0 }}>Has llegado al máximo de {MAX_CUSTOM_FIELDS} campos.</span>}
                        </motion.div>
                    )}
                </AnimatePresence>
            </Block>

            <Block title="Plantillas" description="Preguntas habituales en clínicas dentales. Puedes editarlas después.">
                <div className="ws-templates">
                    {TEMPLATES.map((t) => {
                        const Icon = TYPE_META[t.type].icon;
                        const used = usedLabels.has(t.label.toLowerCase());
                        return (
                            <button key={t.label} type="button" className={"ws-template" + (used ? " is-used" : "")} onClick={() => addTemplate(t)} disabled={full || used}>
                                <span className="ws-template-ic" aria-hidden>{used ? <Check size={14} /> : <Icon size={14} />}</span>
                                <span className="ws-template-text">
                                    <strong>{t.label}</strong>
                                    <span>{used ? "Añadido" : typeLabel(t.type)}</span>
                                </span>
                                {!used && <Wand2 size={14} aria-hidden className="ws-template-go" />}
                            </button>
                        );
                    })}
                </div>
            </Block>
        </>
    );
}

function BaseRow({ icon, label, badge, off, action }: { icon: React.ReactNode; label: string; badge: string; off?: boolean; action?: React.ReactNode }) {
    return (
        <li className={"ws-base-row" + (off ? " is-off" : "")}>
            <span className="ws-cf-ic" aria-hidden>{icon}</span>
            <span className="ws-base-label">{label}</span>
            {action}
            <span className={"ws-badge" + (off ? " is-off" : "")}>{badge}</span>
            <Lock size={13} aria-label="Campo fijo" className="ws-base-lock" />
        </li>
    );
}

/* ── Tarjeta de campo (arrastrable) con editor en línea ─────────────────── */
function FieldCard({
    field: f, index, count, editing, canDuplicate, onEdit, onChange, onRemove, onDuplicate, onMove,
}: {
    field: CustomField;
    index: number;
    count: number;
    editing: boolean;
    canDuplicate: boolean;
    onEdit: () => void;
    onChange: (p: Partial<CustomField>) => void;
    onRemove: () => void;
    onDuplicate: () => void;
    onMove: (d: -1 | 1) => void;
}) {
    const controls = useDragControls();
    const reduceMotion = useReducedMotion();
    const Icon = TYPE_META[f.type].icon;
    const errs = customFieldErrors(f);
    const invalid = hasFieldErrors(f);
    const title = f.label.trim() || "Campo sin título";

    return (
        <Reorder.Item
            value={f}
            as="li"
            dragListener={false}
            dragControls={controls}
            className={"ws-cf" + (editing ? " is-editing" : "") + (invalid ? " has-error" : "")}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -16, transition: { duration: 0.18 } }}
            whileDrag={{ scale: 1.015, boxShadow: "0 24px 44px -24px rgba(19,27,34,0.55)" }}
        >
            <div className="ws-cf-row">
                <button
                    type="button"
                    className="ws-grip"
                    aria-label={`Arrastrar para reordenar «${title}»`}
                    onPointerDown={(e) => { e.preventDefault(); controls.start(e); }}
                    tabIndex={-1}
                >
                    <GripVertical size={16} />
                </button>
                <span className="ws-cf-ic" aria-hidden><Icon size={16} /></span>
                <button type="button" className="ws-cf-main" onClick={onEdit} aria-expanded={editing}>
                    <span className={"ws-cf-label" + (f.label.trim() ? "" : " is-empty")}>{title}</span>
                    <span className="ws-cf-meta">
                        {typeLabel(f.type)}
                        {hasOptions(f.type) && f.options ? ` · ${f.options.filter((o) => o.trim()).length} opciones` : ""}
                    </span>
                </button>
                {f.required && <span className="ws-badge">Obligatorio</span>}
                {invalid && <span className="ws-badge is-error">Revisar</span>}
                <div className="ws-cf-actions">
                    <button type="button" className="icon-btn ws-icon-sm" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Subir «${title}»`} title="Subir"><ArrowUp size={14} /></button>
                    <button type="button" className="icon-btn ws-icon-sm" onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`Bajar «${title}»`} title="Bajar"><ArrowDown size={14} /></button>
                    <button type="button" className={"icon-btn ws-icon-sm" + (editing ? " is-active" : "")} onClick={onEdit} aria-label={`${editing ? "Cerrar edición de" : "Editar"} «${title}»`} title={editing ? "Cerrar" : "Editar"}>
                        {editing ? <Check size={14} /> : <Pencil size={14} />}
                    </button>
                    <button type="button" className="icon-btn ws-icon-sm ws-hide-xs" onClick={onDuplicate} disabled={!canDuplicate} aria-label={`Duplicar «${title}»`} title="Duplicar"><Copy size={14} /></button>
                    <button type="button" className="icon-btn ws-icon-sm icon-btn-danger" onClick={onRemove} aria-label={`Eliminar «${title}»`} title="Eliminar"><Trash2 size={14} /></button>
                </div>
            </div>

            <AnimatePresence initial={false}>
                {editing && (
                    <motion.div
                        key="editor"
                        className="ws-cf-editor-wrap"
                        initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: EASE_OUT }}
                    >
                        <div className="ws-cf-editor">
                            <div className="ws-field">
                                <span className="ws-label" id={`ws-cf-${f.id}-type`}>Tipo</span>
                                <div className="ws-type-chips" role="radiogroup" aria-labelledby={`ws-cf-${f.id}-type`}>
                                    {CUSTOM_FIELD_TYPES.map((t) => {
                                        const TIcon = TYPE_META[t.type].icon;
                                        const on = f.type === t.type;
                                        return (
                                            <button
                                                key={t.type}
                                                type="button"
                                                role="radio"
                                                aria-checked={on}
                                                className={"chip ws-type-chip" + (on ? " chip-on" : "")}
                                                onClick={() => onChange({
                                                    type: t.type,
                                                    options: hasOptions(t.type) ? (f.options && f.options.length ? f.options : ["", ""]) : undefined,
                                                    placeholder: hasPlaceholder(t.type) ? f.placeholder : undefined,
                                                })}
                                            >
                                                <TIcon size={13} /> {t.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <TextField
                                id={`ws-cf-${f.id}-label`}
                                label={f.type === "checkbox" ? "Texto junto a la casilla" : "Pregunta"}
                                value={f.label}
                                onChange={(v) => onChange({ label: v })}
                                max={FIELD_LIMITS.label}
                                placeholder={f.type === "checkbox" ? "Ej.: Quiero recibir novedades de la clínica" : "Ej.: ¿Qué te gustaría mejorar?"}
                                error={errs.label}
                            />

                            {hasPlaceholder(f.type) && (
                                <TextField
                                    id={`ws-cf-${f.id}-ph`}
                                    label="Texto de ejemplo (opcional)"
                                    value={f.placeholder ?? ""}
                                    onChange={(v) => onChange({ placeholder: v || undefined })}
                                    max={FIELD_LIMITS.placeholder}
                                    placeholder={f.type === "select" ? "Ej.: Elige una opción" : "Se muestra dentro del campo vacío"}
                                />
                            )}

                            {hasOptions(f.type) && (
                                <OptionsEditor fieldId={f.id} options={f.options ?? []} onChange={(options) => onChange({ options })} error={errs.options} />
                            )}

                            <TextField
                                id={`ws-cf-${f.id}-help`}
                                label="Ayuda (opcional)"
                                value={f.help ?? ""}
                                onChange={(v) => onChange({ help: v || undefined })}
                                max={FIELD_LIMITS.help}
                                placeholder="Texto pequeño bajo el campo"
                            />

                            <div className="ws-cf-required">
                                <div>
                                    <label htmlFor={`ws-cf-${f.id}-req`} className="ws-label">Obligatorio</label>
                                    <p className="ws-hint">El paciente no podrá continuar sin responder.</p>
                                </div>
                                <Toggle id={`ws-cf-${f.id}-req`} checked={f.required} onChange={(v) => onChange({ required: v })} label="Campo obligatorio" />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Reorder.Item>
    );
}

/* ── Opciones de desplegable / opción única ─────────────────────────────── */
function OptionsEditor({ fieldId, options, onChange, error }: { fieldId: string; options: string[]; onChange: (o: string[]) => void; error?: string }) {
    const reduceMotion = useReducedMotion();
    // Enfoca la opción recién añadida tras el render.
    const focusIdx = useRef<number | null>(null);
    useEffect(() => {
        if (focusIdx.current === null) return;
        document.getElementById(`ws-cf-${fieldId}-opt-${focusIdx.current}`)?.focus();
        focusIdx.current = null;
    }, [options.length, fieldId]);
    const set = (i: number, v: string) => onChange(options.map((o, j) => (j === i ? v : o)));
    const remove = (i: number) => onChange(options.filter((_, j) => j !== i));
    const move = (i: number, d: -1 | 1) => {
        const to = i + d;
        if (to < 0 || to >= options.length) return;
        const next = [...options];
        [next[i], next[to]] = [next[to], next[i]];
        onChange(next);
    };
    const add = () => {
        if (options.length >= FIELD_LIMITS.options) return;
        focusIdx.current = options.length;
        onChange([...options, ""]);
    };

    return (
        <div className="ws-field">
            <div className="ws-field-top">
                <span className="ws-label">Opciones</span>
                <span className="ws-field-meta"><span className="ws-count">{options.length}/{FIELD_LIMITS.options}</span></span>
            </div>
            <ol className="ws-opts">
                <AnimatePresence initial={false}>
                    {options.map((o, i) => (
                        <motion.li
                            key={i}
                            className="ws-opt"
                            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <span className="ws-opt-num" aria-hidden>{i + 1}</span>
                            <input
                                id={`ws-cf-${fieldId}-opt-${i}`}
                                className="field ws-input ws-opt-input"
                                value={o}
                                maxLength={FIELD_LIMITS.option}
                                placeholder={`Opción ${i + 1}`}
                                aria-label={`Opción ${i + 1}`}
                                aria-invalid={(!o.trim() && Boolean(error)) || undefined}
                                onChange={(e) => set(i, e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
                            />
                            <button type="button" className="icon-btn ws-icon-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Subir opción ${i + 1}`}><ArrowUp size={13} /></button>
                            <button type="button" className="icon-btn ws-icon-sm" onClick={() => move(i, 1)} disabled={i === options.length - 1} aria-label={`Bajar opción ${i + 1}`}><ArrowDown size={13} /></button>
                            <button type="button" className="icon-btn ws-icon-sm icon-btn-danger" onClick={() => remove(i)} aria-label={`Quitar opción ${i + 1}`}><X size={13} /></button>
                        </motion.li>
                    ))}
                </AnimatePresence>
            </ol>
            <div className="ws-inline-actions">
                <button type="button" className="ws-link-btn" onClick={add} disabled={options.length >= FIELD_LIMITS.options}>
                    <Plus size={14} aria-hidden /> Añadir opción
                </button>
                <span className="ws-hint" style={{ margin: 0 }}>Pulsa Intro para añadir otra.</span>
            </div>
            {error && <p className="ws-error" role="alert">{error}</p>}
        </div>
    );
}
