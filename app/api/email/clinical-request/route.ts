/**
 * API Route: Clinical Video Request
 * Converted from Supabase Edge Function: clinical-video-request
 * 
 * Sends TWO emails:
 * 1. Confirmation email to the user
 * 2. Admin notification email to the clinic
 */
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getLeadForEmail, clinicNotificationEmail } from '@/lib/leadAccess';
import { escapeXml } from '@/lib/security';
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

        const smtpHostname = process.env.SMTP_HOSTNAME;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const smtpPort = parseInt(process.env.SMTP_PORT || '465');

        if (!smtpHostname || !smtpUser || !smtpPass) {
            throw new Error('SMTP credentials not configured');
        }

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
        const clinicLabel = clinic ? escapeXml(clinic) : 'la clínica';

        // 1. Confirmación al paciente
        await transporter.sendMail({
            from: mailFrom(),
            to: email,
            subject: clinic ? `Hemos recibido tu solicitud · ${clinic}` : 'Hemos recibido tu solicitud',
            html: brandedEmail({
                preheader: 'Te contactaremos para coordinar tu visita.',
                eyebrow: 'Solicitud recibida',
                title: `Gracias${name ? `, ${name}` : ''}. Te contactaremos pronto`,
                body: `<p style="margin:0 0 14px;">Hemos recibido tu solicitud para ver tu video en consulta. En breve ${clinicLabel} se pondrá en contacto contigo para confirmar el día y la hora de tu visita.</p>
                    <p style="margin:0;">Si quieres añadir algo, responde a este correo.</p>`,
                signature: clinic ? escapeXml(clinic) : null,
            }),
        });

        // 2. Aviso a la clínica (si tiene a quién avisar)
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

        return NextResponse.json(
            { success: true, message: 'Emails processed via SMTP' },
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
