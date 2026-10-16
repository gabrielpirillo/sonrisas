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

        // 1. User Confirmation Email
        await transporter.sendMail({
            from: process.env.SMTP_FROM || smtpUser,
            to: email,
            subject: 'Confirmación de solicitud de video en consulta - Dental Corbella',
            html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.header{text-align:center;padding:30px 0;border-bottom:2px solid #f0f0f0}.logo{font-size:28px;font-weight:300;font-family:Georgia,serif;color:#000}.content{padding:40px 0}p{margin-bottom:20px;color:#444}.footer{text-align:center;padding:30px 0;border-top:2px solid #f0f0f0;color:#999;font-size:14px}</style></head><body><div class="header"><div class="logo">Smile Forward</div></div><div class="content"><p>Estimado/a ${name || 'Usuario'},</p><p>Le agradecemos que haya solicitado su video en consulta. Hemos recibido correctamente su petición y en breve nuestro equipo se pondrá en contacto con usted para gestionar y confirmar la fecha y hora de su visita.</p><p>Le recordamos que esta primera cita es totalmente gratuita. Durante la visita podrá visualizar su video generado por Smile Forward, donde conocerá una simulación personalizada de su futura sonrisa.</p><p>Si desea añadir alguna información adicional, puede responder a este correo o llamarnos directamente.</p><p>Gracias por confiar en nosotros.</p><p>Atentamente,<br><strong>Equipo de Atención al Paciente Dental Corbella</strong></p></div><div class="footer"><p>Dental Corbella - Smile Forward</p></div></body></html>`,
        });

        // 2. Admin Notification Email (si la clínica tiene a quién avisar)
        if (!adminEmail) console.warn('[clinical-request] Sin email de aviso para la clínica', access.lead.clinic_id);
        if (adminEmail) await transporter.sendMail({
            from: process.env.SMTP_FROM || smtpUser,
            to: adminEmail,
            subject: `🔴 Nueva Solicitud de Video/Consulta - Dental Corbella`,
            html: `<div style="font-family:sans-serif;padding:20px;border:1px solid #eee;border-radius:10px"><h2 style="color:#000">Nueva solicitud de consulta para vídeo</h2><p>Se ha recibido una nueva solicitud de un lead interesado en ver su simulación de sonrisa en consulta.</p><div style="background-color:#f9f9f9;padding:15px;border-radius:5px;margin:20px 0"><p><strong>Nombre:</strong> ${name || 'No proporcionado'}</p><p><strong>Email:</strong> ${escapeXml(email)}</p><p><strong>Teléfono:</strong> ${phone || 'No proporcionado'}</p></div><p style="color:#666;font-size:14px">Por favor, contacte con el paciente a la brevedad para coordinar la cita.</p></div>`,
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
