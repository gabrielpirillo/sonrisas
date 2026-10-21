"use client";

import "./topbar.css";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Check, CircleUser, Coins, LogOut } from "lucide-react";
import { LogoMark } from "@/components/admin/qoves/LogoMark";

/** Cierra el menú lateral desde dentro (p. ej. botón X de la cabecera del menú). */
export const DrawerClose = Dialog.Close;

type Org = { id: string; name: string };

export type MobileTopBarProps = {
    /** Sección actual (derivada de la ruta). */
    title: string;
    /** Saldo de créditos de la clínica activa; null si no se conoce. */
    credits: number | null;
    /** Enlace del chip de créditos (solo quien puede recargar). */
    creditsHref?: string | null;
    email: string;
    roleLabel: string;
    initials: string;
    orgs: Org[];
    activeOrgId?: string | null;
    activeOrgName?: string | null;
    onSwitchOrg: (id: string) => void;
    onLogout: () => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Contenido del menú lateral (la misma barra lateral del escritorio). */
    drawer: ReactNode;
    /** Radix solo en cliente (evita IDs distintos entre servidor y navegador). */
    mounted: boolean;
};

const fmt = new Intl.NumberFormat("es-ES");

/** Icono de menú: dos trazos asimétricos que se igualan al pasar o pulsar. */
function MenuGlyph() {
    return (
        <span className="sf-tb-glyph" aria-hidden="true">
            <span />
            <span />
        </span>
    );
}

/**
 * Cabecera del panel en teléfonos y tablets: barra navy translúcida y fija,
 * con la sección actual, el saldo de créditos, el menú de cuenta/clínica y el
 * botón que abre el menú lateral.
 */
