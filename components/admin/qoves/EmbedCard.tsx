"use client";

import { useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import EmbedConfigurator from "@/components/admin/embed/EmbedConfigurator";

const noopSubscribe = () => () => {};

/* Tarjeta navy "código de integración" — el valor central B2B.
   Muestra el fragmento real (iframe en línea) para este despliegue con un
   botón de copiar; el asistente de integración completo sigue disponible. */
export function EmbedCard({ widgetKey }: { widgetKey?: string | null }) {
    // Origen real del despliegue (cliente); en SSR usa NEXT_PUBLIC_APP_URL.
    const origin = useSyncExternalStore(
        noopSubscribe,
        () => window.location.origin,
        () => process.env.NEXT_PUBLIC_APP_URL || "",
    );
    const [copied, setCopied] = useState(false);
    const reduceMotion = useReducedMotion();

    const snippet = `<div style="width:100%; max-width:1200px; margin:0 auto; aspect-ratio:16/9; min-height:500px; overflow:hidden; border-radius:2rem; border:1px solid #d3dee6; background:#fff;">
  <iframe
    src="${origin}/widget${widgetKey ? `?key=${encodeURIComponent(widgetKey)}` : ''}"
    width="100%" height="100%" frameborder="0"
    allow="camera; microphone; clipboard-read; clipboard-write"
    style="border:none;"
  ></iframe>
</div>`;

    const copy = () => {
        navigator.clipboard.writeText(snippet).then(
            () => {
                setCopied(true);
                toast.success("Código copiado al portapapeles");
                setTimeout(() => setCopied(false), 1800);
            },
            () => toast.error("No se pudo copiar. Selecciona el código y cópialo manualmente."),
        );
    };

    // Resaltado mínimo: valores entre comillas en azul claro, etiquetas en blanco.
    const highlighted = snippet.split(/("[^"]*")/g).map((part, i) =>
        i % 2 === 1
            ? <span key={i} style={{ color: "var(--blue-light)" }}>{part}</span>
            : <span key={i}>{part}</span>
    );

    return (
        <div className="card card-navy" style={{ padding: 24 }}>
            {/* brillo decorativo */}
            <span aria-hidden style={{ position: "absolute", right: -80, top: -90, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(185,207,221,0.22), transparent 65%)", pointerEvents: "none" }} />

            <div style={{ position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                    <span className="mono" style={{ fontSize: 9 }}>CÓDIGO DE INTEGRACIÓN</span>
                    <span
                        className="mono"
                        style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 8.5, color: "var(--blue-light)", padding: "5px 10px", borderRadius: 99, background: "rgba(185,207,221,0.1)", border: "1px solid rgba(185,207,221,0.22)" }}
                    >
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--blue-light)", boxShadow: "0 0 8px 1px rgba(185,207,221,0.8)", animation: reduceMotion ? undefined : "sf-glow 2.2s var(--ease) infinite" }} />
                        CONECTADO
                    </span>
                </div>
                <h3 style={{ fontSize: 21, fontWeight: 600, color: "#fff", letterSpacing: "-0.02em", margin: "0 0 6px" }}>
                    Instala el widget en tu web
                </h3>
                <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "rgba(255,255,255,0.6)", margin: "0 0 16px" }}>
                    Pega este fragmento donde quieras mostrar el simulador de sonrisa.
                </p>

                {/* Bloque de código navy */}
                <div style={{ borderRadius: 14, overflow: "hidden", background: "rgba(19,27,34,0.6)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 8px 8px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                            {["var(--blue-light)", "var(--blue)", "var(--blue-deep)"].map((c) => (
                                <span key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.75 }} />
                            ))}
                            <span className="mono" style={{ fontSize: 8.5, marginLeft: 8, color: "rgba(255,255,255,0.45)" }}>widget.html</span>
                        </div>
                        <motion.button
                            type="button"
                            onClick={copy}
                            whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                            aria-live="polite"
                            style={{
                                display: "inline-flex", alignItems: "center", gap: 7, height: 30, padding: "0 12px", borderRadius: 99,
                                fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 500, cursor: "pointer",
                                color: copied ? "var(--navy-2)" : "#fff",
                                background: copied ? "var(--blue-light)" : "rgba(255,255,255,0.08)",
                                border: `1px solid ${copied ? "var(--blue-light)" : "rgba(255,255,255,0.16)"}`,
                                transition: "background .25s var(--ease), color .25s var(--ease), border-color .25s var(--ease)",
                                flexShrink: 0,
                            }}
                        >
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.span
                                    key={copied ? "ok" : "copy"}
                                    initial={reduceMotion ? false : { opacity: 0, y: 6, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.9 }}
                                    transition={{ duration: 0.18 }}
                                    style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
                                >
                                    {copied ? <Check size={14} strokeWidth={2.4} /> : <Copy size={14} />}
                                    {copied ? "Copiado" : "Copiar"}
                                </motion.span>
                            </AnimatePresence>
                        </motion.button>
                    </div>
                    <pre
                        style={{
                            margin: 0, padding: "14px 16px", maxHeight: 240, overflow: "auto",
                            fontFamily: "var(--font-mono)", fontSize: 11.5, lineHeight: 1.7,
                            color: "rgba(255,255,255,0.86)",
                            whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word",
                        }}
                    >
                        {highlighted}
                    </pre>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="mono" style={{ fontSize: 8.5, color: "rgba(255,255,255,0.42)" }}>Otros formatos: flotante · clic</span>
                    <EmbedConfigurator widgetKey={widgetKey} />
                </div>
            </div>
        </div>
    );
}
