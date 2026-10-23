# Textos legales: pendientes antes de publicar

Las páginas `/privacidad`, `/terminos`, `/encargo-de-tratamiento`, `/subencargados`,
`/cookies` y `/aviso-legal` son una **plantilla preparada para Smile Fast**. Antes de
usarlas de forma definitiva, conviene que las revise un profesional legal de cada
mercado (España y LATAM).

## 1. Datos a completar en `lib/legal/company.ts`

Todos los textos leen estos valores; mientras sigan entre corchetes se verán así en las páginas.

| Campo | Marcador actual | Notas |
|---|---|---|
| `legalName` | `[RAZÓN SOCIAL]` | Persona física o jurídica titular de Brandboost / Smile Fast. |
| `taxIdLabel` | `[CUIT / NIF]` | Pon solo la etiqueta que corresponda (CUIT, NIF, RUT…). |
| `taxId` | `[NÚMERO DE IDENTIFICACIÓN FISCAL]` | |
| `address` | `[DOMICILIO: calle, número, ciudad, código postal]` | Domicilio social o fiscal. |
| `country` | `[PAÍS]` | |
| `registry` | `[DATOS REGISTRALES, si aplica]` | Registro Mercantil (España) o IGJ/registro público (Argentina). Si no aplica, poner "No aplica". |
| `privacyEmail` | `[EMAIL DE PRIVACIDAD]` | Buzón para ejercer derechos (p. ej. privacidad@…). Debe atenderse. |
| `contactEmail` | `[EMAIL DE CONTACTO]` | Contacto general y reembolsos. |
| `dpo` | `null` | Si se designa delegado de protección de datos, `{ name, email }`. |
| `euRepresentative` | `[REPRESENTANTE EN LA UE (art. 27 RGPD), si aplica]` | Obligatorio si el titular **no** está establecido en la UE y ofrece el servicio a clínicas en España. Poner `null` si no aplica. |
| `website` | `[URL DEL SITIO, p. ej. https://smilefast.app]` | |
| `governingLaw` | `[LEY APLICABLE, p. ej. leyes de la República Argentina]` | Ley de los términos B2B. |
| `jurisdiction` | `[JURISDICCIÓN, p. ej. tribunales ordinarios de la ciudad de …]` | |
| `hostingProvider` | `[PROVEEDOR VPS]` | Empresa del VPS donde corre Easypanel (app, Postgres y MinIO). |
| `hostingLocation` | `[PAÍS / REGIÓN DEL VPS]` | Determina si hay transferencia internacional. |
| `updated` | `23 de octubre de 2026` | Cambiar al publicar una nueva versión. |

En `lib/legal/subprocessors.ts` también hay un marcador:
`[GARANTÍAS DEL PROVEEDOR VPS: acuerdo de encargo / CCT si está fuera del EEE]`.

Versiones (`lib/legal/versions.ts`): `TERMS_VERSION`, `PRIVACY_VERSION` y `DPA_VERSION`.
**Al cambiar los términos o el contrato de encargo, sube la versión**: las clínicas
existentes verán en el panel el aviso "Actualizamos nuestros términos…" hasta que un
owner/admin acepte (se registra en `legal_acceptances`).

## 2. Puntos para revisión legal

- **Roles responsable/encargado.** Confirmar que la clínica es responsable de los datos
  de pacientes y Brandboost encargado, y que el contrato de encargo aceptado por clic
  es suficiente en cada país (algunas clínicas pedirán versión firmada).
- **Datos de salud y consentimiento explícito** (art. 9 RGPD; datos sensibles en
  Ley 25.326, Ley 1581, LOPDP…). Validar que la casilla del widget cubre la foto y las
  posibles respuestas sobre salud. Valorar si hace falta una **evaluación de impacto
  (EIPD/DPIA)** por tratar imágenes faciales con IA.
- **Imagen facial / biometría.** Se afirma que no hay identificación biométrica y que el
  encuadre (MediaPipe) se calcula en el navegador. Confirmar que la redacción es correcta.
