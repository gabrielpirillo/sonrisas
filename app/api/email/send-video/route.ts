/**
 * API Route: Send Video Email
 * Converted from Supabase Edge Function: send-video
 * 
 * Sends the generated video to the lead via email using SMTP.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getLeadForEmail } from '@/lib/leadAccess';
import { escapeXml } from '@/lib/security';
import nodemailer from 'nodemailer';
import { db } from '@/lib/db';
import { storage } from '@/lib/storage';
import { brandedEmail, clinicName, mailFrom } from '@/lib/emailTemplate';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export async function OPTIONS() {
    return new NextResponse('ok', { headers: corsHeaders, status: 200 });
}

export async function POST(req: NextRequest) {
    try {
        const { leadId, videoPath } = await req.json();

        if (!leadId || !videoPath) {
            throw new Error('leadId and videoPath are required');
        }

        // 1. Solo el panel de la clínica dueña del lead puede enviar el video.
        const access = await getLeadForEmail(req, leadId, { allowWidget: false });
        if (!access.ok) {
            return NextResponse.json({ success: false, error: access.error }, { status: access.status });
        }
        const lead = access.lead;
        const ownsVideo = await db.queryOne(
            "SELECT 1 FROM generations WHERE lead_id = $1 AND type = 'video' AND output_path = $2",
            [leadId, videoPath]
        );
        if (!ownsVideo) {
            return NextResponse.json({ success: false, error: 'Video no encontrado' }, { status: 404 });
        }

        // 2. Download video from storage
        const videoBuffer = await storage.downloadFileAsBuffer('generated', videoPath);

        // 3. Configure SMTP
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOSTNAME,
            port: parseInt(process.env.SMTP_PORT || '465'),
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // 4. Send email
        const clinic = await clinicName(lead.clinic_id);
        await transporter.sendMail({
            from: mailFrom(),
            to: lead.email,
            subject: clinic ? `Tu video de sonrisa · ${clinic}` : 'Tu video de sonrisa está listo',
            text: 'Tu video personalizado está adjunto.',
            html: videoEmail(lead.name, clinic),
            attachments: [
                {
                    filename: 'video-sonrisa.mp4',
                    content: videoBuffer,
                    contentType: 'video/mp4',
                }
            ],
        });

        // 5. Update lead
        await db.query(
            `UPDATE leads SET video_path = $1 WHERE id = $2`,
            [videoPath, leadId]
        );

        // 6. Log
        await db.query(
            `INSERT INTO audit_logs (action, details) VALUES ($1, $2)`,
            ['VIDEO_EMAIL_SENT', JSON.stringify({ leadId })]
        );

        return NextResponse.json(
            { success: true, message: 'Video email sent successfully' },
            { headers: corsHeaders }
        );

    } catch (error: any) {
        console.error('[send-video] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { headers: corsHeaders, status: 500 }
        );
    }
}

function videoEmail(name: string | null, clinic: string | null): string {
    return brandedEmail({
        preheader: 'Tu video personalizado está listo. Te lo adjuntamos.',
        eyebrow: 'Video listo',
        title: `¡Hola${name ? ` ${escapeXml(name)}` : ''}! Tu video está listo`,
        body: `<p style="margin:0 0 14px;">Adjuntamos tu video personalizado: muestra cómo podrías verte sonriendo con naturalidad.</p>
            <p style="margin:0;">Si tienes dudas o quieres avanzar con el tratamiento, responde a este correo y ${clinic ? escapeXml(clinic) : 'la clínica'} te contactará.</p>`,
        signature: clinic ? escapeXml(clinic) : null,
    });
}
