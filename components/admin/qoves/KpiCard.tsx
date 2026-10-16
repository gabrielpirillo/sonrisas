"use client";

/* KPI card with delta + sparkline — Qoves dashboard language.
   Sparkline drawn with visx + animated with motion; the headline value
   counts up via NumberFlow. */

import { useEffect, useState } from "react";
import { LinePath } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { scaleLinear } from "@visx/scale";
import { motion } from "framer-motion";
import NumberFlow from "@number-flow/react";

function Sparkline({ data, w = 96, h = 30, color }: { data: number[]; w?: number; h?: number; color: string }) {
    const safe = data && data.length > 1 ? data : [0, 0];
    const min = Math.min(...safe);
    const max = Math.max(...safe);
    const xScale = scaleLinear({ domain: [0, safe.length - 1], range: [0, w] });
    const yScale = scaleLinear({ domain: [min, max || 1], range: [h - 2, 2] });

    return (
        <svg width={w} height={h} style={{ display: "block" }}>
            <LinePath<number>
                data={safe}
                x={(_, i) => xScale(i) ?? 0}
                y={(d) => yScale(d) ?? 0}
                curve={curveMonotoneX}
            >
                {({ path }) => (
                    <motion.path
                        d={path(safe) || ""}
                        fill="none"
                        stroke={color}
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                    />
                )}
            </LinePath>
            <motion.circle
                cx={xScale(safe.length - 1) ?? 0}
                cy={yScale(safe[safe.length - 1]) ?? 0}
                r={2.4}
                fill={color}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.9, duration: 0.25 }}
            />
        </svg>
    );
}

export function KpiCard({
    label,
    value,
    delta,
    up = true,
    spark,
    suffix,
    format,
    index = 0,
}: {
    label: string;
    value: string | number;
    delta: string;
    up?: boolean;
    spark: number[];
    suffix?: string;
    format?: Intl.NumberFormatOptions;
    index?: number;
}) {
    const numeric = typeof value === "number";
    const [display, setDisplay] = useState(numeric ? 0 : 0);

    useEffect(() => {
        if (!numeric) return;
        const t = setTimeout(() => setDisplay(value as number), 150 + index * 100);
        return () => clearTimeout(t);
    }, [numeric, value, index]);

    return (
        <motion.div
            className="card"
            style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16, minHeight: 132 }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span className="mono" style={{ fontSize: 9 }}>{label}</span>
                <Sparkline data={spark} color={up ? "#5f917b" : "#bd8b86"} />
            </div>
            <div>
                <div style={{ fontSize: 38, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1 }}>
                    {numeric ? (
                        <NumberFlow value={display} suffix={suffix} format={format} locales="es-ES" />
                    ) : (
                        value
                    )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: up ? "#4e7d68" : "#b06b66", fontWeight: 600 }}>
                        {up ? "▲" : "▼"} {delta}
                    </span>
                    <span className="mono" style={{ fontSize: 9 }}>VS MES ANTERIOR</span>
                </div>
            </div>
        </motion.div>
    );
}
