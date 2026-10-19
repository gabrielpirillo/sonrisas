"use client";

import { PhotoPanel } from "./PhotoPanel";
import { WIcon } from "../WIcon";
import { useWidgetConfig } from "../WidgetConfigContext";
import { AccentTitle } from "../AccentTitle";

interface PhotoStepProps {
    selectedFile: File | null;
    setSelectedFile: (file: File | null) => void;
    /** Confirm "Usar esta foto" → kicks off the generation pipeline. */
    onUse: () => void;
}

export function PhotoStep({ selectedFile, setSelectedFile, onUse }: PhotoStepProps) {
    const { config: { texts, features } } = useWidgetConfig();
    return (
        <div className="wf-body wf-photo">
            <div className="wf-intro wf-stagger">
                <span className="mono wf-eyebrow">PASO 02 <b>· TU FOTO</b></span>
                <h2 className="wf-h2">
                    <AccentTitle text={texts.photoTitle} />
                </h2>
                <p className="wf-sub">{texts.photoSubtitle}</p>
            </div>
            <PhotoPanel
                variant="mobile"
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                onUse={onUse}
            />
            <p className="mono wf-foot"><WIcon name="lock" size={12} /> VALIDACIÓN BIOMÉTRICA · DATOS CIFRADOS</p>
        </div>
    );
}
