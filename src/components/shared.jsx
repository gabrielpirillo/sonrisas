import React from "react";
import { RES } from "../resources";

/* ============================================================
   Shared components — Qoves visual language
   ============================================================ */
const { useState, useRef, useEffect, useCallback } = React;

/* ---- Q-style circular logo mark ---- */
function LogoMark({ size = 38, dark = true }) {
  const stroke = dark ? "#fff" : "#1c1e1d";
  return (
    React.createElement("span", { className: "logo-mark", style: { width: size, height: size, background: dark ? "var(--ink)" : "transparent", border: dark ? "none" : "1px solid var(--ink)" } },
    React.createElement("svg", { width: size * 0.5, height: size * 0.5, viewBox: "0 0 24 24", fill: "none" },
    React.createElement("circle", { cx: 12, cy: 12, r: 9, stroke: stroke, strokeWidth: 2 }),
    React.createElement("path", { d: "M12 3 A9 9 0 0 1 12 21", stroke: stroke, strokeWidth: 2, fill: "none", opacity: 0.45 })
    )
    ));

}

/* ---- Mono technical label ---- */
function Mono({ children, style, className = "" }) {
  return React.createElement("span", { className: "mono " + className, style }, children);
}

/* ---- Mono pill (outline label chip) ---- */
function MonoPill({ children }) {
  return React.createElement("span", { className: "mono mono-pill" }, children);
}

/* ============================================================
   Before / After comparison slider (Qoves seam)
   Two stacked <image-slot>s; the "before" layer is clipped to
   the divider position. Drag the handle to compare.
   ============================================================ */
function BeforeAfter({ height = "100%", radius = 22, beforeId, afterId, beforeSrc, afterSrc, labelA = "ANTES", labelB = "PROYECCIÓN", compact = false, sync = true, afterTransform, beforeTransform, imgPos, beforePos, afterPos }) {
  const [pos, setPos] = useState(50);
  // En modo sync (por defecto) ambas mitades usan la MISMA imagen → siempre alineadas.
  // La mitad «proyección» recibe una mejora estética sutil para distinguirse.
  const sharedId = beforeId || afterId;
  const distinct = !sync || beforeSrc && afterSrc;
  const afterImgId = distinct ? afterId : sharedId;
  const beforeImgId = distinct ? beforeId : sharedId;
  // Con fotos reales (antes/después distintos) no aplicamos realce; solo en modo sync.
  const projection = distinct ? "none" : "brightness(1.05) saturate(1.09) contrast(1.02)";
  // Con fotos fijas (antes/después), ambas capas se renderizan como <img> con
  // EXACTAMENTE el mismo encuadre (object-fit:cover + mismo object-position);
  // solo cambia el clip. Nunca se altera la geometría de una capa.
  const useImg = !!(beforeSrc && afterSrc);
  const pos30 = imgPos || "center 30%";
  const aPos = afterPos || pos30;
  const bPos = beforePos || pos30;
  const ref = useRef(null);
  const dragging = useRef(false);

  const move = useCallback((clientX) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let p = (clientX - r.left) / r.width * 100;
    p = Math.max(2, Math.min(98, p));
    setPos(p);
  }, []);

  useEffect(() => {
    const onMove = (e) => {if (dragging.current) move(e.touches ? e.touches[0].clientX : e.clientX);};
    const onUp = () => {dragging.current = false;document.body.style.userSelect = "";};
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [move]);

  const start = (e) => {
    dragging.current = true;
    document.body.style.userSelect = "none";
    move(e.touches ? e.touches[0].clientX : e.clientX);
  };

  return React.createElement("div", {
    ref: ref,
    style: {
      position: "relative", width: "100%", height,
      borderRadius: radius, overflow: "hidden",
      background: "var(--photo)", cursor: "ew-resize",
      border: "1px solid var(--line)"
    },
    onMouseDown: start, onTouchStart: start
  },
  /* after layer (full) — mitad «proyección» */
  useImg ?
  React.createElement("img", {
    src: afterSrc, alt: "", draggable: false,
    style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: aPos, filter: projection, userSelect: "none", WebkitUserDrag: "none" }
  }) :
  React.createElement("image-slot", {
    id: afterImgId, src: afterSrc,
    placeholder: "Foto «después»",
    style: { position: "absolute", inset: 0, width: "100%", height: "100%", "--is-radius": "0px", filter: projection }
  }),
  /* before layer (clipped to divider) — mitad «antes», MISMO encuadre */
  React.createElement("div", {
    style: { position: "absolute", inset: 0, clipPath: `inset(0 ${100 - pos}% 0 0)` }
  },
  useImg ?
  React.createElement("img", {
    src: beforeSrc, alt: "", draggable: false,
    style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: bPos, userSelect: "none", WebkitUserDrag: "none" }
  }) :
  React.createElement("image-slot", {
    id: beforeImgId, src: beforeSrc,
    placeholder: "Foto «antes»",
    style: { position: "absolute", inset: 0, width: "100%", height: "100%", "--is-radius": "0px" }
  })
  ),
  /* corner labels */
  React.createElement("span", { className: "mono", style: { position: "absolute", top: 16, left: 16, color: "rgba(255,255,255,0.92)", letterSpacing: "0.22em", fontSize: compact ? 9 : 11, mixBlendMode: "difference", pointerEvents: "none" } }, labelA),
  React.createElement("span", { className: "mono", style: { position: "absolute", top: 16, right: 16, color: "rgba(255,255,255,0.92)", letterSpacing: "0.22em", fontSize: compact ? 9 : 11, mixBlendMode: "difference", pointerEvents: "none" } }, labelB),
  /* seam line + handle */
  React.createElement("div", {
    style: { position: "absolute", top: 0, bottom: 0, left: `${pos}%`, width: 1, background: "rgba(255,255,255,0.9)", transform: "translateX(-0.5px)", pointerEvents: "none", boxShadow: "0 0 0 0.5px rgba(0,0,0,0.06)" }
  }),
  React.createElement("div", {
    style: {
      position: "absolute", top: "50%", left: `${pos}%`,
      transform: "translate(-50%,-50%)",
      width: 38, height: 38, borderRadius: "50%",
      background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.9)",
      backdropFilter: "blur(4px)", display: "grid", placeItems: "center",
      pointerEvents: "none", color: "#fff"
    }
  },
  React.createElement("span", { className: "mono", style: { fontSize: 12, letterSpacing: "0.05em", color: "#fff" } }, "‹›")
  )
  );
}

