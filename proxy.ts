import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

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
        const next = request.nextUrl.searchParams.get("next") || "/administracion/dashboard";
        const url = request.nextUrl.clone();
        url.pathname = next;
        return NextResponse.redirect(url);
    }

    // ─── Rutas protegidas: requieren sesión ───
    const isUpdatePassword = pathname === "/administracion/update-password";
    const needsAuth = pathname.startsWith("/administracion") || pathname.startsWith("/superadmin");
    if (needsAuth && !hasSession && !isUpdatePassword) {
        const url = request.nextUrl.clone();
        url.pathname = "/acceso";
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!simulacion|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
