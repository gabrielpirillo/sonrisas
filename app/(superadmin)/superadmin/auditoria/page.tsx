import { getPlatformAudit } from '@/lib/platform/queries';
import { PageHead } from '@/components/admin/qoves/PageHead';

export const dynamic = 'force-dynamic';

export default async function AuditoriaPage() {
    const rows = await getPlatformAudit();
    return (
        <div className="admin-page">
            <PageHead eyebrow="CONSOLA DE OPERADOR" title="Auditoría" accent="de actividad" subtitle="Acciones recientes de la plataforma" />

            <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--line)' }}>
                    <h3 style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Registro <span style={{ color: 'var(--ink-3)' }}>de actividad</span></h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="lead-table" style={{ minWidth: 640 }}>
                        <thead>
                            <tr><th>Fecha</th><th>Acción</th><th>Detalles</th></tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={i} style={{ cursor: 'default' }}>
                                    <td className="mono" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleString('es')}</td>
                                    <td>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 11px', border: '1px solid var(--blue-line)', background: 'var(--blue-tint)', borderRadius: 99, fontSize: 10, color: 'var(--blue-ink)' }} className="mono">
                                            {r.action.replace('PLATFORM_', '')}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={JSON.stringify(r.details)}>{JSON.stringify(r.details)}</td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr><td colSpan={3} style={{ padding: 0 }}><div className="empty-state">Sin registros todavía</div></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
