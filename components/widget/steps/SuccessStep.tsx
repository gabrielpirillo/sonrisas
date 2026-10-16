"use client";

import { WIcon } from "../WIcon";

type SuccessVariant = "photo" | "clinical" | "email_sent";

interface SuccessStepProps {
    variant: SuccessVariant;
    userEmail: string;
    onReset: () => void;
}

export function SuccessStep({ variant, userEmail, onReset }: SuccessStepProps) {
    const isVideo = variant === "clinical";

    const title = isVideo ? (
        <>Solicitud <span className="dim">recibida</span></>
    ) : (
        <>Foto <span className="dim">enviada</span></>
    );

    const sub = isVideo
        ? "Te contactaremos por WhatsApp para agendar tu vídeo personalizado en consulta."
        : "Revisa tu correo: te enviamos tu simulación. Mira también la carpeta de spam.";

    return (
        <div className="wf-body wf-success">
            <div className="wf-success-mark"><WIcon name="check" size={30} /></div>
            <h2 className="wf-h2" style={{ textAlign: "center" }}>{title}</h2>
            <p className="wf-sub" style={{ textAlign: "center", maxWidth: 320 }}>
                {sub}
                {userEmail ? (
                    <>
                        <br />
                        <strong style={{ color: "var(--ink)" }}>{userEmail}</strong>
                    </>
                ) : null}
            </p>
            <button type="button" className="btn btn-ghost" style={{ background: "#fff", marginTop: 8 }} onClick={onReset}>
                Empezar de nuevo
            </button>
        </div>
    );
}
