/* Brandboost badge + popup informativo.
   Uso: <script src="brandboost-badge.js"></script> (se auto-inyecta el badge).
   Al hacer click en el badge se abre un modal con: quiénes somos, soluciones,
   empresas con las que trabajamos, casos de éxito y testimonios.
   Atributos opcionales en <brandboost-badge>:
     position="bottom-right|bottom-left|bottom-center"  (def. bottom-right)
     mark="ruta/mark.png"  (def. media/brandboost-mark.png)
     cta="https://..."     (enlace del botón "Agendar consultoría") */
(function () {
  if (customElements.get("brandboost-badge")) return;
  const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const SOLUTIONS = [
    ["Soluciones digitales a medida", "Desarrollamos aplicaciones web y móviles, plataformas y productos digitales end-to-end para tu empresa."],
    ["Agentes IA", "Asistentes autónomos para atención, soporte y ventas en WhatsApp, web y email."],
    ["Integraciones", "Conexión entre CRM, ERP, SaaS y APIs para unificar datos y procesos."],
    ["Sistemas inteligentes", "Plataformas internas a medida que automatizan procesos críticos."],
    ["Procesamiento IA", "Agentes que interpretan datos, detectan patrones y ejecutan flujos."],
    ["Automatización", "Flujos que eliminan tareas manuales y escalan operaciones con precisión."],
    ["Consultoría", "Asesoría estratégica en IA para la transformación organizacional."]
  ];
  const CLIENTS = ["MI HOGAR", "HOSPITAL SAN JOSÉ", "INNOVACIRCO", "TEMPLO DEL MASAJE"];
  const CASES = [
    ["+38%", "RE/MAX", "Real Estate", "Simulación y captación de leads inmobiliarios con seguimiento automatizado.", "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=600"],
    ["+60%", "Mi Hogar", "Real Estate", "Redujo un 60% las tareas administrativas con procesos optimizados con IA.", "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=600"],
    ["+40%", "Hospital San José", "Healthcare", "Transcripción médica automática: consultas documentadas en segundos.", "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=600"],
    ["+10%", "Innovacirco", "B2B", "Aumento de cierres con un agente IA entrenado sobre el CRM.", "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=600"]
  ];
  const TESTIMONIALS = [
    ["Los leads llegan calificados y con contexto. Nuestros agentes cierran más y en menos visitas.", "Dirección Comercial", "RE/MAX"],
    ["Automatizamos lo que nos frenaba. El equipo ahora dedica el tiempo a lo que importa.", "Dirección de Operaciones", "Mi Hogar"],
    ["Pasamos de responder en horas a responder en minutos, sin sumar personal.", "Coordinación", "Templo del Masaje"]
  ];

  class BrandboostBadge extends HTMLElement {
    connectedCallback() {
      const pos = this.getAttribute("position") || "bottom-right";
      const mark = this.getAttribute("mark") || (window.__resources&&window.__resources.r25_brandboost_mark_png||"media/brandboost-mark.png");
      const cta = this.getAttribute("cta") || "";
      const anchor = { "bottom-right": "right:20px;", "bottom-left": "left:20px;", "bottom-center": "left:50%;transform:translateX(-50%);" }[pos] || "right:20px;";
      const tx = pos === "bottom-center" ? "translateX(-50%)" : "";
      const root = this.attachShadow({ mode: "open" });
      root.innerHTML = `
        <style>
          :host{all:initial}
          *{box-sizing:border-box}
          .bb{position:fixed;bottom:20px;${anchor}z-index:2147483000;
            display:inline-flex;align-items:center;gap:11px;padding:9px 16px 9px 10px;border-radius:999px;
            background:rgba(10,11,12,0.86);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);
            border:1px solid rgba(255,255,255,0.14);
            box-shadow:0 10px 34px -12px rgba(0,0,0,0.55),inset 0 1px 0 rgba(255,255,255,0.06);
            font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer;
            opacity:0;transform:translateY(10px) ${tx};
            transition:opacity .6s cubic-bezier(.4,0,.2,1),transform .6s cubic-bezier(.4,0,.2,1),border-color .25s ease,box-shadow .25s ease;}
          .bb.in{opacity:1;transform:translateY(0) ${tx};}
          .bb:hover{border-color:rgba(6,182,212,0.55);box-shadow:0 14px 40px -12px rgba(0,0,0,0.6),0 0 0 3px rgba(6,182,212,0.14);transform:translateY(-2px) ${tx};}
          .mk{width:30px;height:30px;flex:0 0 auto;display:grid;place-items:center;border-radius:50%;
            background:radial-gradient(circle at 50% 38%,#f4f5f6,#c9ccce);box-shadow:inset 0 1px 2px rgba(255,255,255,.8),inset 0 -2px 4px rgba(0,0,0,.12);}
          .mk img{width:22px;height:22px;object-fit:contain;display:block}
          .tx{display:flex;flex-direction:column;line-height:1;gap:3px;padding-right:2px;text-align:left}
          .lb{font-size:8px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:#22d3ee}
          .nm{font-size:13px;font-weight:500;letter-spacing:-0.01em;color:#fff}

          /* overlay + modal */
          .ov{position:fixed;inset:0;z-index:2147483001;display:flex;align-items:center;justify-content:center;padding:24px;
            background:rgba(8,9,10,0.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);
            opacity:0;pointer-events:none;transition:opacity .3s ease;font-family:Inter,-apple-system,sans-serif;}
          .ov.show{opacity:1;pointer-events:auto}
          .md{width:min(720px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:24px;
            box-shadow:0 50px 120px -30px rgba(0,0,0,.6);transform:translateY(14px) scale(.98);transition:transform .35s cubic-bezier(.2,.7,.2,1);
            -ms-overflow-style:none;scrollbar-width:thin;}
          .ov.show .md{transform:translateY(0) scale(1)}
          .md::-webkit-scrollbar{width:8px}.md::-webkit-scrollbar-thumb{background:#e5e7eb;border-radius:8px}
          .hd{position:relative;background:#000;color:#fff;padding:30px 30px 26px;}
          .hd .eye{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#22d3ee;margin-bottom:14px}
          .hd .row{display:flex;align-items:center;gap:13px}
          .hd .mk{width:44px;height:44px}.hd .mk img{width:32px;height:32px}
          .hd h2{margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em}
          .hd .sub{margin:14px 0 0;font-size:14px;font-weight:300;line-height:1.55;color:rgba(255,255,255,.75);max-width:52ch}
          .cls{position:absolute;top:20px;right:20px;width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,.2);
            background:rgba(255,255,255,.06);color:#fff;font-size:16px;line-height:1;display:grid;place-items:center;cursor:pointer;transition:background .2s,border-color .2s}
          .cls:hover{background:rgba(6,182,212,.2);border-color:rgba(6,182,212,.6)}
          .bd{padding:28px 30px 32px}
          .sec{padding-top:26px;margin-top:26px;border-top:1px solid #e5e7eb}
          .sec:first-child{padding-top:0;margin-top:0;border-top:none}
          .slb{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#9ca3af;margin:0 0 16px}
          .sgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
          .scard{background:#f9fafb;border:1px solid #f3f4f6;border-radius:12px;padding:14px 16px}
          .scard h4{margin:0 0 5px;font-size:14px;font-weight:600;color:#111}
          .scard p{margin:0;font-size:12.5px;line-height:1.5;color:#6b7280}
          .clients{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
          .feat{display:flex;align-items:center;gap:12px;background:#000;border-radius:12px;padding:12px 18px;margin-bottom:12px;width:100%}
          .feat .fmark{font-family:Inter,sans-serif;font-weight:700;font-size:20px;letter-spacing:.02em;color:#fff}
          .feat .fmark b{color:#06b6d4}
          .feat .fnote{font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.55);margin-left:auto}
          .chip{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#374151;
            background:#f3f4f6;border:1px solid #e5e7eb;border-radius:999px;padding:8px 14px}
          .cases{display:grid;grid-template-columns:1fr 1fr;gap:12px}
          .ccard{border:1px solid #f0f1f2;border-radius:12px;overflow:hidden;background:#fff}
          .ccard .thumb{position:relative;aspect-ratio:16/9;overflow:hidden;background:#111}
          .ccard .thumb img{width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(1);transition:filter .5s,transform .5s}
          .ccard:hover .thumb img{filter:grayscale(0);transform:scale(1.05)}
          .ccard .thumb .stat{position:absolute;top:10px;left:10px;background:rgba(0,0,0,.6);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);
            color:#22d3ee;padding:4px 9px;border-radius:5px;font-size:13px;font-weight:700;border:1px solid rgba(34,211,238,.3);font-family:ui-monospace,monospace}
          .ccard .cin{padding:14px 16px 16px}
          .ccard .cn{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#111}
          .ccard .cs{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#9ca3af;margin-top:2px}
          .ccard p{margin:9px 0 0;font-size:12.5px;line-height:1.5;color:#6b7280}
          .tcard{border-left:2px solid #06b6d4;padding:4px 0 4px 16px;margin-bottom:16px}
          .tcard:last-child{margin-bottom:0}
          .tcard q{font-size:14px;line-height:1.5;color:#111;font-style:normal}
          .tcard .who{margin-top:8px;font-size:11px;letter-spacing:.06em;color:#6b7280}
          .tcard .who b{color:#111;font-weight:600}
          .foot{display:flex;flex-wrap:wrap;align-items:center;gap:16px;margin-top:28px}
          .btn{background:#000;color:#fff;text-decoration:none;padding:14px 26px;border-radius:999px;font-size:12px;font-weight:700;
            letter-spacing:.08em;text-transform:uppercase;border:none;cursor:pointer;transition:background .25s,transform .2s;font-family:inherit}
          .btn:hover{background:#06b6d4;transform:translateY(-2px)}
          .foot .note{font-size:12px;color:#9ca3af}
          @media (max-width:560px){.bb{bottom:14px}.sgrid,.cases{grid-template-columns:1fr}.hd,.bd{padding-left:22px;padding-right:22px}}
          @media (prefers-reduced-motion:reduce){.bb,.ov,.md{transition:none!important}}
        </style>
        <div class="bb" role="button" tabindex="0" aria-haspopup="dialog" aria-label="Un producto de Brandboost AI — más información">
          <span class="mk"><img src="${mark}" alt="Brandboost AI"></span>
          <span class="tx"><span class="lb">Un producto de</span><span class="nm">Brandboost AI</span></span>
        </div>
        <div class="ov" role="dialog" aria-modal="true" aria-label="Acerca de Brandboost AI">
          <div class="md">
            <div class="hd">
              <button class="cls" aria-label="Cerrar">✕</button>
              <div class="eye">✦ Enterprise AI Agency</div>
              <div class="row">
                <span class="mk"><img src="${mark}" alt="Brandboost AI"></span>
                <h2>Brandboost AI</h2>
              </div>
              <p class="sub">Impulsando tu empresa con IA. Diseñamos agentes, integraciones y sistemas inteligentes para escalar operaciones sin fricción humana. Este producto fue construido por Brandboost.</p>
            </div>
            <div class="bd">
              <div class="sec">
                <p class="slb">Qué hacemos</p>
                <div class="sgrid">${SOLUTIONS.map(s => `<div class="scard"><h4>${s[0]}</h4><p>${s[1]}</p></div>`).join("")}</div>
              </div>
              <div class="sec">
                <p class="slb">Empresas que confían en nosotros</p>
                <div class="clients">
                  <div class="feat"><span class="fmark">RE<b>/</b>MAX</span><span class="fnote">Cliente destacado</span></div>
                  ${CLIENTS.map(c => `<span class="chip">${c}</span>`).join("")}
                </div>
              </div>
              <div class="sec">
                <p class="slb">Casos de éxito</p>
                <div class="cases">${CASES.map(c => `<div class="ccard"><div class="thumb"><img src="${c[4]}" alt="${c[1]}" loading="lazy"><span class="stat">${c[0]}</span></div><div class="cin"><div class="cn">${c[1]}</div><div class="cs">${c[2]}</div><p>${c[3]}</p></div></div>`).join("")}</div>
              </div>
              <div class="sec">
                <p class="slb">Testimonios</p>
                ${TESTIMONIALS.map(t => `<div class="tcard"><q>“${t[0]}”</q><div class="who"><b>${t[1]}</b> · ${t[2]}</div></div>`).join("")}
              </div>
              <div class="foot">
                ${cta ? `<a class="btn" href="${cta}" target="_blank" rel="noopener">Agendar consultoría</a>` : `<button class="btn" type="button">Agendar consultoría</button>`}
                <span class="note">Tu socio en la evolución tecnológica.</span>
              </div>
            </div>
          </div>
        </div>`;

      const badge = root.querySelector(".bb");
      const ov = root.querySelector(".ov");
      const md = root.querySelector(".md");
      if (REDUCED) badge.classList.add("in");
      else requestAnimationFrame(() => setTimeout(() => badge.classList.add("in"), 400));

      const open = () => { ov.classList.add("show"); document.documentElement.style.overflow = "hidden"; };
      const close = () => { ov.classList.remove("show"); document.documentElement.style.overflow = ""; };
      badge.addEventListener("click", open);
      badge.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
      root.querySelector(".cls").addEventListener("click", close);
      ov.addEventListener("click", (e) => { if (!md.contains(e.target)) close(); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ov.classList.contains("show")) close(); });
    }
  }
  customElements.define("brandboost-badge", BrandboostBadge);

  function ensure() {
    if (!document.querySelector("brandboost-badge")) document.body.appendChild(document.createElement("brandboost-badge"));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ensure);
  else ensure();
})();
