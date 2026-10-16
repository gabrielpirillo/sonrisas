"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Field } from "@/components/admin/qoves/PageHead";

function initials(name?: string | null, email?: string | null) {
    const base = name || email || "SF";
    return base.split(/[\s@.]+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function AccountCards({
    name,
    email,
    impersonating,
}: {
    name?: string | null;
    email?: string | null;
    impersonating: boolean;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (next.length < 8) return toast.error("La nueva contraseña debe tener al menos 8 caracteres");

        setLoading(true);
        const { error } = await authClient.changePassword({
            currentPassword: current,
            newPassword: next,
            revokeOtherSessions: true,
        });
        setLoading(false);

        if (error) return toast.error(error.message || "No se pudo cambiar la contraseña");
        toast.success("Contraseña actualizada");
        setCurrent("");
        setNext("");
    }

    async function onLogout() {
        try {
            await authClient.signOut();
            router.push("/acceso");
            router.refresh();
        } catch {
            toast.error("Error al cerrar sesión");
        }
    }

    return (
        <div className="config-grid">
            {/* Change password */}
            <div className="card" style={{ padding: 24 }}>
                <span className="mono" style={{ fontSize: 9 }}>CONTRASEÑA</span>
                <h3 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", margin: "10px 0 18px" }}>Cambiar contraseña</h3>
                {impersonating ? (
                    <p style={{ fontSize: 13.5, color: "var(--ink-3)" }}>
                        No disponible durante una impersonación (solo lectura).
                    </p>
                ) : (
                    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <Field label="CONTRASEÑA ACTUAL">
                            <input className="field" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required style={{ height: 44 }} />
                        </Field>
                        <Field label="NUEVA CONTRASEÑA">
                            <input className="field" type="password" value={next} onChange={(e) => setNext(e.target.value)} minLength={8} required style={{ height: 44 }} />
                        </Field>
                        <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
                            {loading ? <Loader2 className="animate-spin" size={16} /> : "Actualizar contraseña"}
                        </button>
                    </form>
                )}
            </div>

            {/* Profile */}
            <div className="card" style={{ padding: 24 }}>
                <span className="mono" style={{ fontSize: 9 }}>SESIÓN</span>
                <h3 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", margin: "10px 0 18px" }}>Tu perfil</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                    <span className="avatar" style={{ width: 48, height: 48, fontSize: 15 }}>{initials(name, email)}</span>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>{name || "Usuario"}</div>
                        <div style={{ fontSize: 13, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email || "—"}</div>
                    </div>
                </div>
                <button className="btn btn-ghost" onClick={onLogout} style={{ background: "#fff", width: "100%" }}>
                    <LogOut size={16} strokeWidth={1.6} /> Cerrar sesión
                </button>
            </div>
        </div>
    );
}
