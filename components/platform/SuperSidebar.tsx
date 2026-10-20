"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Users, ScrollText, SlidersHorizontal, ArrowLeft } from "lucide-react";
import { Wordmark } from "@/components/admin/qoves/LogoMark";

type Item = { href: string; label: string; icon: typeof LayoutGrid };
const GROUPS: Array<{ title: string; items: Item[] }> = [
    {
        title: "PLATAFORMA",
        items: [
            { href: "/superadmin", label: "Visión general", icon: LayoutGrid },
            { href: "/superadmin/usuarios", label: "Usuarios", icon: Users },
        ],
    },
    {
        title: "OPERACIÓN",
        items: [
            { href: "/superadmin/auditoria", label: "Auditoría", icon: ScrollText },
            { href: "/superadmin/config", label: "Configuración", icon: SlidersHorizontal },
        ],
    },
];

/** La ficha de una clínica cuelga de la visión general (allí está el listado). */
function useIsActive() {
    const pathname = usePathname() || "";
    return (href: string) =>
        href === "/superadmin"
            ? pathname === href || pathname.startsWith("/superadmin/clinicas")
            : pathname === href || pathname.startsWith(href + "/");
}

export function SuperSidebar({ email }: { email: string }) {
    const isActive = useIsActive();

    return (
        <aside className="sidebar">
            <div className="side-brand">
                <Wordmark tone="light" height={22} />
                <span className="mono" style={{ fontSize: 8, marginLeft: "auto", padding: "4px 8px", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 99 }}>OPERADOR</span>
            </div>

            {/* Consola de operador */}
            <div className="clinic-switch" style={{ cursor: "default" }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.3)", flexShrink: 0 }}>
                    <span className="sa-live-dot" />
                </span>
                <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.02em", color: "#fff" }}>Consola</div>
                    <span className="mono" style={{ fontSize: 8.5 }}>PLATAFORMA · EN VIVO</span>
                </div>
            </div>

            <nav className="nav-scroll" aria-label="Consola de operador">
                {GROUPS.map(({ title, items }) => (
                    <div key={title} style={{ marginBottom: 18 }}>
                        <div className="mono nav-group">{title}</div>
                        {items.map((item) => {
                            const Icon = item.icon;
                            const on = isActive(item.href);
                            return (
                                <Link key={item.href} href={item.href} className={"navitem" + (on ? " navitem-on" : "")} aria-current={on ? "page" : undefined}>
                                    <Icon size={18} strokeWidth={1.6} aria-hidden />
                                    <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <div className="user-foot">
                <span className="avatar">SF</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={email}>
                        {email || "Equipo Smile Fast"}
                    </div>
                    <div className="mono" style={{ fontSize: 8.5, opacity: 0.7 }}>SUPERADMIN</div>
                </div>
                <Link href="/administracion/dashboard" className="icon-btn" title="Volver al panel de clínica" aria-label="Volver al panel de clínica">
                    <ArrowLeft size={16} strokeWidth={1.6} aria-hidden />
                </Link>
            </div>
        </aside>
    );
}

/** Cabecera móvil de la consola: marca + vuelta al panel + navegación en píldoras deslizables. */
export function SuperMobileBar() {
    const pathname = usePathname();
    const isActive = useIsActive();
    const items = GROUPS.flatMap((g) => g.items);
    const navRef = useRef<HTMLElement>(null);
    const [fade, setFade] = useState({ start: false, end: false });
    const [scrolled, setScrolled] = useState(false);

    // Indicadores de desplazamiento horizontal (degradado en el borde que tiene más contenido).
    useEffect(() => {
        const nav = navRef.current;
        if (!nav) return;
        const update = () => {
            const max = nav.scrollWidth - nav.clientWidth;
            const start = nav.scrollLeft > 4;
            const end = max - nav.scrollLeft > 4;
            setFade((f) => (f.start === start && f.end === end ? f : { start, end }));
        };
        update();
        nav.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
        return () => {
            nav.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
        };
    }, []);

    // Lleva la píldora activa a la vista al cambiar de sección.
    useEffect(() => {
        const nav = navRef.current;
        const on = nav?.querySelector<HTMLElement>('[aria-current="page"]');
        if (!nav || !on) return;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const left = on.offsetLeft - (nav.clientWidth - on.offsetWidth) / 2;
        nav.scrollTo({ left: Math.max(0, left), behavior: reduce ? "auto" : "smooth" });
    }, [pathname]);

    // Sombra bajo la barra cuando el contenido se desplaza por debajo.
    useEffect(() => {
        const main = document.getElementById("sa-main");
        if (!main) return;
        const onScroll = () => setScrolled(main.scrollTop > 4);
        onScroll();
        main.addEventListener("scroll", onScroll, { passive: true });
        return () => main.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <header className="qoves-mobile-header sa-mbar" data-scrolled={scrolled || undefined}>
            <div className="sa-mbar-top">
                <Link href="/superadmin" className="sa-mbar-brand" aria-label="Consola de operador · inicio">
                    <Wordmark tone="light" height={19} />
                    <span className="mono sa-mbar-tag">OPERADOR</span>
                </Link>
                <Link href="/administracion/dashboard" className="mono sa-mbar-back" aria-label="Volver al panel de clínica">
                    <ArrowLeft size={14} aria-hidden /> PANEL
                </Link>
            </div>
            <nav
                ref={navRef}
                className="sa-mnav"
                aria-label="Secciones de la consola"
                data-fade-start={fade.start || undefined}
                data-fade-end={fade.end || undefined}
            >
                {items.map((item) => {
                    const Icon = item.icon;
                    const on = isActive(item.href);
                    return (
                        <Link key={item.href} href={item.href} aria-current={on ? "page" : undefined}>
                            <Icon size={15} strokeWidth={1.8} aria-hidden />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </header>
    );
}
