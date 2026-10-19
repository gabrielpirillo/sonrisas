import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Términos de uso" };

const h2 = { fontSize: 20, color: "var(--ink)", letterSpacing: "-0.02em", fontWeight: 600, margin: "32px 0 8px" } as const;

export default function TerminosPage() {
    return (
        <LegalPage title="Términos de uso del simulador" updated="octubre de 2026">
            <h2 style={h2}>La simulación es orientativa</h2>
            <p>La imagen que recibes es una recreación generada por inteligencia artificial. No es un diagnóstico ni una promesa de resultado: el tratamiento adecuado y su resultado real dependen de la valoración de un profesional.</p>
            <h2 style={h2}>Uso de la foto</h2>
            <p>Sube solo fotos tuyas. Debes ser mayor de edad para usar el simulador.</p>
            <h2 style={h2}>Contacto de la clínica</h2>
            <p>Al enviar tus datos aceptas que la clínica te contacte por correo, teléfono o WhatsApp sobre tu simulación y el tratamiento que te interesa.</p>
            <h2 style={h2}>Tus datos</h2>
            <p>El tratamiento de tus datos se explica en la <a href="/privacidad" style={{ color: "var(--blue-deep)" }}>política de privacidad</a>.</p>
        </LegalPage>
    );
}
