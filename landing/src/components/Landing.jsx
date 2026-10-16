import React, { useState } from "react";
import { RES } from "../resources";
import { useInview, LogoMark, MonoPill, BeforeAfter, AnalysisExplorer } from "./shared";
import { AppJourney } from "./AppJourney";
import { TrustStrip } from "./TrustStrip";

/* ============================================================
   Landing — Smile Fast · B2B para CLÍNICAS DENTALES
   Qoves visual language. Audience = la clínica (no el paciente).
   ============================================================ */

const navLink = { color: "var(--ink-2)", textDecoration: "none", fontSize: 15, fontWeight: 450, letterSpacing: "-0.01em", whiteSpace: "nowrap" };

/* ---------------- Nav ---------------- */
function Nav({ onStart }) {
  const [scrolled, setScrolled] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      const hero = document.querySelector(".hero2");
      const h = hero ? hero.offsetHeight : window.innerHeight;
      setHidden(y > h - 80);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav className={"navpill" + (scrolled ? " navpill-scrolled" : "") + (hidden ? " navpill-hidden" : "")}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <img className="nav-logo nav-logo-white" src={RES.r11_logo_sf_white_png} alt="Smile Fast" style={{ height: 24, width: "auto", display: "block" }} />
        <img className="nav-logo nav-logo-black" src={RES.r12_logo_sf_black_png} alt="Smile Fast" style={{ height: 24, width: "auto", display: "block" }} />
      </div>
      <div className="nav-links" style={{ display: "flex", gap: 30, alignItems: "center" }}>
        <a href="#producto" style={navLink}>Producto</a>
        <a href="#como" style={navLink}>Cómo funciona</a>
        <a href="#usos" style={navLink}>Casos de uso</a>

      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button className="btn btn-white btn-sm" onClick={onStart}>Quiero probarlo</button>
      </div>
    </nav>);

}

/* ---------------- Browser frame (widget embebido en la web de la clínica) ---------------- */
function BrowserFrame({ children, url = "tuclinica.com" }) {
  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--line)", background: "#fff", boxShadow: "0 40px 90px -40px rgba(28,30,29,0.4)" }}>
      <div style={{ height: 44, display: "flex", alignItems: "center", gap: 14, padding: "0 16px", borderBottom: "1px solid var(--line)", background: "var(--bg-soft)" }}>
        <div style={{ display: "flex", gap: 7 }}>
          {["#d8dad7", "#d8dad7", "#d8dad7"].map((c, i) => <span key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />)}
        </div>
        <div style={{ flex: 1, height: 26, borderRadius: 99, background: "#fff", border: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 7, padding: "0 14px" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke="var(--ink-3)" strokeWidth="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="var(--ink-3)" strokeWidth="2" /></svg>
          <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.06em" }}>{url}</span>
        </div>
      </div>
      <div style={{ position: "relative" }}>{children}</div>
    </div>);

}

