"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import EmbedConfigurator from "@/components/admin/embed/EmbedConfigurator";

/* Prominent dark "código de integración" card — the central B2B value.
   Shows the real inline-iframe embed snippet for this deployment and a
   copy button; the full integration wizard stays available below. */
export function EmbedCard() {
    const [origin, setOrigin] = useState("https://smile-forward.app");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") setOrigin(window.location.origin);
    }, []);

    const snippet = `<div style="width:100%; max-width:1200px; margin:0 auto; aspect-ratio:16/9; min-height:500px; overflow:hidden; border-radius:2rem; border:1px solid #e5e7eb; background:#fff;">
  <iframe
    src="${origin}/widget?theme=auto"
    width="100%" height="100%" frameborder="0"
    allow="camera; microphone; clipboard-read; clipboard-write"
    style="border:none;"
  ></iframe>
</div>`;

    const copy = () => {
        navigator.clipboard.writeText(snippet);
        setCopied(true);
        toast.success("Código copiado al portapapeles");
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="card" style={{ padding: 24, background: "var(--ink)", border: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span className="mono" style={{ fontSize: 9, color: "rgba(255,255,255,0.55)" }}>CÓDIGO DE INTEGRACIÓN</span>
                <span className="mono" style={{ fontSize: 9, color: "#8fb3a4" }}>● CONECTADO</span>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: "#fff", letterSpacing: "-0.02em", margin: "0 0 14px" }}>
                Instala el widget en tu web
            </h3>
            <pre className="embed-pre">{snippet}</pre>
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                <button className="btn btn-white btn-sm" onClick={copy}>{copied ? "Copiado" : "Copiar código"}</button>
                <EmbedConfigurator />
            </div>
        </div>
    );
}
