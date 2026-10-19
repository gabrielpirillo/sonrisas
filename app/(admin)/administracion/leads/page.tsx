"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Clapperboard, Loader2, ScanFace, Search } from "lucide-react";
import { toast } from "sonner";
import { LeadDetailModal } from "@/components/admin/LeadDetailModal";
import { PageHead } from "@/components/admin/qoves/PageHead";
import { StatusPill, LEAD_STATUS } from "@/components/admin/qoves/StatusPill";
import { LeadThumb } from "@/components/admin/qoves/LeadThumb";

const GOAL_LABELS: Record<string, string> = {
    alignment: "Alineación",
    veneers: "Carillas",
    implants: "Implantes",
    full_smile: "Sonrisa completa",
    whitening: "Blanqueamiento",
};
const TIME_LABELS: Record<string, string> = {
    now: "Ahora",
    "1-3_months": "1-3 meses",
    later: "Más adelante",
};

const FILTER_TABS: Array<[string, string]> = [
    ["todos", "Todos"],
    ["pending", "Pendiente"],
    ["contacted", "Contactado"],
    ["converted", "Convertido"],
    ["rejected", "Rechazado"],
];

function simCount(lead: any) {
    const gens = Array.isArray(lead.generations) ? lead.generations : [];
    const smiles = gens.filter((g: any) => g.type === "image" && g.status === "completed").length;
    const hasVideo = gens.some((g: any) => g.type === "video" && g.status === "completed");
    // generations llega ordenado por fecha desc: la primera imagen completada es la más reciente.
    const latest = gens.find((g: { type?: string; status?: string; output_path?: string }) => g.type === "image" && g.status === "completed" && g.output_path);
    return { smiles, hasVideo, thumb: (latest?.output_path as string | undefined) ?? null };
}

const isNew = (iso: string) => Date.now() - new Date(iso).getTime() < 86_400_000;