- **Transferencias internacionales.** Revisar las garantías de Google (Gemini API, plan
  de pago: datos no usados para entrenamiento), Stripe y Resend; y los mecanismos de
  cada país LATAM (cláusulas modelo AAIP en Argentina; Colombia exige declaración de
  conformidad o país adecuado; Uruguay, Chile, Ecuador y Paraguay tienen reglas propias).
- **Colombia (Ley 1581/2012, Decreto 1377/2013):** requiere una "Política de Tratamiento
  de la Información" con contenido mínimo y procedimiento de consultas/reclamos. Revisar si
  la política actual basta o hace falta un anexo.
- **Paraguay (Ley 7593/2025):** confirmar el nombre de la autoridad de control y su web
  (en la tabla de autoridades figura de forma genérica).
- **Chile (Ley 21.719):** la Agencia de Protección de Datos Personales entra en
  funcionamiento con la vigencia de la ley (diciembre de 2026). Actualizar la tabla de
  autoridades cuando esté operativa.
- **Ecuador:** comprobar la URL de la Superintendencia de Protección de Datos Personales.
- **Argentina:** inscripción de la base de datos en el Registro Nacional de Bases de Datos
  (AAIP) si el titular está en Argentina. El texto obligatorio de la AAIP (Disp. 10/2008)
  ya está incluido en `/privacidad`.
- **España:** LSSI (aviso legal), LOPDGDD; si el titular no está en la UE, representante
  art. 27 RGPD.
- **Plazos de conservación.** Validar: selfie 24 h; simulaciones 90 días (30–365);
  leads 24 meses (180–1825 días); facturación 5–10 años; registros técnicos "periodo
  limitado" (definir un plazo concreto, p. ej. 12 meses).
- **Reembolsos.** 14 días si no se consumió ningún crédito; consumidos no reembolsables;
  créditos sin caducidad. Confirmar compatibilidad con normas de consumo si alguna clínica
  fuera considerada consumidor (p. ej. profesional autónomo en algunos países LATAM).
- **Limitación de responsabilidad** (12 meses de pagos) y **ley/jurisdicción** B2B.
- **Notificación de brechas:** el contrato fija 48 h del encargado a la clínica para que
  esta cumpla las 72 h ante la autoridad. Confirmar que es operativo.
- **Cifrado en reposo:** se indica "según las capacidades del proveedor de alojamiento".
  Confirmar con el proveedor del VPS (o activar cifrado de disco / SSE en MinIO) y
  ajustar el texto.
- **Copias de seguridad:** confirmar frecuencia y retención reales de los backups de
  Postgres/MinIO en Easypanel para concretar el plazo de rotación.
- **Flexprice** (`lib/billing/flexprice.ts`): si se activa en producción para medición de
  consumo, añadirlo a la lista de subencargados si recibe datos de clínicas.
- **Política de uso de la IA:** revisar si hace falta etiquetado adicional de las
  simulaciones como contenido generado por IA (Reglamento europeo de IA, art. 50).
- **Política de cookies:** hoy solo hay cookies técnicas de sesión (Better Auth) y no hay
  analítica ni píxeles. Si se añade analítica (GA, Meta Pixel…), hay que añadir banner de
  consentimiento y actualizar `/cookies`.

## 3. Dónde se registra la aceptación

- Alta de clínica (`/acceso` → "Crear cuenta"): casilla obligatoria; tras crear la cuenta
  se llama a `recordSignupAcceptanceAction` (`lib/legal/actions.ts`).
- Clínicas existentes: aviso no bloqueante en el panel (`LegalAcceptanceBanner`) para
  owner/admin, que llama a `acceptCurrentLegalAction`.
- Tabla `legal_acceptances` (migración `018_legal_acceptances.sql`): usuario, clínica,
  documento (`terms`, `dpa`, `privacy`), versión, fecha, hash de IP y user agent.
