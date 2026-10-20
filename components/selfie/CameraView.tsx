"use client";

import React, { forwardRef } from "react";
import Webcam from "react-webcam";

interface CameraViewProps {
    onUserMedia?: () => void;
    /** Permiso denegado, sin cámara o cámara ocupada por otra app. */
    onUserMediaError?: (error: string | DOMException) => void;
}

const videoConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: "user",
};

export const CameraView = forwardRef<Webcam, CameraViewProps>(
    ({ onUserMedia, onUserMediaError }, ref) => {
        return (
            <div className="relative w-full h-full overflow-hidden bg-black">
                <Webcam
                    ref={ref}
                    audio={false}
                    className="absolute inset-0 w-full h-full object-cover"
                    screenshotFormat="image/jpeg"
                    videoConstraints={videoConstraints}
                    onUserMedia={onUserMedia}
                    onUserMediaError={onUserMediaError}
                    mirrored={true}
                    playsInline={true}
                    muted={true}
                />
            </div>
        );
    }
);

CameraView.displayName = "CameraView";

/** Mensaje en español para los fallos de getUserMedia. */
export function cameraErrorMessage(err: string | DOMException | null | undefined): string {
    const name = typeof err === "string" ? err : err?.name;
    if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") {
        return "No tenemos permiso para usar la cámara. Actívalo en los ajustes del navegador o sube una foto.";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") {
        return "No encontramos una cámara en este dispositivo. Puedes subir una foto.";
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
        return "La cámara está siendo usada por otra aplicación. Ciérrala e inténtalo de nuevo.";
    }
    return "No pudimos iniciar la cámara. Inténtalo de nuevo o sube una foto.";
}
