'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Building2, Check, Loader2, Plus } from 'lucide-react';
import { authClient, useListOrganizations, useActiveOrganization } from '@/lib/auth/client';
import { PageHead } from '@/components/admin/qoves/PageHead';

function slugify(s: string): string {
    return (
        s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 32) || 'clinica'
    ) + '-' + Math.random().toString(36).slice(2, 6);
}

export default function ClinicasPage() {
    const router = useRouter();
    const { data: orgs, refetch } = useListOrganizations();
    const { data: activeOrg } = useActiveOrganization();
    const [name, setName] = useState('');
    const [creating, setCreating] = useState(false);

    async function createClinic(e: React.FormEvent) {
        e.preventDefault();
        setCreating(true);
        try {
            const created = await authClient.organization.create({ name, slug: slugify(name) });
            const orgId = (created as any)?.data?.id;
            if (orgId) await authClient.organization.setActive({ organizationId: orgId });
            toast.success('Clínica creada');
            setName('');
            refetch?.();
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || 'No se pudo crear la clínica');
        } finally {
            setCreating(false);
        }
    }

    async function setActive(id: string) {
        await authClient.organization.setActive({ organizationId: id });
        router.refresh();
    }

    const list = orgs ?? [];
    const initials = (n: string) => n.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div className="admin-page">
            <PageHead eyebrow="ORGANIZACIÓN" title="Mis" accent="clínicas" subtitle="Cada clínica tiene su propio saldo, leads y widget." />

            <div className="config-grid">
                <div className="card" style={{ padding: 24 }}>
                    <span className="mono" style={{ fontSize: 9.5, color: 'var(--blue-deep)' }}>CLÍNICAS · {list.length}</span>
                    <h3 style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', margin: '6px 0 18px' }}>
                        Tus <span style={{ color: 'var(--ink-3)' }}>organizaciones</span>
                    </h3>
                    {list.length === 0 ? (
                        <div className="empty-state" style={{ padding: '28px 12px' }}>
                            <span className="empty-ic"><Building2 size={22} /></span>
                            <span style={{ fontSize: 14 }}>Aún no tienes clínicas.</span>
                        </div>
                    ) : (
                        <div className="sf-list">
                            {list.map((o, i) => {
                                const active = activeOrg?.id === o.id;
                                return (
                                    <div key={o.id} className={`sf-row${active ? ' sf-row-active' : ''}`} style={{ animationDelay: `${i * 50}ms` }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                                            <span className="avatar" style={{ width: 38, height: 38, flexShrink: 0, background: active ? 'linear-gradient(135deg, var(--blue-deep), var(--navy-2))' : undefined, color: active ? '#fff' : undefined }}>
                                                {initials(o.name)}
                                            </span>
                                            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</span>
                                        </span>
                                        {active ? (
                                            <span className="sf-badge"><Check size={14} /> Activa</span>
                                        ) : (
                                            <button className="btn btn-ghost btn-sm" onClick={() => setActive(o.id)}>Activar</button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="card card-navy" style={{ padding: 24 }}>
                    <span className="mono" style={{ fontSize: 9.5 }}>NUEVA CLÍNICA</span>
                    <h3 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', margin: '8px 0 8px' }}>
                        Suma otra sede <span style={{ color: 'var(--blue-light)' }}>en segundos.</span>
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.62)', fontSize: 14, lineHeight: 1.55, margin: '0 0 20px' }}>
                        Se crea con su propio saldo y su widget, y queda activa al instante.
                    </p>
                    <form onSubmit={createClinic} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <input
                            className="field"
                            placeholder="Nombre de la clínica"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            style={{ height: 48 }}
                        />
                        <button type="submit" className="btn btn-white" disabled={creating} style={{ justifyContent: 'center' }}>
                            {creating ? <Loader2 className="animate-spin" size={16} /> : <><Plus size={16} /> Crear clínica</>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