/* ---------------- Hero ---------------- */
/* ---------------- Hero (full-bleed, vídeo a la derecha) ---------------- */
function Hero({ onStart }) {
  const videoRef = React.useRef(null);

  // garantiza silencio total (React no siempre fija el atributo muted en el DOM)
  React.useEffect(() => {
    const v = videoRef.current;
    if (v) {v.muted = true;v.defaultMuted = true;v.volume = 0;v.setAttribute("muted", "");v.play().catch(() => {});}
  }, []);

  return (
    <header className="hero2">

      {/* Vídeo de fondo a la derecha — bucle, sin sonido, reproducción automática */}
      <video
        ref={videoRef}
        className="hero2-video"
        autoPlay loop muted playsInline preload="auto"
        style={{ width: "750px", objectPosition: "0% 21%", transform: "translateX(-12%)" }}>
        
        <source src="https://res.cloudinary.com/dhzmkxbek/video/upload/v1781638188/0614_2_upxmh1.mp4" type="video/mp4" />
      </video>


      {/* Velo para legibilidad de la copy */}
      <div className="hero2-scrim" />

      <div className="wrap hero2-inner">
        <div className="hero2-copy">
          <h1 className="display hero2-h1" style={{ fontSize: "clamp(38px, 4.4vw, 60px)", margin: "22px 0 24px" }}>
            La herramienta<br />que llena tu clínica.
          </h1>
          <p className="hero2-lead" style={{ fontSize: 19, maxWidth: 440, textAlign: "justify" }}>
            Tus visitantes ven su nueva sonrisa en tu web, dejan sus datos y <b>agendan su cita.</b>
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 34, flexWrap: "wrap" }}>
            <button className="btn btn-white" style={{ padding: "16px 30px", fontSize: 16 }} onClick={onStart}>Quiero probarlo</button>
            <a href="#como" className="btn hero2-ghost">Cómo funciona</a>
          </div>
          <div className="hero2-stats">
            {[
            ["+38% de pacientes", "Mayor facturación"],
            ["Paciente + simulación", "Datos listos en tu panel"],
            ["Activo en 1 día", "Sin programar nada"]].
            map(([t, d], i) =>
            <div key={i} className="hero2-stat">
                <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", color: "#fff", textAlign: "center" }}>{t}</div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", marginTop: 4, lineHeight: 1.45, textAlign: "center" }}>{d}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>);

}

/* ---------------- Trust strip ---------------- */

/* ---------------- Qué recibe tu clínica por cada visitante ---------------- */
function LeadAsset({ onStart }) {
  const [ref, inview] = useInview(0.3);
  const reduce = React.useRef(false);
  const [flip, setFlip] = React.useState(false);
  React.useEffect(() => {
    reduce.current = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce.current) setFlip(true);
  }, []);
  React.useEffect(() => {
    if (!inview || reduce.current) return;
    const t = setTimeout(() => setFlip(true), 1150);
    return () => clearTimeout(t);
  }, [inview]);
  const on = inview || reduce.current;
  const checks = [
    "Nombre y contacto directo",
    "WhatsApp a un clic",
    "Su simulación de sonrisa adjunta"];
  const mailIcon = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>;
  const phoneIcon = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
  const waIcon = <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.06L2 22l5.06-1.33A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.08-1.12l-.29-.17-3 .79.8-2.92-.19-.3A8 8 0 1 1 12 20zm4.4-5.8c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06a6.5 6.5 0 0 1-1.92-1.18 7.2 7.2 0 0 1-1.33-1.65c-.14-.24 0-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46a.9.9 0 0 0-.64.3 2.68 2.68 0 0 0-.84 2 4.65 4.65 0 0 0 .98 2.48c.12.16 1.7 2.6 4.12 3.65.58.25 1.03.4 1.38.51.58.19 1.1.16 1.52.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" /></svg>;
  return (
    <section id="activo" ref={ref} className={"lead-asset tone-blue" + (on ? " in" : "")} style={{ padding: "100px 0", background: "linear-gradient(180deg,#ffffff,var(--blue-soft))" }}>
      <div className="wrap la-grid">
        <div className="la-copy">
          <div style={{ marginBottom: 22 }}><MonoPill>CADA VISITA, UN LEAD</MonoPill></div>
          <h2 className="display" style={{ fontSize: "clamp(34px,4.4vw,56px)", lineHeight: 1.05 }}>
            Cada visitante te deja <span className="dim">un lead listo para cerrar</span>
          </h2>
          <p className="lead" style={{ fontSize: 17, margin: "20px 0 30px", maxWidth: "46ch" }}>
            No un clic anónimo. Nombre, correo y WhatsApp junto a su simulación de sonrisa, ordenados en tu panel para <b>contactar y agendar.</b>
          </p>
          <ul className="la-checks">
            {checks.map((c, i) =>
            <li key={i} className="la-check" style={{ transitionDelay: (0.15 + i * 0.12) + "s" }}>
                <span className="la-check-ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>
                <span>{c}</span>
              </li>
            )}
          </ul>
          <button className="la-cta" onClick={onStart} style={{ padding: "15px 30px", fontSize: 15 }}>Quiero probarlo</button>
        </div>
        <div className="la-card-wrap">
          <div className="la-card">
            <div className="la-badge">Lead cualificado</div>
            <div className="la-head">
              <div className="la-avatar">MG</div>
              <div className="la-head-txt">
                <div className="la-name la-f" style={{ transitionDelay: "0.2s" }}>María Fernández</div>
                <div className="la-meta"><span className="la-dot"></span>hace 2 min · <span style={{ color: "var(--sage-deep)", fontWeight: 500 }}>nuevo</span></div>
              </div>
            </div>
            <div className="la-rows">
              <div className="la-row la-f" style={{ transitionDelay: "0.4s" }}>
                <span className="la-row-ic">{mailIcon}</span>
                <span>maria.g@gmail.com</span>
              </div>
              <div className="la-row la-f" style={{ transitionDelay: "0.6s" }}>
                <span className="la-row-ic">{phoneIcon}</span>
                <span>+34 611 22 33 44</span>
                <span className="la-wa">{waIcon} WhatsApp</span>
              </div>
            </div>
            <div className="la-thumb la-f" style={{ transitionDelay: "0.8s" }}>
              <div className={"la-flip" + (flip ? " flipped" : "")}>
                <img className="la-face la-before" src={RES.r14_trans_1_before_jpg} alt="Antes de la simulación" />
                <img className="la-face la-after" src={RES.r15_trans_1_after_jpg} alt="Simulación de sonrisa" />
              </div>
              <span className="la-thumb-tag">{flip ? "Después" : "Antes"}</span>
            </div>
            <div className="la-pills la-f" style={{ transitionDelay: "1s" }}>
              {["Pendiente", "Contactado", "Convertido"].map((s, i) =>
              <span key={i} className={"la-pill" + (i === 0 ? " active" : "")}>{s}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>);

}

/* ---------------- Cómo funciona para tu clínica ---------------- */
function HowItWorks() {
  const [ref, inview] = useInview(0.2);
  const steps = [
  { tag: "ACTIVACIÓN", chip: "SIN PROGRAMAR · LISTO EN 1 DÍA", title: "Actívalo en tu web", body: "En un día queda activo, con tu logo y tus colores. No necesitas saber programar ni tocar nada técnico.", Visual: StepIntegrate },
  { tag: "SIMULACIÓN", chip: "SIN APPS NI DESCARGAS", title: "Tus visitantes se simulan", body: "Sube una selfie, ve su sonrisa nueva al instante y agenda antes de hablar con nadie.", Visual: StepSimulate, dark: true },
  { tag: "CONVERSIÓN", chip: "AVISO AL INSTANTE", title: "Recibes el lead caliente", body: "Sus datos de contacto y su simulación llegan a tu panel. Tu equipo agenda y cierra la cita.", Visual: StepLead }];

  return (
    <section id="como" ref={ref} className={"hiw" + (inview ? " hiw-on" : "")} style={{ padding: "100px 0" }}>
      <div className="wrap" style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ marginBottom: 24 }}><MonoPill>EN 3 PASOS</MonoPill></div>
        <h2 className="display" style={{ fontSize: "clamp(38px, 5vw, 62px)" }}>
          Cómo funciona <span className="dim">en tu clínica</span>
        </h2>
      </div>

      {/* Riel de progreso: se llena al entrar en pantalla y enciende cada paso */}
      <div className="wrap hiw-rail" aria-hidden="true">
        <span className="hiw-rail-line"><span className="hiw-rail-fill" /></span>
        {steps.map((s, i) =>
        <span key={i} className="hiw-node" style={{ "--i": i }}>{String(i + 1).padStart(2, "0")}</span>
        )}
      </div>

      <div className="wrap hiw-grid">
        {steps.map((s, i) =>
        <article key={i} className={"hiw-card" + (s.dark ? " hiw-dark" : "")} style={{ "--i": i }}>
            <div className="hiw-stage"><s.Visual /></div>
            <div className="hiw-body">
              <div className="hiw-meta">
                <span className="mono" style={{ fontSize: 10 }}>PASO {String(i + 1).padStart(2, "0")} · {s.tag}</span>
                <span className="hiw-num">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="hiw-title">{s.title}</h3>
              <p className="hiw-copy">{s.body}</p>
              <span className="hiw-chip mono"><span className="hiw-chip-dot" />{s.chip}</span>
            </div>
          </article>
        )}
      </div>
    </section>);

}

/* Paso 1 — un interruptor se activa y el botón aparece en la web de la clínica */
function StepIntegrate() {
  return (
    <div className="hiw-browser">
      <div className="hiw-bar"><i /><i /><i /><span className="hiw-url">tuclinica.com</span></div>
      <div className="hiw-page">
        <span className="hiw-sk" style={{ width: "62%" }} />
        <span className="hiw-sk" style={{ width: "44%", opacity: 0.7 }} />
        <div className="hiw-setup">
          <span className="hiw-setup-ic"><LogoMark size={22} /></span>
          <span className="hiw-setup-txt">
            <b>Smile Fast</b>
            <span className="hiw-setup-state">
              <small className="hiw-state-off">Desactivado</small>
              <small className="hiw-state-on">Activo en tu web ✓</small>
            </span>
          </span>
          <span className="hiw-switch"><span className="hiw-knob" /></span>
          <svg className="hiw-cursor" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 3l14 7.5-6.2 1.7L10 18.5z" fill="#1c1e1d" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="hiw-widget">
          <span className="hiw-widget-ring" />
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M7 14c1.5 2 3.2 3 5 3s3.5-1 5-3" /><circle cx="12" cy="12" r="10" /></svg>
          Simula tu sonrisa
        </div>
      </div>
    </div>);

}

