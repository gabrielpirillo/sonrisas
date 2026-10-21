import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const DEFAULT_AFTER_LOGIN = "/administracion/dashboard";

/**
 * Destino `next` seguro: solo rutas relativas del mismo origen ("/…", nunca
 * "//host", "/\\host" ni otro esquema) y nunca de vuelta a /acceso o /login.
 */
function safeNext(raw: string | null, request: NextRequest): URL | null {
    if (!raw || raw.length > 1024 || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
    try {
        const url = new URL(raw, request.nextUrl.origin);
        if (url.origin !== request.nextUrl.origin) return null;
        if (url.pathname.startsWith("/acceso") || url.pathname.startsWith("/login")) return null;
        return url;
    } catch {
        return null;
    }
}

/**
 * Middleware (Next 16 `proxy`). Usa Better Auth: chequea la cookie de sesión
 * (edge-safe, sin DB). La verificación fina de rol (p. ej. settings) se hace en
 * el servidor (requireAuth('admin')).
 */
export async function proxy(request: NextRequest) {
    const hasSession = Boolean(getSessionCookie(request));
    const { pathname } = request.nextUrl;

    // ─── Bloquear signup público legacy ───
    if (pathname.startsWith("/signup")) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // ─── Si ya hay sesión y va a /login o /acceso → al dashboard ───
    if ((pathname.startsWith("/login") || pathname.startsWith("/acceso")) && hasSession) {
        const next = safeNext(request.nextUrl.searchParams.get("next"), request);
        if (next) return NextResponse.redirect(next);
        const url = request.nextUrl.clone();
        url.pathname = DEFAULT_AFTER_LOGIN;
        url.search = "";
        return NextResponse.redirect(url);
    }

    // ─── Rutas protegidas: requieren sesión ───
    const isUpdatePassword = pathname === "/administracion/update-password";
    const needsAuth = pathname.startsWith("/administracion") || pathname.startsWith("/superadmin");
    if (needsAuth && !hasSession && !isUpdatePassword) {
        // Conserva el destino (p. ej. la vuelta desde Stripe) para después del login.
        const url = request.nextUrl.clone();
        url.pathname = "/acceso";
        url.search = "";
        url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!simulacion|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
