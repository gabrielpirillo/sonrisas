/**
 * Arranque del servidor (Next.js): tareas periódicas internas.
 * - Cada 10 min concilia con Stripe las compras de créditos que quedaron
 *   pendientes (por si un webhook no llegó). Es idempotente y barato.
 * - Cada 6 h ejecuta la retención de datos (lib/retention.ts): selfies > 24 h,
 *   simulaciones y leads fuera de plazo y bajas de clínica vencidas. Usa un
 *   advisory lock, así que varias instancias no lo ejecutan a la vez.
 */
export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NODE_ENV !== 'production') return;
    const g = globalThis as typeof globalThis & {
        __sfReconcile?: ReturnType<typeof setInterval>;
        __sfRetention?: ReturnType<typeof setInterval>;
    };

    if (!g.__sfReconcile) {
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

    if (!g.__sfRetention) {
        const runRetentionTask = async () => {
            try {
                const { runRetention } = await import('@/lib/retention');
                const report = await runRetention();
                console.log('[retention] Ejecución completada', report);
            } catch (e) {
                console.error('[retention] Fallo en la tarea periódica', e);
            }
        };
        g.__sfRetention = setInterval(runRetentionTask, 6 * 60 * 60_000);
        setTimeout(runRetentionTask, 5 * 60_000);
    }
}
