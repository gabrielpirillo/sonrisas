"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { LeadDetailModal } from "@/components/admin/LeadDetailModal";
import { PageHead } from "@/components/admin/qoves/PageHead";
import { StatusPill } from "@/components/admin/qoves/StatusPill";

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

function initials(name?: string) {
    return (name || "—").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function simCount(lead: any) {
    const gens = Array.isArray(lead.generations) ? lead.generations : [];
    const smiles = gens.filter((g: any) => g.type === "image" && g.status === "completed").length;
    const hasVideo = gens.some((g: any) => g.type === "video" && g.status === "completed");
    return { smiles, hasVideo };
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("todos");

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

    const handleExportCSV = () => {
        if (!leads.length) {
            toast.error("No hay leads para exportar");
            return;
        }
        const headers = ["Fecha", "Nombre", "Email", "Teléfono", "Estado", "Rango Edad", "Objetivo", "Plazo", "Clínica"];
        const rows = leads.map((lead) => [
            new Date(lead.created_at).toLocaleString(),
            `"${lead.name?.replace(/"/g, '""') || ''}"`,
            `"${lead.email?.replace(/"/g, '""') || ''}"`,
            `"${lead.phone?.replace(/"/g, '""') || ''}"`,
            lead.status,
            lead.survey_data?.ageRange || '',
            lead.survey_data?.improvementGoal || '',
            lead.survey_data?.timeframe || '',
            lead.survey_data?.clinicPreference || ''
        ]);
        const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
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

            {/* Filters + search */}
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <div className="seg seg-tabs">
                    {FILTER_TABS.map(([k, lbl]) => (
                        <button key={k} className={filter === k ? "seg-on" : ""} onClick={() => setFilter(k)}>
                            {lbl} <span className="seg-count">{counts[k] ?? 0}</span>
                        </button>
                    ))}
                </div>
                <div style={{ position: "relative", flex: "1 1 220px", minWidth: 200 }}>
                    <Search size={15} strokeWidth={2} color="var(--ink-3)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                    <input
                        className="field"
                        placeholder="Buscar nombre, email o teléfono…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ height: 44, paddingLeft: 40, fontSize: 14 }}
                    />
                </div>
            </div>

            {loading ? (
                <div className="card" style={{ padding: 48, display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
                    <Loader2 className="animate-spin" /> <span className="lead">Cargando datos…</span>
                </div>
            ) : filteredLeads.length === 0 ? (
                <div className="card" style={{ padding: 32, textAlign: "center" }}>
                    <span className="lead">
                        {searchTerm || filter !== "todos"
                            ? "No se encontraron leads que coincidan."
                            : "No hay leads registrados aún."}
                    </span>
                </div>
            ) : (
                <div className="card" style={{ overflow: "hidden", padding: 0 }}>
                    <div style={{ overflowX: "auto" }}>
                        <table className="lead-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th><th>Contacto</th><th>Objetivo</th><th>Plazo</th><th>Sim.</th><th>Estado</th><th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLeads.map((lead) => {
                                    const { smiles, hasVideo } = simCount(lead);
                                    const goal = GOAL_LABELS[lead.survey_data?.improvementGoal] || lead.survey_data?.improvementGoal || "—";
                                    const time = TIME_LABELS[lead.survey_data?.timeframe] || lead.survey_data?.timeframe || "—";
                                    return (
                                        <tr key={lead.id} onClick={() => setSelectedLead(lead)}>
                                            <td>
                                                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                                                    <span className="avatar">{initials(lead.name)}</span>
                                                    <div>
                                                        <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: "-0.01em" }}>{lead.name || "Sin nombre"}</div>
                                                        <div className="mono" style={{ fontSize: 9 }}>
                                                            {new Date(lead.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                                            {lead.survey_data?.ageRange ? ` · ${lead.survey_data.ageRange}` : ""}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: 13 }}>{lead.email || "—"}</div>
                                                <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{lead.phone || "—"}</div>
                                            </td>
                                            <td style={{ fontSize: 13.5 }}>{goal}</td>
                                            <td style={{ fontSize: 13.5 }}>{time}</td>
                                            <td><span className="mono" style={{ fontSize: 11 }}>{smiles}{hasVideo ? "  vid" : ""}</span></td>
                                            <td><StatusPill status={lead.status} /></td>
                                            <td><span className="row-go">Ver →</span></td>
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
