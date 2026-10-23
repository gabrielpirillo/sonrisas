"use client";

import "./qoves-admin.css";

import Link from "next/link";
import {
    LayoutGrid, Users, SlidersHorizontal, LogOut, X, ArrowLeft,
    Coins, Building2, ShieldCheck, CircleUser, ChevronRight, Palette, ScanFace,
} from "lucide-react";
import { authClient, useListOrganizations, useActiveOrganization } from "@/lib/auth/client";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { MobileTopBar, DrawerClose } from "@/components/admin/shell/MobileTopBar";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useState, useEffect, type ComponentType } from "react";
import { LogoMark, Wordmark } from "@/components/admin/qoves/LogoMark";
import { useMounted } from "@/components/panel/credits/useMounted";
import { LegalAcceptanceBanner } from "@/components/legal/LegalAcceptanceBanner";
import { LEGAL_DOCS } from "@/lib/legal/company";

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
            { href: "/administracion/simulador", label: "Simulador", icon: ScanFace },
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

// Rutas fuera del menú que también necesitan título en la barra móvil.
const EXTRA_TITLES: Record<string, string> = {
    "/administracion/miembros": "Equipo",
    "/administracion/update-password": "Contraseña",
};

/** Título de la sección actual para la barra móvil (también en subrutas, p. ej. /leads/123). */
function sectionTitle(pathname: string): string {
    const routes: [string, string][] = [
        ...NAV_SECTIONS.flatMap((s) => s.items.map((i): [string, string] => [i.href, i.label])),
        ...Object.entries(EXTRA_TITLES),
    ];
    let best: [string, string] | null = null;
    for (const r of routes) {
        if ((pathname === r[0] || pathname.startsWith(r[0] + "/")) && (!best || r[0].length > best[0].length)) best = r;
    }
    return best ? best[1] : "Resumen";
}

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
    const [credits, setCredits] = useState<number | null>(null);
    // Baja de la clínica pendiente: fecha del borrado definitivo.
    const [deletionAt, setDeletionAt] = useState<string | null>(null);
    const [meVersion, setMeVersion] = useState(0);
    // Configuración avisa al solicitar/cancelar la baja para refrescar el banner.
    useEffect(() => {
        const bump = () => setMeVersion((v) => v + 1);
        window.addEventListener("sf:clinic-deletion-changed", bump);
        return () => window.removeEventListener("sf:clinic-deletion-changed", bump);
    }, []);
    // Los menús Radix (Select/Sheet) solo se montan en el cliente: así el
    // servidor y el navegador no generan IDs distintos (error de hidratación).
    const mounted = useMounted();
    const { data: orgs } = useListOrganizations();
    const { data: activeOrg } = useActiveOrganization();

    // Se vuelve a pedir al cambiar de clínica o de sección para que el saldo
    // de créditos de la barra móvil no quede desfasado (es una consulta ligera).
    const activeOrgId = activeOrg?.id ?? null;
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/me", { cache: "no-store" });
                const data = await res.json();
                if (cancelled) return;
                if (data?.user?.role) setRole(data.user.role as Role);
                if (data?.user?.email) setEmail(data.user.email);
                setIsPlatform(Boolean(data?.user?.isPlatformAdmin));
                setImpersonating(Boolean(data?.user?.impersonating));
                setDeletionAt(typeof data?.user?.clinicDeletionScheduledFor === "string" ? data.user.clinicDeletionScheduledFor : null);
                const c = Number(data?.user?.credits);
                setCredits(data?.user?.credits == null || !Number.isFinite(c) ? null : c);
            } catch (err) {
                console.error("Error fetching role:", err);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [activeOrgId, pathname, meVersion]);

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

    const deletionBanner =
        deletionAt ? (
            <div className="sf-imp-banner sf-deletion-banner" role="alert">
                <span>
                    Esta clínica y todos sus datos se eliminarán el{" "}
                    <strong>{new Date(deletionAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</strong>.
                </span>
                {role === "admin" && !impersonating && (
                    <Link href="/administracion/settings#baja-clinica">Ver o cancelar</Link>
                )}
            </div>
        ) : null;

    const renderSidebar = (inSheet = false) => (
        <aside className={"sidebar" + (inSheet ? " sidebar-sheet" : "")}>
            <div className="side-brand">
                <Wordmark tone="light" height={22} />
                {inSheet ? (
                    <DrawerClose className="side-close" aria-label="Cerrar menú">
                        <X size={20} strokeWidth={1.8} />
                    </DrawerClose>
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
            <nav className="side-legal" aria-label="Legal">
                {LEGAL_DOCS.map((d) => (
                    <Link key={d.href} href={d.href} target="_blank" onClick={() => setOpen(false)}>{d.label}</Link>
                ))}
            </nav>
        </aside>
    );

    // Flujo de autenticación: cambiar contraseña sin el menú lateral (solo marca y vuelta al panel).
    const isAuthFlow = pathname === "/administracion/update-password";
    if (isAuthFlow) {
        return (
            <div className="qoves-admin sf-shell sf-touch">
                <div className="sf-shell-col">
                    {impersonationBanner}
                    {deletionBanner}
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
                {deletionBanner}
                {role === "admin" && !impersonating ? <LegalAcceptanceBanner clinicKey={activeOrgId} /> : null}

                {/* Barra móvil (< 1024 px): cristal navy fijo arriba + menú lateral */}
                <MobileTopBar
                    title={sectionTitle(pathname)}
                    credits={credits}
                    creditsHref={role === "admin" ? "/administracion/creditos" : null}
                    email={email}
                    roleLabel={role === "admin" ? "Administrador" : role === "basic" ? "Equipo" : "Panel"}
                    initials={initialsOf(email)}
                    orgs={orgs ?? []}
                    activeOrgId={activeOrg?.id ?? null}
                    activeOrgName={activeOrg?.name ?? null}
                    onSwitchOrg={switchOrg}
                    onLogout={handleLogout}
                    open={open}
                    onOpenChange={setOpen}
                    drawer={renderSidebar(true)}
                    mounted={mounted}
                />

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
