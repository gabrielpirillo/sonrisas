/* Textos compartidos de la consola de operador (superadmin). */

export const PLANS = ['free', 'starter', 'pro', 'enterprise'] as const;

const PLAN_LABEL: Record<string, string> = { free: 'Gratis', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' };

export function planLabel(plan: string | null | undefined): string {
    if (!plan) return '—';
    return PLAN_LABEL[plan] ?? plan.charAt(0).toUpperCase() + plan.slice(1);
}

/** "1 clínica" / "3 clínicas" */
export function plural(n: number | string, one: string, many: string): string {
    const v = Number(n) || 0;
    return `${v.toLocaleString('es-ES')} ${v === 1 ? one : many}`;
}

const AUDIT_LABEL: Record<string, string> = {
    PLATFORM_SET_STATUS: 'Estado de clínica',
    PLATFORM_SET_COST: 'Costo por uso',
    PLATFORM_SET_PLAN: 'Cambio de plan',
    PLATFORM_ADJUST_CREDITS: 'Ajuste de créditos',
    PLATFORM_IMPERSONATE: 'Impersonación',
};

export function auditLabel(action: string): string {
    return AUDIT_LABEL[action] ?? action.replace(/^PLATFORM_/, '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

const DETAIL_KEY: Record<string, string> = {
    actor: 'Por',
    clinicId: 'Clínica',
    status: 'Estado',
    plan: 'Plan',
    action: 'Acción',
    credits: 'Créditos',
    delta: 'Ajuste',
    reason: 'Motivo',
    balanceAfter: 'Saldo final',
    targetEmail: 'Usuario',
    targetUserId: 'ID de usuario',
};

const DETAIL_VALUE: Record<string, Record<string, string>> = {
    status: { active: 'Activa', suspended: 'Suspendida' },
    action: { image: 'Imagen', video: 'Vídeo' },
};

/** Convierte el JSON de auditoría en pares legibles («Clave», «valor»). */
export function auditDetails(details: unknown): Array<[string, string]> {
    if (details == null) return [];
    if (typeof details === 'string') {
        try { details = JSON.parse(details); } catch { return [['Detalle', details as string]]; }
        if (details == null) return [];
    }
    if (typeof details !== 'object') return [['Detalle', String(details)]];
    return Object.entries(details as Record<string, unknown>)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => {
            let value: string;
            if (k === 'plan' && typeof v === 'string') value = planLabel(v);
            else if (k === 'delta' && typeof v === 'number') value = v > 0 ? `+${v}` : String(v);
            else if (typeof v === 'string') value = DETAIL_VALUE[k]?.[v] ?? v;
            else if (typeof v === 'number' || typeof v === 'boolean') value = String(v);
            else value = JSON.stringify(v);
            return [DETAIL_KEY[k] ?? k, value];
        });
}

/* Movimientos de créditos: mismos textos que el historial del panel de clínica
   (components/panel/credits/CreditsHistory.tsx). */
const LEDGER_KIND: Record<string, string> = { reserve: 'Consumo', refund: 'Devolución', topup: 'Recarga', adjust: 'Ajuste' };
const LEDGER_CONCEPT: Record<string, string> = {
    image: 'Simulación de imagen',
    video: 'Vídeo',
    topup: 'Recarga de saldo',
    adjust: 'Ajuste manual',
    refund: 'Reembolso de compra',
    welcome: 'Créditos de bienvenida',
};

export const ledgerKind = (kind: string) => LEDGER_KIND[kind] ?? kind;
export const ledgerConcept = (action: string | null | undefined) => (action ? LEDGER_CONCEPT[action] ?? action : null);
