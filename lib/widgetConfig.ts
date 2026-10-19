/**
 * Configuración del widget por clínica (se guarda en clinics.widget_config).
 *
 * El código de instalación nunca cambia (/widget?key=…): el widget pide su
 * configuración al cargar, así que cada cambio guardado en el panel se ve al
 * instante en la web de la clínica.
 *
 * Este archivo es compartido por cliente y servidor: no importa nada de DB.
 */

export type WidgetRadius = "soft" | "rounded" | "square";

/** Tipos de campo adicional que la clínica puede pedir en el formulario. */
export type CustomFieldType = "text" | "textarea" | "select" | "radio" | "checkbox" | "number" | "date";

export interface CustomField {
    /** Identificador estable (a-z, 0-9, _ y -). Se usa como clave al guardar la respuesta. */
    id: string;
    label: string;
    type: CustomFieldType;
    required: boolean;
    placeholder?: string;
    /** Texto de ayuda bajo el campo. */
    help?: string;
    /** Opciones para select y radio. */
    options?: string[];
}

export const CUSTOM_FIELD_TYPES: { type: CustomFieldType; label: string }[] = [
    { type: "text", label: "Texto corto" },
    { type: "textarea", label: "Texto largo" },
    { type: "select", label: "Desplegable" },
    { type: "radio", label: "Opción única" },
    { type: "checkbox", label: "Casilla (sí/no)" },
    { type: "number", label: "Número" },
    { type: "date", label: "Fecha" },
];

export const MAX_CUSTOM_FIELDS = 8;

export interface WidgetConfig {
    brand: {
        /** Color principal (#rrggbb). Del resto de tonos se deriva la paleta. */
        accent: string;
        /** Logo propio de la clínica (URL relativa /api/storage/... o https). */
        logoUrl: string | null;
        /** Nombre que se muestra en la cabecera si no hay logo. */
        displayName: string;
        radius: WidgetRadius;
        /** Mostrar el indicador "En línea" en la cabecera. */
        showOnline: boolean;
    };
    texts: {
        headline: string;
        headlineAccent: string;
        subtitle: string;
        photoTitle: string;
        photoSubtitle: string;
        submitButton: string;
        resultTitle: string;
        resultSubtitle: string;
    };
    contact: {
        /** Número de WhatsApp solo con dígitos y código de país (ej. 5491122334455). */
        whatsapp: string;
        /** Mensaje con el que se abre la conversación. {nombre} se reemplaza. */
        whatsappMessage: string;
        privacyUrl: string;
        termsUrl: string;
    };
    features: {
        askPhone: boolean;
        videoCta: boolean;
        photoEmail: boolean;
        selfieQr: boolean;
    };
    /** Preguntas adicionales que se muestran en el formulario de datos (máx. 8). */
    customFields: CustomField[];
}

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
    brand: {
        accent: "#4f6b7f",
        logoUrl: null,
        displayName: "",
        radius: "rounded",
        showOnline: true,
    },
    texts: {
        headline: "Comienza tu",
        headlineAccent: "transformación",
        subtitle: "Te enviaremos tu simulación a estos datos.",
        photoTitle: "Tu sonrisa",
        photoSubtitle: "Foto frontal, buena luz, sonriendo de frente.",
        submitButton: "Ver mi simulación",
        resultTitle: "Tu simulación está lista",
        resultSubtitle: "Desliza sobre la imagen para comparar el antes y el después.",
    },
    contact: {
        whatsapp: "542664654405",
        whatsappMessage: "Hola, soy {nombre}. Hice mi simulación de sonrisa y quiero ver mi vídeo en consulta.",
        privacyUrl: "/privacidad",
        termsUrl: "/terminos",
    },
    features: {
        askPhone: true,
        videoCta: true,
        photoEmail: true,
        selfieQr: true,
    },
    customFields: [],
};

/** Paletas sugeridas en el panel. */
export const ACCENT_PRESETS: { name: string; hex: string }[] = [
    { name: "Acero", hex: "#4f6b7f" },
    { name: "Marino", hex: "#1f3a5f" },
    { name: "Turquesa", hex: "#0f7c86" },
    { name: "Salvia", hex: "#5b7a6a" },
    { name: "Ciruela", hex: "#6b4a7a" },
    { name: "Coral", hex: "#c0624f" },
    { name: "Arena", hex: "#9a7b4f" },
    { name: "Grafito", hex: "#2d3238" },
];

// ── Validación ────────────────────────────────────────────────────────────
const HEX_RE = /^#[0-9a-f]{6}$/i;

