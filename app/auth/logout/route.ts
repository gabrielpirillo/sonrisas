import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/better";

export async function POST(request: Request) {
    try {
        await auth.api.signOut({ headers: await headers() });
    } catch {
        // La cookie de sesión se limpia igualmente.
    }

    const origin = new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/login`, { status: 303 });
}
