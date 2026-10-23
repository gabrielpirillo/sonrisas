/**
 * Datos de identificación de la empresa titular de Smile Fast.
 *
 * TODOS los textos legales (privacidad, términos, encargo de tratamiento,
 * subencargados, cookies y aviso legal) leen sus datos de AQUÍ.
 *
 * Los valores entre corchetes, p. ej. "[RAZÓN SOCIAL]", son marcadores que el
 * titular debe completar antes de publicar. La lista completa está en
 * docs/LEGAL_PENDIENTES.md.
 */

export const COMPANY = {
    /** Nombre del producto. */
    product: 'Smile Fast',
    /** Nombre comercial de la empresa. */
    tradeName: 'Brandboost',
    /** Razón social o nombre completo del titular (persona física o jurídica). */
    legalName: '[RAZÓN SOCIAL]',
    /** Identificación fiscal: CUIT (Argentina), NIF/CIF (España), RUT, etc. */
    taxIdLabel: '[CUIT / NIF]',
    taxId: '[NÚMERO DE IDENTIFICACIÓN FISCAL]',
    /** Domicilio social / fiscal completo. */
    address: '[DOMICILIO: calle, número, ciudad, código postal]',
    /** País de constitución / residencia fiscal. */
    country: '[PAÍS]',
    /** Datos registrales (Registro Mercantil, IGJ, etc.), si aplica. */
    registry: '[DATOS REGISTRALES, si aplica]',
    /** Correo para ejercer derechos de protección de datos y consultas de privacidad. */
    privacyEmail: '[EMAIL DE PRIVACIDAD]',
    /** Correo de contacto general / comercial. */
    contactEmail: '[EMAIL DE CONTACTO]',
    /** WhatsApp comercial (el mismo que se usa en la app y la landing). */
    whatsapp: '+54 266 465-4405',
    whatsappHref: 'https://wa.me/542664654405',
    /** Delegado de protección de datos (DPO). null si no se ha designado. */
    dpo: null as null | { name: string; email: string },
    /** Representante en la UE (art. 27 RGPD) si el titular no está establecido en la UE. null si no aplica / no designado. */
    euRepresentative: '[REPRESENTANTE EN LA UE (art. 27 RGPD), si aplica]' as string | null,
    /** Sitio web principal. */
    website: '[URL DEL SITIO, p. ej. https://smilefast.app]',
    /** Ley aplicable a los Términos (relación B2B con clínicas). */
    governingLaw: '[LEY APLICABLE, p. ej. leyes de la República Argentina]',
    /** Tribunales competentes para controversias con clínicas. */
    jurisdiction: '[JURISDICCIÓN, p. ej. tribunales ordinarios de la ciudad de …]',
    /** Proveedor del servidor virtual (VPS) donde se alojan la app, la base de datos y el almacenamiento. */
    hostingProvider: '[PROVEEDOR VPS]',
    hostingLocation: '[PAÍS / REGIÓN DEL VPS]',
    /** Fecha de la última actualización de los textos legales (texto visible). */
    updated: '23 de octubre de 2026',
} as const;

/** Documentos legales públicos (orden de los enlaces del pie). */
export const LEGAL_DOCS = [
    { href: '/privacidad', label: 'Privacidad' },
    { href: '/terminos', label: 'Términos' },
    { href: '/encargo-de-tratamiento', label: 'Encargo de tratamiento' },
    { href: '/subencargados', label: 'Subencargados' },
    { href: '/cookies', label: 'Cookies' },
    { href: '/aviso-legal', label: 'Aviso legal' },
] as const;