const str = (v: unknown, fallback: string, max = 140) =>
    typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, "").trim().slice(0, max) || fallback : fallback;
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);

/** URL segura para enlaces del widget: relativa propia o https. */
function safeUrl(v: unknown, fallback: string): string {
    if (typeof v !== "string") return fallback;
    const s = v.trim();
    if (!s) return fallback;
    if (s.startsWith("/") && !s.startsWith("//")) return s.slice(0, 300);
    try {
        const u = new URL(s);
        return u.protocol === "https:" ? u.toString().slice(0, 300) : fallback;
    } catch {
        return fallback;
    }
}

/** Logo: solo nuestro proxy de storage o https. */
function safeLogo(v: unknown): string | null {
    if (typeof v !== "string" || !v) return null;
    if (v.startsWith("/api/storage/uploads/branding/")) return v.slice(0, 300);
    try {
        const u = new URL(v);
        return u.protocol === "https:" ? u.toString().slice(0, 300) : null;
    } catch {
        return null;
    }
}

const FIELD_ID_RE = /^[a-z0-9_-]{1,40}$/;

function slugId(label: string): string {
    return label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32) || "campo";
}

/** Valida la lista de campos adicionales (ids únicos, opciones para select/radio, máx. 8). */
export function normalizeCustomFields(raw: unknown): CustomField[] {
    if (!Array.isArray(raw)) return [];
    const types = CUSTOM_FIELD_TYPES.map((t) => t.type);
    const seen = new Set<string>();
    const out: CustomField[] = [];
    for (const item of raw) {
        if (out.length >= MAX_CUSTOM_FIELDS) break;
        if (!item || typeof item !== "object") continue;
        const f = item as Record<string, unknown>;
        const label = typeof f.label === "string" ? f.label.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 80) : "";
        if (!label) continue;
        const type = types.includes(f.type as CustomFieldType) ? (f.type as CustomFieldType) : "text";
        let id = typeof f.id === "string" && FIELD_ID_RE.test(f.id) ? f.id : slugId(label);
        let n = 2;
        const base = id;
        while (seen.has(id)) id = `${base}_${n++}`.slice(0, 40);
        seen.add(id);
        const options = Array.isArray(f.options)
            ? f.options.filter((o): o is string => typeof o === "string").map((o) => o.trim().slice(0, 60)).filter(Boolean).slice(0, 12)
            : [];
        if ((type === "select" || type === "radio") && options.length < 2) continue;
        out.push({
            id,
            label,
            type,
            required: f.required === true,
            placeholder: typeof f.placeholder === "string" ? f.placeholder.trim().slice(0, 80) || undefined : undefined,
            help: typeof f.help === "string" ? f.help.trim().slice(0, 140) || undefined : undefined,
            options: type === "select" || type === "radio" ? Array.from(new Set(options)) : undefined,
        });
    }
    return out;
}

/** Respuesta guardada en leads.custom_data: etiqueta + valor (la etiqueta se guarda por si luego cambia el campo). */
export type CustomAnswers = Record<string, { label: string; value: string }>;

/**
 * Valida las respuestas del paciente contra los campos configurados.
 * Devuelve las respuestas limpias o el primer error legible.
 */
