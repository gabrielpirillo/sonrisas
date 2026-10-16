'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, Trash2, Mail } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const ROLES = ['owner', 'admin', 'member'];

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

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    if (!org) return <p className="text-muted-foreground">Selecciona una clínica primero.</p>;

    const members = org.members ?? [];
    const invitations = (org.invitations ?? []).filter((i: any) => i.status === 'pending');

    return (
        <div className="space-y-6">
            {impersonating ? (
                <Card><CardHeader><CardTitle>Invitar miembro</CardTitle>
                    <CardDescription>No disponible durante una impersonación (solo lectura).</CardDescription></CardHeader></Card>
            ) : (
            <Card>
                <CardHeader><CardTitle>Invitar miembro</CardTitle>
                    <CardDescription>Agrega usuarios a {org.name}</CardDescription></CardHeader>
                <CardContent>
                    <form onSubmit={invite} className="flex gap-2 flex-wrap items-end">
                        <div className="flex-1 min-w-[200px] space-y-1">
                            <Input type="email" placeholder="email@clinica.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button type="submit" disabled={inviting}>{inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Mail className="h-4 w-4 mr-1" />Invitar</>}</Button>
                    </form>
                </CardContent>
            </Card>
            )}

            <Card>
                <CardHeader><CardTitle>Miembros</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Usuario</TableHead><TableHead>Rol</TableHead><TableHead></TableHead></TableRow></TableHeader>
                        <TableBody>
                            {members.map((m: any) => (
                                <TableRow key={m.id}>
                                    <TableCell>{m.user?.email ?? m.userId}</TableCell>
                                    <TableCell>
                                        {impersonating ? (
                                            <Badge variant="secondary">{m.role}</Badge>
                                        ) : (
                                            <Select value={m.role} onValueChange={(v) => changeRole(m.id, v)}>
                                                <SelectTrigger className="w-[120px] h-8"><SelectValue /></SelectTrigger>
                                                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                                            </Select>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {!impersonating && <Button variant="ghost" size="sm" onClick={() => removeMember(m.id)}><Trash2 className="h-4 w-4" /></Button>}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {invitations.length > 0 && (
                <Card>
                    <CardHeader><CardTitle>Invitaciones pendientes</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableBody>
                                {invitations.map((i: any) => (
                                    <TableRow key={i.id}>
                                        <TableCell>{i.email}</TableCell>
                                        <TableCell><Badge variant="secondary">{i.role}</Badge></TableCell>
                                        <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => cancelInvite(i.id)}>Cancelar</Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
