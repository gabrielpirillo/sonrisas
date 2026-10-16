/* Composición antes/después para la banda navy del resumen: la misma foto
   real partida por la mitad, con la línea divisoria del simulador. La
   revelación inicial es solo CSS (se desactiva con prefers-reduced-motion). */
export function BeforeAfterHero({
    before = "/brand/panel/trans-1-before.jpg",
    after = "/brand/panel/trans-1-after.jpg",
}: {
    before?: string;
    after?: string;
}) {
    return (
        <figure className="ba-hero" aria-label="Ejemplo de simulación: antes y después">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="ba-img" src={before} alt="" />
            <span className="ba-after">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="ba-img" src={after} alt="" />
            </span>
            <span className="ba-divider" aria-hidden="true">
                <span className="ba-handle" />
            </span>
            <figcaption className="ba-tags">
                <span className="ba-tag">Antes</span>
                <span className="ba-tag ba-tag-on">Simulación</span>
            </figcaption>
        </figure>
    );
}
