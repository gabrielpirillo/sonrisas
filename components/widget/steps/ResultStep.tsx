"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { WIcon } from "../WIcon";
import { BeforeAfterSlider } from "../BeforeAfterSlider";
import { fileObjectUrl } from "../objectUrl";
import { useWidgetConfig } from "../WidgetConfigContext";
import { AccentTitle } from "../AccentTitle";
import { whatsappLink } from "@/lib/brand";
import "./owner-result.css";

interface ResultStepProps {
    image: File | null;
    demoBeforeImage: string | null;
    generatedImage: string | null;
    alignedImage: string | null;
    isSubmittingVideo: boolean;
    isSubmittingPhoto: boolean;
    isDesktop: boolean;
    onClinicalVideoRequest: () => void;
    onSendPhotoEmail: () => void;
    /** Demo (dueño): vuelve a la foto para generar otra simulación. */
    onTryAnother?: () => void;
    /** Nombre escrito en el formulario (demo: ilustra el lead que llega al panel). */
    leadName?: string;
}

/* ── Demo para clínicas (audience="owner") ── */
const OWNER_SIGNUP_HREF = "/acceso?modo=registro";
const OWNER_WHATSAPP_HREF = whatsappLink("Hola, probé la demo de Smile Fast y quiero implementarlo en mi clínica");
const OWNER_CHIPS = ["5 créditos de regalo", "Sin permanencia", "Listo en 1 día"];

const EASE = [0.22, 1, 0.36, 1] as const;

export function ResultStep({
    image,
    demoBeforeImage,
    generatedImage,
    alignedImage,
    isSubmittingVideo,
    isSubmittingPhoto,
    isDesktop,
    onClinicalVideoRequest,
    onSendPhotoEmail,
    onTryAnother,
    leadName,
}: ResultStepProps) {
    const { config: { texts, features }, audience } = useWidgetConfig();
    const fileUrl = fileObjectUrl(image);

    const beforeSrc = fileUrl || demoBeforeImage || "";
    const afterSrc = alignedImage || generatedImage || "";
    const ready = (image || demoBeforeImage) && generatedImage;
    const busy = isSubmittingVideo || isSubmittingPhoto;

    const slider = (
        <motion.div
            className="wf-result-frame"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
        >
            {ready ? (
                <BeforeAfterSlider beforeImage={beforeSrc} afterImage={afterSrc} fill variant="qoves" className="w-full h-full" />
            ) : (
                <div className="wf-skel">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--blue-light)" }} />
                </div>
            )}
        </motion.div>
    );

    if (audience === "owner") {
        return <OwnerResult slider={slider} isDesktop={isDesktop} onTryAnother={onTryAnother} leadName={leadName} />;
    }

    const actions = (
        <>
            {features.videoCta && (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={onClinicalVideoRequest}>
                {isSubmittingVideo ? <Loader2 className="w-5 h-5 animate-spin" /> : <WIcon name="wa" size={17} />}
                {isSubmittingVideo ? "Abriendo WhatsApp…" : "Pedir mi vídeo por WhatsApp"}
            </button>
            )}
            {features.photoEmail && (
            <button type="button" className={`btn ${features.videoCta ? "btn-ghost" : "btn-primary"}`} disabled={busy} onClick={onSendPhotoEmail}>
                {isSubmittingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <WIcon name="mail" size={16} />}
                {isSubmittingPhoto ? "Enviando…" : "Recibir mi foto por correo"}
            </button>
            )}
        </>
    );

    // ── Desktop: before/after (izq) + texto/CTAs (der) ──
    if (isDesktop) {
        return (
            <div className="dk-result">
                <div className="dk-result-media">{slider}</div>
                <div className="dk-result-info wf-stagger">
                    <span className="mono mono-pill" style={{ fontSize: 9, alignSelf: "flex-start" }}>
                        <span className="pill-dot" />RESULTADO · SIMULACIÓN
                    </span>
                    <h2 className="wf-h2" style={{ marginTop: 18 }}>
                        <AccentTitle text={texts.resultTitle} />
                    </h2>
                    <p className="wf-sub" style={{ fontSize: 16, margin: "12px 0 6px" }}>{texts.resultSubtitle}</p>
                    {features.videoCta && (
                    <p className="wf-note">
                        ¿Quieres verte en movimiento? Escríbenos por WhatsApp: preparamos tu vídeo en consulta y confirmamos la viabilidad de tu caso con el equipo clínico.
                    </p>
                    )}
                    <div className="dk-result-actions">{actions}</div>
                    <p className="mono" style={{ fontSize: 9, marginTop: 22 }}>SIMULACIÓN ORIENTATIVA · SEGÚN TU CASO CLÍNICO</p>
                </div>
            </div>
        );
    }

    // ── Mobile ──
    return (
        <div className="wf-body">
            <div className="wf-intro wf-stagger">
                <div style={{ marginBottom: 12 }}>
                    <span className="mono mono-pill" style={{ fontSize: 9 }}>
                        <span className="pill-dot" />RESULTADO · SIMULACIÓN
                    </span>
                </div>
                <h2 className="wf-h2">
                    <AccentTitle text={texts.resultTitle} />
                </h2>
                <p className="wf-sub">Desliza para comparar el antes y el después.</p>
            </div>
            <div className="wf-result">{slider}</div>
            <div className="wf-result-actions wf-stagger">{actions}</div>
            <p className="mono wf-foot">SIMULACIÓN ORIENTATIVA · SEGÚN TU CASO CLÍNICO</p>
        </div>
    );
}

