import React from "react";
import { RES } from "../resources";

/* ============================================================
   Franja de confianza bajo el hero — 3 variantes honestas:
   A · garantías del servicio, B · resultados (antes → después),
   C · rigor clínico (dos filas en sentidos opuestos).
   Se elige con TRUST_VARIANT o, para comparar, con ?trust=a|b|c.
   ============================================================ */
const TRUST_VARIANT = "a";

const ICONS = {
  shield: <><path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3Z" /><path d="M9 12l2 2 4-4" /></>,
  lock: <><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></>,
  consent: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /><path d="M9 15l2 2 4-4" /></>,
  day: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="M12 13v3l2 1" /></>,
  free: <><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></>,
  brand: <><circle cx="12" cy="12" r="9" /><circle cx="8.5" cy="10" r="1.3" /><circle cx="12" cy="7.5" r="1.3" /><circle cx="15.5" cy="10" r="1.3" /><path d="M12 21c-1.5 0-2-1-2-2s1-1.5 2-1.5" /></>,
  mobile: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></>,
  chat: <><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5A8 8 0 1 1 21 12Z" /></>,
  play: <><circle cx="12" cy="12" r="9" /><path d="M10 8.5v7l6-3.5z" /></>,
  scan: <><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><circle cx="12" cy="12" r="3" /></>
};
const Ico = ({ name, size = 16 }) =>
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>;

/* ---------- A · Garantías ---------- */
const GUARANTEES = [
  ["shield", "Cumple RGPD"], ["lock", "Datos cifrados"], ["consent", "Consentimiento explícito"],
  ["day", "Implementación en 1 día"], ["free", "Sin permanencia"], ["brand", "Con tu logo y colores"],
  ["mobile", "Móvil y escritorio"], ["chat", "Leads directos a WhatsApp"], ["play", "Vídeo antes / después"]];

function TrustGuarantees() {
  return (
    <div className="ts ts-a">
      <span className="ts-label mono">Tu clínica,<br />protegida</span>
      <div className="marquee">
        <div className="marquee-track ts-track">
          {[...GUARANTEES, ...GUARANTEES].map(([ic, t], i) =>
          <span key={i} className="ts-chip" aria-hidden={i >= GUARANTEES.length || undefined}><span className="ts-chip-ic"><Ico name={ic} /></span>{t}</span>
          )}
        </div>
      </div>
    </div>);

}

/* ---------- B · Resultados (antes → después) ---------- */
const PAIRS = [
  [RES.r16_preview_before_png, RES.r17_preview_after_png, "center 58%"],
  [RES.r27_trans_2_before_jpg, RES.r28_trans_2_after_jpg, "58% 50%"],
  [RES.r14_trans_1_before_jpg, RES.r15_trans_1_after_jpg, "center 46%"]];

function TrustResults() {
  const reel = [...PAIRS, ...PAIRS, ...PAIRS, ...PAIRS];
  return (
    <div className="ts ts-b">
      <span className="ts-label mono">Simulaciones<br />reales</span>
      <div className="marquee">
        <div className="marquee-track ts-track ts-reel">
          {reel.map(([b, a, pos], i) =>
          <span key={i} className="ts-pair">
              <img src={b} alt="" loading="lazy" style={{ objectPosition: pos }} />
              <img src={a} alt="" loading="lazy" style={{ objectPosition: pos }} />
              <span className="ts-pair-arrow" aria-hidden="true">→</span>
              <span className="ts-pair-lbl mono"><i>ANTES</i><i>DESPUÉS</i></span>
            </span>
          )}
        </div>
      </div>
    </div>);

}

/* ---------- C · Rigor clínico ---------- */
const CLINICAL = ["Tono VITA", "Notación FDI", "Proporción áurea", "Arco de sonrisa", "Arquitectura gingival", "Macroestética facial"];
const DELIVERS = ["Simulación fotorrealista", "Vídeo antes / después", "Lead con foto y datos", "Panel de gestión", "Tu marca y tu dominio", "Aviso por WhatsApp"];

function TrustClinical() {
  return (
    <div className="ts ts-c">
      <div className="marquee">
        <div className="marquee-track ts-track ts-row1">
          {[...CLINICAL, ...CLINICAL, ...CLINICAL, ...CLINICAL].map((t, i) =>
          <span key={i} className="ts-param"><span className="ts-param-ic"><Ico name="scan" size={14} /></span>{t}</span>
          )}
        </div>
      </div>
      <div className="marquee">
        <div className="marquee-track ts-track ts-row2">
          {[...DELIVERS, ...DELIVERS, ...DELIVERS, ...DELIVERS].map((t, i) =>
          <span key={i} className="ts-deliver mono">{t}<span className="ts-sep">✦</span></span>
          )}
        </div>
      </div>
    </div>);

}

function TrustStrip() {
  let v = TRUST_VARIANT;
  if (typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search).get("trust");
    if (q === "a" || q === "b" || q === "c") v = q;
  }
  return (
    <section className={"trust trust-" + v} aria-label="Garantías de Smile Fast">
      <div className="wrap">
        {v === "a" && <TrustGuarantees />}
        {v === "b" && <TrustResults />}
        {v === "c" && <TrustClinical />}
      </div>
    </section>);

}

export { TrustStrip };
