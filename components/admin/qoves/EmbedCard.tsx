"use client";

import { useReducedMotion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import EmbedConfigurator from "@/components/admin/embed/EmbedConfigurator";
import { CodeBlock } from "@/components/admin/widget-studio/CodeBlock";
import { buildEmbedSnippet, useAppOrigin } from "@/components/admin/widget-studio/embedSnippet";

/* Tarjeta navy "código de integración".
   El fragmento es constante (solo ?key=): la apariencia y los textos se
   configuran en el panel y el widget los carga solo, sin tocar la web. */
export function EmbedCard({ widgetKey }: { widgetKey?: string | null }) {
    const origin = useAppOrigin();
    const reduceMotion = useReducedMotion();
    const snippet = buildEmbedSnippet(origin, widgetKey);

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

                <CodeBlock code={snippet} />

                <div className="ws-embed-note">
                    <ShieldCheck size={16} aria-hidden />
                    <span>Este código no cambia: tus cambios se publican al guardar.</span>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
                    <EmbedConfigurator widgetKey={widgetKey} />
                </div>
            </div>
        </div>
    );
}
