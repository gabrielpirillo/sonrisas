import type { Viewport } from "next";

// Barra del navegador blanca: el widget en móvil es blanco y a sangre.
export const viewport: Viewport = { themeColor: "#ffffff" };

export default function WidgetLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Móvil: el widget ocupa toda la pantalla (sin márgenes ni marco, como una
    // app). Desde 640px se muestra como tarjeta centrada.
    return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-transparent p-0 sm:py-4">
            <div className="w-full">
                {children}
            </div>
        </div>
    );
}
