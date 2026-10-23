import { COMPANY } from '@/lib/legal/company';

/** Subencargados y proveedores técnicos de Smile Fast (fuente única para /subencargados y el DPA). */
export interface Subprocessor {
    name: string;
    service: string;
    purpose: string;
    data: string;
    location: string;
    safeguards: string;
    /** false = proveedor que no trata datos personales de pacientes ni de clínicas. */
    personalData: boolean;
}

export const SUBPROCESSORS: Subprocessor[] = [
    {
        name: 'Google LLC / Google Ireland Ltd.',
        service: 'Gemini API (Google AI)',
        purpose: 'Generar la simulación de sonrisa (y el vídeo opcional) a partir de la foto enviada.',
        data: 'Foto facial del paciente e instrucciones de generación. No se envían nombre, correo ni teléfono.',
        location: 'EE. UU. y centros de datos globales de Google',
        safeguards: 'Cláusulas contractuales tipo (CCT) de la Comisión Europea incluidas en los términos de tratamiento de datos de Google; EU-US Data Privacy Framework; uso de la API de pago, cuyos datos no se usan para entrenar modelos según los términos del proveedor.',
        personalData: true,
    },
    {
        name: 'Stripe Payments Europe Ltd. / Stripe, Inc.',
        service: 'Stripe',
        purpose: 'Cobro de los paquetes de créditos que compran las clínicas y emisión de recibos.',
        data: 'Datos de facturación de la clínica (nombre, email, país) y datos de pago, que introduce directamente en Stripe. Smile Fast no ve ni guarda los datos de la tarjeta.',
        location: 'UE (Irlanda) y EE. UU.',
        safeguards: 'CCT; EU-US Data Privacy Framework; certificación PCI DSS nivel 1.',
        personalData: true,
    },
    {
        name: COMPANY.hostingProvider,
        service: 'Servidor virtual (VPS) con Easypanel: aplicación, base de datos PostgreSQL y almacenamiento de objetos MinIO',
        purpose: 'Alojar la aplicación, la base de datos de leads y cuentas, y las imágenes (selfies y simulaciones).',
        data: 'Todos los datos del servicio: cuentas de clínicas, leads (nombre, email, WhatsApp, respuestas), fotos y simulaciones.',
        location: COMPANY.hostingLocation,
        safeguards: '[GARANTÍAS DEL PROVEEDOR VPS: acuerdo de encargo / CCT si está fuera del EEE]',
        personalData: true,
    },
    {
        name: 'Resend (Plus Five Five, Inc.) u otro proveedor SMTP',
        service: 'Correo transaccional',
        purpose: 'Enviar al paciente su simulación y a la clínica los avisos de nuevos leads, invitaciones y recuperación de contraseña.',
        data: 'Dirección de correo del destinatario, nombre y contenido del mensaje (puede incluir un enlace a la simulación).',
        location: 'EE. UU.',
        safeguards: 'CCT incluidas en el acuerdo de tratamiento de datos del proveedor.',
        personalData: true,
    },
    {
        name: 'Cloudinary Ltd.',
        service: 'Cloudinary',
        purpose: 'Servir los vídeos de demostración de la web comercial (landing).',
        data: 'Ninguno de pacientes ni de clínicas. Solo recibe los datos técnicos de la conexión (IP, navegador) al reproducir un vídeo de la landing.',
        location: 'EE. UU. / CDN global',
        safeguards: 'No trata datos del servicio. Sin cookies de seguimiento.',
        personalData: false,
    },
    {
        name: 'Vercel Inc.',
        service: 'DNS del dominio',
        purpose: 'Resolución de nombres de dominio (DNS).',
        data: 'Ninguno de pacientes ni de clínicas.',
        location: 'Global',
        safeguards: 'No trata datos del servicio.',
        personalData: false,
    },
];
