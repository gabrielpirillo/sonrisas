"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Info, Lock, Maximize2, Monitor, RotateCw, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { WidgetConfig } from "@/lib/widgetConfig";

export type Device = "desktop" | "mobile";

const MSG_TYPE = "smilefast-widget-config";
const READY_TYPE = "smilefast-widget-ready";
const CHROME_H = 38;
const BEZEL = 9;

function previewSrc(widgetKey: string | null) {
    return `/widget?${widgetKey ? `key=${encodeURIComponent(widgetKey)}&` : ""}preview=1`;
}

/** Tamaño del contenedor (ResizeObserver). */
function useBox<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    const [box, setBox] = useState({ w: 0, h: 0 });
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            setBox((b) => (Math.abs(b.w - width) < 1 && Math.abs(b.h - height) < 1 ? b : { w: width, h: height }));
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    return [ref, box] as const;
}

/** Calcula el viewport virtual (px reales del widget) y la escala para encajar en el escenario. */
function layoutFor(device: Device, w: number, h: number) {
    if (device === "desktop") {
        const vw = 1120;
        const scale = Math.max(0.2, Math.min(1, w / vw, (h - CHROME_H) / 620));
        const vh = Math.round(Math.min(1100, Math.max(620, (h - CHROME_H) / scale)));
        return { vw, vh, scale, frameW: vw * scale, frameH: vh * scale + CHROME_H };
    }
    const vw = 390;
    const vh = 844;
    const scale = Math.max(0.2, Math.min(1, (w - BEZEL * 2) / vw, (h - BEZEL * 2) / vh));
    return { vw, vh, scale, frameW: vw * scale + BEZEL * 2, frameH: vh * scale + BEZEL * 2 };
}

/**
 * Marco de navegador o de móvil con el widget real dentro (iframe en modo
 * vista previa). Envía el borrador por postMessage al cargar, cuando el widget
 * avisa de que está listo y en cada cambio.
 */
export function PreviewDevice({ config, widgetKey, device }: { config: WidgetConfig; widgetKey: string | null; device: Device }) {
    const [stageRef, box] = useBox<HTMLDivElement>();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const configRef = useRef(config);
    const [loaded, setLoaded] = useState(false);
    const reduceMotion = useReducedMotion();

    const post = useCallback(() => {
        const win = iframeRef.current?.contentWindow;
        if (!win) return;
        try {
            win.postMessage({ type: MSG_TYPE, config: configRef.current }, window.location.origin);
        } catch {
            /* el iframe aún no está listo */
        }
    }, []);

    useEffect(() => {
        configRef.current = config;
        post();
    }, [config, post]);

    useEffect(() => {
        const onMsg = (e: MessageEvent) => {
            if (e.origin !== window.location.origin) return;
            if (e.source !== iframeRef.current?.contentWindow) return;
            if (e.data?.type === READY_TYPE) post();
        };
        window.addEventListener("message", onMsg);
        return () => window.removeEventListener("message", onMsg);
    }, [post]);

    const ready = box.w > 0 && box.h > 0;
    const l = layoutFor(device, box.w, box.h);
    const spring = reduceMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 210, damping: 28 };

    return (
        <div ref={stageRef} className="ws-stage">
            {ready && (
                <motion.div
                    className={"ws-frame ws-frame-" + device}
                    initial={false}
                    animate={{ width: l.frameW, height: l.frameH, borderRadius: device === "mobile" ? 44 * l.scale + BEZEL : 14 }}
                    transition={spring}
                >
                    {device === "desktop" && (
                        <div className="ws-chrome" aria-hidden>
                            <span className="ws-chrome-dots"><i /><i /><i /></span>
                            <span className="ws-chrome-url"><Lock size={10} /> tu-clinica.com</span>
                            <span style={{ width: 42 }} />
                        </div>
                    )}
                    <div className="ws-screen" style={device === "mobile" ? { borderRadius: 44 * l.scale } : undefined}>
                        <motion.iframe
                            ref={iframeRef}
                            src={previewSrc(widgetKey)}
                            title="Vista previa del widget"
                            className="ws-iframe"
                            onLoad={() => { setLoaded(true); post(); }}
                            initial={false}
                            animate={{ scale: l.scale, opacity: loaded ? 1 : 0 }}
                            transition={spring}
                            style={{ width: l.vw, height: l.vh, transformOrigin: "0 0" }}
                            allow="camera; clipboard-read; clipboard-write"
                        />
                        {!loaded && <div className="ws-screen-loading sf-skeleton" aria-hidden />}
                        {device === "mobile" && <span className="ws-notch" aria-hidden style={{ width: 96 * l.scale, height: 26 * l.scale, top: 9 * l.scale }} />}
                    </div>
                </motion.div>
            )}
        </div>
    );
}

