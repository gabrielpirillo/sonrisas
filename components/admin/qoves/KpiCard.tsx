"use client";

/* KPI card with delta + sparkline — Qoves dashboard language.
   Sparkline drawn with visx + animated with motion; the headline value
   counts up via NumberFlow. */

import { useEffect, useState, type ReactNode } from "react";
import { LinePath } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { scaleLinear } from "@visx/scale";
import { motion, useReducedMotion } from "framer-motion";
import NumberFlow, { type Format } from "@number-flow/react";
import { C } from "@/lib/brand";

function Sparkline({ data, w = 96, h = 30, color, still }: { data: number[]; w?: number; h?: number; color: string; still?: boolean }) {
    const safe = data && data.length > 1 ? data : [0, 0];
    const min = Math.min(...safe);
    const max = Math.max(...safe);
    const xScale = scaleLinear({ domain: [0, safe.length - 1], range: [0, w] });
    const yScale = scaleLinear({ domain: [min, max || 1], range: [h - 2, 2] });

    return (
        <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
            <defs>
                <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>
            <LinePath<number>
                data={safe}
                x={(_, i) => xScale(i) ?? 0}
                y={(d) => yScale(d) ?? 0}
                curve={curveMonotoneX}
            >
                {({ path }) => (
                    <motion.path
                        d={`${path(safe) || ""} L ${w} ${h} L 0 ${h} Z`}
                        fill={`url(#spark-${color.replace('#', '')})`}
                        stroke="none"
                        initial={still ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                    />
                )}
            </LinePath>
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
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={still ? false : { pathLength: 0 }}
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
                initial={still ? false : { scale: 0 }}
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
    icon,
    tone = "light",
    hint = "VS MES ANTERIOR",
}: {
    label: string;
    value: string | number;
    delta: string;
    up?: boolean;
    spark: number[];
    suffix?: string;
    format?: Format;
    index?: number;
    /** Icono (elemento lucide ya renderizado: <Users size={17} />) que identifica la métrica. */
    icon?: ReactNode;
    /** "navy" invierte la tarjeta para dar contraste a la métrica clave. */
    tone?: "light" | "navy";
    hint?: string;
}) {
    const reduce = useReducedMotion();
    const navy = tone === "navy";
    const numeric = typeof value === "number";
    const [display, setDisplay] = useState(numeric ? 0 : 0);

    useEffect(() => {
        if (!numeric) return;
        const t = setTimeout(() => setDisplay(value as number), 150 + index * 100);
        return () => clearTimeout(t);
    }, [numeric, value, index]);

    const sparkColor = navy ? C.blueLight : up ? C.blueDeep : C.danger;

    return (
        <motion.div
            className={navy ? "card card-navy kpi-card kpi-card-navy" : "card kpi-card"}
            whileHover={reduce ? undefined : { y: -3 }}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    {icon && <span className="kpi-ic" aria-hidden="true">{icon}</span>}
                    <span className="mono kpi-label">{label}</span>
                </div>
                <Sparkline data={spark} color={sparkColor} still={!!reduce} w={78} h={28} />
            </div>
            <div>
                <div className="kpi-value">
                    {numeric ? (
                        <NumberFlow value={display} suffix={suffix} format={format} locales="es-ES" />
                    ) : (
                        value
                    )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
                    <span className={"kpi-delta" + (up ? " kpi-delta-up" : " kpi-delta-down")}>
                        {up ? "↑" : "↓"} {delta}
                    </span>
                    <span className="mono" style={{ fontSize: 9 }}>{hint}</span>
                </div>
            </div>
        </motion.div>
    );
}
