/**
 * API Route: Check Video Status
 * Converted from Supabase Edge Function: check-video
 * 
 * Polls Google's Veo API for video generation status.
 * When complete, downloads and uploads the video to storage.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireClinic } from '@/lib/security';
import { pollVideo, type VideoProvider } from '@/lib/ai/video';
import { storage } from '@/lib/storage';
import { refund, confirm, type Clinic } from '@/lib/billing/credits';

/** Refund the reserved video credits for a failed generation (idempotent). */
async function refundVideo(gen: any, reason: string) {
    if (!gen?.clinic_id) return;
    await refund({
        clinicId: gen.clinic_id,
        action: 'video',
        reserveKey: `video:${gen.id}`,
        generationId: gen.id,
        reason,
    }).catch((e) => console.error('[check-video] refund failed:', e));
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export async function OPTIONS() {
    return new NextResponse('ok', { headers: corsHeaders, status: 200 });
}

export async function POST(req: NextRequest) {
    const { ctx, error } = await requireClinic();
    if (error) return error;
    try {
        const { generation_id } = await req.json();
        if (!generation_id) throw new Error('Generation ID is required');

        // Solo generaciones de leads de la clínica de la sesión.
        const owned = await db.queryOne(
            `SELECT 1 FROM generations g JOIN leads l ON l.id = g.lead_id
             WHERE g.id = $1 AND l.clinic_id = $2`,
            [generation_id, ctx.clinic.id]
        );
        if (!owned) {
            return NextResponse.json({ error: 'Generación no encontrada' }, { status: 404, headers: corsHeaders });
        }

        // 1. Fetch Generation Info
        const gen = await db.queryOne(
            'SELECT * FROM generations WHERE id = $1',
            [generation_id]
        );

        if (!gen) throw new Error('Generation record not found');

        // If already completed, return data
        if (gen.status === 'completed') {
            return NextResponse.json(gen, { headers: corsHeaders });
        }

        const operationName = gen.metadata?.operation_name;

        // If still initializing or missing operation name
        if (gen.status === 'processing' && !operationName) {
            return NextResponse.json(
                { status: 'pending', id: generation_id, message: 'Initializing generation...' },
                { headers: corsHeaders }
            );
        }

        // 2. Consultar el estado con el proveedor que creó el video
        //    (los registros anteriores al cambio no guardaban proveedor → Veo).
        const provider: VideoProvider = gen.metadata?.provider === 'omni' ? 'omni' : 'veo';
        const polled = await pollVideo(provider, operationName);

        if (polled.state === 'failed') {
            await db.query(
                `UPDATE generations SET status = 'failed', metadata = metadata || $1 WHERE id = $2`,
                [JSON.stringify({ error: { message: polled.reason, code: polled.filtered ? 'RAI_FILTERED' : 'PROVIDER_ERROR' } }), generation_id]
            );
            await refundVideo(gen, polled.filtered ? `RAI_FILTERED: ${polled.reason}` : polled.reason);
            return NextResponse.json(
                { status: 'failed', error: polled.reason },
                { headers: corsHeaders }
            );
        }

        // 3. Video listo → subirlo a nuestro almacenamiento
        if (polled.state === 'done') {
            const videoBuffer = polled.video;

            const fileName = `video_${generation_id}.mp4`;
            const filePath = `videos/${fileName}`;
            await storage.uploadFile('generated', filePath, videoBuffer, 'video/mp4');

            // 5. Update Database
            const updatedGen = await db.queryOne(
                `UPDATE generations SET status = 'completed', output_path = $1 WHERE id = $2 RETURNING *`,
                [filePath, generation_id]
            );

            // Video succeeded — report usage to Flexprice (credits already
            // deducted at reserve time in /generate).
            if (gen.clinic_id) {
                const clinic = await db.queryOne<Clinic>('SELECT * FROM clinics WHERE id = $1', [gen.clinic_id]);
                if (clinic) {
                    await confirm({
                        clinic,
                        action: 'video',
                        idempotencyKey: `video:${generation_id}`,
                        generationId: generation_id,
                        properties: { scenario: gen.metadata?.scenario },
                    });
                }
            }

            return NextResponse.json(updatedGen, { headers: corsHeaders });
        }

        // Still pending
        return NextResponse.json(
            { status: 'pending', id: generation_id },
            { headers: corsHeaders }
        );

    } catch (error: any) {
        console.error('[check-video] Error:', error);
        return NextResponse.json(
            { error: error.message },
            { headers: corsHeaders, status: 400 }
        );
    }
}
