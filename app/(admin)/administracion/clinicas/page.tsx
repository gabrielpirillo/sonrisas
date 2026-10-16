'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Check, Plus } from 'lucide-react';
import { authClient, useListOrganizations, useActiveOrganization } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>Nueva clínica</CardTitle>
                    <CardDescription>Crea otra organización (clínica) con su propio saldo y widget</CardDescription></CardHeader>
                <CardContent>
                    <form onSubmit={createClinic} className="flex gap-2 flex-wrap items-end">
                        <Input className="flex-1 min-w-[220px]" placeholder="Nombre de la clínica" value={name} onChange={(e) => setName(e.target.value)} required />
                        <Button type="submit" disabled={creating}>{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" />Crear</>}</Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Mis clínicas</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                    {(orgs ?? []).map((o) => (
                        <div key={o.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                            <span>{o.name}</span>
                            {activeOrg?.id === o.id ? (
                                <span className="text-sm text-green-600 flex items-center gap-1"><Check className="h-4 w-4" /> Activa</span>
                            ) : (
                                <Button variant="outline" size="sm" onClick={() => setActive(o.id)}>Activar</Button>
                            )}
                        </div>
                    ))}
                    {(orgs ?? []).length === 0 && <p className="text-muted-foreground text-sm">Aún no tienes clínicas.</p>}
                </CardContent>
            </Card>
        </div>
    );
}
