/**
 * API Route: Watermark Image
 * Converted from Supabase Edge Function: watermark-image
 * 
 * Adds a watermark to generated smile images using Sharp.
 */
import { NextRequest, NextResponse } from 'next/server';
import { rejectIfNotInternal } from '@/lib/security';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { storage } from '@/lib/storage';
import { isSafeKey } from '@/lib/storage/refs';
import { SIGNED_URL_TTL, signStoragePath } from '@/lib/signedUrl';

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

    try {
        const { image_path } = await req.json();

        if (!image_path || typeof image_path !== 'string' || !isSafeKey(image_path)) {
            throw new Error('image_path is required');
        }

        // 1. Imagen original desde storage
        const imageBuffer = await storage.downloadFileAsBuffer('generated', image_path);
        const metadata = await sharp(imageBuffer).metadata();
        const width = metadata.width || 800;
        const height = metadata.height || 800;

        // 2. Marca discreta: logo Smile Fast blanco dentro de una pastilla
        //    translúcida en la esquina inferior derecha (sin depender de fuentes).
        const logoH = Math.max(Math.round(width * 0.026), 14);
        const logo = await sharp(await readFile(join(process.cwd(), 'public', 'brand', 'smilefast-white.png')))
            .resize({ height: logoH })
            .png()
            .toBuffer();
        const logoMeta = await sharp(logo).metadata();
        const logoW = logoMeta.width || logoH * 5;
        const padX = Math.round(logoH * 0.9);
        const padY = Math.round(logoH * 0.55);
        const pillW = logoW + padX * 2;
        const pillH = logoH + padY * 2;
        const margin = Math.round(Math.max(width, height) * 0.025);
        const left = width - pillW - margin;
        const top = height - pillH - margin;
        const pill = Buffer.from(
            `<svg width="${pillW}" height="${pillH}"><rect x="0.5" y="0.5" width="${pillW - 1}" height="${pillH - 1}" rx="${pillH / 2}" fill="rgba(19,27,34,0.38)" stroke="rgba(255,255,255,0.22)"/></svg>`
        );

        const watermarkedBuffer = await sharp(imageBuffer)
            .composite([
                { input: pill, left, top },
                { input: logo, left: left + padX, top: top + padY },
            ])
            .jpeg({ quality: 90 })
            .toBuffer();

        // 3. Guardar como <nombre>_watermarked.jpg (sin pisar el original, sea .jpg o .png)
        const watermarkedPath = image_path.replace(/\.(jpe?g|png|webp)$/i, '') + '_watermarked.jpg';
        await storage.uploadFile('generated', watermarkedPath, watermarkedBuffer, 'image/jpeg');

        // Ruta interna: URL firmada de corta duración (nunca una URL pública).
        const publicUrl = signStoragePath('generated', watermarkedPath, SIGNED_URL_TTL.widget);

        return NextResponse.json(
            { success: true, watermarked_path: watermarkedPath, public_url: publicUrl },
            { headers: corsHeaders }
        );

    } catch (error: any) {
        console.error('[watermark-image] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { headers: corsHeaders, status: 500 }
        );
    }
}
