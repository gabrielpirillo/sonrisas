"use client";

import React from "react";

type IconName =
    | "cam" | "upload" | "check" | "back" | "wa" | "mail" | "refresh" | "shutter";

const PATHS: Record<IconName, React.ReactNode> = {
    cam: (
        <>
            <path d="M4 8a2 2 0 0 1 2-2h1l1.2-1.6A1 1 0 0 1 9 4h6a1 1 0 0 1 .8.4L17 6h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
            <circle cx="12" cy="12.5" r="3.2" />
        </>
    ),
    upload: (
        <>
            <path d="M12 16V5M8 9l4-4 4 4" />
            <path d="M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
        </>
    ),
    check: <path d="M5 12.5l4.5 4.5L19 7" />,
    back: <path d="M15 5l-7 7 7 7" />,
    wa: (
        <>
            <path d="M4 20l1.4-4A8 8 0 1 1 9 19.6L4 20Z" />
            <path d="M9 9c0 4 2 6 6 6 .5 0 1-.5 1-1l-1.5-1-1.2 1c-1.3-.5-2.3-1.5-2.8-2.8l1-1.2L11 8c0-.5-.5-1-1-1S9 8 9 9Z" />
        </>
    ),
    mail: (
        <>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M4 7l8 6 8-6" />
        </>
    ),
    refresh: <path d="M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2M18 4v5h-5M6 20v-5h5" />,
    shutter: <circle cx="12" cy="12" r="9" />,
};

export function WIcon({ name, size = 18 }: { name: IconName; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            {PATHS[name]}
        </svg>
    );
}

/* circular Q-style logo mark */
export function LogoMark({ size = 28 }: { size?: number }) {
    return (
        <span className="logo-mark" style={{ width: size, height: size }}>
            <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
                <circle cx={12} cy={12} r={9} stroke="#fff" strokeWidth={2} />
                <path d="M12 3 A9 9 0 0 1 12 21" stroke="#fff" strokeWidth={2} fill="none" opacity={0.45} />
            </svg>
        </span>
    );
}

/* round consent checkbox (Qoves) */
export function Check({ on }: { on: boolean }) {
    return on ? (
        <svg className="wf-check" style={{ background: "var(--ink)", borderColor: "var(--ink)" }} viewBox="0 0 24 24" fill="none">
            <path d="M5 12.5l4.5 4.5L19 7" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ) : (
        <span className="wf-check" style={{ border: "1.5px solid var(--line-strong)" }} />
    );
}