export function validateCustomAnswers(fields: CustomField[], raw: unknown): { ok: true; answers: CustomAnswers } | { ok: false; error: string } {
    const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const answers: CustomAnswers = {};
    for (const f of fields) {
        let v = input[f.id];
        let value = "";
        if (f.type === "checkbox") value = v === true || v === "true" ? "Sí" : "";
        else if (typeof v === "number") value = String(v);
        else if (typeof v === "string") value = v.replace(/[\u0000-\u0008\u000b-\u001f]/g, "").trim().slice(0, f.type === "textarea" ? 1000 : 200);
        if ((f.type === "select" || f.type === "radio") && value && !f.options?.includes(value)) value = "";
        if (f.type === "number" && value && !/^-?\d+(?:[.,]\d+)?$/.test(value)) return { ok: false, error: `"${f.label}" debe ser un número.` };
        if (f.type === "date" && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { ok: false, error: `"${f.label}" debe ser una fecha.` };
        if (f.required && !value) return { ok: false, error: `Completa "${f.label}".` };
        if (value) answers[f.id] = { label: f.label, value };
    }
    return { ok: true, answers };
}

/** ¿Están respondidos todos los campos obligatorios? (validación rápida en el widget) */
export function customFieldsComplete(fields: CustomField[], values: Record<string, string | boolean>): boolean {
    return fields.every((f) => {
        if (!f.required) return true;
        const v = values[f.id];
        return f.type === "checkbox" ? v === true : typeof v === "string" && v.trim().length > 0;
    });
}

/** Mezcla datos guardados (o enviados por el panel) con los valores por defecto, validando todo. */
export function normalizeWidgetConfig(raw: unknown): WidgetConfig {
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
    const d = DEFAULT_WIDGET_CONFIG;
    const b = r.brand || {}, t = r.texts || {}, c = r.contact || {}, f = r.features || {};
    const whatsapp = typeof c.whatsapp === "string" ? c.whatsapp.replace(/\D/g, "").slice(0, 15) : d.contact.whatsapp;
    return {
        brand: {
            accent: typeof b.accent === "string" && HEX_RE.test(b.accent) ? b.accent.toLowerCase() : d.brand.accent,
            logoUrl: safeLogo(b.logoUrl),
            displayName: typeof b.displayName === "string" ? b.displayName.trim().slice(0, 60) : "",
            radius: ["soft", "rounded", "square"].includes(b.radius) ? b.radius : d.brand.radius,
            showOnline: bool(b.showOnline, d.brand.showOnline),
        },
        texts: {
            headline: str(t.headline, d.texts.headline, 40),
            headlineAccent: str(t.headlineAccent, d.texts.headlineAccent, 40),
            subtitle: str(t.subtitle, d.texts.subtitle, 120),
            photoTitle: str(t.photoTitle, d.texts.photoTitle, 40),
            photoSubtitle: str(t.photoSubtitle, d.texts.photoSubtitle, 120),
            submitButton: str(t.submitButton, d.texts.submitButton, 32),
            resultTitle: str(t.resultTitle, d.texts.resultTitle, 60),
            resultSubtitle: str(t.resultSubtitle, d.texts.resultSubtitle, 140),
        },
        contact: {
            whatsapp: whatsapp.length >= 8 ? whatsapp : d.contact.whatsapp,
            whatsappMessage: str(c.whatsappMessage, d.contact.whatsappMessage, 300),
            privacyUrl: safeUrl(c.privacyUrl, d.contact.privacyUrl),
            termsUrl: safeUrl(c.termsUrl, d.contact.termsUrl),
        },
        features: {
            askPhone: bool(f.askPhone, d.features.askPhone),
            videoCta: bool(f.videoCta, d.features.videoCta),
            photoEmail: bool(f.photoEmail, d.features.photoEmail),
            selfieQr: bool(f.selfieQr, d.features.selfieQr),
        },
        customFields: normalizeCustomFields(r.customFields),
    };
}

// ── Paleta derivada del color de acento ───────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(hex: string, target: [number, number, number], amount: number): string {
    const [r, g, b] = hexToRgb(hex);
    const m = (a: number, t: number) => Math.round(a + (t - a) * amount);
    return `#${[m(r, target[0]), m(g, target[1]), m(b, target[2])].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}
const WHITE: [number, number, number] = [255, 255, 255];
const INK: [number, number, number] = [12, 16, 20];

/**
 * Variables CSS que el widget usa (las mismas del sistema de marca), derivadas
 * de un único color. Se aplican como style en la raíz .qoves-widget.
 */
export function widgetCssVars(cfg: WidgetConfig): Record<string, string> {
    const a = cfg.brand.accent;
    const radius = cfg.brand.radius === "square" ? "10px" : cfg.brand.radius === "soft" ? "16px" : "999px";
    const cardRadius = cfg.brand.radius === "square" ? "12px" : cfg.brand.radius === "soft" ? "18px" : "24px";
    return {
        "--blue-deep": a,
        "--blue-ink": mix(a, INK, 0.22),
        "--blue-accent": mix(a, WHITE, 0.2),
        "--blue": mix(a, WHITE, 0.32),
        "--blue-light": mix(a, WHITE, 0.55),
        "--blue-line": mix(a, WHITE, 0.78),
        "--blue-soft": mix(a, WHITE, 0.88),
        "--blue-tint": mix(a, WHITE, 0.94),
        "--navy-1": mix(a, INK, 0.5),
        "--navy-2": mix(a, INK, 0.66),
        "--navy-3": mix(a, INK, 0.78),
        "--r-pill": radius,
        "--r-card": cardRadius,
    };
}

/** Enlace de WhatsApp con el mensaje de la clínica. */
export function widgetWhatsappHref(cfg: WidgetConfig, name?: string): string {
    const text = cfg.contact.whatsappMessage.replace(/\{nombre\}/gi, name?.trim() || "un paciente");
    return `https://wa.me/${cfg.contact.whatsapp}?text=${encodeURIComponent(text)}`;
}
