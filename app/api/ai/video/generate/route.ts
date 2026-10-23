/**
 * API Route: Generate Video
 * Converted from Supabase Edge Function: generate-video
 * 
 * Triggers Veo video generation asynchronously.
 * The actual video is polled via check-video endpoint.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { storage } from '@/lib/storage';
import { newObjectKey, parseStorageRef } from '@/lib/storage/refs';
import { reserve, refund } from '@/lib/billing/credits';
import { requireClinic } from '@/lib/security';
import { generateImage } from '@/lib/ai/gemini';
import { startVideo } from '@/lib/ai/video';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── Logger util ─────────────────────────────────────────────────────────────
const tag = (section: string) => `[generate-video][${section}]`;

function logStep(section: string, msg: string, data?: unknown) {
    if (data !== undefined) {
        console.log(`${tag(section)} ${msg}`, JSON.stringify(data, null, 2));
    } else {
        console.log(`${tag(section)} ${msg}`);
    }
}

function logError(section: string, msg: string, err?: unknown) {
    console.error(`${tag(section)} ❌ ${msg}`, err instanceof Error ? err.message : err);
}

export async function OPTIONS() {
    return new NextResponse('ok', { headers: corsHeaders, status: 200 });
}

export async function POST(req: NextRequest) {
    const requestStart = Date.now();

    // Solo usuarios del panel; la clínica sale de la sesión, no del body.
    const auth = await requireClinic();
    if (auth.error) return auth.error;

    try {
        // ── INPUT ─────────────────────────────────────────────────────────────
        const body = await req.json();
        const { lead_id, scenario_id } = body;
        logStep('input', '📥 Incoming request body', body);

        if (!lead_id) throw new Error('lead_id is required');

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error('GOOGLE_API_KEY not configured');

        // ── CREDIT GATING ─────────────────────────────────────────────────
        // La clínica es la de la sesión y el lead tiene que ser suyo.
        const clinic: any = auth.ctx.clinic;
        const ownsLead = await db.queryOne(
            'SELECT 1 FROM leads WHERE id = $1 AND clinic_id = $2',
            [lead_id, clinic.id]
        );
        if (!ownsLead) {
            return NextResponse.json(
                { success: false, error: 'Lead no encontrado.' },
                { headers: corsHeaders, status: 404 }
            );
        }

        if (clinic && clinic.status === 'suspended') {
            return NextResponse.json(
                { success: false, error: 'Clínica suspendida. Contacta al administrador.', code: 'CLINIC_SUSPENDED' },
                { headers: corsHeaders, status: 403 }
            );
        }

        logStep('init', '✅ DB + Storage initialized. GOOGLE_API_KEY present.');

        // ── 1. LEAD DATA ──────────────────────────────────────────────────────
        logStep('lead', `Fetching lead data for id="${lead_id}"`);
        const lead = await db.queryOne(
            `SELECT survey_data, name FROM leads WHERE id = $1`,
            [lead_id]
        );

        if (!lead) {
            logError('lead', 'Lead not found');
            throw new Error('Lead not found');
        }

        const surveyData = lead.survey_data || {};
        const ageRange = surveyData.ageRange || '30-55';
        logStep('lead', '✅ Lead found', { name: lead.name, ageRange, surveyData });

        // ── 2. SCENARIO ───────────────────────────────────────────────────────
        let scenarioDetails = "";
        let sceneDescription = "";
        let finalScenario = scenario_id || "automatic";

        const scenarios: Record<string, { description: string, details: string }> = {
            park: {
                description: "Professional outdoor portrait in a vibrant green park with natural daylight.",
                details: "- Location: Vibrant green park. Natural daylight. Green background.\n- Action: Laughing naturally and warmly. Gentle head tilting in joy."
            },
            home: {
                description: "Warm, cozy portrait in a family dining room with indoor lighting.",
                details: "- Location: Warm family dining room. Indoor lighting.\n- Action: Smiling warmly or laughing gently. Continuous gentle movement."
            },
            office: {
                description: "Professional office environment with bright corporative lighting.",
                details: "- Location: Modern professional office. Bright windows. Corporate setting.\n- Action: Smiling professionally and confidently. Natural business interaction vibe."
            },
            dinner: {
                description: "Stylish portrait during a social dinner at a high-end restaurant with ambient lighting.",
                details: "- Location: Elegant restaurant. Warm ambient lighting. Blurred social background.\n- Action: Holding a toast glass and laughing joyfully. High-end social aesthetic."
            },
            beach: {
                description: "Sunny portrait on a beautiful beach during vacation with golden-hour lighting.",
                details: "- Location: Tropical beach. Ocean background. Golden hour sun.\n- Action: Smiling happily and relaxed. Vacation vibe. Wind gently in hair."
            }
        };

        if (scenarios[scenario_id]) {
            sceneDescription = scenarios[scenario_id].description;
            scenarioDetails = scenarios[scenario_id].details;
            logStep('scenario', `✅ Manual scenario selected: "${scenario_id}"`);
        } else {
            if (ageRange === '18-30') {
                sceneDescription = scenarios.park.description;
                scenarioDetails = scenarios.park.details;
                finalScenario = "automatic_park";
            } else if (ageRange === '55+') {
                sceneDescription = scenarios.home.description;
                scenarioDetails = scenarios.home.details;
                finalScenario = "automatic_home";
            } else {
                sceneDescription = "Stylish portrait on an urban rooftop terrace with a city sunset background.";
                scenarioDetails = "- Location: Stylish urban rooftop terrace. City sunset background.\n- Action: Holding a drink and smiling naturally. High-end social aesthetic.";
                finalScenario = "automatic_rooftop";
            }
            logStep('scenario', `✅ Automatic scenario resolved: "${finalScenario}" (ageRange="${ageRange}")`);
        }

        logStep('scenario', 'Scene description + details', { sceneDescription, scenarioDetails });

        // ── 3. CREATE INITIAL RECORD ──────────────────────────────────────────
        logStep('db', 'Inserting initial generation record...');
        const newGen = await db.insertReturning(
            `INSERT INTO generations (lead_id, clinic_id, type, status, metadata)
             VALUES ($1, $2, 'video', 'processing', $3)
             RETURNING id`,
            [lead_id, clinic?.id || null, JSON.stringify({ scenario: finalScenario, status_note: "Background process started" })]
        );

        logStep('db', `✅ Generation record created`, { id: newGen.id, status: 'processing' });

        // Reserve credits, keyed by the generation id so /check can refund on
        // failure and confirm on success idempotently. Skipped (fail-open) when
        // no clinic could be resolved.
        const reserveKey = clinic ? `video:${newGen.id}` : null;
        if (clinic) {
            const reservation = await reserve({
                clinicId: clinic.id,
                action: 'video',
                idempotencyKey: reserveKey!,
                generationId: newGen.id,
                metadata: { route: 'ai/video/generate', scenario: finalScenario },
            });
            if (!reservation.ok) {
                await db.query(
                    `UPDATE generations SET status = 'error', metadata = metadata || $1 WHERE id = $2`,
                    [JSON.stringify({ error: 'INSUFFICIENT_CREDITS' }), newGen.id]
                );
                logStep('credits', '⛔ Insufficient credits — video blocked', { clinic_id: clinic.id });
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Créditos insuficientes. Recarga para generar videos.',
                        code: 'INSUFFICIENT_CREDITS',
                    },
                    { headers: corsHeaders, status: 402 }
                );
            }
        }

        // ── 4. BACKGROUND TASK ────────────────────────────────────────────────
        // Fire-and-forget: we return the generation_id immediately
        const backgroundTask = async () => {
            const bgStart = Date.now();
            logStep('bg', `🚀 Background task started for generation_id="${newGen.id}"`);

            try {
                // ── A. FETCH SMILE IMAGE ──────────────────────────────────────
                logStep('bg:image', `Querying latest completed image for lead_id="${lead_id}"`);
                const sourceGen = await db.queryOne(
                    `SELECT output_path FROM generations 
                     WHERE lead_id = $1 AND type = 'image' AND status = 'completed' 
                     ORDER BY created_at DESC LIMIT 1`,
                    [lead_id]
                );

                if (!sourceGen) {
                    logError('bg:image', 'No completed smile image found');
                    throw new Error('No smile image found');
                }

                logStep('bg:image', '✅ Source image found', { output_path: sourceGen.output_path });

                // Download source image
                const imagePath = sourceGen.output_path;

                // output_path puede ser ruta /api/storage/..., URL absoluta antigua o
                // clave a secas: se lee directo del bucket (el proxy exige firma).
                const sourceRef = parseStorageRef(imagePath, 'generated');
                if (!sourceRef) throw new Error('Invalid source image path');
                const imageBuffer = await storage.downloadFileAsBuffer(sourceRef.bucket, sourceRef.key);

                const imgBase64 = imageBuffer.toString('base64');
                const mimeType = 'image/jpeg';

                logStep('bg:image', `✅ Image downloaded`, {
                    mimeType,
                    sizeBytes: imageBuffer.byteLength,
                    base64LengthChars: imgBase64.length
                });

                // ── B. SCENE GENERATION (Gemini) ──────────────────────────────
                let sceneImgBase64 = imgBase64;
                let sceneImgMimeType = mimeType;
                let generatedScenePath = sourceGen.output_path;

                const sceneGenerationPrompt = `Subject: The person in the input image.\nAction: ${ageRange === '18-30' ? 'Laughing naturally' : ageRange === '55+' ? 'Smiling warmly' : 'Smiling casually'}.\nLocation: ${sceneDescription}\nStyle: Photorealistic, cinematic lighting, 8k resolution, High Quality.\nEditing Input: Change the background to match the Location description. Keep the person's face, hair, and smile EXACTLY the same. Seamlessly blend the lighting.`;

                logStep('bg:scene', '📤 Sending request to Gemini image generation', { prompt: sceneGenerationPrompt });

                try {
                    const scene = await generateImage({
                        prompt: `Generate a photorealistic image based on: ${sceneGenerationPrompt}`,
                        imageBase64: imgBase64,
                        imageMimeType: mimeType,
                        aspectRatio: '9:16',
                    });
                    sceneImgBase64 = scene.data;
                    sceneImgMimeType = scene.mimeType;
                    logStep('bg:scene', `✅ Scene generated with ${scene.model}`);

                    const sceneExt = scene.mimeType === 'image/png' ? 'png' : 'jpg';
                    const sceneFileName = newObjectKey({ clinicId: auth.ctx.clinic.id, folder: 'scenes', ext: sceneExt });
                    const sceneBuffer = Buffer.from(sceneImgBase64, 'base64');
                    try {
                        const sceneUrl = await storage.uploadFile('generated', sceneFileName, sceneBuffer, sceneImgMimeType);
                        generatedScenePath = sceneFileName;
                        logStep('bg:scene', `✅ Scene image uploaded`, { path: generatedScenePath, url: sceneUrl });
                    } catch (uploadErr) {
                        logError('bg:scene', 'Scene image upload failed', uploadErr);
                    }
                } catch (sceneErr) {
                    logError('bg:scene', 'Scene generation failed, falling back to original image', sceneErr);
                }

                // ── C. VEO GENERATION ─────────────────────────────────────────
                const baseInstructions = `- Subject: The person from the input image.\n- Composition: 9:16 Vertical Portrait. FIXED CAMERA. NO ROTATION.\n- IMPORTANT: Natural, warm facial expression that evolves gently. Gentle head movement only. Eyes and cheeks express joy. Gentle, organic movement only. Maintain identical facial identity throughout.\n- Audio: Silent scene. No talking, no dialogue, no background music. Near-silent environment.`;
                const scenarioPrompt = `${baseInstructions}\n${scenarioDetails}\n- Style: Cinematic, Photorealistic, 4k High Quality.\n- NOTE: The video must start INSTANTLY in the target location. Do NOT fade in from the input image background.`;
                const negativePrompt = "talking, speaking, lip syncing, dialog, dialogue, speech, singing, music, soundtrack, background music, ambient sound, sound effects, audio, voice, distortion, morphing teeth, low quality, blurry, flashing pixels, jerky movement";

                logStep('bg:video', '📤 Starting video generation', { scenarioPrompt, negativePrompt });

                const started = await startVideo({
                    imageBase64: sceneImgBase64,
                    mimeType: sceneImgMimeType,
                    prompt: scenarioPrompt,
                    avoid: negativePrompt,
                });
                const operation = { name: started.operation };

                logStep('bg:video', `✅ Video operation created (${started.provider} · ${started.model})`, {
                    operation_name: started.operation,
                });

                // ── D. UPDATE RECORD ──────────────────────────────────────────
                const updateMetadata = JSON.stringify({
                    operation_name: operation.name,
                    provider: started.provider,
                    model: started.model,
                    scenario: finalScenario,
                    prompt: scenarioPrompt,
                    negative_prompt: negativePrompt
                });

                logStep('bg:db', 'Updating generation record with operation details', {
                    id: newGen.id,
                    operation_name: operation.name
                });

                await db.query(
                    `UPDATE generations SET status = 'processing', input_path = $1, metadata = $2 WHERE id = $3`,
                    [generatedScenePath, updateMetadata, newGen.id]
                );

                logStep('bg:db', `✅ Generation record updated — ready for polling`);

                const elapsed = Date.now() - bgStart;
                logStep('bg', `✅ Background task completed in ${elapsed}ms`);

            } catch (err: any) {
                const elapsed = Date.now() - bgStart;
                logError('bg', `Background task failed after ${elapsed}ms`, err);

                const isRetryableError =
                    err.message?.includes('audio') ||
                    err.message?.includes('safety') ||
                    err.message?.includes('could not create your video');

                const errorMetadata = JSON.stringify({
                    error: err.message,
                    error_type: isRetryableError ? 'audio_safety_filter' : 'fatal',
                    retryable: isRetryableError,
                    step: 'background_init',
                    elapsed_ms: elapsed
                });

                logStep('bg:db', 'Writing error to generation record', errorMetadata);

                await db.query(
                    `UPDATE generations SET status = 'error', metadata = $1 WHERE id = $2`,
                    [errorMetadata, newGen.id]
                );

                // Background generation failed before reaching Veo — refund the
                // reserved credits (idempotent with the /check refund path).
                if (clinic && reserveKey) {
                    await refund({
                        clinicId: clinic.id,
                        action: 'video',
                        reserveKey,
                        generationId: newGen.id,
                        reason: err.message,
                    }).catch((e) => logError('bg:credits', 'refund failed', e));
                }
            }
        };

        // Fire and forget — don't await the background task
        backgroundTask().catch(err => {
            logError('handler', 'Unhandled background task error', err);
        });

        const syncElapsed = Date.now() - requestStart;
        logStep('response', `✅ Returning early response after ${syncElapsed}ms`, {
            generation_id: newGen.id,
            status: 'initializing'
        });

        return NextResponse.json({
            success: true,
            generation_id: newGen.id,
            status: 'processing',
        }, { headers: corsHeaders });

    } catch (error: any) {
        const elapsed = Date.now() - requestStart;
        logError('handler', `Unhandled error after ${elapsed}ms`, error);
        return NextResponse.json(
            { error: error.message },
            { headers: corsHeaders, status: 500 }
        );
    }
}
