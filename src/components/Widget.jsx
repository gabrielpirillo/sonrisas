import React from "react";
import { LogoMark, MonoPill, BeforeAfter } from "./shared";

/* ============================================================
   Widget flow — Smile Fast, Qoves language
   form → processing → result → success
   ============================================================ */
const { useState: useStateW, useEffect: useEffectW, useRef: useRefW } = React;

function Check({ on }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      {on
        ? <path d="M5 12.5l4.5 4.5L19 7" stroke="#1c1e1d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        : <circle cx="12" cy="12" r="8" stroke="var(--line-strong)" strokeWidth="1.5" />}
    </svg>
  );
}

/* ---- Progress header ---- */
function WizardHeader({ step, total, onClose }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 26px", borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <LogoMark size={32} dark={true} />
        <span style={{ fontWeight: 600, letterSpacing: "-0.02em", fontSize: 16, whiteSpace: "nowrap" }}>Smile Fast</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <span className="mono" style={{ fontSize: 11 }}>PASO {String(step).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
        <button onClick={onClose} aria-label="Cerrar" style={{
          width: 38, height: 38, borderRadius: "50%", border: "1px solid var(--line)",
          background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--ink-2)"
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
      </div>
    </div>
  );
}

/* ---- Step 1+2: lead form + upload ---- */
function FormStep({ onSubmit }) {
  const [v, setV] = useStateW({ name: "", email: "", phone: "", age: false, terms: false });
  const [hasPhoto, setHasPhoto] = useStateW(false);
  const set = (k, val) => setV(p => ({ ...p, [k]: val }));
  const formOk = v.name && v.email && v.phone && v.age && v.terms;

  // poll the upload slot for a dropped image
  useEffectW(() => {
    const t = setInterval(() => {
      const slot = document.getElementById("widget-upload");
      const filled = slot && (slot.hasImage || slot.getAttribute("data-filled") === "true" || (slot.shadowRoot && slot.shadowRoot.querySelector("img")));
      setHasPhoto(!!filled);
    }, 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ padding: "clamp(24px,4vw,46px)", maxWidth: 1040, margin: "0 auto" }}>
      <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 44, alignItems: "start" }}>
        {/* Paso 1 */}
        <div>
          <div style={{ display: "inline-flex", background: "var(--ink)", color: "#fff", borderRadius: 99, padding: "5px 13px" }}>
            <span className="mono" style={{ fontSize: 9, color: "#fff", whiteSpace: "nowrap" }}>PASO 1 · TUS DATOS</span>
          </div>
          <h2 className="display" style={{ fontSize: 32, margin: "16px 0 10px" }}>Comienza tu transformación</h2>
          <p className="lead" style={{ fontSize: 15, marginBottom: 26 }}>Usaremos estos datos para enviarte tu simulación de sonrisa.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Labeled label="NOMBRE COMPLETO">
              <input className="field" placeholder="Tu nombre" value={v.name} onChange={e => set("name", e.target.value)} />
            </Labeled>
            <Labeled label="CORREO ELECTRÓNICO">
              <input className="field" type="email" placeholder="tu@email.com" value={v.email} onChange={e => set("email", e.target.value)} />
            </Labeled>
            <Labeled label="WHATSAPP">
              <div style={{ display: "flex", gap: 10 }}>
                <select className="field" style={{ width: 108, padding: "0 14px", appearance: "none" }} defaultValue="+34">
                  <option>+34</option><option>+1</option><option>+52</option><option>+57</option><option>+54</option>
                </select>
                <input className="field" type="tel" placeholder="612 345 678" value={v.phone} onChange={e => set("phone", e.target.value)} style={{ flex: 1 }} />
              </div>
            </Labeled>
            <label style={consentRow} onClick={() => set("age", !v.age)}>
              <Check on={v.age} /><span>Confirmo que soy mayor de edad.</span>
            </label>
            <label style={consentRow} onClick={() => set("terms", !v.terms)}>
              <Check on={v.terms} /><span>Acepto los <u>términos</u> y la <u>política de privacidad</u>.</span>
            </label>
          </div>
        </div>

        {/* Paso 2 */}
        <div style={{ opacity: formOk ? 1 : 0.4, pointerEvents: formOk ? "auto" : "none", transition: "opacity 0.3s" }}>
          <div style={{ display: "inline-flex", background: "var(--bg-soft)", border: "1px solid var(--line)", borderRadius: 99, padding: "5px 13px" }}>
            <span className="mono" style={{ fontSize: 9, whiteSpace: "nowrap" }}>PASO 2 · TU FOTO</span>
          </div>
          <h2 className="display" style={{ fontSize: 32, margin: "16px 0 10px" }}>Sube tu selfie</h2>
          <p className="lead" style={{ fontSize: 15, marginBottom: 26 }}>Arrastra una foto frontal con buena luz, sonriendo de frente.</p>
          <div style={{ borderRadius: 20, overflow: "hidden", background: "linear-gradient(150deg,#c8d0d1,#aeb9bb)", border: "1px dashed var(--line-strong)" }}>
            <image-slot id="widget-upload" placeholder="Arrastra tu selfie aquí"
              style={{ display: "block", width: "100%", height: 300, "--is-radius": "0px" }}></image-slot>
          </div>
          <button className="btn btn-primary" disabled={!hasPhoto}
            style={{ width: "100%", marginTop: 18, opacity: hasPhoto ? 1 : 0.45, cursor: hasPhoto ? "pointer" : "not-allowed" }}
            onClick={onSubmit}>
            Quiero ver mi versión mejorada
          </button>
          <p className="mono" style={{ fontSize: 9, textAlign: "center", marginTop: 14 }}>VALIDACIÓN BIOMÉTRICA · DATOS CIFRADOS</p>
        </div>
      </div>
    </div>
  );
}
const consentRow = { display: "flex", gap: 12, alignItems: "center", fontSize: 14, color: "var(--ink-2)", cursor: "pointer", padding: "4px 0", lineHeight: 1.4 };

