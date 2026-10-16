"use client";

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

export function SuperSidebar({ email }: { email: string }) {
    const pathname = usePathname();
    const isActive = (href: string) =>
        href === "/superadmin" ? pathname === href : pathname === href || pathname.startsWith(href + "/");

    return (
        <aside className="sidebar">
            <div className="side-brand">
                <Wordmark tone="light" height={22} />
                <span className="mono" style={{ fontSize: 8, marginLeft: "auto", padding: "4px 8px", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 99 }}>OPERADOR</span>
            </div>

            {/* Consola de operador */}
            <div className="clinic-switch" style={{ cursor: "default" }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.3)", flexShrink: 0 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--scan)", boxShadow: "0 0 10px var(--scan)", animation: "sf-glow 1.8s ease-in-out infinite" }} />
                </span>
                <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.02em", color: "#fff" }}>Consola</div>
                    <span className="mono" style={{ fontSize: 8.5 }}>PLATAFORMA · EN VIVO</span>
                </div>
            </div>

            <nav className="nav-scroll">
                {GROUPS.map(({ title, items }) => (
                    <div key={title} style={{ marginBottom: 18 }}>
                        <div className="mono nav-group">{title}</div>
                        {items.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link key={item.href} href={item.href} className={"navitem" + (isActive(item.href) ? " navitem-on" : "")}>
                                    <Icon size={18} strokeWidth={1.6} />
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
                    <ArrowLeft size={16} strokeWidth={1.6} />
                </Link>
            </div>
        </aside>
    );
}

/** Cabecera móvil de la consola: marca + navegación horizontal. */
export function SuperMobileBar() {
    const pathname = usePathname();
    const items = GROUPS.flatMap((g) => g.items);
    const isActive = (href: string) =>
        href === "/superadmin" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
    return (
        <div className="qoves-mobile-header" style={{ flexDirection: "column", background: "linear-gradient(90deg, var(--navy-1), var(--navy-2))", color: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
                <Wordmark tone="light" height={20} />
                <Link href="/administracion/dashboard" className="mono" style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <ArrowLeft size={13} /> PANEL
                </Link>
            </div>
            <nav className="super-mobile-nav">
                {items.map((item) => (
                    <Link key={item.href} href={item.href} className={isActive(item.href) ? "on" : ""}>{item.label}</Link>
                ))}
            </nav>
        </div>
    );
}
