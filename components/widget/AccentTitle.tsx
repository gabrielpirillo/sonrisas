/** Título con la última palabra (o un texto dado) en el color de acento. */
export function AccentTitle({ text, accent }: { text: string; accent?: string }) {
    if (accent) return <>{text} <span className="dim">{accent}</span></>;
    const words = text.trim().split(/\s+/);
    if (words.length < 2) return <span className="dim">{text}</span>;
    const last = words.length > 3 ? words.slice(-2).join(" ") : words[words.length - 1];
    const first = text.trim().slice(0, text.trim().length - last.length).trimEnd();
    return <>{first} <span className="dim">{last}</span></>;
}
