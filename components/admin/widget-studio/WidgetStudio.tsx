"use client";

import "./widget-studio.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
    Palette, Type, MessageCircle, ToggleRight, Code2, ListPlus, Loader2, RotateCcw,
    CloudUpload, Eye, PencilLine, Lock, CircleCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PageHead } from "@/components/admin/qoves/PageHead";
import { type CustomField, type WidgetConfig } from "@/lib/widgetConfig";
import { resetWidgetConfigAction, saveWidgetConfigAction } from "@/app/(admin)/administracion/widget/actions";
import { BrandSection, ContactSection, FeaturesSection, InstallSection, TextsSection, type Patch } from "./sections";
import { PreviewPane, type Device } from "./PreviewPane";
import { CustomFieldsSection } from "./CustomFieldsSection";
import { countChanges, validateDraft, type SectionId } from "./validation";

const TABS: { id: SectionId; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; hint: string }[] = [
    { id: "brand", label: "Marca", icon: Palette, hint: "Logo, color y estilo" },
    { id: "texts", label: "Textos", icon: Type, hint: "Lo que lee el paciente" },
    { id: "fields", label: "Campos", icon: ListPlus, hint: "Preguntas del formulario" },
    { id: "contact", label: "Contacto", icon: MessageCircle, hint: "WhatsApp y enlaces" },
    { id: "features", label: "Funciones", icon: ToggleRight, hint: "Qué se muestra" },
    { id: "install", label: "Instalar", icon: Code2, hint: "Código para tu web" },
];

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function useNow(intervalMs = 30_000) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);
    return now;
}