function Labeled({ label, children }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 9, marginBottom: 7, paddingLeft: 6 }}>{label}</div>
      {children}
    </div>
  );
}

/* ---- Processing ---- */
const PHRASES = ["Analizando tu morfología dental…", "Calculando proporciones y simetría…", "Diseñando tu sonrisa ideal…", "Renderizando tu simulación…"];
const STAGES = [
  { key: "validating", label: "Validación biométrica" },
  { key: "scanning", label: "Escaneo facial 3D" },
  { key: "analyzing", label: "Análisis morfológico" },
  { key: "designing", label: "Diseño generativo" },
];
function ProcessingStep({ onDone }) {
  const [stage, setStage] = useStateW(0);
  const [phrase, setPhrase] = useStateW(0);
  useEffectW(() => {
    const s = setInterval(() => setStage(x => (x < STAGES.length ? x + 1 : x)), 1300);
    const p = setInterval(() => setPhrase(x => (x + 1) % PHRASES.length), 1700);
    const done = setTimeout(onDone, STAGES.length * 1300 + 700);
    return () => { clearInterval(s); clearInterval(p); clearTimeout(done); };
  }, []);
  return (
    <div style={{ padding: "70px 26px", display: "flex", flexDirection: "column", alignItems: "center", gap: 44, minHeight: 420 }}>
      <h2 className="display" key={phrase} style={{ fontSize: "clamp(24px,3vw,34px)", textAlign: "center", animation: "fadeUp 0.5s var(--ease)" }}>{PHRASES[phrase]}</h2>
      <div style={{ display: "flex", gap: 48, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{ position: "relative", width: 200, height: 264, borderRadius: 22, overflow: "hidden", border: "1px solid var(--line)", background: "var(--photo)" }}>
          <image-slot id="widget-upload" placeholder="Tu selfie" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", "--is-radius": "0px" }}></image-slot>
          <div className="scanline"></div>
        </div>
        <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 4 }}>
          {STAGES.map((s, i) => {
            const done = i < stage, active = i === stage;
            return (
              <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderRadius: 12, background: active ? "var(--bg-soft)" : "transparent", transition: "background 0.3s" }}>
                <Check on={done} />
                <span style={{ fontSize: 15, color: done || active ? "var(--ink)" : "var(--ink-3)", fontWeight: active ? 600 : 450, flex: 1, letterSpacing: "-0.01em" }}>{s.label}</span>
                {active && <span className="spinner"></span>}
                {done && <span className="mono" style={{ fontSize: 9, color: "var(--sage-deep)" }}>OK</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---- Result ---- */
function ResultStep({ onAct }) {
  return (
    <div style={{ padding: "clamp(24px,3.5vw,44px)", maxWidth: 1080, margin: "0 auto" }}>
      <div className="result-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,360px) 1fr", gap: 48, alignItems: "center" }}>
        <div style={{ height: 540 }}>
          <BeforeAfter beforeId="widget-upload" afterId="widget-after" height="100%" radius={26} />
        </div>
        <div>
          <div style={{ marginBottom: 18 }}><MonoPill>RESULTADO · SIMULACIÓN</MonoPill></div>
          <h2 className="display" style={{ fontSize: "clamp(30px,4vw,46px)" }}>
            Tu simulación <span className="dim">ya está lista</span>
          </h2>
          <p className="lead" style={{ fontSize: 17, margin: "18px 0 14px", maxWidth: 420 }}>
            Aquí tienes una primera versión de cómo podría verse tu sonrisa ideal. Desliza para comparar.
          </p>
          <p style={{ fontSize: 13.5, color: "var(--ink-3)", lineHeight: 1.55, maxWidth: 430, marginBottom: 30 }}>
            Para vivir la experiencia completa y verte en <strong style={{ color: "var(--ink-2)" }}>movimiento (vídeo)</strong>, lo realizamos en consulta y confirmamos la viabilidad de tu caso con el equipo de los Dres. Corbella.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 430 }}>
            <button className="btn btn-primary" style={{ width: "100%", padding: "18px 26px" }} onClick={() => onAct("video")}>
              Quiero ver mi vídeo en consulta
            </button>
            <button className="btn btn-ghost" style={{ width: "100%", padding: "16px 26px", background: "#fff" }} onClick={() => onAct("photo")}>
              Quiero recibir mi foto
            </button>
          </div>
          <p className="mono" style={{ fontSize: 9, marginTop: 22 }}>SIMULACIÓN ORIENTATIVA · EL RESULTADO DEPENDE DE TU CASO CLÍNICO</p>
        </div>
      </div>
    </div>
  );
}

