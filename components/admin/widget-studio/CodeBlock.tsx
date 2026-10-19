"use client";

import "./widget-studio.css";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

/* Bloque de código navy con botón de copiar (instalación del widget). */
export function CodeBlock({ code, filename = "widget.html", maxHeight = 260 }: { code: string; filename?: string; maxHeight?: number }) {
    const [copied, setCopied] = useState(false);
    const reduceMotion = useReducedMotion();
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

    const copy = () => {
        navigator.clipboard.writeText(code).then(
            () => {
                setCopied(true);
                toast.success("Código copiado al portapapeles");
                if (timer.current) clearTimeout(timer.current);
                timer.current = setTimeout(() => setCopied(false), 1800);
            },
            () => toast.error("No se pudo copiar. Selecciona el código y cópialo manualmente."),
        );
    };

    // Resaltado mínimo: valores entre comillas en azul claro.
    const highlighted = code.split(/("[^"]*")/g).map((part, i) =>
        i % 2 === 1 ? <span key={i} className="ws-code-str">{part}</span> : <span key={i}>{part}</span>,
    );

    return (
        <div className="ws-code">
            <div className="ws-code-bar">
                <div className="ws-code-dots" aria-hidden>
                    <span /><span /><span />
                    <em className="mono">{filename}</em>
                </div>
                <motion.button
                    type="button"
                    onClick={copy}
                    whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                    className={"ws-code-copy" + (copied ? " is-copied" : "")}
                    aria-label={copied ? "Código copiado" : "Copiar código"}
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
            <pre className="ws-code-pre" style={{ maxHeight }} tabIndex={0} aria-label="Código de instalación">
                {highlighted}
            </pre>
            <span className="sr-only" aria-live="polite">{copied ? "Código copiado" : ""}</span>
        </div>
    );
}