export function WidgetStudio({
    initialConfig,
    initialUpdatedAt,
    clinicName,
    widgetKey,
    readOnly = false,
}: {
    initialConfig: WidgetConfig;
    initialUpdatedAt: string | null;
    clinicName: string;
    widgetKey: string | null;
    readOnly?: boolean;
}) {
    const [saved, setSaved] = useState<WidgetConfig>(initialConfig);
    const [draft, setDraft] = useState<WidgetConfig>(initialConfig);
    const [updatedAt, setUpdatedAt] = useState<string | null>(initialUpdatedAt);
    const [tab, setTab] = useState<SectionId>("brand");
    const [view, setView] = useState<"edit" | "preview">("edit");
    const [device, setDevice] = useState<Device>("desktop");
    const deviceTouched = useRef(false);
    const [saving, setSaving] = useState(false);
    const [resetOpen, setResetOpen] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [justPublished, setJustPublished] = useState(0);
    const reduceMotion = useReducedMotion();
    const now = useNow();
    const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    const dirty = !same(draft, saved);
    const changes = useMemo(() => countChanges(draft, saved), [draft, saved]);
    const errors = useMemo(() => validateDraft(draft), [draft]);
    const hasErrors = Object.keys(errors).length > 0;
    const sectionDirty: Partial<Record<SectionId, boolean>> = {
        brand: !same(draft.brand, saved.brand),
        texts: !same(draft.texts, saved.texts),
        contact: !same(draft.contact, saved.contact),
        features: !same(draft.features, saved.features),
        fields: !same(draft.customFields, saved.customFields),
    };

    const patch: Patch = useCallback((group, p) => {
        setDraft((d) => ({ ...d, [group]: { ...d[group], ...p } }));
    }, []);
    const setFields = useCallback((customFields: CustomField[]) => {
        setDraft((d) => ({ ...d, customFields }));
    }, []);

    // ── Guardar y publicar ───────────────────────────────────────────────
    const save = useCallback(async () => {
        if (readOnly || saving || !dirty) return;
        if (hasErrors) {
            const first = (Object.keys(errors) as SectionId[])[0];
            setTab(first);
            setView("edit");
            toast.error("Revisa los campos marcados antes de publicar.");
            return;
        }
        setSaving(true);
        try {
            const res = await saveWidgetConfigAction(draft);
            if (!res.ok) { toast.error(res.error); return; }
            setSaved(res.data);
            setDraft(res.data);
            setUpdatedAt(new Date().toISOString());
            setJustPublished((n) => n + 1);
            toast.success("Widget publicado", { description: "Tu web ya muestra los cambios." });
        } catch {
            toast.error("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.");
        } finally {
            setSaving(false);
        }
    }, [readOnly, saving, dirty, hasErrors, errors, draft]);

    const discard = () => {
        setDraft(saved);
        toast("Cambios descartados");
    };

    const resetAll = async () => {
        setResetting(true);
        try {
            const res = await resetWidgetConfigAction();
            if (!res.ok) { toast.error(res.error); return; }
            setSaved(res.data);
            setDraft(res.data);
            setUpdatedAt(new Date().toISOString());
            setJustPublished((n) => n + 1);
            setResetOpen(false);
            toast.success("Widget restablecido", { description: "Se publicó la configuración original." });
        } catch {
            toast.error("No se pudo restablecer. Inténtalo de nuevo.");
        } finally {
            setResetting(false);
        }
    };

    // ── Avisos al salir con cambios sin guardar ──────────────────────────
    useEffect(() => {
        if (!dirty || readOnly) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        // Navegación interna del panel (los <Link> no disparan beforeunload).
        const onClick = (e: MouseEvent) => {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
            if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
            const url = new URL(a.href, window.location.href);
            if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
            if (!window.confirm("Tienes cambios sin publicar. ¿Salir sin guardarlos?")) {
                e.preventDefault();
                e.stopPropagation();
            }
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        document.addEventListener("click", onClick, true);
        return () => {
            window.removeEventListener("beforeunload", onBeforeUnload);
            document.removeEventListener("click", onClick, true);
        };
    }, [dirty, readOnly]);

    // ⌘S / Ctrl+S guarda
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                save();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [save]);

    // ── Pestañas (flechas, Inicio, Fin) ───────────────────────────────────
    const onTabKey = (e: React.KeyboardEvent) => {
        const idx = TABS.findIndex((t) => t.id === tab);
        let next = idx;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % TABS.length;
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + TABS.length) % TABS.length;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = TABS.length - 1;
        else return;
        e.preventDefault();
        setTab(TABS[next].id);
        tabRefs.current[TABS[next].id]?.focus();
    };

    // En pantallas estrechas la vista previa arranca en formato móvil.
    const openView = (v: "edit" | "preview") => {
        if (v === "preview" && !deviceTouched.current && window.matchMedia("(max-width: 640px)").matches) setDevice("mobile");
        setView(v);
    };

    const published = updatedAt
        ? `Última publicación: ${formatDistanceToNow(new Date(Math.min(new Date(updatedAt).getTime(), now)), { addSuffix: true, locale: es })}`
        : "Usando la configuración original";

    const panelMotion = reduceMotion
        ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 1 } }
        : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.24, ease: EASE_OUT } };

    return (
        <div className="ws-root" data-view={view}>
            <PageHead eyebrow="GESTIÓN" title="Tu widget," accent="a tu manera" subtitle="Personaliza colores, textos y funciones. Al guardar, tu web se actualiza sola.">
                <motion.span
                    key={justPublished}
                    className="sf-badge ws-status"
                    initial={reduceMotion || justPublished === 0 ? false : { scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 24 }}
                    suppressHydrationWarning
                >
                    <CircleCheck size={14} aria-hidden />
                    {published}
                </motion.span>
                {!readOnly && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setResetOpen(true)}>
                        <RotateCcw size={15} aria-hidden />
                        Restablecer todo
                    </button>
                )}
            </PageHead>

            {readOnly && (
                <div className="ws-readonly" role="status">
                    <Lock size={15} aria-hidden />
                    Solo lectura durante una impersonación: puedes revisar la configuración, pero no cambiarla.
                </div>
            )}

            {/* Pantallas estrechas: alternar entre editor y vista previa */}
            <div className="ws-viewswitch ws-seg" role="radiogroup" aria-label="Vista">
                {([["edit", "Editar", <PencilLine key="e" size={15} aria-hidden />], ["preview", "Vista previa", <Eye key="p" size={15} aria-hidden />]] as const).map(([id, label, icon]) => (
                    <button key={id} type="button" role="radio" aria-checked={view === id} className={view === id ? "is-on" : ""} onClick={() => openView(id)}>
                        {view === id && <motion.span layoutId={reduceMotion ? undefined : "ws-view-pill"} className="ws-seg-pill" transition={{ type: "spring", stiffness: 460, damping: 36 }} />}
                        <span className="ws-seg-label">{icon}{label}</span>
                    </button>
                ))}
            </div>

            <div className="ws-layout">
                {/* ── Editor ── */}
                <section className="card ws-editor" aria-label="Editor del widget">
                    <div className="ws-tabs" role="tablist" aria-label="Secciones del widget" onKeyDown={onTabKey}>
                        {TABS.map((t) => {
                            const Icon = t.icon;
                            const on = tab === t.id;
                            const err = Boolean(errors[t.id]);
                            const mod = Boolean(sectionDirty[t.id]);
                            return (
                                <button
                                    key={t.id}
                                    ref={(el) => { tabRefs.current[t.id] = el; }}
                                    id={`ws-tab-${t.id}`}
                                    type="button"
                                    role="tab"
                                    aria-selected={on}
                                    aria-controls={`ws-panel-${t.id}`}
                                    tabIndex={on ? 0 : -1}
                                    className={"ws-tab" + (on ? " is-on" : "")}
                                    onClick={() => setTab(t.id)}
                                >
                                    {on && <motion.span layoutId={reduceMotion ? undefined : "ws-tab-pill"} className="ws-tab-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                                    <span className="ws-tab-inner">
                                        <Icon size={16} strokeWidth={1.8} />
                                        <span className="ws-tab-label">{t.label}</span>
                                        {(err || mod) && (
                                            <span className={"ws-tab-dot" + (err ? " is-error" : "")} title={err ? "Hay campos por revisar" : "Cambios sin guardar"}>
                                                <span className="sr-only">{err ? "(con errores)" : "(con cambios)"}</span>
                                            </span>
                                        )}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <fieldset disabled={readOnly && tab !== "install"} className="ws-fieldset">
                        <legend className="sr-only">{TABS.find((t) => t.id === tab)?.label}</legend>
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={tab}
                                id={`ws-panel-${tab}`}
                                role="tabpanel"
                                aria-labelledby={`ws-tab-${tab}`}
                                className="ws-panel"
                                {...panelMotion}
                            >
                                <p className="ws-panel-hint mono">{TABS.find((t) => t.id === tab)?.hint}</p>
                                {tab === "brand" && <BrandSection draft={draft} patch={patch} clinicName={clinicName} readOnly={readOnly} />}
                                {tab === "texts" && <TextsSection draft={draft} patch={patch} />}
                                {tab === "fields" && <CustomFieldsSection draft={draft} setFields={setFields} goTo={setTab} />}
                                {tab === "contact" && <ContactSection draft={draft} patch={patch} />}
                                {tab === "features" && <FeaturesSection draft={draft} patch={patch} />}
                                {tab === "install" && <InstallSection widgetKey={widgetKey} />}
                            </motion.div>
                        </AnimatePresence>
                    </fieldset>
                </section>

                {/* ── Vista previa ── */}
                <aside className="ws-preview" aria-label="Vista previa del widget">
                    <PreviewPane
                        config={draft}
                        widgetKey={widgetKey}
                        dirty={dirty}
                        device={device}
                        onDeviceChange={(d) => { deviceTouched.current = true; setDevice(d); }}
                    />
                </aside>
            </div>

            {/* ── Barra de guardado ── */}
            <AnimatePresence>
                {dirty && !readOnly && (
                    <motion.div
                        className="ws-savebar"
                        role="region"
                        aria-label="Cambios sin guardar"
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    >
                        <div className="ws-savebar-text">
                            <span className={"ws-savebar-dot" + (hasErrors ? " is-error" : "")} aria-hidden />
                            <div style={{ minWidth: 0 }}>
                                <strong>{hasErrors ? "Revisa los campos marcados" : "Cambios sin guardar"}</strong>
                                <span>{changes} {changes === 1 ? "cambio" : "cambios"} · se publicarán en tu web al guardar</span>
                            </div>
                        </div>
                        <div className="ws-savebar-actions">
                            <button type="button" className="btn btn-sm ws-btn-discard" onClick={discard} disabled={saving}>
                                Descartar
                            </button>
                            <button type="button" className="btn btn-sm ws-btn-publish" onClick={save} disabled={saving} aria-keyshortcuts="Control+S Meta+S">
                                {saving ? <Loader2 size={15} className="ws-spin" aria-hidden /> : <CloudUpload size={15} aria-hidden />}
                                {saving ? "Publicando…" : "Guardar y publicar"}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Confirmación: restablecer todo ── */}
            <Dialog open={resetOpen} onOpenChange={(o) => !resetting && setResetOpen(o)}>
                <DialogContent className="!max-w-[440px] w-[calc(100vw-24px)] p-0 gap-0 bg-white rounded-[22px] border-[var(--blue-line)]">
                    <div className="qoves-admin ws-confirm">
                        <span className="ws-confirm-ic" aria-hidden><RotateCcw size={20} /></span>
                        <DialogTitle className="ws-confirm-title">¿Restablecer todo el widget?</DialogTitle>
                        <DialogDescription className="ws-confirm-text">
                            Vuelven los colores, textos y funciones originales de Smile Fast y se quita tu logo. El cambio se publica en tu web al momento.
                        </DialogDescription>
                        <div className="ws-confirm-actions">
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setResetOpen(false)} disabled={resetting}>
                                Cancelar
                            </button>
                            <button type="button" className="btn btn-primary btn-sm ws-btn-danger" onClick={resetAll} disabled={resetting}>
                                {resetting ? <Loader2 size={15} className="ws-spin" aria-hidden /> : <RotateCcw size={15} aria-hidden />}
                                {resetting ? "Restableciendo…" : "Restablecer y publicar"}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
