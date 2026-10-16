/**
 * API Route: Generate Smile
 * Ported from Supabase Edge Function: generate-smile
 * 
 * Uses Google Gemini's image generation with model fallback chain.
 * Models: gemini-3-pro-image-preview → gemini-2.5-flash-image
 */
import { NextRequest, NextResponse } from 'next/server';
import { rejectIfNotInternal, internalHeaders } from '@/lib/security';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { storage } from '@/lib/storage';
import { resolveClinic, reserve, refund, confirm } from '@/lib/billing/credits';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export async function OPTIONS() {
    return new NextResponse('ok', { headers: corsHeaders, status: 200 });
}

export async function POST(req: NextRequest) {
    // Solo llamadas internas (server actions del propio servidor).
    const denied = rejectIfNotInternal(req);
    if (denied) return denied;

    // Billing context — declared up front so the catch block can refund.
    let clinicId: string | null = null;
    let reserveKey: string | null = null;
    let billedClinic: Awaited<ReturnType<typeof resolveClinic>> = null;

    try {
        const body = await req.json();
        const { image_base64, image_path, prompt_options, clinic_key } = body;

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error('GOOGLE_API_KEY not configured');

        // ── CREDIT GATING ─────────────────────────────────────────────────
        // Reserve credits before spending money on Gemini. "Insufficient" blocks
        // with 402. FAILS CLOSED: if the clinic can't be resolved or billing
        // errors, nothing is generated (no free generations on misconfiguration).
        try {
            const clinic = await resolveClinic(clinic_key);
            if (clinic && clinic.status === 'suspended') {
                return NextResponse.json(
                    { success: false, error: 'Clínica suspendida. Contacta al administrador.', code: 'CLINIC_SUSPENDED' },
                    { headers: corsHeaders, status: 403 }
                );
            }
            if (clinic) {
                const key = `image:${randomUUID()}`;
                const reservation = await reserve({
                    clinicId: clinic.id,
                    action: 'image',
                    idempotencyKey: key,
                    metadata: { route: 'ai/smile' },
                });
                if (!reservation.ok) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: 'Créditos insuficientes. Recarga para generar más imágenes.',
                            code: 'INSUFFICIENT_CREDITS',
                        },
                        { headers: corsHeaders, status: 402 }
                    );
                }
                billedClinic = clinic;
                clinicId = clinic.id;
                reserveKey = key;
            } else {
                console.error('[generate-smile] No clinic resolved — blocking generation.');
                return NextResponse.json(
                    { success: false, error: 'Clínica no encontrada.', code: 'CLINIC_NOT_FOUND' },
                    { headers: corsHeaders, status: 404 }
                );
            }
        } catch (gatingErr: any) {
            console.error('[generate-smile] Credit gating failed (fail-closed):', gatingErr?.message);
            return NextResponse.json(
                { success: false, error: 'El servicio no está disponible en este momento. Inténtalo más tarde.', code: 'BILLING_UNAVAILABLE' },
                { headers: corsHeaders, status: 503 }
            );
        }

        // Get image data
        let imageBase64 = image_base64;
        let finalPrompt = '';

        if (!imageBase64 && image_path) {
            if (prompt_options?.analysis_id) {
                // Both operations are independent → execute in parallel
                const [buffer, analysisRecord] = await Promise.all([
                    storage.downloadFileAsBuffer('uploads', image_path),
                    db.queryOne(
                        'SELECT result FROM analysis_results WHERE id = $1',
                        [prompt_options.analysis_id]
                    ),
                ]);

                if (!analysisRecord) {
                    throw new Error('Security Error: Invalid or expired Analysis ID.');
                }

                imageBase64 = buffer.toString('base64');

                // Build prompt from analysis data
                const targetType = prompt_options.type || 'original_bg';
                const variation = analysisRecord.result.variations?.find(
                    (v: any) => v.type === targetType
                );

                if (!variation) {
                    console.warn(`Variation ${targetType} not found in analysis. Using first available.`);
                }
                const promptData = variation
                    ? variation.prompt_data
                    : analysisRecord.result.variations[0].prompt_data;

                finalPrompt = `
                    Perform a ${promptData.Composition} of ${promptData.Subject} ${promptData.Action} in a ${promptData.Location}.
                    Style: ${promptData.Style}. 
                    IMPORTANT EDITING INSTRUCTIONS: ${promptData.Editing_Instructions}
                    ${promptData.Refining_Details || ''}
                    ${promptData.Reference_Instructions || ''}
                    
                    TECHNICAL CONSTRAINTS:
                    - CRITICAL: Maintain the EXACT framing, zoom, and distance of the original image.
                    - DO NOT zoom in on the mouth; keep the full face/head visible exactly as in the reference.
                    - Do NOT crop the head or change the background.
                    - Replace ONLY the teeth area while keeping the rest of the face, skin texture, and features identical to the reference image.
                    - CRITICAL: The resulting smile MUST clearly show BOTH the upper teeth (dentadura superior) AND the lower teeth (dentadura inferior). Never generate a smile that only shows one dental arch.
                    - The input image must be the absolute reference for identity and composition.
                    - vertical portrait, full face visible, do not crop head.
                `;
            } else {
                // No analysis_id: just download the image
                const buffer = await storage.downloadFileAsBuffer('uploads', image_path);
                imageBase64 = buffer.toString('base64');

                finalPrompt = `
                    Subject: ${prompt_options?.variationPrompt || "Portrait of the user with a perfect, natural smile."}
                    Important: Maintain the EXACT framing, zoom, angle, and background of the original image. Do NOT zoom in or out. Do NOT crop.
                    Action: Smiling confidently with a perfect, natural smile.
                    Style: Photorealistic, cinematic lighting, 8k resolution, dental aesthetic high quality.
                    Editing Input: Replace only the teeth with high quality veneers, keeping the face structure, skin texture, and background exactly the same.
                    - CRITICAL: The resulting smile MUST clearly show BOTH the upper teeth (dentadura superior) AND the lower teeth (dentadura inferior). Never generate a smile that only shows one dental arch.
                    - vertical portrait, full face visible, do not crop head.
                `;
            }
        } else if (imageBase64) {
            // Base64 provided directly
            if (prompt_options?.analysis_id) {
                const analysisRecord = await db.queryOne(
                    'SELECT result FROM analysis_results WHERE id = $1',
                    [prompt_options.analysis_id]
                );

                if (!analysisRecord) {
                    throw new Error('Security Error: Invalid or expired Analysis ID.');
                }

                const targetType = prompt_options.type || 'original_bg';
                const variation = analysisRecord.result.variations?.find(
                    (v: any) => v.type === targetType
                );

                if (!variation) {
                    console.warn(`Variation ${targetType} not found in analysis. Using first available.`);
                }
                const promptData = variation
                    ? variation.prompt_data
                    : analysisRecord.result.variations[0].prompt_data;

                finalPrompt = `
                    Perform a ${promptData.Composition} of ${promptData.Subject} ${promptData.Action} in a ${promptData.Location}.
                    Style: ${promptData.Style}. 
                    IMPORTANT EDITING INSTRUCTIONS: ${promptData.Editing_Instructions}
                    ${promptData.Refining_Details || ''}
                    ${promptData.Reference_Instructions || ''}
                    
                    TECHNICAL CONSTRAINTS:
                    - CRITICAL: Maintain the EXACT framing, zoom, and distance of the original image.
                    - DO NOT zoom in on the mouth; keep the full face/head visible exactly as in the reference.
                    - Do NOT crop the head or change the background.
                    - Replace ONLY the teeth area while keeping the rest of the face, skin texture, and features identical to the reference image.
                    - CRITICAL: The resulting smile MUST clearly show BOTH the upper teeth (dentadura superior) AND the lower teeth (dentadura inferior). Never generate a smile that only shows one dental arch.
                    - The input image must be the absolute reference for identity and composition.
                    - vertical portrait, full face visible, do not crop head.
                `;
            } else {
                finalPrompt = `
                    Subject: ${prompt_options?.variationPrompt || "Portrait of the user with a perfect, natural smile."}
                    Important: Maintain the EXACT framing, zoom, angle, and background of the original image. Do NOT zoom in or out. Do NOT crop.
                    Action: Smiling confidently with a perfect, natural smile.
                    Style: Photorealistic, cinematic lighting, 8k resolution, dental aesthetic high quality.
                    Editing Input: Replace only the teeth with high quality veneers, keeping the face structure, skin texture, and background exactly the same.
                    - CRITICAL: The resulting smile MUST clearly show BOTH the upper teeth (dentadura superior) AND the lower teeth (dentadura inferior). Never generate a smile that only shows one dental arch.
                    - vertical portrait, full face visible, do not crop head.
                `;
            }
        } else {
            throw new Error('No image data provided');
        }

        console.log("--- GENERATE SMILE PROMPT ---");
        console.log(finalPrompt.trim());
        console.log("-----------------------------");

        // Gemini request body (matches Supabase edge function config)
        const geminiBody = {
            contents: [{
                parts: [
                    { text: finalPrompt },
                    {
                        inline_data: {
                            mime_type: 'image/jpeg',
                            data: imageBase64,
                        },
                    },
                ],
            }],
            generationConfig: {
                response_modalities: ['TEXT', 'IMAGE'],
                imageConfig: {
                    aspectRatio: '9:16',
                    imageSize: '4K',
                },
            },
        };

        // Model fallback chain
        const models = [
            'gemini-3-pro-image-preview',  // Primary — highest quality
            'gemini-2.5-flash-image',      // Fallback
        ];

        let result: any = null;
        let lastError = '';

        for (const model of models) {
            try {
                console.log(`Trying model: ${model}`);
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(geminiBody),
                });

                console.log(`Model ${model} response status:`, response.status);

                if (!response.ok) {
                    const err = await response.text();
                    console.warn(`Model ${model} failed (${response.status}): ${err}`);
                    lastError = `${model}: ${err}`;
                    continue;
                }

                result = await response.json();
                console.log(`Success with model: ${model}`);
                break;
            } catch (err: any) {
                console.warn(`Model ${model} threw error:`, err);
                lastError = err.message;
                continue;
            }
        }

        if (!result) throw new Error(`All models failed. Last error: ${lastError}`);

        // Extract generated image
        let generatedBase64: string | null = null;
        const candidate = result.candidates?.[0];

        if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData?.data) {
                    generatedBase64 = part.inlineData.data;
                    break;
                }
                // Also handle inline_data format
                if (part.inline_data?.data) {
                    generatedBase64 = part.inline_data.data;
                    break;
                }
            }
        }

        if (!generatedBase64) {
            const finishReason = candidate?.finishReason;
            if (finishReason === 'SAFETY') {
                throw new Error('SAFETY: Image generation was blocked by safety filters');
            }
            console.error('No image in response:', JSON.stringify(result));
            throw new Error('AI did not return an image. Check content safety filters or prompt.');
        }

        // Upload generated image to storage
        const imageBuffer = Buffer.from(generatedBase64, 'base64');
        const fileName = `smile_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;

        const publicUrl = await storage.uploadFile('generated', fileName, imageBuffer, 'image/jpeg');

        // If analysis_id provided, link it
        if (prompt_options?.analysis_id) {
            await db.query(
                'UPDATE analysis_results SET result = result || $1 WHERE id = $2',
                [JSON.stringify({ generated_image: fileName }), prompt_options.analysis_id]
            );
        }

        // Fire-and-forget watermark trigger
        console.log('Triggering background watermark...');
        const port = process.env.PORT || '3000';
        fetch(`http://localhost:${port}/api/ai/watermark`, {
            method: 'POST',
            headers: internalHeaders(),
            body: JSON.stringify({
                image_path: fileName,
                original_public_url: publicUrl,
            }),
        }).catch(err => console.error('Background watermark trigger failed:', err));

        // Successful generation — report usage to Flexprice (credits already
        // deducted at reserve time).
        if (billedClinic && reserveKey) {
            await confirm({
                clinic: billedClinic,
                action: 'image',
                idempotencyKey: reserveKey,
                properties: { file: fileName },
            });
        }

        return NextResponse.json({
            success: true,
            public_url: publicUrl,
            path: fileName,
        }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('[generate-smile] Error:', error);

        // Refund the reserved credits — the clinic should not pay for a failure.
        if (clinicId && reserveKey) {
            await refund({
                clinicId,
                action: 'image',
                reserveKey,
                reason: error.message,
            }).catch((e) => console.error('[generate-smile] refund failed:', e));
        }

        return NextResponse.json(
            { success: false, error: error.message },
            { headers: corsHeaders, status: 500 }
        );
    }
}