/* Paso 2 — escaneo de la selfie y revelado de la sonrisa nueva */
function StepSimulate() {
  return (
    <div className="hiw-sim">
      <img className="hiw-sim-img" src={RES.r16_preview_before_png} alt="" aria-hidden="true" />
      <img className="hiw-sim-img hiw-sim-after" src={RES.r17_preview_after_png} alt="" aria-hidden="true" />
      <span className="hiw-sim-scan" />
      <span className="hiw-corner tl" /><span className="hiw-corner tr" /><span className="hiw-corner bl" /><span className="hiw-corner br" />
      <span className="hiw-sim-status mono">
        <span className="hiw-st hiw-st-a"><span className="hiw-spin" />Analizando sonrisa</span>
        <span className="hiw-st hiw-st-b">✓ Tu nueva sonrisa</span>
      </span>
    </div>);

}

/* Paso 3 — el lead entra al panel y se agenda la cita */
function StepLead() {
  return (
    <div className="hiw-panel">
      <div className="hiw-panel-head">
        <span className="mono" style={{ fontSize: 9 }}>PANEL · LEADS</span>
        <span className="hiw-count">+3 hoy</span>
      </div>
      <div className="hiw-lead hiw-lead-new">
        <span className="hiw-av">MF</span>
        <span className="hiw-lead-txt"><b>María Fernández</b><small>Simulación adjunta · WhatsApp</small></span>
        <img className="hiw-lead-thumb" src={RES.r17_preview_after_png} alt="" aria-hidden="true" />
        <span className="hiw-new mono">NUEVO</span>
      </div>
      <div className="hiw-lead hiw-lead-old">
        <span className="hiw-av" style={{ background: "#c9d1cf" }}>JR</span>
        <span className="hiw-lead-txt"><b>Javier Ruiz</b><small>Contactado</small></span>
      </div>
      <div className="hiw-lead hiw-lead-old" style={{ opacity: 0.55 }}>
        <span className="hiw-av" style={{ background: "#dfe4e2" }}>LC</span>
        <span className="hiw-lead-txt"><b>Laura Castro</b><small>Cita confirmada</small></span>
      </div>
      <div className="hiw-toast">
        <span className="hiw-toast-ic">✓</span>
        <span><b>Cita agendada</b><small>Jue · 10:30</small></span>
      </div>
    </div>);

}

