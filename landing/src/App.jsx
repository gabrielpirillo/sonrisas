import React, { useState, useEffect } from "react";
import { Landing } from "./components/Landing";
import { DemoModal } from "./components/DemoModal";

export default function App() {
  const [demoOpen, setDemoOpen] = useState(false);

  // lock scroll when modal open
  useEffect(() => {
    document.body.style.overflow = demoOpen ? "hidden" : "";
  }, [demoOpen]);

  // "Quiero probarlo" lleva a la demo interactiva de la app.
  // El formulario "Agenda tu demo personalizada" se abre con /#agendar.
  const goToDemo = () => { window.location.href = "/demo"; };
  useEffect(() => {
    const sync = () => setDemoOpen(window.location.hash === "#agendar");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const close = () => {
    setDemoOpen(false);
    if (window.location.hash === "#agendar") history.replaceState(null, "", window.location.pathname + window.location.search);
  };

  return (
    <React.Fragment>
      <Landing onStart={goToDemo} />
      {demoOpen && <DemoModal onClose={close} />}
    </React.Fragment>
  );
}
