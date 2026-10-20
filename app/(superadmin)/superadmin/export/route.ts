import { getClinicsList } from '@/lib/platform/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const rows = await getClinicsList();
        const header = ['name', 'slug', 'plan', 'status', 'credit_balance', 'members', 'leads', 'images', 'videos', 'created_at'];
        const csv = [
            header.join(','),
            ...rows.map((r) => [r.name, r.slug, r.plan, r.status, r.credit_balance, r.members, r.leads, r.images, r.videos, r.created_at]
                .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')),
        ].join('\n');
        return new Response(csv, {
            headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="clinicas.csv"' },
        });
    } catch (e) {
        return new Response((e instanceof Error && e.message) || 'error', { status: 403 });
    }
}
