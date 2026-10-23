import { NextResponse } from 'next/server';
import { getAuthContext, hasOrgRole } from '@/lib/auth/context';
import { isPlatformAdminEmail } from '@/lib/auth/platform';
import { clinicDeletionDate } from '@/lib/retentionLimits';

export async function GET() {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ user: null }, { status: 200 });
    const role = ctx.role === 'owner' || ctx.role === 'admin' ? 'admin' : 'basic';
    return NextResponse.json({
        user: {
            email: ctx.email,
            role,
            clinic: ctx.clinic?.name ?? null,
            // Saldo ya cargado por getAuthContext (sin consulta extra): chip de la barra móvil.
            credits: ctx.clinic ? ctx.clinic.credit_balance : null,
            isPlatformAdmin: isPlatformAdminEmail(ctx.email),
            impersonating: Boolean(ctx.impersonatedBy),
            isOwner: hasOrgRole(ctx.role, ['owner']),
            // Baja de la clínica pendiente: fecha del borrado definitivo (banner del panel).
            clinicDeletionScheduledFor: ctx.clinic?.deletion_requested_at
                ? clinicDeletionDate(ctx.clinic.deletion_requested_at).toISOString()
                : null,
        },
    });
}
