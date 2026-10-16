/**
 * Plantilla HTML de correo con la marca Smile Fast (tablas + estilos en línea
 * para que se vea bien en Gmail, Outlook y Apple Mail).
 *
 * Todo el texto que venga de usuarios debe llegar ya escapado (escapeXml).
 */
import { db } from '@/lib/db';

/** Remitente: SMTP_FROM, o el usuario SMTP con el nombre de la marca. */
export function mailFrom(): string {
    if (process.env.SMTP_FROM) return process.env.SMTP_FROM;
    return process.env.SMTP_USER ? `Smile Fast <${process.env.SMTP_USER}>` : 'Smile Fast';
}

/** Nombre de la clínica del lead, para firmar los correos al paciente. */
export async function clinicName(clinicId: string | null | undefined): Promise<string | null> {
    if (!clinicId) return null;
    try {
        const row = await db.queryOne<{ name: string }>('SELECT name FROM clinics WHERE id = $1', [clinicId]);
        return row?.name ?? null;
    } catch {
        return null;
    }
}

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'SFMono-Regular', Menlo, Consolas, monospace";

export function brandedEmail(opts: {
    /** Texto de vista previa en la bandeja de entrada. */
    preheader?: string;
    /** Etiqueta pequeña en mayúsculas sobre el título. */
    eyebrow?: string;
    title: string;
    /** HTML del cuerpo (párrafos ya escapados). */
    body: string;
    cta?: { href: string; label: string };
    /** Firma: nombre de la clínica (si no, "Smile Fast"). */
    signature?: string | null;
}): string {
    const sig = opts.signature || 'Smile Fast';
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:#eef3f6;font-family:${FONT};color:#1c1e1d;">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f6;padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 20px 50px -30px rgba(27,38,48,0.45);">
      <tr>
        <td style="background:#1b2630;background-image:linear-gradient(160deg,#2a3a47,#1b2630 60%,#131b22);padding:28px 32px;">
          <span style="font-size:20px;font-weight:600;letter-spacing:-0.02em;color:#ffffff;">Smile&nbsp;Fast</span>
          <span style="float:right;font-family:${MONO};font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#b9cfdd;line-height:26px;">Simulación con IA</span>
        </td>
      </tr>
      <tr>
        <td style="padding:36px 32px 8px;">
          ${opts.eyebrow ? `<div style="display:inline-block;font-family:${MONO};font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#4f6b7f;background:#f2f6f9;border:1px solid #d3dee6;border-radius:999px;padding:6px 12px;margin-bottom:18px;">${opts.eyebrow}</div>` : ''}
          <h1 style="margin:0 0 16px;font-size:26px;line-height:1.15;letter-spacing:-0.03em;font-weight:600;color:#1c1e1d;">${opts.title}</h1>
          <div style="font-size:15.5px;line-height:1.65;color:#565b59;">${opts.body}</div>
        </td>
      </tr>
      ${opts.cta ? `<tr><td style="padding:12px 32px 8px;">
          <a href="${opts.cta.href}" style="display:inline-block;background:#4f6b7f;background-image:linear-gradient(135deg,#4f6b7f,#3e5769);color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:15px 28px;border-radius:999px;">${opts.cta.label}</a>
        </td></tr>` : ''}
      <tr>
        <td style="padding:28px 32px 32px;">
          <div style="border-top:1px solid #e8eae8;padding-top:18px;font-size:13px;line-height:1.6;color:#8a8f8c;">
            ${sig}${sig !== 'Smile Fast' ? ' · con tecnología de Smile Fast' : ''}
          </div>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/** Bloque destacado (fondo azul suave) para usar dentro de `body`. */
export function emailNote(html: string): string {
    return `<div style="background:#f2f6f9;border:1px solid #d3dee6;border-radius:14px;padding:16px 18px;margin:20px 0;color:#3e5769;">${html}</div>`;
}
