"use client";

import { Check } from "../WIcon";
import { countries } from "../countries";
import type { FormValues } from "../types";

interface LeadFieldsProps {
    formValues: FormValues;
    setFormValues: React.Dispatch<React.SetStateAction<FormValues>>;
    selectedCountry: string;
    setSelectedCountry: (value: string) => void;
}

export function LeadFields({ formValues, setFormValues, selectedCountry, setSelectedCountry }: LeadFieldsProps) {
    const set = <K extends keyof FormValues>(k: K, v: FormValues[K]) =>
        setFormValues((prev) => ({ ...prev, [k]: v }));

    return (
        <div className="wf-fields">
            <input
                className="field wf-field"
                placeholder="Nombre completo"
                value={formValues.name}
                onChange={(e) => set("name", e.target.value)}
            />
            <input
                className="field wf-field"
                type="email"
                placeholder="Correo electrónico"
                value={formValues.email}
                onChange={(e) => set("email", e.target.value)}
            />
            <div style={{ display: "flex", gap: 8 }}>
                <select
                    className="field wf-field"
                    style={{ width: 104, padding: "0 12px", appearance: "none" }}
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                >
                    {countries.map((c) => (
                        <option key={c.code} value={c.code}>
                            {c.dial_code}
                        </option>
                    ))}
                </select>
                <input
                    className="field wf-field"
                    type="tel"
                    placeholder="Teléfono / WhatsApp"
                    value={formValues.phoneNumber}
                    onChange={(e) => set("phoneNumber", e.target.value)}
                    style={{ flex: 1 }}
                />
            </div>
            <label className="wf-consent" onClick={() => set("ageAccepted", !formValues.ageAccepted)}>
                <Check on={formValues.ageAccepted} />
                <span>Soy mayor de edad.</span>
            </label>
            <label className="wf-consent" onClick={() => set("termsAccepted", !formValues.termsAccepted)}>
                <Check on={formValues.termsAccepted} />
                <span>
                    Acepto los{" "}
                    <a href="https://dentalcorbella.com/terminos-y-condiciones-smile-forward/" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}><u>términos</u></a>{" "}
                    y la{" "}
                    <a href="https://dentalcorbella.com/terminos-y-condiciones-smile-forward/" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}><u>privacidad</u></a>.
                </span>
            </label>
        </div>
    );
}
