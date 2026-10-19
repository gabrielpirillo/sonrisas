"use client";

import { forwardRef, type ReactNode } from "react";

import { motion, useReducedMotion } from "framer-motion";
import { RotateCcw } from "lucide-react";

/* IDs deterministas (useId no coincide entre servidor y cliente en este layout). */
const slug = (s: string) =>
    "ws-" + s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* ── Interruptor accesible (role="switch") con pulgar animado ───────────── */
export function Toggle({
    checked,
    onChange,
    label,
    id,
    disabled,
    describedBy,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    id?: string;
    disabled?: boolean;
    describedBy?: string;
}) {
    const reduceMotion = useReducedMotion();
    return (
        <button
            id={id}
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            aria-describedby={describedBy}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={"ws-switch" + (checked ? " is-on" : "")}
        >
            <motion.span
                className="ws-switch-thumb"
                layout={!reduceMotion}
                transition={{ type: "spring", stiffness: 520, damping: 34 }}
            />
        </button>
    );
}

/* ── Fila de opción con título, descripción e interruptor ──────────────── */
export function ToggleRow({
    icon,
    title,
    description,
    checked,
    onChange,
}: {
    icon?: ReactNode;
    title: string;
    description: ReactNode;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    const id = slug("toggle " + title);
    return (
        <div className={"ws-toggle-row" + (checked ? " is-on" : "")}>
            {icon && <span className="ws-toggle-ic" aria-hidden>{icon}</span>}
            <div className="ws-toggle-text">
                <label htmlFor={id} className="ws-toggle-title">{title}</label>
                <p className="ws-toggle-desc" id={id + "-d"}>{description}</p>
            </div>
            <Toggle id={id} checked={checked} onChange={onChange} label={title} describedBy={id + "-d"} />
        </div>
    );
}

/* ── Cabecera de bloque dentro de una pestaña ──────────────────────────── */
export function Block({ title, description, children, aside }: { title: string; description?: ReactNode; children: ReactNode; aside?: ReactNode }) {
    return (
        <section className="ws-block">
            <div className="ws-block-head">
                <div style={{ minWidth: 0 }}>
                    <h3 className="ws-block-title">{title}</h3>
                    {description && <p className="ws-block-desc">{description}</p>}
                </div>
                {aside}
            </div>
            {children}
        </section>
    );
}

/* ── Campo de texto con contador, valor por defecto y "restablecer" ───── */
type TextFieldProps = {
    label: string;
    /** ID del campo (por defecto, derivado de la etiqueta). */
    id?: string;
    value: string;
    onChange: (v: string) => void;
    max?: number;
    placeholder?: string;
    /** Valor por defecto: muestra el botón "Restablecer" cuando difiere. */
    defaultValue?: string;
    multiline?: boolean;
    rows?: number;
    hint?: ReactNode;
    error?: string | null;
    prefix?: ReactNode;
    inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
    type?: string;
    autoComplete?: string;
    labelExtra?: ReactNode;
};

export const TextField = forwardRef<HTMLInputElement | HTMLTextAreaElement, TextFieldProps>(function TextField(
    { label, id: idProp, value, onChange, max, placeholder, defaultValue, multiline, rows = 3, hint, error, prefix, inputMode, type = "text", autoComplete = "off", labelExtra },
    ref,
) {
    const id = idProp ?? slug(label);
    const len = value.length;
    const near = max ? len >= Math.floor(max * 0.9) : false;
    const canReset = defaultValue !== undefined && value !== defaultValue;
    const describedBy = [hint ? id + "-hint" : null, error ? id + "-err" : null].filter(Boolean).join(" ") || undefined;

    return (
        <div className={"ws-field" + (error ? " has-error" : "")}>
            <div className="ws-field-top">
                <label htmlFor={id} className="ws-label">{label}</label>
                {labelExtra}
                <div className="ws-field-meta">
                    {canReset && (
                        <button type="button" className="ws-reset" onClick={() => onChange(defaultValue!)} title="Volver al texto original">
                            <RotateCcw size={12} aria-hidden />
                            Restablecer
                            <span className="sr-only"> {label}</span>
                        </button>
                    )}
                    {max && (
                        <span className={"ws-count" + (near ? " is-near" : "")} aria-live="polite" aria-label={`${len} de ${max} caracteres`}>
                            {len}/{max}
                        </span>
                    )}
                </div>
            </div>
            <div className={"ws-input-wrap" + (prefix ? " has-prefix" : "")}>
                {prefix && <span className="ws-prefix" aria-hidden>{prefix}</span>}
                {multiline ? (
                    <textarea
                        ref={ref as React.Ref<HTMLTextAreaElement>}
                        id={id}
                        className="field ws-textarea"
                        value={value}
                        rows={rows}
                        maxLength={max}
                        placeholder={placeholder}
                        onChange={(e) => onChange(e.target.value)}
                        aria-invalid={Boolean(error) || undefined}
                        aria-describedby={describedBy}
                    />
                ) : (
                    <input
                        ref={ref as React.Ref<HTMLInputElement>}
                        id={id}
                        type={type}
                        className="field ws-input"
                        value={value}
                        maxLength={max}
                        placeholder={placeholder}
                        inputMode={inputMode}
                        autoComplete={autoComplete}
                        onChange={(e) => onChange(e.target.value)}
                        aria-invalid={Boolean(error) || undefined}
                        aria-describedby={describedBy}
                    />
                )}
            </div>
            {error ? (
                <p className="ws-error" id={id + "-err"} role="alert">{error}</p>
            ) : hint ? (
                <p className="ws-hint" id={id + "-hint"}>{hint}</p>
            ) : null}
        </div>
    );
});
