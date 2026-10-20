import { redirect } from 'next/navigation';
import { getPlatformAdmin, ensurePlatformAdminRole } from '@/lib/auth/platform';
import { SuperSidebar, SuperMobileBar } from '@/components/platform/SuperSidebar';
import { MotionPrefs } from '@/components/platform/MotionPrefs';
import '@/app/(admin)/qoves-admin.css';
import '@/components/platform/platform.css';

export const dynamic = 'force-dynamic';

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    const email = await getPlatformAdmin();
    if (!email) redirect('/administracion/dashboard');
    await ensurePlatformAdminRole();

    return (
        <div className="qoves-admin qoves-super">
            <div className="sa-shell">
                <SuperMobileBar />
                <div className="sa-body">
                    <div className="qoves-desktop-sidebar">
                        <SuperSidebar email={email} />
                    </div>
                    <main className="main-scroll" id="sa-main">
                        <MotionPrefs>{children}</MotionPrefs>
                    </main>
                </div>
            </div>
        </div>
    );
}
