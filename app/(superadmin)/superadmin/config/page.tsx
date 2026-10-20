import { getCreditCosts, getSystemHealth } from '@/lib/platform/queries';
import { CostsForm } from '@/components/platform/CostsForm';
import { PageHead } from '@/components/admin/qoves/PageHead';
import { PackagesEditor } from '@/components/platform/PackagesEditor';
import { listAllPackagesAction } from '@/lib/billing/actions';

export const dynamic = 'force-dynamic';

const LABELS: Record<string, string> = { database: 'Base de datos', stripe: 'Stripe', flexprice: 'Flexprice', google: 'Google AI', smtp: 'SMTP (email)' };

export default async function ConfigPage() {
    const [costs, health, pkgs] = await Promise.all([getCreditCosts(), getSystemHealth(), listAllPackagesAction()]);
    const pkgError = 'error' in pkgs ? pkgs.error : undefined;
    const packages = Array.isArray(pkgs) ? pkgs : [];
    const entries = Object.entries(health);
    const okCount = entries.filter(([, ok]) => ok).length;
    return (
        <div className="admin-page">
            <PageHead eyebrow="CONSOLA DE OPERADOR" title="Configuración" accent="de la plataforma" subtitle="Costos por uso, paquetes de créditos y salud del sistema" />

            <div className="config-grid">
                {/* Costos */}
                <section className="card sa-pad" aria-labelledby="sa-costs-title">
                    <span className="mono sa-eyebrow">COSTOS POR USO</span>
                    <h3 id="sa-costs-title" className="sa-h3" style={{ fontSize: 18, margin: '10px 0 6px' }}>Créditos por acción</h3>
                    <p className="lead" style={{ fontSize: 13.5, marginBottom: 18 }}>Aplica a todas las clínicas.</p>
                    <CostsForm costs={costs} />
                </section>

                {/* Salud del sistema */}
                <section className="card sa-pad" aria-labelledby="sa-health-title">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                        <span className="mono sa-eyebrow">SALUD DEL SISTEMA</span>
                        <span className="mono sa-count">{okCount}/{entries.length} OK</span>
                    </div>
                    <h3 id="sa-health-title" className="sa-h3" style={{ fontSize: 18, margin: '10px 0 18px' }}>Estado de integraciones</h3>
                    <div className="sf-list">
                        {entries.map(([k, ok]) => (
                            <div key={k} className="sf-row sa-health-row">
                                <span style={{ fontSize: 14, fontWeight: 500, minWidth: 0 }}>{LABELS[k] ?? k}</span>
                                <span className="status-pill">
                                    <span className="status-dot" style={{ background: ok ? 'var(--blue-deep)' : 'var(--danger)' }} />
                                    {ok ? 'OK' : 'No configurado'}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Paquetes de créditos */}
                <section className="card sa-pad" style={{ gridColumn: '1 / -1' }} aria-labelledby="sa-pkgs-title">
                    <span className="mono sa-eyebrow">CATÁLOGO</span>
                    <h3 id="sa-pkgs-title" className="sa-h3" style={{ fontSize: 18, margin: '10px 0 6px' }}>Paquetes de créditos</h3>
                    <PackagesEditor initial={packages} loadError={pkgError} />
                </section>
            </div>
        </div>
    );
}
