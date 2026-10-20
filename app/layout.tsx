import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";

// Tipografía de marca (la misma de la landing), servida desde nuestro servidor.
const generalSans = localFont({
  src: [
    { path: "./fonts/general-sans-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/general-sans-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/general-sans-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/general-sans-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-general-sans",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: [
    { path: "./fonts/jetbrains-mono-latin.woff2", weight: "400 500", style: "normal" },
    { path: "./fonts/jetbrains-mono-latin-ext.woff2", weight: "400 500", style: "normal" },
  ],
  variable: "--font-jetbrains",
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Smile Fast · Simulación de sonrisa con IA para clínicas dentales",
    template: "%s · Smile Fast",
  },
  description:
    "Tus visitantes ven su nueva sonrisa en la web de tu clínica, dejan sus datos y agendan. Simulación de sonrisa con IA, activa en 1 día.",
};

export const viewport: Viewport = {
  themeColor: "#1b2630",
  width: "device-width",
  initialScale: 1,
  // Permite usar env(safe-area-inset-*) en iPhone (notch y barra inferior).
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${generalSans.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          <ThemeProvider attribute="class" forcedTheme="light" disableTransitionOnChange>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  fontFamily: "var(--font-general-sans)",
                  borderRadius: 14,
                  border: "1px solid var(--blue-line)",
                },
              }}
            />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
