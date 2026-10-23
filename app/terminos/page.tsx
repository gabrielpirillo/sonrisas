import type { Metadata } from "next";
import Link from "next/link";
import { LegalNote, LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { COMPANY as C } from "@/lib/legal/company";
import { TERMS_VERSION } from "@/lib/legal/versions";

export const metadata: Metadata = {
    title: "Términos y condiciones",
    description: "Condiciones de uso de Smile Fast para clínicas dentales y para los pacientes que usan el simulador.",
};

const mail = (m: string) => <a href={`mailto:${m}`}>{m}</a>;

const sections: LegalSection[] = [
    {
        id: "objeto",
        title: "Objeto y aceptación",
        body: (
            <>
                <p>Estos términos regulan el uso de {C.product}, un servicio de {C.tradeName} ({C.legalName}, {C.taxIdLabel} {C.taxId}, {C.address}, {C.country}; en adelante, «{C.tradeName}» o «nosotros»).</p>
                <p>Las secciones 1 a 17 se aplican a las <strong>clínicas</strong> y profesionales que crean una cuenta en el panel (relación entre empresas). La <a href="#pacientes">sección 18</a> se aplica a los <strong>pacientes y visitantes</strong> que usan el simulador en la web de una clínica.</p>
                <p>Al crear una cuenta, la persona que la crea declara que tiene facultades para obligar a la clínica y acepta, en su nombre, estos términos, el <Link href="/encargo-de-tratamiento">contrato de encargo de tratamiento</Link> (que forma parte de estos términos) y declara haber leído la <Link href="/privacidad">política de privacidad</Link>.</p>
            </>
        ),
    },
    {
        id: "definiciones",
        title: "Definiciones",
        body: (
            <ul>
                <li><strong>Clínica:</strong> la persona física o jurídica titular de la cuenta (clínica dental, odontólogo o grupo de clínicas).</li>
                <li><strong>Usuarios:</strong> las personas que la clínica autoriza a entrar al panel (titular, administradores y miembros).</li>
                <li><strong>Widget o simulador:</strong> el módulo que la clínica instala en su web para que los pacientes suban una foto y vean una simulación de sonrisa.</li>
                <li><strong>Paciente o lead:</strong> la persona que usa el simulador y deja sus datos de contacto.</li>
                <li><strong>Créditos:</strong> unidades prepagadas que se consumen al generar simulaciones (imágenes) o vídeos.</li>
            </ul>
        ),
    },
    {
        id: "cuenta",
        title: "Cuenta y usuarios",
        body: (
            <ul>
                <li>La información de alta debe ser veraz y mantenerse actualizada. La clínica es responsable de la actividad realizada con sus cuentas.</li>
                <li>Cada usuario debe tener credenciales propias y guardarlas en secreto. Avísanos de inmediato si sospechas un acceso no autorizado.</li>
                <li>La clínica decide quién accede a su panel y con qué rol, y debe retirar el acceso a quienes ya no deban tenerlo.</li>
                <li>El servicio es solo para profesionales y empresas del sector dental o estético; no está dirigido a consumidores.</li>
            </ul>
        ),
    },
    {
        id: "servicio",
        title: "El servicio",
        body: (
            <>
                <p>{C.product} incluye el panel de la clínica, el widget instalable, la generación de simulaciones de sonrisa mediante inteligencia artificial, la recepción y gestión de leads, la generación opcional de vídeos y el envío de correos transaccionales asociados.</p>
                <p>Podemos mejorar, modificar o retirar funciones. Si un cambio reduce de forma sustancial una función por la que la clínica ha pagado créditos, lo avisaremos con antelación razonable y la clínica podrá pedir el reembolso de los créditos no consumidos.</p>
            </>
        ),
    },
    {
        id: "creditos",
        title: "Créditos, precios y pagos",
        body: (
            <ul>
                <li><strong>Sin suscripción ni permanencia.</strong> El servicio funciona con paquetes de créditos de pago único. No hay cuotas mensuales ni renovaciones automáticas.</li>
                <li><strong>Consumo:</strong> cada simulación o vídeo consume los créditos indicados en el panel en el momento de generarlo. Si una generación falla por causas técnicas nuestras, los créditos se devuelven automáticamente.</li>
                <li><strong>Precios y moneda por país:</strong> el precio de cada paquete y la moneda dependen del país de facturación de la clínica y se muestran antes del pago. Los precios pueden incluir o no impuestos según el país; lo indicaremos en la página de pago. Podemos cambiar los precios en cualquier momento, sin afectar a las compras ya realizadas.</li>
                <li><strong>Pago:</strong> se realiza mediante Stripe. La clínica acepta además las condiciones de Stripe. No guardamos los datos de la tarjeta.</li>
                <li><strong>Los créditos no caducan</strong> mientras la cuenta esté activa. No son canjeables por dinero salvo en los casos de reembolso previstos en estos términos y no pueden transferirse a otra clínica sin nuestro acuerdo.</li>
                <li>Los créditos gratuitos, promocionales o de bienvenida no tienen valor monetario ni son reembolsables.</li>
            </ul>
        ),
    },
    {
        id: "reembolsos",
        title: "Política de reembolsos",
        body: (
            <>
                <ul>
                    <li>Puedes pedir el reembolso de un paquete <strong>dentro de los 14 días siguientes a la compra</strong>, siempre que <strong>no se haya consumido ningún crédito</strong> de ese paquete.</li>
                    <li>Los créditos <strong>consumidos no son reembolsables</strong>: corresponden a un coste de procesamiento ya incurrido.</li>
                    <li>Si se consumió parte de un paquete, o si han pasado más de 14 días, podemos valorar reembolsos parciales en casos justificados (por ejemplo, un fallo prolongado del servicio).</li>
                    <li>Al cerrar la cuenta por decisión nuestra sin causa imputable a la clínica, reembolsaremos los créditos de pago no consumidos.</li>
                    <li>El reembolso se hace al mismo medio de pago, en la moneda de la compra, a través de Stripe. Pídelo a {mail(C.contactEmail)} o por WhatsApp <a href={C.whatsappHref} target="_blank" rel="noopener noreferrer">{C.whatsapp}</a>.</li>
                </ul>
                <p>Esta política no limita los derechos que la ley imperativa del país de la clínica le reconozca.</p>
            </>
        ),
    },
    {
        id: "uso-aceptable",
        title: "Uso aceptable",
        body: (
            <>
                <p>La clínica se compromete a no usar el servicio, ni permitir que se use, para:</p>
                <ul>
                    <li>Procesar fotos de personas sin su consentimiento, de menores de edad o de terceros que no han usado el simulador por sí mismos.</li>
                    <li>Presentar las simulaciones como resultados reales de tratamientos, como fotos «antes y después» de pacientes reales, o con fines publicitarios sin el consentimiento expreso del paciente.</li>
                    <li>Generar contenido ilícito, ofensivo, sexual, discriminatorio o que vulnere derechos de terceros.</li>
                    <li>Enviar comunicaciones comerciales a los leads sin base legal (por ejemplo, sin su consentimiento cuando sea necesario).</li>
                    <li>Intentar acceder a datos de otras clínicas, eludir los límites técnicos o de créditos, hacer ingeniería inversa, sobrecargar el sistema o automatizar el uso del widget de forma abusiva.</li>
                    <li>Revender o sublicenciar el servicio sin nuestro acuerdo por escrito.</li>
                </ul>
                <p>También se aplican las políticas de uso de nuestros proveedores de inteligencia artificial.</p>
            </>
        ),
    },
    {
        id: "responsabilidades-clinica",
        title: "Responsabilidades de la clínica",
        body: (
            <ul>
                <li><strong>Es la responsable del tratamiento</strong> de los datos de sus pacientes y leads. Debe informarles (por ejemplo, enlazando su propia política de privacidad o la nuestra desde el widget), contar con una base legal válida y atender sus derechos. Puede ver, exportar y borrar los datos desde el panel.</li>
                <li>Debe usar los leads solo para responder a la solicitud del paciente y, para comunicaciones comerciales, únicamente con su consentimiento cuando la ley lo exija.</li>
                <li>Debe configurar correctamente el widget (textos, enlaces legales, preguntas opcionales) y no pedir datos innecesarios ni datos de salud que no necesite.</li>
                <li>Debe cumplir la normativa sanitaria, deontológica y de publicidad sanitaria aplicable en su país.</li>
                <li>Es responsable del contenido que sube (logotipo, textos, imágenes) y de tener derechos sobre él.</li>
            </ul>
        ),
    },
    {
        id: "aviso-clinico",
        title: "Aviso clínico: la simulación es orientativa",
        body: (
            <LegalNote>
                <p>Las simulaciones y vídeos son <strong>recreaciones estéticas generadas por inteligencia artificial</strong>, con fines informativos y comerciales. <strong>No son un diagnóstico, ni un plan de tratamiento, ni una promesa de resultado.</strong> Pueden contener imprecisiones. La clínica no debe presentarlas como garantía del resultado y debe valorar a cada paciente en consulta. Toda decisión clínica es exclusiva del profesional sanitario.</p>
            </LegalNote>
        ),
    },
    {
        id: "datos",
        title: "Protección de datos",
        body: (
            <>
                <p>Para los datos de pacientes y leads, {C.tradeName} actúa como <strong>encargado del tratamiento</strong> de la clínica, en los términos del <Link href="/encargo-de-tratamiento">contrato de encargo de tratamiento</Link>, que forma parte de estos términos y prevalece en caso de contradicción en materia de datos personales. La lista de proveedores está en <Link href="/subencargados">subencargados</Link>.</p>
                <p>Para los datos de la clínica y sus usuarios, {C.tradeName} es responsable según la <Link href="/privacidad">política de privacidad</Link>.</p>
            </>
        ),
    },
    {
        id: "propiedad-intelectual",
        title: "Propiedad intelectual",
        body: (
            <ul>
                <li>El software, el panel, el widget, la marca {C.product}, los diseños y la documentación son de {C.tradeName} o de sus licenciantes. Concedemos a la clínica una licencia limitada, no exclusiva e intransferible para usarlos mientras su cuenta esté activa.</li>
                <li>La clínica conserva sus derechos sobre su marca y contenidos, y nos autoriza a usarlos solo para prestar el servicio (por ejemplo, mostrar su logotipo en el widget).</li>
                <li>Las simulaciones generadas pertenecen a la relación entre la clínica y el paciente; {C.tradeName} no las usa para fines propios. No usaremos el nombre o el logotipo de la clínica como referencia comercial sin su permiso.</li>
                <li>Si nos envías sugerencias de mejora, podemos usarlas libremente sin obligación de compensación.</li>
            </ul>
        ),
    },
    {
        id: "disponibilidad",
        title: "Disponibilidad y soporte",
        body: (
            <p>Trabajamos para que el servicio esté disponible de forma continua, pero no garantizamos que funcione sin interrupciones ni errores: puede haber mantenimientos, fallos de proveedores (por ejemplo, del servicio de IA) o causas de fuerza mayor. El soporte se presta por correo y WhatsApp en horario laboral, sin compromiso de nivel de servicio salvo acuerdo por escrito.</p>
        ),
    },
    {
        id: "responsabilidad",
        title: "Responsabilidad",
        body: (
            <>
                <ul>
                    <li>El servicio se presta «tal cual». No garantizamos que las simulaciones se ajusten a una expectativa concreta ni un número de leads, citas o ventas.</li>
                    <li>No respondemos de daños indirectos, lucro cesante, pérdida de oportunidades o de reputación, ni de decisiones clínicas o comerciales tomadas a partir de las simulaciones.</li>
                    <li>Nuestra responsabilidad total frente a la clínica por cualquier reclamación relacionada con el servicio se limita al importe pagado por la clínica en los <strong>12 meses anteriores</strong> al hecho que la origina.</li>
                    <li>Estas limitaciones no se aplican en caso de dolo o culpa grave, ni cuando la ley no permita limitarlas.</li>
                    <li>La clínica responde frente a {C.tradeName} por los daños derivados del incumplimiento de estos términos o de la normativa de protección de datos en su condición de responsable.</li>
                </ul>
            </>
        ),
    },
    {
        id: "suspension",
        title: "Suspensión",
        body: (
            <p>Podemos suspender total o parcialmente una cuenta o el widget si detectamos un uso contrario a estos términos o a la ley, un riesgo de seguridad, impagos o contracargos, o si lo exige una autoridad. Cuando sea posible, avisaremos antes y daremos un plazo razonable para corregir la situación. Durante la suspensión, la clínica seguirá pudiendo exportar sus datos salvo que la ley lo impida.</p>
        ),
    },
    {
        id: "terminacion",
        title: "Duración, terminación y borrado de datos",
        body: (
            <ul>
                <li>Estos términos se aplican mientras la cuenta esté activa. La clínica puede dejar de usar el servicio y pedir el cierre de su cuenta en cualquier momento desde el panel o escribiéndonos.</li>
                <li>Al pedir el cierre empieza un <strong>periodo de gracia de 30 días</strong> en el que la clínica puede cancelarlo y exportar sus datos. Pasado ese plazo, eliminamos la cuenta, los leads, las simulaciones y las imágenes, salvo los datos que debamos conservar por obligación legal (por ejemplo, facturación), que se bloquean hasta su plazo.</li>
                <li>Podemos terminar el servicio con un preaviso de 30 días, o de inmediato por incumplimiento grave. En el primer caso reembolsaremos los créditos de pago no consumidos.</li>
                <li>Las cláusulas que por su naturaleza deban sobrevivir (responsabilidad, propiedad intelectual, ley aplicable) siguen vigentes tras la terminación.</li>
            </ul>
        ),
    },
    {
        id: "cambios",
        title: "Cambios en los términos",
        body: (
            <p>Podemos modificar estos términos. Avisaremos de los cambios relevantes en el panel o por correo con al menos 15 días de antelación, salvo que se deban a cambios legales o de seguridad urgentes. Si la clínica no está de acuerdo, puede cerrar su cuenta y pedir el reembolso de los créditos de pago no consumidos; si sigue usando el servicio tras la entrada en vigor, se entiende que acepta los nuevos términos. En el panel se pedirá la aceptación expresa de cada nueva versión.</p>
        ),
    },
    {
        id: "ley",
        title: "Ley aplicable y jurisdicción",
        body: (
            <p>Estos términos se rigen por {C.governingLaw}. Para cualquier controversia, las partes se someten a {C.jurisdiction}, salvo que una norma imperativa establezca otro fuero. Antes de acudir a los tribunales, las partes intentarán resolver la controversia de buena fe durante al menos 30 días.</p>
        ),
    },
    {
        id: "pacientes",
        title: "Condiciones para pacientes y usuarios del simulador",
        body: (
            <>
                <p>Si usas el simulador en la web de una clínica:</p>
                <ul>
                    <li><strong>La simulación es orientativa.</strong> Es una recreación generada por inteligencia artificial, no un diagnóstico ni una promesa de resultado. El tratamiento adecuado y su resultado real dependen de la valoración de un profesional.</li>
                    <li><strong>Debes ser mayor de 18 años</strong> y subir solo fotos tuyas.</li>
                    <li>El simulador es gratuito para ti. Al enviar tus datos, la clínica podrá contactarte por correo, teléfono o WhatsApp sobre tu simulación y el tratamiento que te interesa. Solo recibirás promociones si lo aceptas expresamente.</li>
                    <li>No uses el simulador para fines ilícitos ni intentes alterar su funcionamiento.</li>
                    <li>Tus datos se tratan según la <Link href="/privacidad">política de privacidad</Link> y la de la clínica. Para cualquier duda o para borrar tus datos, contacta con la clínica.</li>
                </ul>
            </>
        ),
    },
    {
        id: "contacto",
        title: "Contacto",
        body: (
            <p>{C.legalName} · {C.address}, {C.country} · {mail(C.contactEmail)} · WhatsApp <a href={C.whatsappHref} target="_blank" rel="noopener noreferrer">{C.whatsapp}</a></p>
        ),
    },
];

export default function TerminosPage() {
    return (
        <LegalPage
            title="Términos y condiciones de uso"
            path="/terminos"
            version={TERMS_VERSION}
            intro={<p>Condiciones para las clínicas que contratan {C.product} y para los pacientes que usan el simulador en la web de una clínica.</p>}
            sections={sections}
        />
    );
}
