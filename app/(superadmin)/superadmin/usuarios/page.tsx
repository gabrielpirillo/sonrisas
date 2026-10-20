import Link from 'next/link';
import { Search } from 'lucide-react';
import { getAllUsers } from '@/lib/platform/queries';
import { UserActions } from '@/components/platform/UserActions';
import { PageHead } from '@/components/admin/qoves/PageHead';
import { BreakableEmail } from '@/components/platform/BreakableEmail';

export const dynamic = 'force-dynamic';

function StatusPill({ banned }: { banned: boolean }) {
    return (
        <span className="status-pill">
            <span className="status-dot" style={{ background: banned ? 'var(--danger)' : 'var(--blue-deep)' }} />
            {banned ? 'Bloqueado' : 'Activo'}
        </span>
    );
}

const initials = (email: string) => (email || '?').split(/[\s@.]+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const date = (d: string) => new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const { q } = await searchParams;
    const users = await getAllUsers(q);
    return (
        <div className="admin-page">
            <PageHead eyebrow="CONSOLA DE OPERADOR" title="Usuarios" accent="de la plataforma" subtitle="Todas las personas con acceso, de todas las clínicas" />

            <form className="sa-search" action="/superadmin/usuarios" method="get" role="search">
                <label className="sa-search-field">
                    <Search size={17} aria-hidden />
                    <input
                        className="field"
                        type="search"
                        name="q"
                        placeholder="Buscar por email o nombre…"
                        defaultValue={q ?? ''}
                        aria-label="Buscar usuarios"
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        enterKeyHint="search"
                    />
                </label>
                <button className="btn btn-primary btn-sm" type="submit">Buscar</button>
                {q && <Link href="/superadmin/usuarios" className="sa-search-clear">Limpiar</Link>}
            </form>

            <div className="card sa-cq" style={{ overflow: 'hidden', padding: 0 }}>
                <div className="sa-card-head">
                    <h3 className="sa-card-title">Usuarios <span className="dim">{q ? 'encontrados' : 'registrados'}</span></h3>
                    <span className="mono sa-count">{users.length} EN TOTAL</span>
                </div>

                {users.length === 0 ? (
                    <div className="empty-state">Sin resultados{q ? ` para «${q}»` : ''}</div>
                ) : (
                    <>
                        <div className="sa-table-scroll sa-desktop-only">
                            <table className="lead-table" style={{ minWidth: 680 }}>
                                <thead>
                                    <tr><th>Email</th><th>Nombre</th><th>Clínicas</th><th>Estado</th><th>Alta</th><th><span className="sr-only">Acciones</span></th></tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => (
                                        <tr key={u.id} style={{ cursor: 'default' }}>
                                            <td style={{ maxWidth: 280 }}>
                                                <span className="sa-wrap" style={{ fontSize: 13.5, fontWeight: 500 }}>{u.email}</span>
                                                {u.role === 'admin' && <span className="sa-badge-platform" style={{ marginLeft: 8 }}>PLATAFORMA</span>}
                                            </td>
                                            <td style={{ fontSize: 13.5, whiteSpace: 'nowrap' }}>{u.name ?? '—'}</td>
                                            <td style={{ fontSize: 12.5, color: 'var(--ink-3)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={u.clinics || undefined}>{u.clinics || '—'}</td>
                                            <td><StatusPill banned={u.banned} /></td>
                                            <td className="mono" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>{date(u.createdAt)}</td>
                                            <td><UserActions userId={u.id} email={u.email} banned={u.banned} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <ul className="sa-mlist sa-mobile-only">
                            {users.map((u, i) => (
                                <li key={u.id} className="sa-mitem sa-user" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                                    <div className="sa-user-head">
                                        <span className="avatar">{initials(u.email)}</span>
                                        <div className="sa-mmain">
                                            <span className="sa-user-email sa-wrap"><BreakableEmail email={u.email} /></span>
                                            <span className="sa-mmeta">
                                                {u.name && <span>{u.name}</span>}
                                                {u.role === 'admin' && <span className="sa-badge-platform">PLATAFORMA</span>}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="sa-mmeta">
                                        <StatusPill banned={u.banned} />
                                        <span className="mono">ALTA · {date(u.createdAt)}</span>
                                    </div>
                                    {u.clinics && <p className="sa-user-clinics" style={{ margin: 0 }}>{u.clinics}</p>}
                                    <UserActions userId={u.id} email={u.email} banned={u.banned} labels />
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </div>
    );
}