/* ---------------- Lo que verán tus pacientes (demo) ---------------- */
function PatientPreview({ onStart }) {
  const cards = [
  ["Simulación realista", "Una vista previa fotorrealista de su sonrisa post-tratamiento.", "scan"],
  ["Sin promesas vacías", "Resultados estéticos alcanzables, alineados con tu criterio clínico.", "shield"],
  ["Con tu marca", "Colores, logo y dominio de tu clínica. El paciente nunca sale de tu web.", "tag"],
  ["Captura el lead", "Cada simulación deja nombre, email y teléfono en tu panel.", "inbox"]];

  return (
    <section id="producto" className="accent-blue" style={{ padding: "100px 0", background: "linear-gradient(180deg,var(--blue-soft),#ffffff)" }}>
      <div className="wrap" style={{ textAlign: "center", marginBottom: 56 }}>
        <h2 className="display" style={{ fontSize: "clamp(38px, 5vw, 64px)" }}>
          Lo que verán <span className="dim">tus visitantes</span>
        </h2>
        <p className="lead" style={{ fontSize: 18, marginTop: 16 }}>Así se ve Smile Fast dentro de la web de tu clínica.</p>
      </div>
      <div className="wrap future-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr 1fr", gap: 22, alignItems: "stretch" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {cards.slice(0, 2).map((c, i) => <FeatureCard key={i} title={c[0]} body={c[1]} icon={c[2]} />)}
        </div>
        <div style={{ minHeight: 520, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <BeforeAfter beforeSrc={RES.r14_trans_1_before_jpg} afterSrc={RES.r15_trans_1_after_jpg} height="100%" radius={22} imgPos="center 30%" autoplay />
          </div>
          <button className="btn btn-blue" style={{ width: "100%" }} onClick={onStart}>Quiero probarlo</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {cards.slice(2, 4).map((c, i) => <FeatureCard key={i} title={c[0]} body={c[1]} icon={c[2]} />)}
        </div>
      </div>
    </section>);

}

function FeatureCard({ title, body, icon }) {
  const paths = {
    scan: <><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><circle cx="12" cy="12" r="3" /></>,
    shield: <><path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3Z" /><path d="M9 12l2 2 4-4" /></>,
    tag: <><path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z" /><circle cx="8" cy="8" r="1.4" /></>,
    inbox: <><path d="M4 13h4l2 3h4l2-3h4" /><path d="M4 13V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7M4 13v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" /></>
  }[icon];
  return (
    <div className="card card-hover" style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "flex-end", flex: 1, minHeight: 230 }}>
      <span className="fc-ic" style={{ width: 52, height: 52, borderRadius: 14, background: "var(--bg-tint)", border: "1px solid var(--line)", display: "grid", placeItems: "center", color: "var(--ink)", marginBottom: "auto" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
      </span>
      <h3 style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em", margin: "20px 0 8px" }}>{title}</h3>
      <p style={{ fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.5, margin: 0 }}>{body}</p>
    </div>);

}

/* ---------------- El análisis que recibe el paciente (viz) ---------------- */
function Analysis() {
  return (
    <section id="analisis" className="facial-analysis">
      <img className="analysis-blur" src={RES.r10_analysis_blur_png} alt="" aria-hidden="true" />
      <div className="fa-head">
        <div style={{ marginBottom: 16 }}><MonoPill>ANÁLISIS PERSONALIZADO</MonoPill></div>
        <h2 className="display" style={{ fontSize: "clamp(34px, 4.4vw, 52px)", color: "#fff" }}>
          Más que una foto: <span style={{ color: "rgba(255,255,255,0.55)" }}>un análisis</span>
        </h2>
        <p className="lead" style={{ fontSize: 16, marginTop: 14, maxWidth: 560, marginInline: "auto", color: "rgba(255,255,255,0.85)" }}>
          En cada lead se analizan <b>6 parámetros clínicos de su sonrisa</b> para obtener el resultado más natural posible.
        </p>
      </div>
      <AnalysisExplorer />
    </section>);

}

/* ---------------- Casos de uso ---------------- */
function UseCases() {
  const uses = [
  {
    tag: "OBJETIVO PRINCIPAL",
    title: "Captación de leads",
    img: RES.usecase_leads, alt: "Mujer sonriendo con una sonrisa natural", pos: "60% 35%",
    body: <>Tus visitantes se proyectan con su nueva sonrisa antes de pisar la clínica. Cada simulación es un lead cualificado, con foto y datos de contacto, <b>listo para agendar.</b></>
  },
  {
    tag: "USO ADICIONAL",
    title: "Cierre en consulta",
    img: RES.usecase_consulta, alt: "Dentista explicando el plan de tratamiento a una paciente en consulta", pos: "50% 40%",
    body: <>Tu equipo presenta la simulación y el vídeo personalizado durante la visita para explicar el plan de tratamiento. <b>Más claridad para el paciente, mayor aceptación.</b></>
  },
  {
    tag: "USO ADICIONAL",
    title: "Marketing y redes",
    img: RES.usecase_marketing, alt: "Tablet mostrando una simulación dental 3D", pos: "50% 55%",
    body: "Genera contenido antes y después para anuncios, campañas de captación y redes sociales."
  }];

  return (
    <section id="usos" className="accent-blue" style={{ padding: "100px 0", background: "linear-gradient(180deg,#ffffff,var(--blue-soft))" }}>
      <div className="wrap" style={{ textAlign: "center", marginBottom: 56 }}>
        <div style={{ marginBottom: 24 }}><MonoPill>CASOS DE USO</MonoPill></div>
        <h2 className="display" style={{ fontSize: "clamp(36px, 4.8vw, 60px)" }}>
          Tres formas de <span className="dim">aprovecharlo</span>
        </h2>
      </div>
      <div className="uc-a-grid wrap">
        {uses.map((u, i) =>
        <div key={i} className={"uc-a-card" + (i === 0 ? " uc-a-dark" : "")}>
            <div className="uc-a-media">
              <img className="uc-a-img" src={u.img} alt={u.alt} loading="lazy" style={{ objectPosition: u.pos }} />
            </div>
            <div className="uc-a-body">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="mono" style={{ fontSize: 9, color: i === 0 ? "rgba(255,255,255,0.6)" : "var(--ink-3)" }}>{u.tag}</span>
                <span style={{ fontSize: 30, fontWeight: 600, color: i === 0 ? "rgba(255,255,255,0.4)" : "var(--line-strong)" }}>0{i + 1}</span>
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", margin: "16px 0 10px", color: i === 0 ? "#fff" : "var(--ink)" }}>{u.title}</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.55, margin: 0, color: i === 0 ? "rgba(255,255,255,0.72)" : "var(--ink-2)" }}>{u.body}</p>
            </div>
          </div>
        )}
      </div>
    </section>);

}

/* ---------------- Métricas ---------------- */
/* ---------------- Métricas — banda oscura con micro-gráficos ---------------- */
function Metrics() {
  const stats = [
  { pre: "+", val: 38, suf: "%", label: "de visitante a lead", viz: "bars", a: 1, b: 1.38 },
  { pre: "+", val: 65, suf: "%", label: "de esos leads agenda cita", viz: "ring", pct: 65 },
  { pre: "x", val: 3, suf: "", label: "planes de estética cerrados", viz: "bars", a: 1, b: 3 },
  { pre: "", val: 1, suf: " día", label: "para tenerlo activo, sin desarrollo", viz: "clock" }];
  const [ref, inview] = useInview(0.3);
  return (
    <section id="resultados" className={"mx" + (inview ? " mx-on" : "")} ref={ref}>
      <div className="wrap">
        <div className="mx-head">
          <span className="mono mx-eyebrow"><span className="mx-live" />EL IMPACTO</span>
          <h2 className="display mx-title">Lo que cambia cuando tus visitantes <span className="mx-dim">se ven antes de agendar</span></h2>
        </div>
        <div className="mx-grid">
          {stats.map((s, i) => <MetricStat key={i} s={s} i={i} inview={inview} />)}
        </div>
      </div>
    </section>);

}
function MetricStat({ s, i, inview }) {
  const [n, setN] = React.useState(0);
  const [landed, setLanded] = React.useState(false);
  React.useEffect(() => {
    if (!inview) return;
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setN(s.val); setLanded(true); return; }
    const dur = 1800, t0 = performance.now() + 250 + i * 180;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, Math.max(0, (now - t0) / dur));
      const e = t <= 0 ? 0 : 1 - Math.pow(2, -10 * t); // easeOutExpo
      setN(s.val * e);
      if (t < 1) { raf = requestAnimationFrame(tick); }
      else { setN(s.val); setLanded(true); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inview]);
  return (
    <div className={"mx-card" + (landed ? " mx-landed" : "")} style={{ "--i": i }}>
      <div className="mx-viz" aria-hidden="true">
        {s.viz === "bars" && <MxBars a={s.a} b={s.b} />}
        {s.viz === "ring" && <MxRing pct={s.pct} />}
        {s.viz === "clock" && <MxClock />}
      </div>
      <div className="mx-num display">{s.pre}{Math.round(n)}{s.suf}</div>
      <div className="mx-label">{s.label}</div>
    </div>);

}
function MxBars({ a, b }) {
  const max = Math.max(a, b);
  return (
    <div className="mx-bars">
      <div className="mx-bar-col"><span className="mx-bar mx-bar-a" style={{ "--h": a / max }} /><span className="mono">ANTES</span></div>
      <div className="mx-bar-col"><span className="mx-bar mx-bar-b" style={{ "--h": b / max }} /><span className="mono">CON</span></div>
    </div>);

}
function MxRing({ pct }) {
  return (
    <svg className="mx-ring" viewBox="0 0 80 80" width="80" height="80">
      <circle cx="40" cy="40" r="32" pathLength="100" className="mx-ring-bg" />
      <circle cx="40" cy="40" r="32" pathLength="100" className="mx-ring-fg" style={{ "--p": pct }} />
    </svg>);

}
function MxClock() {
  return (
    <div className="mx-clock">
      <svg viewBox="0 0 80 80" width="80" height="80">
        <circle cx="40" cy="40" r="32" pathLength="100" className="mx-ring-bg" />
        <circle cx="40" cy="40" r="32" pathLength="100" className="mx-clock-sweep" />
        <line x1="40" y1="40" x2="40" y2="16" className="mx-clock-hand" />
        <circle cx="40" cy="40" r="3" fill="#fff" />
      </svg>
      <span className="mx-clock-done mono">✓ LISTO</span>
    </div>);

}

/* ---------------- Embudo — visitantes que se pierden vs. que agendan ---------------- */
const FX_ICONS = {
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  doubt: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14" /><path d="M12 17.5h.01" /></>,
  leave: <><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5" /><path d="M5 12h11" /></>,
  calX: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="M10 13.5l4 4M14 13.5l-4 4" /></>,
  lost: <><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></>,
  scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><path d="M8.5 13.5c1 1.3 2.2 2 3.5 2s2.5-.7 3.5-2" /></>,
  smile: <><circle cx="12" cy="12" r="9" /><path d="M8 14c1 1.5 2.4 2.2 4 2.2s3-.7 4-2.2" /><path d="M9 9.5h.01M15 9.5h.01" /></>,
  mail: <><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="M3.5 7l8.5 6 8.5-6" /></>,
  calOk: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="M9 14.5l2 2 4-4" /></>,
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
};

function ClinicFunnel() {
  const [ref, inview] = useInview(0.22);
  const oldSteps = [["Visitante anónimo", "user"], ["Duda del resultado", "doubt"], ["Abandona la web", "leave"], ["No agenda", "calX"], ["Lead perdido", "lost"]];
  const newSteps = [["Se simula en tu web", "scan"], ["Ve su resultado", "smile"], ["Deja sus datos", "mail"], ["Agenda con intención", "calOk"], ["Paciente nuevo", "star"]];
  return (
    <section id="embudo" className={"funnel" + (inview ? " in" : "")} ref={ref} style={{ padding: "100px 0" }}>
      <div className="wrap" style={{ textAlign: "center", marginBottom: 48 }}>
        <div className="fn-head-item" style={{ marginBottom: 22 }}><MonoPill>EL EMBUDO</MonoPill></div>
        <h2 className="display fn-head-item" style={{ fontSize: "clamp(34px, 4.6vw, 58px)", lineHeight: 1.06, transitionDelay: "0.08s" }}>
          El problema es lo que pasa <span className="dim">antes de agendar</span>
        </h2>
      </div>
      <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <FunnelRow title="Sin Smile Fast" steps={oldSteps} win={false} baseDelay={0.3}
          result={<span className="fx-res-big">Clic pagado,<br />sin cita</span>} />
        <FunnelRow title="Con Smile Fast" steps={newSteps} win={true} baseDelay={1.1}
          result={<span className="fx-res-big"><b>+38%</b> leads<br /><b>65%</b> agenda</span>} />
      </div>
    </section>);

}

function FunnelRow({ title, steps, win, baseDelay, result }) {
  // puntos = visitantes recorriendo el embudo; sin Smile Fast caen antes del final
  const dots = win ? [4, 4, 4, 4, 4, 4] : [1, 2, 1, 3, 2, 1];
  return (
    <div className={"fx-row" + (win ? " fx-win" : " fx-lose")}>
      <div className="fx-label">
        <span className="fx-badge">{win ? <LogoMark size={20} dark={false} /> : <span className="fx-x"></span>}</span>
        <div className="fx-title">{title}</div>
      </div>
      <div className="fx-track">
        <span className="fx-line" aria-hidden="true"><span className="fx-line-fill" style={{ transitionDelay: baseDelay + "s" }} /></span>
        <div className="fx-dots" aria-hidden="true">
          {dots.map((stop, i) =>
          <span key={i} className="fx-dot" style={{ "--stop": stop, "--delay": (i * 0.75) + "s" }} />
          )}
        </div>
        {steps.map(([label, icon], i) => {
          const last = i === steps.length - 1;
          return (
            <div key={i} className={"fx-step" + (last ? " fx-end" : "")} style={{ transitionDelay: (baseDelay + i * 0.14) + "s" }}>
              <span className="fx-node">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{FX_ICONS[icon]}</svg>
              </span>
              <div className="fx-step-title">{label}</div>
            </div>);
        })}
      </div>
      <div className="fx-result" style={{ transitionDelay: (baseDelay + 0.8) + "s" }}>
        <span className="mono fx-res-tag">RESULTADO</span>
        {result}
      </div>
    </div>);

}


/* ---------------- FAQ (enfocado a dueños de clínicas) ---------------- */
function FAQItem({ q, a, open, onToggle }) {
  return (
    <div className="faq-item" onClick={onToggle}>
      <div className="faq-q">
        <span>{q}</span>
        <span className={"faq-ico" + (open ? " open" : "")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </span>
      </div>
      <div className="faq-a" style={{ maxHeight: open ? 260 : 0 }}>
        <p>{a}</p>
      </div>
    </div>);

}

function FAQ() {
  const [open, setOpen] = useState(0);
  const items = [
    ["¿Cómo se integra en la web de mi clínica?",
     "No tienes que programar nada. Nosotros lo dejamos activo en tu web, con tu logo y tus colores, sin tocar su diseño ni contratar a un desarrollador. Queda funcionando en un día y adaptado a móvil y escritorio."],
    ["¿Los datos de los pacientes están seguros y cumplen el RGPD?",
     "Sí. La captura incluye consentimiento explícito y confirmación de mayoría de edad, y las imágenes y datos se procesan cifrados. El paciente acepta términos y privacidad antes de generar su simulación, de modo que tu clínica capta leads de forma conforme a la normativa."],
    ["¿Qué recibe mi clínica por cada visitante que se simula?",
     "Un lead cualificado: nombre, correo y WhatsApp junto a su simulación de sonrisa. Los leads llegan a tu panel de administración, donde puedes verlos, cambiar su estado (pendiente, contactado, convertido) y contactarlos directamente por WhatsApp."],
    ["¿La simulación es realista? ¿No genera expectativas falsas?",
     "El resultado es una proyección estética orientativa, siempre etiquetada como tal. Sirve para motivar al paciente a agendar; la viabilidad clínica real se confirma en consulta con tu equipo. Puedes ofrecer además un vídeo personalizado que se puede generar presencialmente en consulta."],
    ["¿Cuánto tarda en estar activo y necesito formación?",
     "En un día lo tienes funcionando. Configuramos tu marca (logo y colores), lo integramos en tu web y te damos acceso al panel. No requiere formación técnica: el equipo de recepción gestiona los leads desde una interfaz sencilla."],
    ["¿Cómo me ayuda de verdad a conseguir más pacientes?",
     "Convierte el tráfico anónimo de tu web en citas. En lugar de un visitante que duda y se va, la persona se ve con su nueva sonrisa, deja sus datos con intención real y agenda. Es captación proactiva desde tu propio sitio, sin depender solo de publicidad."],
    ["¿Tengo que firmar permanencia o hacer una gran inversión inicial?",
     "No. No hay permanencia: puedes cancelar cuando quieras. Puedes empezar sin inversión inicial y, si más adelante quieres más funciones (vídeo o más personalización de marca), solo hay un coste mínimo de implementación, sin ataduras a largo plazo."]];

  return (
    <section id="faq" style={{ padding: "100px 0", borderTop: "1px solid var(--line)" }}>
      <div className="wrap faq-wrap">
        <div className="faq-head">
          <div style={{ marginBottom: 24 }}><MonoPill>PREGUNTAS FRECUENTES</MonoPill></div>
          <h2 className="display" style={{ fontSize: "clamp(34px, 4.5vw, 56px)" }}>
            Todo lo que tu <span className="dim">clínica necesita saber</span>
          </h2>
          <p className="lead" style={{ fontSize: 17, marginTop: 18, maxWidth: 340 }}>
            Resolvemos las dudas más habituales de directores y propietarios de clínicas dentales.
          </p>
        </div>
        <div className="faq-list">
          {items.map(([q, a], i) =>
          <FAQItem key={i} q={q} a={a} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
          )}
        </div>
      </div>
    </section>);

}

/* ---------------- Testimonios (dueños de clínicas) ---------------- */
function Testimonios({ onStart }) {
  const [ref, inview] = useInview(0.12);
  const clients = [
    { src: RES.r18_logo_nobel_jpg, name: "Clínicas Nobel" },
    { src: RES.r19_logo_bracamonte_png, name: "Comidas Bracamonte" },
    { src: RES.r20_logo_templo_png, name: "Templo del Masaje" },
    { src: RES.r21_logo_remax_png, name: "RE/MAX Exclusive" },
    { src: RES.r22_logo_sanjose_png, name: "San José", dark: true },
    { src: RES.r23_logo_innovacirco_png, name: "Innovacirco" }];
  const T = [
    { quote: "Los pacientes llegan a la primera visita ya informados y decididos. La aceptación de tratamientos subió de forma notable.", name: "Dr. Andrés Salcedo", role: "Dirección Médica", company: "Clínicas Nobel", stat: "+45%", statLbl: "aceptación de tratamientos", initials: "AS" },
    { quote: "Los leads llegan calificados y con contexto. Nuestros agentes cierran más y en menos visitas.", name: "José Miguel", role: "Broker Owner", company: "RE/MAX Exclusive", stat: "+38%", statLbl: "más leads calificados", avatar: RES.r24_avatar_josemiguel_jpg },
    { quote: "Pasamos de responder en horas a responder en minutos, sin sumar una sola persona al equipo.", name: "Lucía Fernández", role: "Coordinación", company: "Templo del Masaje", stat: "24/7", statLbl: "atención automatizada", initials: "LF" }];
  const Stars = () =>
    <div style={{ display: "flex", gap: 3 }}>
      {[0, 1, 2, 3, 4].map((s) => <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill="var(--sage-deep)"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" /></svg>)}
    </div>;
  const Avatar = ({ t }) => t.avatar ?
    <img src={t.avatar} alt={t.name} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--line)" }} /> :
    <span style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", background: "var(--bg-tint)", color: "var(--sage-deep)", border: "1px solid var(--line)" }}>{t.initials}</span>;
  const metrics = [["+15", "empresas activas"], ["+6", "países"]];
  const seals = [
    { label: "Datos cifrados", icon: <><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></> },
    { label: "Privacidad del paciente", icon: <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /> },
    { label: "Sin permanencia", icon: <><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></> }];
  return (
    <section id="testimonios" ref={ref} className="bb-section accent-blue" style={{ position: "relative", padding: "112px 0", background: "var(--blue-tint)", borderTop: "1px solid var(--line)", overflow: "hidden" }}>
      <span className="bb-dots" aria-hidden="true"></span>
      <div className="wrap" style={{ position: "relative", zIndex: 1 }}>
        <div className="bb-intro" style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 52, alignItems: "center" }}>
          <div>
            <span className="mono" style={{ fontSize: 12, letterSpacing: "0.2em", color: "var(--sage-deep)", textTransform: "uppercase" }}>La agencia detrás de Smile Fast</span>
            <h2 className="display" style={{ fontSize: "clamp(32px, 4vw, 52px)", margin: "16px 0 0", lineHeight: 1.05 }}>
              Detrás de Smile Fast <span className="dim">está Brandboost</span>
            </h2>
            <p style={{ fontSize: 16.5, lineHeight: 1.6, color: "var(--ink-2)", maxWidth: "48ch", margin: "18px 0 26px" }}>
              Smile Fast es un producto de <b>Brandboost</b>, la agencia que diseña agentes, integraciones y sistemas inteligentes para empresas.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 52, height: 52, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: 14, background: "#fff", border: "1px solid var(--line)" }}>
                <img src={RES.r25_brandboost_mark_png} alt="Brandboost AI" style={{ width: 34, height: 34, objectFit: "contain" }} />
              </span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)" }}>Brandboost AI</div>
                <div className="mono" style={{ fontSize: 10.5, letterSpacing: "0.16em", color: "var(--ink-3)", textTransform: "uppercase", marginTop: 3 }}>Agencia de IA</div>
              </div>
            </div>
          </div>
          {/* Tarjeta oscura premium con imagen */}
          <div style={{ position: "relative", borderRadius: "var(--r-img)", overflow: "hidden", minHeight: 340, background: "var(--ink)", boxShadow: "0 40px 90px -46px rgba(28,30,29,0.6)" }}>
            <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200" alt="Infraestructura de IA global" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.42 }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(28,30,29,0.35), rgba(28,30,29,0.92))" }} />
            <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 30, color: "#fff", minHeight: 340 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img src={RES.r25_brandboost_mark_png} alt="" style={{ width: 30, height: 30, objectFit: "contain", filter: "brightness(1.6)" }} />
                <span className="mono" style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--blue-light)", textTransform: "uppercase" }}>Agentes · Automatización · IA</span>
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 300, lineHeight: 1.4, margin: "0 0 22px", maxWidth: "24ch" }}>Agentes de IA, automatizaciones e integraciones <b>a medida de cada empresa.</b></p>
                <div style={{ display: "flex", gap: 30, flexWrap: "wrap" }}>
                  {[["LATAM + España", "Empresas que ya confían"], ["Soporte real", "Equipo humano detrás"]].map((m, i) =>
                  <div key={i}>
                      <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "#fff" }}>{m[0]}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 3, maxWidth: 110 }}>{m[1]}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Muro de logos */}
        <div style={{ marginTop: 64 }}>
          <div className="mono" style={{ fontSize: 12, letterSpacing: "0.2em", color: "var(--ink-3)", textTransform: "uppercase", marginBottom: 20 }}>Empresas que ya trabajan con Brandboost</div>
          <div className={"bb-metrics" + (inview ? " in" : "")} style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "10px 26px", marginBottom: 30 }}>
            {metrics.map((m, i) =>
            <React.Fragment key={i}>
                {i > 0 && <span style={{ color: "var(--line-strong)", fontSize: 20 }}>·</span>}
                <span style={{ display: "inline-flex", alignItems: "baseline", gap: 9 }}>
                  <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--ink)" }}>{m[0]}</span>
                  <span style={{ fontSize: 13.5, color: "var(--ink-3)" }}>{m[1]}</span>
                </span>
              </React.Fragment>
            )}
          </div>
          <div className="bb-logos" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
            {clients.map((c, i) =>
            <div key={i} style={{ display: "grid", placeItems: "center", background: c.dark ? "var(--ink)" : "#fff", border: c.dark ? "1px solid var(--ink)" : "1px solid var(--line)", borderRadius: 14, padding: "22px 18px", minHeight: 96 }}>
              <img src={c.src} alt={c.name} style={{ maxHeight: 48, maxWidth: 132, objectFit: "contain" }} />
            </div>
            )}
          </div>
        </div>

        {/* Testimonios */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginTop: 44 }} className="bb-tst-grid">
          {T.map((t, i) =>
          <figure key={i} style={{ margin: 0, display: "flex", flexDirection: "column", background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--r-card)", padding: 26 }}>
              <Stars />
              <blockquote style={{ margin: "16px 0 0", fontSize: 15.5, lineHeight: 1.55, color: "var(--ink)", flex: 1 }}>“{t.quote}”</blockquote>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <Avatar t={t} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.01em", color: "var(--ink)" }}>{t.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{t.role} · {t.company}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--sage-deep)", lineHeight: 1 }}>{t.stat}</div>
                  <div style={{ fontSize: 9.5, letterSpacing: "0.04em", color: "var(--ink-3)", marginTop: 4, maxWidth: 120 }}>{t.statLbl}</div>
                </div>
              </div>
            </figure>
          )}
        </div>

        {/* Franja de seguridad de datos */}
        <div className={"bb-seals" + (inview ? " in" : "")} style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 36 }}>
          {seals.map((s, i) =>
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "10px 18px", borderRadius: 999, border: "1px solid var(--line-strong)", background: "transparent", fontSize: 13, color: "var(--ink-2)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{s.icon}</svg>
              {s.label}
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 20px", marginTop: 40 }}>
          <button className="btn btn-blue" onClick={onStart} style={{ padding: "14px 28px", fontSize: 14 }}>Agendar reunión</button>
        </div>
      </div>
    </section>);

}

