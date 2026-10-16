"use client";

import { LeadFields } from "./LeadFields";
import { PhotoPanel } from "./PhotoPanel";
import type { FormValues } from "../types";

interface LeadFormStepProps {
    isDesktop: boolean;
    formValues: FormValues;
    setFormValues: React.Dispatch<React.SetStateAction<FormValues>>;
    selectedCountry: string;
    setSelectedCountry: (value: string) => void;
    selectedFile: File | null;
    setSelectedFile: (file: File | null) => void;
    photoReady: boolean;
    setPhotoReady: (ready: boolean) => void;
    /** Mobile: advance to the photo step. */
    onContinue: () => void;
    /** Desktop: form + photo ready → kick off the generation. */
    onSubmit: () => void;
}

export function LeadFormStep({
    isDesktop,
    formValues,
    setFormValues,
    selectedCountry,
    setSelectedCountry,
    selectedFile,
    setSelectedFile,
    photoReady,
    setPhotoReady,
    onContinue,
    onSubmit,
}: LeadFormStepProps) {
    const formOk =
        !!formValues.name &&
        !!formValues.email &&
        !!formValues.phoneNumber &&
        formValues.ageAccepted &&
        formValues.termsAccepted;

    const fields = (
        <LeadFields
            formValues={formValues}
            setFormValues={setFormValues}
            selectedCountry={selectedCountry}
            setSelectedCountry={setSelectedCountry}
        />
    );

    // ── Desktop: Datos (izq) + Foto (der) en un solo paso ──
    if (isDesktop) {
        const ready = formOk && photoReady;
        return (
            <div className="dk-intake">
                <div className="dk-grid">
                    <div className="dk-col">
                        <span className="mono" style={{ fontSize: 9 }}>PASO 01 · TUS DATOS</span>
                        <h2 className="wf-h2" style={{ marginTop: 10 }}>
                            Comienza tu <span className="dim">transformación</span>
                        </h2>
                        <p className="wf-sub" style={{ marginBottom: 18 }}>Te enviaremos tu simulación a estos datos.</p>
                        {fields}
                    </div>
                    <div className="dk-col">
                        <span className="mono" style={{ fontSize: 9 }}>PASO 02 · TU FOTO</span>
                        <h2 className="wf-h2" style={{ marginTop: 10 }}>
                            Tu <span className="dim">sonrisa</span>
                        </h2>
                        <p className="wf-sub" style={{ marginBottom: 18 }}>Foto frontal, buena luz, sonriendo de frente.</p>
                        <PhotoPanel
                            variant="desktop"
                            selectedFile={selectedFile}
                            setSelectedFile={setSelectedFile}
                            onReady={setPhotoReady}
                        />
                    </div>
                </div>
                <div className="dk-foot">
                    <p className="mono" style={{ fontSize: 9 }}>VALIDACIÓN BIOMÉTRICA · DATOS CIFRADOS</p>
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={!ready}
                        style={{ opacity: ready ? 1 : 0.4, cursor: ready ? "pointer" : "not-allowed", padding: "16px 32px" }}
                        onClick={onSubmit}
                    >
                        Ver mi simulación
                    </button>
                </div>
            </div>
        );
    }

    // ── Mobile: solo datos (la foto es el siguiente paso) ──
    return (
        <div className="wf-body">
            <div className="wf-intro">
                <h2 className="wf-h2">
                    Comienza tu <span className="dim">transformación</span>
                </h2>
                <p className="wf-sub">Te enviaremos tu simulación a estos datos.</p>
            </div>
            {fields}
            <button
                type="button"
                className="btn btn-primary wf-cta"
                disabled={!formOk}
                style={{ opacity: formOk ? 1 : 0.4, cursor: formOk ? "pointer" : "not-allowed" }}
                onClick={onContinue}
            >
                Continuar
            </button>
        </div>
    );
}
