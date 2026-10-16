"use client";

// Better Auth no requiere Provider para useSession (authClient maneja el estado).
export function Providers({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