/* ============================================================
   Scientific viz (thin-line, mono labels) — Qoves analysis aesthetic
   ============================================================ */

/* Bell-curve percentile card */
function BellCurve({ label = "DENSIDAD", caption = "Estás en el percentil 40", mark = 0.46 }) {
  const W = 260,H = 120;
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const x = i / 60;
    const y = Math.exp(-Math.pow((x - 0.5) * 5, 2) / 2);
    pts.push([20 + x * (W - 40), H - 30 - y * (H - 50)]);
  }
  const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const mx = 20 + mark * (W - 40);
  return React.createElement("div", { className: "card", style: { padding: 16, background: "var(--bg-soft)" } },
  React.createElement(Mono, { style: { fontSize: 9 } }, label),
  React.createElement("svg", { width: "100%", viewBox: `0 0 ${W} ${H}`, style: { display: "block", marginTop: 8 } },
  React.createElement("path", { d: path, fill: "none", stroke: "var(--ink-3)", strokeWidth: 1 }),
  React.createElement("line", { x1: 20, y1: H - 30, x2: W - 20, y2: H - 30, stroke: "var(--line)", strokeWidth: 1 }),
  React.createElement("line", { x1: mx, y1: 12, x2: mx, y2: H - 30, stroke: "var(--ink)", strokeWidth: 1, strokeDasharray: "2 3" }),
  React.createElement("circle", { cx: mx, cy: 16, r: 3, fill: "var(--ink)" })
  ),
  React.createElement("div", { style: { fontSize: 12.5, color: "var(--ink-2)", marginTop: 2, padding: "8px 0 2px" } }, caption)
  );
}

/* Horizontal percentage meter */
function Meter({ label = "SIMETRÍA", value = 56, hint = "Top 20%" }) {
  return React.createElement("div", { className: "card", style: { padding: 16, background: "var(--bg-soft)" } },
  React.createElement(Mono, { style: { fontSize: 9 } }, label),
  React.createElement("div", { style: { fontSize: 34, fontWeight: 600, letterSpacing: "-0.03em", marginTop: 6, lineHeight: 1 } }, value + "%"),
  React.createElement("div", { style: { position: "relative", height: 4, background: "var(--line)", borderRadius: 99, marginTop: 14 } },
  React.createElement("div", { style: { position: "absolute", left: 0, top: 0, bottom: 0, width: value + "%", background: "var(--ink)", borderRadius: 99 } })
  ),
  React.createElement(Mono, { style: { fontSize: 9, marginTop: 8, display: "block" } }, hint)
  );
}

/* Measurement rows (facial-thirds style, here: dental proportions) */
function MeasureRows({ title = "PROPORCIONES", rows }) {
  return React.createElement("div", { className: "card", style: { padding: 16, background: "var(--bg-soft)" } },
  React.createElement(Mono, { style: { fontSize: 9 } }, title),
  React.createElement("div", { style: { marginTop: 12, display: "flex", flexDirection: "column", gap: 12 } },
  rows.map((r, i) =>
  React.createElement("div", { key: i },
  React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 } },
  React.createElement("span", { style: { fontSize: 12.5, color: "var(--ink-2)" } }, r.name),
  React.createElement(Mono, { style: { fontSize: 11, color: "var(--ink)" } }, r.val)
  ),
  React.createElement("div", { style: { position: "relative", height: 1, background: "var(--line)" } },
  React.createElement("div", { style: { position: "absolute", left: (r.lo || 20) + "%", right: 100 - (r.hi || 80) + "%", top: -0.5, height: 2, background: "var(--ink-3)" } }),
  React.createElement("div", { style: { position: "absolute", left: r.at + "%", top: -2.5, width: 5, height: 5, borderRadius: 99, background: "var(--ink)", transform: "translateX(-50%)" } })
  )
  )
  )
  )
  );
}

