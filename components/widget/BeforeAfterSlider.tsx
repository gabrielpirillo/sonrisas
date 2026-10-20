"use client";
import React, { useState, useRef, useEffect } from "react";

interface BeforeAfterSliderProps {
    beforeImage: string;
    afterImage: string;
    className?: string;
    /** Fill the parent's height instead of forcing a 9/16 aspect ratio. */
    fill?: boolean;
    /** "qoves" → píldoras mono + tirador con brillo (widget). Default keeps the admin look. */
    variant?: "default" | "qoves";
}

const SMOOTH = "0.75s cubic-bezier(0.22, 1, 0.36, 1)";
/** Movimiento (px) por debajo del cual un toque cuenta como "tap" y no como arrastre. */
const TAP_SLOP = 6;

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
    beforeImage,
    afterImage,
    className = "",
    fill = false,
    variant = "default",
}) => {
    const qoves = variant === "qoves";
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isResizing, setIsResizing] = useState(false);
    const [imagesLoaded, setImagesLoaded] = useState({ before: false, after: false });
    // qoves: posición animada (barrido de presentación / salto al tocar)
    const [smooth, setSmooth] = useState(false);
    const [touched, setTouched] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
    // Gesto en curso (Pointer Events: ratón, táctil y lápiz con el mismo código).
    const drag = useRef<{ id: number; startX: number; moved: boolean; touch: boolean } | null>(null);
    const raf = useRef(0);
    const pendingX = useRef<number | null>(null);

    const bothLoaded = imagesLoaded.before && imagesLoaded.after;

    const handleImageLoad = (type: "before" | "after") => {
        setImagesLoaded(prev => (prev[type] ? prev : { ...prev, [type]: true }));
    };
    // Si la imagen ya estaba cargada (caché / SSR) antes de enganchar onLoad, marcarla igual.
    const markIfComplete = (type: "before" | "after") => (el: HTMLImageElement | null) => {
        if (el && el.complete && el.naturalWidth > 0) handleImageLoad(type);
    };

    const clearTimers = () => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
    };

    const positionFromClientX = (clientX: number) => {
        if (!containerRef.current) return null;
        const rect = containerRef.current.getBoundingClientRect();
        if (!rect.width) return null;
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        return (x / rect.width) * 100;
    };

    /** Sigue al dedo/cursor sin transición, como mucho una vez por frame. */
    const followTo = (clientX: number) => {
        pendingX.current = clientX;
        if (raf.current) return;
        raf.current = requestAnimationFrame(() => {
            raf.current = 0;
            const x = pendingX.current;
            pendingX.current = null;
            if (x === null) return;
            const p = positionFromClientX(x);
            if (p === null) return;
            setSmooth(false);
            setSliderPosition(p);
        });
    };

    /** Salto animado al punto tocado (qoves). */
    const jumpTo = (clientX: number) => {
        const p = positionFromClientX(clientX);
        if (p === null) return;
        setSmooth(true);
        setSliderPosition(p);
    };

    // ── Gestos ────────────────────────────────────────────────────────────
    // touch-action: pan-y (CSS) deja el scroll vertical de la página al
    // navegador: si el gesto es vertical llega pointercancel y se suelta.
    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        const touch = e.pointerType !== "mouse";
        drag.current = { id: e.pointerId, startX: e.clientX, moved: false, touch };
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sin captura */ }
        setIsResizing(true);
        if (qoves) {
            clearTimers();
            setTouched(true);
            // Ratón: salto suave inmediato. Táctil: se decide al soltar (tap) o al
            // arrastrar, para no mover el tirador al iniciar un scroll vertical.
            if (!touch) jumpTo(e.clientX);
        }
    };

    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        if (!d.moved && Math.abs(e.clientX - d.startX) < TAP_SLOP) return;
        d.moved = true;
        followTo(e.clientX);
    };

    const endDrag = (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        drag.current = null;
        setIsResizing(false);
        if (!cancelled && d.touch && !d.moved && qoves) jumpTo(e.clientX);
    };

    // qoves: barrido de presentación cuando cargan ambas imágenes (sugiere que se puede arrastrar)
    useEffect(() => {
        if (!qoves || !bothLoaded) return;
        if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
        const seq = [30, 70, 50];
        const t = timers.current;
        t.push(setTimeout(() => setSmooth(true), 0));
        seq.forEach((p, i) => t.push(setTimeout(() => setSliderPosition(p), 500 + i * 800)));
        t.push(setTimeout(() => setSmooth(false), 500 + seq.length * 800));
        return clearTimers;
    }, [qoves, bothLoaded]);

    useEffect(() => () => {
        clearTimers();
        if (raf.current) cancelAnimationFrame(raf.current);
    }, []);

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (!qoves) return;
        const step = e.shiftKey ? 10 : 4;
        let next: ((p: number) => number) | null = null;
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = (p) => p - step;
        else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = (p) => p + step;
        else if (e.key === "Home") next = () => 0;
        else if (e.key === "End") next = () => 100;
        if (!next) return;
        e.preventDefault();
        clearTimers();
        setTouched(true);
        setSmooth(true);
        const fn = next;
        setSliderPosition((p) => Math.max(0, Math.min(100, fn(p))));
    };

    const clipTransition = qoves && smooth && !isResizing ? `clip-path ${SMOOTH}, opacity 0.3s` : undefined;
    const leftTransition = qoves && smooth && !isResizing ? `left ${SMOOTH}, opacity 0.3s` : undefined;

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div
            ref={containerRef}
            className={`relative w-full overflow-hidden select-none cursor-ew-resize group touch-pan-y ${fill ? "h-full" : "aspect-[9/16]"} ${qoves ? `ba-wrap${isResizing ? " dragging" : ""}` : ""} ${className}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => endDrag(e, false)}
            onPointerCancel={(e) => endDrag(e, true)}
            onLostPointerCapture={(e) => endDrag(e, true)}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            {...(qoves
                ? {
                    role: "slider",
                    tabIndex: 0,
                    "aria-label": "Comparar antes y después",
                    "aria-valuemin": 0,
                    "aria-valuemax": 100,
                    "aria-valuenow": Math.round(sliderPosition),
                    onKeyDown,
                }
                : {})}
        >
            {/* After Image (Background) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={afterImage}
                alt="Después"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${imagesLoaded.after ? "opacity-100" : "opacity-0"}`}
                draggable={false}
                ref={markIfComplete("after")}
                onLoad={() => handleImageLoad("after")}
            />

            {!imagesLoaded.before && !imagesLoaded.after && (
                qoves ? (
                    <div className="absolute inset-0 sf-skeleton" style={{ borderRadius: 0, opacity: 0.25 }} />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 animate-pulse">
                        <div className="w-8 h-8 rounded-full border-2 border-zinc-300 border-t-zinc-600 animate-spin" />
                    </div>
                )
            )}

            {/* Marca de agua discreta en la esquina inferior derecha */}
            <span className="ba-mark" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/smilefast-white.png" alt="" draggable={false} />
            </span>

            {qoves ? (
                <span className="ba-pill after" style={{ opacity: bothLoaded ? 1 : 0 }}>Después</span>
            ) : (
                <div className="absolute top-4 right-4 bg-[#C44D4D] text-white px-2 py-1 rounded text-xs font-bold pointer-events-none z-10">
                    DESPUÉS
                </div>
            )}

            {/* Before Image (Foreground - Clipped) */}
            <div
                className={`absolute inset-0 overflow-hidden transition-opacity duration-300 ${imagesLoaded.before ? "opacity-100" : "opacity-0"}`}
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`, transition: clipTransition }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={beforeImage}
                    alt="Antes"
                    className="absolute inset-0 w-full h-full object-cover"
                    draggable={false}
                    ref={markIfComplete("before")}
                    onLoad={() => handleImageLoad("before")}
                />
                {qoves ? (
                    <span className="ba-pill before">Antes</span>
                ) : (
                    <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-xs font-bold pointer-events-none z-10">
                        ANTES
                    </div>
                )}
            </div>

            {/* Slider Handle */}
            <div
                className={`absolute inset-y-0 transition-opacity duration-300 ${bothLoaded ? "opacity-100" : "opacity-0"} ${qoves ? "z-[8]" : ""}`}
                style={{ left: `${sliderPosition}%`, transition: leftTransition }}
            >
                {qoves ? (
                    <>
                        <div className="ba-seam" />
                        <div className="ba-handle">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M9 7l-5 5 5 5M15 7l5 5-5 5" />
                            </svg>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Vertical Line */}
                        <div className="absolute inset-y-0 -ml-0.5 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)]" />
                        {/* Round Handle */}
                        <div className="absolute top-1/2 -mt-6 -ml-6 w-12 h-12 rounded-full bg-[#7f8b81] border-2 border-white flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-transform transform hover:scale-110 active:scale-95">
                            <div className="flex items-center gap-1">
                                <svg width="6" height="10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5 9L1 5L5 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <svg width="6" height="10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 9L5 5L1 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {qoves && bothLoaded && (
                <span className="ba-hint" style={{ opacity: touched ? 0 : 1 }}>Desliza para comparar</span>
            )}
        </div>
    );
};
