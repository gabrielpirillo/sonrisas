/**
 * Envío de email vía SMTP (nodemailer). Degrada con gracia: si no hay SMTP
 * configurado, registra el contenido en consola y devuelve false (no lanza).
 */
import nodemailer from 'nodemailer';
import { mailFrom } from '@/lib/emailTemplate';

export async function sendMail(params: { to: string; subject: string; html: string }): Promise<boolean> {
    const host = process.env.SMTP_HOSTNAME;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        console.warn(`[email] SMTP no configurado — no se envió "${params.subject}" a ${params.to}`);
        return false;
    }

    try {
        const transporter = nodemailer.createTransport({
            host,
            port: parseInt(process.env.SMTP_PORT || '465', 10),
            secure: true,
            auth: { user, pass },
        });
        await transporter.sendMail({
            from: mailFrom(),
            to: params.to,
            subject: params.subject,
            html: params.html,
        });
        return true;
    } catch (e) {
        console.error('[email] envío falló:', e);
        return false;
    }
}