/* ============================================================
   Escala VITA — tono actual vs ideal (animado) · Qoves claro
   ============================================================ */
const VITA_SHADES = [
{ id: "B1", hex: "#ECE9DD" }, { id: "A1", hex: "#E8E2D0" }, { id: "B2", hex: "#E5DCC4" },
{ id: "D2", hex: "#E0D6BC" }, { id: "A2", hex: "#DDD0B4" }, { id: "C1", hex: "#D6C9AC" },
{ id: "C2", hex: "#CDBE9E" }, { id: "D4", hex: "#C8B894" }, { id: "A3", hex: "#C4B189" },
{ id: "D3", hex: "#BCA87E" }, { id: "B3", hex: "#B49E72" }, { id: "A3.5", hex: "#AB9266" },
{ id: "B4", hex: "#A2865A" }, { id: "C3", hex: "#977A4F" }, { id: "A4", hex: "#8C6E45" },
{ id: "C4", hex: "#7E5F3A" }];


function VitaScale({ label = "TONO VITA", actual = "A3.5", ideal = "A1" }) {
  const [mounted, setMounted] = useState(false);
  const [hover, setHover] = useState(false);
  const [w, setW] = useState(0);
  const [h, setH] = useState(0);
  const trackRef = useRef(null);
  const idxActual = VITA_SHADES.findIndex((t) => t.id === actual);
  const idxIdeal = VITA_SHADES.findIndex((t) => t.id === ideal);
  const n = VITA_SHADES.length;

  useEffect(() => {
    const measure = () => {if (trackRef.current) { setW(trackRef.current.clientWidth); setH(trackRef.current.clientHeight); }};
    measure();
    const t = setTimeout(() => setMounted(true), 280);
    window.addEventListener("resize", measure);
    return () => {clearTimeout(t);window.removeEventListener("resize", measure);};
  }, []);

  const yOf = (idx) => (idx + 0.5) / n * h;
  const parkY = h / 2;
  const yActual = hover ? yOf(idxActual) : parkY;
  const yIdeal = hover ? yOf(idxIdeal) : parkY;
  const pasos = idxActual - idxIdeal;
  const resumen = pasos === 0 ?
  <>El tono <b>{actual}</b> ya coincide con el ideal.</> :
  pasos > 0 ?
  <>Tono actual <b>{actual}</b> · ideal <b>{ideal}</b>: <b>{pasos}</b> tono(s) hacia un blanco más natural.</> :
  <>Tono actual <b>{actual}</b>, más claro que el ideal <b>{ideal}</b>.</>;

  return (
    <div className="card vita-card" style={{ padding: 16, background: "var(--bg-soft)" }}>
      <Mono style={{ fontSize: 9 }}>{label}</Mono>
      <div className={"vita-scale vita-vertical" + (hover ? " is-active" : "")} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        <div className="vita-track" ref={trackRef}>
          {VITA_SHADES.map((t, i) => {
            const diff = i - idxIdeal;
            const rel = diff === 0 ? "Tono ideal" : diff < 0 ? `${Math.abs(diff)} paso(s) más claro` : `${diff} paso(s) más oscuro`;
            return (
              <div key={t.id} className="vita-cell" style={{ background: t.hex }}>
                <span className="vita-id">{t.id}</span>
              </div>);

          })}
        </div>
        <div className="vita-marker vita-actual" style={{ transform: `translateY(${mounted ? yActual : 0}px)` }}>
          <span className="vita-stem"></span><span className="vita-lbl">Actual</span>
        </div>
        <div className="vita-marker vita-ideal" style={{ transform: `translateY(${mounted ? yIdeal : 0}px)` }}>
          <span className="vita-stem"></span><span className="vita-lbl">Ideal</span>
        </div>
      </div>
      <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.45, marginTop: 4 }}>{resumen}</div>
    </div>);

}

/* ============================================================
   Proporciones dentales — sector anterior (animado) · Qoves claro
   Ejes axiales que se inclinan + ancho/largo + progresión áurea
   ============================================================ */
const TOOTH = {
  central: { width: 8.6, length: 10.8, axial: 4 },
  lateral: { width: 6.6, length: 9.4, axial: 6 },
  canino: { width: 7.6, length: 10.0, axial: 8 }
};
const IDEAL_RATIO = [75, 80];
const IDEAL_GOLDEN = 62;

