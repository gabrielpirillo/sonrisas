/**
 * Límites de conservación de datos (compartidos entre servidor y cliente).
 * Deben coincidir con los CHECK de migrations/017_data_retention.sql.
 */
export const RETENTION_LIMITS = {
    photos: { min: 30, max: 365, default: 90 },
    leads: { min: 180, max: 1825, default: 730 },
} as const;

/** Las selfies originales se borran a las 24 h (no es configurable). */
export const UPLOAD_TTL_HOURS = 24;

/** Días entre la solicitud de baja de la clínica y el borrado definitivo. */
export const CLINIC_DELETION_GRACE_DAYS = 30;

export function isValidRetention(kind: 'photos' | 'leads', days: unknown): days is number {
    const l = RETENTION_LIMITS[kind];
    return typeof days === 'number' && Number.isInteger(days) && days >= l.min && days <= l.max;
}

/** Fecha en la que se ejecutará el borrado definitivo de la clínica. */
export function clinicDeletionDate(requestedAt: string | Date): Date {
    return new Date(new Date(requestedAt).getTime() + CLINIC_DELETION_GRACE_DAYS * 86_400_000);
}
