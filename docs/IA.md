# IA — modelos y proveedores

Todo el acceso a Google Gemini pasa por `lib/ai/gemini.ts` (texto/imagen) y
`lib/ai/video.ts` (video). Los modelos se configuran por variables de entorno;
los valores por defecto son los vigentes a **octubre de 2026** según
<https://ai.google.dev/gemini-api/docs/deprecations>.

| Uso | Variable | Por defecto | Notas |
|---|---|---|---|
| Análisis de la selfie (visión → JSON) | `GEMINI_ANALYSIS_MODEL` | `gemini-3.8-flash` | Estable. `thinkingLevel: LOW`. `temperature` ya no aplica en 3.6+. |
| Sonrisa / escena del video | `GEMINI_IMAGE_MODELS` | `gemini-nano-banana-2.1,gemini-3-pro-image` | Lista separada por comas: el primero es el principal, el resto respaldo. |
| Resolución de imagen | `GEMINI_IMAGE_SIZE` | `1K` | `1K`, `2K` o `4K`. Nano Banana 2.1: 1K US$0,0336 · 2K US$0,0504 · 4K US$0,113 (oct. 2026). 3 Pro Image: US$0,134 (1K/2K). |
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

## Coste por unidad (verificado el 19-10-2026)

| Concepto | Cálculo | Coste |
|---|---|---|
| Foto (análisis 3.8 Flash + edición Nano Banana 2.1 a 1K, +10% reintentos) | 0,007 + 0,038 × 1,1 | ≈ US$0,05 |
| Foto a 2K | 0,007 + 0,055 × 1,1 | ≈ US$0,068 |
| Vídeo Omni 1.1 Flash 720p (US$0,10/s) | 5 s / 8 s | ≈ US$0,51 / 0,81 |

- Desde el 01-01-2027 gemini-3.8-flash duplica su precio (la foto pasa a ≈ US$0,056).
- Alternativas de vídeo más baratas a evaluar con fotos con consentimiento: MiniMax H3 (fal, ≈ US$0,30 por 5 s),
  Luma Ray 3.2 (US$0,30 por 5 s), Kling 3.0 Standard sin audio (≈ US$0,42 por 5 s). Sin benchmarks públicos de identidad/dientes.
- Mejora recomendada: máscara de la boca y recomponer sobre la foto original (garantiza que cara y fondo no cambian).
