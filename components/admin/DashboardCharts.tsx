"use client";

import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface DashboardChartsProps {
    data: {
        created_at: string;
        type: 'image' | 'video';
    }[];
}

const BRAND_COLOR = "#2A9D8F";
const VIDEO_COLOR = "#1f2937"; // Dark gray/black for contrast

export function DashboardCharts({ data }: DashboardChartsProps) {

    // Process Data for Area Chart (Activity Over Time)
    const activityData = useMemo(() => {
        const last30Days = [...Array(30)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (29 - i));
            return d.toISOString().split('T')[0];
        });

        const grouped = data.reduce((acc, curr) => {
            const date = new Date(curr.created_at).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return last30Days.map(date => ({
            date: new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
            count: grouped[date] || 0
        }));
    }, [data]);

    const hasActivity = data.length > 0;

    // Process Data for Pie Chart (Distribution)
    const distributionData = useMemo(() => {
        const counts = data.reduce((acc, curr) => {
            acc[curr.type] = (acc[curr.type] || 0) + 1;
            return acc;
        }, { image: 0, video: 0 } as Record<string, number>);

        return [
            { name: 'Imágenes', value: counts.image, color: BRAND_COLOR },
            { name: 'Videos', value: counts.video, color: VIDEO_COLOR }
        ].filter(item => item.value > 0);
    }, [data]);

    // Un donut con una sola categoría siempre es un 100% sin información: lo mostramos
    // solo cuando hay al menos dos formatos que comparar.
    const canCompareFormats = distributionData.length >= 2;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Activity Chart */}
            <Card className="lg:col-span-2 shadow-sm border-border">
                <CardHeader>
                    <CardTitle>Actividad Mensual</CardTitle>
                    <CardDescription>Generaciones realizadas en los últimos 30 días</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] md:h-[300px] w-full">
                        {!hasActivity ? (
                            <div className="h-full w-full flex flex-col items-center justify-center text-center gap-1">
                                <p className="text-sm font-medium text-foreground">Aún no hay actividad este mes</p>
                                <p className="text-xs text-muted-foreground">Las generaciones de los últimos 30 días aparecerán aquí.</p>
                            </div>
                        ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={activityData}>
                                <defs>
                                    <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={BRAND_COLOR} stopOpacity={0.2} />
                                        <stop offset="95%" stopColor={BRAND_COLOR} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    tickMargin={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ stroke: '#9CA3AF', strokeDasharray: '4 4' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke={BRAND_COLOR}
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorActivity)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Distribution Chart */}
            <Card className="shadow-sm border-border">
                <CardHeader>
                    <CardTitle>Formatos</CardTitle>
                    <CardDescription>Distribución por tipo de contenido</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full flex flex-col items-center justify-center">
                        {canCompareFormats ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={distributionData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {distributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : distributionData.length === 1 ? (
                            // Con un único formato, un desglose es más honesto que un anillo al 100%.
                            <div className="w-full space-y-3 px-2">
                                {distributionData.map((entry) => (
                                    <div key={entry.name} className="flex items-center justify-between rounded-lg border border-border p-3">
                                        <div className="flex items-center gap-2">
                                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                            <span className="text-sm text-foreground">{entry.name}</span>
                                        </div>
                                        <span className="text-lg font-bold text-primary">{entry.value}</span>
                                    </div>
                                ))}
                                <p className="text-xs text-muted-foreground text-center pt-1">
                                    El comparativo aparece cuando hay imágenes y videos.
                                </p>
                            </div>
                        ) : (
                            <div className="text-muted-foreground text-sm">No hay datos suficientes</div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
