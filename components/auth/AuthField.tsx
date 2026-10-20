"use client";

import { useState } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";

/** Campo de formulario de las pantallas de acceso (icono + etiqueta mono). */
export function AuthField({
    id,
    label,
    icon: Icon,
    type = "text",
    ...props
}: {
    id: string;
    label: string;
    icon: LucideIcon;
} & React.InputHTMLAttributes<HTMLInputElement>) {
    const [show, setShow] = useState(false);
    const isPassword = type === "password";
    const isEmail = type === "email";
    // Teclado y autocorrección adecuados en móvil (se pueden sobrescribir por props).
    const mobileDefaults: React.InputHTMLAttributes<HTMLInputElement> =
        isEmail
            ? { inputMode: "email", autoCapitalize: "none", autoCorrect: "off", spellCheck: false }
            : isPassword
              ? { autoCapitalize: "none", autoCorrect: "off", spellCheck: false }
              : {};
    return (
        <div className="sf-auth-field">
            <label htmlFor={id}>{label}</label>
            <div className="sf-auth-input-wrap">
                <Icon size={17} aria-hidden="true" />
                <input
                    id={id}
                    name={id}
                    type={isPassword && show ? "text" : type}
                    className={`sf-auth-input${isPassword ? " has-eye" : ""}`}
                    {...mobileDefaults}
                    {...props}
                />
                {isPassword && (
                    <button
                        type="button"
                        className="sf-auth-eye"
                        onClick={() => setShow((s) => !s)}
                        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                        aria-pressed={show}
                        aria-controls={id}
                    >
                        {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
            </div>
        </div>
    );
}
