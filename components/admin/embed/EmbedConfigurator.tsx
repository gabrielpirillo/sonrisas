"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Copy, ChevronLeft, Layout, MousePointerClick, Smile, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import WidgetContainer from "@/components/widget/WidgetContainer";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type EmbedType = "inline" | "floating" | "click" | null;

/** Color de acento por defecto del widget: azul acero profundo de Smile Fast. */
const DEFAULT_BRAND_COLOR = "#4f6b7f";
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export default function EmbedConfigurator({ widgetKey }: { widgetKey?: string | null } = {}) {
    const [isOpen, setIsOpen] = useState(false);
    const [embedType, setEmbedType] = useState<EmbedType>(null);
    const reduceMotion = useReducedMotion();

    const reset = () => {
        setEmbedType(null);
    };

    const stepMotion = reduceMotion
        ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 1 } }
        : { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 }, transition: { duration: 0.28, ease: EASE_OUT } };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) reset(); }}>
            <DialogTrigger asChild>
                <button type="button" className="btn btn-white btn-sm">
                    <Layout className="w-4 h-4" />
                    Insertar Widget
                </button>
            </DialogTrigger>
            <DialogContent className="!max-w-[95vw] w-full h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white rounded-[24px] border-[var(--blue-line)] shadow-[0_40px_90px_-30px_rgba(19,27,34,0.65)]">
                <DialogDescription className="sr-only">Asistente para insertar el widget de Smile Fast en tu sitio web</DialogDescription>
                <div className="qoves-admin flex flex-col flex-1 min-h-0">
                    <AnimatePresence mode="wait" initial={false}>
                        {!embedType ? (
                            <motion.div key="select" {...stepMotion} className="flex flex-col flex-1 min-h-0">
                                <EmbedSelection onSelect={setEmbedType} />
                            </motion.div>
                        ) : (
                            <motion.div key={`settings-${embedType}`} {...stepMotion} className="flex flex-col flex-1 min-h-0">
                                <EmbedSettings widgetKey={widgetKey} type={embedType} onBack={reset} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/* ── Mini navegador de las ilustraciones ─────────────────────────────── */
function BrowserDots() {
    return (
        <div className="h-5 bg-blue-tint border-b border-blue-line flex items-center px-2.5 gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-light"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-blue"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-deep"></div>
        </div>
    );
}

function EmbedSelection({ onSelect }: { onSelect: (t: EmbedType) => void }) {
    const reduceMotion = useReducedMotion();
    const cards = [
        {
            type: "inline" as const,
            eyebrow: "01 · EN LÍNEA",
            title: "Incrustar en línea",
            desc: "Carga el widget directamente dentro del contenido de tu página. Ideal para landing pages dedicadas.",
            illustration: (
                <div className="w-full h-44 bg-white border border-blue-line rounded-xl flex flex-col overflow-hidden relative">
                    <BrowserDots />
                    <div className="p-4 space-y-2">
                        <div className="w-3/4 h-2 bg-blue-soft rounded-full"></div>
                        <div className="w-1/2 h-2 bg-blue-soft rounded-full"></div>
                        <div className="mt-4 border-2 border-dashed border-blue-light bg-blue-tint rounded-lg h-[72px] flex items-center justify-center">
                            <div className="w-8 h-8 rounded-lg bg-blue-deep/80 grid place-items-center text-white"><Smile className="w-4 h-4" /></div>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            type: "floating" as const,
            eyebrow: "02 · FLOTANTE",
            title: "Botón flotante",
            desc: "Un botón discreto que sigue al usuario. Al hacer clic, abre el widget en un modal elegante.",
            illustration: (
                <div className="w-full h-44 bg-white border border-blue-line rounded-xl flex flex-col overflow-hidden relative">
                    <BrowserDots />
                    <div className="p-4 space-y-2">
                        <div className="w-full h-2 bg-blue-soft rounded-full"></div>
                        <div className="w-full h-2 bg-blue-soft rounded-full"></div>
                        <div className="w-2/3 h-2 bg-blue-soft rounded-full"></div>
                    </div>
                    <div className="absolute bottom-4 right-4 w-10 h-10 bg-navy-2 rounded-full shadow-[0_10px_20px_-8px_rgba(19,27,34,0.8)] flex items-center justify-center text-blue-light">
                        <Smile className="w-5 h-5" />
                    </div>
                </div>
            ),
        },
        {
            type: "click" as const,
            eyebrow: "03 · CLIC",
            title: "Click en elemento",
            desc: "Vincula el widget a cualquier botón o enlace existente en tu sitio mediante un atributo data.",
            illustration: (
                <div className="w-full h-44 bg-white border border-blue-line rounded-xl flex flex-col overflow-hidden relative items-center justify-center">
                    <div className="px-5 py-2.5 bg-blue-deep text-white text-sm font-medium rounded-full shadow-[0_10px_22px_-12px_rgba(79,107,127,0.95)]">
                        Analizar Sonrisa
                    </div>
                    <div className="absolute mt-12 ml-14">
                        <MousePointerClick className="w-6 h-6 text-navy-2 fill-blue-light/40" />
                    </div>
                </div>
            ),
        },
    ];

    return (
        <div className="flex flex-col h-full min-h-0 bg-[linear-gradient(180deg,#f8fafb_0%,#eef3f6_100%)]">
            <div className="px-6 py-6 md:px-10 md:py-8 border-b border-blue-line bg-white pr-14">
                <span className="mono" style={{ fontSize: 9 }}>INTEGRACIÓN DEL WIDGET</span>
                <DialogTitle className="mt-2 text-2xl md:text-3xl font-semibold tracking-[-0.03em] text-ink">
                    ¿Cómo quieres añadir <span className="text-blue-accent">el widget?</span>
                </DialogTitle>
                <p className="text-[15px] md:text-base text-ink-2 mt-2">Elige el formato de integración que mejor se adapte a tu sitio web.</p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="p-5 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-7 max-w-6xl mx-auto w-full">
                    {cards.map((c, i) => (
                        <motion.div
                            key={c.type}
                            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.05 + i * 0.07, ease: EASE_OUT }}
                        >
                            <SelectionCard {...c} onClick={() => onSelect(c.type)} />
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function SelectionCard({ eyebrow, title, desc, onClick, illustration }: { eyebrow: string; title: string; desc: string; onClick: () => void; illustration: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group h-full w-full text-left cursor-pointer overflow-hidden flex flex-col bg-white border border-blue-line rounded-[18px] shadow-[0_1px_2px_rgba(27,38,48,0.04),0_12px_32px_-24px_rgba(27,38,48,0.35)] transition-[translate,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-blue-accent hover:shadow-[0_2px_4px_rgba(27,38,48,0.04),0_26px_50px_-26px_rgba(27,38,48,0.5)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-soft"
        >
            <div className="h-52 bg-blue-tint border-b border-blue-line flex items-center justify-center p-6 transition-colors duration-300 group-hover:bg-blue-soft w-full">
                <div className="w-full max-w-[240px] rounded-xl overflow-hidden shadow-[0_18px_36px_-22px_rgba(27,38,48,0.55)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]">
                    {illustration}
                </div>
            </div>
            <div className="p-6 flex-1 flex flex-col gap-2">
                <span className="mono" style={{ fontSize: 9 }}>{eyebrow}</span>
                <h3 className="font-semibold text-lg tracking-[-0.02em] text-ink">{title}</h3>
                <p className="text-sm text-ink-2 leading-relaxed text-pretty">{desc}</p>
                <span className="mt-auto pt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-deep">
                    Configurar <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
            </div>
        </button>
    )
}

function EmbedSettings({ type, onBack, widgetKey }: { type: EmbedType, onBack: () => void, widgetKey?: string | null }) {
    const [theme, setTheme] = useState("auto");
    const [brandColor, setBrandColor] = useState(DEFAULT_BRAND_COLOR);
    const [activeTab, setActiveTab] = useState("preview"); // preview | code
    const [copied, setCopied] = useState(false);
    const reduceMotion = useReducedMotion();

    const titles = {
        inline: "Incrustar en línea",
        floating: "Botón emergente flotante",
        click: "Incrustar mediante clic"
    };

    const generateCode = () => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '');

        if (type === 'inline') {
            // Modificado para mantener proporciones horizontales (16:9) y diseño del frontend
            return `<div style="width:100%; max-width:1200px; margin: 0 auto; aspect-ratio: 16/9; min-height: 500px; overflow:hidden; border-radius: 2rem; border: 1px solid #d3dee6; background: #ffffff;">
  <iframe
    src="${baseUrl}/widget?${widgetKey ? `key=${encodeURIComponent(widgetKey)}&` : ''}theme=${theme}&color=${encodeURIComponent(brandColor)}"
    width="100%"
    height="100%"
    frameborder="0"
    allow="camera; microphone; clipboard-read; clipboard-write"
    style="border:none;"
  ></iframe>
</div>`;
        }

        if (type === 'floating') {
            return `<script>
  (function(w,d,s,o,f,js,fjs){
    w['SmileWidget']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','sf','${baseUrl}/embed.js'));

  sf('init', {
    type: 'floating',
    theme: '${theme}',
    brandColor: '${brandColor}',
    position: 'bottom-right'
  });
</script>`;
        }

        return `<script src="${baseUrl}/embed.js" async></script>
<button data-sf-trigger>Analizar mi Sonrisa</button>

<script>
  window.addEventListener('load', function() {
    if(window.sf) window.sf('init', {
      type: 'modal',
      theme: '${theme}',
      brandColor: '${brandColor}'
    });
  });
</script>`;
    };

    const code = generateCode();

    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(
            () => {
                toast.success("Código copiado al portapapeles");
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
            },
            () => toast.error("No se pudo copiar. Selecciona el código y cópialo manualmente."),
        );
    };

    // Resaltado mínimo de valores entre comillas
    const highlighted = code.split(/("[^"]*"|'[^']*')/g).map((part, i) =>
        i % 2 === 1
            ? <span key={i} style={{ color: "var(--blue-light)" }}>{part}</span>
            : <span key={i}>{part}</span>
    );

    const isHex = /^#[0-9a-f]{6}$/i.test(brandColor);

    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="border-b border-blue-line px-4 md:px-6 py-3.5 pr-16 md:pr-16 flex flex-wrap items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-3 min-w-0">
                    <button type="button" onClick={onBack} className="btn btn-ghost btn-sm" style={{ padding: "8px 14px 8px 10px", gap: 4 }}>
                        <ChevronLeft className="w-4 h-4" /> Volver
                    </button>
                    <div className="h-6 w-px bg-blue-line hidden sm:block" />
                    <div className="min-w-0">
                        <span className="mono hidden sm:block" style={{ fontSize: 8.5 }}>CONFIGURAR</span>
                        <DialogTitle className="font-semibold text-lg md:text-xl tracking-[-0.02em] text-ink truncate">{titles[type!]}</DialogTitle>
                    </div>
                </div>

                <div className="seg" role="tablist">
                    {([["preview", "Vista Previa"], ["code", "Código"]] as const).map(([id, label]) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === id}
                            onClick={() => setActiveTab(id)}
                            className={activeTab === id ? "seg-on" : ""}
                            style={{ position: "relative" }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
                <div className="w-full md:w-[340px] shrink-0 border-b md:border-b-0 md:border-r border-blue-line bg-blue-tint p-5 md:p-6 space-y-7 md:overflow-y-auto">
                    <div className="space-y-6">
                        <div className="space-y-2.5">
                            <span className="mono" style={{ fontSize: 9 }}>COLOR DE LA MARCA</span>
                            <p className="text-xs text-ink-2">Personaliza el color principal para que coincida con tu marca.</p>
                            <div className="flex gap-3 items-center p-2.5 pl-3 border border-blue-line rounded-full bg-white shadow-[0_6px_18px_-14px_rgba(27,38,48,0.4)] focus-within:border-blue-accent focus-within:shadow-[0_0_0_4px_var(--blue-soft)] transition-shadow">
                                <label className="relative w-9 h-9 rounded-full border border-blue-line shadow-sm cursor-pointer shrink-0 overflow-hidden transition-transform hover:scale-105" style={{ backgroundColor: brandColor }} title="Elegir color">
                                    <input
                                        type="color"
                                        value={isHex ? brandColor : DEFAULT_BRAND_COLOR}
                                        onChange={e => setBrandColor(e.target.value)}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        aria-label="Elegir color de la marca"
                                    />
                                </label>
                                <Input value={brandColor} onChange={e => setBrandColor(e.target.value)} className="font-mono uppercase flex-1 border-0 shadow-none focus-visible:ring-0 px-0 h-auto bg-transparent text-ink" />
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <span className="mono" style={{ fontSize: 9 }}>TEMA</span>
                            <p className="text-xs text-ink-2">Elige si el widget se mostrará en modo claro u oscuro.</p>
                            <div className="p-1 bg-white border border-blue-line rounded-full shadow-[0_6px_18px_-14px_rgba(27,38,48,0.4)]">
                                <Select value={theme} onValueChange={setTheme}>
                                    <SelectTrigger className="w-full border-0 focus:ring-0 shadow-none h-9 rounded-full px-4">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">Automático (Segun sistema)</SelectItem>
                                        <SelectItem value="light">Claro (Light)</SelectItem>
                                        <SelectItem value="dark">Oscuro (Dark)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {type === 'floating' && (
                        <div className="p-4 bg-blue-soft text-blue-ink rounded-2xl text-sm border border-blue-line flex gap-3">
                            <Smile className="w-5 h-5 shrink-0 mt-0.5 text-blue-deep" />
                            <p className="leading-snug">El botón flotante está diseñado para ser discreto y aparecerá en la esquina inferior derecha por defecto.</p>
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0 min-h-[60vh] md:min-h-0 relative overflow-hidden flex flex-col bg-[radial-gradient(55%_45%_at_100%_0%,rgba(142,164,180,0.18),transparent_70%),linear-gradient(180deg,#f8fafb_0%,#eef3f6_100%)]">
                    <div className={`flex-1 overflow-y-auto p-4 md:p-8 flex items-center justify-center transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${activeTab === 'preview' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 absolute inset-0 pointer-events-none'}`}>
                        <VisualPreview type={type} brandColor={brandColor} theme={theme} />
                    </div>

                    <div className={`flex-1 min-h-0 overflow-hidden flex flex-col p-4 md:p-8 transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${activeTab === 'code' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 absolute inset-0 pointer-events-none'}`}>
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <span className="mono" style={{ fontSize: 9 }}>COPIA Y PEGA ESTE CÓDIGO</span>
                        </div>
                        <div className="flex-1 min-h-0 flex flex-col rounded-2xl overflow-hidden border border-white/10 shadow-[0_30px_60px_-36px_rgba(19,27,34,0.9)]" style={{ background: "radial-gradient(70% 90% at 100% 0%, rgba(150,190,215,0.16), transparent 60%), linear-gradient(160deg, var(--navy-1), var(--navy-2) 60%, var(--navy-3))" }}>
                            <div className="flex items-center justify-between gap-3 pl-4 pr-2 py-2 border-b border-white/10 bg-white/[0.03]">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="w-2 h-2 rounded-full bg-blue-light/75" />
                                    <span className="w-2 h-2 rounded-full bg-blue/75" />
                                    <span className="w-2 h-2 rounded-full bg-blue-deep/75" />
                                    <span className="mono ml-2 truncate" style={{ fontSize: 8.5, color: "rgba(255,255,255,0.45)" }}>{type === 'inline' ? 'widget.html' : 'embed.html'}</span>
                                </div>
                                <motion.button
                                    type="button"
                                    onClick={handleCopy}
                                    whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                                    aria-live="polite"
                                    className={`inline-flex items-center gap-2 h-8 px-3.5 rounded-full text-[13px] font-medium border transition-colors shrink-0 ${copied ? "bg-blue-light border-blue-light text-navy-2" : "bg-white/10 border-white/15 text-white hover:bg-white/15"}`}
                                >
                                    <AnimatePresence mode="wait" initial={false}>
                                        <motion.span
                                            key={copied ? "ok" : "copy"}
                                            initial={reduceMotion ? false : { opacity: 0, y: 6, scale: 0.9 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.9 }}
                                            transition={{ duration: 0.18 }}
                                            className="inline-flex items-center gap-2"
                                        >
                                            {copied ? <Check className="w-4 h-4" strokeWidth={2.4} /> : <Copy className="w-4 h-4" />}
                                            {copied ? "Copiado" : "Copiar"}
                                        </motion.span>
                                    </AnimatePresence>
                                </motion.button>
                            </div>
                            <pre className="flex-1 min-h-0 m-0 p-5 md:p-6 text-[12.5px] font-mono text-white/85 whitespace-pre-wrap [overflow-wrap:anywhere] overflow-y-auto overflow-x-hidden leading-relaxed">
                                {highlighted}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function VisualPreview({ type, brandColor, theme }: { type: EmbedType, brandColor: string, theme: string }) {
    if (type === 'inline') {
        return (
            <div className={`w-full max-w-4xl bg-white shadow-[0_24px_50px_-34px_rgba(27,38,48,0.5)] border border-blue-line p-4 md:p-8 rounded-[2rem] flex flex-col gap-6 ${theme === 'dark' ? 'dark' : ''}`}>
                <div className="space-y-2">
                    <div className="h-8 w-1/3 bg-blue-soft rounded-lg"></div>
                    <div className="h-4 w-2/3 bg-blue-tint rounded-lg"></div>
                </div>
                <div className="border border-dashed border-blue-light rounded-[2rem] p-2 md:p-4 bg-blue-tint/60 flex justify-center">
                    <div className="relative w-full border border-blue-line shadow-[0_30px_60px_-15px_rgba(27,38,48,0.14)] overflow-hidden bg-white rounded-[2rem]">
                        <div className="p-0">
                            <WidgetContainer />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (type === 'floating') {
        return (
            <div className="w-full h-full min-h-[420px] border border-dashed border-blue-light rounded-2xl relative bg-blue-tint overflow-hidden flex flex-col">
                <div className="p-6 md:p-8 space-y-6 md:space-y-8 opacity-60 blur-[1px]">
                    <div className="h-48 md:h-64 bg-blue-soft rounded-2xl"></div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="h-24 md:h-32 bg-blue-soft rounded-2xl"></div>
                        <div className="h-24 md:h-32 bg-blue-soft rounded-2xl"></div>
                        <div className="h-24 md:h-32 bg-blue-soft rounded-2xl"></div>
                    </div>
                </div>
                <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8">
                    <div className="h-14 px-6 rounded-full shadow-[0_16px_32px_-14px_rgba(19,27,34,0.7)] flex items-center gap-3 cursor-default hover:scale-105 transition-transform" style={{ backgroundColor: brandColor }}>
                        <Smile className="w-6 h-6 text-white" />
                        <span className="font-semibold text-white">Reservar</span>
                    </div>
                </div>
            </div>
        )
    }

    if (type === 'click') {
        return (
            <div className="w-full h-full min-h-[320px] flex flex-col items-center justify-center space-y-8">
                <div className="text-center space-y-2">
                    <span className="mono" style={{ fontSize: 9 }}>ELEMENTO DISPARADOR</span>
                    <p className="text-sm text-ink-2">Prueba visual (No funcional en el editor)</p>
                </div>
                <button className="px-8 py-4 rounded-full font-semibold text-white shadow-[0_16px_32px_-14px_rgba(19,27,34,0.6)] transform hover:scale-105 transition-all text-lg" style={{ backgroundColor: brandColor }}>
                    Analizar mi Sonrisa
                </button>
            </div>
        )
    }

    return null;
}
