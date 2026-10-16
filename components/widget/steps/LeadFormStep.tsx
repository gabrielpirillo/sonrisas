"use client";

import { LeadFields } from "./LeadFields";
import { PhotoPanel } from "./PhotoPanel";
import { WIcon } from "../WIcon";
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
                        <div className="wf-intro wf-stagger">
                            <span className="mono wf-eyebrow">PASO 01 <b>· TUS DATOS</b></span>
                            <h2 className="wf-h2">
                                Comienza tu <span className="dim">transformación</span>
                            </h2>
                            <p className="wf-sub">Te enviaremos tu simulación a estos datos.</p>
                        </div>
                        {fields}
                    </div>
                    <div className="dk-col">
                        <div className="wf-intro wf-stagger">
                            <span className="mono wf-eyebrow">PASO 02 <b>· TU FOTO</b></span>
                            <h2 className="wf-h2">
                                Tu <span className="dim">sonrisa</span>
                            </h2>
                            <p className="wf-sub">Foto frontal, buena luz, sonriendo de frente.</p>
                        </div>
                        <PhotoPanel
                            variant="desktop"
                            selectedFile={selectedFile}
                            setSelectedFile={setSelectedFile}
                            onReady={setPhotoReady}
                        />
                    </div>
                </div>
                <div className="dk-foot">
                    <p className="mono" style={{ fontSize: 9, margin: 0 }}>
                        <WIcon name="lock" size={13} /> VALIDACIÓN BIOMÉTRICA · DATOS CIFRADOS
                    </p>
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={!ready}
                        style={{ padding: "16px 30px" }}
                        onClick={onSubmit}
                    >
                        Ver mi simulación
                        <WIcon name="arrow" size={17} className="btn-arrow" />
                    </button>
                </div>
            </div>
        );
    }

    // ── Mobile: solo datos (la foto es el siguiente paso) ──
    return (
        <div className="wf-body">
            <div className="wf-intro wf-stagger">
                <span className="mono wf-eyebrow">PASO 01 <b>· TUS DATOS</b></span>
                <h2 className="wf-h2">
                    Comienza tu <span className="dim">transformación</span>
                </h2>
                <p className="wf-sub">Te enviaremos tu simulación a estos datos.</p>
            </div>
            {fields}
            <div className="sf-rise" style={{ animationDelay: "0.36s" }}>
                <button
                    type="button"
                    className="btn btn-primary wf-cta"
                    disabled={!formOk}
                    onClick={onContinue}
                >
                    Continuar
                    <WIcon name="arrow" size={17} className="btn-arrow" />
                </button>
            </div>
        </div>
    );
}
