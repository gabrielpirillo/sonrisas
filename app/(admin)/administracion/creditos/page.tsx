import { getBillingOverview } from '@/lib/billing/actions';
import { isImpersonating } from '@/lib/auth/context';
import { BuyCredits } from '@/components/panel/BuyCredits';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default async function CreditosPage() {
    const data = await getBillingOverview();
    const impersonating = await isImpersonating();
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>Créditos</CardTitle>
                    <CardDescription>Saldo actual: <span className="font-bold text-foreground">{data.clinic?.credit_balance ?? 0}</span></CardDescription></CardHeader>
                <CardContent><BuyCredits packages={data.packages} stripeEnabled={data.stripeEnabled} impersonating={impersonating} /></CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Historial</CardTitle>
                    <CardDescription>Últimos movimientos de créditos</CardDescription></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow>
                            <TableHead>Fecha</TableHead><TableHead>Tipo</TableHead>
                            <TableHead>Acción</TableHead><TableHead className="text-right">Δ</TableHead>
                            <TableHead className="text-right">Saldo</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                            {data.recentLedger.length === 0 && (
                                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sin movimientos</TableCell></TableRow>
                            )}
                            {data.recentLedger.map((l, i) => (
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
