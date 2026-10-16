/**
 * Generación de video (imagen → video vertical 9:16, 720p) con dos proveedores:
 *
 * - 'omni' → gemini-omni-1.1-flash vía Interactions API (POST /v1beta/interactions,
 *   background:true; se consulta con GET /v1beta/interactions/{id}). Reemplazo
 *   oficial de Veo 3.1 en la Gemini API. No admite negative prompt (va en el
 *   prompt) y siempre genera audio.
 * - 'veo'  → veo-3.1-*-preview vía predictLongRunning (apagado el 2026-10-22).
 *
 * El proveedor se elige con VIDEO_PROVIDER (ver lib/ai/gemini.ts). Los registros
 * guardan el proveedor usado para poder consultarlos aunque luego se cambie.
 */
import { AI_MODELS, geminiApiKey, geminiFetch, GeminiHttpError } from '@/lib/ai/gemini';

export type VideoProvider = 'omni' | 'veo';

export interface StartVideoParams {
    imageBase64: string;
    mimeType: string;
    prompt: string;
    /** Cosas a evitar. Veo lo acepta como parámetro; en Omni se añade al prompt. */
    avoid?: string;
}

export interface StartedVideo {
    provider: VideoProvider;
    /** Nombre de la operación a consultar: "interactions/<id>" u "operations/<id>". */
    operation: string;
    model: string;
}

export type PollResult =
    | { state: 'pending' }
    | { state: 'failed'; reason: string; filtered?: boolean }
    | { state: 'done'; video: Buffer };

// ── Inicio ────────────────────────────────────────────────────────────────
export async function startVideo(p: StartVideoParams, provider: VideoProvider = AI_MODELS.videoProvider): Promise<StartedVideo> {
    if (provider === 'veo') {
        const model = AI_MODELS.veoModel;
        const op = await geminiFetch(`models/${model}:predictLongRunning`, {
            model,
            timeoutMs: 60_000,
            body: {
                instances: [{ prompt: p.prompt, image: { bytesBase64Encoded: p.imageBase64, mimeType: p.mimeType } }],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: '9:16',
                    personGeneration: 'allow_adult',
                    resolution: '720p',
                    durationSeconds: 8,
                    ...(p.avoid ? { negativePrompt: p.avoid } : {}),
                },
            },
        });
        if (!op?.name) throw new Error(`Veo no devolvió una operación: ${JSON.stringify(op).slice(0, 300)}`);
        return { provider, operation: op.name, model };
    }

    const model = AI_MODELS.omniModel;
    const text = p.avoid ? `${p.prompt}\n- Avoid: ${p.avoid}.` : p.prompt;
    const interaction = await geminiFetch('interactions', {
        model,
        timeoutMs: 60_000,
        body: {
            model,
            input: [
                { type: 'image', mime_type: p.mimeType, data: p.imageBase64 },
                { type: 'text', text },
            ],
            response_format: { type: 'video', aspect_ratio: '9:16', resolution: '720p', delivery: 'uri' },
            generation_config: { video_config: { task: 'image_to_video' } },
            background: true,
        },
    });
    const id = interaction?.id || interaction?.name?.replace(/^interactions\//, '');
    if (!id) throw new Error(`Omni no devolvió un id de interacción: ${JSON.stringify(interaction).slice(0, 300)}`);
    return { provider, operation: `interactions/${id}`, model };
}

// ── Consulta ──────────────────────────────────────────────────────────────
export async function pollVideo(provider: VideoProvider, operation: string): Promise<PollResult> {
    try {
        return provider === 'veo' ? await pollVeo(operation) : await pollOmni(operation);
    } catch (err) {
        // Errores transitorios de Google: seguir esperando en el próximo sondeo.
        if (err instanceof GeminiHttpError && [429, 500, 502, 503, 504].includes(err.status)) {
            return { state: 'pending' };
        }
        throw err;
    }
}