function DentalProportions({ title = "PROPORCIONES" }) {
  const [mounted, setMounted] = useState(false);
  const [hover, setHover] = useState(false);
  const [show, setShow] = useState({ axis: true, golden: true, ratio: true });
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 320);
    return () => clearTimeout(t);
  }, []);

  const MID = 160,BASE_Y = 118,PXmm = 4.6;
  const layout = [];
  [-1, 1].forEach((side) => {
    let cursor = MID;
    ["central", "lateral", "canino"].forEach((key) => {
      const w = TOOTH[key].width * PXmm,h = TOOTH[key].length * PXmm;
      const x = side < 0 ? cursor - w : cursor;
      layout.push({ key, side, x, w, h });
      cursor += side * w;
    });
  });

  const ratioOf = (k) => Math.round(TOOTH[k].width / TOOTH[k].length * 100);
  const goldenPct = (a, b) => Math.round(TOOTH[a].width / TOOTH[b].width * 100);
  const gLatCen = goldenPct("lateral", "central");
  const gCanLat = goldenPct("canino", "lateral");
  const okRatio = (r) => r >= IDEAL_RATIO[0] && r <= IDEAL_RATIO[1];
  const OK = "#2f9e6e",WARN = "#b8893f",AXIS = "var(--ink-3)",GOLD = "#7d88a8";

  const toggle = (k) => setShow((s) => ({ ...s, [k]: !s[k] }));
  const label = { central: "C", lateral: "L", canino: "K" };

  return (
    <div className="card" style={{ padding: 16, background: "var(--bg-soft)" }}>
      <Mono style={{ fontSize: 9 }}>{title}</Mono>
      <svg className="dental-svg" viewBox="0 0 320 170" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ width: "100%", height: "auto", display: "block", overflow: "visible", marginTop: 10 }} data-comment-anchor="eb26b98f09-svg-299-7">
        {/* dientes */}
        {layout.map((d, i) => {
          const top = BASE_Y - d.h,cx = d.x + d.w / 2;
          return (
            <g key={i}>
              <rect className="tooth" x={d.x} y={top} width={d.w} height={d.h} rx={d.w * 0.3}>
                <title>{`${d.key} · ${TOOTH[d.key].width}×${TOOTH[d.key].length} mm · ancho/largo ${ratioOf(d.key)}%`}</title>
              </rect>
              <text x={cx} y={BASE_Y + 13} className="dental-lbl">{label[d.key]}</text>
            </g>);

        })}
        {/* ejes axiales (se inclinan al montar) */}
        {show.axis && layout.map((d, i) => {
          const top = BASE_Y - d.h,cx = d.x + d.w / 2;
          const ang = -d.side * TOOTH[d.key].axial;
          return (
            <line key={"ax" + i} className="dental-axis" x1={cx} y1={top - 6} x2={cx} y2={BASE_Y + 6}
            style={{ transformBox: "fill-box", transformOrigin: "bottom center", transform: `rotate(${hover ? ang : 0}deg)` }} />);

        })}
        {/* ancho/largo en centrales */}
        {show.ratio && layout.filter((d) => d.key === "central").map((d, i) => {
          const top = BASE_Y - d.h,cx = d.x + d.w / 2,r = ratioOf("central");
          return (
            <g key={"rt" + i} style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.4s ease 0.3s" }}>
              <rect x={d.x} y={top} width={d.w} height={d.h} fill="none" stroke={okRatio(r) ? OK : WARN} strokeWidth="1" strokeDasharray="2 2" />
              <text x={cx} y={top - 4} className="dental-val" fill={okRatio(r) ? OK : WARN}>{r}%</text>
            </g>);

        })}
        {/* progresión áurea */}
        {show.golden &&
        <g style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.4s ease 0.5s" }}>
            <text x={layout[4].x + layout[4].w / 2} y={22} className="dental-gold" fill={GOLD}>{gLatCen}%</text>
            <text x={layout[5].x + layout[5].w / 2} y={22} className="dental-gold" fill={GOLD}>{gCanLat}%</text>
          </g>
        }
      </svg>
      <div className="dental-legend">
        <button className={"dental-chip" + (show.axis ? " on" : "")} onClick={() => toggle("axis")}><span style={{ background: "var(--ink-3)" }}></span>Eje axial</button>
        <button className={"dental-chip" + (show.golden ? " on" : "")} onClick={() => toggle("golden")}><span style={{ background: GOLD }}></span>Áurea</button>
        <button className={"dental-chip" + (show.ratio ? " on" : "")} onClick={() => toggle("ratio")}><span style={{ background: OK }}></span>Ancho/largo</button>
      </div>
    </div>);

}

/* ============================================================
   Inventario de la dentadura existente · animado al hover · Qoves
   Presentes / rotos / ausentes + huecos edéntulos como objetivo
   ============================================================ */
const INV_TEETH = ["p", "p", "p", "b", "m", "p", "p", "m", "p", "p"];

