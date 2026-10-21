"use client";

/**
 * Detecta los landmarks faciales (MediaPipe FaceLandmarker, 478 puntos con
 * iris) de una imagen ya mostrada en pantalla, a partir de su URL
 * (blob:, data: o remota). Reutiliza la instancia IMAGE que el widget
 * precarga y usa para validar la foto, así que normalmente no descarga nada.
 */

import { getFaceLandmarker } from "./faceLandmarker";

export interface NormalizedPoint {
    x: number;
    y: number;
}

export interface ImageLandmarks {
    /** Tamaño natural de la imagen (ya orientada según EXIF, igual que el <img>). */
    width: number;
    height: number;
    /** Landmarks normalizados [0,1] del rostro principal. */
    landmarks: NormalizedPoint[];
}

function needsCors(url: string): boolean {
    if (!/^https?:/i.test(url)) return false; // blob:, data: → mismo origen
    try {
        return new URL(url, window.location.href).origin !== window.location.origin;
    } catch {
        return false;
    }
}

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        // Una imagen remota sin CORS "ensucia" el canvas y MediaPipe no puede leerla.
        if (needsCors(url)) img.crossOrigin = "anonymous";
        img.decoding = "async";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
        img.src = url;
    });
}

/**
 * Devuelve los landmarks del rostro más grande de la imagen, o `null` si no
 * hay rostro. Lanza si el modelo o la imagen no cargan.
 */
export async function detectImageLandmarks(url: string): Promise<ImageLandmarks | null> {
    // Misma configuración que la precarga/validación ⇒ misma instancia cacheada.
    const [landmarker, img] = await Promise.all([
        getFaceLandmarker("IMAGE", { numFaces: 2 }),
        loadImage(url),
    ]);
    if (!img.naturalWidth || !img.naturalHeight) return null;

    const result = landmarker.detect(img);
    const faces = result.faceLandmarks ?? [];
    if (faces.length === 0) return null;

    // Si hubiera más de un rostro, el más ancho (el del paciente, en primer plano).
    let best = faces[0];
    let bestW = -1;
    for (const face of faces) {
        let min = 1, max = 0;
        for (const p of face) {
            if (p.x < min) min = p.x;
            if (p.x > max) max = p.x;
        }
        if (max - min > bestW) {
            bestW = max - min;
            best = face;
        }
    }

    return {
        width: img.naturalWidth,
        height: img.naturalHeight,
        landmarks: best.map((p) => ({ x: p.x, y: p.y })),
    };
}
