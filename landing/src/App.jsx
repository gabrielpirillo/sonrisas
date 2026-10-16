import React, { useState, useEffect } from "react";
import { Landing } from "./components/Landing";
import { DemoModal } from "./components/DemoModal";

export default function App() {
  const [demoOpen, setDemoOpen] = useState(false);

  // lock scroll when modal open
  useEffect(() => {
    document.body.style.overflow = demoOpen ? "hidden" : "";
  }, [demoOpen]);

  const open = () => setDemoOpen(true);

  return (
    <React.Fragment>
      <Landing onStart={open} />
      {demoOpen && <DemoModal onClose={() => setDemoOpen(false)} />}
    </React.Fragment>
  );
}
