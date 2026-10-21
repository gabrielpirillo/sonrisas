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
        /** Alto del logo en la cabecera (px, escritorio). En móvil se reduce en proporción. */
        logoSize: number;
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
        logoSize: 36,
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

/** Límites del alto del logo (px). */
export const LOGO_SIZE_MIN = 24;
export const LOGO_SIZE_MAX = 72;

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
            logoSize: typeof b.logoSize === "number" && Number.isFinite(b.logoSize)
                ? Math.round(Math.min(LOGO_SIZE_MAX, Math.max(LOGO_SIZE_MIN, b.logoSize)))
                : d.brand.logoSize,
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
type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex([r, g, b]: RGB): string {
    return `#${[r, g, b].map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, "0")).join("")}`;
}
/** Mezcla lineal en sRGB (la que usa el widget desde el principio para tintes). */
function mix(hex: string, target: RGB, amount: number): string {
    const [r, g, b] = hexToRgb(hex);
    const m = (a: number, t: number) => Math.round(a + (t - a) * amount);
    return rgbToHex([m(r, target[0]), m(g, target[1]), m(b, target[2])]);
}
const WHITE: RGB = [255, 255, 255];
const INK: RGB = [12, 16, 20];

// OKLCH (perceptual): permite tonos claros/oscuros que conservan el matiz.
const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLin = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToOklch(hex: string): { l: number; c: number; h: number } {
    const [r, g, b] = hexToRgb(hex).map((x) => toLin(x / 255));
    const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
    const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
    const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
    return { l: L, c: Math.hypot(A, B), h: Math.atan2(B, A) };
}
function oklchToLinear(l: number, c: number, h: number): RGB {
    const A = c * Math.cos(h), B = c * Math.sin(h);
    const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
    const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
    const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
    return [
        4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
        -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
        -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
    ];
}
/** Color OKLCH → hex, reduciendo croma hasta que quepa en sRGB. */
function oklchHex(l: number, c: number, h: number): string {
    const inGamut = (rgb: RGB) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);
    let lo = 0, hi = c, rgb = oklchToLinear(l, c, h);
    if (!inGamut(rgb)) {
        for (let i = 0; i < 18; i++) {
            const mid = (lo + hi) / 2;
            if (inGamut(oklchToLinear(l, mid, h))) lo = mid; else hi = mid;
        }
        rgb = oklchToLinear(l, lo, h);
    }
    return rgbToHex(rgb.map((v) => fromLin(Math.min(1, Math.max(0, v))) * 255) as RGB);
}
function luminance(hex: string): number {
    const [r, g, b] = hexToRgb(hex).map((x) => toLin(x / 255));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
    const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
}

/** Escalones de la escala tonal: claridad OKLCH objetivo y peso del croma del acento. */
const SCALE: [step: number, l: number, chroma: number][] = [
    [50, 0.975, 0.16], [100, 0.95, 0.28], [200, 0.9, 0.45], [300, 0.82, 0.65], [400, 0.72, 0.85],
    [500, 0.62, 1], [600, 0.52, 0.95], [700, 0.42, 0.8], [800, 0.32, 0.6], [900, 0.24, 0.45], [950, 0.18, 0.35],
];

/**
 * Escala tonal 50…950 con el matiz del acento (OKLCH). Los tonos extremos
 * pierden croma para que claros y oscuros se vean limpios, no chillones.
 */
export function accentScale(accent: string): Record<number, string> {
    const { c, h } = hexToOklch(HEX_RE.test(accent) ? accent : DEFAULT_WIDGET_CONFIG.brand.accent);
    const out: Record<number, string> = {};
    for (const [step, l, k] of SCALE) out[step] = oklchHex(l, Math.min(c * k, 0.16), h);
    return out;
}

/**
 * Variables CSS que el widget usa (las mismas del sistema de marca), derivadas
 * de un único color. Se aplican como style en la raíz .qoves-widget.
 *
 * Con el acento por defecto solo se emiten los tokens de siempre: el resto
 * (panel de foto, escenario oscuro, cian de escaneo, botón desactivado…) toma
 * los valores originales definidos en widget-qoves.css, así el widget por
 * defecto se ve exactamente igual que antes. Con cualquier otro acento esos
 * tokens se calculan aquí para que todo el widget siga al color elegido.
 */
export function widgetCssVars(cfg: WidgetConfig): Record<string, string> {
    const a = HEX_RE.test(cfg.brand.accent) ? cfg.brand.accent.toLowerCase() : DEFAULT_WIDGET_CONFIG.brand.accent;
    const radius = cfg.brand.radius === "square" ? "10px" : cfg.brand.radius === "soft" ? "16px" : "999px";
    const cardRadius = cfg.brand.radius === "square" ? "12px" : cfg.brand.radius === "soft" ? "18px" : "24px";
    const vars: Record<string, string> = {
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
        "--w-logo-h": `${cfg.brand.logoSize}px`,
    };
    if (a === DEFAULT_WIDGET_CONFIG.brand.accent) return vars;

    const { l, c, h } = hexToOklch(a);
    const scale = accentScale(a);
    for (const [step] of SCALE) vars[`--w-a-${step}`] = scale[step];

    // Escenarios oscuros: versión profunda y apagada del acento (nunca más
    // clara que el propio acento, para que los acentos oscuros sigan siéndolo).
    const deep = (target: number, ratio: number, k: number, cap: number) => oklchHex(Math.min(target, l * ratio), Math.min(c * k, cap), h);
    const navy1 = deep(0.34, 0.74, 0.42, 0.042);
    const navy2 = deep(0.26, 0.57, 0.34, 0.032);
    const navy3 = deep(0.2, 0.45, 0.28, 0.025);
    vars["--navy-1"] = navy1;
    vars["--navy-2"] = navy2;
    vars["--navy-3"] = navy3;
    vars["--w-shade"] = navy2;
    vars["--w-shade-deep"] = navy3;

    // Panel de foto: claro → acento → oscuro, todo del mismo matiz.
    vars["--w-photo-mid"] = mix(a, WHITE, 0.18);
    vars["--w-glow"] = oklchHex(0.86, Math.min(c * 0.7, 0.08), h);
    vars["--w-veil"] = vars["--blue-tint"];
    // Luz de escaneo (antes cian fijo): tono vivo y claro del acento.
    vars["--scan"] = oklchHex(Math.max(0.74, Math.min(0.8, l + 0.2)), Math.min(Math.max(c * 1.25, 0.02), 0.17), h);
    vars["--w-scan-light"] = oklchHex(0.93, Math.min(c * 0.6, 0.07), h);

    // Botón principal desactivado: acento suavizado y opaco; el texto pasa a
    // tono oscuro del acento si el blanco no se lee bien sobre él.
    const offBg = mix(a, WHITE, 0.42);
    vars["--w-off-bg"] = offBg;
    vars["--w-off-fg"] = contrast("#ffffff", offBg) >= 3 ? "#ffffff" : mix(a, INK, 0.62);
    vars["--w-off-opacity"] = "1";
    return vars;
}

/** Enlace de WhatsApp con el mensaje de la clínica. */
export function widgetWhatsappHref(cfg: WidgetConfig, name?: string): string {
    const text = cfg.contact.whatsappMessage.replace(/\{nombre\}/gi, name?.trim() || "un paciente");
    return `https://wa.me/${cfg.contact.whatsapp}?text=${encodeURIComponent(text)}`;
}