/* ---------------- CTA + Footer ---------------- */
/* ---------------- Footer ---------------- */
const FT_COLS = [
  ["Producto", [["Cómo funciona", "#como"], ["Lo que ven tus visitantes", "#producto"], ["El recorrido", "#recorrido"], ["Análisis clínico", "#analisis"], ["Vídeo realista", "#video"]]],
  ["Para tu clínica", [["Beneficios", "#transformaciones"], ["Casos de uso", "#usos"], ["Resultados", "#resultados"], ["Preguntas frecuentes", "#faq"]]]];
const FT_BADGES = [
  ["Cumple RGPD", <><path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3Z" /><path d="M9 12l2 2 4-4" /></>],
  ["Datos cifrados", <><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></>],
  ["Sin permanencia", <><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></>],
  ["Activo en 1 día", <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="M9 14.5l2 2 4-4" /></>]];

function SiteFooter({ onStart }) {
  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  return (
    <footer className="ft">
      <div className="wrap ft-top">
        <div className="ft-brand">
          <img src={RES.r11_logo_sf_white_png} alt="Smile Fast" className="ft-logo" />
          <p className="ft-tagline">La plataforma de simulación de sonrisa con IA para clínicas dentales. Convierte las visitas de tu web en citas agendadas.</p>
          <button className="btn btn-white ft-cta" onClick={onStart}>Quiero probarlo <span aria-hidden="true">→</span></button>
          <ul className="ft-badges">
            {FT_BADGES.map(([t, ic], i) =>
            <li key={i}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ic}</svg>{t}</li>
            )}
          </ul>
        </div>
        <nav className="ft-cols" aria-label="Enlaces del pie de página">
          {FT_COLS.map(([h, links]) =>
          <div key={h} className="ft-col">
              <span className="mono ft-h">{h}</span>
              {links.map(([t, href]) => <a key={href} href={href} className="ft-link">{t}<span aria-hidden="true">→</span></a>)}
            </div>
          )}
          <div className="ft-col">
            <span className="mono ft-h">Empresa</span>
            <a href="#testimonios" className="ft-link">Brandboost<span aria-hidden="true">→</span></a>
            <button type="button" className="ft-link ft-link-btn" onClick={onStart}>Agendar reunión<span aria-hidden="true">→</span></button>
          </div>
        </nav>
      </div>

      <div className="wrap ft-wordmark" aria-hidden="true">Smile Fast</div>

      <div className="wrap ft-bottom">
        <span>© 2026 Smile Fast · Un producto de <a href="#testimonios">Brandboost</a></span>
        <span className="mono ft-made">HECHO PARA CLÍNICAS DENTALES</span>
        <button type="button" className="ft-top-btn" onClick={toTop}><span aria-hidden="true">↑</span> Volver arriba</button>
      </div>
    </footer>);

}

