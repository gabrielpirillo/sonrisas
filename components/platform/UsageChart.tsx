'use client';

import { useCallback, useMemo } from 'react';
import { Area, LinePath, Bar, Line } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { scaleTime, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { LinearGradient } from '@visx/gradient';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { motion } from 'framer-motion';

interface Datum {
    date: string;
    images: number;
    videos: number;
}

const IMAGES_COLOR = '#0ea5e9';
const VIDEOS_COLOR = '#8b5cf6';
const GRID_COLOR = '#e8eae8';
const AXIS_COLOR = '#8a8f8c';

const margin = { top: 16, right: 16, bottom: 28, left: 36 };

function Chart({ data, width, height }: { data: Datum[]; width: number; height: number }) {
    const innerWidth = Math.max(0, width - margin.left - margin.right);
    const innerHeight = Math.max(0, height - margin.top - margin.bottom);

    const parsed = useMemo(
        () => data.map((d) => ({ ...d, dateObj: new Date(d.date), total: d.images + d.videos })),
        [data]
    );

    const xScale = useMemo(
        () =>
            scaleTime({
                range: [0, innerWidth],
                domain: [
                    parsed[0]?.dateObj ?? new Date(),
                    parsed[parsed.length - 1]?.dateObj ?? new Date(),
                ],
            }),
        [innerWidth, parsed]
    );

    const maxTotal = Math.max(1, ...parsed.map((d) => d.total));
    const yScale = useMemo(
        () =>
            scaleLinear({
                range: [innerHeight, 0],
                domain: [0, maxTotal + Math.max(1, Math.ceil(maxTotal * 0.15))],
                nice: true,
            }),
        [innerHeight, maxTotal]
    );

    const {
        showTooltip,
        hideTooltip,
        tooltipData,
        tooltipLeft = 0,
    } = useTooltip<typeof parsed[number]>();

    const handleTooltip = useCallback(
        (event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>) => {
            const point = localPoint(event);
            if (!point) return;
            const x0 = xScale.invert(point.x - margin.left);
            let nearest = parsed[0];
            let best = Infinity;
            for (const d of parsed) {
                const dist = Math.abs(d.dateObj.getTime() - x0.getTime());
                if (dist < best) {
                    best = dist;
                    nearest = d;
                }
            }
            if (!nearest) return;
            showTooltip({
                tooltipData: nearest,
                tooltipLeft: (xScale(nearest.dateObj) ?? 0) + margin.left,
                tooltipTop: 0,
            });
        },
        [parsed, showTooltip, xScale]
    );

    if (width < 10) return null;

    return (
        <div className="relative">
            <svg width={width} height={height} style={{ display: 'block' }}>
                <LinearGradient id="usage-images" from={IMAGES_COLOR} fromOpacity={0.35} to={IMAGES_COLOR} toOpacity={0.05} />
                <LinearGradient id="usage-videos" from={VIDEOS_COLOR} fromOpacity={0.35} to={VIDEOS_COLOR} toOpacity={0.05} />
                <Group left={margin.left} top={margin.top}>
                    <GridRows scale={yScale} width={innerWidth} numTicks={4} stroke={GRID_COLOR} strokeDasharray="3 3" />

                    {/* images band (bottom) */}
                    <Area<typeof parsed[number]>
                        data={parsed}
                        x={(d) => xScale(d.dateObj) ?? 0}
                        y0={() => yScale(0) ?? 0}
                        y1={(d) => yScale(d.images) ?? 0}
                        curve={curveMonotoneX}
                    >
                        {({ path }) => (
                            <motion.path
                                d={path(parsed) || ''}
                                fill="url(#usage-images)"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.7, delay: 0.2 }}
                            />
                        )}
                    </Area>

                    {/* videos band (stacked on top of images) */}
                    <Area<typeof parsed[number]>
                        data={parsed}
                        x={(d) => xScale(d.dateObj) ?? 0}
                        y0={(d) => yScale(d.images) ?? 0}
                        y1={(d) => yScale(d.total) ?? 0}
                        curve={curveMonotoneX}
                    >
                        {({ path }) => (
                            <motion.path
                                d={path(parsed) || ''}
                                fill="url(#usage-videos)"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.7, delay: 0.35 }}
                            />
                        )}
                    </Area>

                    {/* edge lines */}
                    <LinePath<typeof parsed[number]>
                        data={parsed}
                        x={(d) => xScale(d.dateObj) ?? 0}
                        y={(d) => yScale(d.images) ?? 0}
                        curve={curveMonotoneX}
                    >
                        {({ path }) => (
                            <motion.path
                                d={path(parsed) || ''}
                                fill="none"
                                stroke={IMAGES_COLOR}
                                strokeWidth={1.75}
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1, ease: 'easeInOut' }}
                            />
                        )}
                    </LinePath>
                    <LinePath<typeof parsed[number]>
                        data={parsed}
                        x={(d) => xScale(d.dateObj) ?? 0}
                        y={(d) => yScale(d.total) ?? 0}
                        curve={curveMonotoneX}
                    >
                        {({ path }) => (
                            <motion.path
                                d={path(parsed) || ''}
                                fill="none"
                                stroke={VIDEOS_COLOR}
                                strokeWidth={1.75}
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1, ease: 'easeInOut', delay: 0.15 }}
                            />
                        )}
                    </LinePath>

                    <AxisLeft
                        scale={yScale}
                        numTicks={4}
                        hideAxisLine
                        hideTicks
                        tickLabelProps={() => ({ fill: AXIS_COLOR, fontSize: 11, textAnchor: 'end', dx: -4, dy: 4 })}
                    />
                    <AxisBottom
                        top={innerHeight}
                        scale={xScale}
                        numTicks={width > 520 ? 6 : 4}
                        hideAxisLine
                        hideTicks
                        tickFormat={(value) =>
                            (value as Date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
                        }
                        tickLabelProps={() => ({ fill: AXIS_COLOR, fontSize: 11, textAnchor: 'middle', dy: 4 })}
                    />

                    {tooltipData && (
                        <Line
                            from={{ x: tooltipLeft - margin.left, y: 0 }}
                            to={{ x: tooltipLeft - margin.left, y: innerHeight }}
                            stroke="#b8bcb9"
                            strokeWidth={1}
                            strokeDasharray="4 4"
                            pointerEvents="none"
                        />
                    )}

                    <Bar
                        x={0}
                        y={0}
                        width={innerWidth}
                        height={innerHeight}
                        fill="transparent"
                        onMouseMove={handleTooltip}
                        onMouseLeave={hideTooltip}
                        onTouchStart={handleTooltip}
                        onTouchMove={handleTooltip}
                    />
                </Group>
            </svg>

            {tooltipData && (
                <TooltipWithBounds
                    left={tooltipLeft}
                    top={margin.top}
                    style={{
                        position: 'absolute',
                        background: 'white',
                        borderRadius: 8,
                        padding: '8px 12px',
                        boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.15)',
                        pointerEvents: 'none',
                        fontSize: 12,
                    }}
                >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        {tooltipData.dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 99, background: IMAGES_COLOR, display: 'inline-block' }} />
                        Imágenes: <strong>{tooltipData.images}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 99, background: VIDEOS_COLOR, display: 'inline-block' }} />
                        Videos: <strong>{tooltipData.videos}</strong>
                    </div>
                </TooltipWithBounds>
            )}
        </div>
    );
}

export function UsageChart({ data }: { data: Array<Datum> }) {
    return (
        <div>
            <div style={{ height: 260, width: '100%' }}>
                <ParentSize debounceTime={10}>
                    {({ width, height }) => <Chart data={data} width={width} height={height} />}
                </ParentSize>
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 12, justifyContent: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: AXIS_COLOR }}>
                    <span style={{ width: 9, height: 9, borderRadius: 99, background: IMAGES_COLOR, display: 'inline-block' }} />
                    Imágenes
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: AXIS_COLOR }}>
                    <span style={{ width: 9, height: 9, borderRadius: 99, background: VIDEOS_COLOR, display: 'inline-block' }} />
                    Videos
                </span>
            </div>
        </div>
    );
}
