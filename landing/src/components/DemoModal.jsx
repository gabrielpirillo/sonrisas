import React from "react";

/* ============================================================
   DemoModal — popup "Solicitar DEMO" (captación B2B clínicas)
   Nombre · Rol · Tel. móvil (país buscable) · Correo corporativo
   Decisión (solo / con equipo → correo extra) · Tamaño · Notas
   ============================================================ */
const { useState: useDM, useRef: useDMRef, useEffect: useDMEffect } = React;

const FREE_EMAIL = ["gmail.com", "hotmail.com", "hotmail.es", "outlook.com", "outlook.es", "live.com", "yahoo.com", "yahoo.es", "icloud.com", "me.com", "aol.com", "protonmail.com", "proton.me", "gmx.com", "mail.com", "yandex.com", "zoho.com", "hey.com", "msn.com"];
function isCorporateEmail(email) {
  const m = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/.exec((email || "").trim().toLowerCase());
  if (!m) return false;
  return !FREE_EMAIL.includes(m[1]);
}

// Lista de países (nombre · prefijo) — orden alfabético
const COUNTRIES = [
  ["Afganistán", "+93"], ["Albania", "+355"], ["Alemania", "+49"], ["Andorra", "+376"], ["Angola", "+244"],
  ["Arabia Saudí", "+966"], ["Argelia", "+213"], ["Argentina", "+54"], ["Armenia", "+374"], ["Australia", "+61"],
  ["Austria", "+43"], ["Bélgica", "+32"], ["Bolivia", "+591"], ["Brasil", "+55"], ["Bulgaria", "+359"],
  ["Canadá", "+1"], ["Chile", "+56"], ["China", "+86"], ["Chipre", "+357"], ["Colombia", "+57"],
  ["Corea del Sur", "+82"], ["Costa Rica", "+506"], ["Croacia", "+385"], ["Cuba", "+53"], ["Dinamarca", "+45"],
  ["Ecuador", "+593"], ["Egipto", "+20"], ["El Salvador", "+503"], ["Emiratos Árabes Unidos", "+971"], ["Eslovaquia", "+421"],
  ["Eslovenia", "+386"], ["España", "+34"], ["Estados Unidos", "+1"], ["Estonia", "+372"], ["Filipinas", "+63"],
  ["Finlandia", "+358"], ["Francia", "+33"], ["Grecia", "+30"], ["Guatemala", "+502"], ["Honduras", "+504"],
  ["Hungría", "+36"], ["India", "+91"], ["Indonesia", "+62"], ["Irlanda", "+353"], ["Islandia", "+354"],
  ["Israel", "+972"], ["Italia", "+39"], ["Japón", "+81"], ["Letonia", "+371"], ["Líbano", "+961"],
  ["Lituania", "+370"], ["Luxemburgo", "+352"], ["Malasia", "+60"], ["Malta", "+356"], ["Marruecos", "+212"],
  ["México", "+52"], ["Nicaragua", "+505"], ["Noruega", "+47"], ["Nueva Zelanda", "+64"], ["Países Bajos", "+31"],
  ["Panamá", "+507"], ["Paraguay", "+595"], ["Perú", "+51"], ["Polonia", "+48"], ["Portugal", "+351"],
  ["Puerto Rico", "+1"], ["Reino Unido", "+44"], ["República Checa", "+420"], ["República Dominicana", "+1"], ["Rumanía", "+40"],
  ["Rusia", "+7"], ["Serbia", "+381"], ["Singapur", "+65"], ["Sudáfrica", "+27"], ["Suecia", "+46"],
  ["Suiza", "+41"], ["Tailandia", "+66"], ["Taiwán", "+886"], ["Turquía", "+90"], ["Ucrania", "+380"],
  ["Uruguay", "+598"], ["Venezuela", "+58"], ["Vietnam", "+84"]];

function CountrySelect({ value, onChange }) {
  const [open, setOpen] = useDM(false);
  const [q, setQ] = useDM("");
  const ref = useDMRef(null);
  useDMEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const list = COUNTRIES.filter(([n, d]) => (n + " " + d).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="cc" ref={ref}>
      <button type="button" className="field cc-btn" onClick={() => setOpen(!open)}>
        <span>{value}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open &&
      <div className="cc-panel">
          <input className="cc-search" autoFocus placeholder="Buscar país…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="cc-list">
            {list.map(([n, d], i) =>
            <button type="button" key={i} className="cc-item" onClick={() => { onChange(d); setOpen(false); setQ(""); }}>
                <span>{n}</span><span className="cc-dial">{d}</span>
              </button>
            )}
            {list.length === 0 && <div className="cc-empty">Sin resultados</div>}
          </div>
        </div>}
    </div>);

}

function DemoField({ label, children, error, half }) {
  return (
    <label className={"demo-field" + (half ? " demo-half" : "")} style={{ display: "block" }}>
      <span className="mono" style={{ fontSize: 9, display: "block", marginBottom: 7, paddingLeft: 6, color: error ? "#c0392b" : "var(--ink-3)" }}>{label}</span>
      {children}
      {error && <span style={{ fontSize: 11.5, color: "#c0392b", marginTop: 5, paddingLeft: 6, display: "block" }}>{error}</span>}
    </label>);

}

