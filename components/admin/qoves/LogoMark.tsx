/* Q-style circular logo mark (Qoves visual language) */
export function LogoMark({ size = 34, dark = true }: { size?: number; dark?: boolean }) {
    const stroke = dark ? "#fff" : "#1c1e1d";
    return (
        <span
            className="qoves-logo-mark"
            style={{
                width: size,
                height: size,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                background: dark ? "#1c1e1d" : "transparent",
                border: dark ? "none" : "1px solid #1c1e1d",
            }}
        >
            <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
                <circle cx={12} cy={12} r={9} stroke={stroke} strokeWidth={2} />
                <path d="M12 3 A9 9 0 0 1 12 21" stroke={stroke} strokeWidth={2} fill="none" opacity={0.45} />
            </svg>
        </span>
    );
}