function Inventario({ title = "INVENTARIO" }) {
  const [hover, setHover] = useState(false);
  const PRES = "#7faf93", BROK = "#c0625e", MISS = "#b8893f";
  const nP = INV_TEETH.filter(s => s === "p").length;
  const nB = INV_TEETH.filter(s => s === "b").length;
  const nM = INV_TEETH.filter(s => s === "m").length;

  return (
    <div className="card" style={{ padding: 16, background: "var(--bg-soft)" }}>
      <Mono style={{ fontSize: 9 }}>{title}</Mono>
      <svg className="inv-svg" viewBox="0 0 320 150"
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{ width: "100%", height: "auto", display: "block", overflow: "visible", marginTop: 12 }}>
        {INV_TEETH.map((s, i) => {
          const w = 22, gap = 4, h = (i === 4 || i === 5) ? 40 : (i === 3 || i === 6) ? 32 : 36;
          const x = 32 + i * (w + gap), baseY = 104, top = baseY - h, cx = x + w / 2, cy = top + h / 2;
          const wrap = {
            opacity: hover ? 1 : 0.5,
            transform: hover ? "translateY(0)" : "translateY(8px)",
            transition: `opacity .45s cubic-bezier(.2,.8,.2,1) ${0.04 * i}s, transform .45s cubic-bezier(.2,.8,.2,1) ${0.04 * i}s`
          };
          if (s === "m") return (
            <g key={i} style={wrap}>
              <rect className="inv-missing" x={x} y={top} width={w} height={h} rx="6" />
              {hover && <circle className="inv-pulse" cx={cx} cy={cy} r="11" />}
              <circle cx={cx} cy={cy} r="3.5" fill={MISS} opacity={hover ? 1 : 0} style={{ transition: "opacity .4s ease .3s" }} />
            </g>
          );
          if (s === "b") return (
            <g key={i} style={wrap}>
              <rect className="inv-broken" x={x} y={top} width={w} height={h} rx="6" />
              <line x1={cx - 1} y1={top + 4} x2={cx + 3} y2={top + h - 5} stroke={BROK} strokeWidth="1.6" strokeLinecap="round" />
            </g>
          );
          return (
            <g key={i} style={wrap}>
              <rect className="inv-present" x={x} y={top} width={w} height={h} rx="6" />
            </g>
          );
        })}
        {/* etiqueta huecos = objetivo */}
        <text x="160" y="130" className="inv-target" textAnchor="middle" opacity={hover ? 1 : 0} style={{ transition: "opacity .4s ease .45s" }}>
          ◇ HUECOS = OBJETIVO DE GENERACIÓN
        </text>
      </svg>
      <div className="inv-legend">
        <span className="inv-chip"><span style={{ background: PRES }}></span>{nP} presentes</span>
        <span className="inv-chip"><span style={{ background: BROK }}></span>{nB} roto</span>
        <span className="inv-chip"><span style={{ background: MISS }}></span>{nM} ausentes</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.45, marginTop: 8 }}>
        Se preserva la estructura sana: <b>integración</b>, no sustitución total.
      </div>
    </div>
  );
}

/* ============================================================
   Macroestética — línea media facial + plano incisal (canting)
   + conectores 50·40·30 · animado al hover · Qoves claro
   ============================================================ */
function Macroestetica({ title = "MACROESTÉTICA" }) {
  const [hover, setHover] = useState(false);
  const OK = "#2f9e6e", WARN = "#c0625e", INK = "var(--ink)", MUT = "var(--ink-3)";
  const BASE = 120;
  const teeth = [
    { x: 160, w: 24, h: 36 }, { x: 136, w: 24, h: 36 },   // centrales
    { x: 184, w: 18, h: 30 }, { x: 118, w: 18, h: 30 },   // laterales
    { x: 202, w: 20, h: 32 }, { x: 98, w: 20, h: 32 }      // caninos
  ];
  const conns = [
    { x: 160, pct: "50", c: OK }, { x: 136, pct: "40", c: "#7d88a8" }, { x: 184, pct: "40", c: "#7d88a8" },
    { x: 118, pct: "30", c: WARN }, { x: 202, pct: "30", c: WARN }
  ];

  return (
    <div className="card" style={{ padding: 16, background: "var(--bg-soft)" }}>
      <Mono style={{ fontSize: 9 }}>{title}</Mono>
      <svg className="macro-svg" viewBox="0 0 320 160"
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{ width: "100%", height: "auto", display: "block", overflow: "visible", marginTop: 12 }}>

        {/* referencia interpupilar */}
        <g style={{ opacity: hover ? 1 : 0.35, transition: "opacity 0.4s ease" }}>
          <line x1="78" y1="26" x2="242" y2="26" stroke={MUT} strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="120" cy="26" r="3" fill={INK} />
          <circle cx="200" cy="26" r="3" fill={INK} />
          <text x="160" y="16" className="macro-lbl" textAnchor="middle">INTERPUPILAR</text>
        </g>

        {/* línea media facial (se dibuja al hover) */}
        <line x1="160" y1="20" x2="160" y2="142" stroke={INK} strokeWidth="1.2"
          strokeDasharray="122" strokeDashoffset={hover ? 0 : 122}
          style={{ transition: "stroke-dashoffset 0.9s ease" }} />

        {/* dientes */}
        {teeth.map((t, i) => <rect key={i} className="macro-tooth" x={t.x} y={BASE - t.h} width={t.w} height={t.h} rx={t.w * 0.3} />)}

        {/* conectores 50·40·30 */}
        {conns.map((c, i) =>
          <text key={"c" + i} x={c.x} y={BASE - 42} className="macro-conn" textAnchor="middle" fill={c.c}
            style={{ opacity: hover ? 1 : 0, transition: `opacity 0.4s ease ${0.2 + i * 0.06}s` }}>{c.pct}</text>
        )}

        {/* plano incisal: cantado en reposo, se nivela al hover */}
        <g style={{ transformBox: "view-box", transformOrigin: "160px 128px", transform: hover ? "rotate(0deg)" : "rotate(-7deg)", transition: "transform 0.9s cubic-bezier(.22,1,.36,1) 0.2s" }}>
          <line x1="92" y1="128" x2="228" y2="128" stroke={hover ? OK : WARN} strokeWidth="1.8" style={{ transition: "stroke 0.5s ease" }} />
          <text x="160" y="142" className="macro-lbl" textAnchor="middle" fill={hover ? OK : WARN} style={{ transition: "fill 0.5s ease" }}>
            {hover ? "PLANO NIVELADO" : "CANTING −7°"}
          </text>
        </g>

        {/* check línea media */}
        <text x="160" y="156" className="macro-lbl" textAnchor="middle" fill={OK}
          style={{ opacity: hover ? 1 : 0, transition: "opacity 0.4s ease 0.5s" }}>✓ LÍNEA MEDIA · 0.8 mm</text>
      </svg>
      <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.45, marginTop: 8 }}>
        Línea media dental paralela a la facial (<b>≤2 mm</b>), plano incisal nivelado y conectores <b>50·40·30</b>.
      </div>
    </div>
  );
}

