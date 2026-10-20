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
    const [myEmail, setMyEmail] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/me')
            .then((r) => r.json())
            .then((d) => {
                setImpersonating(Boolean(d?.user?.impersonating));
                setMyEmail(typeof d?.user?.email === 'string' ? d.user.email.toLowerCase() : null);
            })
            .catch(() => {});
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
        setBusyId(memberId);
        const { error } = await authClient.organization.updateMemberRole({ memberId, role: newRole as any });
        setBusyId(null);
        if (error) return toast.error(error.message || 'No se pudo cambiar el rol');
        toast.success('Rol actualizado');
        load();
    }

    async function removeMember(memberIdOrEmail: string, label: string) {
        if (!window.confirm(`¿Quitar a ${label} del equipo? Perderá el acceso a esta clínica.`)) return;
        setBusyId(memberIdOrEmail);
        const { error } = await authClient.organization.removeMember({ memberIdOrEmail });
        setBusyId(null);
        if (error) return toast.error(error.message || 'No se pudo quitar al miembro');
        toast.success('Miembro eliminado');
        load();
    }

    async function cancelInvite(invitationId: string) {
        setBusyId(invitationId);
        const { error } = await authClient.organization.cancelInvitation({ invitationId });
        setBusyId(null);
        if (error) return toast.error(error.message || 'No se pudo cancelar la invitación');
        toast.success('Invitación cancelada');
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
                <form onSubmit={invite} className="mm-invite">
                    <input
                        className="field mm-email"
                        type="email"
                        inputMode="email"
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        enterKeyHint="send"
                        placeholder="email@clinica.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        aria-label={`Email para invitar a ${org.name}`}
                    />
                    <select className="field mm-role" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Rol de la persona invitada">
                        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={inviting}>
                        {inviting ? <Loader2 className="animate-spin" size={16} /> : <><Mail size={15} /> Invitar</>}
                    </button>
                </form>
            )}

            <div className="sf-list">
                {members.map((m: any, i: number) => {
                    const mail = m.user?.email ?? m.userId;
                    const who = m.user?.name || mail;
                    const isMe = Boolean(myEmail && typeof m.user?.email === 'string' && m.user.email.toLowerCase() === myEmail);
                    return (
                        <div key={m.id} className="sf-row mm-row" style={{ animationDelay: `${i * 40}ms` }}>
                            <span className="mm-who">
                                <span className="avatar" style={{ width: 34, height: 34, fontSize: 12, flexShrink: 0 }}>{initials(who || '?')}</span>
                                <span style={{ minWidth: 0 }}>
                                    <span className="mm-name">
                                        <span title={who}>{who}</span>
                                        {isMe && <span className="mm-you">Tú</span>}
                                    </span>
                                    {m.user?.name && <span className="mm-mail" title={mail}>{mail}</span>}
                                </span>
                            </span>
                            <span className="mm-actions">
                                {impersonating || isMe ? (
                                    <span className="sf-badge">{ROLE_LABEL[m.role] ?? m.role}</span>
                                ) : (
                                    <>
                                        <select className="field" value={m.role} onChange={(e) => changeRole(m.id, e.target.value)} disabled={busyId === m.id} aria-label={`Rol de ${who}`}>
                                            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                                        </select>
                                        <button type="button" className="icon-btn icon-btn-danger" onClick={() => removeMember(m.id, who)} disabled={busyId === m.id} aria-label={`Quitar a ${who} del equipo`} title="Quitar del equipo">
                                            {busyId === m.id ? <Loader2 className="animate-spin" size={15} /> : <Trash2 size={15} />}
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
                    <div className="sf-list mm-invites">
                        {invitations.map((i: any) => (
                            <div key={i.id} className="sf-row mm-row" style={{ borderStyle: 'dashed' }}>
                                <span className="mm-who">
                                    <span className="avatar" style={{ width: 34, height: 34, flexShrink: 0 }}><Mail size={14} /></span>
                                    <span className="mm-name" style={{ fontWeight: 500 }}><span title={i.email}>{i.email}</span></span>
                                </span>
                                <span className="mm-actions">
                                    <span className="sf-badge">{ROLE_LABEL[i.role] ?? i.role}</span>
                                    {!impersonating && (
                                        <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '7px 14px', fontSize: 13 }} onClick={() => cancelInvite(i.id)} disabled={busyId === i.id} aria-label={`Cancelar la invitación de ${i.email}`}>
                                            {busyId === i.id ? <Loader2 className="animate-spin" size={14} /> : 'Cancelar'}
                                        </button>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
