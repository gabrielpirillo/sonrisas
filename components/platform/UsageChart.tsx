'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bar } from '@visx/shape';
import { scaleBand, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { LinearGradient } from '@visx/gradient';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { MotionConfig, motion } from 'framer-motion';
import { C, CHART } from '@/lib/brand';

/* Uso diario de la plataforma: barras apiladas (imágenes abajo, videos arriba)
   con la paleta Smile Fast, entrada animada y tooltip navy. */

interface Datum {
    date: string;
    images: number;
    videos: number;
}

const IMAGES_COLOR = CHART.primary;
const VIDEOS_COLOR = C.blueLight;
const GRID_COLOR = CHART.grid;
const AXIS_COLOR = CHART.axis;

const margin = { top: 16, right: 8, bottom: 28, left: 32 };
const ease = [0.22, 1, 0.36, 1] as const;

function Chart({ data, width, height }: { data: Datum[]; width: number; height: number }) {
    const innerWidth = Math.max(0, width - margin.left - margin.right);
    const innerHeight = Math.max(0, height - margin.top - margin.bottom);

    const parsed = useMemo(
        () => data.map((d) => ({ ...d, dateObj: new Date(d.date), total: d.images + d.videos })),
        [data]
    );

    const xScale = useMemo(
        () => scaleBand<number>({ domain: parsed.map((_, i) => i), range: [0, innerWidth], padding: parsed.length > 14 ? 0.3 : 0.2 }),
        [innerWidth, parsed]
    );

    const maxTotal = Math.max(1, ...parsed.map((d) => d.total));
    const yScale = useMemo(
        () => scaleLinear({ range: [innerHeight, 0], domain: [0, maxTotal + Math.max(1, Math.ceil(maxTotal * 0.15))], nice: true }),
        [innerHeight, maxTotal]
    );

    const [hover, setHover] = useState<number | null>(null);
    const { showTooltip, hideTooltip, tooltipData, tooltipLeft = 0 } = useTooltip<typeof parsed[number]>();
    const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (touchTimer.current) clearTimeout(touchTimer.current); }, []);

    const handleTooltip = useCallback(
        (event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>) => {
            if (touchTimer.current) clearTimeout(touchTimer.current);
            const point = localPoint(event);
            if (!point) return;
            const step = xScale.step() || 1;
            const index = Math.max(0, Math.min(parsed.length - 1, Math.floor((point.x - margin.left) / step)));
            const d = parsed[index];
            if (!d) return;
            setHover(index);
            showTooltip({
                tooltipData: d,
                tooltipLeft: (xScale(index) ?? 0) + xScale.bandwidth() / 2 + margin.left,
                tooltipTop: 0,
            });
        },
        [parsed, showTooltip, xScale]
    );

    // En táctil no hay "mouseleave": el tooltip se retira solo tras unos segundos.
    const releaseTouch = useCallback(() => {
        if (touchTimer.current) clearTimeout(touchTimer.current);
        touchTimer.current = setTimeout(() => { hideTooltip(); setHover(null); }, 2600);
    }, [hideTooltip]);

    if (width < 10) return null;
    const bw = xScale.bandwidth();
    const r = Math.min(6, bw / 2);
    const labelEvery = Math.max(1, Math.ceil(parsed.length / (width > 520 ? 6 : 4)));
    const sumImages = parsed.reduce((a, d) => a + d.images, 0);
    const sumVideos = parsed.reduce((a, d) => a + d.videos, 0);

    return (
        <div className="relative">
            <svg
                width={width}
                height={height}
                style={{ display: 'block', touchAction: 'pan-y' }}
                role="img"
                aria-label={`Generaciones de los últimos ${parsed.length} días: ${sumImages} imágenes y ${sumVideos} vídeos.`}
            >
                <LinearGradient id="usage-images" from={C.blueDeep} to={C.blueAccent} />
                <LinearGradient id="usage-images-on" from={C.navy2} to={C.blueDeep} />
                <Group left={margin.left} top={margin.top}>
                    <GridRows scale={yScale} width={innerWidth} numTicks={4} stroke={GRID_COLOR} strokeDasharray="2 6" />

                    {parsed.map((d, i) => {
                        const x = xScale(i) ?? 0;
                        const hImg = innerHeight - (yScale(d.images) ?? innerHeight);
                        const hVid = innerHeight - (yScale(d.videos) ?? innerHeight);
                        const on = hover === i;
                        if (d.total === 0) {
                            return <rect key={i} x={x} y={innerHeight - 3} width={bw} height={3} rx={1.5} fill={C.blueSoft} />;
                        }
                        return (
                            <g key={i}>
                                <motion.rect
                                    x={x}
                                    width={bw}
                                    rx={hVid > 0 ? 0 : r}
                                    fill={on ? 'url(#usage-images-on)' : 'url(#usage-images)'}
                                    initial={{ height: 0, y: innerHeight }}
                                    animate={{ height: hImg, y: innerHeight - hImg }}
                                    transition={{ duration: 0.7, delay: 0.1 + i * 0.015, ease }}
                                />
                                {hVid > 0 && (
                                    <motion.rect
                                        x={x}
                                        width={bw}
                                        rx={r}
                                        fill={VIDEOS_COLOR}
                                        initial={{ height: 0, y: innerHeight - hImg }}
                                        animate={{ height: hVid, y: innerHeight - hImg - hVid }}
                                        transition={{ duration: 0.6, delay: 0.35 + i * 0.015, ease }}
                                    />
                                )}
                            </g>
                        );
                    })}

                    <AxisLeft
                        scale={yScale}
                        numTicks={4}
                        hideAxisLine
                        hideTicks
                        tickFormat={(v) => (Number.isInteger(Number(v)) ? String(v) : '')}
                        tickLabelProps={() => ({ fill: AXIS_COLOR, fontSize: 11, textAnchor: 'end', dx: -6, dy: 4 })}
                    />
                    <AxisBottom
                        top={innerHeight}
                        scale={xScale}
                        hideAxisLine
                        hideTicks
                        tickValues={parsed.map((_, i) => i).filter((i) => i % labelEvery === 0)}
                        tickFormat={(i) =>
                            parsed[i as number]?.dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) ?? ''
                        }
                        tickLabelProps={() => ({ fill: AXIS_COLOR, fontSize: 11, textAnchor: 'middle', dy: 4 })}
                    />

                    <Bar
                        x={0}
                        y={0}
                        width={innerWidth}
                        height={innerHeight}
                        fill="transparent"
                        onMouseMove={handleTooltip}
                        onMouseLeave={() => { hideTooltip(); setHover(null); }}
                        onTouchStart={handleTooltip}
                        onTouchMove={handleTooltip}
                        onTouchEnd={releaseTouch}
                    />
                </Group>
            </svg>

            {tooltipData && (
                <TooltipWithBounds
                    left={tooltipLeft}
                    top={margin.top}
                    style={{
                        position: 'absolute',
                        background: `linear-gradient(135deg, ${C.navy1}, ${C.navy2})`,
                        color: '#fff',
                        borderRadius: 12,
                        padding: '10px 13px',
                        boxShadow: '0 14px 30px -12px rgba(19,27,34,0.6)',
                        pointerEvents: 'none',
                        fontSize: 12,
                        lineHeight: 1.6,
                    }}
                >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        {tooltipData.dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 99, background: C.blueAccent, display: 'inline-block' }} />
                        Imágenes: <strong>{tooltipData.images}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 99, background: VIDEOS_COLOR, display: 'inline-block' }} />
                        Vídeos: <strong>{tooltipData.videos}</strong>
                    </div>
                </TooltipWithBounds>
            )}
        </div>
    );
}

export function UsageChart({ data }: { data: Array<Datum> }) {
    return (
        <MotionConfig reducedMotion="user">
            <div className="sa-chart">
                <ParentSize debounceTime={10}>
                    {({ width, height }) => <Chart data={data} width={width} height={height} />}
                </ParentSize>
            </div>
            <div className="sa-chart-legend" aria-hidden>
                <span><i style={{ background: IMAGES_COLOR }} />Imágenes</span>
                <span><i style={{ background: VIDEOS_COLOR }} />Vídeos</span>
            </div>
        </MotionConfig>
    );
}
