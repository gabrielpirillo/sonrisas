"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BookOpen, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CodeBlock } from "@/components/admin/widget-studio/CodeBlock";
import { buildEmbedSnippet, useAppOrigin } from "@/components/admin/widget-studio/embedSnippet";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Pasos por plataforma: dónde pegar el mismo código en cada constructor de webs. */
const PLATFORMS = [
    {
        id: "html",
        label: "HTML",
        steps: [
            "Abre el archivo de la página donde quieres mostrar el simulador.",
            "Pega el código en el lugar exacto donde debe aparecer, dentro de <body>.",
            "Guarda y publica la página.",
        ],
    },
    {
        id: "wordpress",
        label: "WordPress",
        steps: [
            "Edita la página con el editor de bloques.",
            "Añade un bloque «HTML personalizado» donde quieras el simulador.",
            "Pega el código y actualiza la página.",
        ],
    },
    {
        id: "wix",
        label: "Wix",
        steps: [
            "En el editor, pulsa «Añadir» › «Insertar código» › «Insertar HTML».",
            "Elige «Código», pega el fragmento y ajusta el tamaño del recuadro.",
            "Publica el sitio.",
        ],
    },
    {
        id: "squarespace",
        label: "Squarespace",
        steps: [
            "Edita la sección y añade un bloque «Código».",
            "Pega el fragmento con el modo HTML activado.",
            "Guarda y publica.",
        ],
    },
] as const;

type PlatformId = (typeof PLATFORMS)[number]["id"];

/**
 * Guía de instalación. El código es siempre el mismo (solo ?key=): la
 * apariencia se configura en Administración › Widget y se publica al guardar.
 */
export default function EmbedConfigurator({ widgetKey }: { widgetKey?: string | null } = {}) {
    const [platform, setPlatform] = useState<PlatformId>("html");
    const origin = useAppOrigin();
    const reduceMotion = useReducedMotion();
    const snippet = buildEmbedSnippet(origin, widgetKey);
    const current = PLATFORMS.find((p) => p.id === platform)!;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button type="button" className="btn btn-white btn-sm">
                    <BookOpen size={16} aria-hidden />
                    Guía de instalación
                </button>
            </DialogTrigger>
            <DialogContent className="!max-w-[720px] w-[calc(100vw-24px)] max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white rounded-[24px] border-[var(--blue-line)] shadow-[0_40px_90px_-30px_rgba(19,27,34,0.65)]">
                <div className="qoves-admin ws-guide">
                    <div className="ws-guide-head">
                        <span className="mono" style={{ fontSize: 9 }}>INSTALACIÓN DEL WIDGET</span>
                        <DialogTitle className="ws-guide-title">
                            Pega el código <span>una sola vez</span>
                        </DialogTitle>
                        <DialogDescription className="ws-guide-sub">
                            Colores, textos y funciones se cargan solos desde tu panel. Cuando guardes cambios, tu web los mostrará sin tocar el código.
                        </DialogDescription>
                    </div>

                    <div className="ws-guide-body">
                        <div className="seg seg-tabs" role="tablist" aria-label="Plataforma de tu web">
                            {PLATFORMS.map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={platform === p.id}
                                    className={platform === p.id ? "seg-on" : ""}
                                    onClick={() => setPlatform(p.id)}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <AnimatePresence mode="wait" initial={false}>
                            <motion.ol
                                key={platform}
                                className="ws-steps"
                                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                                transition={{ duration: 0.22, ease: EASE_OUT }}
                            >
                                {current.steps.map((s, i) => (
                                    <li key={i}>
                                        <span className="ws-step-num">{i + 1}</span>
                                        <span>{s}</span>
                                    </li>
                                ))}
                            </motion.ol>
                        </AnimatePresence>

                        <div className="ws-guide-code">
                            <CodeBlock code={snippet} />
                        </div>

                        <p className="ws-guide-note">
                            <ShieldCheck size={16} aria-hidden />
                            Este código no cambia: tus cambios se publican al guardar.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
