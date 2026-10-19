"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
    Check, ImageUp, Loader2, Trash2, Pipette, Phone, Video, Mail, Camera,
    ExternalLink, Braces, MessageCircle, Lightbulb, Copy, MousePointerClick, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
    ACCENT_PRESETS, DEFAULT_WIDGET_CONFIG, normalizeWidgetConfig, widgetWhatsappHref,
    type WidgetConfig, type WidgetRadius,
} from "@/lib/widgetConfig";
import { uploadWidgetLogoAction } from "@/app/(admin)/administracion/widget/actions";
import { EmbedCard } from "@/components/admin/qoves/EmbedCard";
import { Block, TextField, ToggleRow, Toggle } from "./fields";
import {
    DISPLAY_NAME_MAX, TEXT_MAX, URL_MAX, WHATSAPP_MESSAGE_MAX,
    detectCountry, urlError, whatsappError,
} from "./validation";

const D = DEFAULT_WIDGET_CONFIG;
const HEX_RE = /^#[0-9a-f]{6}$/i;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export type Patch = <K extends keyof WidgetConfig>(group: K, patch: Partial<WidgetConfig[K]>) => void;

/* ════════════════════════════════════════════════════════════════════════
   MARCA
   ════════════════════════════════════════════════════════════════════════ */
const RADIUS_OPTIONS: { id: WidgetRadius; label: string; desc: string; btn: number; card: number }[] = [
    { id: "rounded", label: "Redondeado", desc: "Botones tipo píldora", btn: 999, card: 14 },
    { id: "soft", label: "Suave", desc: "Esquinas amables", btn: 9, card: 11 },
    { id: "square", label: "Recto", desc: "Aspecto sobrio", btn: 5, card: 7 },
];

