import type { Metadata } from "next";
import Link from "next/link";
import { LegalNote, LegalPage, LegalTable, type LegalSection } from "@/components/legal/LegalPage";
import { COMPANY as C } from "@/lib/legal/company";
import { PRIVACY_VERSION } from "@/lib/legal/versions";

export const metadata: Metadata = {
    title: "Política de privacidad",
    description: "Cómo trata Smile Fast los datos de los pacientes que usan el simulador y de las clínicas que contratan el servicio.",
};

const mail = (m: string) => <a href={`mailto:${m}`}>{m}</a>;

const sections: LegalSection[] = [
    {
        id: "quienes-somos",
        title: "Quiénes somos y a quién se aplica",
        body: (
            <>
                <p><strong>{C.product}</strong> es un servicio de {C.tradeName} ({C.legalName}, {C.taxIdLabel} {C.taxId}, con domicilio en {C.address}, {C.country}). Permite a las clínicas dentales instalar en su web un simulador que, a partir de una foto, muestra una recreación orientativa de cómo podría verse tu sonrisa tras un tratamiento.</p>
                <p>Esta política se aplica a tres grupos de personas:</p>
                <ul>
                    <li><strong>Pacientes y visitantes</strong> que usan el simulador en la web de una clínica (sube una foto y deja sus datos de contacto).</li>
                    <li><strong>Clínicas y sus usuarios</strong> (titulares, administradores y miembros del equipo) que crean una cuenta en el panel de {C.product}.</li>
                    <li><strong>Visitantes de nuestra web comercial</strong> y personas que nos escriben.</li>
                </ul>
            </>
        ),
    },
    {
        id: "roles",
        title: "Responsable y encargado del tratamiento",
        body: (
            <>
                <LegalNote>
                    <p><strong>Si usaste el simulador en la web de una clínica, el responsable de tus datos es esa clínica.</strong> {C.product} los trata únicamente por encargo y siguiendo sus instrucciones, como <em>encargado del tratamiento</em>.</p>
                </LegalNote>
                <ul>
                    <li><strong>Datos de pacientes y visitantes del simulador:</strong> la clínica es la <em>responsable</em> (decide para qué y cómo se usan). {C.tradeName} actúa como <em>encargado</em> conforme al <Link href="/encargo-de-tratamiento">contrato de encargo de tratamiento</Link> que acepta cada clínica (art. 28 del RGPD y normas equivalentes de cada país).</li>
                    <li><strong>Datos de las clínicas y sus usuarios</strong> (cuenta, facturación, soporte) y <strong>datos de nuestra web comercial:</strong> {C.tradeName} es el <em>responsable</em>.</li>
                </ul>
                <p>La identidad y el contacto de la clínica aparecen en el propio simulador y en su web. Si la clínica tiene su propia política de privacidad, esa política prevalece para lo que la clínica haga con tus datos fuera de {C.product} (por ejemplo, en su historia clínica o su agenda).</p>
                {C.dpo ? <p>Delegado de protección de datos: {C.dpo.name} ({mail(C.dpo.email)}).</p> : null}
                {C.euRepresentative ? <p>Representante en la Unión Europea (art. 27 RGPD): {C.euRepresentative}.</p> : null}
            </>
        ),
    },
    {
        id: "datos",
        title: "Qué datos tratamos",
        body: (
            <>
                <h3>Pacientes y visitantes del simulador</h3>
                <ul>
                    <li><strong>Foto (selfie)</strong> que subes o tomas con la cámara.</li>
                    <li><strong>Simulación generada</strong> a partir de esa foto y, si la clínica lo solicita, un <strong>vídeo</strong> generado en la clínica.</li>
                    <li><strong>Datos de contacto:</strong> nombre, correo electrónico y número de WhatsApp o teléfono.</li>
                    <li><strong>Respuestas opcionales</strong> a las preguntas que configure la clínica (por ejemplo, qué tratamiento te interesa o cuándo te gustaría empezar).</li>
                    <li><strong>Registro de consentimientos:</strong> qué casillas aceptaste, la versión del texto, la fecha y datos técnicos mínimos (como un identificador cifrado de la conexión).</li>
                    <li><strong>Datos técnicos</strong> necesarios para el funcionamiento y la seguridad: dirección IP, tipo de navegador y registros del servidor.</li>
                </ul>
                <h3>Clínicas y usuarios del panel</h3>
                <ul>
                    <li>Nombre, correo electrónico y contraseña (guardada cifrada mediante hash, nunca en claro) de cada usuario y su rol en la clínica.</li>
                    <li>Nombre de la clínica, país de facturación, configuración del widget y logotipo.</li>
                    <li>Compras de créditos, importes, moneda y recibos. Los datos de la tarjeta los introduces directamente en Stripe: no los vemos ni los guardamos.</li>
                    <li>Registros de actividad del panel (inicios de sesión, cambios relevantes) y aceptación de los textos legales (documento, versión, fecha, navegador y un identificador cifrado de la IP).</li>
                </ul>
                <h3>Visitantes de la web comercial y contactos</h3>
                <ul>
                    <li>Datos técnicos de la conexión. No usamos cookies de analítica ni de publicidad (consulta la <Link href="/cookies">política de cookies</Link>).</li>
                    <li>Lo que nos cuentes si nos escribes por correo o WhatsApp.</li>
                </ul>
            </>
        ),
    },
    {
        id: "datos-sensibles",
        title: "Imagen facial y posibles datos de salud",
        body: (
            <>
                <p>Tu foto muestra tu rostro y tu sonrisa. Tratamos esta imagen con un cuidado especial:</p>
                <ul>
                    <li><strong>No usamos tu foto para identificarte.</strong> No creamos plantillas biométricas ni comparamos rostros. El análisis de la posición de la cara y la boca para encuadrar la foto se hace <strong>en tu propio navegador</strong>; esos puntos no se envían a nuestros servidores.</li>
                    <li>La imagen de tu boca, y las respuestas que des sobre tratamientos, <strong>pueden revelar información sobre tu salud bucodental</strong>. Por eso solo las tratamos con tu <strong>consentimiento explícito</strong>, que das al marcar la casilla de tratamiento de la foto antes de generar la simulación.</li>
                    <li>Tu foto no se publica, no se usa con fines publicitarios y <strong>no se usa para entrenar modelos de inteligencia artificial</strong>, ni por nosotros ni por nuestro proveedor de IA según sus condiciones de uso de la API de pago.</li>
                </ul>
            </>
        ),
    },
    {
        id: "finalidades",
        title: "Para qué usamos los datos y con qué base legal",
        body: (
            <>
                <LegalTable
                    head={["Finalidad", "Datos", "Base legal"]}
                    rows={[
                        ["Generar tu simulación de sonrisa (y el vídeo opcional)", "Foto, simulación", "Tu consentimiento explícito (art. 6.1.a y 9.2.a RGPD y equivalentes)"],
                        ["Enviarte la simulación y que la clínica te contacte sobre el tratamiento que te interesa", "Nombre, email, WhatsApp, respuestas, simulación", "Tu consentimiento y la aplicación, a tu petición, de medidas precontractuales (art. 6.1.a y 6.1.b)"],
                        ["Enviarte novedades y promociones de la clínica (solo si lo marcas)", "Nombre, email, WhatsApp", "Tu consentimiento (art. 6.1.a), revocable en cualquier momento"],
                        ["Poder demostrar qué aceptaste y cuándo", "Registro de consentimientos", "Obligación legal de acreditar el consentimiento (art. 6.1.c y 7.1) e interés legítimo"],
                        ["Prestar el servicio a la clínica: cuenta, panel, widget y soporte", "Datos de la clínica y sus usuarios", "Ejecución del contrato (art. 6.1.b)"],
                        ["Cobrar los créditos y cumplir obligaciones fiscales y contables", "Datos de facturación y compras", "Ejecución del contrato y obligación legal (art. 6.1.b y 6.1.c)"],
                        ["Seguridad, prevención del fraude y abuso, y mejora técnica del servicio", "Datos técnicos y registros", "Interés legítimo en mantener un servicio seguro (art. 6.1.f)"],
                        ["Comunicaciones operativas a las clínicas (cambios del servicio, avisos de créditos)", "Email de los usuarios del panel", "Ejecución del contrato e interés legítimo"],
                    ]}
                />
                <p>Fuera de la Unión Europea, estas bases se corresponden con el consentimiento informado y las demás causas de licitud que prevén las leyes de cada país (por ejemplo, art. 5 de la Ley 25.326 en Argentina, art. 9 de la Ley 1581 de 2012 en Colombia o art. 7 de la LOPDP en Ecuador).</p>
                <p><strong>No vendemos datos personales</strong>, no los cedemos a terceros para sus propios fines publicitarios y no elaboramos perfiles comerciales.</p>
            </>
        ),
    },
    {
        id: "conservacion",
        title: "Cuánto tiempo conservamos los datos",
        body: (
            <>
                <LegalTable
                    head={["Datos", "Plazo"]}
                    rows={[
                        ["Foto original (selfie)", "Se borra automáticamente 24 horas después de generar la simulación."],
                        ["Simulaciones y vídeos generados", "90 días por defecto. Cada clínica puede fijar un plazo entre 30 y 365 días."],
                        ["Datos del lead (nombre, contacto, respuestas)", "24 meses por defecto desde la última actividad. Cada clínica puede fijar un plazo entre 180 días y 5 años."],
                        ["Registro de consentimientos", "Mientras exista el lead; se borra junto con él."],
                        ["Cuenta de la clínica y sus usuarios", "Mientras la cuenta esté activa. Si la clínica pide eliminarla, hay un periodo de gracia de 30 días para cancelarlo y después se borran la cuenta, los leads y las imágenes."],
                        ["Facturación y compras", "El tiempo que exija la normativa fiscal y mercantil aplicable (habitualmente entre 5 y 10 años)."],
                        ["Registros técnicos y de seguridad", "Un periodo limitado, el necesario para detectar y resolver incidentes."],
                    ]}
                />
                <p>Antes de esos plazos puedes pedir el borrado de tus datos a la clínica, que puede eliminarlos o exportarlos desde su panel. Las copias de seguridad se sobrescriben de forma periódica; los datos borrados desaparecen de ellas en su siguiente ciclo de rotación.</p>
            </>
        ),
    },
    {
        id: "destinatarios",
        title: "Con quién compartimos los datos",
        body: (
            <>
                <ul>
                    <li><strong>La clínica</strong> a la que pertenece el simulador: recibe tu lead y tu simulación en su panel. Solo las personas de esa clínica con acceso al panel pueden verlos; cada clínica solo ve sus propios datos.</li>
                    <li><strong>Proveedores técnicos (subencargados)</strong> necesarios para prestar el servicio: alojamiento y almacenamiento (servidor virtual), inteligencia artificial (Google Gemini API), correo transaccional (Resend u otro proveedor SMTP) y pagos de las clínicas (Stripe). Todos actúan bajo contrato y solo con los datos imprescindibles. Consulta la <Link href="/subencargados">lista completa de subencargados</Link>.</li>
                    <li><strong>Autoridades</strong> públicas, juzgados o fuerzas de seguridad cuando una ley nos obligue.</li>
                </ul>
                <p>Al proveedor de IA <strong>solo se envía la foto</strong> necesaria para generar la simulación, nunca tu nombre, correo o teléfono.</p>
            </>
        ),
    },
    {
        id: "transferencias",
        title: "Transferencias internacionales",
        body: (
            <>
                <p>Algunos proveedores tratan datos fuera de tu país o fuera del Espacio Económico Europeo, principalmente en Estados Unidos (Google, Stripe y el proveedor de correo). En esos casos aplicamos garantías adecuadas:</p>
                <ul>
                    <li>Decisiones de adecuación, como el Marco de Privacidad de Datos UE-EE. UU. (EU-US Data Privacy Framework) para las empresas adheridas.</li>
                    <li>Cláusulas contractuales tipo aprobadas por la Comisión Europea, incluidas en los acuerdos de tratamiento de datos de cada proveedor, y las cláusulas o mecanismos equivalentes exigidos por las autoridades latinoamericanas (por ejemplo, los modelos de la AAIP en Argentina).</li>
                    <li>Medidas técnicas adicionales: cifrado en tránsito, minimización de los datos enviados y borrado temprano de la foto original.</li>
                </ul>
                <p>Puedes pedirnos una copia de las garantías aplicables escribiendo a {mail(C.privacyEmail)}.</p>
            </>
        ),
    },
    {
        id: "ia",
        title: "Simulación con inteligencia artificial y decisiones automatizadas",
        body: (
            <>
                <p>La simulación se genera con un modelo de inteligencia artificial. Es una <strong>recreación estética orientativa</strong>: no es un diagnóstico, no es una propuesta de tratamiento y no garantiza ningún resultado. El tratamiento adecuado y su resultado real solo puede valorarlos un profesional en consulta.</p>
                <p><strong>No tomamos decisiones automatizadas que produzcan efectos jurídicos sobre ti</strong> o que te afecten de forma similarmente significativa (art. 22 RGPD). La simulación no decide si eres candidato a un tratamiento, ni su precio, ni si la clínica te atenderá: cualquier decisión la toma una persona de la clínica.</p>
                <p>Las simulaciones se presentan siempre como imágenes generadas por inteligencia artificial.</p>
            </>
        ),
    },
    {
        id: "menores",
        title: "Menores de edad",
        body: (
            <p>El simulador está dirigido exclusivamente a <strong>mayores de 18 años</strong>, que deben confirmarlo antes de enviar su foto. No tratamos a sabiendas datos de menores. Si eres madre, padre o tutor y crees que un menor ha usado el simulador, escribe a la clínica o a {mail(C.privacyEmail)} y borraremos sus datos.</p>
        ),
    },
    {
        id: "seguridad",
        title: "Cómo protegemos los datos",
        body: (
            <ul>
                <li>Conexiones cifradas (HTTPS/TLS) en la web, el widget, el panel y las comunicaciones con los proveedores.</li>
                <li>Almacenamiento privado de imágenes: las fotos y simulaciones no son públicas y solo se sirven mediante <strong>enlaces firmados que caducan</strong>.</li>
                <li>Separación por clínica: cada clínica solo accede a sus propios leads e imágenes, con control de acceso por usuario y rol (titular, administrador o miembro).</li>
                <li>Contraseñas guardadas con hash, sesiones seguras y límites de intentos frente a abusos.</li>
                <li>Copias de seguridad periódicas, registros de auditoría de las acciones relevantes y acceso interno limitado al personal que lo necesita, sujeto a confidencialidad.</li>
                <li>Cifrado en reposo de los discos y del almacenamiento según las capacidades del proveedor de alojamiento.</li>
                <li>Borrado automático según los plazos de conservación.</li>
            </ul>
        ),
    },
    {
        id: "derechos",
        title: "Tus derechos y cómo ejercerlos",
        body: (
            <>
                <p>Según la ley de tu país, puedes ejercer los derechos de <strong>acceso, rectificación, supresión (cancelación), oposición, limitación del tratamiento y portabilidad</strong> (derechos ARCO / ARSULIPO), así como <strong>retirar tu consentimiento</strong> en cualquier momento sin que ello afecte a la licitud del tratamiento anterior, y no ser objeto de decisiones basadas únicamente en tratamientos automatizados.</p>
                <h3>Cómo ejercerlos</h3>
                <ul>
                    <li><strong>Si eres paciente o visitante del simulador:</strong> dirígete a la <strong>clínica</strong>, que es la responsable. La clínica puede ver, corregir, exportar y borrar tus datos desde su panel. Si nos escribes a nosotros, trasladaremos tu solicitud a la clínica sin demora y la ayudaremos a responderte.</li>
                    <li><strong>Si eres una clínica o usuario del panel</strong>, o tu consulta es sobre nuestra web: escribe a {mail(C.privacyEmail)}.</li>
                </ul>
                <p>Indica tu nombre, el derecho que quieres ejercer y, si es posible, el correo con el que dejaste tus datos y la clínica. Podemos pedirte información adicional para verificar tu identidad. Responderemos dentro de los plazos legales (por ejemplo, un mes en el RGPD, ampliable en casos complejos; 10 días corridos para el acceso en Argentina; 10 días hábiles para consultas y 15 para reclamos en Colombia). El ejercicio de los derechos es gratuito.</p>
                <p className="sf-lg-meta" style={{ marginTop: 12 }}>Argentina: el titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley N.º 25.326. La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley N.º 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.</p>
            </>
        ),
    },
    {
        id: "autoridades",
        title: "Autoridades de protección de datos",
        body: (
            <>
                <p>Si consideras que tus datos no se tratan correctamente, puedes presentar una reclamación ante la autoridad de control de tu país. Te recomendamos escribirnos antes para intentar resolverlo.</p>
                <LegalTable
                    head={["País", "Autoridad", "Web"]}
                    rows={[
                        ["España", "Agencia Española de Protección de Datos (AEPD)", <a key="es" href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">aepd.es</a>],
                        ["Argentina", "Agencia de Acceso a la Información Pública (AAIP)", <a key="ar" href="https://www.argentina.gob.ar/aaip" target="_blank" rel="noopener noreferrer">argentina.gob.ar/aaip</a>],
                        ["Chile", "Agencia de Protección de Datos Personales (Ley 21.719); hasta su puesta en marcha, el Consejo para la Transparencia", <a key="cl" href="https://www.consejotransparencia.cl" target="_blank" rel="noopener noreferrer">consejotransparencia.cl</a>],
                        ["Colombia", "Superintendencia de Industria y Comercio (SIC)", <a key="co" href="https://www.sic.gov.co" target="_blank" rel="noopener noreferrer">sic.gov.co</a>],
                        ["Uruguay", "Unidad Reguladora y de Control de Datos Personales (URCDP)", <a key="uy" href="https://www.gub.uy/unidad-reguladora-control-datos-personales" target="_blank" rel="noopener noreferrer">gub.uy/urcdp</a>],
                        ["Paraguay", "Autoridad de control designada por la Ley 7593/2025 de protección de datos personales", "—"],
                        ["Ecuador", "Superintendencia de Protección de Datos Personales", <a key="ec" href="https://spdp.gob.ec" target="_blank" rel="noopener noreferrer">spdp.gob.ec</a>],
                        ["Perú", "Autoridad Nacional de Protección de Datos Personales (Ministerio de Justicia y Derechos Humanos)", <a key="pe" href="https://www.gob.pe/anpd" target="_blank" rel="noopener noreferrer">gob.pe/anpd</a>],
                        ["Otros países", "La autoridad de protección de datos de tu país de residencia", "—"],
                    ]}
                />
            </>
        ),
    },
    {
        id: "cookies",
        title: "Cookies",
        body: (
            <p>Solo usamos cookies y almacenamiento técnico estrictamente necesarios (por ejemplo, para mantener tu sesión en el panel). No usamos cookies de analítica, de publicidad ni de redes sociales. Más detalles en la <Link href="/cookies">política de cookies</Link>.</p>
        ),
    },
    {
        id: "cambios",
        title: "Cambios en esta política",
        body: (
            <p>Podemos actualizar esta política cuando cambie el servicio o la normativa. Publicaremos la nueva versión en esta página con su fecha. Si el cambio es relevante, lo avisaremos a las clínicas en su panel o por correo con antelación razonable, y cuando haga falta volveremos a pedir el consentimiento.</p>
        ),
    },
    {
        id: "contacto",
        title: "Contacto",
        body: (
            <ul>
                <li>Privacidad y ejercicio de derechos: {mail(C.privacyEmail)}</li>
                <li>Contacto general: {mail(C.contactEmail)} · WhatsApp <a href={C.whatsappHref} target="_blank" rel="noopener noreferrer">{C.whatsapp}</a></li>
                <li>Dirección postal: {C.legalName}, {C.address}, {C.country}</li>
            </ul>
        ),
    },
];

export default function PrivacidadPage() {
    return (
        <LegalPage
            title="Política de privacidad"
            path="/privacidad"
            version={PRIVACY_VERSION}
            intro={<p>Explicamos qué datos se tratan cuando usas el simulador de sonrisa de {C.product} en la web de una clínica, o cuando tu clínica usa nuestro panel, para qué se usan, cuánto tiempo se guardan y cómo puedes ejercer tus derechos.</p>}
            sections={sections}
        />
    );
}
