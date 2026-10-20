"use client";

import { useSyncExternalStore } from "react";
import { Check, WIcon } from "../WIcon";
import { countries } from "../countries";
import type { FormValues } from "../types";
import { useWidgetConfig } from "../WidgetConfigContext";
import { CustomFields } from "./CustomFields";

interface LeadFieldsProps {
    formValues: FormValues;
    setFormValues: React.Dispatch<React.SetStateAction<FormValues>>;
    selectedCountry: string;
    setSelectedCountry: (value: string) => void;
    /** Tras intentar continuar con algo pendiente: señala qué falta. */
    showMissing?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Nombres de país en español (Intl) para el desplegable de prefijos. Solo en
 * el cliente (en SSR → null): el ICU del servidor y el del navegador pueden
 * diferir y provocar avisos de hidratación.
 */
let countryNamesCache: Map<string, string> | null = null;
function clientCountryNames(): Map<string, string> {
    if (countryNamesCache) return countryNamesCache;
    let dn: Intl.DisplayNames | null = null;
    try {
        dn = new Intl.DisplayNames(["es"], { type: "region" });
    } catch {
        dn = null;
    }
    const map = new Map<string, string>();
    for (const c of countries) map.set(c.code, dn?.of(c.code) || c.name);
    countryNamesCache = map;
    return map;
}
const noopSubscribe = () => () => {};
const useCountryNames = () => useSyncExternalStore(noopSubscribe, clientCountryNames, () => null);

export function LeadFields({ formValues, setFormValues, selectedCountry, setSelectedCountry, showMissing = false }: LeadFieldsProps) {
    const { config: { contact, features, customFields } } = useWidgetConfig();
    const countryNames = useCountryNames();
    const set = <K extends keyof FormValues>(k: K, v: FormValues[K]) =>
        setFormValues((prev) => ({ ...prev, [k]: v }));

    // Solo feedback visual (no bloquea nada que antes no bloqueara).
    const nameOk = formValues.name.trim().length >= 2;
    const emailOk = EMAIL_RE.test(formValues.email.trim());
    const phoneOk = formValues.phoneNumber.replace(/\D/g, "").length >= 6;
    const country = countries.find((c) => c.code === selectedCountry) ?? countries[0];

    // Mismos criterios que habilitan "Continuar".
    const miss = {
        name: showMissing && !formValues.name,
        email: showMissing && !formValues.email,
        phone: showMissing && features.askPhone && !formValues.phoneNumber,
        age: showMissing && !formValues.ageAccepted,
        terms: showMissing && !formValues.termsAccepted,
    };

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
                    name="name"
                    placeholder="Nombre completo"
                    autoComplete="name"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    aria-label="Nombre completo"
                    aria-invalid={miss.name || undefined}
                    data-missing={miss.name || undefined}
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
                    name="email"
                    placeholder="Correo electrónico"
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="next"
                    aria-label="Correo electrónico"
                    aria-invalid={miss.email || undefined}
                    data-missing={miss.email || undefined}
                    value={formValues.email}
                    onChange={(e) => set("email", e.target.value)}
                />
                {emailOk && <span className="wf-input-ok"><WIcon name="check" size={12} /></span>}
            </label>
            {features.askPhone && (
            <div className="wf-phone">
                <div className="wf-select wf-dial">
                    <select
                        className="field wf-field"
                        name="country"
                        aria-label="Prefijo de país"
                        autoComplete="tel-country-code"
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                    >
                        {countries.map((c) => (
                            <option key={c.code} value={c.code}>
                                {countryNames ? `${c.flag} ${countryNames.get(c.code)} (${c.dial_code})` : `${c.flag} ${c.dial_code}`}
                            </option>
                        ))}
                    </select>
                    <span className="wf-dial-value" aria-hidden="true">{country.flag} {country.dial_code}</span>
                    <span className="wf-select-chev"><WIcon name="chev" size={15} /></span>
                </div>
                <label className="wf-input">
                    <span className="wf-input-ic"><WIcon name="phone" size={16} /></span>
                    <input
                        className="field wf-field"
                        type="tel"
                        name="phone"
                        placeholder="Tu WhatsApp"
                        autoComplete="tel-national"
                        inputMode="tel"
                        enterKeyHint="next"
                        aria-label="Teléfono móvil o WhatsApp"
                        aria-invalid={miss.phone || undefined}
                        data-missing={miss.phone || undefined}
                        value={formValues.phoneNumber}
                        onChange={(e) => set("phoneNumber", e.target.value)}
                    />
                    {phoneOk && <span className="wf-input-ok"><WIcon name="check" size={12} /></span>}
                </label>
            </div>
            )}
            <CustomFields
                fields={customFields}
                values={formValues.custom}
                showMissing={showMissing}
                onChange={(id, v) => setFormValues((prev) => ({ ...prev, custom: { ...prev.custom, [id]: v } }))}
            />
            <div className="wf-consents">
                <label
                    className="wf-consent"
                    role="checkbox"
                    aria-checked={formValues.ageAccepted}
                    aria-label="Soy mayor de edad"
                    aria-invalid={miss.age || undefined}
                    data-missing={miss.age || undefined}
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
                    aria-invalid={miss.terms || undefined}
                    data-missing={miss.terms || undefined}
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
