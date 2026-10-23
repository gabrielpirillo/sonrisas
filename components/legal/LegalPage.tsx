import Link from "next/link";
import { Wordmark } from "@/components/admin/qoves/LogoMark";
import { COMPANY, LEGAL_DOCS } from "@/lib/legal/company";
import { PrintButton } from "./PrintButton";
import "./legal.css";

export interface LegalSection {
    /** Ancla (#id) de la sección. */
    id: string;
    title: string;
    body: React.ReactNode;
}

/**
 * Plantilla de las páginas legales: cabecera con marca, índice (plegable en
 * móvil, fijo en escritorio), secciones numeradas con ancla, fecha de
 * actualización, enlaces a todos los documentos y estilos de impresión.
 */
export function LegalPage({
    title,
    eyebrow = "Legal",
    path,
    updated = COMPANY.updated,
    version,
    intro,
    sections,
}: {
    title: string;
    eyebrow?: string;
    /** Ruta de la página (marca el enlace activo del pie). */
    path: string;
    updated?: string;
    /** Versión del documento (se muestra junto a la fecha). */
    version?: string;
    intro?: React.ReactNode;
    sections: LegalSection[];
}) {
    const tocItems = sections.map((s) => (
        <li key={s.id}>
            <a href={`#${s.id}`}>{s.title}</a>
        </li>
    ));

    return (
        <div className="sf-lg">
            <header className="sf-lg-head">
                <div className="sf-lg-head-in">
                    <Link href="/" aria-label="Smile Fast — inicio" className="sf-lg-home"><Wordmark height={20} /></Link>
                    <div className="sf-lg-head-actions">
                        <PrintButton />
                    </div>
                </div>
            </header>

            <div className="sf-lg-layout">
                <aside className="sf-lg-toc" aria-label="Índice">
                    <details>
                        <summary>Contenido ({sections.length} apartados)</summary>
                        <nav aria-label="Índice del documento"><ol>{tocItems}</ol></nav>
                    </details>
                    <nav className="sf-lg-toc-desk" aria-label="Índice del documento">
                        <p className="sf-lg-toc-title">Contenido</p>
                        <ol>{tocItems}</ol>
                    </nav>
                </aside>

                <main className="sf-lg-main">
                    <p className="sf-lg-eyebrow">{eyebrow}</p>
                    <h1>{title}</h1>
                    <p className="sf-lg-meta">
                        Última actualización: <time>{updated}</time>
                        {version ? <> · Versión {version}</> : null}
                    </p>
                    {intro ? <div className="sf-lg-intro">{intro}</div> : null}
                    {sections.map((s, i) => (
                        <section key={s.id} id={s.id} className="sf-lg-sec" aria-labelledby={`${s.id}-t`}>
                            <h2 id={`${s.id}-t`}>
                                <span className="n">{i + 1}.</span>
                                <span>{s.title}</span>
                                <a className="anchor" href={`#${s.id}`} aria-label={`Enlace a «${s.title}»`}>#</a>
                            </h2>
                            {s.body}
                        </section>
                    ))}
                </main>
            </div>

            <footer className="sf-lg-foot">
                <div className="sf-lg-foot-in">
                    <nav aria-label="Documentos legales">
                        <Link href="/">Inicio</Link>
                        {LEGAL_DOCS.map((d) => (
                            <Link key={d.href} href={d.href} aria-current={d.href === path ? "page" : undefined}>{d.label}</Link>
                        ))}
                    </nav>
                    <small>© {new Date().getFullYear()} {COMPANY.product} · un producto de {COMPANY.tradeName} ({COMPANY.legalName})</small>
                </div>
            </footer>
        </div>
    );
}

/** Tabla legible con desplazamiento interno en móvil. */
export function LegalTable({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
    return (
        <div className="sf-lg-table" role="region" aria-label="Tabla" tabIndex={0}>
            <table>
                <thead>
                    <tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** Recuadro destacado. */
export function LegalNote({ children }: { children: React.ReactNode }) {
    return <div className="sf-lg-note">{children}</div>;
}
