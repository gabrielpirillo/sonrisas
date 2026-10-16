/**
 * Prueba de humo de la IA con la API key real (usa el código de lib/ai/*).
 *
 *   npx tsx scripts/smoke-ai.ts <foto.jpg> <carpeta-salida> [--video]
 *
 * 1. Comprueba qué modelos configurados están disponibles para la key.
 * 2. Análisis: visión → JSON con el modelo de análisis.
 * 3. Imagen: edición de sonrisa con la cadena de modelos de imagen.
 * 4. (--video) Video 9:16 con el proveedor configurado. Cuesta ≈ US$0,80.
 *
 * Lee GOOGLE_API_KEY (y el resto de variables) de .env.local.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function main() {
    const { AI_MODELS, geminiFetch, generateContent, responseText, generateImage } = await import('../lib/ai/gemini');
    const { startVideo, pollVideo } = await import('../lib/ai/video');

    const [photo, outDir] = process.argv.slice(2);
    const withVideo = process.argv.includes('--video');
    if (!photo || !outDir) throw new Error('Uso: npx tsx scripts/smoke-ai.ts <foto.jpg> <carpeta-salida> [--video]');
    mkdirSync(outDir, { recursive: true });
    const imageBase64 = readFileSync(photo).toString('base64');

    // 1. Modelos disponibles
    const listed = await geminiFetch('models?pageSize=500', { method: 'GET' });
    const names = new Set<string>((listed.models || []).map((m: { name: string }) => m.name.replace(/^models\//, '')));
    const wanted = [AI_MODELS.analysis, ...AI_MODELS.image, AI_MODELS.omniModel, AI_MODELS.veoModel];
    console.log('\n[1] Modelos configurados en la lista de la key:');
    for (const m of wanted) console.log(`   ${names.has(m) ? '✓' : '✗'} ${m}`);

    // 2. Análisis
    console.log(`\n[2] Análisis con ${AI_MODELS.analysis}...`);
    const t2 = Date.now();
    const analysis = await generateContent(AI_MODELS.analysis, {
        contents: [{ parts: [
            { text: 'Analiza la sonrisa de la persona. Devuelve JSON: {"is_valid_selfie": boolean, "teeth_visible": boolean, "vita_shade_estimate": string, "notes": string}' },
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
        ] }],
        generationConfig: { responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'LOW' } },
    }, { timeoutMs: 60_000 });
    console.log(`   OK en ${((Date.now() - t2) / 1000).toFixed(1)}s →`, JSON.parse(responseText(analysis)));

    // 3. Imagen
    console.log(`\n[3] Imagen con ${AI_MODELS.image.join(' → ')} (${AI_MODELS.imageSize}, 9:16)...`);
    const t3 = Date.now();
    const img = await generateImage({
        prompt: 'Edit only the teeth: natural, well-aligned, slightly whiter teeth (VITA A1). Keep the face, identity, lighting and background exactly the same. Photorealistic.',
        imageBase64,
        aspectRatio: '9:16',
    });
    const imgPath = join(outDir, `smile.${img.mimeType === 'image/png' ? 'png' : 'jpg'}`);
    writeFileSync(imgPath, Buffer.from(img.data, 'base64'));
    console.log(`   OK en ${((Date.now() - t3) / 1000).toFixed(1)}s con ${img.model} → ${imgPath}`);

    if (!withVideo) return;

    // 4. Video
    console.log(`\n[4] Video con ${AI_MODELS.videoProvider}...`);
    const started = await startVideo({
        imageBase64: img.data,
        mimeType: img.mimeType,
        prompt: '- Subject: The person from the input image.\n- Composition: 9:16 vertical portrait. Fixed camera.\n- Natural, warm smile that evolves gently. Gentle head movement only.\n- Audio: silent scene, no dialogue, no music.',
        avoid: 'talking, dialogue, music, morphing teeth, distortion',
    });
    console.log(`   Operación: ${started.operation} (${started.model})`);
    const t4 = Date.now();
    for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 15_000));
        const r = await pollVideo(started.provider, started.operation);
        process.stdout.write(`   ${((Date.now() - t4) / 1000).toFixed(0)}s: ${r.state}\n`);
        if (r.state === 'failed') throw new Error(`Video falló: ${r.reason}${r.filtered ? ' (filtro de seguridad)' : ''}`);
        if (r.state === 'done') {
            const vidPath = join(outDir, 'video.mp4');
            writeFileSync(vidPath, r.video);
            console.log(`   OK → ${vidPath} (${(r.video.length / 1024).toFixed(0)} KB)`);
            return;
        }
    }
    throw new Error('El video no terminó en 10 minutos');
}

main().catch((e) => {
    console.error('\n✗ ERROR:', e?.message || e);
    process.exit(1);
});
