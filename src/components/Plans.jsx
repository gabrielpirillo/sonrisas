import React from "react";
import { MonoPill } from "./shared";

/* ============================================================
   PLANES — 3 opciones de diseño (con tweak Escritorio/Móvil) · Qoves
   ============================================================ */
const PLANS = [
  { id: "esencial", name: "Esencial", tag: "Para clínicas que quieren probar algo nuevo.",
    feats: ["Widget de simulación con IA embebible", "Diseño de sonrisa 4K fotorrealista", "Análisis dental y facial automático", "Captura de leads + aviso por email", "Panel de administración", "Protección anti-bots", "Cupo mensual de simulaciones"] },
  { id: "pro", name: "Profesional", badge: "Más popular", tag: "Para clínicas en crecimiento que cierran más casos.",
    feats: ["Todo lo de Esencial, y además:", "Vídeo antes/después con IA", "Dashboard de métricas de conversión", "Mayor cupo de simulaciones y vídeos", "Gestión de equipo con roles", "Personalización de marca", "Soporte prioritario"] },
  { id: "multi", name: "Clínicas & Cadenas", tag: "Para grupos y franquicias multi-sede.",
    feats: ["Todo lo de Profesional, y además:", "Multi-sede en una sola cuenta", "Gestión centralizada (superadmin)", "White-label completo + dominio propio", "Exportación de datos y leads", "Integración web / CRM", "Onboarding y gestor de cuenta"] },
];
const CmpRows = [
  ["Widget de simulación con IA", 1, 1, 1], ["Diseño 4K fotorrealista", 1, 1, 1],
  ["Análisis dental y facial", 1, 1, 1], ["Captura de leads + email", 1, 1, 1],
  ["Panel de administración", 1, 1, 1], ["Protección anti-bots", 1, 1, 1],
  ["Vídeo antes/después con IA", 0, 1, 1], ["Dashboard de métricas", 0, 1, 1],
  ["Gestión de equipo (roles)", 0, 1, 1], ["Personalización de marca", 0, 1, 1],
  ["Soporte prioritario", 0, 1, 1], ["Multi-sede", 0, 0, 1],
  ["Gestión centralizada", 0, 0, 1], ["White-label + dominio propio", 0, 0, 1],
  ["Exportación de datos", 0, 0, 1], ["Integración web / CRM", 0, 0, 1],
  ["Onboarding y capacitación", 0, 0, 1],
];

function Chk({ on, hi }) {
  return on
    ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke={hi ? "#a7d9bd" : "var(--sage-deep)"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    : <span style={{ display: "inline-block", width: 12, height: 1.5, background: "var(--line-strong)" }}></span>;
}
function Head({ kicker, title, sub }) {
  return (
    <div className="pl-head">
      <div style={{ marginBottom: 22 }}><MonoPill>{kicker}</MonoPill></div>
      <h2 className="display" style={{ fontSize: "clamp(32px,3.6vw,52px)" }}>{title}</h2>
      {sub && <p className="lead" style={{ fontSize: 16.5, marginTop: 16, maxWidth: 560, marginInline: "auto" }}>{sub}</p>}
    </div>);
}

/* ===== OPCIÓN A · 3 tarjetas (medio destacado) ===== */
function PlansA({ mobile, onStart }) {
  return (
    <section id="planes" className={"pl" + (mobile ? " pl-m" : "")}>
      <Head kicker="PLANES" title={<>Elige cómo <span className="dim">crecer</span></>} sub="Diferentes planes adaptados a diferentes necesidades y opciones." />
      <div className="pl-grid3">
        {PLANS.map((p) =>
        <div key={p.id} className={"pl-card" + (p.badge ? " pl-card-hi" : "")}>
            {p.badge && <span className="pl-badge">{p.badge}</span>}
            <div className="pl-name">{p.name}</div>
            <div className="pl-tag">{p.tag}</div>
            <ul className="pl-feats">
              {p.feats.map((f, i) => <li key={i} className={i === 0 && p.id !== "esencial" ? "pl-feat pl-feat-lead" : "pl-feat"}><Chk on hi={!!p.badge} /><span>{f}</span></li>)}
            </ul>
            <button className={"btn " + (p.badge ? "btn-white" : "btn-primary")} style={{ width: "100%" }} onClick={onStart}>Solicitar DEMO</button>
          </div>
        )}
      </div>
      <div className="pl-guarantee">Todos los planes sin permanencia. Cancela cuando quieras.</div>
    </section>);
}

/* ===== OPCIÓN B · Tabla comparativa ===== */
function PlansB({ mobile }) {
  return (
    <section className={"pl" + (mobile ? " pl-m" : "")}>
      <Head kicker="COMPARA LOS PLANES" title={<>Todo lo que <span className="dim">incluye cada plan</span></>} />
      <div className="pl-table-wrap">
        <table className="pl-table">
          <thead>
            <tr><th></th>{PLANS.map((p) => <th key={p.id} className={p.badge ? "hi" : ""}>{p.name}{p.badge && <span className="pl-th-badge">{p.badge}</span>}</th>)}</tr>
          </thead>
          <tbody>
            {CmpRows.map((r, i) =>
            <tr key={i}>
              <td>{r[0]}</td>
              <td><Chk on={!!r[1]} /></td>
              <td className="hi"><Chk on={!!r[2]} hi /></td>
              <td><Chk on={!!r[3]} /></td>
            </tr>
            )}
            <tr className="pl-table-cta">
              <td></td>
              {PLANS.map((p) => <td key={p.id} className={p.badge ? "hi" : ""}><button className={"btn btn-sm " + (p.badge ? "btn-primary" : "btn-ghost")} style={{ background: p.badge ? "" : "#fff" }}>Solicitar DEMO</button></td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </section>);
}

/* ===== OPCIÓN C · Plan destacado + selector (interactivo) ===== */
function PlansC({ mobile }) {
  const [sel, setSel] = React.useState(1);
  const p = PLANS[sel];
  return (
    <section className={"pl" + (mobile ? " pl-m" : "")}>
      <Head kicker="PLANES" title={<>Un plan para <span className="dim">cada etapa</span></>} />
      <div className="pl-c-tabs">
        {PLANS.map((pl, i) =>
        <button key={pl.id} className={"pl-c-tab" + (i === sel ? " on" : "")} onClick={() => setSel(i)}>
          {pl.name}{pl.badge && <span className="pl-c-tab-badge">{pl.badge}</span>}
        </button>
        )}
      </div>
      <div className="pl-c-panel">
        <div className="pl-c-info">
          <div className="pl-name">{p.name}</div>
          <div className="pl-tag">{p.tag}</div>
          <button className="btn btn-primary" style={{ marginTop: 20 }}>Solicitar DEMO</button>
        </div>
        <ul className="pl-feats pl-c-feats">
          {p.feats.map((f, i) => <li key={i} className="pl-feat"><Chk on /><span>{f}</span></li>)}
        </ul>
      </div>
    </section>);
}

export { PlansA, PlansB, PlansC };
