/**
 * Versiones vigentes de los textos legales y textos exactos de los
 * consentimientos que acepta el paciente en el widget.
 *
 * Se importa desde el cliente (widget) y desde el servidor (/api/db): el
 * servidor guarda en `lead_consents` el texto y la versión de AQUÍ, no lo que
 * envíe el navegador, para que el registro sea verificable.
 *
 * Al cambiar un texto o la política, sube la versión correspondiente.
 */

/** Versión de la política de privacidad vigente (fecha de publicación). */
export const PRIVACY_VERSION = '2026-10-23';
/** Versión de los términos y condiciones vigentes (fecha de publicación). */
export const TERMS_VERSION = '2026-10-23';
/** Versión del contrato de encargo de tratamiento (DPA) con las clínicas. */
export const DPA_VERSION = '2026-10-23';
/** Versión de los textos de consentimiento del widget. */
export const PATIENT_CONSENT_VERSION = '2026-10-23';

export type ConsentKind = 'age' | 'terms_privacy' | 'photo_processing' | 'marketing';

/** Textos exactos mostrados junto a cada casilla del widget. */
export const PATIENT_CONSENT_TEXTS: Record<ConsentKind, string> = {
    age: 'Soy mayor de edad.',
    terms_privacy: 'Acepto los términos y la privacidad.',
    photo_processing: 'Autorizo el tratamiento de mi foto para generar una simulación estética orientativa.',
    marketing: 'Quiero recibir novedades y promociones de la clínica.',
};

/** Resumen ("Más info") del tratamiento de la foto. */
export const PHOTO_PROCESSING_INFO =
    'Tu foto no se publica. La procesa la clínica con Smile Fast (encargado del tratamiento) y un proveedor de IA (Google) solo para generar la simulación. Se conserva un tiempo limitado y puedes pedir su borrado cuando quieras.';

/** Consentimientos obligatorios para poder enviar el formulario. */
export const REQUIRED_CONSENTS: ConsentKind[] = ['age', 'terms_privacy', 'photo_processing'];

/** Versión que se registra para cada tipo de consentimiento. */
export function consentVersion(kind: ConsentKind): string {
    if (kind === 'terms_privacy') return `terms:${TERMS_VERSION};privacy:${PRIVACY_VERSION}`;
    if (kind === 'photo_processing') return `consent:${PATIENT_CONSENT_VERSION};privacy:${PRIVACY_VERSION}`;
    return `consent:${PATIENT_CONSENT_VERSION}`;
}
