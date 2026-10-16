/**
 * Object URL estable por archivo. Se cachea por File (WeakMap) para que:
 *  - no se cree una URL nueva en cada render, y
 *  - no se revoque en el doble montaje de StrictMode (lo que rompía la vista previa).
 * El blob vive mientras viva el File; son pocas imágenes por sesión.
 */
const cache = new WeakMap<File, string>();

export function fileObjectUrl(file: File | null | undefined): string | null {
    if (!file) return null;
    let url = cache.get(file);
    if (!url) {
        url = URL.createObjectURL(file);
        cache.set(file, url);
    }
    return url;
}
