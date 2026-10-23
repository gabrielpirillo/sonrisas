"use client";

import { useRef, useState } from "react";
import { LeadFields } from "./LeadFields";
import { PhotoPanel } from "./PhotoPanel";
import { WIcon } from "../WIcon";
import type { FormValues } from "../types";
import { useWidgetConfig } from "../WidgetConfigContext";
import { customFieldsComplete } from "@/lib/widgetConfig";
import { AccentTitle } from "../AccentTitle";

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

/** Campos de texto a los que salta "Siguiente" (los desplegables se omiten: el prefijo casi nunca cambia). */
const FIELD_SELECTOR = "input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio]), textarea";

/** Lleva la vista (y el foco) al primer dato pendiente marcado con data-missing. */
function revealFirstMissing(root: HTMLElement | null) {
    requestAnimationFrame(() => {
        const el = root?.querySelector<HTMLElement>("[data-missing]");
        if (!el) return;
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
        el.focus({ preventScroll: true });
    });
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
    const { config: { texts, features, customFields } } = useWidgetConfig();
    const rootRef = useRef<HTMLFormElement & HTMLDivElement>(null);
    // Se activa al tocar el CTA con algo pendiente: marca lo que falta.
    const [showMissing, setShowMissing] = useState(false);
    const formOk =
        !!formValues.name &&
        !!formValues.email &&
        (!features.askPhone || !!formValues.phoneNumber) &&
        formValues.ageAccepted &&
        formValues.termsAccepted &&
        formValues.photoAccepted &&
        customFieldsComplete(customFields, formValues.custom);

    const fields = (
        <LeadFields
            formValues={formValues}
            setFormValues={setFormValues}
            selectedCountry={selectedCountry}
            setSelectedCountry={setSelectedCountry}
            showMissing={showMissing}
        />
    );

    // ── Desktop: Datos (izq) + Foto (der) en un solo paso ──
    if (isDesktop) {
        const ready = formOk && photoReady;
        const tryStart = () => {
            if (ready) return onSubmit();
            setShowMissing(true);
            revealFirstMissing(rootRef.current);
        };
        return (
            <div className="dk-intake" ref={rootRef}>
                <div className="dk-grid">
                    <div className="dk-col">
                        <div className="wf-intro wf-stagger">
                            <span className="mono wf-eyebrow">PASO 01 <b>· TUS DATOS</b></span>
                            <h2 className="wf-h2">
                                <AccentTitle text={texts.headline} accent={texts.headlineAccent} />
                            </h2>
                            <p className="wf-sub">{texts.subtitle}</p>
                        </div>
                        {fields}
                    </div>
                    <div className="dk-col">
                        <div className="wf-intro wf-stagger">
                            <span className="mono wf-eyebrow">PASO 02 <b>· TU FOTO</b></span>
                            <h2 className="wf-h2">
                                <AccentTitle text={texts.photoTitle} />
                            </h2>
                            <p className="wf-sub">{texts.photoSubtitle}</p>
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
                    {showMissing && !ready ? (
                        <p className="wf-missing" role="alert" style={{ margin: 0 }}>
                            <WIcon name="alert" size={16} />
                            {formOk ? "Añade tu foto para ver tu simulación." : "Completa los datos marcados para continuar."}
                        </p>
                    ) : (
                        <p className="mono" style={{ fontSize: 9.5, margin: 0 }}>
                            <WIcon name="lock" size={13} /> VALIDACIÓN BIOMÉTRICA · DATOS CIFRADOS
                        </p>
                    )}
                    <button
                        type="button"
                        className="btn btn-primary"
                        aria-disabled={!ready}
                        style={{ padding: "16px 30px" }}
                        onClick={tryStart}
                    >
                        {texts.submitButton}
                        <WIcon name="arrow" size={17} className="btn-arrow" />
                    </button>
                </div>
            </div>
        );
    }

    // ── Mobile: solo datos (la foto es el siguiente paso) ──
    const tryContinue = () => {
        if (formOk) return onContinue();
        setShowMissing(true);
        revealFirstMissing(rootRef.current);
    };

    // "Siguiente" del teclado: pasa al próximo campo; en el último, intenta continuar.
    const onKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        const t = e.target as HTMLElement;
        if (e.key !== "Enter" || !(t instanceof HTMLInputElement)) return;
        e.preventDefault();
        if (formOk) return onContinue();
        const list = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(FIELD_SELECTOR));
        const next = list[list.indexOf(t) + 1];
        if (next) next.focus();
        else {
            t.blur();
            tryContinue();
        }
    };

    return (
        <form
            ref={rootRef}
            className="wf-body"
            noValidate
            onKeyDown={onKeyDown}
            onSubmit={(e) => {
                e.preventDefault();
                tryContinue();
            }}
        >
            <div className="wf-intro wf-stagger">
                <span className="mono wf-eyebrow">PASO 01 <b>· TUS DATOS</b></span>
                <h2 className="wf-h2">
                    <AccentTitle text={texts.headline} accent={texts.headlineAccent} />
                </h2>
                <p className="wf-sub">{texts.subtitle}</p>
            </div>
            {fields}
            <div className="wf-cta-bar sf-rise" style={{ animationDelay: "0.36s" }}>
                <button
                    type="submit"
                    className="btn btn-primary wf-cta"
                    aria-disabled={!formOk}
                >
                    Continuar
                    <WIcon name="arrow" size={17} className="btn-arrow" />
                </button>
                {showMissing && !formOk && (
                    <p className="wf-missing" role="alert">
                        <WIcon name="alert" size={16} />
                        Completa los datos marcados para continuar.
                    </p>
                )}
            </div>
        </form>
    );
}
