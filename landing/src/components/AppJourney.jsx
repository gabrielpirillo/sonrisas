import React, { useState, useEffect, useRef } from "react";
import { RES } from "../resources";

/* ============================================================
   AppJourney — "Dentro de la app, paso a paso"
   Sección con scroll: pin + stack de naipes (desktop) /
   carrusel horizontal (móvil). Portada de la Opción B.
   ============================================================ */

const JOURNEY_STEPS = [
  { n: "01", tag: "DATOS", t: "Deja sus datos", d: "Nombre, email y teléfono: ya es tu lead.", img: RES.r6_app_step1_png },
  { n: "02", tag: "FOTO", t: "Sube una selfie", d: "Una foto frontal, sin descargas.", img: RES.r7_app_step2_jpg },
  { n: "03", tag: "ANÁLISIS", t: "La IA analiza su sonrisa", d: "Proporciones, simetría y tono VITA.", img: RES.r8_app_step3_jpg },
  { n: "04", tag: "RESULTADO", t: "Ve su nueva sonrisa", d: "Su antes y después realista, y agenda.", img: RES.r9_app_step4_jpg }
];

function slideStyle(i, active, mob) {
  if (mob) {
    const d = i - active;
    return {
      transform: `translate(calc(-50% + ${d * 236}px),-50%) scale(${i === active ? 1 : 0.8})`,
      opacity: i === active ? 1 : Math.abs(d) === 1 ? 0.34 : 0,
      filter: i === active ? "blur(0px)" : "blur(3px)",
      zIndex: 100 - Math.abs(d)
    };
  }
  if (i === active)
    return { transform: "translate(-50%,-50%) rotate(0deg) scale(1)", opacity: 1, filter: "blur(0px)", zIndex: 100 };
  if (i < active) {
    const dp = active - i;
    const ang = (i % 2 ? 1 : -1) * Math.min(dp * 3.5, 10);
    return {
      transform: `translate(-50%,calc(-50% + ${dp * 26}px)) rotate(${ang}deg) scale(${(1 - dp * 0.05).toFixed(3)})`,
      opacity: Math.max(0.12, 0.6 - (dp - 1) * 0.18),
      filter: `blur(${Math.min(dp * 2, 6)}px)`,
      zIndex: 50 - dp
    };
  }
  return { transform: "translate(-50%,calc(-50% + 80px)) rotate(0deg) scale(.92)", opacity: 0, filter: "blur(5px)", zIndex: 10 };
}

function AppJourney() {
  const ref = useRef(null);
  const [active, setActive] = useState(0);
  const [fill, setFill] = useState(0);
  const [mob, setMob] = useState(false);
  const N = JOURNEY_STEPS.length;

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const p = Math.max(0, Math.min(1, -rect.top / total));
      const a = Math.min(N - 1, Math.floor(p * N + 1e-6));
      setActive(a);
      setFill(N > 1 ? a / (N - 1) : 0);
    };
    const onResize = () => { setMob(window.innerWidth <= 860); onScroll(); };
    onResize();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize); };
  }, [N]);

  const goto = (i) => {
    const el = ref.current; if (!el) return;
    const total = el.offsetHeight - window.innerHeight;
    // centro del tramo de cada paso: al llegar no queda en el borde con el anterior
    window.scrollTo({ top: el.offsetTop + total * ((i + 0.5) / N), behavior: "smooth" });
  };
  const sd = JOURNEY_STEPS[active];

  // Móvil: además del scroll, se puede deslizar el teléfono a izquierda/derecha.
  const swipe = useRef(null);
  const onTouchStart = (e) => { const t = e.touches[0]; swipe.current = { x: t.clientX, y: t.clientY }; };
  const onTouchEnd = (e) => {
    const s = swipe.current; swipe.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x, dy = t.clientY - s.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    const to = Math.max(0, Math.min(N - 1, active + (dx < 0 ? 1 : -1)));
    if (to !== active) goto(to);
  };

  return (
    <section className="journey" id="recorrido" ref={ref} style={{ height: "320vh" }}>
      <div className="jsticky">
        <div className="jglow" />
        <div className="jgrid">
          <div className="jhead">
            <span className="j-pill"><span className="dt" />EL RECORRIDO</span>
            <h2>Dentro de tu web,<br /><span className="sub">paso a paso</span></h2>
            <p>Así vive tu paciente la experiencia. Cuatro pasos que convierten curiosidad en una cita agendada.</p>
            <div className="steps">
              <div className="steprail" style={{ "--fill": (fill * 100).toFixed(1) + "%" }} />
              {JOURNEY_STEPS.map((s, i) =>
                <button type="button" key={i} className={"step" + (i === active ? " active" : "")} aria-current={i === active ? "step" : undefined} onClick={() => goto(i)}>
                  <span className="n">{s.n}</span>
                  <span><span className="st">{s.t}</span><span className="sd">{s.d}</span></span>
                </button>)}
            </div>
          </div>
          <div className="stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            {JOURNEY_STEPS.map((s, i) =>
              <div key={i} className="slide" style={slideStyle(i, active, mob)} aria-hidden={i !== active}>
                <div className="jphone"><img src={s.img} alt={"Paso " + s.n + ": " + s.t} loading={i === 0 ? "eager" : "lazy"} decoding="async" /></div>
              </div>)}
          </div>
          <div className="mcap" aria-live="polite"><span className="mn">{sd.n}</span><div><div className="mt">{sd.t}</div><div className="md">{sd.d}</div></div></div>
          <div className="mdots">{JOURNEY_STEPS.map((s, i) =>
            <button type="button" key={i} className={i === active ? "on" : ""} aria-label={"Paso " + s.n + ": " + s.t} aria-current={i === active ? "step" : undefined} onClick={() => goto(i)}><i /></button>)}
          </div>
        </div>
      </div>
    </section>);
}

export { AppJourney };