function DemoModal({ onClose }) {
  const [v, setV] = useDM({ name: "", role: "", dial: "+34", phone: "", email: "", size: "", decision: "", email2: "", notes: "" });
  const [touched, setTouched] = useDM(false);
  const [sent, setSent] = useDM(false);
  const set = (k, val) => setV((p) => ({ ...p, [k]: val }));

  const emailErr = v.email && !isCorporateEmail(v.email) ? "Usa tu correo corporativo (no Gmail, Hotmail, etc.)." : "";
  const email2Err = v.decision === "equipo" && v.email2 && !isCorporateEmail(v.email2) ? "El correo adicional también debe ser corporativo." : "";
  const decisionOk = v.decision === "solo" || v.decision === "equipo" && isCorporateEmail(v.email2);
  const valid = v.name.trim() && v.role.trim() && v.phone.trim() && isCorporateEmail(v.email) && v.size && decisionOk && v.notes.trim();

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    try {if (window.fbq) window.fbq("track", "Lead", { content_name: "Solicitar DEMO" });} catch (e) {}
    setSent(true);
  };

  return (
    <div className="demo-scrim" onMouseDown={(e) => {if (e.target === e.currentTarget) onClose();}}>
      <div className="demo-card" role="dialog" aria-modal="true">
        <button className="demo-close" onClick={onClose} aria-label="Cerrar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>

        {!sent ?
        <React.Fragment>
            <div className="demo-head">
              <span className="mono mono-pill" style={{ fontSize: 9 }}>SOLICITAR DEMO</span>
              <h2 className="demo-title">Agenda tu <span className="dim">demo personalizada</span></h2>
              <p className="demo-sub">Te mostramos cómo Smile Fast capta pacientes desde la web de tu clínica. Déjanos tus datos y te contactamos.</p>
            </div>
            <div className="demo-form">
              <DemoField label="NOMBRE Y APELLIDOS" half>
                <input className="field" placeholder="Tu nombre" value={v.name} onChange={(e) => set("name", e.target.value)} />
              </DemoField>
              <DemoField label="ROL EN LA CLÍNICA" half>
                <input className="field" placeholder="Ej. Director, gerente…" value={v.role} onChange={(e) => set("role", e.target.value)} />
              </DemoField>
              <DemoField label="TELÉFONO MÓVIL" half>
                <div style={{ display: "flex", gap: 8 }}>
                  <CountrySelect value={v.dial} onChange={(d) => set("dial", d)} />
                  <input className="field" type="tel" placeholder="612 345 678" value={v.phone} onChange={(e) => set("phone", e.target.value)} style={{ flex: 1 }} />
                </div>
              </DemoField>
              <DemoField label="TAMAÑO DE LA CLÍNICA" half>
                <select className="field" value={v.size} onChange={(e) => set("size", e.target.value)} style={{ appearance: "none", color: v.size ? "var(--ink)" : "var(--ink-3)" }}>
                  <option value="">Selecciona una opción</option>
                  <option value="1">1 sillón (Clínica unipersonal)</option>
                  <option value="2-3">2 a 3 sillones (Clínica pequeña)</option>
                  <option value="4-5">4 a 5 sillones (Clínica mediana)</option>
                  <option value="6-9">6 a 9 sillones (Clínica grande)</option>
                  <option value="10+">10 o más sillones (Policlínica / Franquicia)</option>
                </select>
              </DemoField>
              <DemoField label="CORREO CORPORATIVO" half error={(touched || v.email) && emailErr ? emailErr : ""}>
                <input className="field" type="email" placeholder="nombre@tuclinica.com" value={v.email} onChange={(e) => set("email", e.target.value)} style={emailErr && (touched || v.email) ? { borderColor: "#c0392b" } : null} />
              </DemoField>
              <DemoField label="¿QUIÉN DECIDE LA CONTRATACIÓN?" half>
                <div className="demo-choice">
                  <button type="button" className={"demo-opt" + (v.decision === "solo" ? " on" : "")} onClick={() => set("decision", "solo")}>Decido yo solo</button>
                  <button type="button" className={"demo-opt" + (v.decision === "equipo" ? " on" : "")} onClick={() => set("decision", "equipo")}>Debo sumar a alguien</button>
                </div>
              </DemoField>
              {v.decision === "equipo" &&
              <DemoField label="CORREO DE LA OTRA PERSONA" error={(touched || v.email2) && email2Err ? email2Err : ""}>
                  <input className="field" type="email" placeholder="socio@tuclinica.com" value={v.email2} onChange={(e) => set("email2", e.target.value)} style={email2Err && (touched || v.email2) ? { borderColor: "#c0392b" } : null} />
                </DemoField>}
              <DemoField label="NOTAS FINALES">
                <textarea className="field demo-textarea" placeholder="Cuéntanos algo más sobre tu clínica o lo que buscas." value={v.notes} onChange={(e) => set("notes", e.target.value)} rows={2}></textarea>
              </DemoField>
              <button className="btn btn-primary" style={{ width: "100%", marginTop: 6, opacity: valid ? 1 : 0.5, cursor: valid ? "pointer" : "not-allowed" }} onClick={submit}>Solicitar DEMO</button>
              <p className="mono" style={{ fontSize: 8.5, textAlign: "center", marginTop: 4, color: "var(--ink-3)" }}>DATOS CIFRADOS · SIN COMPROMISO · RESPUESTA EN 24 H</p>
            </div>
          </React.Fragment> :

        <div className="demo-success">
            <div className="demo-check"><svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
            <h2 className="demo-title" style={{ textAlign: "center" }}>Solicitud <span className="dim">recibida</span></h2>
            <p className="demo-sub" style={{ textAlign: "center", maxWidth: 340 }}>Gracias, {v.name.split(" ")[0]}. Nuestro equipo te contactará por WhatsApp en menos de 24 horas para agendar tu demo.</p>
            <button className="btn btn-ghost" style={{ background: "#fff", marginTop: 6 }} onClick={onClose}>Cerrar</button>
          </div>}
      </div>
    </div>);

}

export { DemoModal };
