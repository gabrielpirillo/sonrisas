'use server';

import { storage as minioStorage } from '@/lib/storage';
import { fetchTrustedImage } from '@/lib/security';
import { newObjectKey } from '@/lib/storage/refs';
import { SIGNED_URL_TTL, signStoragePath } from '@/lib/signedUrl';
import { resolveClinic } from '@/lib/billing/credits';
import { db } from '@/lib/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Solo letras, números, guion y guion bajo (para el sufijo de tipo). */
const safeSegment = (v: string) => String(v || 'anon').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'anon';

/**
 * Clínica para el prefijo de la clave. Solo si el formulario trae el campo
 * clinicKey (el widget siempre lo manda; vacío = clínica por defecto). La
 * selfie desde el móvil no lo trae y queda sin prefijo de clínica.
 */
async function clinicIdForUpload(formData: FormData): Promise<string | null> {
    if (!formData.has('clinicKey')) return null;
    try {
        const raw = formData.get('clinicKey');
        const clinic = await resolveClinic(typeof raw === 'string' && raw ? raw.slice(0, 200) : null);
        return clinic?.id ?? null;
    } catch {
        return null;
    }
}

/** Clínica de un lead recién creado por el widget (ventana corta), o null. */
async function clinicIdForLead(leadId: string): Promise<string | null> {
    if (!UUID_RE.test(leadId || '')) return null;
    try {
        const row = await db.queryOne<{ clinic_id: string | null }>(
            `SELECT clinic_id FROM leads WHERE id = $1 AND created_at > now() - interval '6 hours'`,
            [leadId]
        );
        return row?.clinic_id ?? null;
    } catch {
        return null;
    }
}

/**
 * Uploads a file to MinIO Storage.
 * Note: Accepting FormData is necessary for Server Actions handling file uploads.
 */
export const uploadScan = async (formData: FormData): Promise<{ success: boolean; data?: string; path?: string; error?: string }> => {
    console.log("[Storage] ENTRY: uploadScan called.");
    try {
        const file = formData.get('file') as File;
        const userId = formData.get('userId') as string;

        if (!file || !userId) return { success: false, error: "Missing file or userId" };
        if (!file.type?.startsWith('image/')) return { success: false, error: "El archivo debe ser una imagen" };
        if (file.size > 10 * 1024 * 1024) return { success: false, error: "La imagen supera los 10 MB" };

        const rawExt = (file.name?.split('.').pop() || 'jpg').toLowerCase();
        const fileExt = ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(rawExt) ? rawExt : 'jpg';
        // Clave no adivinable, con prefijo de clínica cuando se conoce.
        const filePath = newObjectKey({ clinicId: await clinicIdForUpload(formData), folder: 'scans', ext: fileExt });

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await minioStorage.uploadFile(
            'uploads',
            filePath,
            buffer,
            file.type || 'image/jpeg'
        );

        // `data`: URL firmada (2 h) para el navegador; también es la prueba de
        // posesión que piden el análisis/generación y /api/db.
        return { success: true, data: signStoragePath('uploads', filePath, SIGNED_URL_TTL.widget), path: filePath };
    } catch (error: any) {
        console.error("[Storage] uploadScan critical error:", error);
        return { success: false, error: `Upload Failed: ${error.message || "Unknown error"}` };
    }
};

/**
 * Saves a generated image URL to MinIO (or re-uploads if needed).
 */
export const uploadGeneratedImage = async (imageUrlOrBase64: string, userId: string, type: string): Promise<string> => {
    try {
        const fileName = newObjectKey({ clinicId: await clinicIdForLead(userId), folder: safeSegment(type), ext: 'png' });

        let buffer: Buffer;

        if (imageUrlOrBase64.startsWith('data:')) {
            // Base64
            const base64Data = imageUrlOrBase64.split(',')[1];
            buffer = Buffer.from(base64Data, 'base64');
        } else {
            // URL
            const arrayBuffer = await fetchTrustedImage(imageUrlOrBase64);
            buffer = Buffer.from(arrayBuffer);
        }

        await minioStorage.uploadFile(
            'generated',
            fileName,
            buffer,
            'image/png'
        );

        return signStoragePath('generated', fileName, SIGNED_URL_TTL.widget);
    } catch (error) {
        console.error("Critical Error in uploadGeneratedImage:", error);
        return imageUrlOrBase64; // Fail safe return original URL
    }
};

/**
 * Server Action for high-res uploads using FormData.
 * This prevents RSC serialization limits for large base64 strings.
 */
export const uploadGeneratedImageAction = async (formData: FormData): Promise<string> => {
    try {
        const file = formData.get('file') as File;
        const userId = formData.get('userId') as string;
        const type = formData.get('type') as string || 'aligned';

        if (!file || !userId) {
            console.error("[Storage] Missing file or userId in FormData");
            return "";
        }

        // userId es el id del lead: la clínica sale de la base de datos.
        const fileName = newObjectKey({ clinicId: await clinicIdForLead(userId), folder: safeSegment(type), ext: 'png' });
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await minioStorage.uploadFile(
            'generated',
            fileName,
            buffer,
            'image/png'
        );

        return signStoragePath('generated', fileName, SIGNED_URL_TTL.widget);
    } catch (error) {
        console.error("Critical Error in uploadGeneratedImageAction:", error);
        return "";
    }
};
