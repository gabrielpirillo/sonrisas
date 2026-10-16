/**
 * API Route: Send Photo Email
 * Converted from Supabase Edge Function: send-photo-email
 * 
 * Downloads a generated smile image, and emails it to the lead.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getLeadForEmail } from '@/lib/leadAccess';
import { escapeXml } from '@/lib/security';
import nodemailer from 'nodemailer';
import { storage } from '@/lib/storage';
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
        const { imageUrl, leadId } = await req.json();

        if (!imageUrl || typeof imageUrl !== 'string') {
            return NextResponse.json({ success: false, error: 'imageUrl es obligatorio' }, { headers: corsHeaders, status: 400 });
        }
        // El destinatario es siempre el email del lead (nunca el del body).
        const access = await getLeadForEmail(req, leadId, { allowWidget: true });
        if (!access.ok) {
            return NextResponse.json({ success: false, error: access.error }, { headers: corsHeaders, status: access.status });
        }
        const email = access.lead.email;
        const name = access.lead.name;

        // Download image — try watermarked version first, fallback to original
        // Extract path after bucket name (handles full URLs and relative paths)
        let imagePath = imageUrl;
        const generatedIdx = imageUrl.indexOf('/generated/');
        if (generatedIdx !== -1) {
            imagePath = imageUrl.substring(generatedIdx + '/generated/'.length);
        }
        if (imagePath.includes('..') || imagePath.startsWith('/')) {
            return NextResponse.json({ success: false, error: 'Ruta de imagen inválida' }, { headers: corsHeaders, status: 400 });
        }
        const watermarkedPath = imagePath.replace(/\.(jpg|png)$/i, '_watermarked.jpg');

        let imageBuffer: Buffer;

        try {
            console.log(`Attempting watermarked: ${watermarkedPath}`);
            imageBuffer = await storage.downloadFileAsBuffer('generated', watermarkedPath);
        } catch {
            console.log(`Watermarked not found, falling back to original: ${imagePath}`);
            try {
                imageBuffer = await storage.downloadFileAsBuffer('generated', imagePath);
            } catch (dlError: any) {
                throw new Error(`Failed to download image: ${dlError.message}`);
            }
        }

        const imageBase64 = imageBuffer.toString('base64');

        // Configure SMTP
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOSTNAME,
            port: parseInt(process.env.SMTP_PORT || '465'),
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // Send email
        const clinic = await clinicName(access.lead.clinic_id);
        await transporter.sendMail({
            from: mailFrom(),
            to: email,
            subject: clinic ? `Tu simulación de sonrisa · ${clinic}` : 'Tu simulación de sonrisa está lista',
            text: 'Adjuntamos tu simulación de sonrisa.',
            html: photoEmail(name, clinic),
            attachments: [
                {
                    filename: 'simulacion-sonrisa.jpg',
                    content: imageBase64,
                    encoding: 'base64',
                }
            ],
        });

        return NextResponse.json(
            { success: true, message: 'Email sent successfully via SMTP' },
            { headers: corsHeaders }
        );

    } catch (error: any) {
        console.error('[send-photo-email] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { headers: corsHeaders, status: 500 }
        );
    }
}

function photoEmail(name: string | null, clinic: string | null): string {
    const who = clinic ? escapeXml(clinic) : 'la clínica';
    return brandedEmail({
        preheader: 'Tu simulación de sonrisa está lista. Te la adjuntamos en alta calidad.',
        eyebrow: 'Simulación lista',
        title: `¡Hola${name ? ` ${escapeXml(name)}` : ''}! Esta podría ser tu nueva sonrisa`,
        body: `<p style="margin:0 0 14px;">Adjuntamos tu simulación en alta calidad para que puedas verla con todo detalle.</p>
            <p style="margin:0 0 14px;">Es una <strong style="color:#1c1e1d;">simulación orientativa</strong>: el resultado real depende de la valoración clínica.</p>
            ${emailNote(`<strong>¿Quieres verte en movimiento?</strong><br>Una imagen da una idea, pero el cambio se entiende de verdad al verte hablar y sonreír. Responde a este correo y ${who} te ayudará a reservar tu cita.`)}`,
        signature: clinic ? escapeXml(clinic) : null,
    });
}
