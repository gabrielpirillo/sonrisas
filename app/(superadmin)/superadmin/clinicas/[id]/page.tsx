import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getClinicDetail } from '@/lib/platform/queries';
import { ClinicActions } from '@/components/platform/ClinicActions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function ClinicDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const c = await getClinicDetail(id);
    if (!c) notFound();

    return (
        <div className="space-y-6">
            <Link href="/superadmin" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Todas las clínicas</Link>
            <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{c.name}</h1>
                <Badge variant="outline">{c.plan}</Badge>
                <Badge variant={c.status === 'active' ? 'secondary' : 'destructive'}>{c.status}</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card><CardHeader className="pb-2"><CardDescription>Saldo</CardDescription></CardHeader><CardContent><p className="text-2xl font-bold">{c.credit_balance}</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardDescription>Miembros</CardDescription></CardHeader><CardContent><p className="text-2xl font-bold">{c.members}</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardDescription>Imágenes</CardDescription></CardHeader><CardContent><p className="text-2xl font-bold">{c.images}</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardDescription>Videos</CardDescription></CardHeader><CardContent><p className="text-2xl font-bold">{c.videos}</p></CardContent></Card>
            </div>

            <Card>
                <CardHeader><CardTitle>Acciones</CardTitle></CardHeader>
                <CardContent><ClinicActions clinicId={c.id} currentPlan={c.plan} status={c.status} /></CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Datos</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                    <div><span className="text-muted-foreground">Slug:</span> {c.slug}</div>
                    <div><span className="text-muted-foreground">Widget key:</span> <code className="text-xs">{c.public_widget_key}</code></div>
                    <div><span className="text-muted-foreground">Leads:</span> {c.leads}</div>
                    <div><span className="text-muted-foreground">Stripe:</span> {c.stripe_customer_id || '—'}</div>
                    <div><span className="text-muted-foreground">Flexprice:</span> {c.flexprice_customer_id || '—'}</div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Miembros</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Rol</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {c.membersList.map((m, i) => (
                                <TableRow key={i}><TableCell>{m.email}</TableCell><TableCell><Badge variant="secondary">{m.role}</Badge></TableCell></TableRow>
                            ))}
                            {c.membersList.length === 0 && <TableRow><TableCell colSpan={2} className="text-muted-foreground text-center">Sin miembros</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Movimientos de créditos</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>Acción</TableHead><TableHead className="text-right">Δ</TableHead><TableHead className="text-right">Saldo</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {c.ledger.map((l, i) => (
                                <TableRow key={i}>
                                    <TableCell className="text-xs">{new Date(l.created_at).toLocaleString()}</TableCell>
                                    <TableCell>{l.kind}</TableCell>
                                    <TableCell>{l.action ?? '-'}</TableCell>
                                    <TableCell className={`text-right ${l.credits_delta < 0 ? 'text-red-600' : 'text-green-600'}`}>{l.credits_delta > 0 ? '+' : ''}{l.credits_delta}</TableCell>
                                    <TableCell className="text-right">{l.balance_after}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