/* ============================================================
   Arco de sonrisa y consonancia · animación en bucle · Qoves
   Curva incisal convexa ∥ labio inferior · troneras · corredor bucal
   ============================================================ */
function ArcoSonrisa({ title = "ARCO DE SONRISA" }) {
  const GOLD = "#c8a86b", GOLDS = "#e6d3a3", INK = "var(--ink)";
  // dientes simétricos; borde incisal sigue arco convexo (más bajo al centro)
  const defs = [
    { cx: 148, w: 22, h: 34 }, { cx: 172, w: 22, h: 34 },   // centrales
    { cx: 124, w: 20, h: 30 }, { cx: 196, w: 20, h: 30 },   // laterales
    { cx: 103, w: 19, h: 28 }, { cx: 217, w: 19, h: 28 },   // caninos
    { cx: 85, w: 17, h: 24 }, { cx: 235, w: 17, h: 24 }      // premolares
  ];
  const byOf = (cx) => 112 - Math.pow(Math.abs(cx - 160) / 78, 2) * 20; // borde incisal
  const embra = [160, 136, 184, 113.5, 206.5, 94, 226]; // troneras centro→lados

  return (
    <div className="card arco-card" style={{ padding: 16, background: "var(--bg-soft)" }}>
      <Mono style={{ fontSize: 9 }}>{title}</Mono>
      <svg className="arco-svg" viewBox="0 0 320 170" style={{ width: "100%", height: "auto", display: "block", overflow: "visible", marginTop: 12 }}>
        <defs>
          <linearGradient id="arcoGold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={GOLD} stopOpacity="0.2" />
            <stop offset="0.5" stopColor={GOLDS} />
            <stop offset="1" stopColor={GOLD} stopOpacity="0.2" />
          </linearGradient>
          <radialGradient id="arcoGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={GOLDS} stopOpacity="0.9" />
            <stop offset="1" stopColor={GOLDS} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* corredor bucal: sombras laterales */}
        <rect className="arco-corridor arco-corridor-l" x="40" y="60" width="46" height="70" rx="20" fill="var(--ink)" />
        <rect className="arco-corridor arco-corridor-r" x="234" y="60" width="46" height="70" rx="20" fill="var(--ink)" />

        {/* dientes */}
        {defs.map((t, i) => {
          const by = byOf(t.cx);
          return <rect key={i} className="arco-tooth" x={t.cx - t.w / 2} y={by - t.h} width={t.w} height={t.h} rx={t.w * 0.28} fill="#fbfaf6" stroke="rgba(28,30,29,0.10)" strokeWidth="0.8" />;
        })}

        {/* troneras que se encienden centro→lados */}
        {embra.map((x, i) => (
          <circle key={"e" + i} className="arco-embra" cx={x} cy={byOf(x) - 6} r="4" fill="url(#arcoGlow)"
            style={{ animationDelay: (3.6 + i * 0.28) + "s" }} />
        ))}

        {/* arco incisal dorado (se traza) */}
        <path className="arco-line" pathLength="1" d="M85,100 Q160,132 235,100" fill="none" stroke="url(#arcoGold)" strokeWidth="2.4" strokeLinecap="round" />
        {/* arco espejo sobre labio inferior */}
        <path className="arco-line arco-line-mirror" pathLength="1" d="M80,128 Q160,164 240,128" fill="none" stroke="url(#arcoGold)" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 4" />

        <text x="160" y="18" className="arco-lbl" textAnchor="middle">CONSONANCIA ∥ LABIO INFERIOR</text>
      </svg>
      <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5, marginTop: 10 }}>
        Curva incisal convexa y paralela al labio inferior, troneras progresivas y corredor bucal equilibrado.
      </div>
    </div>
  );
}

export { ArcoSonrisa };

/* ============================================================
   Arquitectura gingival (estética rosa) · animado al hover · Qoves
   Zenith, niveles de margen, exposición ≤3 mm, papila / tronera
   ============================================================ */
