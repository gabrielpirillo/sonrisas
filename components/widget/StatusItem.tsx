"use client";

import { WIcon } from "./WIcon";

interface StatusItemProps {
    active: boolean;
    completed: boolean;
    label: string;
}

/** Chip de estado del pipeline (procesando): pendiente · activo (pulso cian) · hecho. */
export function StatusItem({ active, completed, label }: StatusItemProps) {
    const state = completed ? "done" : active ? "active" : "pending";
    return (
        <span className={`st-item ${state}`} aria-current={active ? "step" : undefined}>
            <span className="st-dot" aria-hidden="true">
                {completed && <WIcon name="check" size={10} />}
            </span>
            {label}
        </span>
    );
}
