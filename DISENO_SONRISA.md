# Diseño de Sonrisa en Smile Forward — Fundamento Clínico y Técnico

> Documento de referencia: explica **cómo** la aplicación diseña la sonrisa, **en qué criterios
> odontológicos** se basa y **qué literatura científica** los respalda. Útil tanto para el equipo
> técnico como para validación clínica.

---

## 1. Resumen del pipeline

La app **no realiza un diseño de sonrisa métrico** (medición sobre la foto → encerado → mock-up,
como el Digital Smile Design clásico). Es una **simulación estética generativa**: un modelo de IA
de imagen (Google Gemini) recibe la selfie del paciente más un *prompt clínico* que codifica los
principios de estética dental, y produce una versión mejorada de la sonrisa preservando la
identidad facial.

```
Selfie ─▶ Validación facial (MediaPipe) ─▶ Análisis dental + prompt clínico (Gemini 2.5-flash)
       ─▶ Generación de imagen (Gemini 3-pro-image / 2.5-flash-image)
       ─▶ Alineación antes/después (Procrustes, utils/alignFaces.ts)
       ─▶ (opcional) Video de estilo de vida (Veo)
```

Archivos clave:
- `app/api/ai/analyze/route.ts` — **prompt clínico** (los criterios de este documento viven aquí).
- `app/api/ai/smile/route.ts` — generación de la imagen final.
- `utils/faceValidation.ts` — validación biométrica de la selfie.
- `utils/alignFaces.ts` — alineación geométrica del resultado (transformación de similaridad).

---

## 2. Criterios de diseño implementados (y su fuente)

Los criterios se organizan en tres niveles clásicos: **facial → dentogingival → dental**.

### 2.1 Macroestética facial
| Criterio | Regla aplicada | Fuente |
|----------|----------------|--------|
| Línea media facial | Localizada nasion → arco de cupido (no por ojos/nariz/mentón). Línea media dental coincidente o paralela; desviación ≤ 2 mm | Morley & Eubank 2001; Kokich 1999 |
| Plano incisal / canting | Perpendicular a la línea media facial, paralelo a la interpupilar; evitar canting (defecto más grave) | Morley & Eubank 2001 |
| Conectores (50-40-30) | Zona de conexión central-central ~50%, lateral-central ~40%, canino-lateral ~30% del largo del central | Morley & Eubank 2001 |

### 2.2 Estética dentogingival (rosa)
| Criterio | Regla aplicada | Fuente |
|----------|----------------|--------|
| Zenit gingival | Distal al eje (clase II) en centrales y caninos; lateral puede ir centrado | Principles of Smile Design (PMC3010027) |
| Niveles de margen | Central = canino; lateral 0.5–1.0 mm más coronal | Machado, 10 Commandments (PMC4296640) |
| Exposición gingival | ≤ 3 mm de encía en sonrisa plena; evitar "gummy smile" | Machado, 10 Commandments |
| Papila / triángulos negros | Papilas puntiagudas llenando troneras; sin black triangles | Morley & Eubank 2001 |

### 2.3 Estética dental (blanca)
| Criterio | Regla aplicada | Fuente |
|----------|----------------|--------|
| Proporción ancho/largo central | 75–80% | Sterrett; Principles of Smile Design |
| Proporción entre dientes | Lateral ≈ 62% del central; canino ≈ 62% del lateral (áurea / RED) | Lombardi; Ward (RED) |
| Inclinación axial | Eje de la corona inclinado **mesialmente**, progresivo del central al canino | Morley & Eubank 2001 |
| Smile arc | Curva convexa de bordes incisales paralela al labio inferior; central ligeramente por debajo de la punta del canino | Tjan; Morley & Eubank 2001 |
| Troneras incisales | Aumento progresivo del tamaño desde la línea media hacia el canino | Morley & Eubank 2001 |
| Corredor bucal | Espacio negativo intermedio (ni nulo ni > 16%) | Principles of Smile Design |
| Color VITA + progresión | Tono natural (+1/+2 valores, mismo *hue*, sin "bleach"). Central el más claro; lateral algo menor en valor; canino más cromático | Goodkind; Morley & Eubank 2001 |

---

## 3. Manejo del color (detalle)

La app usa la **guía VITA Classical completa** y aplica un objetivo **natural**, no "Hollywood white":

- Detecta el tono actual (p. ej. `A3.5`).
- Selecciona un objetivo **1–2 valores más brillante** manteniendo la **misma familia de matiz**
  (`A3.5` → `A3`/`A2`). Prohíbe saltar a tonos *bleach* (`OM1`, `BL1`) salvo dientes naturalmente
  muy claros.
- Reproduce la **progresión de color**: el central es el más brillante, el canino el más saturado.

---

## 4. Limitaciones conocidas (honestidad clínica)

1. **Es guía, no medición.** Los criterios se le *sugieren* al modelo generativo vía prompt; la app
   **no mide** el ratio ancho/largo ni verifica geométricamente el resultado. No equivale a un DSD
   clínico (Coachman & Calamita).
2. **Sin verificación post-generación.** No hay un paso que compruebe que la imagen generada cumple
   los números (mejora futura: medir con los landmarks de MediaPipe y regenerar si se desvía).
3. **Propósito.** Herramienta de **previsualización y conversión de leads**, no sustituto del
   diagnóstico ni del encerado diagnóstico presencial.

---

## 5. Bibliografía

1. **Morley J, Eubank J.** Macroesthetic elements of smile design. *J Am Dent Assoc.*
   2001;132(1):39-45.
2. **Kokich VO, Kiyak HA, Shapiro PA.** Comparing the Perception of Dentists and Lay People to
   Altered Dental Esthetics. *J Esthet Dent.* 1999;11(6):311-324.
3. **Principles of smile design.** *J Conserv Dent.* PMC3010027.
   https://pmc.ncbi.nlm.nih.gov/articles/PMC3010027/
4. **Machado RM.** 10 commandments of smile esthetics. *Dental Press J Orthod.* PMC4296640.
   https://pmc.ncbi.nlm.nih.gov/articles/PMC4296640/
5. **Coachman C, Calamita M.** Digital Smile Design: A Tool for Treatment Planning and
   Communication in Esthetic Dentistry. *QDT* 2012.
6. **Tjan A, Miller G, The G.** Some esthetic factors in a smile. *J Prosthet Dent.* 1984;51:24-8.
7. **Lombardi RE.** The principles of visual perception and their clinical application to denture
   esthetics. *J Prosthet Dent.* 1973;29:358-82.
8. **Goodkind RJ, Schwabacher WB.** Use of a fiber-optic colorimeter for in vivo measurements of
   2,830 anterior teeth. *J Prosthet Dent.* 1987;58:535-42.
