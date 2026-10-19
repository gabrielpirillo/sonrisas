"use client";

import { Check, WIcon } from "../WIcon";
import { countries } from "../countries";
import type { FormValues } from "../types";
import { useWidgetConfig } from "../WidgetConfigContext";

interface LeadFieldsProps {
    formValues: FormValues;
    setFormValues: React.Dispatch<React.SetStateAction<FormValues>>;
    selectedCountry: string;
    setSelectedCountry: (value: string) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function LeadFields({ formValues, setFormValues, selectedCountry, setSelectedCountry }: LeadFieldsProps) {
    const { config: { contact, features } } = useWidgetConfig();
    const set = <K extends keyof FormValues>(k: K, v: FormValues[K]) =>
        setFormValues((prev) => ({ ...prev, [k]: v }));

    // Solo feedback visual (no bloquea nada que antes no bloqueara).
    const nameOk = formValues.name.trim().length >= 2;
    const emailOk = EMAIL_RE.test(formValues.email.trim());
    const phoneOk = formValues.phoneNumber.replace(/\D/g, "").length >= 6;

    const toggleKey = (k: "ageAccepted" | "termsAccepted") => (e: React.KeyboardEvent) => {
        if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            set(k, !formValues[k]);
        }
    };

    return (
        <div className="wf-fields wf-stagger">
            <label className="wf-input">
                <span className="wf-input-ic"><WIcon name="user" size={17} /></span>
                <input
                    className="field wf-field"
                    placeholder="Nombre completo"
                    autoComplete="name"
                    aria-label="Nombre completo"
                    value={formValues.name}
                    onChange={(e) => set("name", e.target.value)}
                />
                {nameOk && <span className="wf-input-ok"><WIcon name="check" size={12} /></span>}
            </label>
            <label className="wf-input">
                <span className="wf-input-ic"><WIcon name="mail" size={17} /></span>
                <input
                    className="field wf-field"
                    type="email"
                    placeholder="Correo electrónico"
                    autoComplete="email"
                    inputMode="email"
                    aria-label="Correo electrónico"
                    value={formValues.email}
                    onChange={(e) => set("email", e.target.value)}
                />
                {emailOk && <span className="wf-input-ok"><WIcon name="check" size={12} /></span>}
            </label>
            {features.askPhone && (
            <div className="wf-phone">
                <div className="wf-select">
                    <select
                        className="field wf-field"
                        aria-label="Prefijo de país"
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                    >
                        {countries.map((c) => (
                            <option key={c.code} value={c.code}>
                                {c.dial_code}
                            </option>
                        ))}
                    </select>
                    <span className="wf-select-chev"><WIcon name="chev" size={15} /></span>
                </div>
                <label className="wf-input">
                    <span className="wf-input-ic"><WIcon name="phone" size={16} /></span>
                    <input
                        className="field wf-field"
                        type="tel"
                        placeholder="Teléfono / WhatsApp"
                        autoComplete="tel-national"
                        inputMode="tel"
                        aria-label="Teléfono / WhatsApp"
                        value={formValues.phoneNumber}
                        onChange={(e) => set("phoneNumber", e.target.value)}
                    />
                    {phoneOk && <span className="wf-input-ok"><WIcon name="check" size={12} /></span>}
                </label>
            </div>
            )}
            <div className="wf-consents">
                <label
                    className="wf-consent"
                    role="checkbox"
                    aria-checked={formValues.ageAccepted}
                    aria-label="Soy mayor de edad"
                    tabIndex={0}
                    onKeyDown={toggleKey("ageAccepted")}
                    onClick={() => set("ageAccepted", !formValues.ageAccepted)}
                >
                    <Check on={formValues.ageAccepted} />
                    <span>Soy mayor de edad.</span>
                </label>
                <label
                    className="wf-consent"
                    role="checkbox"
                    aria-checked={formValues.termsAccepted}
                    aria-label="Acepto los términos y la privacidad"
                    tabIndex={0}
                    onKeyDown={toggleKey("termsAccepted")}
                    onClick={() => set("termsAccepted", !formValues.termsAccepted)}
                >
                    <Check on={formValues.termsAccepted} />
                    <span>
                        Acepto los{" "}
                        <a href={contact.termsUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}><u>términos</u></a>{" "}
                        y la{" "}
                        <a href={contact.privacyUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}><u>privacidad</u></a>.
                    </span>
                </label>
            </div>
        </div>
    );
}
