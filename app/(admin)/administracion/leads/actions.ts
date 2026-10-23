'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext, hasOrgRole } from '@/lib/auth/context';
import { eraseLeadForClinic } from '@/lib/retention';

/**
 * Derecho de supresión: borra el lead, sus simulaciones, consentimientos,
 * análisis y todos sus archivos (lib/retention.ts). Deja una entrada de
 * auditoría sin datos personales (hash del id).
 */
export async function deleteLeadAction(leadId: string) {
    if (!leadId) {
        return { success: false, error: 'Falta el lead.' };
    }

    // Solo owner/admin de la clínica dueña del lead, y nunca en impersonación.
    const ctx = await getAuthContext();
    if (!ctx?.clinic) return { success: false, error: 'No autenticado' };
    if (ctx.impersonatedBy) return { success: false, error: 'No disponible durante una impersonación.' };
    if (!hasOrgRole(ctx.role, ['owner', 'admin'])) {
        return { success: false, error: 'No tienes permisos para eliminar pacientes.' };
    }

    try {
        const result = await eraseLeadForClinic(leadId, ctx.clinic.id, ctx.userId);
        if (!result) return { success: false, error: 'Lead no encontrado' };
        revalidatePath('/administracion/leads');
        return { success: true, files: result.files };
    } catch (error) {
        console.error('deleteLeadAction: fallo al eliminar', error);
        return { success: false, error: 'No se pudieron borrar todos los datos. Inténtalo de nuevo.' };
    }
}
