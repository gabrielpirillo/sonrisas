"use client";

import { useEffect, useState } from "react";

/**
 * Tracks whether the widget viewport is at the desktop breakpoint (≥ 768px).
 * Drives the responsive flow: mobile uses a separate photo step, desktop
 * combines Datos + Foto into a single intake step.
 */
export function useIsDesktop(query = "(min-width: 768px)") {
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return;
        const mql = window.matchMedia(query);
        const onChange = () => setIsDesktop(mql.matches);
        onChange();
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
    }, [query]);

    return isDesktop;
}
