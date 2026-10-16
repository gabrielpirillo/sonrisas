# IA — modelos y proveedores

Todo el acceso a Google Gemini pasa por `lib/ai/gemini.ts` (texto/imagen) y
`lib/ai/video.ts` (video). Los modelos se configuran por variables de entorno;
los valores por defecto son los vigentes a **octubre de 2026** según
<https://ai.google.dev/gemini-api/docs/deprecations>.

| Uso | Variable | Por defecto | Notas |
|---|---|---|---|
| Análisis de la selfie (visión → JSON) | `GEMINI_ANALYSIS_MODEL` | `gemini-3.8-flash` | Estable. `thinkingLevel: LOW`. `temperature` ya no aplica en 3.6+. |
| Sonrisa / escena del video | `GEMINI_IMAGE_MODELS` | `gemini-nano-banana-2.1,gemini-3-pro-image` | Lista separada por comas: el primero es el principal, el resto respaldo. |
| Resolución de imagen | `GEMINI_IMAGE_SIZE` | `2K` | `1K`, `2K` o `4K`. Nano Banana 2.1 a 2K ≈ US$0,05 por imagen (3 Pro a 4K ≈ US$0,24). |
| Proveedor de video | `VIDEO_PROVIDER` | `omni` | `omni` o `veo`. |
| Modelo Omni | `OMNI_VIDEO_MODEL` | `gemini-omni-1.1-flash` | Interactions API (beta). 720p 9:16. Genera audio siempre; sin negative prompt. ≈ US$0,10/s. |
| Modelo Veo | `VEO_VIDEO_MODEL` | `veo-3.1-fast-generate-preview` | **Se apaga el 2026-10-22.** Solo como alternativa temporal. |

## Modelos retirados que usaba la app

- `gemini-2.0-flash` — apagado el 2026-06-01.
- `gemini-3-pro-image-preview` — apagado el 2026-06-25 (era el modelo principal de la sonrisa y de la escena del video).
- `veo-3.1-fast-generate-preview` — apagado el 2026-10-22.
- `gemini-2.5-flash` — acceso restringido a usuarios existentes; reemplazado por `gemini-3.8-flash`.

## Riesgo conocido: video a partir de una selfie

La documentación de Omni indica que "Uploading and editing images containing
certain recognizable people is not supported". El video se genera a partir de la
foto del paciente, así que hay que **probarlo con la API key real** antes de dar
el video por resuelto. Si Omni rechaza las selfies, las alternativas son Veo 3.1
GA en Vertex AI (requiere cuenta de servicio) u otro proveedor de video.

## Comprobar qué modelos tiene disponibles la API key

```bash
curl -s -H "x-goog-api-key: $GOOGLE_API_KEY" \
  "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200" | grep '"name"'
```
