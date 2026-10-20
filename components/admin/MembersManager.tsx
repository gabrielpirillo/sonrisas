'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, Trash2, Mail } from 'lucide-react';
import { authClient } from '@/lib/auth/client';

const ROLES = ['owner', 'admin', 'member'];
const ROLE_LABEL: Record<string, string> = { owner: 'Propietario', admin: 'Administrador', member: 'Miembro' };

export function MembersManager() {
    const [org, setOrg] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('member');
    const [inviting, setInviting] = useState(false);
    const [impersonating, setImpersonating] = useState(false);

    useEffect(() => {
        fetch('/api/me').then((r) => r.json()).then((d) => setImpersonating(Boolean(d?.user?.impersonating))).catch(() => {});
    }, []);

    const load = useCallback(async () => {
        const { data, error } = await authClient.organization.getFullOrganization();
        if (error) toast.error(error.message || 'No se pudo cargar la organización');
        setOrg(data);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    async function invite(e: React.FormEvent) {
        e.preventDefault();
        setInviting(true);
        const { error } = await authClient.organization.inviteMember({ email, role: role as any });
        setInviting(false);
        if (error) return toast.error(error.message || 'No se pudo invitar');
        toast.success('Invitación creada');
        setEmail('');
        load();
    }

    async function changeRole(memberId: string, newRole: string) {
        const { error } = await authClient.organization.updateMemberRole({ memberId, role: newRole as any });
        if (error) return toast.error(error.message);
        toast.success('Rol actualizado');
        load();
    }

    async function removeMember(memberIdOrEmail: string) {
        const { error } = await authClient.organization.removeMember({ memberIdOrEmail });
        if (error) return toast.error(error.message);
        toast.success('Miembro eliminado');
        load();
    }

    async function cancelInvite(invitationId: string) {
        const { error } = await authClient.organization.cancelInvitation({ invitationId });
        if (error) return toast.error(error.message);
        load();
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[0, 1, 2].map((i) => <div key={i} className="sf-skeleton" style={{ height: 58 }} />)}
            </div>
        );
    }
    if (!org) return <p style={{ fontSize: 14, color: 'var(--ink-3)' }}>Selecciona una clínica primero.</p>;

    const members = org.members ?? [];
    const invitations = (org.invitations ?? []).filter((i: any) => i.status === 'pending');
    const initials = (s: string) => s.split(/[\s@.]+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {impersonating ? (
                <p style={{ fontSize: 13.5, color: 'var(--ink-3)', margin: 0 }}>Invitar no está disponible durante una impersonación (solo lectura).</p>
            ) : (
                <form onSubmit={invite} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input
                        className="field"
                        type="email"
                        placeholder="email@clinica.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ flex: '1 1 200px', height: 44, fontSize: 14 }}
                        aria-label={`Email para invitar a ${org.name}`}
                    />
                    <select className="field" value={role} onChange={(e) => setRole(e.target.value)} style={{ width: 170, height: 44, fontSize: 14 }} aria-label="Rol">
                        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={inviting} style={{ height: 44 }}>
                        {inviting ? <Loader2 className="animate-spin" size={16} /> : <><Mail size={15} /> Invitar</>}
                    </button>
                </form>
            )}

            <div className="sf-list">
                {members.map((m: any, i: number) => {
                    const mail = m.user?.email ?? m.userId;
                    return (
                        <div key={m.id} className="sf-row" style={{ animationDelay: `${i * 40}ms`, padding: '10px 12px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                <span className="avatar" style={{ width: 34, height: 34, fontSize: 12, flexShrink: 0 }}>{initials(m.user?.name || mail || '?')}</span>
                                <span style={{ minWidth: 0 }}>
                                    <span style={{ display: 'block', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.user?.name || mail}</span>
                                    {m.user?.name && <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mail}</span>}
                                </span>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                {impersonating ? (
                                    <span className="sf-badge">{ROLE_LABEL[m.role] ?? m.role}</span>
                                ) : (
                                    <>
                                        <select className="field" value={m.role} onChange={(e) => changeRole(m.id, e.target.value)} style={{ width: 158, height: 36, fontSize: 13, padding: '0 38px 0 12px', backgroundPosition: 'right 12px center' }} aria-label="Cambiar rol">
                                            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                                        </select>
                                        <button className="icon-btn" onClick={() => removeMember(m.id)} aria-label="Eliminar miembro" title="Eliminar miembro">
                                            <Trash2 size={15} />
                                        </button>
                                    </>
                                )}
                            </span>
                        </div>
                    );
                })}
            </div>

            {invitations.length > 0 && (
                <div>
                    <span className="mono" style={{ fontSize: 9, display: 'block', marginBottom: 10 }}>INVITACIONES PENDIENTES · {invitations.length}</span>
                    <div className="sf-list">
                        {invitations.map((i: any) => (
                            <div key={i.id} className="sf-row" style={{ padding: '10px 12px', borderStyle: 'dashed' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                    <span className="avatar" style={{ width: 34, height: 34, flexShrink: 0 }}><Mail size={14} /></span>
                                    <span style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.email}</span>
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                    <span className="sf-badge">{ROLE_LABEL[i.role] ?? i.role}</span>
                                    {!impersonating && <button className="btn btn-ghost btn-sm" style={{ padding: '7px 12px', fontSize: 13 }} onClick={() => cancelInvite(i.id)}>Cancelar</button>}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
