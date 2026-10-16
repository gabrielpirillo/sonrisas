"use client";

import { useCallback, useMemo, useState } from "react";
import { AreaClosed, LinePath, Bar, Line } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { scaleLinear } from "@visx/scale";
import { LinearGradient } from "@visx/gradient";
import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { useTooltip, TooltipWithBounds } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { motion } from "framer-motion";

/* Minimalist area chart (thin line, hairline gridlines) — Qoves analysis
   aesthetic, now powered by visx with an animated draw (motion) and an
   interactive crosshair tooltip. The segmented control re-buckets the daily
   counts into Día / Semana / Mes views. */

const INK = "#1c1e1d";
const GRID = "#e8eae8";

function bucket(daily: number[], mode: "dia" | "semana" | "mes"): number[] {
    if (mode === "dia") return daily;
    if (mode === "mes") {
        // split the window into 3 roughly equal sums
        const out: number[] = [];
        const step = Math.ceil(daily.length / 3) || 1;
        for (let i = 0; i < daily.length; i += step) {
            out.push(daily.slice(i, i + step).reduce((a, b) => a + b, 0));
        }
        return out.length > 1 ? out : daily;
    }
    const size = 7; // semana
    const out: number[] = [];
    for (let i = 0; i < daily.length; i += size) {
        out.push(daily.slice(i, i + size).reduce((a, b) => a + b, 0));
    }
    return out.length > 1 ? out : daily;
}

const margin = { top: 12, right: 10, bottom: 12, left: 10 };

function TrendChart({
    data,
    width,
    height,
    animationKey,
}: {
    data: number[];
    width: number;
    height: number;
    animationKey: string;
}) {
    const innerWidth = Math.max(0, width - margin.left - margin.right);
    const innerHeight = Math.max(0, height - margin.top - margin.bottom);

    const xScale = useMemo(
        () =>
            scaleLinear({
                domain: [0, Math.max(1, data.length - 1)],
                range: [0, innerWidth],
            }),
        [data.length, innerWidth]
    );

    const max = Math.max(...data, 1);
    const yScale = useMemo(
        () =>
            scaleLinear({
                domain: [0, max * 1.15],
                range: [innerHeight, 0],
                nice: true,
            }),
        [max, innerHeight]
    );

    const {
        showTooltip,
        hideTooltip,
        tooltipData,
        tooltipLeft = 0,
        tooltipTop = 0,
    } = useTooltip<{ index: number; value: number }>();

    const handleTooltip = useCallback(
        (event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>) => {
            const point = localPoint(event);
            if (!point) return;
            const index = Math.round(xScale.invert(point.x - margin.left));
            const clamped = Math.max(0, Math.min(data.length - 1, index));
            showTooltip({
                tooltipData: { index: clamped, value: data[clamped] ?? 0 },
                tooltipLeft: (xScale(clamped) ?? 0) + margin.left,
                tooltipTop: (yScale(data[clamped] ?? 0) ?? 0) + margin.top,
            });
        },
        [data, showTooltip, xScale, yScale]
    );

    if (width < 10) return null;

    return (
        <div className="relative">
            <svg width={width} height={height} style={{ display: "block" }}>
                <LinearGradient id="qoves-area" from={INK} fromOpacity={0.1} to={INK} toOpacity={0} />
                <Group left={margin.left} top={margin.top}>
                    <GridRows scale={yScale} width={innerWidth} numTicks={3} stroke={GRID} strokeWidth={1} />

                    <AreaClosed<number>
                        data={data}
                        x={(_, i) => xScale(i) ?? 0}
                        y={(d) => yScale(d) ?? 0}
                        yScale={yScale}
                        curve={curveMonotoneX}
                    >
                        {({ path }) => (
                            <motion.path
                                key={`area-${animationKey}`}
                                d={path(data) || ""}
                                fill="url(#qoves-area)"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.7, delay: 0.2 }}
                            />
                        )}
                    </AreaClosed>

                    <LinePath<number>
                        data={data}
                        x={(_, i) => xScale(i) ?? 0}
                        y={(d) => yScale(d) ?? 0}
                        curve={curveMonotoneX}
                    >
                        {({ path }) => (
                            <motion.path
                                key={`line-${animationKey}`}
                                d={path(data) || ""}
                                fill="none"
                                stroke={INK}
                                strokeWidth={1.75}
                                strokeLinejoin="round"
                                strokeLinecap="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1, ease: "easeInOut" }}
                            />
                        )}
                    </LinePath>

                    {/* end dot */}
                    <motion.circle
                        cx={xScale(data.length - 1) ?? 0}
                        cy={yScale(data[data.length - 1] ?? 0) ?? 0}
                        r={3.5}
                        fill={INK}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 1, duration: 0.3 }}
                    />

                    {tooltipData && (
                        <g>
                            <Line
                                from={{ x: tooltipLeft - margin.left, y: 0 }}
                                to={{ x: tooltipLeft - margin.left, y: innerHeight }}
                                stroke="#b8bcb9"
                                strokeWidth={1}
                                strokeDasharray="4 4"
                                pointerEvents="none"
                            />
                            <circle
                                cx={tooltipLeft - margin.left}
                                cy={tooltipTop - margin.top}
                                r={4.5}
                                fill={INK}
                                stroke="#fff"
                                strokeWidth={2}
                                pointerEvents="none"
                            />
                        </g>
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
                    top={tooltipTop}
                    style={{
                        position: "absolute",
                        background: INK,
                        color: "#fff",
                        borderRadius: 7,
                        padding: "6px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                        pointerEvents: "none",
                    }}
                >
                    {tooltipData.value} {tooltipData.value === 1 ? "generación" : "generaciones"}
                </TooltipWithBounds>
            )}
        </div>
    );
}

export function AreaTrend({ daily, height = 220 }: { daily: number[]; height?: number }) {
    const [mode, setMode] = useState<"dia" | "semana" | "mes">("dia");
    const data = bucket(daily.length ? daily : [0, 0], mode);

    return (
        <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>Simulaciones por día</h3>
                    <span className="mono" style={{ fontSize: 9 }}>GENERACIONES · 30 DÍAS</span>
                </div>
                <div className="seg">
                    <button className={mode === "dia" ? "seg-on" : ""} onClick={() => setMode("dia")}>Día</button>
                    <button className={mode === "semana" ? "seg-on" : ""} onClick={() => setMode("semana")}>Semana</button>
                    <button className={mode === "mes" ? "seg-on" : ""} onClick={() => setMode("mes")}>Mes</button>
                </div>
            </div>
            <div style={{ width: "100%", height }}>
                <ParentSize debounceTime={10}>
                    {({ width }) => (
                        <TrendChart data={data} width={width} height={height} animationKey={mode} />
                    )}
                </ParentSize>
            </div>
        </div>
    );
}