export default function LeadsPage() {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("todos");
    const [deepLinkLead, setDeepLinkLead] = useState<string | null>(null);
    const [canInstall, setCanInstall] = useState(false);

    // Enlaces desde el resumen: ?estado=pending filtra, ?lead=<id> abre su ficha.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const estado = params.get("estado");
        if (estado && FILTER_TABS.some(([k]) => k === estado)) setFilter(estado);
        setDeepLinkLead(params.get("lead"));
    }, []);

    const counts = useMemo(() => {
        const c: Record<string, number> = { todos: leads.length, pending: 0, contacted: 0, converted: 0, rejected: 0 };
        leads.forEach((l) => { if (c[l.status] !== undefined) c[l.status]++; });
        return c;
    }, [leads]);

    const filteredLeads = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return leads.filter((lead) => {
            if (filter !== "todos" && lead.status !== filter) return false;
            if (!term) return true;
            return (
                lead.name?.toLowerCase().includes(term) ||
                lead.email?.toLowerCase().includes(term) ||
                lead.phone?.toLowerCase().includes(term)
            );
        });
    }, [leads, searchTerm, filter]);

    const fetchLeads = useCallback(async () => {
        try {
            const res = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_leads' })
            });
            const result = await res.json();
            if (result.error) {
                toast.error(`Error cargando leads: ${result.error}`);
                throw new Error(result.error);
            }
            const updatedLeads = result.data || [];
            setLeads(updatedLeads);
            setSelectedLead((prev: any) => {
                if (!prev) return null;
                return updatedLeads.find((l: any) => l.id === prev.id) || prev;
            });
        } catch (err: any) {
            console.error("Leads Fetch Error:", err);
            toast.error("No se pudieron cargar los leads. Revisa la consola.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchLeads(); }, [fetchLeads]);

    useEffect(() => {
        if (!deepLinkLead || loading) return;
        const match = leads.find((l) => l.id === deepLinkLead);
        if (match) setSelectedLead(match);
        setDeepLinkLead(null);
        // Quitamos ?lead= para que recargar no vuelva a abrir la ficha.
        const url = new URL(window.location.href);
        url.searchParams.delete("lead");
        window.history.replaceState(null, "", url.pathname + url.search);
    }, [deepLinkLead, leads, loading]);

    // Sin leads: mostramos el acceso a la instalación del widget solo a quien puede configurarlo.
    const noLeads = !loading && leads.length === 0;
    useEffect(() => {
        if (!noLeads) return;
        fetch("/api/me")
            .then((r) => r.json())
            .then((d) => setCanInstall(d?.user?.role === "admin" && !d?.user?.impersonating))
            .catch(() => setCanInstall(false));
    }, [noLeads]);

    const handleExportCSV = () => {
        if (!leads.length) {
            toast.error("No hay leads para exportar");
            return;
        }
        const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        // Columnas extra: una por cada pregunta adicional del widget que aparezca en los leads.
        const customLabels: string[] = [];
        for (const lead of leads) {
            for (const a of Object.values((lead.custom_data || {}) as Record<string, { label: string }>)) {
                if (a?.label && !customLabels.includes(a.label)) customLabels.push(a.label);
            }
        }
        const headers = ["Fecha", "Nombre", "Email", "Teléfono", "Estado", "Pidió vídeo", "Rango Edad", "Objetivo", "Plazo", "Clínica", ...customLabels].map(q);
        const rows = leads.map((lead) => {
            const answers = Object.values((lead.custom_data || {}) as Record<string, { label: string; value: string }>);
            return [
                q(new Date(lead.created_at).toLocaleString('es-ES')),
                q(lead.name),
                q(lead.email),
                q(lead.phone),
                q(lead.status),
                q(lead.video_requested_at ? 'Sí' : ''),
                q(lead.survey_data?.ageRange),
                q(lead.survey_data?.improvementGoal),
                q(lead.survey_data?.timeframe),
                q(lead.survey_data?.clinicPreference),
                ...customLabels.map((l) => q(answers.find((a) => a?.label === l)?.value)),
            ];
        });
        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="admin-page">
            <PageHead
                eyebrow="OPERACIÓN"
                title="Leads"
                accent="de tu clínica"
                subtitle="Cada simulación es un paciente interesado, con su contacto"
                action={<button className="btn btn-white btn-sm" onClick={handleExportCSV}>Exportar CSV</button>}
            />

            {/* Embudo por estado: cada cifra es también el filtro */}
            <div className="pipeline" role="group" aria-label="Filtrar por estado">
                {FILTER_TABS.map(([k, lbl]) => {
                    const on = filter === k;
                    const dot = k === "todos" ? null : LEAD_STATUS[k]?.dot;
                    const n = counts[k] ?? 0;
                    const share = counts.todos > 0 ? Math.round((n / counts.todos) * 100) : 0;
                    return (
                        <button
                            key={k}
                            type="button"
                            className={"pipe-tile" + (on ? " pipe-tile-on" : "")}
                            aria-pressed={on}
                            onClick={() => setFilter(k)}
                        >
                            <span className="pipe-label">
                                {dot && <span className="sf-filter-dot" style={{ background: dot }} aria-hidden="true" />}
                                {lbl}
                            </span>
                            <span className="pipe-num">{loading ? "–" : n}</span>
                            <span className="pipe-bar" aria-hidden="true">
                                <span style={{ width: `${k === "todos" ? (n > 0 ? 100 : 0) : share}%` }} />
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="leads-toolbar">
                <div className="leads-search">
                    <Search size={15} strokeWidth={2} color="var(--ink-3)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} aria-hidden="true" />
                    <input
                        className="field"
                        placeholder="Buscar nombre, email o teléfono…"
                        aria-label="Buscar leads"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ height: 44, paddingLeft: 40, fontSize: 14 }}
                    />
                </div>
                {!loading && (
                    <span className="mono" style={{ fontSize: 9.5 }} aria-live="polite">
                        {filteredLeads.length} {filteredLeads.length === 1 ? "resultado" : "resultados"}
                    </span>
                )}
            </div>

            {loading ? (
                <div className="card" style={{ padding: 48, display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
                    <Loader2 className="animate-spin" /> <span className="lead">Cargando datos…</span>
                </div>
            ) : leads.length === 0 ? (
                <section className="card install-card" aria-labelledby="leads-empty-title">
                    <div className="install-body">
                        <span className="mono" style={{ fontSize: 9.5, color: "var(--blue-deep)" }}>Sin leads todavía</span>
                        <h2 id="leads-empty-title" className="install-title">Aquí aparecerá cada paciente que pruebe su nueva sonrisa</h2>
                        <p className="lead" style={{ fontSize: 15 }}>
                            Con el widget instalado en tu web, cada simulación llega con su foto, su objetivo y su contacto.
                        </p>
                        {canInstall ? (
                            <Link href="/administracion/settings" className="btn btn-primary btn-sm" style={{ alignSelf: "flex-start" }}>
                                Instalar el widget <ArrowRight size={16} strokeWidth={2} />
                            </Link>
                        ) : (
                            <p className="mono" style={{ fontSize: 9.5 }}>El administrador de la clínica puede instalar el widget</p>
                        )}
                    </div>
                    <div className="install-photo">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/brand/panel/trans-2-after.jpg" alt="" loading="lazy" />
                    </div>
                </section>
            ) : filteredLeads.length === 0 ? (
                <div className="card empty-state">
                    <span className="empty-ic"><Search size={22} strokeWidth={1.7} /></span>
                    <strong style={{ color: "var(--ink)", fontSize: 15.5, fontWeight: 600 }}>No hay leads que coincidan</strong>
                    <span style={{ fontSize: 13.5 }}>Prueba con otro estado o cambia la búsqueda.</span>
                    <button type="button" className="btn btn-white btn-sm" style={{ marginTop: 6 }} onClick={() => { setFilter("todos"); setSearchTerm(""); }}>
                        Limpiar filtros
                    </button>
                </div>
            ) : (
                <div className="card" style={{ overflow: "hidden", padding: 0 }}>
                    <div style={{ overflowX: "auto" }}>
                        <table className="lead-table">
                            <thead>
                                <tr>
                                    <th>Paciente</th>
                                    <th className="col-hide-sm">Contacto</th>
                                    <th className="col-hide-sm col-hide-md">Objetivo</th>
                                    <th className="col-hide-sm col-hide-md">Plazo</th>
                                    <th className="col-hide-sm">Sim.</th>
                                    <th>Estado</th>
                                    <th className="col-hide-sm"><span className="sr-only">Abrir</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLeads.map((lead) => {
                                    const { smiles, hasVideo, thumb } = simCount(lead);
                                    const goal = GOAL_LABELS[lead.survey_data?.improvementGoal] || lead.survey_data?.improvementGoal || "—";
                                    const time = TIME_LABELS[lead.survey_data?.timeframe] || lead.survey_data?.timeframe || "—";
                                    const fresh = isNew(lead.created_at);
                                    return (
                                        <tr
                                            key={lead.id}
                                            className={lead.status === "pending" ? "lead-row-pending" : undefined}
                                            onClick={() => setSelectedLead(lead)}
                                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedLead(lead); } }}
                                            tabIndex={0}
                                            aria-label={`Abrir ficha de ${lead.name || "lead sin nombre"}`}
                                        >
                                            <td>
                                                <div className="lead-name-cell">
                                                    <LeadThumb src={thumb} name={lead.name} size={44} />
                                                    <div style={{ minWidth: 0 }}>
                                                        <div className="lead-name">
                                                            {lead.name || "Sin nombre"}
                                                            {fresh && <span className="lead-new" title="Nuevo · últimas 24 h" aria-label="Nuevo" />}
                                                        </div>
                                                        {lead.video_requested_at && (
                                                            <span className="lead-video-req" title={`Pidió su vídeo en consulta el ${new Date(lead.video_requested_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`}>
                                                                <Clapperboard size={12} strokeWidth={1.8} aria-hidden="true" /> Pidió vídeo en consulta
                                                            </span>
                                                        )}
                                                        <div className="mono" style={{ fontSize: 9, marginTop: 3 }}>
                                                            {new Date(lead.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                                            {lead.survey_data?.ageRange ? ` · ${lead.survey_data.ageRange}` : ""}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="col-hide-sm">
                                                <div style={{ fontSize: 13 }}>{lead.email || "—"}</div>
                                                <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{lead.phone || "—"}</div>
                                            </td>
                                            <td className="col-hide-sm col-hide-md" style={{ fontSize: 13.5 }}>{goal}</td>
                                            <td className="col-hide-sm col-hide-md" style={{ fontSize: 13.5 }}>{time}</td>
                                            <td className="col-hide-sm">
                                                <span className="lead-sims">
                                                    <span title={`${smiles} ${smiles === 1 ? "simulación" : "simulaciones"}`}><ScanFace size={15} strokeWidth={1.7} aria-hidden="true" />{smiles}</span>
                                                    {hasVideo && <span title="Vídeo generado"><Clapperboard size={15} strokeWidth={1.7} aria-label="Vídeo" /></span>}
                                                </span>
                                            </td>
                                            <td><StatusPill status={lead.status} /></td>
                                            <td className="col-hide-sm"><span className="row-go">Ver →</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <LeadDetailModal
                lead={selectedLead}
                open={!!selectedLead}
                onOpenChange={(open) => !open && setSelectedLead(null)}
                onLeadUpdated={() => { fetchLeads(); }}
            />
        </div>
    );
}
