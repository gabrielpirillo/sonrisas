import type { Metadata } from "next";
import Link from "next/link";
import { LegalNote, LegalPage, LegalTable, type LegalSection } from "@/components/legal/LegalPage";
import { COMPANY as C } from "@/lib/legal/company";

export const metadata: Metadata = {
    title: "Política de cookies",
    description: "Smile Fast solo usa cookies técnicas estrictamente necesarias. No usamos cookies de analítica ni de publicidad.",
};

const sections: LegalSection[] = [
    {
        id: "resumen",
        title: "Resumen",
        body: (
            <LegalNote>
                <p><strong>Solo usamos cookies y almacenamiento técnico estrictamente necesarios</strong> para que el servicio funcione. No usamos cookies de analítica, de publicidad, de redes sociales ni píxeles de seguimiento, y no compartimos información de navegación con terceros con fines publicitarios.</p>
            </LegalNote>
        ),
    },
    {
        id: "que-son",
        title: "Qué son las cookies",
        body: (
            <p>Las cookies son pequeños archivos que un sitio web guarda en tu navegador. Algunas son imprescindibles para que el sitio funcione (por ejemplo, para mantener tu sesión iniciada); otras sirven para medir visitas o mostrar publicidad, y esas requieren tu consentimiento.</p>
        ),
    },
    {
        id: "cookies-usadas",
        title: "Cookies que usamos",
        body: (
            <>
                <LegalTable
                    head={["Cookie / almacenamiento", "Finalidad", "Tipo", "Duración"]}
                    rows={[
                        ["better-auth.session_token (__Secure-better-auth.session_token en HTTPS)", "Mantener la sesión iniciada en el panel de la clínica de forma segura.", "Propia, técnica, necesaria", "7 días; se renueva mientras usas el panel y se borra al cerrar sesión"],
                        ["Otras cookies técnicas de Better Auth (p. ej. better-auth.dont_remember)", "Gestionar opciones del inicio de sesión, como no recordar la sesión.", "Propia, técnica, necesaria", "Sesión del navegador"],
                    ]}
                />
                <p>La protección frente a falsificación de peticiones (CSRF) se basa en comprobar el origen de cada petición, sin cookies adicionales. Actualmente no usamos cookies de preferencias.</p>
                <p>El simulador que se muestra en la web de las clínicas <strong>no instala cookies de seguimiento</strong>. Solo usa la memoria del navegador durante tu visita para completar el proceso.</p>
                <p>Los vídeos de demostración de nuestra web comercial se sirven desde la red de Cloudinary, que recibe los datos técnicos de la conexión para entregarlos, sin cookies de seguimiento.</p>
            </>
        ),
    },
    {
        id: "consentimiento",
        title: "Consentimiento y aviso",
        body: (
            <p>Las cookies estrictamente necesarias están exentas de consentimiento (art. 22.2 de la LSSI en España y normas equivalentes), por eso no mostramos un banner de cookies. Si en el futuro incorporamos cookies de analítica o publicidad, actualizaremos esta política y te pediremos el consentimiento antes de instalarlas, con la opción de rechazarlas tan fácilmente como aceptarlas.</p>
        ),
    },
    {
        id: "gestion",
        title: "Cómo gestionarlas",
        body: (
            <p>Puedes ver y borrar las cookies desde la configuración de tu navegador. Si bloqueas las cookies técnicas, no podrás iniciar sesión en el panel. Más información en la ayuda de tu navegador (Chrome, Safari, Firefox o Edge).</p>
        ),
    },
    {
        id: "mas-info",
        title: "Más información",
        body: (
            <p>El tratamiento de datos personales se explica en la <Link href="/privacidad">política de privacidad</Link>. Para cualquier consulta, escribe a <a href={`mailto:${C.privacyEmail}`}>{C.privacyEmail}</a>.</p>
        ),
    },
];

export default function CookiesPage() {
    return (
        <LegalPage
            title="Política de cookies"
            path="/cookies"
            intro={<p>Qué cookies usa {C.product} y para qué.</p>}
            sections={sections}
        />
    );
}
