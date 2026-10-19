/**
 * Chequeo de la configuración de IA (solo operadores, con CRON_SECRET).
 * Consulta en Google que cada modelo configurado exista y sea accesible con la
 * clave actual. No genera contenido, así que no tiene coste.
 */
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { AI_MODELS, geminiFetch } from '@/lib/ai/gemini';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const expected = process.env.CRON_SECRET;
    if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keyConfigured = Boolean(process.env.GOOGLE_API_KEY);
    const names = [
        AI_MODELS.analysis,
        ...AI_MODELS.image,
        AI_MODELS.videoProvider === 'omni' ? AI_MODELS.omniModel : AI_MODELS.veoModel,
    ];

    const models: Record<string, string> = {};
    for (const name of names) {
        if (!keyConfigured) { models[name] = 'sin GOOGLE_API_KEY'; continue; }
        try {
            await geminiFetch(`models/${name}`, { method: 'GET', retries: 0, timeoutMs: 15_000, model: name });
            models[name] = 'ok';
        } catch (err: any) {
            models[name] = String(err?.message || err).slice(0, 200);
        }
    }

    // Correo: comprueba que el servidor SMTP acepte la conexión y las credenciales.
    let smtp = 'no configurado';
    if (process.env.SMTP_HOSTNAME && process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
            await nodemailer.createTransport({
                host: process.env.SMTP_HOSTNAME,
                port: parseInt(process.env.SMTP_PORT || '465'),
                secure: true,
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
                connectionTimeout: 10_000,
            }).verify();
            smtp = 'ok';
        } catch (err: any) {
            smtp = String(err?.message || err).slice(0, 200);
        }
    }
    const from = process.env.SMTP_FROM || '';
    const fromDomain = from.match(/@([^>\s]+)/)?.[1] ?? null;

    return NextResponse.json({ keyConfigured, videoProvider: AI_MODELS.videoProvider, imageSize: AI_MODELS.imageSize, models, smtp, fromDomain, clinicNotificationEmail: Boolean(process.env.CLINIC_NOTIFICATION_EMAIL) });
}
