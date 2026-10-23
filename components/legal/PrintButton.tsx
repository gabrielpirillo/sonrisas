"use client";

import { Printer } from "lucide-react";

/** Imprimir / guardar como PDF. */
export function PrintButton() {
    return (
        <button type="button" className="sf-lg-btn" onClick={() => window.print()}>
            <Printer size={15} aria-hidden /> Imprimir o PDF
        </button>
    );
}
