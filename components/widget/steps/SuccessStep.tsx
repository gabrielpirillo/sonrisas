"use client";

import { WIcon } from "../WIcon";

type SuccessVariant = "photo" | "clinical" | "email_sent";

interface SuccessStepProps {
    variant: SuccessVariant;
    userEmail: string;
    onReset: () => void;
    /** Enlace de WhatsApp (variante "clinical"), por si el navegador bloqueó la pestaña. */
    whatsappHref?: string;
}

export function SuccessStep({ variant, userEmail, onReset, whatsappHref }: SuccessStepProps) {
    const isVideo = variant === "clinical";

    const title = isVideo ? (
        <>Seguimos por <span className="dim">WhatsApp</span></>
    ) : (
        <>Foto <span className="dim">enviada</span></>
    );

    const sub = isVideo
        ? "Envíanos el mensaje que abrimos en WhatsApp y coordinamos tu vídeo personalizado en consulta."
        : "Revisa tu correo: te enviamos tu simulación. Mira también la carpeta de spam.";

    return (
        <div className="wf-body wf-success">
            <div className="wf-success-mark" aria-hidden="true">
                <svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                    <path d="M5 12.5l4.5 4.5L19 7" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
            <div className="wf-stagger" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <span className="mono mono-pill" style={{ fontSize: 9 }}>
                    <span className="pill-dot" />{isVideo ? "VÍDEO · POR WHATSAPP" : "CORREO · ENVIADO"}
                </span>
                <h2 className="wf-h2" style={{ textAlign: "center" }}>{title}</h2>
                <p className="wf-sub" style={{ textAlign: "center", maxWidth: 340, margin: 0 }}>{sub}</p>
                {isVideo && whatsappHref ? (
                    <a className="btn btn-primary" href={whatsappHref} target="_blank" rel="noopener noreferrer" style={{ marginTop: 6, textDecoration: "none" }}>
                        <WIcon name="wa" size={17} />
                        Abrir WhatsApp
                    </a>
                ) : null}
                {!isVideo && userEmail ? (
                    <span className="wf-success-email">
                        <WIcon name="mail" size={15} />
                        {userEmail}
                    </span>
                ) : null}
                <button type="button" className="btn btn-ghost" style={{ background: "#fff", marginTop: 10 }} onClick={onReset}>
                    <WIcon name="refresh" size={16} />
                    Empezar de nuevo
                </button>
            </div>
        </div>
    );
}
