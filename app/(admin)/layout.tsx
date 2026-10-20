"use client";

import "./qoves-admin.css";

import Link from "next/link";
import {
    LayoutGrid, Users, SlidersHorizontal, LogOut, Menu, X, ArrowLeft,
    Coins, Building2, ShieldCheck, CircleUser, ChevronRight, Palette,
} from "lucide-react";
import { authClient, useListOrganizations, useActiveOrganization } from "@/lib/auth/client";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Sheet, SheetClose, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useState, useEffect, type ComponentType } from "react";
import { LogoMark, Wordmark } from "@/components/admin/qoves/LogoMark";
import { useMounted } from "@/components/panel/credits/useMounted";

type Role = "admin" | "basic";
type NavItem = { href: string; label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }>; adminOnly?: boolean };
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
            { href: "/administracion/widget", label: "Widget", icon: Palette, adminOnly: true },
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
    // Los menús Radix (Select/Sheet) solo se montan en el cliente: así el
    // servidor y el navegador no generan IDs distintos (error de hidratación).
    const mounted = useMounted();
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

    // Elementos (no componentes) para no re-montar el menú en cada render.
    const impersonationBanner =
        impersonating ? (
            <div className="sf-imp-banner" role="status">
                <span>Estás impersonando a otro usuario.</span>
                <button type="button" onClick={stopImpersonating}>
                    Salir de impersonación
                </button>
            </div>
        ) : null;

    const renderSidebar = (inSheet = false) => (
        <aside className={"sidebar" + (inSheet ? " sidebar-sheet" : "")}>
            <div className="side-brand">
                <Wordmark tone="light" height={22} />
                {inSheet ? (
                    <SheetClose className="side-close" aria-label="Cerrar menú">
                        <X size={20} strokeWidth={1.8} />
                    </SheetClose>
                ) : (
                    <span className="mono" style={{ fontSize: 8, marginLeft: "auto", padding: "4px 8px", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 99 }}>PANEL</span>
                )}
            </div>

            {/* Selector de clínica (organizaciones de Better Auth) */}
            {mounted ? (
            <Select key={activeOrg?.id ?? 'sin-org'} value={activeOrg?.id ?? undefined} onValueChange={switchOrg}>
                <SelectTrigger className="clinic-switch" style={{ height: "auto" }} aria-label="Cambiar clínica">
                    <LogoMark size={34} variant="light" />
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
            ) : (
                <div className="clinic-switch" aria-hidden="true"><LogoMark size={34} variant="light" /><div style={{ flex: 1, height: 30 }} /></div>
            )}

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
                                        aria-current={active ? "page" : undefined}
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
                        >
                            <ShieldCheck size={18} strokeWidth={1.6} />
                            <span style={{ flex: 1, textAlign: "left" }}>Plataforma</span>
                        </Link>
                    </div>
                )}
            </nav>

            {/* Acceso directo al widget (solo quien puede configurarlo) */}
            {role === "admin" && !impersonating && (
                <Link href="/administracion/widget" onClick={() => setOpen(false)} className="side-widget">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/panel/widget-thumb.jpg" alt="" />
                    <div style={{ minWidth: 0 }}>
                        <strong>Widget de simulación</strong>
                        <span>Personalizar e instalar</span>
                    </div>
                    <ChevronRight size={16} strokeWidth={1.8} />
                </Link>
            )}

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

    // Flujo de autenticación: cambiar contraseña sin el menú lateral (solo marca y vuelta al panel).
    const isAuthFlow = pathname === "/administracion/update-password";
    if (isAuthFlow) {
        return (
            <div className="qoves-admin sf-shell sf-touch">
                <div className="sf-shell-col">
                    {impersonationBanner}
                    <header className="sf-auth-bar">
                        <Wordmark tone="light" height={20} />
                        <Link href="/administracion/dashboard" className="sf-auth-back">
                            <ArrowLeft size={16} strokeWidth={1.8} aria-hidden /> Volver al panel
                        </Link>
                    </header>
                    <main className="main-scroll">{children}</main>
                </div>
            </div>
        );
    }

    return (
        <div className="qoves-admin sf-shell sf-touch">
            <div className="sf-shell-col">
                {impersonationBanner}

                {/* Cabecera móvil (navy, fija arriba al hacer scroll) */}
                <header className="qoves-mobile-header sf-mobile-header">
                    <Link href="/administracion/dashboard" className="sf-mobile-brand" aria-label="Smile Fast · Ir al resumen">
                        <Wordmark tone="light" height={20} />
                    </Link>
                    {mounted ? (
                        <Sheet open={open} onOpenChange={setOpen}>
                            <SheetTrigger asChild>
                                <button type="button" className="sf-menu-btn" aria-label="Abrir menú">
                                    <Menu size={22} strokeWidth={1.8} />
                                </button>
                            </SheetTrigger>
                            <SheetContent
                                side="left"
                                className="sf-sheet p-0 gap-0 border-r-0 [&>button:last-child]:hidden"
                                aria-describedby={undefined}
                            >
                                <SheetTitle className="sr-only">Navegación</SheetTitle>
                                <div className="qoves-admin sf-touch" style={{ height: "100%" }}>
                                    {renderSidebar(true)}
                                </div>
                            </SheetContent>
                        </Sheet>
                    ) : (
                        <span className="sf-menu-btn" aria-hidden="true"><Menu size={22} strokeWidth={1.8} /></span>
                    )}
                </header>

                <div className="sf-shell-body">
                    <div className="qoves-desktop-sidebar">
                        {renderSidebar()}
                    </div>
                    <main className="main-scroll">{children}</main>
                </div>
            </div>
        </div>
    );
}
