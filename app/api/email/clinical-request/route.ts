/**
 * API Route: Clinical Video Request
 * Converted from Supabase Edge Function: clinical-video-request
 * 
 * Registra que el paciente pidió su vídeo en consulta (el paciente sigue la
 * conversación por WhatsApp) y avisa por correo a la clínica si hay SMTP.
 */
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getLeadForEmail, clinicNotificationEmail } from '@/lib/leadAccess';
import { escapeXml } from '@/lib/security';
import { db } from '@/lib/db';
import { brandedEmail, clinicName, emailNote, mailFrom } from '@/lib/emailTemplate';

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
        const { leadId } = await req.json();

        // El destinatario y los datos salen del lead en la base de datos.
        const access = await getLeadForEmail(req, leadId, { allowWidget: true });
        if (!access.ok) {
            return NextResponse.json({ success: false, error: access.error }, { headers: corsHeaders, status: access.status });
        }
        const email = access.lead.email;
        const name = escapeXml(access.lead.name || '');
        const phone = escapeXml(access.lead.phone || '');

        // 1. Registrar la solicitud en el panel (esto es lo importante).
        await db.query(
            'UPDATE leads SET video_requested_at = COALESCE(video_requested_at, now()) WHERE id = $1',
            [access.lead.id]
        );
        await db.query('INSERT INTO audit_logs (action, details) VALUES ($1, $2)', [
            'CLINICAL_VIDEO_REQUEST',
            JSON.stringify({ leadId: access.lead.id, clinicId: access.lead.clinic_id }),
        ]).catch(() => {});

        // 2. Avisos por correo: si fallan, la solicitud ya quedó guardada.
        const smtpHostname = process.env.SMTP_HOSTNAME;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const smtpPort = parseInt(process.env.SMTP_PORT || '465');
        let emailSent = false;

        if (smtpHostname && smtpUser && smtpPass) {
            try {
                const transporter = nodemailer.createTransport({
                    host: smtpHostname,
                    port: smtpPort,
                    secure: true,
                    auth: {
                        user: smtpUser,
                        pass: smtpPass,
                    },
                });

                const adminEmail = await clinicNotificationEmail(access.lead.clinic_id);

                const clinic = await clinicName(access.lead.clinic_id);

                // Aviso a la clínica (si tiene a quién avisar). El paciente sigue por WhatsApp.
                if (!adminEmail) console.warn('[clinical-request] Sin email de aviso para la clínica', access.lead.clinic_id);
                if (adminEmail) await transporter.sendMail({
                    from: mailFrom(),
                    to: adminEmail,
                    subject: `Nueva solicitud de consulta · ${name || 'Lead'}`,
                    html: brandedEmail({
                        preheader: 'Un paciente quiere ver su simulación en consulta.',
                        eyebrow: 'Nuevo lead',
                        title: 'Nueva solicitud de consulta',
                        body: `<p style="margin:0 0 6px;">Un paciente quiere ver su simulación en consulta. Contáctalo cuanto antes para coordinar la cita.</p>
                            ${emailNote(`<strong>Nombre:</strong> ${name || 'No proporcionado'}<br><strong>Email:</strong> ${escapeXml(email)}<br><strong>Teléfono:</strong> ${phone || 'No proporcionado'}`)}
                            <p style="margin:0;font-size:13px;color:#8a8f8c;">También lo verás en la sección Leads de tu panel.</p>`,
                        signature: clinic ? escapeXml(clinic) : null,
                    }),
                });
                emailSent = true;
            } catch (mailErr: any) {
                console.error('[clinical-video-request] Envío de correo falló:', mailErr?.message || mailErr);
            }
        } else {
            console.warn('[clinical-video-request] SMTP no configurado: solo se registró en el panel');
        }

        return NextResponse.json(
            { success: true, emailSent },
            { headers: corsHeaders }
        );

    } catch (error: any) {
        console.error('[clinical-video-request] Error:', error);
        return NextResponse.json(
            { success: false, error: 'No se pudo enviar la solicitud.' },
            { headers: corsHeaders, status: 500 }
        );
    }
}
