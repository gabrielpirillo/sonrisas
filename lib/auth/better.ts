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
    appName: 'Smile Forward',
    basePath: '/api/better-auth',
    database: pool,
    secret: process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL,
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
                subject: 'Restablecer contraseña — Smile Forward',
                html: `
                    <h2>Restablecer contraseña</h2>
                    <p>Hola ${user.name || ''},</p>
                    <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el enlace
                    (válido por 1 hora):</p>
                    <p><a href="${url}" style="background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Restablecer contraseña</a></p>
                    <p>O copia este enlace: <br><small>${url}</small></p>
                    <p><small>Si no lo solicitaste, ignora este correo.</small></p>
                `,
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
                        await db.query(
                            `INSERT INTO clinics (name, slug, org_id, credit_balance, status)
                             VALUES ($1, $2, $3, 0, 'active')
                             ON CONFLICT (slug) DO UPDATE SET org_id = EXCLUDED.org_id`,
                            [org.name, slug, org.id]
                        );
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
