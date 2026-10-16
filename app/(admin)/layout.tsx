"use client";

import "./qoves-admin.css";

import Link from "next/link";
import {
    LayoutGrid, Users, SlidersHorizontal, LogOut, Menu,
    Coins, Building2, ShieldCheck, CircleUser,
} from "lucide-react";
import { authClient, useListOrganizations, useActiveOrganization } from "@/lib/auth/client";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { LogoMark } from "@/components/admin/qoves/LogoMark";

type Role = "admin" | "basic";
type NavItem = { href: string; label: string; icon: any; adminOnly?: boolean };
type NavSection = { title: string; items: NavItem[] };

// En impersonación (solo lectura) se ocultan acciones sensibles.
const HIDDEN_WHEN_IMPERSONATING = [
    "/administracion/miembros",
    "/administracion/settings",
    "/administracion/update-password",
];

// Navegación agrupada por intención: operación diaria, gestión de entidades y ajustes de cuenta.
const NAV_SECTIONS: NavSection[] = [
    {
        title: "OPERACIÓN",
        items: [
            { href: "/administracion/dashboard", label: "Resumen", icon: LayoutGrid },
            { href: "/administracion/leads", label: "Leads", icon: Users },
        ],
    },
    {
        title: "GESTIÓN",
        items: [
            { href: "/administracion/clinicas", label: "Clínicas", icon: Building2 },
            { href: "/administracion/creditos", label: "Créditos", icon: Coins, adminOnly: true },
        ],
    },
    {
        title: "CUENTA",
        items: [
            { href: "/administracion/settings", label: "Configuración", icon: SlidersHorizontal, adminOnly: true },
            { href: "/administracion/cuenta", label: "Mi cuenta", icon: CircleUser },
        ],
    },
];

function initialsOf(email: string) {
    if (!email) return "SF";
    return email.split(/[\s@.]+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [role, setRole] = useState<Role | null>(null);
    const [email, setEmail] = useState("");
    const [isPlatform, setIsPlatform] = useState(false);
    const [impersonating, setImpersonating] = useState(false);
    const { data: orgs } = useListOrganizations();
    const { data: activeOrg } = useActiveOrganization();

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/me");
                const data = await res.json();
                if (data?.user?.role) setRole(data.user.role as Role);
                if (data?.user?.email) setEmail(data.user.email);
                setIsPlatform(Boolean(data?.user?.isPlatformAdmin));
                setImpersonating(Boolean(data?.user?.impersonating));
            } catch (err) {
                console.error("Error fetching role:", err);
            }
        })();
    }, []);

    async function stopImpersonating() {
        await authClient.admin.stopImpersonating();
        window.location.href = "/superadmin/usuarios";
    }

    async function switchOrg(id: string) {
        await authClient.organization.setActive({ organizationId: id });
        router.refresh();
    }

    const handleLogout = async () => {
        try {
            await authClient.signOut();
            router.push("/acceso");
            router.refresh();
        } catch {
            toast.error("Error al cerrar sesión");
        }
    };

    // Resalta también las subrutas (p. ej. /leads/123), no solo la coincidencia exacta.
    const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

    const ImpersonationBanner = () =>
        impersonating ? (
            <div style={{ background: "#f0b429", color: "#1c1e1d", fontSize: 13, padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <span>Estás impersonando a otro usuario.</span>
                <button onClick={stopImpersonating} style={{ textDecoration: "underline", fontWeight: 600, background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
                    Salir de impersonación
                </button>
            </div>
        ) : null;

    const SidebarContent = () => (
        <aside className="sidebar">
            {/* Clinic switch (Better Auth organizations) — estilo del diseño */}
            <Select value={activeOrg?.id ?? undefined} onValueChange={switchOrg}>
                <SelectTrigger className="clinic-switch" style={{ height: "auto" }} aria-label="Cambiar clínica">
                    <LogoMark size={34} dark />
                    <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            <SelectValue placeholder="Selecciona clínica" />
                        </div>
                        <span className="mono" style={{ fontSize: 8.5 }}>CLÍNICA</span>
                    </div>
                </SelectTrigger>
                <SelectContent>
                    {(orgs ?? []).map((o: { id: string; name: string }) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
            </Select>

            {/* Grouped nav */}
            <nav className="nav-scroll">
                {NAV_SECTIONS.map((section) => {
                    const items = section.items.filter(
                        (item) =>
                            (!item.adminOnly || role === "admin") &&
                            !(impersonating && HIDDEN_WHEN_IMPERSONATING.includes(item.href))
                    );
                    if (items.length === 0) return null;
                    return (
                        <div key={section.title} style={{ marginBottom: 18 }}>
                            <div className="mono nav-group">{section.title}</div>
                            {items.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setOpen(false)}
                                        className={"navitem" + (active ? " navitem-on" : "")}
                                    >
                                        <Icon size={18} strokeWidth={1.6} />
                                        <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    );
                })}

                {isPlatform && (
                    <div style={{ marginBottom: 8 }}>
                        <div className="mono nav-group">SUPER-ADMIN</div>
                        <Link
                            href="/superadmin"
                            onClick={() => setOpen(false)}
                            className={"navitem" + (pathname.startsWith("/superadmin") ? " navitem-on" : "")}
                            style={{ color: "var(--sage-deep, #7e8c86)" }}
                        >
                            <ShieldCheck size={18} strokeWidth={1.6} />
                            <span style={{ flex: 1, textAlign: "left" }}>Plataforma</span>
                        </Link>
                    </div>
                )}
            </nav>

            {/* User foot */}
            <div className="user-foot">
                <span className="avatar">{initialsOf(email)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={email}>
                        {email || "Sesión"}
                    </div>
                    <div className="mono" style={{ fontSize: 8.5, opacity: 0.7 }}>{(role || "").toUpperCase() || "PANEL"}</div>
                </div>
                <button className="icon-btn" onClick={handleLogout} title="Cerrar sesión" aria-label="Cerrar sesión">
                    <LogOut size={16} strokeWidth={1.6} />
                </button>
            </div>
        </aside>
    );

    // Flujo de autenticación: cambiar contraseña forzado, sin navegación.
    const isAuthFlow = pathname === "/administracion/update-password";
    if (isAuthFlow) {
        return (
            <div className="qoves-admin" style={{ height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <ImpersonationBanner />
                <main className="main-scroll" style={{ flex: 1 }}>{children}</main>
            </div>
        );
    }

    return (
        <div className="qoves-admin" style={{ height: "100vh", overflow: "hidden" }}>
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <ImpersonationBanner />

                {/* Mobile header (solo móvil) */}
                <div
                    className="qoves-mobile-header"
                    style={{ alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#fff", borderBottom: "1px solid var(--line)" }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <LogoMark size={30} dark />
                        <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.02em" }}>Smile Forward</span>
                    </div>
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon"><Menu className="h-6 w-6" /></Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-[266px] border-r-0">
                            <SheetTitle className="sr-only">Navegación</SheetTitle>
                            <div className="qoves-admin" style={{ height: "100%" }}>
                                <SidebarContent />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
                    <div className="qoves-desktop-sidebar">
                        <SidebarContent />
                    </div>
                    <main className="main-scroll">{children}</main>
                </div>
            </div>
        </div>
    );
}