function CTAFooter({ onStart }) {
  const [ref, inview] = useInview(0.3);
  const cardsRef = React.useRef(null);
  React.useEffect(() => {
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    let raf = null;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const el = cardsRef.current; if (!el) return;
        const r = el.parentElement.getBoundingClientRect();
        const prog = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
        el.style.transform = "translateY(" + (prog * -50).toFixed(1) + "px)";
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <>
      <section id="empezar" ref={ref} className={"cta-final" + (inview ? " in" : "")}>
        <div className="ctaf-cards" ref={cardsRef} aria-hidden="true">
          <img className="ctaf-card c1" src={RES.r17_preview_after_png} alt="" />
          <img className="ctaf-card c2" src={RES.r28_trans_2_after_jpg} alt="" />
          <img className="ctaf-card c3" src={RES.r15_trans_1_after_jpg} alt="" />
        </div>
        <div className="wrap cta-final-body" style={{ position: "relative", zIndex: 1 }}>
          <span className="mono ctaf-eyebrow">ÚLTIMO PASO</span>
          <h2 className="display ctaf-title">
            Lleva <span className="ctaf-brand">Smile Fast</span><br />a tu clínica
          </h2>
          <p className="lead ctaf-lead">
            Actívalo en tu web y convierte cada visita en una cita agendada.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn-white cta-glow" style={{ padding: "18px 42px", fontSize: 17 }} onClick={onStart}>Quiero probarlo</button>
          </div>
        </div>
      </section>
      <SiteFooter onStart={onStart} />
    </>);

}

/* ---------------- Compose ---------------- */
const TF_ICONS = [
  <><path d="M6 3h12l3 6-9 12L3 9z" /><path d="M3 9h18M12 21L8 9l4-6 4 6" /></>,
  <><circle cx="12" cy="9" r="6" /><path d="M8.5 13.5L7 21l5-3 5 3-1.5-7.5" /></>,
  <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /><path d="M9 15l2 2 4-4" /></>,
  <><path d="M3 7l6 6 4-4 8 8" /><path d="M15 17h6v-6" /></>,
  <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" />];

function Transformations() {
  const benefits = [
    "Más pacientes de estética de alto valor",
    "Te diferencias de toda clínica de tu zona",
    "Más planes aceptados, menos «lo voy a pensar»",
    "Menos dependencia de la publicidad pagada",
    "Refuerzas el prestigio y justificas tu precio"];
  const [ref, inview] = useInview(0.2);
  const [touched, setTouched] = useState(false);

  return (
    <section id="transformaciones" ref={ref} className={"tf accent-blue" + (inview ? " tf-on" : "")} style={{ padding: "100px 0", borderTop: "1px solid var(--line)" }}>
      <div className="wrap trans-grid tf-grid">
        {/* Columna izquierda: encabezado + beneficios */}
        <div className="tf-left">
          <div className="tf-rise" style={{ marginBottom: 26 }}><MonoPill>BENEFICIOS</MonoPill></div>
          <h2 className="display tf-rise" style={{ fontSize: "clamp(36px, 4vw, 56px)", transitionDelay: "0.06s" }}>
            Lo que gana<br /><span className="dim">tu clínica</span>
          </h2>
          <p className="lead tf-rise" style={{ fontSize: 16.5, margin: "18px 0 0", maxWidth: 400, transitionDelay: "0.12s" }}>
            La demanda de estética dental crece: convierte ese interés en pacientes que agendan y elevan la facturación de tu clínica.
          </p>
          <ul className="tf-list">
            {benefits.map((b, i) =>
            <li key={i} className="tf-item" style={{ "--i": i }}>
                <span className="tf-ic" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{TF_ICONS[i]}</svg>
                </span>
                <span className="tf-txt">{b}</span>
                <span className="tf-arrow" aria-hidden="true">→</span>
              </li>
            )}
          </ul>
        </div>
        {/* Comparador antes/proyección */}
        <div className="trans-card tf-media" onPointerDown={() => setTouched(true)}>
          <BeforeAfter beforeId="trans-2m-before" afterId="trans-2m-after" beforeSrc={RES.r27_trans_2_before_jpg} afterSrc={RES.r28_trans_2_after_jpg} imgPos="58% 30%" height="100%" radius={22} intro />
          <span className={"tf-hint mono" + (touched ? " hide" : "")} aria-hidden="true">
            <span className="tf-hint-arr">←</span> ARRASTRA PARA COMPARAR <span className="tf-hint-arr">→</span>
          </span>
        </div>
      </div>
    </section>);

}

/* ---------------- Vídeo en movimiento (feature aparte) ---------------- */
function VideoFeature({ onStart }) {
  return (
    <section id="video" className="tone-dark" style={{ padding: "110px 0" }}>
      <div className="wrap video-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: 50, alignItems: "center" }}>
        <div>
          <div style={{ marginBottom: 22 }}><MonoPill>NUEVO · VÍDEO REALISTA</MonoPill></div>
          <h2 className="display" style={{ fontSize: "clamp(34px, 4.4vw, 58px)" }}>
            Su nueva sonrisa,<br /><span className="dim">en movimiento</span>
          </h2>
          <p className="lead" style={{ fontSize: 17, margin: "20px 0 34px", maxWidth: 420 }}>
            Además de la foto, tu paciente puede verse sonreír en un vídeo realista. Verse en movimiento es lo que termina de convencerlo para agendar.
          </p>
          <button className="btn btn-white" onClick={onStart}>Quiero probarlo</button>
        </div>
        <div style={{ position: "relative", borderRadius: 22, overflow: "hidden", border: "1px solid var(--line)", background: "var(--photo)", aspectRatio: "16 / 10" }}>
          <video src="https://res.cloudinary.com/dhzmkxbek/video/upload/v1781638188/0614_2_upxmh1.mp4" autoPlay loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}></video>
          <span className="mono" style={{ position: "absolute", top: 16, left: 16, fontSize: 9, letterSpacing: "0.18em", color: "#fff", background: "rgba(20,24,23,0.5)", padding: "6px 12px", borderRadius: 99 }}>VÍDEO REALISTA</span>
        </div>
      </div>
    </section>);

}

function Landing({ onStart }) {
  return (
    <div>
      <Nav onStart={onStart} />
      <Hero onStart={onStart} />
      <TrustStrip />
      <Transformations />
      <LeadAsset onStart={onStart} />
      <HowItWorks />
      <PatientPreview onStart={onStart} />
      <AppJourney />
      <VideoFeature onStart={onStart} />
      <Analysis />
      <UseCases />
      <Metrics />
      <ClinicFunnel />
      <Testimonios onStart={onStart} />
      <FAQ />
      <CTAFooter onStart={onStart} />
    </div>);

}

export { Landing };