function ArqGingival({ title = "ARQUITECTURA GINGIVAL" }) {
  const [hover, setHover] = useState(false);
  const GUM = "#d98a96", GUMD = "#b9606e", OK = "#2f9e6e";
  const teeth = [{ x: 96, w: 42 }, { x: 142, w: 42 }, { x: 188, w: 42 }];
  const zeniths = [117, 163, 209];

  return (
    <div className="card" style={{ padding: 16, background: "var(--bg-soft)" }}>
      <Mono style={{ fontSize: 9 }}>{title}</Mono>
      <svg className="gum-svg" viewBox="0 0 320 150"
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{ width: "100%", height: "auto", display: "block", overflow: "visible", marginTop: 12 }}>

        {/* dientes */}
        {teeth.map((t, i) => <rect key={i} className="gum-tooth" x={t.x} y="60" width={t.w} height="74" rx="7" />)}

        {/* triángulo negro (tronera sin papila) entre central-lateral */}
        <path className="gum-blacktri" d="M131,72 L147,72 L139,96 Z" fill="#1c1e1d"
          style={{ opacity: hover ? 0 : 1, transition: "opacity 0.5s ease 0.7s" }} />

        {/* banda gingival con margen festoneado (asciende al hover) */}
        <g style={{ transformBox: "view-box", transformOrigin: "160px 36px", transform: hover ? "translateY(0px)" : "translateY(13px)", transition: "transform 1s cubic-bezier(.3,.9,.3,1)" }}>
          <path d="M86,30 L234,30 L234,70 Q224,72 209,58 Q197,77 185,78 Q174,60 163,58 Q151,77 139,78 Q128,60 117,58 Q104,72 86,70 Z"
            fill={GUM} stroke={GUMD} strokeWidth="1.2" opacity="0.92" />
          {/* papila que rellena la tronera */}
          <path className="gum-papilla" d="M131,70 L147,70 L139,94 Z" fill={GUM} stroke={GUMD} strokeWidth="0.8"
            style={{ transformBox: "fill-box", transformOrigin: "top", transform: hover ? "scaleY(1)" : "scaleY(0)", transition: "transform 0.8s cubic-bezier(.3,.9,.3,1) 0.4s" }} />
          {/* punteado (encía punteada) */}
          <g fill={GUMD} style={{ opacity: hover ? 0.55 : 0, transition: "opacity 0.5s ease 0.9s" }}>
            <circle cx="108" cy="44" r="1.2" /><circle cx="124" cy="46" r="1.2" /><circle cx="154" cy="44" r="1.2" />
            <circle cx="172" cy="46" r="1.2" /><circle cx="200" cy="44" r="1.2" /><circle cx="160" cy="40" r="1.2" />
          </g>
        </g>

        {/* puntos zenith */}
        {zeniths.map((zx, i) =>
          <g key={"z" + i} style={{ opacity: hover ? 1 : 0, transform: hover ? "scale(1)" : "scale(0)", transformBox: "fill-box", transformOrigin: "center", transition: `opacity .4s ease ${0.5 + i * 0.12}s, transform .5s cubic-bezier(.2,1.4,.4,1) ${0.5 + i * 0.12}s` }}>
            <circle cx={zx} cy={71 - 13} r="3" fill={OK} />
          </g>
        )}
        <text x="209" y="42" className="gum-lbl" fill={OK} style={{ opacity: hover ? 1 : 0, transition: "opacity .4s ease .9s" }}>zenith</text>

        {/* exposición ≤3 mm */}
        <g style={{ opacity: hover ? 1 : 0, transition: "opacity 0.4s ease 0.6s" }}>
          <line x1="250" y1="30" x2="250" y2="58" stroke={OK} strokeWidth="1" />
          <line x1="246" y1="30" x2="254" y2="30" stroke={OK} strokeWidth="1" />
          <line x1="246" y1="58" x2="254" y2="58" stroke={OK} strokeWidth="1" />
          <text x="258" y="47" className="gum-lbl" fill={OK}>≤3mm</text>
        </g>
      </svg>
      <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.45, marginTop: 8 }}>
        Zenith y márgenes armónicos, exposición <b>≤3 mm</b> (sin sonrisa gingival) y papilas que sellan las troneras.
      </div>
    </div>
  );
}

/* ============================================================
   Tono VITA — banda destacada con render real + barrido "scan"
   ============================================================ */
function useInview(threshold = 0.3) {
  const ref = useRef(null);
  const [inview, setInview] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) { setInview(true); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { setInview(true); io.disconnect(); } });
    }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inview];
}

/* ============================================================
   Explorador de análisis — 6 parámetros clínicos en un solo módulo
   Lista (acordeón) + visor cuadrado; avanza solo cada 6s mientras
   la sección está en pantalla, se pausa al pasar el mouse.
   ============================================================ */
