"use client";

import { useState } from "react";
import { toast } from "sonner";

/* Qoves-styled "Exportar CSV" — exports the full generations history.
   Same data path as the legacy ExportGenerationsButton. */
export function ExportGenerationsCsv() {
    const [loading, setLoading] = useState(false);

    const handleExport = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "get_generations" }),
            });
            const result = await res.json();
            if (result.error) throw new Error(result.error);

            const data = result.data;
            if (!data || data.length === 0) {
                toast.info("No hay historial de generaciones para exportar.");
                return;
            }

            const headers = ["ID", "Fecha", "Tipo", "Estado", "Lead ID", "Input Path", "Output Path"];
            const rows = data.map((gen: any) => [
                gen.id,
                new Date(gen.created_at).toLocaleString(),
                gen.type,
                gen.status,
                gen.lead_id,
                gen.input_path,
                gen.output_path,
            ]);

            const csvContent = [
                headers.join(","),
                ...rows.map((row: any) => row.map((cell: any) => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(",")),
            ].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `generations_history_${new Date().toISOString().split("T")[0]}.csv`);
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Historial exportado correctamente");
        } catch (err: any) {
            console.error("Export Error:", err);
            toast.error("Error al exportar historial.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button className="btn btn-white btn-sm" onClick={handleExport} disabled={loading}>
            {loading ? "Exportando…" : "Exportar CSV"}
        </button>
    );
}
