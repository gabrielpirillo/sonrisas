import { countries } from "@/components/widget/countries";
import type { CustomField, WidgetConfig } from "@/lib/widgetConfig";

/** Límites de longitud (los mismos que aplica normalizeWidgetConfig). */
export const TEXT_MAX = {
    headline: 40,
    headlineAccent: 40,
    subtitle: 120,
    photoTitle: 40,
    photoSubtitle: 120,
    submitButton: 32,
    resultTitle: 60,
    resultSubtitle: 140,
} as const satisfies Record<keyof WidgetConfig["texts"], number>;

export const DISPLAY_NAME_MAX = 60;
export const WHATSAPP_MESSAGE_MAX = 300;
export const URL_MAX = 300;

/** Error del número de WhatsApp o null si es válido. */
export function whatsappError(digits: string): string | null {
    if (!digits) return "Escribe el número de WhatsApp de la clínica.";
    if (digits.length < 8 || digits.length > 15) return "Debe tener entre 8 y 15 dígitos, con el código de país delante.";
    return null;
}

/** Error de una URL del widget (vacía = se usa la página por defecto). */
export function urlError(v: string): string | null {
    const s = v.trim();
    if (!s) return null;
    if (s.startsWith("/") && !s.startsWith("//")) return null;
    try {
        const u = new URL(s);
        if (u.protocol === "https:") return null;
    } catch {
        /* cae al mensaje */
    }
    return "Usa una dirección completa que empiece por https://";
}

export type SectionId = "brand" | "texts" | "fields" | "contact" | "features" | "install";

/** Errores por pestaña (bloquean el guardado). */
export function validateDraft(d: WidgetConfig): Partial<Record<SectionId, string[]>> {
    const out: Partial<Record<SectionId, string[]>> = {};
    const contact: string[] = [];
    if (whatsappError(d.contact.whatsapp)) contact.push("whatsapp");
    if (urlError(d.contact.privacyUrl)) contact.push("privacyUrl");
    if (urlError(d.contact.termsUrl)) contact.push("termsUrl");
    if (contact.length) out.contact = contact;
    const fields = d.customFields.filter((f) => hasFieldErrors(f)).map((f) => f.id);
    if (fields.length) out.fields = fields;
    return out;
}

/** Límites de los campos adicionales (los mismos que normalizeCustomFields). */
export const FIELD_LIMITS = { label: 80, placeholder: 80, help: 140, option: 60, options: 12 } as const;

/** Errores de un campo adicional (vacío = válido). */
export function customFieldErrors(f: CustomField): { label?: string; options?: string } {
    const e: { label?: string; options?: string } = {};
    if (!f.label.trim()) e.label = "Escribe la pregunta o etiqueta del campo.";
    if (f.type === "select" || f.type === "radio") {
        const opts = f.options ?? [];
        const filled = opts.map((o) => o.trim()).filter(Boolean);
        if (filled.length < 2) e.options = "Añade al menos 2 opciones.";
        else if (filled.length !== opts.length) e.options = "Completa o elimina las opciones vacías.";
        else if (new Set(filled.map((o) => o.toLowerCase())).size !== filled.length) e.options = "Hay opciones repetidas.";
    }
    return e;
}
export const hasFieldErrors = (f: CustomField) => Object.keys(customFieldErrors(f)).length > 0;

/** País probable a partir del prefijo internacional (el más largo que coincida). */
export function detectCountry(digits: string): { name: string; flag: string; dial: string } | null {
    if (!digits) return null;
    let best: (typeof countries)[number] | null = null;
    for (const c of countries) {
        const dial = c.dial_code.replace(/\D/g, "");
        if (dial && digits.startsWith(dial) && (!best || dial.length > best.dial_code.replace(/\D/g, "").length)) best = c;
    }
    if (!best) return null;
    let name = best.name;
    try {
        name = new Intl.DisplayNames(["es"], { type: "region" }).of(best.code) || best.name;
    } catch {
        /* nombre en inglés como respaldo */
    }
    return { name, flag: best.flag, dial: best.dial_code };
}

/** Número de valores distintos entre dos configuraciones. */
export function countChanges(a: WidgetConfig, b: WidgetConfig): number {
    let n = 0;
    for (const g of ["brand", "texts", "contact", "features"] as const) {
        const ga = a[g] as Record<string, unknown>;
        const gb = b[g] as Record<string, unknown>;
        for (const k of Object.keys(ga)) if (ga[k] !== gb[k]) n++;
    }
    const fa = a.customFields, fb = b.customFields;
    for (let i = 0; i < Math.max(fa.length, fb.length); i++) {
        if (JSON.stringify(fa[i]) !== JSON.stringify(fb[i])) n++;
    }
    return n;
}
