import React from "react";
import ReactDOM from "react-dom/client";

import "./styles/fonts.css";
import "./styles/qoves.css";

// window.__resources debe existir antes que el badge de Brandboost.
import "./resources";
import "./lib/image-slot.js";
import "./lib/brandboost-badge.js";

import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
