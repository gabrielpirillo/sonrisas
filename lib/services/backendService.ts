
import { db } from '@/lib/db';
import { resolveClinic, getBalance, getCreditCost } from '@/lib/billing/credits';

/**
 * Logs API usage to database for tracking and quota management.
 */
export async function logApiUsage(serviceName: string) {
    try {
        await db.query(
            `INSERT INTO api_usage_logs (service_name, timestamp) VALUES ($1, $2)`,
            [serviceName, new Date().toISOString()]
        );
    } catch (e) {
        console.error('[BackendService] logApiUsage crashed:', e);
    }
}

/**
 * Persists detailed audit logs for AI interactions and system events.
 */
export async function logAudit(action: string, details: any) {
    try {
        console.log(`[AUDIT] ${action}:`, JSON.stringify(details, null, 2));
        await db.query(
            `INSERT INTO audit_logs (action, details, created_at) VALUES ($1, $2, $3)`,
            [action, JSON.stringify(details), new Date().toISOString()]
        );
    } catch (e) {
        console.error('[BackendService] logAudit crashed:', e);
    }
}

/**
 * Checks whether a clinic has enough prepaid credits to generate a video.
 *
 * NOTE: actual gating is enforced atomically inside /api/ai/video/generate via
 * lib/billing/credits.reserve(). This helper is a non-atomic, read-only
 * pre-check for UI hints (e.g. disabling the "generate video" button).
 */
export async function checkVideoQuota(clinicKey?: string): Promise<boolean> {
    try {
        const clinic = await resolveClinic(clinicKey);
        if (!clinic) return false;
        const cost = await getCreditCost('video');
        const balance = await getBalance(clinic.id);
        return balance >= cost;
    } catch (e) {
        console.error('[BackendService] checkVideoQuota failed:', e);
        return false;
    }
}

/**
 * @deprecated Credit accounting now happens through the reserve → confirm /
 * refund lifecycle in lib/billing/credits.ts, driven by the AI routes. Kept as
 * a no-op for backwards compatibility.
 */
export async function markVideoQuotaUsed() {
    console.warn('[BackendService] markVideoQuotaUsed() is deprecated; credits are handled by lib/billing/credits.');
}