const ANALYSIS_PARAMS = [
  {
    name: "Tono VITA", tag: "ESCALA CLÍNICA",
    title: "El color exacto de una sonrisa real",
    copy: <>Medimos el tono base sobre la escala VITA y fijamos el objetivo, aquí <b>B1</b>, para lograr un blanco natural, nunca artificial. El resultado parte del <b>color real de sus dientes</b>, no de un blanco genérico.</>,
    img: RES.r0_vita_shade_jpg, alt: "Escala de color dental VITA con la referencia B1 seleccionada", zoom: 1.2, origin: "50% 34%"
  },
  {
    name: "Inventario dental", tag: "NOTACIÓN FDI",
    title: "Cada pieza, identificada",
    copy: <>Antes de simular, la IA reconoce y numera cada diente con la notación FDI internacional: qué pieza es cuál, cuáles faltan y cuáles entran en el tratamiento, para que la propuesta encaje con <b>la anatomía real del paciente.</b></>,
    img: RES.r1_inventario_jpg, alt: "Arcada dental completa con cada pieza numerada según la notación FDI", zoom: 1.3, origin: "50% 50%"
  },
  {
    name: "Macroestética", tag: "ARMONÍA FACIAL",
    title: "La sonrisa dentro del rostro",
    copy: <>La sonrisa no se diseña aislada. Cruzamos línea media, plano incisal y el equilibrio del tercio inferior con los ejes del rostro, para que el resultado <b>se integre con la cara</b>, no solo con los dientes.</>,
    img: RES.r2_macroestetica_jpg, alt: "Rostro con líneas de construcción de armonía facial", zoom: 1, origin: "50% 50%"
  },
  {
    name: "Proporciones", tag: "PROPORCIÓN ÁUREA",
    title: "Cada diente en su medida",
    copy: <>Anchos y alturas de las piezas anteriores se calculan según la proporción áurea. Así cada diente guarda la relación exacta con el de al lado y con el conjunto, <b>la base de una sonrisa que se percibe natural.</b></>,
    img: RES.r3_proporciones_jpg, alt: "Rostro con trazos de proporción sobre labios y sonrisa", zoom: 1, origin: "50% 50%"
  },
  {
    name: "Arco de sonrisa", tag: "DETALLE NATURAL",
    title: "La curva que vuelve natural una sonrisa",
    copy: <>El borde de los dientes superiores debe seguir la curva del labio inferior al sonreír. Ese arco, ni recto ni invertido, es <b>el detalle que distingue una sonrisa diseñada de una artificial.</b></>,
    img: RES.r4_arco_sonrisa_jpg, alt: "Sonrisa con la curva del arco marcada sobre el borde de los dientes superiores", zoom: 1, origin: "50% 50%"
  },
  {
    name: "Arquitectura gingival", tag: "CONTORNO",
    title: "La encía también dibuja la sonrisa",
    copy: <>El festón de la encía, sus picos y valles sobre cada diente, define cuánto se ve de cada pieza. Un contorno gingival simétrico y a la altura correcta es lo que hace que <b>los dientes se perciban proporcionados.</b></>,
    img: RES.r5_gingival_jpg, alt: "Encía superior con el contorno gingival festoneado marcado sobre cada diente", zoom: 1, origin: "50% 50%"
  }
];

function AnalysisExplorer() {
  const [ref, inview] = useInview(0.25);
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(!!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches));
  }, []);
  const total = ANALYSIS_PARAMS.length;
  const next = () => setActive((a) => (a + 1) % total);
  const playing = inview && !hover && !reduced;
  const cur = ANALYSIS_PARAMS[active];
  const pad = (n) => String(n).padStart(2, "0");

  const onKey = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); setActive((a) => (a + 1) % total); }
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); setActive((a) => (a - 1 + total) % total); }
  };

  return (
    <div ref={ref} className={"ax" + (inview ? " in" : "")} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="ax-viewer" aria-live="polite">
        {ANALYSIS_PARAMS.map((p, i) =>
        <img key={i} className={"ax-img" + (i === active ? " on" : "")} src={p.img} alt={i === active ? p.alt : ""}
          aria-hidden={i !== active} style={{ "--zoom": p.zoom, transformOrigin: p.origin }} />
        )}
        <span key={"scan" + active} className="ax-scan" aria-hidden="true" />
        <span className="ax-corner tl" /><span className="ax-corner tr" /><span className="ax-corner bl" /><span className="ax-corner br" />
        <span className="ax-chip mono"><b>{pad(active + 1)}</b> / {pad(total)} · {cur.name.toUpperCase()}</span>
      </div>

      <div className="ax-list" role="tablist" aria-orientation="vertical" onKeyDown={onKey}>
        {ANALYSIS_PARAMS.map((p, i) => {
          const on = i === active;
          return (
            <div key={i} className={"ax-item" + (on ? " on" : "")}>
              <button className="ax-btn" role="tab" aria-selected={on} tabIndex={on ? 0 : -1} onClick={() => setActive(i)}>
                <span className="ax-num mono">{pad(i + 1)}</span>
                <span className="ax-name">{p.name}</span>
                <span className="ax-tag mono">{p.tag}</span>
              </button>
              <div className="ax-detail" role="tabpanel" aria-hidden={!on}>
                <div className="ax-detail-in">
                  <h3 className="ax-title">{p.title}</h3>
                  <p className="ax-copy">{p.copy}</p>
                </div>
              </div>
              {on && !reduced &&
              <span className="ax-bar" aria-hidden="true">
                  <span key={active} className="ax-bar-fill" style={{ animationPlayState: playing ? "running" : "paused" }} onAnimationEnd={next} />
                </span>
              }
            </div>);
        })}
      </div>
    </div>);

}

export { useInview, LogoMark, Mono, MonoPill, BeforeAfter, BellCurve, Meter, MeasureRows, VitaScale, AnalysisExplorer, DentalProportions, Inventario, Macroestetica, ArqGingival };