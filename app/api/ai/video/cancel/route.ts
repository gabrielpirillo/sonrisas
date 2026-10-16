import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireClinic } from '@/lib/security';

export async function POST(req: NextRequest) {
    const { ctx, error } = await requireClinic();
    if (error) return error;
    try {
        const { generation_id } = await req.json();

        if (!generation_id) {
            return NextResponse.json({ error: 'generation_id is required' }, { status: 400 });
        }

        // Update the generation status to cancelled
        await db.query(
            `UPDATE generations SET status = 'cancelled', metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('cancelled_at', NOW()::text) WHERE id = $1 AND lead_id IN (SELECT id FROM leads WHERE clinic_id = $2)`,
            [generation_id, ctx.clinic.id]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[api/ai/video/cancel] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