export function BrandSection({ draft, patch, clinicName, readOnly }: { draft: WidgetConfig; patch: Patch; clinicName: string; readOnly?: boolean }) {
    const b = draft.brand;
    const reduceMotion = useReducedMotion();
    // Texto del campo hex mientras se escribe (null = refleja el color actual).
    const [hexText, setHexText] = useState<string | null>(null);
    const hexValue = hexText ?? b.accent.toUpperCase();
    const hexInvalid = hexText !== null && !HEX_RE.test(hexText.startsWith("#") ? hexText : "#" + hexText);
    const isPreset = ACCENT_PRESETS.some((p) => p.hex.toLowerCase() === b.accent.toLowerCase());

    const onHex = (raw: string) => {
        const v = raw.trim();
        setHexText(v);
        const withHash = v.startsWith("#") ? v : "#" + v;
        if (HEX_RE.test(withHash)) patch("brand", { accent: withHash.toLowerCase() });
    };

    return (
        <>
            <Block title="Logo" description="Aparece en la cabecera del widget. PNG, JPG, WEBP o SVG de hasta 2 MB; mejor con fondo transparente.">
                <LogoDrop logoUrl={b.logoUrl} onChange={(url) => patch("brand", { logoUrl: url })} readOnly={readOnly} />
            </Block>

            <Block title="Nombre de la clínica" description="Se muestra en la cabecera cuando no hay logo.">
                <TextField
                    label="Nombre visible"
                    value={b.displayName}
                    onChange={(v) => patch("brand", { displayName: v })}
                    max={DISPLAY_NAME_MAX}
                    placeholder={clinicName || "Nombre de tu clínica"}
                    hint={b.logoUrl ? "Ahora mismo se ve tu logo; este nombre se usa como texto alternativo." : "Si lo dejas vacío, se muestra el logo de Smile Fast."}
                />
            </Block>

            <Block title="Color principal" description="Botones, acentos y fondos se calculan a partir de este color.">
                <div className="ws-swatches" role="radiogroup" aria-label="Colores sugeridos">
                    {ACCENT_PRESETS.map((p) => {
                        const on = p.hex.toLowerCase() === b.accent.toLowerCase();
                        return (
                            <motion.button
                                key={p.hex}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                aria-label={p.name}
                                title={`${p.name} · ${p.hex.toUpperCase()}`}
                                className={"ws-swatch" + (on ? " is-on" : "")}
                                style={{ background: p.hex }}
                                onClick={() => { setHexText(null); patch("brand", { accent: p.hex }); }}
                                whileHover={reduceMotion ? undefined : { scale: 1.08 }}
                                whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                            >
                                {on && (
                                    <motion.span
                                        layoutId={reduceMotion ? undefined : "ws-swatch-ring"}
                                        className="ws-swatch-ring"
                                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                                    />
                                )}
                                <AnimatePresence>
                                    {on && (
                                        <motion.span
                                            className="ws-swatch-check"
                                            initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={reduceMotion ? undefined : { scale: 0, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 26 }}
                                        >
                                            <Check size={15} strokeWidth={3} />
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        );
                    })}
                </div>
                <div className="ws-swatch-names" aria-hidden>
                    {ACCENT_PRESETS.find((p) => p.hex.toLowerCase() === b.accent.toLowerCase())?.name ?? "Color personalizado"}
                </div>

                <div className={"ws-color-row" + (!isPreset ? " is-custom" : "")}>
                    <label className="ws-color-pick" style={{ background: b.accent }} title="Elegir un color">
                        <input
                            type="color"
                            value={b.accent}
                            onChange={(e) => { setHexText(null); patch("brand", { accent: e.target.value.toLowerCase() }); }}
                            aria-label="Elegir color personalizado"
                        />
                        <Pipette size={15} aria-hidden />
                    </label>
                    <div className="ws-hex">
                        <label htmlFor="ws-hex-input" className="mono">HEX</label>
                        <input
                            id="ws-hex-input"
                            className="ws-hex-input"
                            value={hexValue}
                            maxLength={7}
                            spellCheck={false}
                            onChange={(e) => onHex(e.target.value)}
                            onBlur={() => setHexText(null)}
                            aria-invalid={hexInvalid || undefined}
                            aria-describedby="ws-hex-hint"
                        />
                    </div>
                    <div className="ws-tones" aria-hidden>
                        {[0.88, 0.55, 0, -0.5].map((t) => (
                            <span key={t} style={{ background: t >= 0 ? `color-mix(in srgb, ${b.accent}, white ${t * 100}%)` : `color-mix(in srgb, ${b.accent}, #0c1014 ${-t * 100}%)` }} />
                        ))}
                    </div>
                </div>
                <p className={hexInvalid ? "ws-error" : "ws-hint"} id="ws-hex-hint">
                    {hexInvalid ? "Formato no válido. Usa 6 cifras hexadecimales, por ejemplo #4F6B7F." : "Elige un tono medio u oscuro: el texto de los botones es blanco."}
                </p>
            </Block>

            <Block title="Esquinas" description="Forma de botones y tarjetas.">
                <div className="ws-radius" role="radiogroup" aria-label="Estilo de esquinas">
                    {RADIUS_OPTIONS.map((o) => {
                        const on = b.radius === o.id;
                        return (
                            <button
                                key={o.id}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                className={"ws-radius-opt" + (on ? " is-on" : "")}
                                onClick={() => patch("brand", { radius: o.id })}
                            >
                                <span className="ws-radius-demo" aria-hidden style={{ borderRadius: o.card }}>
                                    <span className="ws-radius-line" />
                                    <span className="ws-radius-btn" style={{ borderRadius: o.btn, background: b.accent }} />
                                </span>
                                <span className="ws-radius-label">{o.label}</span>
                                <span className="ws-radius-desc">{o.desc}</span>
                                {on && (
                                    <motion.span
                                        layoutId={reduceMotion ? undefined : "ws-radius-on"}
                                        className="ws-radius-ring"
                                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </Block>

            <Block
                title="Indicador «En línea»"
                description="Muestra la etiqueta «En línea» con un punto animado en la cabecera."
                aside={<Toggle checked={b.showOnline} onChange={(v) => patch("brand", { showOnline: v })} label="Mostrar indicador En línea" />}
            >
                {null}
            </Block>
        </>
    );
}

function LogoDrop({ logoUrl, onChange, readOnly }: { logoUrl: string | null; onChange: (url: string | null) => void; readOnly?: boolean }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [over, setOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const reduceMotion = useReducedMotion();

    const upload = async (file: File | undefined | null) => {
        if (!file || readOnly) return;
        if (!LOGO_TYPES.includes(file.type)) { toast.error("Formato no admitido. Usa PNG, JPG, WEBP o SVG."); return; }
        if (file.size > 2 * 1024 * 1024) { toast.error("El logo debe pesar menos de 2 MB."); return; }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await uploadWidgetLogoAction(fd);
            if (res.ok) {
                onChange(res.data);
                toast.success("Logo subido", { description: "Guarda y publica para verlo en tu web." });
            } else {
                toast.error(res.error);
            }
        } catch {
            toast.error("No se pudo subir el logo. Inténtalo de nuevo.");
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    return (
        <div
            className={"ws-drop" + (over ? " is-over" : "") + (logoUrl ? " has-logo" : "")}
            onDragOver={(e) => { e.preventDefault(); if (!readOnly) setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files?.[0]); }}
        >
            <input
                ref={inputRef}
                type="file"
                accept={LOGO_TYPES.join(",")}
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => upload(e.target.files?.[0])}
            />
            <AnimatePresence mode="wait" initial={false}>
                {logoUrl ? (
                    <motion.div
                        key={logoUrl}
                        className="ws-drop-logo"
                        initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.22 }}
                    >
                        <span className="ws-drop-img">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={logoUrl} alt="Logo actual de la clínica" />
                        </span>
                        <div className="ws-drop-actions">
                            <button type="button" className="btn btn-white btn-sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
                                {uploading ? <Loader2 size={15} className="ws-spin" aria-hidden /> : <ImageUp size={15} aria-hidden />}
                                {uploading ? "Subiendo…" : "Cambiar"}
                            </button>
                            <button type="button" className="icon-btn icon-btn-danger" onClick={() => onChange(null)} aria-label="Quitar logo" title="Quitar logo" disabled={uploading}>
                                <Trash2 size={15} />
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.button
                        key="empty"
                        type="button"
                        className="ws-drop-empty"
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading}
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={reduceMotion ? undefined : { opacity: 0 }}
                    >
                        <span className="ws-drop-ic" aria-hidden>
                            {uploading ? <Loader2 size={20} className="ws-spin" /> : <ImageUp size={20} />}
                        </span>
                        <span className="ws-drop-title">{uploading ? "Subiendo logo…" : over ? "Suelta para subir" : "Arrastra tu logo aquí"}</span>
                        <span className="ws-drop-sub">o <u>elige un archivo</u></span>
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════════════
   TEXTOS
   ════════════════════════════════════════════════════════════════════════ */
type TextKey = keyof WidgetConfig["texts"];
const TEXT_GROUPS: { title: string; description: string; fields: { key: TextKey; label: string; multiline?: boolean }[] }[] = [
    {
        title: "Formulario",
        description: "Lo primero que ve el paciente.",
        fields: [
            { key: "headline", label: "Titular" },
            { key: "headlineAccent", label: "Titular · parte destacada" },
            { key: "subtitle", label: "Subtítulo", multiline: true },
            { key: "submitButton", label: "Botón de enviar" },
        ],
    },
    {
        title: "Foto",
        description: "Instrucciones para la foto de la sonrisa.",
        fields: [
            { key: "photoTitle", label: "Título" },
            { key: "photoSubtitle", label: "Indicaciones", multiline: true },
        ],
    },
    {
        title: "Resultado",
        description: "Pantalla con el antes y el después.",
        fields: [
            { key: "resultTitle", label: "Título" },
            { key: "resultSubtitle", label: "Subtítulo", multiline: true },
        ],
    },
];

export function TextsSection({ draft, patch }: { draft: WidgetConfig; patch: Patch }) {
    const t = draft.texts;
    return (
        <>
            <div className="ws-headline-demo" aria-hidden>
                <span className="mono">ASÍ SE LEE EL TITULAR</span>
                <p>
                    {t.headline || D.texts.headline}{" "}
                    <span style={{ color: draft.brand.accent }}>{t.headlineAccent || D.texts.headlineAccent}</span>
                </p>
            </div>
            {TEXT_GROUPS.map((g) => (
                <Block key={g.title} title={g.title} description={g.description}>
                    <div className="ws-fields">
                        {g.fields.map((f) => (
                            <TextField
                                key={f.key}
                                id={`ws-text-${f.key}`}
                                label={f.label}
                                value={t[f.key]}
                                onChange={(v) => patch("texts", { [f.key]: v } as Partial<WidgetConfig["texts"]>)}
                                max={TEXT_MAX[f.key]}
                                placeholder={D.texts[f.key]}
                                defaultValue={D.texts[f.key]}
                                multiline={f.multiline}
                                rows={2}
                            />
                        ))}
                    </div>
                </Block>
            ))}
            <p className="ws-hint" style={{ marginTop: -4 }}>Si dejas un campo vacío, se usa el texto original.</p>
        </>
    );
}

/* ════════════════════════════════════════════════════════════════════════
   CONTACTO
   ════════════════════════════════════════════════════════════════════════ */
export function ContactSection({ draft, patch }: { draft: WidgetConfig; patch: Patch }) {
    const c = draft.contact;
    const msgRef = useRef<HTMLTextAreaElement>(null);
    const waErr = whatsappError(c.whatsapp);
    const country = detectCountry(c.whatsapp);
    const testHref = waErr ? undefined : widgetWhatsappHref(normalizeWidgetConfig(draft), "María");
    const sample = (c.whatsappMessage || D.contact.whatsappMessage).replace(/\{nombre\}/gi, "María");
    const hasName = /\{nombre\}/i.test(c.whatsappMessage || D.contact.whatsappMessage);

    const insertName = () => {
        const el = msgRef.current;
        const token = "{nombre}";
        const v = c.whatsappMessage;
        if (v.length + token.length > WHATSAPP_MESSAGE_MAX) { toast.error("El mensaje ya está al límite de caracteres."); return; }
        const start = el?.selectionStart ?? v.length;
        const end = el?.selectionEnd ?? v.length;
        const next = v.slice(0, start) + token + v.slice(end);
        patch("contact", { whatsappMessage: next });
        setTimeout(() => {
            if (!el) return;
            el.focus();
            el.setSelectionRange(start + token.length, start + token.length);
        }, 0);
    };

    return (
        <>
            <Block title="WhatsApp de la clínica" description="Número al que escriben los pacientes desde el resultado.">
                <TextField
                    label="Número"
                    value={c.whatsapp}
                    onChange={(v) => patch("contact", { whatsapp: v.replace(/\D/g, "").slice(0, 15) })}
                    prefix="+"
                    inputMode="tel"
                    type="tel"
                    autoComplete="off"
                    placeholder="34600123456"
                    error={waErr}
                    hint={
                        country ? (
                            <><span aria-hidden>{country.flag}</span> {country.name} ({country.dial}) · solo dígitos, con código de país.</>
                        ) : "Incluye el código de país, sin espacios ni símbolos. Ej.: 34 para España, 52 para México."
                    }
                />
                <div className="ws-inline-actions">
                    <a
                        className={"btn btn-white btn-sm" + (testHref ? "" : " is-disabled")}
                        href={testHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-disabled={!testHref || undefined}
                        onClick={(e) => { if (!testHref) e.preventDefault(); }}
                    >
                        <MessageCircle size={15} aria-hidden />
                        Probar enlace
                        <ExternalLink size={13} aria-hidden style={{ opacity: 0.6 }} />
                    </a>
                    <span className="ws-hint" style={{ margin: 0 }}>Abre WhatsApp con el mensaje de ejemplo.</span>
                </div>
            </Block>

            <Block title="Mensaje inicial" description="Texto con el que se abre la conversación.">
                <TextField
                    ref={msgRef}
                    label="Mensaje"
                    value={c.whatsappMessage}
                    onChange={(v) => patch("contact", { whatsappMessage: v })}
                    max={WHATSAPP_MESSAGE_MAX}
                    multiline
                    rows={3}
                    placeholder={D.contact.whatsappMessage}
                    defaultValue={D.contact.whatsappMessage}
                    labelExtra={
                        <button type="button" className="ws-token" onClick={insertName} title="Insertar el nombre del paciente">
                            <Braces size={12} aria-hidden /> Insertar {"{nombre}"}
                        </button>
                    }
                />
                <div className="ws-bubble" aria-label="Ejemplo del mensaje">
                    <span className="mono">EJEMPLO</span>
                    <p>{sample}</p>
                </div>
                {!hasName && (
                    <p className="ws-tip"><Lightbulb size={14} aria-hidden /> Incluye {"{nombre}"} para saber quién te escribe.</p>
                )}
            </Block>

            <Block title="Enlaces legales" description="Se enlazan junto a la casilla de consentimiento del formulario.">
                <div className="ws-fields">
                    <TextField
                        label="Política de privacidad"
                        value={c.privacyUrl}
                        onChange={(v) => patch("contact", { privacyUrl: v })}
                        max={URL_MAX}
                        type="url"
                        inputMode="url"
                        placeholder="https://tu-clinica.com/privacidad"
                        defaultValue={D.contact.privacyUrl}
                        error={urlError(c.privacyUrl)}
                        hint="Vacío o sin cambios: se usa la página de Smile Fast."
                    />
                    <TextField
                        label="Términos y condiciones"
                        value={c.termsUrl}
                        onChange={(v) => patch("contact", { termsUrl: v })}
                        max={URL_MAX}
                        type="url"
                        inputMode="url"
                        placeholder="https://tu-clinica.com/terminos"
                        defaultValue={D.contact.termsUrl}
                        error={urlError(c.termsUrl)}
                    />
                </div>
            </Block>
        </>
    );
}

/* ════════════════════════════════════════════════════════════════════════
   FUNCIONES
   ════════════════════════════════════════════════════════════════════════ */
export function FeaturesSection({ draft, patch }: { draft: WidgetConfig; patch: Patch }) {
    const f = draft.features;
    const set = (k: keyof WidgetConfig["features"]) => (v: boolean) => patch("features", { [k]: v } as Partial<WidgetConfig["features"]>);
    return (
        <Block title="Qué puede hacer el paciente" description="Activa solo lo que tu clínica atiende.">
            <div className="ws-toggles">
                <ToggleRow
                    icon={<Phone size={17} />}
                    title="Pedir teléfono"
                    description="Añade el campo de teléfono, con prefijo de país, al formulario."
                    checked={f.askPhone}
                    onChange={set("askPhone")}
                />
                <ToggleRow
                    icon={<Video size={17} />}
                    title="Botón de vídeo por WhatsApp"
                    description="En el resultado, el paciente puede pedir su vídeo en consulta por WhatsApp."
                    checked={f.videoCta}
                    onChange={set("videoCta")}
                />
                <ToggleRow
                    icon={<Mail size={17} />}
                    title="Enviar foto por correo"
                    description="El paciente puede recibir su simulación en su correo."
                    checked={f.photoEmail}
                    onChange={set("photoEmail")}
                />
                <ToggleRow
                    icon={<Camera size={17} />}
                    title="Permitir selfie con la cámara"
                    description="Muestra el botón «Tomar selfie» para hacer la foto con la cámara del dispositivo. Si lo desactivas, solo podrán subir una foto."
                    checked={f.selfieQr}
                    onChange={set("selfieQr")}
                />
            </div>
            {!f.videoCta && !f.photoEmail && (
                <p className="ws-tip"><Lightbulb size={14} aria-hidden /> Sin vídeo ni correo, el resultado no tendrá un siguiente paso para el paciente.</p>
            )}
        </Block>
    );
}

/* ════════════════════════════════════════════════════════════════════════
   INSTALACIÓN
   ════════════════════════════════════════════════════════════════════════ */
export function InstallSection({ widgetKey }: { widgetKey: string | null }) {
    const steps = [
        { icon: <Copy size={16} />, title: "Copia el código", desc: "Una sola vez." },
        { icon: <MousePointerClick size={16} />, title: "Pégalo en tu web", desc: "Donde quieras el simulador." },
        { icon: <Sparkles size={16} />, title: "Personaliza aquí", desc: "Guarda y tu web se actualiza." },
    ];
    return (
        <>
            <ol className="ws-flow">
                {steps.map((s, i) => (
                    <li key={s.title}>
                        <span className="ws-flow-ic" aria-hidden>{s.icon}</span>
                        <span className="mono">PASO {i + 1}</span>
                        <strong>{s.title}</strong>
                        <span>{s.desc}</span>
                    </li>
                ))}
            </ol>
            <EmbedCard widgetKey={widgetKey} />
            <a className="text-link" href={`/widget${widgetKey ? `?key=${encodeURIComponent(widgetKey)}` : ""}`} target="_blank" rel="noopener noreferrer">
                Abrir el widget publicado en una pestaña nueva <ExternalLink size={14} aria-hidden />
            </a>
        </>
    );
}
