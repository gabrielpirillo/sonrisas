import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Privacidad" };

const h2 = { fontSize: 20, color: "var(--ink)", letterSpacing: "-0.02em", fontWeight: 600, margin: "32px 0 8px" } as const;

export default function PrivacidadPage() {
    return (
        <LegalPage title="Política de privacidad" updated="octubre de 2026">
            <p>Smile Fast es la herramienta que usa la clínica dental en su web para mostrarte una simulación de tu sonrisa. La clínica es la responsable de tus datos; Smile Fast los trata por encargo de ella.</p>
            <h2 style={h2}>Qué datos usamos</h2>
            <p>Tu nombre, correo, teléfono, la foto que subes y la simulación generada a partir de ella. Si respondes las preguntas opcionales, también esas respuestas.</p>
            <h2 style={h2}>Para qué</h2>
            <p>Para generar tu simulación, enviártela por correo y que la clínica pueda contactarte sobre el tratamiento que te interesa. No vendemos tus datos ni los usamos para publicidad de terceros.</p>
            <h2 style={h2}>Con quién se comparten</h2>
            <p>Con la clínica a la que pertenece el simulador y con los proveedores técnicos necesarios para prestar el servicio: alojamiento, almacenamiento de imágenes, envío de correo y el modelo de inteligencia artificial que genera la simulación.</p>
            <h2 style={h2}>Cuánto tiempo</h2>
            <p>Mientras la clínica los necesite para atender tu solicitud, o hasta que pidas borrarlos.</p>
            <h2 style={h2}>Tus derechos</h2>
            <p>Puedes pedir acceder a tus datos, corregirlos o eliminarlos escribiendo a la clínica que te atiende.</p>
        </LegalPage>
    );
}
