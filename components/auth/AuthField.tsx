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
    return (
        <div className="sf-auth-field">
            <label htmlFor={id}>{label}</label>
            <div className="sf-auth-input-wrap">
                <Icon size={17} />
                <input
                    id={id}
                    name={id}
                    type={isPassword && show ? "text" : type}
                    className={`sf-auth-input${isPassword ? " has-eye" : ""}`}
                    {...props}
                />
                {isPassword && (
                    <button
                        type="button"
                        className="sf-auth-eye"
                        onClick={() => setShow((s) => !s)}
                        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                        {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                )}
            </div>
        </div>
    );
}
