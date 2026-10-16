"use client";

import React from "react";
import { LogoMark as BrandLogoMark } from "@/components/admin/qoves/LogoMark";

type IconName =
    | "cam" | "upload" | "check" | "back" | "wa" | "mail" | "refresh" | "shutter"
    | "arrow" | "lock" | "user" | "phone" | "chev" | "spark" | "slide";

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
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    lock: (
        <>
            <rect x="5" y="10.5" width="14" height="10" rx="2.2" />
            <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
        </>
    ),
    user: (
        <>
            <circle cx="12" cy="8.5" r="3.6" />
            <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
        </>
    ),
    phone: <path d="M6.5 4h3l1.5 4-2 1.3a10 10 0 0 0 5.7 5.7L16 13l4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4Z" />,
    chev: <path d="M7 10l5 5 5-5" />,
    spark: <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9L12 3.5ZM18.5 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" />,
    slide: <path d="M9 7l-5 5 5 5M15 7l5 5-5 5" />,
};

export function WIcon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            {PATHS[name]}
        </svg>
    );
}

/* Marca Smile Fast (misma que el panel y el favicon) */
export function LogoMark({ size = 28 }: { size?: number }) {
    return <BrandLogoMark size={size} variant="navy" />;
}

/* check redondo de consentimiento (se anima al marcarse) */
export function Check({ on }: { on: boolean }) {
    return (
        <span className={"wf-check" + (on ? " on" : "")} aria-hidden="true">
            {on && (
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                    <path d="M5 12.5l4.5 4.5L19 7" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
        </span>
    );
}
