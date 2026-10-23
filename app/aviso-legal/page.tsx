import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { COMPANY as C } from "@/lib/legal/company";

export const metadata: Metadata = {
    title: "Aviso legal",
    description: "Datos identificativos del titular de Smile Fast y condiciones de uso del sitio web.",
};

const mail = (m: string) => <a href={`mailto:${m}`}>{m}</a>;

const sections: LegalSection[] = [
    {
        id: "titular",
        title: "Datos identificativos del titular",
        body: (
            <>
                <p>En cumplimiento del deber de información (art. 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico, LSSI, y normas equivalentes), se facilitan los siguientes datos:</p>
                <dl className="sf-lg-dl">
                    <dt>Titular</dt><dd>{C.legalName}</dd>
                    <dt>Nombre comercial</dt><dd>{C.tradeName}</dd>
                    <dt>Producto</dt><dd>{C.product}</dd>
                    <dt>{C.taxIdLabel}</dt><dd>{C.taxId}</dd>
                    <dt>Domicilio</dt><dd>{C.address}</dd>
                    <dt>País</dt><dd>{C.country}</dd>
                    <dt>Datos registrales</dt><dd>{C.registry}</dd>
                    <dt>Email de contacto</dt><dd>{mail(C.contactEmail)}</dd>
                    <dt>Email de privacidad</dt><dd>{mail(C.privacyEmail)}</dd>
                    <dt>WhatsApp</dt><dd><a href={C.whatsappHref} target="_blank" rel="noopener noreferrer">{C.whatsapp}</a></dd>
                    <dt>Sitio web</dt><dd>{C.website}</dd>
                </dl>
            </>
        ),
    },
    {
        id: "objeto",
        title: "Objeto",
        body: (
            <p>Este sitio web informa sobre {C.product}, un servicio de simulación de sonrisa con inteligencia artificial para clínicas dentales, y da acceso al panel de las clínicas y al simulador que estas instalan en sus webs. El acceso al sitio implica la aceptación de este aviso legal. El uso del servicio por las clínicas se rige por los <Link href="/terminos">términos y condiciones</Link>.</p>
        ),
    },
    {
        id: "uso",
        title: "Condiciones de uso del sitio",
        body: (
            <ul>
                <li>Debes usar el sitio de forma lícita, sin dañar su funcionamiento ni intentar acceder a zonas o datos a los que no estés autorizado.</li>
                <li>La información del sitio es general y comercial. Las simulaciones y los ejemplos mostrados son orientativos y no constituyen consejo médico ni odontológico.</li>
                <li>Podemos modificar el contenido del sitio y este aviso en cualquier momento.</li>
            </ul>
        ),
    },
    {
        id: "propiedad",
        title: "Propiedad intelectual e industrial",
        body: (
            <p>Los textos, diseños, logotipos, marcas, imágenes, vídeos y el software de este sitio son de {C.legalName} o de terceros que han autorizado su uso, y están protegidos por la legislación de propiedad intelectual e industrial. No se permite su reproducción, distribución o transformación sin autorización, salvo para uso personal y privado. Las imágenes de ejemplo de simulaciones se usan con autorización o son generadas a partir de material con licencia.</p>
        ),
    },
    {
        id: "enlaces",
        title: "Enlaces y responsabilidad",
        body: (
            <p>El sitio puede incluir enlaces a webs de terceros (por ejemplo, WhatsApp o la pasarela de pago de Stripe). No controlamos su contenido ni respondemos de él. No respondemos de los daños derivados de interrupciones o fallos técnicos ajenos a nuestro control, ni del uso indebido del sitio por terceros.</p>
        ),
    },
    {
        id: "datos",
        title: "Protección de datos y cookies",
        body: (
            <p>El tratamiento de datos personales se explica en la <Link href="/privacidad">política de privacidad</Link> y el uso de cookies en la <Link href="/cookies">política de cookies</Link>.</p>
        ),
    },
    {
        id: "ley",
        title: "Ley aplicable",
        body: (
            <p>Este aviso se rige por {C.governingLaw}. Si eres consumidor, se aplicarán además las normas imperativas y el fuero de tu país de residencia que te correspondan.</p>
        ),
    },
];

export default function AvisoLegalPage() {
    return (
        <LegalPage
            title="Aviso legal"
            path="/aviso-legal"
            sections={sections}
        />
    );
}
