"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ScanFace, Sparkles, UserRoundCheck } from "lucide-react";
import { Wordmark } from "@/components/admin/qoves/LogoMark";
import "./auth-shell.css";

const PHOTOS = ["/brand/auth/preview-after.jpg", "/brand/auth/trans-1-after.jpg", "/brand/auth/trans-2-after.jpg"];

/** Escaparate navy con foto escaneada y tarjetas flotantes del flujo. */
function Showcase() {
    const [i, setI] = useState(0);
    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const t = setInterval(() => setI((n) => (n + 1) % PHOTOS.length), 3400);
        return () => clearInterval(t);
    }, []);

    return (
        <aside className="sf-auth-show" aria-hidden="true">
            <div className="sf-auth-show-head">
                <Wordmark tone="light" height={22} />
                <span className="sf-auth-chip"><i /> IA en vivo</span>
            </div>

            <div className="sf-auth-stage">
                <div className="sf-auth-photo">
                    {PHOTOS.map((src, n) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            key={src}
                            src={src}
                            alt=""
                            style={{ position: n === 0 ? "relative" : "absolute", inset: 0, opacity: n === i ? 1 : 0 }}
                        />
                    ))}
                    <span className="scan" />
                    <span className="corners" />
                </div>

                <div className="sf-auth-float f1">
                    <span className="ic"><ScanFace size={18} /></span>
                    <span><small>Paso 1</small>Análisis facial</span>
                </div>
                <div className="sf-auth-float f2">
                    <span className="ic"><Sparkles size={18} /></span>
                    <span><small>Paso 2</small>Simulación de sonrisa</span>
                </div>
                <div className="sf-auth-float f3">
                    <span className="ic"><UserRoundCheck size={18} /></span>
                    <span><small>Paso 3</small>Lead en tu panel</span>
                </div>
            </div>

            <div className="sf-auth-show-copy">
                <h2>
                    Tus pacientes ven su nueva sonrisa <span>antes de la primera cita.</span>
                </h2>
                <p>Gestiona leads, simulaciones y el widget de tu web desde un solo panel.</p>
            </div>
        </aside>
    );
}

export function AuthShell({
    eyebrow,
    title,
    accent,
    subtitle,
    back,
    children,
}: {
    eyebrow?: string;
    title: string;
    accent?: string;
    subtitle?: string;
    back?: { href: string; label: string };
    children: React.ReactNode;
}) {
    return (
        <div className="sf-auth">
            <main className="sf-auth-form-side">
                <div className="sf-auth-top">
                    <Link href="/" aria-label="Smile Fast — inicio">
                        <Wordmark tone="dark" height={22} />
                    </Link>
                    {back && (
                        <Link href={back.href} className="sf-auth-back">
                            <ArrowLeft size={15} /> {back.label}
                        </Link>
                    )}
                </div>

                <div className="sf-auth-body">
                    {eyebrow && <span className="sf-auth-eyebrow">{eyebrow}</span>}
                    <h1 className="sf-auth-title">
                        {title}
                        {accent && <> <span className="dim">{accent}</span></>}
                    </h1>
                    {subtitle && <p className="sf-auth-sub">{subtitle}</p>}
                    <div>{children}</div>
                </div>

                <div className="sf-auth-foot">
                    <span>© {new Date().getFullYear()} Smile Fast</span>
                    <span>Simulación de sonrisa con IA para clínicas dentales</span>
                </div>
            </main>
            <Showcase />
        </div>
    );
}
