import { redirect } from 'next/navigation';
import { getPlatformAdmin, ensurePlatformAdminRole } from '@/lib/auth/platform';
import { SuperSidebar } from '@/components/platform/SuperSidebar';
import '@/app/(admin)/qoves-admin.css';

export const dynamic = 'force-dynamic';

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    const email = await getPlatformAdmin();
    if (!email) redirect('/administracion/dashboard');
    await ensurePlatformAdminRole();

    return (
        <div className="qoves-admin" style={{ height: '100vh', overflow: 'hidden' }}>
            <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
                <div className="qoves-desktop-sidebar">
                    <SuperSidebar email={email} />
                </div>
                <main className="main-scroll">{children}</main>
            </div>
        </div>
    );
}
