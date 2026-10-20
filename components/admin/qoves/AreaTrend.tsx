"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bar } from "@visx/shape";
import { scaleBand, scaleLinear } from "@visx/scale";
import { LinearGradient } from "@visx/gradient";
import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { useTooltip, TooltipWithBounds } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { motion, useReducedMotion } from "framer-motion";
import { C, CHART } from "@/lib/brand";

/* Barras redondeadas con la paleta Smile Fast (azul acero / navy): crecen al
   entrar, se resaltan al pasar el cursor y muestran un tooltip navy. El control
   segmentado re-agrupa los conteos diarios en Día / Semana / Mes. */

const GRID = CHART.grid;

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

const margin = { top: 14, right: 6, bottom: 8, left: 6 };

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
        () => scaleBand<number>({ domain: data.map((_, i) => i), range: [0, innerWidth], padding: data.length > 14 ? 0.32 : 0.22 }),
        [data, innerWidth]
    );

    const max = Math.max(...data, 1);
    const yScale = useMemo(
        () => scaleLinear({ domain: [0, max * 1.15], range: [innerHeight, 0], nice: true }),
        [max, innerHeight]
    );

    const [hover, setHover] = useState<number | null>(null);
    const reduceMotion = useReducedMotion();
    // En táctil no hay "mouseleave": el tooltip se oculta solo poco después de soltar.
    const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (touchTimer.current) clearTimeout(touchTimer.current); }, []);
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
            const step = xScale.step() || 1;
            const index = Math.max(0, Math.min(data.length - 1, Math.floor((point.x - margin.left) / step)));
            const value = data[index] ?? 0;
            setHover(index);
            showTooltip({
                tooltipData: { index, value },
                tooltipLeft: (xScale(index) ?? 0) + xScale.bandwidth() / 2 + margin.left,
                tooltipTop: (yScale(value) ?? 0) + margin.top,
            });
        },
        [data, showTooltip, xScale, yScale]
    );

    if (width < 10) return null;
    const bw = xScale.bandwidth();
    const radius = Math.min(8, bw / 2);
    const minBar = 3; // los días en cero se ven como una línea base suave

    return (
        <div className="relative">
            <svg width={width} height={height} style={{ display: "block" }}>
                <LinearGradient id="sf-bar" from={C.blueDeep} to={C.blueLight} />
                <LinearGradient id="sf-bar-on" from={C.navy2} to={C.blueDeep} />
                <Group left={margin.left} top={margin.top}>
                    <GridRows scale={yScale} width={innerWidth} numTicks={3} stroke={GRID} strokeWidth={1} strokeDasharray="2 6" />
                    {data.map((v, i) => {
                        const h = Math.max(minBar, innerHeight - (yScale(v) ?? innerHeight));
                        const x = xScale(i) ?? 0;
                        const on = hover === i;
                        const empty = v === 0;
                        return (
                            <motion.rect
                                key={`${animationKey}-${i}`}
                                x={x}
                                width={bw}
                                rx={empty ? minBar / 2 : radius}
                                fill={empty ? C.blueSoft : on ? "url(#sf-bar-on)" : "url(#sf-bar)"}
                                initial={reduceMotion ? false : { height: 0, y: innerHeight }}
                                animate={{ height: h, y: innerHeight - h }}
                                transition={{ duration: 0.7, delay: 0.15 + i * 0.018, ease: [0.22, 1, 0.36, 1] }}
                            />
                        );
                    })}
                    <Bar
                        x={0}
                        y={0}
                        width={innerWidth}
                        height={innerHeight}
                        fill="transparent"
                        onMouseMove={handleTooltip}
                        onMouseLeave={() => { hideTooltip(); setHover(null); }}
                        onTouchStart={(e) => { if (touchTimer.current) clearTimeout(touchTimer.current); handleTooltip(e); }}
                        onTouchMove={handleTooltip}
                        onTouchEnd={() => {
                            if (touchTimer.current) clearTimeout(touchTimer.current);
                            touchTimer.current = setTimeout(() => { hideTooltip(); setHover(null); }, 1600);
                        }}
                    />
                </Group>
            </svg>

            {tooltipData && (
                <TooltipWithBounds
                    left={tooltipLeft}
                    top={tooltipTop - 44}
                    style={{
                        position: "absolute",
                        background: `linear-gradient(135deg, ${C.navy1}, ${C.navy2})`,
                        color: "#fff",
                        borderRadius: 10,
                        padding: "7px 11px",
                        fontSize: 12,
                        fontWeight: 600,
                        boxShadow: "0 10px 24px -10px rgba(19,27,34,0.55)",
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                <div>
                    <span className="mono" style={{ fontSize: 9.5, color: C.blueDeep }}>GENERACIONES · 30 DÍAS</span>
                    <h3 style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.02em", margin: "4px 0 0" }}>
                        Simulaciones <span style={{ color: C.ink3 }}>por {mode === "dia" ? "día" : mode === "semana" ? "semana" : "mes"}</span>
                    </h3>
                </div>
                <div className="seg" role="group" aria-label="Agrupar simulaciones por">
                    <button type="button" aria-pressed={mode === "dia"} className={mode === "dia" ? "seg-on" : ""} onClick={() => setMode("dia")}>Día</button>
                    <button type="button" aria-pressed={mode === "semana"} className={mode === "semana" ? "seg-on" : ""} onClick={() => setMode("semana")}>Semana</button>
                    <button type="button" aria-pressed={mode === "mes"} className={mode === "mes" ? "seg-on" : ""} onClick={() => setMode("mes")}>Mes</button>
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
