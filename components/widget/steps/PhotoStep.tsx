"use client";

import { PhotoPanel } from "./PhotoPanel";

interface PhotoStepProps {
    selectedFile: File | null;
    setSelectedFile: (file: File | null) => void;
    /** Confirm "Usar esta foto" → kicks off the generation pipeline. */
    onUse: () => void;
}

export function PhotoStep({ selectedFile, setSelectedFile, onUse }: PhotoStepProps) {
    return (
        <div className="wf-body wf-photo">
            <div className="wf-intro">
                <h2 className="wf-h2">
                    Tu <span className="dim">sonrisa</span>
                </h2>
                <p className="wf-sub">Foto frontal, buena luz, sonriendo de frente.</p>
            </div>
            <PhotoPanel
                variant="mobile"
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                onUse={onUse}
            />
            <p className="mono wf-foot">VALIDACIÓN BIOMÉTRICA · DATOS CIFRADOS</p>
        </div>
    );
}
