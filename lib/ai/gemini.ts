/**
 * Cliente REST de Gemini compartido por las rutas /api/ai/*.
 *
 * - Modelos configurables por variables de entorno (los valores por defecto
 *   son los vigentes a octubre de 2026 según ai.google.dev; ver docs/IA.md).
 * - API key en la cabecera x-goog-api-key (no en la URL → no queda en logs).
 * - Timeout y reintentos con backoff ante 429 / 5xx.
 * - Cadena de modelos de respaldo para generación de imagen.
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const list = (v: string | undefined, fallback: string[]) =>
    v ? v.split(',').map((s) => s.trim()).filter(Boolean) : fallback;

export const AI_MODELS = {
    /** Análisis de la selfie (visión → JSON). */
    analysis: process.env.GEMINI_ANALYSIS_MODEL || 'gemini-3.8-flash',
    /** Generación/edición de la sonrisa. El primero es el principal; el resto, respaldo. */
    image: list(process.env.GEMINI_IMAGE_MODELS, ['gemini-nano-banana-2.1', 'gemini-3-pro-image']),
    /** Resolución de salida de imagen: 1K | 2K | 4K (la K en mayúscula). */
    imageSize: process.env.GEMINI_IMAGE_SIZE || '2K',
    /** Proveedor de video: 'omni' (Interactions API) o 'veo' (predictLongRunning). */
    videoProvider: (process.env.VIDEO_PROVIDER || 'omni') as 'omni' | 'veo',
    omniModel: process.env.OMNI_VIDEO_MODEL || 'gemini-omni-1.1-flash',
    veoModel: process.env.VEO_VIDEO_MODEL || 'veo-3.1-fast-generate-preview',
} as const;

export function geminiApiKey(): string {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) throw new Error('GOOGLE_API_KEY not configured');
    return key;
}

const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class GeminiHttpError extends Error {
    constructor(public status: number, public body: string, public model?: string) {
        super(`Gemini API Error (${status})${model ? ` [${model}]` : ''}: ${body.slice(0, 500)}`);
    }
}

/**
 * fetch a la API de Gemini con key en cabecera, timeout y reintentos.
 * `path` es relativo a /v1beta (p. ej. `models/x:generateContent`).
 */
export async function geminiFetch(
    path: string,
    init: { method?: 'GET' | 'POST'; body?: unknown; timeoutMs?: number; retries?: number; model?: string } = {}
): Promise<any> {
    const { method = 'POST', body, timeoutMs = 90_000, retries = 2, model } = init;
    let attempt = 0;
    for (;;) {
        const res = await fetch(`${API_BASE}/${path}`, {
            method,
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiApiKey() },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: AbortSignal.timeout(timeoutMs),
        });
        if (res.ok) return res.json();

        const text = await res.text();
        if (RETRYABLE.has(res.status) && attempt < retries) {
            attempt += 1;
            const retryAfter = Number(res.headers.get('retry-after')) || 0;
            await sleep(Math.max(retryAfter * 1000, 800 * 2 ** attempt));
            continue;
        }
        throw new GeminiHttpError(res.status, text, model);
    }
}

/** generateContent sobre un modelo concreto. */
export function generateContent(model: string, body: unknown, opts: { timeoutMs?: number; retries?: number } = {}) {
    return geminiFetch(`models/${model}:generateContent`, { body, model, ...opts });
}

type Part = { text?: string; thought?: boolean; inlineData?: { mimeType?: string; data?: string }; inline_data?: { mime_type?: string; data?: string } };

const partsOf = (data: any): Part[] => (data?.candidates?.[0]?.content?.parts ?? []) as Part[];

/** Texto de la respuesta (ignora las partes de "pensamiento"). */
export function responseText(data: any): string {
    return partsOf(data)
        .filter((p) => !p.thought && typeof p.text === 'string')
        .map((p) => p.text)
        .join('');
}

/** Primera imagen final de la respuesta (ignora imágenes intermedias de pensamiento). */
export function responseImage(data: any): { data: string; mimeType: string } | null {
    for (const p of partsOf(data)) {
        if (p.thought) continue;
        if (p.inlineData?.data) return { data: p.inlineData.data, mimeType: p.inlineData.mimeType || 'image/jpeg' };
        if (p.inline_data?.data) return { data: p.inline_data.data, mimeType: p.inline_data.mime_type || 'image/jpeg' };
    }
    return null;
}

export const finishReason = (data: any): string | undefined => data?.candidates?.[0]?.finishReason;

/**
 * Edita/genera una imagen probando la cadena de modelos de AI_MODELS.image.
 * Devuelve la imagen y el modelo que la produjo.
 */
export async function generateImage(params: {
    prompt: string;
    imageBase64: string;
    imageMimeType?: string;
    aspectRatio?: string;
    imageSize?: string;
    models?: string[];
}): Promise<{ data: string; mimeType: string; model: string }> {
    const models = params.models ?? AI_MODELS.image;
    const body = {
        contents: [{
            parts: [
                { text: params.prompt },
                { inlineData: { mimeType: params.imageMimeType || 'image/jpeg', data: params.imageBase64 } },
            ],
        }],
        generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: {
                aspectRatio: params.aspectRatio || '9:16',
                imageSize: params.imageSize || AI_MODELS.imageSize,
            },
        },
    };

    const errors: string[] = [];
    for (const model of models) {
        try {
            const result = await generateContent(model, body, { timeoutMs: 120_000 });
            const image = responseImage(result);
            if (image) return { ...image, model };
            const reason = finishReason(result);
            if (reason === 'SAFETY' || reason === 'IMAGE_SAFETY' || reason === 'PROHIBITED_CONTENT') {
                // Un bloqueo de seguridad no se arregla cambiando de modelo.
                throw new Error(`SAFETY: generación bloqueada por filtros de seguridad (${reason})`);
            }
            errors.push(`${model}: sin imagen (finishReason=${reason ?? 'n/a'})`);
        } catch (err: any) {
            if (String(err?.message).startsWith('SAFETY')) throw err;
            console.warn(`[gemini] ${model} falló:`, err?.message);
            errors.push(`${model}: ${err?.message}`);
        }
    }
    throw new Error(`Todos los modelos de imagen fallaron. ${errors.join(' | ')}`);
}
