import { getCreditCosts, getSystemHealth } from '@/lib/platform/queries';
import { CostsForm } from '@/components/platform/CostsForm';
import { PageHead } from '@/components/admin/qoves/PageHead';

export const dynamic = 'force-dynamic';

const LABELS: Record<string, string> = { database: 'Base de datos', stripe: 'Stripe', flexprice: 'Flexprice', google: 'Google AI', smtp: 'SMTP (email)' };

export default async function ConfigPage() {
    const [costs, health] = await Promise.all([getCreditCosts(), getSystemHealth()]);
    return (
        <div className="admin-page">
            <PageHead eyebrow="CONSOLA DE OPERADOR" title="Configuración" accent="de la plataforma" subtitle="Costos por uso y salud del sistema" />

            <div className="config-grid">
                {/* Costos */}
                <div className="card" style={{ padding: 24 }}>
                    <span className="mono" style={{ fontSize: 9.5, color: 'var(--blue-deep)' }}>COSTOS POR USO</span>
                    <h3 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', margin: '10px 0 6px' }}>Créditos por acción</h3>
                    <p className="lead" style={{ fontSize: 13.5, marginBottom: 18 }}>Aplica a todas las clínicas.</p>
                    <CostsForm costs={costs} />
                </div>

                {/* Salud del sistema */}
                <div className="card" style={{ padding: 24 }}>
                    <span className="mono" style={{ fontSize: 9.5, color: 'var(--blue-deep)' }}>SALUD DEL SISTEMA</span>
                    <h3 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', margin: '10px 0 18px' }}>Estado de integraciones</h3>
                    <div className="sf-list">
                        {Object.entries(health).map(([k, ok]) => (
                            <div key={k} className="sf-row" style={{ padding: '12px 14px' }}>
                                <span style={{ fontSize: 14, fontWeight: 500 }}>{LABELS[k] ?? k}</span>
                                <span className="status-pill">
                                    <span className="status-dot" style={{ background: ok ? 'var(--blue-deep)' : 'var(--danger)' }} />
                                    {ok ? 'OK' : 'No configurado'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
