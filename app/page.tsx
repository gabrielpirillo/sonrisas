"use client";

import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import WidgetContainer from "@/components/widget/WidgetContainer";
import { Wordmark } from "@/components/admin/qoves/LogoMark";

/* Página de demostración del widget. Con ?embed=widget|full se comporta como
   antes (compatibilidad con embeds antiguos que apuntaban a la raíz). */
function HomeContent() {
  const searchParams = useSearchParams();
  const embedMode = searchParams.get("embed"); // 'full' | 'widget' | null
  const isWidgetMode = embedMode === "widget";

  useEffect(() => {
    // Fondo transparente cuando va dentro de un iframe
    if (isWidgetMode) {
      document.documentElement.style.setProperty("background", "transparent", "important");
      document.body.style.setProperty("background", "transparent", "important");
    }
  }, [isWidgetMode]);

  if (isWidgetMode) {
    return (
      <main style={{ background: "transparent" }}>
        <WidgetContainer />
      </main>
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(60% 45% at 85% 0%, rgba(142,164,180,0.28), transparent 70%), radial-gradient(45% 40% at 0% 30%, rgba(185,207,221,0.25), transparent 70%), linear-gradient(180deg, #f8fafb 0%, #eef3f6 100%)",
      }}
    >
      {!embedMode && (
      <header style={{ position: "sticky", top: 0, zIndex: 40, backdropFilter: "blur(14px)", background: "rgba(255,255,255,0.7)", borderBottom: "1px solid var(--blue-line)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Wordmark height={22} />
          <Link
            href="/acceso"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 999, background: "linear-gradient(135deg, var(--blue-deep), var(--blue-ink))", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none", boxShadow: "0 12px 26px -14px rgba(62,87,105,0.9)" }}
          >
            Acceder al panel <ArrowRight size={15} />
          </Link>
        </div>
      </header>
      )}

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "56px 20px 80px", display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
        <section className="sf-stagger" style={{ textAlign: "center", maxWidth: 820, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 13px", borderRadius: 999, border: "1px solid var(--blue-line)", background: "rgba(255,255,255,0.8)", fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--blue-deep)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--scan)", boxShadow: "0 0 8px var(--scan)" }} />
            Demo en vivo
          </span>
          <h1 style={{ fontSize: "clamp(36px, 6vw, 72px)", lineHeight: 1.02, letterSpacing: "-0.045em", fontWeight: 600, margin: 0, color: "var(--ink)" }}>
            Descubre tu nueva sonrisa <span style={{ color: "var(--blue-accent)" }}>en segundos.</span>
          </h1>
          <p style={{ fontSize: "clamp(16px, 2vw, 19px)", lineHeight: 1.6, color: "var(--ink-2)", margin: 0, maxWidth: 620 }}>
            Así verán tus pacientes el widget de Smile Fast en tu web: suben una foto y reciben su simulación de sonrisa con IA.
          </p>
        </section>

        <section style={{ width: "100%", position: "relative" }} className="sf-rise">
          <div
            aria-hidden="true"
            style={{ position: "absolute", inset: "8% 6%", background: "radial-gradient(closest-side, rgba(79,107,127,0.22), transparent)", filter: "blur(40px)", pointerEvents: "none" }}
          />
          <div style={{ position: "relative", background: "#fff", borderRadius: 32, border: "1px solid var(--blue-line)", boxShadow: "0 40px 80px -40px rgba(27,38,48,0.45)", overflow: "hidden" }}>
            <WidgetContainer />
          </div>
        </section>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
