/**
 * Arranque del servidor (Next.js): tareas periódicas internas.
 * Cada 10 min concilia con Stripe las compras de créditos que quedaron
 * pendientes (por si un webhook no llegó). Es idempotente y barato.
 */
export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NODE_ENV !== 'production') return;
    const g = globalThis as typeof globalThis & { __sfReconcile?: ReturnType<typeof setInterval> };
    if (g.__sfReconcile) return;
    const run = async () => {
        try {
            const { reconcilePendingPurchases } = await import('@/lib/billing/reconcile');
            await reconcilePendingPurchases();
        } catch (e) {
            console.error('[billing-reconcile] Fallo en la tarea periódica', e);
        }
    };
    g.__sfReconcile = setInterval(run, 10 * 60_000);
    setTimeout(run, 60_000);
}
