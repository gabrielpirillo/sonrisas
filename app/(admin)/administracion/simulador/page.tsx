import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, KeyRound } from "lucide-react";
import { getAuthContext } from "@/lib/auth/context";
import { getCreditCost } from "@/lib/billing/credits";
import { PageHead } from "@/components/admin/qoves/PageHead";
import { SimulatorStudio } from "@/components/admin/simulator/SimulatorStudio";

export const dynamic = "force-dynamic";

/* Simulador: el widget real, en vivo, para usarlo en consulta o en una demo. */
export default async function SimuladorPage() {
    const ctx = await getAuthContext();
    if (!ctx) redirect("/acceso");

    const clinic = ctx.clinic;
    const isManager = Boolean(ctx.role && ["owner", "admin"].includes(ctx.role));

    if (!clinic || !clinic.public_widget_key) {
        return (
            <div className="admin-page">
                <PageHead eyebrow="OPERACIÓN" title="Simulador" accent="en vivo" />
                <div className="card empty-state">
                    <span className="empty-ic">{clinic ? <KeyRound size={22} /> : <Building2 size={22} />}</span>
                    <strong style={{ color: "var(--ink)", fontSize: 16 }}>
                        {clinic ? "Tu widget aún no está activo" : "Selecciona una clínica"}
                    </strong>
                    <span style={{ fontSize: 14, maxWidth: 420 }}>
                        {clinic
                            ? "Esta clínica todavía no tiene una clave de widget. Configúralo para poder usar el simulador."
                            : "Elige la clínica en el menú lateral para abrir su simulador."}
                    </span>
                    {clinic && isManager && (
                        <Link href="/administracion/widget" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>
                            Configurar widget
                        </Link>
                    )}
                </div>
            </div>
        );
    }

    let imageCost: number | null = null;
    try {
        imageCost = await getCreditCost("image");
    } catch (err) {
        console.error("[simulador] credit cost failed:", err);
    }

    return (
        <div className="admin-page sim-page">
            <SimulatorStudio
                widgetKey={clinic.public_widget_key}
                clinicName={clinic.name}
                balance={clinic.credit_balance ?? 0}
                imageCost={imageCost && imageCost > 0 ? imageCost : null}
                canRecharge={isManager && !ctx.impersonatedBy}
                impersonating={Boolean(ctx.impersonatedBy)}
            />
        </div>
    );
}
