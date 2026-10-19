import React from "react";
import { Landing } from "./components/Landing";

export default function App() {
  // "Quiero probarlo" lleva a la demo interactiva de la app.
  const goToDemo = () => { window.location.href = "/demo"; };
  return <Landing onStart={goToDemo} />;
}
