"use client";

/* Plain Qoves stat card — mono label + big value. Used where we have a
   real value but no historical trend to draw (avoids faking deltas).
   Numeric values count up on mount via NumberFlow. */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import NumberFlow from "@number-flow/react";

export function StatCard({
    label,
    value,
    hint,
    format,
    locales = "es-ES",
    index = 0,
}: {
    label: string;
    value: string | number;
    hint?: string;
    format?: Intl.NumberFormatOptions;
    locales?: string;
    index?: number;
}) {
    const numeric = typeof value === "number";
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        if (!numeric) return;
        const t = setTimeout(() => setDisplay(value as number), 120 + index * 70);
        return () => clearTimeout(t);
    }, [numeric, value, index]);

    return (
        <motion.div
            className="card"
            style={{ padding: 22, display: "flex", flexDirection: "column", gap: 10, minHeight: 110 }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
        >
            <span className="mono" style={{ fontSize: 9 }}>{label}</span>
            <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1 }}>
                {numeric ? <NumberFlow value={display} format={format} locales={locales} /> : value}
            </div>
            {hint && <span className="mono" style={{ fontSize: 9 }}>{hint}</span>}
        </motion.div>
    );
}