export function MobileTopBar({
    title, credits, creditsHref, email, roleLabel, initials, orgs, activeOrgId, activeOrgName,
    onSwitchOrg, onLogout, open, onOpenChange, drawer, mounted,
}: MobileTopBarProps) {
    const reduce = useReducedMotion();
    const [scrolled, setScrolled] = useState(false);

    // Borde y sombra solo cuando el contenido pasa por debajo de la barra.
    useEffect(() => {
        let raf = 0;
        const update = () => {
            raf = 0;
            setScrolled(window.scrollY > 4);
        };
        const onScroll = () => {
            if (!raf) raf = requestAnimationFrame(update);
        };
        update();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", onScroll);
            if (raf) cancelAnimationFrame(raf);
        };
    }, []);

    const menuButton = (
        <button type="button" className="sf-tb-btn sf-tb-menu" aria-label={open ? "Cerrar menú" : "Abrir menú"}>
            <MenuGlyph />
        </button>
    );

    const creditsText = credits === null ? null : fmt.format(credits);
    const creditsLabel = credits === null ? "" : `Saldo: ${creditsText} ${credits === 1 ? "crédito" : "créditos"}`;
    const creditsChip =
        creditsText === null ? null : creditsHref ? (
            <Link href={creditsHref} className="sf-tb-credits" data-empty={credits! <= 0 || undefined} aria-label={`${creditsLabel}. Ver créditos`}>
                <Coins size={15} strokeWidth={1.9} aria-hidden />
                <span className="sf-tb-credits-num">{creditsText}</span>
            </Link>
        ) : (
            <span className="sf-tb-credits" data-empty={credits! <= 0 || undefined} role="img" aria-label={creditsLabel}>
                <Coins size={15} strokeWidth={1.9} aria-hidden />
                <span className="sf-tb-credits-num" aria-hidden>{creditsText}</span>
            </span>
        );

    const avatar = <span className="sf-tb-avatar" aria-hidden="true">{initials}</span>;

    const titleMotion = reduce
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0 } }
        : {
              initial: { opacity: 0, y: 12, filter: "blur(4px)" },
              animate: { opacity: 1, y: 0, filter: "blur(0px)" },
              exit: { opacity: 0, y: -12, filter: "blur(4px)" },
              transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const },
          };

    return (
        <header className="qoves-mobile-header sf-topbar" data-scrolled={scrolled || undefined}>
            {mounted ? (
                <Dialog.Root open={open} onOpenChange={onOpenChange}>
                    <Dialog.Trigger asChild>{menuButton}</Dialog.Trigger>
                    <Dialog.Portal>
                        <Dialog.Overlay className="sf-drawer-overlay" />
                        <Dialog.Content className="sf-drawer" aria-describedby={undefined}>
                            <Dialog.Title className="sr-only">Navegación</Dialog.Title>
                            <div className="qoves-admin sf-touch sf-drawer-inner">{drawer}</div>
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>
            ) : (
                <span className="sf-tb-btn sf-tb-menu" aria-hidden="true"><MenuGlyph /></span>
            )}

            <Link href="/administracion/dashboard" className="sf-tb-home" aria-label="Smile Fast · Ir al resumen">
                <LogoMark size={32} variant="light" />
            </Link>

            <div className="sf-tb-heading">
                <span className="sf-tb-eyebrow" title={activeOrgName ?? undefined}>
                    {activeOrgName || "Smile Fast"}
                </span>
                <span className="sf-tb-title-slot">
                    <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span key={title} className="sf-tb-title" {...titleMotion}>
                            {title}
                        </motion.span>
                    </AnimatePresence>
                </span>
            </div>

            <div className="sf-tb-actions">
                {creditsChip}

                {mounted ? (
                    <Menu.Root>
                        <Menu.Trigger asChild>
                            <button type="button" className="sf-tb-btn sf-tb-account" aria-label="Cuenta y clínica">
                                {avatar}
                            </button>
                        </Menu.Trigger>
                        <Menu.Portal>
                            <Menu.Content
                                className="qoves-admin sf-acct-menu"
                                align="end"
                                sideOffset={10}
                                collisionPadding={12}
                            >
                                <div className="sf-acct-head">
                                    {avatar}
                                    <div style={{ minWidth: 0 }}>
                                        <div className="sf-acct-email" title={email}>{email || "Sesión"}</div>
                                        <div className="sf-acct-role">{roleLabel}</div>
                                    </div>
                                </div>

                                {orgs.length > 0 && (
                                    <>
                                        <Menu.Separator className="sf-acct-sep" />
                                        <Menu.Label className="sf-acct-label">Clínica</Menu.Label>
                                        <Menu.RadioGroup value={activeOrgId ?? ""} onValueChange={onSwitchOrg}>
                                            {orgs.map((o) => (
                                                <Menu.RadioItem key={o.id} value={o.id} className="sf-acct-item">
                                                    <span className="sf-acct-org-dot" aria-hidden>{o.name.slice(0, 1).toUpperCase()}</span>
                                                    <span className="sf-acct-item-text">{o.name}</span>
                                                    <Menu.ItemIndicator className="sf-acct-check">
                                                        <Check size={16} strokeWidth={2} />
                                                    </Menu.ItemIndicator>
                                                </Menu.RadioItem>
                                            ))}
                                        </Menu.RadioGroup>
                                    </>
                                )}

                                <Menu.Separator className="sf-acct-sep" />
                                <Menu.Item asChild className="sf-acct-item">
                                    <Link href="/administracion/cuenta">
                                        <CircleUser size={17} strokeWidth={1.7} aria-hidden />
                                        <span className="sf-acct-item-text">Mi cuenta</span>
                                    </Link>
                                </Menu.Item>
                                <Menu.Item className="sf-acct-item sf-acct-item-danger" onSelect={onLogout}>
                                    <LogOut size={17} strokeWidth={1.7} aria-hidden />
                                    <span className="sf-acct-item-text">Cerrar sesión</span>
                                </Menu.Item>
                            </Menu.Content>
                        </Menu.Portal>
                    </Menu.Root>
                ) : (
                    <span className="sf-tb-btn sf-tb-account" aria-hidden="true">{avatar}</span>
                )}
            </div>
        </header>
    );
}
