import { ScrollText } from 'lucide-react';
import { getPlatformAudit } from '@/lib/platform/queries';
import { auditDetails, auditLabel } from '@/components/platform/labels';
import { PageHead } from '@/components/admin/qoves/PageHead';

export const dynamic = 'force-dynamic';

const when = (d: string) =>
    new Date(d).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Valores técnicos (ids, emails) en monoespaciada para leerlos mejor. */
const isCode = (v: string) => /^[0-9a-f-]{16,}$/i.test(v) || v.includes('@');

export default async function AuditoriaPage() {
    const rows = await getPlatformAudit();
    return (
        <div className="admin-page">
            <PageHead eyebrow="CONSOLA DE OPERADOR" title="Auditoría" accent="de actividad" subtitle="Acciones recientes de la plataforma" />

            <div className="card sa-cq" style={{ overflow: 'hidden', padding: 0 }}>
                <div className="sa-card-head">
                    <h3 className="sa-card-title">Registro <span className="dim">de actividad</span></h3>
                    {rows.length > 0 && <span className="mono sa-count">{rows.length === 100 ? 'ÚLTIMOS 100' : `${rows.length} EN TOTAL`}</span>}
                </div>

                {rows.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-ic"><ScrollText size={22} aria-hidden /></span>
                        <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>Sin registros todavía</strong>
                        <span style={{ fontSize: 14, maxWidth: '34ch' }}>Aquí aparecerán los cambios de plan, créditos, costos e impersonaciones.</span>
                    </div>
                ) : (
                    <>
                        <div className="sa-table-scroll sa-desktop-only">
                            <table className="lead-table" style={{ minWidth: 600 }}>
                                <thead>
                                    <tr><th>Fecha</th><th>Acción</th><th>Detalles</th></tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, i) => {
                                        const det = auditDetails(r.details);
                                        return (
                                            <tr key={i} style={{ cursor: 'default' }}>
                                                <td className="mono" style={{ fontSize: 10, whiteSpace: 'nowrap', verticalAlign: 'top' }}>{when(r.created_at)}</td>
                                                <td style={{ verticalAlign: 'top' }}><span className="sa-action-chip" title={r.action}>{auditLabel(r.action)}</span></td>
                                                <td title={JSON.stringify(r.details)} style={{ maxWidth: 560 }}>
                                                    <span className="sa-audit-inline">
                                                        {det.length === 0 ? '—' : det.map(([k, v], j) => (
                                                            <span key={k}>{j > 0 && ' · '}<b>{k}:</b> {v}</span>
                                                        ))}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <ul className="sa-mlist sa-mobile-only">
                            {rows.map((r, i) => {
                                const det = auditDetails(r.details);
                                return (
                                    <li key={i} className="sa-mitem sa-audit" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                                        <div className="sa-audit-head">
                                            <span className="sa-action-chip" title={r.action}>{auditLabel(r.action)}</span>
                                            <time className="mono" dateTime={new Date(r.created_at).toISOString()}>{when(r.created_at)}</time>
                                        </div>
                                        {det.length > 0 && (
                                            <dl className="sa-kv">
                                                {det.map(([k, v]) => (
                                                    <div key={k} style={{ display: 'contents' }}>
                                                        <dt>{k}</dt>
                                                        <dd className={isCode(v) ? 'sa-kv-mono' : undefined}>{v}</dd>
                                                    </div>
                                                ))}
                                            </dl>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                )}
            </div>
        </div>
    );
}
