// Shared types and constants for the Widget
export type Step =
    | "UPLOAD"
    | "PHOTO"
    | "SELFIE_CAPTURE"
    | "PROCESSING"
    | "LOCKED_RESULT"
    | "LEAD_FORM"
    | "RESULT"
    | "SURVEY"
    | "VERIFICATION"
    | "EMAIL_SENT"
    | "CLINICAL_REQUEST_SUCCESS"
    | "PHOTO_SUCCESS";

export type ProcessStatus =
    | "idle"
    | "validating"
    | "scanning"
    | "analyzing"
    | "designing"
    | "aligning"
    | "complete";

export interface FormValues {
    name: string;
    email: string;
    phoneNumber: string;
    ageAccepted: boolean;
    termsAccepted: boolean;
    /** Consentimiento explícito para tratar la foto (obligatorio). */
    photoAccepted: boolean;
    /** Comunicaciones comerciales de la clínica (opcional, desmarcado). */
    marketingAccepted: boolean;
    /** Respuestas a los campos adicionales de la clínica (por id de campo). */
    custom: Record<string, string | boolean>;
}

export interface WidgetContainerProps {
    initialStep?: Step;
    initialBeforeImage?: string;
    initialAfterImage?: string;
}
