import type { Metadata } from "next";
import Link from "next/link";
import { LegalNote, LegalPage, LegalTable, type LegalSection } from "@/components/legal/LegalPage";
import { COMPANY as C } from "@/lib/legal/company";
import { DPA_VERSION } from "@/lib/legal/versions";
import { SUBPROCESSORS } from "@/lib/legal/subprocessors";

export const metadata: Metadata = {
    title: "Contrato de encargo de tratamiento",
    description: "Contrato de encargo de tratamiento de datos (art. 28 RGPD y normas equivalentes) entre cada clínica y Smile Fast.",
};

const mail = (m: string) => <a href={`mailto:${m}`}>{m}</a>;

const sections: LegalSection[] = [
    {
        id: "partes",
        title: "Partes y naturaleza del contrato",
        body: (
            <>
                <ul>
                    <li><strong>Responsable del tratamiento («la Clínica»):</strong> la clínica titular de la cuenta en {C.product}, identificada con los datos facilitados al registrarse.</li>
                    <li><strong>Encargado del tratamiento («el Encargado»):</strong> {C.legalName} ({C.tradeName}), {C.taxIdLabel} {C.taxId}, {C.address}, {C.country}. Contacto: {mail(C.privacyEmail)}.</li>
                </ul>
                <p>Este contrato se celebra en cumplimiento del artículo 28 del Reglamento (UE) 2016/679 (RGPD) y el artículo 33 de la Ley Orgánica 3/2018 (LOPDGDD), y de las normas equivalentes sobre prestación de servicios de tratamiento por cuenta de terceros: art. 25 de la Ley 25.326 (Argentina), Ley 19.628 y Ley 21.719 (Chile), Ley 1581 de 2012 y Decreto 1074 de 2015 (Colombia), Ley 18.331 (Uruguay), Ley 7593/2025 (Paraguay) y LOPDP (Ecuador), entre otras.</p>
                <p>La Clínica lo acepta electrónicamente al crear su cuenta o al aceptar una nueva versión desde el panel. Forma parte de los <Link href="/terminos">términos y condiciones</Link> y prevalece sobre ellos en materia de protección de datos.</p>
            </>
        ),
    },
    {
        id: "objeto",
        title: "Objeto, duración, naturaleza y finalidad",
        body: (
            <>
                <p><strong>Objeto:</strong> el Encargado trata datos personales por cuenta de la Clínica para prestarle el servicio {C.product}: alojar el widget de simulación en la web de la Clínica, recibir las fotos de los pacientes, generar simulaciones de sonrisa (y vídeos opcionales) con inteligencia artificial, almacenar y mostrar los leads en el panel de la Clínica y enviar los correos asociados.</p>
                <p><strong>Duración:</strong> mientras la cuenta de la Clínica esté activa y hasta la devolución o supresión de los datos según la cláusula de fin del encargo.</p>
                <p><strong>Naturaleza de las operaciones:</strong> recogida a través del widget, registro, almacenamiento, conservación, consulta, transformación de la imagen mediante IA, comunicación a la Clínica, exportación y supresión.</p>
                <p><strong>Finalidad:</strong> exclusivamente la prestación del servicio a la Clínica. El Encargado no trata los datos para fines propios.</p>
            </>
        ),
    },
    {
        id: "datos-interesados",
        title: "Tipos de datos y categorías de interesados",
        body: (
            <LegalTable
                head={["Interesados", "Datos tratados"]}
                rows={[
                    ["Pacientes y visitantes de la web de la Clínica que usan el simulador", "Identificativos y de contacto (nombre, email, WhatsApp o teléfono); imagen facial (selfie); simulaciones y vídeos generados; respuestas a las preguntas configuradas por la Clínica; registro de consentimientos; datos técnicos (IP cifrada mediante hash, navegador)."],
                    ["Categorías especiales", "La imagen bucal y las respuestas sobre tratamientos pueden revelar datos relativos a la salud. No se tratan datos biométricos con fines de identificación."],
                    ["Usuarios del panel de la Clínica", "Nombre, email y rol (estos datos los trata el Encargado como responsable, según la política de privacidad)."],
                ]}
            />
        ),
    },
    {
        id: "instrucciones",
        title: "Instrucciones de la Clínica",
        body: (
            <>
                <p>El Encargado tratará los datos únicamente siguiendo las instrucciones documentadas de la Clínica, que son: este contrato, los términos y condiciones y la configuración que la Clínica realice en el panel (textos y preguntas del widget, plazos de conservación, invitaciones de usuarios, exportaciones y borrados).</p>
                <p>Si el Encargado considera que una instrucción infringe la normativa de protección de datos, lo comunicará de inmediato a la Clínica. Si una ley obliga al Encargado a tratar los datos de otra forma, informará a la Clínica antes del tratamiento, salvo que la ley lo prohíba.</p>
            </>
        ),
    },
    {
        id: "obligaciones-clinica",
        title: "Obligaciones de la Clínica",
        body: (
            <ul>
                <li>Informar a los pacientes del tratamiento y contar con una base legal válida, en particular el consentimiento explícito para el tratamiento de la foto y de posibles datos de salud. El widget incorpora casillas de consentimiento y enlaces a la información legal, que la Clínica puede personalizar.</li>
                <li>Configurar el widget sin pedir datos innecesarios.</li>
                <li>Atender los derechos de los interesados, con la ayuda del Encargado.</li>
                <li>Mantener la confidencialidad de sus credenciales y gestionar los accesos de su equipo.</li>
                <li>Supervisar el tratamiento, incluida la realización de auditorías según este contrato.</li>
            </ul>
        ),
    },
    {
        id: "obligaciones-encargado",
        title: "Obligaciones del Encargado",
        body: (
            <ul>
                <li>Tratar los datos solo para la finalidad del encargo y según las instrucciones de la Clínica.</li>
                <li>No comunicar los datos a terceros, salvo a los subencargados autorizados o cuando la ley lo exija.</li>
                <li>Garantizar la confidencialidad del personal autorizado.</li>
                <li>Aplicar las medidas de seguridad de la cláusula siguiente.</li>
                <li>Respetar las condiciones para recurrir a subencargados.</li>
                <li>Asistir a la Clínica en la atención de derechos, en la notificación de violaciones de seguridad, en las evaluaciones de impacto y en las consultas previas a la autoridad, teniendo en cuenta la naturaleza del tratamiento.</li>
                <li>Llevar un registro de las actividades de tratamiento efectuadas por cuenta de la Clínica, cuando sea exigible.</li>
                <li>Poner a disposición de la Clínica la información necesaria para demostrar el cumplimiento de este contrato.</li>
            </ul>
        ),
    },
    {
        id: "confidencialidad",
        title: "Confidencialidad",
        body: (
            <p>El Encargado garantiza que las personas autorizadas para tratar los datos se han comprometido por escrito a respetar su confidencialidad o están sujetas a una obligación legal de confidencialidad, y que solo acceden a los datos cuando es necesario para prestar el servicio, dar soporte solicitado por la Clínica o resolver incidencias. Este deber se mantiene después de terminar el encargo.</p>
        ),
    },
    {
        id: "seguridad",
        title: "Medidas de seguridad",
        body: (
            <>
                <p>Teniendo en cuenta el estado de la técnica, los costes y los riesgos, el Encargado aplica, entre otras, las siguientes medidas (art. 32 RGPD):</p>
                <h3>Técnicas</h3>
                <ul>
                    <li>Cifrado en tránsito mediante HTTPS/TLS en la web, el widget, el panel, la API y las comunicaciones con los subencargados.</li>
                    <li>Almacenamiento de imágenes en un bucket privado (MinIO, compatible con S3); las imágenes solo se sirven mediante URL firmadas con caducidad.</li>
                    <li>Aislamiento por clínica: cada consulta al panel se filtra por la clínica activa del usuario y se comprueba su pertenencia y rol (titular, administrador, miembro).</li>
                    <li>Contraseñas almacenadas con hash; sesiones con cookies seguras; límites de intentos (rate limiting) en el acceso y en las acciones públicas del widget.</li>
                    <li>Las IP de los pacientes en los registros de consentimiento se guardan solo como hash con secreto del servidor.</li>
                    <li>El análisis de la posición del rostro para encuadrar la foto se realiza en el navegador del paciente.</li>
                    <li>Cifrado en reposo de discos y almacenamiento según las capacidades del proveedor de alojamiento.</li>
                    <li>Copias de seguridad periódicas de la base de datos.</li>
                    <li>Borrado automático: selfies a las 24 horas del procesamiento; simulaciones y leads según los plazos que configure la Clínica.</li>
                </ul>
                <h3>Organizativas</h3>
                <ul>
                    <li>Acceso interno mínimo y nominativo a los sistemas de producción, y registros de auditoría de las acciones relevantes de la plataforma.</li>
                    <li>Las sesiones de soporte en nombre de una clínica (impersonación) no permiten acciones sensibles y su inicio queda registrado en auditoría.</li>
                    <li>Gestión de secretos fuera del código, actualizaciones de seguridad y revisión de dependencias.</li>
                    <li>Procedimiento de gestión de incidentes y violaciones de seguridad.</li>
                    <li>Selección de subencargados con garantías suficientes y contratos de encargo.</li>
                </ul>
            </>
        ),
    },
    {
        id: "subencargados",
        title: "Subencargados",
        body: (
            <>
                <p>La Clínica otorga una <strong>autorización general</strong> para que el Encargado recurra a los siguientes subencargados:</p>
                <LegalTable
                    head={["Subencargado", "Servicio", "Ubicación"]}
                    rows={SUBPROCESSORS.filter((s) => s.personalData).map((s) => [s.name, s.service, s.location])}
                />
                <p>La lista actualizada, con finalidad y garantías, está en <Link href="/subencargados">/subencargados</Link>. El Encargado <strong>avisará a la Clínica con al menos 15 días de antelación</strong> de cualquier incorporación o sustitución, por correo o en el panel. La Clínica puede oponerse de forma motivada dentro de ese plazo; si no se encuentra una solución, puede cerrar su cuenta y obtener el reembolso de los créditos de pago no consumidos.</p>
                <p>El Encargado impone a cada subencargado, por contrato, obligaciones de protección de datos equivalentes a las de este contrato y sigue siendo responsable frente a la Clínica de su cumplimiento.</p>
            </>
        ),
    },
    {
        id: "transferencias",
        title: "Transferencias internacionales",
        body: (
            <p>Algunos subencargados tratan datos fuera del Espacio Económico Europeo o del país de la Clínica (principalmente en EE. UU.). El Encargado solo realiza estas transferencias con garantías adecuadas: decisiones de adecuación (incluido el EU-US Data Privacy Framework para las empresas adheridas), cláusulas contractuales tipo de la Comisión Europea y, para países latinoamericanos, los modelos o mecanismos reconocidos por su autoridad (por ejemplo, las cláusulas modelo de la AAIP en Argentina). La Clínica autoriza estas transferencias en los términos de esta cláusula.</p>
        ),
    },
    {
        id: "derechos",
        title: "Asistencia en el ejercicio de derechos",
        body: (
            <ul>
                <li>El panel permite a la Clínica consultar, rectificar, exportar y suprimir los datos de cada paciente, así como fijar plazos de conservación.</li>
                <li>Si un interesado se dirige al Encargado, este trasladará la solicitud a la Clínica en un plazo máximo de 5 días hábiles y no la contestará directamente salvo instrucción de la Clínica.</li>
                <li>El Encargado ayudará a la Clínica, en lo razonable, a responder en los plazos legales.</li>
            </ul>
        ),
    },
    {
        id: "violaciones",
        title: "Notificación de violaciones de seguridad",
        body: (
            <>
                <p>El Encargado notificará a la Clínica, <strong>sin dilación indebida y en cualquier caso en un plazo máximo de 48 horas</strong> desde que tenga conocimiento, cualquier violación de la seguridad de los datos personales, para que la Clínica pueda notificarla a la autoridad de control <strong>dentro de las 72 horas</strong> exigidas por el art. 33 RGPD (y los plazos equivalentes de otros países), y en su caso a los interesados.</p>
                <p>La notificación incluirá, en la medida en que se disponga de ella: la naturaleza de la violación, las categorías y el número aproximado de interesados y registros afectados, un contacto, las consecuencias probables y las medidas adoptadas o propuestas. La información podrá facilitarse de forma gradual.</p>
            </>
        ),
    },
    {
        id: "fin",
        title: "Fin del encargo: devolución y supresión",
        body: (
            <p>Al terminar el servicio, la Clínica puede exportar sus leads desde el panel. Si pide el cierre de su cuenta, durante el periodo de gracia de 30 días puede cancelarlo o exportar sus datos; transcurrido ese plazo, el Encargado <strong>suprime</strong> los datos personales tratados por cuenta de la Clínica, incluidas las imágenes, y las copias de seguridad se sobrescriben en su ciclo normal de rotación. El Encargado solo conservará, debidamente bloqueados, los datos que una ley le obligue a mantener, durante el plazo legal. A petición de la Clínica, el Encargado certificará la supresión.</p>
        ),
    },
    {
        id: "auditorias",
        title: "Auditorías e información",
        body: (
            <p>El Encargado pondrá a disposición de la Clínica la información necesaria para demostrar el cumplimiento de este contrato (por ejemplo, descripción de medidas, lista de subencargados y sus garantías). La Clínica podrá realizar, o encargar a un auditor sujeto a confidencialidad, una auditoría al año como máximo, con un preaviso mínimo de 30 días, en horario laboral y sin afectar a la seguridad del servicio ni a los datos de otras clínicas. Cada parte asume sus propios costes, salvo que la auditoría revele un incumplimiento relevante del Encargado.</p>
        ),
    },
    {
        id: "responsabilidad",
        title: "Responsabilidad y disposiciones finales",
        body: (
            <>
                <p>Cada parte responde de sus propias infracciones de la normativa de protección de datos. Si el Encargado trata los datos para otros fines o incumple este contrato, será considerado responsable del tratamiento respecto de ese tratamiento. En lo no previsto, se aplican las limitaciones de responsabilidad, la ley aplicable y la jurisdicción de los <Link href="/terminos">términos y condiciones</Link>, salvo que la normativa de protección de datos imponga otra cosa.</p>
                <LegalNote>
                    <p>¿Tu clínica necesita una versión firmada de este contrato? Escríbenos a {mail(C.privacyEmail)} y te la enviamos.</p>
                </LegalNote>
            </>
        ),
    },
];

export default function EncargoPage() {
    return (
        <LegalPage
            title="Contrato de encargo de tratamiento"
            eyebrow="Legal · Clínicas"
            path="/encargo-de-tratamiento"
            version={DPA_VERSION}
            intro={<p>Contrato entre cada clínica (responsable del tratamiento) y {C.tradeName} (encargado del tratamiento) sobre los datos de pacientes que se tratan a través de {C.product}.</p>}
            sections={sections}
        />
    );
}
