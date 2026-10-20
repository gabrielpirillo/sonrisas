/**
 * Mensajes de error de autenticación en español. Better Auth devuelve
 * códigos y textos en inglés ("Invalid email or password"…); aquí se
 * traducen para que el usuario nunca vea mensajes en otro idioma.
 */
const BY_CODE: Record<string, string> = {
    INVALID_EMAIL_OR_PASSWORD: "El email o la contraseña no son correctos.",
    INVALID_PASSWORD: "La contraseña no es correcta.",
    INVALID_EMAIL: "Revisa el email: no parece válido.",
    USER_EMAIL_NOT_FOUND: "No encontramos una cuenta con ese email.",
    EMAIL_NOT_VERIFIED: "Confirma tu email antes de entrar.",
    PASSWORD_TOO_SHORT: "La contraseña debe tener al menos 8 caracteres.",
    PASSWORD_TOO_LONG: "La contraseña es demasiado larga.",
    USER_ALREADY_EXISTS: "Ya existe una cuenta con ese email. Entra con él o recupera tu contraseña.",
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Ya existe una cuenta con ese email. Usa otro o entra con él.",
    INVALID_TOKEN: "El enlace es inválido o ya caducó. Solicita uno nuevo.",
    TOKEN_EXPIRED: "El enlace caducó. Solicita uno nuevo.",
    ORGANIZATION_ALREADY_EXISTS: "Ya existe una clínica con ese nombre. Prueba con otro.",
    SLUG_IS_TAKEN: "Ya existe una clínica con ese nombre. Prueba con otro.",
};

type AuthErrorLike = { code?: string; message?: string; status?: number } | null | undefined;

export function authErrorMessage(error: AuthErrorLike, fallback: string): string {
    if (!error) return fallback;
    if (error.status === 429) return "Demasiados intentos. Espera un minuto y vuelve a probar.";
    if (error.code && BY_CODE[error.code]) return BY_CODE[error.code];
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("invalid email or password")) return BY_CODE.INVALID_EMAIL_OR_PASSWORD;
    if (msg.includes("already exists")) return BY_CODE.USER_ALREADY_EXISTS;
    if (msg.includes("too short")) return BY_CODE.PASSWORD_TOO_SHORT;
    if (msg.includes("token")) return BY_CODE.INVALID_TOKEN;
    if (msg.includes("failed to fetch") || msg.includes("network")) return "Sin conexión. Revisa tu internet y vuelve a intentarlo.";
    return fallback;
}
