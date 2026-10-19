import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { getAuthContext } from "@/lib/auth/context";
import { getWidgetConfigByClinicId } from "@/lib/widgetConfig.server";
import { DEFAULT_WIDGET_CONFIG } from "@/lib/widgetConfig";
import { PageHead } from "@/components/admin/qoves/PageHead";
import { WidgetStudio } from "@/components/admin/widget-studio/WidgetStudio";

export const dynamic = "force-dynamic";

export default async function WidgetPage() {
    const ctx = await getAuthContext();
    if (!ctx) redirect("/acceso");
    // Solo owner/admin de la clínica; el resto va a sus leads.
    if (!ctx.role || !["owner", "admin"].includes(ctx.role)) redirect("/administracion/leads");
    // Durante una impersonación se puede revisar, pero no editar.
    const readOnly = Boolean(ctx.impersonatedBy);

    const clinic = ctx.clinic;
    if (!clinic) {
        return (
            <div className="admin-page">
                <PageHead eyebrow="GESTIÓN" title="Tu widget," accent="a tu manera" />
                <div className="card empty-state">
                    <span className="empty-ic"><Building2 size={22} /></span>
                    <strong style={{ color: "var(--ink)", fontSize: 16 }}>Selecciona una clínica</strong>
                    <span style={{ fontSize: 14 }}>Elige la clínica en el menú lateral para personalizar su widget.</span>
                </div>
            </div>
        );
    }

    let data: Awaited<ReturnType<typeof getWidgetConfigByClinicId>> = null;
    try {
        data = await getWidgetConfigByClinicId(clinic.id);
    } catch (err) {
        console.error("[widget] load config failed:", err);
    }

    return (
        <div className="admin-page ws-page">
            <WidgetStudio
                initialConfig={data?.config ?? DEFAULT_WIDGET_CONFIG}
                initialUpdatedAt={data?.updatedAt ? new Date(data.updatedAt).toISOString() : null}
                clinicName={data?.clinicName ?? clinic.name}
                widgetKey={clinic.public_widget_key ?? null}
                readOnly={readOnly}
            />
        </div>
    );
}
