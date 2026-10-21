/**
 * Better Auth — autenticación multiusuario + multi-clínica (plugin organization).
 *
 * Modelo: una `organization` de Better Auth ↔ una fila `clinics` (1:1) vía
 * `clinics.org_id`. Better Auth gestiona user/session/account/verification +
 * organization/member/invitation; la facturación por créditos sigue en `clinics`.
 *
 * Se monta en basePath `/api/better-auth` para convivir con el NextAuth actual
 * durante el rollout (luego se hace el "flip").
 */
import { betterAuth } from 'better-auth';
import { organization, admin } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { Pool } from 'pg';
import { db } from '@/lib/db';
import { sendMail } from '@/lib/email';
import { brandedEmail } from '@/lib/emailTemplate';
import { escapeXml } from '@/lib/security';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

function slugify(input: string): string {
    return (
        input
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
            .slice(0, 40) || `clinic-${Math.random().toString(36).slice(2, 8)}`
    );
}

export const auth = betterAuth({
    appName: 'Smile Fast',
    basePath: '/api/better-auth',
    database: pool,
    secret: process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL,
    // Dominios extra desde los que se puede iniciar sesión (p. ej. el subdominio de Brandboost).
    trustedOrigins: (process.env.TRUSTED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean),
    emailAndPassword: {
        enabled: true,
        // El alta del primer usuario crea su organización/clínica; no hay verificación
        // por correo en este entorno self-host (SMTP opcional).
        requireEmailVerification: false,
        resetPasswordTokenExpiresIn: 3600, // 1 hora
        // Envía el correo de "olvidé mi contraseña" con el enlace de reseteo.
        sendResetPassword: async ({ user, url }) => {
            await sendMail({
                to: user.email,
                subject: 'Restablece tu contraseña · Smile Fast',
                html: brandedEmail({
                    preheader: 'Enlace para crear una contraseña nueva (válido 1 hora).',
                    eyebrow: 'Recuperar acceso',
                    title: 'Crea una contraseña nueva',
                    body: `<p style="margin:0 0 14px;">Hola${user.name ? ` ${escapeXml(user.name)}` : ''},</p>
                        <p style="margin:0 0 14px;">Recibimos una solicitud para restablecer la contraseña de tu panel. El enlace es válido durante 1 hora.</p>
                        <p style="margin:0;font-size:13px;color:#8a8f8c;">Si no lo solicitaste, ignora este correo: tu contraseña no cambiará.</p>`,
                    cta: { href: url, label: 'Restablecer contraseña' },
                }),
            });
        },
    },
    databaseHooks: {
        session: {
            create: {
                // Al iniciar sesión, fija la organización activa a la primera del usuario.
                before: async (session) => {
                    try {
                        const m = await db.queryOne<{ organizationId: string }>(
                            'SELECT "organizationId" FROM member WHERE "userId" = $1 ORDER BY "createdAt" ASC LIMIT 1',
                            [session.userId]
                        );
                        return { data: { ...session, activeOrganizationId: m?.organizationId ?? null } };
                    } catch {
                        return { data: session };
                    }
                },
            },
        },
    },
    plugins: [
        organization({
            // Cuando se crea una organización, enlazamos/creamos su clínica de billing.
            organizationHooks: {
                afterCreateOrganization: async ({ organization: org }: { organization: { id: string; name: string; slug?: string } }) => {
                    try {
                        // La PRIMERA organización adopta la clínica `default` existente
                        // (preserva sus créditos, leads y customer de Flexprice).
                        const orphanDefault = await db.queryOne<{ id: string }>(
                            "SELECT id FROM clinics WHERE slug = 'default' AND org_id IS NULL",
                            []
                        );
                        if (orphanDefault) {
                            await db.query(
                                'UPDATE clinics SET org_id = $1, name = $2 WHERE id = $3',
                                [org.id, org.name, orphanDefault.id]
                            );
                            return;
                        }
                        // Resto de organizaciones: clínica nueva con su propio widget key.
                        const slug = slugify(org.slug || org.name);
                        // Créditos de bienvenida para probar la herramienta (WELCOME_CREDITS, por defecto 5).
                        const welcome = Math.max(0, Math.min(50, parseInt(process.env.WELCOME_CREDITS || '5', 10) || 0));
                        const created = await db.queryOne<{ id: string; inserted: boolean }>(
                            `INSERT INTO clinics (name, slug, org_id, credit_balance, status)
                             VALUES ($1, $2, $3, $4, 'active')
                             ON CONFLICT (slug) DO UPDATE SET org_id = EXCLUDED.org_id
                             RETURNING id, (xmax = 0) AS inserted`,
                            [org.name, slug, org.id, welcome]
                        );
                        if (created?.inserted && welcome > 0) {
                            await db.query(
                                `INSERT INTO credit_ledger (clinic_id, action, kind, credits_delta, balance_after, idempotency_key, metadata)
                                 VALUES ($1, 'welcome', 'adjust', $2, $2, $3, $4)
                                 ON CONFLICT (idempotency_key) DO NOTHING`,
                                [created.id, welcome, `welcome:${created.id}`, JSON.stringify({ reason: 'welcome_credits' })]
                            );
                        }
                    } catch (e) {
                        console.error('[better-auth] afterCreate clinic link failed:', e);
                    }
                },
            },
        }),
        // Gestión de usuarios e impersonación (super-admin de plataforma).
        // Autoriza por user.role en adminRoles; los emails de plataforma se
        // promueven a role 'admin' (ver lib/auth/platform.ensurePlatformAdminRole).
        admin({
            adminRoles: ['admin'],
            defaultRole: 'user',
            impersonationSessionDuration: 60 * 60, // 1 hora
        }),
        // nextCookies() debe ir SIEMPRE al final.
        nextCookies(),
    ],
});

export type Session = typeof auth.$Infer.Session;