function DeviceToggle({ device, onChange, id }: { device: Device; onChange: (d: Device) => void; id: string }) {
    const reduceMotion = useReducedMotion();
    const opts: { id: Device; label: string; icon: React.ReactNode }[] = [
        { id: "desktop", label: "Escritorio", icon: <Monitor size={15} aria-hidden /> },
        { id: "mobile", label: "Móvil", icon: <Smartphone size={15} aria-hidden /> },
    ];
    return (
        <div className="ws-seg" role="radiogroup" aria-label="Dispositivo de la vista previa">
            {opts.map((o) => (
                <button key={o.id} type="button" role="radio" aria-checked={device === o.id} className={device === o.id ? "is-on" : ""} onClick={() => onChange(o.id)}>
                    {device === o.id && (
                        <motion.span layoutId={reduceMotion ? undefined : `ws-dev-${id}`} className="ws-seg-pill" transition={{ type: "spring", stiffness: 460, damping: 36 }} />
                    )}
                    <span className="ws-seg-label">{o.icon}{o.label}</span>
                </button>
            ))}
        </div>
    );
}

export function PreviewPane({
    config, widgetKey, dirty, device, onDeviceChange: setDevice,
}: {
    config: WidgetConfig; widgetKey: string | null; dirty: boolean; device: Device; onDeviceChange: (d: Device) => void;
}) {
    const [reloadKey, setReloadKey] = useState(0);
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="ws-preview-card">
            <div className="ws-preview-bar">
                <div className="ws-preview-title">
                    <span className="mono">VISTA PREVIA</span>
                    <span className={"ws-live" + (dirty ? " is-draft" : "")}>
                        <i aria-hidden />
                        {dirty ? "Borrador" : "Publicado"}
                    </span>
                </div>
                <div className="ws-preview-tools">
                    <DeviceToggle device={device} onChange={setDevice} id="main" />
                    <button type="button" className="icon-btn" onClick={() => setReloadKey((k) => k + 1)} aria-label="Reiniciar vista previa" title="Reiniciar vista previa">
                        <RotateCw size={15} />
                    </button>
                    <button type="button" className="icon-btn ws-hide-sm" onClick={() => setExpanded(true)} aria-label="Ampliar vista previa" title="Ampliar">
                        <Maximize2 size={15} />
                    </button>
                </div>
            </div>

            <PreviewDevice key={reloadKey} config={config} widgetKey={widgetKey} device={device} />

            <p className="ws-preview-hint">
                <Info size={13} aria-hidden />
                Vista previa: no se guardan datos. Muestra tus cambios antes de publicarlos.
            </p>

            <Dialog open={expanded} onOpenChange={setExpanded}>
                <DialogContent className="!max-w-[min(1400px,96vw)] w-[96vw] h-[92vh] p-0 gap-0 overflow-hidden bg-white rounded-[24px] border-[var(--blue-line)]">
                    <div className="qoves-admin ws-expanded">
                        <div className="ws-preview-bar" style={{ paddingRight: 56 }}>
                            <div className="ws-preview-title">
                                <span className="mono">VISTA PREVIA</span>
                                <DialogTitle className="ws-expanded-title">Así verán el widget tus pacientes</DialogTitle>
                                <DialogDescription className="sr-only">Vista previa ampliada del widget con tus cambios sin publicar.</DialogDescription>
                            </div>
                            <DeviceToggle device={device} onChange={setDevice} id="expanded" />
                        </div>
                        {expanded && <PreviewDevice config={config} widgetKey={widgetKey} device={device} />}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