/** Resultado de la demo: el antes/después + por qué le conviene a la clínica. */
function OwnerResult({
    slider,
    isDesktop,
    onTryAnother,
    leadName,
}: {
    slider: React.ReactNode;
    isDesktop: boolean;
    onTryAnother?: () => void;
    leadName?: string;
}) {
    const name = leadName?.trim().split(/\s+/)[0] || "Paciente";

    const pill = (
        <span className="mono mono-pill ow-pill">
            <span className="pill-dot" />ASÍ LO VERÁN TUS PACIENTES
        </span>
    );
    const title = (
        <h2 className="wf-h2 ow-title">
            <AccentTitle text="Esto es lo que verá cada paciente" accent="en tu web" />
        </h2>
    );
    const value = (
        <p className="ow-value">
            Cada simulación llega a tu panel como un <strong>lead con su foto y su WhatsApp</strong>, listo para agendar.
            Implementación gratuita y sin costos extra.
        </p>
    );
    const lead = (
        <div className="ow-lead" aria-label="Ejemplo de lead en tu panel">
            <span className="ow-lead-av" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
            <span className="ow-lead-txt">
                <span className="ow-lead-top">
                    <b>Nuevo lead · {name}</b>
                </span>
                <span className="ow-lead-sub">Foto, contacto y simulación en tu panel</span>
            </span>
            <span className="ow-lead-wa" aria-hidden="true"><WIcon name="wa" size={16} /></span>
        </div>
    );
    const chips = (
        <ul className="ow-chips" aria-label="Condiciones">
            {OWNER_CHIPS.map((c) => (
                <li key={c}><WIcon name="check" size={13} />{c}</li>
            ))}
        </ul>
    );
    const actions = (
        <div className="ow-actions">
            <Link href={OWNER_SIGNUP_HREF} className="btn btn-primary">
                Crear mi cuenta gratis
                <WIcon name="arrow" size={17} className="btn-arrow" />
            </Link>
            <a href={OWNER_WHATSAPP_HREF} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                <WIcon name="wa" size={17} />
                Hablar por WhatsApp
            </a>
            {onTryAnother && (
                <button type="button" className="ow-retry" onClick={onTryAnother}>
                    <WIcon name="refresh" size={15} />
                    Probar con otra foto
                </button>
            )}
        </div>
    );

    if (isDesktop) {
        return (
            <div className="dk-result ow-result">
                <div className="dk-result-media">{slider}</div>
                <div className="dk-result-info ow-info wf-stagger">
                    {pill}
                    {title}
                    {value}
                    {lead}
                    {chips}
                    {actions}
                </div>
            </div>
        );
    }

    return (
        <div className="wf-body ow-result">
            <div className="wf-intro wf-stagger">
                <div style={{ marginBottom: 12 }}>{pill}</div>
                {title}
                <p className="wf-sub">Desliza para comparar el antes y el después.</p>
            </div>
            <div className="wf-result">{slider}</div>
            <div className="ow-info wf-stagger">
                {value}
                {lead}
                {chips}
                {actions}
            </div>
            <p className="mono wf-foot">DEMO · SIMULACIÓN ORIENTATIVA</p>
        </div>
    );
}
