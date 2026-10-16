"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Users, ScrollText, SlidersHorizontal, ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/admin/qoves/LogoMark";

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
            {/* Operator branding */}
            <div className="clinic-switch" style={{ cursor: "default" }}>
                <LogoMark size={34} dark />
                <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.02em" }}>Smile Forward</div>
                    <span className="mono" style={{ fontSize: 8.5, color: "#7e8c86" }}>● CONSOLA DE OPERADOR</span>
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
                        {email || "Equipo Smile Forward"}
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
