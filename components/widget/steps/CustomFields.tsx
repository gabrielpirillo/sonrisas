"use client";

import { customFieldsComplete, type CustomField } from "@/lib/widgetConfig";
import { WIcon } from "../WIcon";

/** Preguntas adicionales configuradas por la clínica (panel → Widget → Campos). */
export function CustomFields({
    fields,
    values,
    onChange,
    showMissing = false,
}: {
    fields: CustomField[];
    values: Record<string, string | boolean>;
    onChange: (id: string, value: string | boolean) => void;
    /** Tras intentar continuar con algo pendiente: señala los obligatorios sin responder. */
    showMissing?: boolean;
}) {
    if (!fields.length) return null;
    return (
        <div className="wf-custom">
            {fields.map((f) => {
                const id = `wf-cf-${f.id}`;
                const value = values[f.id];
                const missing = showMissing && f.required && !customFieldsComplete([f], values);
                const cls = `wf-cf${missing ? " is-missing" : ""}`;
                const label = (
                    <span className="wf-cf-label">
                        {f.label}
                        {f.required ? <span className="wf-cf-req" aria-hidden="true">*</span> : <span className="wf-cf-opt">(opcional)</span>}
                    </span>
                );
                const help = f.help ? <span className="wf-cf-help" id={`${id}-help`}>{f.help}</span> : null;
                const describedBy = f.help ? `${id}-help` : undefined;
                const invalid = missing || undefined;

                if (f.type === "checkbox") {
                    const checked = value === true;
                    return (
                        <div key={f.id} className={cls}>
                            <label className="wf-consent wf-cf-check" role="checkbox" aria-checked={checked} tabIndex={0}
                                aria-describedby={describedBy} aria-required={f.required || undefined}
                                aria-invalid={invalid} data-missing={invalid}
                                onClick={() => onChange(f.id, !checked)}
                                onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onChange(f.id, !checked); } }}>
                                <span className={`wf-check${checked ? " on" : ""}`}>{checked && <WIcon name="check" size={12} />}</span>
                                <span>{f.label}{f.required ? <span className="wf-cf-req" aria-hidden="true">*</span> : null}</span>
                            </label>
                            {help}
                        </div>
                    );
                }

                if (f.type === "radio") {
                    return (
                        <fieldset key={f.id} className={cls} aria-describedby={describedBy} data-missing={invalid}>
                            <legend>{label}</legend>
                            <div className="wf-cf-chips">
                                {f.options?.map((o) => (
                                    <button key={o} type="button" className={`wf-cf-chip${value === o ? " on" : ""}`}
                                        aria-pressed={value === o} onClick={() => onChange(f.id, value === o ? "" : o)}>
                                        {o}
                                    </button>
                                ))}
                            </div>
                            {help}
                        </fieldset>
                    );
                }

                return (
                    <div key={f.id} className={cls}>
                        <label htmlFor={id}>{label}</label>
                        {f.type === "textarea" ? (
                            <textarea id={id} className="field wf-field wf-cf-area" rows={3} maxLength={1000}
                                placeholder={f.placeholder} aria-describedby={describedBy} aria-required={f.required}
                                aria-invalid={invalid} data-missing={invalid}
                                value={typeof value === "string" ? value : ""} onChange={(e) => onChange(f.id, e.target.value)} />
                        ) : f.type === "select" ? (
                            <div className="wf-select wf-cf-select">
                                <select id={id} className="field wf-field" aria-describedby={describedBy} aria-required={f.required}
                                    aria-invalid={invalid} data-missing={invalid}
                                    value={typeof value === "string" ? value : ""} onChange={(e) => onChange(f.id, e.target.value)}>
                                    <option value="">{f.placeholder || "Elige una opción"}</option>
                                    {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                                </select>
                                <span className="wf-select-chev"><WIcon name="chev" size={15} /></span>
                            </div>
                        ) : (
                            <input id={id} className="field wf-field"
                                type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                                inputMode={f.type === "number" ? "decimal" : undefined}
                                enterKeyHint={f.type === "date" ? undefined : "next"}
                                maxLength={200} placeholder={f.placeholder} aria-describedby={describedBy} aria-required={f.required}
                                aria-invalid={invalid} data-missing={invalid}
                                value={typeof value === "string" ? value : ""} onChange={(e) => onChange(f.id, e.target.value)} />
                        )}
                        {help}
                    </div>
                );
            })}
        </div>
    );
}