async function pollVeo(operation: string): Promise<PollResult> {
    const op = await geminiFetch(operation, { method: 'GET', retries: 0, timeoutMs: 30_000 });
    if (!op.done) return { state: 'pending' };
    if (op.error) return { state: 'failed', reason: op.error.message || 'veo_operation_error' };

    const res = op.response?.generateVideoResponse || op.response;
    if (res?.raiMediaFilteredReasons?.length) {
        return { state: 'failed', reason: res.raiMediaFilteredReasons.join(', '), filtered: true };
    }
    const video = op.response?.videos?.[0] || res?.videos?.[0] || res?.video || res?.generatedSamples?.[0]?.video;
    if (!video) return { state: 'failed', reason: 'Veo terminó sin video' };
    if (video.bytesBase64) return { state: 'done', video: Buffer.from(video.bytesBase64, 'base64') };
    if (video.uri) return { state: 'done', video: await downloadWithKey(video.uri) };
    return { state: 'failed', reason: 'Formato de video no soportado' };
}

async function pollOmni(operation: string): Promise<PollResult> {
    const it = await geminiFetch(operation, { method: 'GET', retries: 0, timeoutMs: 60_000 });
    const status = String(it?.status || it?.state || '').toLowerCase();
    if (status === 'failed' || status === 'cancelled' || it?.error) {
        const reason = it?.error?.message || it?.status_details || 'omni_failed';
        return { state: 'failed', reason, filtered: /safety|policy|blocked|recogni/i.test(reason) };
    }
    if (status && status !== 'completed' && status !== 'succeeded') return { state: 'pending' };

    const video = findVideo(it);
    if (!video) return { state: 'failed', reason: 'Omni terminó sin video' };
    if (video.data) return { state: 'done', video: Buffer.from(video.data, 'base64') };
    if (video.uri) {
        const file = await waitFileActive(video.uri);
        if (file === 'pending') return { state: 'pending' };
        return { state: 'done', video: await downloadWithKey(file) };
    }
    return { state: 'failed', reason: 'Formato de video no soportado' };
}

/** Busca en la respuesta el primer contenido de video ({mime_type video/*, data|uri}). */
function findVideo(node: any, depth = 0): { data?: string; uri?: string } | null {
    if (!node || typeof node !== 'object' || depth > 8) return null;
    const mime = node.mime_type || node.mimeType;
    if ((node.type === 'video' || String(mime || '').startsWith('video/')) && (node.data || node.uri)) {
        return { data: node.data, uri: node.uri };
    }
    for (const v of Array.isArray(node) ? node : Object.values(node)) {
        const found = findVideo(v, depth + 1);
        if (found) return found;
    }
    return null;
}

/**
 * Para entrega por URI de la Files API: espera a state=ACTIVE y devuelve la URL
 * de descarga. Si el archivo aún se procesa, devuelve 'pending'.
 */
async function waitFileActive(uri: string): Promise<string | 'pending'> {
    const match = uri.match(/files\/([^/:?]+)/);
    if (!match) return uri; // URI de descarga directa
    const name = `files/${match[1]}`;
    const meta = await geminiFetch(name, { method: 'GET', retries: 0, timeoutMs: 30_000 });
    const state = String(meta?.state || '').toUpperCase();
    if (state === 'FAILED') throw new Error('El archivo de video falló en Google');
    if (state && state !== 'ACTIVE') return 'pending';
    return `https://generativelanguage.googleapis.com/v1beta/${name}:download?alt=media`;
}

/** Descarga un archivo de Google con la API key en cabecera (sigue redirecciones). */
async function downloadWithKey(url: string): Promise<Buffer> {
    const res = await fetch(url, {
        headers: { 'x-goog-api-key': geminiApiKey() },
        redirect: 'follow',
        signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) throw new Error(`No se pudo descargar el video (${res.status}): ${(await res.text()).slice(0, 300)}`);
    return Buffer.from(await res.arrayBuffer());
}
