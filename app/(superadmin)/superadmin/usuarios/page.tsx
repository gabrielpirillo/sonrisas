import { getAllUsers } from '@/lib/platform/queries';
import { UserActions } from '@/components/platform/UserActions';
import { PageHead } from '@/components/admin/qoves/PageHead';

export const dynamic = 'force-dynamic';

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const { q } = await searchParams;
    const users = await getAllUsers(q);
    return (
        <div className="admin-page">
            <PageHead eyebrow="CONSOLA DE OPERADOR" title="Usuarios" accent="de la plataforma" subtitle="Todas las personas con acceso, de todas las clínicas" />

            <form style={{ display: 'flex', gap: 10, maxWidth: 520, flexWrap: 'wrap' }} action="/superadmin/usuarios" method="get">
                <input className="field" name="q" placeholder="Buscar por email o nombre…" defaultValue={q ?? ''} style={{ height: 44, fontSize: 14, flex: '1 1 220px' }} aria-label="Buscar usuarios" />
                <button className="btn btn-primary btn-sm" type="submit">Buscar</button>
            </form>

            <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Usuarios <span style={{ color: 'var(--ink-3)' }}>{q ? 'encontrados' : 'registrados'}</span></h3>
                    <span className="mono" style={{ fontSize: 9.5, color: 'var(--blue-deep)' }}>{users.length} EN TOTAL</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="lead-table" style={{ minWidth: 760 }}>
                        <thead>
                            <tr><th>Email</th><th>Nombre</th><th>Clínicas</th><th>Estado</th><th>Alta</th><th></th></tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id} style={{ cursor: 'default' }}>
                                    <td>
                                        <span style={{ fontSize: 13.5, fontWeight: 500 }}>{u.email}</span>
                                        {u.role === 'admin' && <span className="mono" style={{ fontSize: 8.5, marginLeft: 8, color: '#fff', background: 'var(--navy-2)', padding: '3px 8px', borderRadius: 99 }}>PLATAFORMA</span>}
                                    </td>
                                    <td style={{ fontSize: 13.5, whiteSpace: 'nowrap' }}>{u.name ?? '—'}</td>
                                    <td style={{ fontSize: 12.5, color: 'var(--ink-3)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.clinics || '—'}</td>
                                    <td>
                                        <span className="status-pill">
                                            <span className="status-dot" style={{ background: u.banned ? 'var(--danger)' : 'var(--blue-deep)' }} />
                                            {u.banned ? 'Bloqueado' : 'Activo'}
                                        </span>
                                    </td>
                                    <td className="mono" style={{ fontSize: 10 }}>{new Date(u.createdAt).toLocaleDateString('es')}</td>
                                    <td><UserActions userId={u.id} email={u.email} banned={u.banned} /></td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr><td colSpan={6} style={{ padding: 0 }}><div className="empty-state">Sin resultados{q ? ` para “${q}”` : ''}</div></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