/* ---- Success ---- */
function SuccessStep({ kind, onClose }) {
  const isVideo = kind === "video";
  return (
    <div style={{ padding: "90px 26px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minHeight: 420 }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--ink)", display: "grid", placeItems: "center", marginBottom: 28 }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <h2 className="display" style={{ fontSize: "clamp(30px,4vw,48px)" }}>
        {isVideo ? <>Solicitud <span className="dim">recibida</span></> : <>Foto <span className="dim">enviada</span></>}
      </h2>
      <p className="lead" style={{ fontSize: 18, margin: "18px 0 36px", maxWidth: 440 }}>
        {isVideo
          ? "El equipo de Dental Corbella te contactará por WhatsApp para agendar tu vídeo personalizado en consulta."
          : "Revisa tu correo: te hemos enviado tu simulación Smile Fast. Mira también tu bandeja de spam."}
      </p>
      <button className="btn btn-primary" onClick={onClose}>Volver al inicio</button>
    </div>
  );
}

/* ---- Wizard shell ---- */
function Widget({ onClose }) {
  const [step, setStep] = useStateW("form");
  const [kind, setKind] = useStateW("video");
  const idx = { form: 1, processing: 2, result: 3, success: 4 }[step];
  return (
    <div className="widget-overlay">
      <div className="widget-card">
        <WizardHeader step={idx} total={4} onClose={onClose} />
        <div className="widget-body">
          {step === "form" && <FormStep onSubmit={() => setStep("processing")} />}
          {step === "processing" && <ProcessingStep onDone={() => setStep("result")} />}
          {step === "result" && <ResultStep onAct={(k) => { setKind(k); setStep("success"); }} />}
          {step === "success" && <SuccessStep kind={kind} onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}

export { Widget };
