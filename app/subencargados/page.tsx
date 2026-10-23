import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalTable, type LegalSection } from "@/components/legal/LegalPage";
import { COMPANY as C } from "@/lib/legal/company";
import { SUBPROCESSORS } from "@/lib/legal/subprocessors";

export const metadata: Metadata = {
    title: "Subencargados",
    description: "Proveedores que tratan datos por cuenta de Smile Fast: finalidad, ubicación y garantías.",
};

const withData = SUBPROCESSORS.filter((s) => s.personalData);
const withoutData = SUBPROCESSORS.filter((s) => !s.personalData);

const sections: LegalSection[] = [
    {
        id: "lista",
        title: "Subencargados que tratan datos personales",
        body: (
            <LegalTable
                head={["Proveedor", "Finalidad", "Datos", "Ubicación", "Garantías"]}
                rows={withData.map((s) => [
                    <span key="n">{s.name}<br /><small style={{ color: "var(--ink-3)", fontWeight: 400 }}>{s.service}</small></span>,
                    s.purpose,
                    s.data,
                    s.location,
                    s.safeguards,
                ])}
            />
        ),
    },
    {
        id: "otros",
        title: "Otros proveedores sin acceso a datos del servicio",
        body: (
            <>
                <LegalTable
                    head={["Proveedor", "Uso", "Datos personales"]}
                    rows={withoutData.map((s) => [`${s.name} (${s.service})`, s.purpose, s.data])}
                />
                <p>El modelo que encuadra el rostro en el navegador se descarga de los servidores de Google (MediaPipe) y se ejecuta en el dispositivo del paciente: la foto no se envía a ese servicio.</p>
            </>
        ),
    },
    {
        id: "cambios",
        title: "Cambios en la lista",
        body: (
            <p>Avisaremos a las clínicas con al menos 15 días de antelación antes de incorporar o sustituir un subencargado que trate datos personales, por correo o en el panel, según el <Link href="/encargo-de-tratamiento">contrato de encargo de tratamiento</Link>. Las clínicas pueden oponerse de forma motivada dentro de ese plazo. Para recibir estos avisos en otra dirección, escribe a <a href={`mailto:${C.privacyEmail}`}>{C.privacyEmail}</a>.</p>
        ),
    },
];

export default function SubencargadosPage() {
    return (
        <LegalPage
            title="Subencargados del tratamiento"
            eyebrow="Legal · Clínicas"
            path="/subencargados"
            intro={<p>Proveedores a los que {C.tradeName} recurre para prestar {C.product} y que pueden tratar datos personales por cuenta de las clínicas.</p>}
            sections={sections}
        />
    );
}
