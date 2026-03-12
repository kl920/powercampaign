import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import type { SessionData } from "@/lib/auth";

const sessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "pc_session",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only process /t/[tenantSlug]/ routes
  const tenantMatch = pathname.match(/^\/t\/([^/]+)(\/.*)?$/);
  if (!tenantMatch) return NextResponse.next();

  const tenantSlug = tenantMatch[1];
  const subPath = tenantMatch[2] || "/";

  // Public tenant pages (landing, how-it-works, etc.) don't require auth
  const publicPaths = ["/", "/how-it-works", "/prizes", "/faq", "/privacy", "/terms"];
  if (publicPaths.includes(subPath)) {
    return NextResponse.next();
  }

  // Auth pages don't require session
  if (subPath.startsWith("/auth/")) {
    return NextResponse.next();
  }

  // All other /t/[slug]/ pages require authentication
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(
    request,
    response,
    sessionOptions,
  );

  if (!session.userId) {
    const loginUrl = new URL(`/t/${tenantSlug}/auth/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin pages require TenantAdmin or SuperAdmin role
  if (subPath.startsWith("/admin/")) {
    if (session.role !== "TENANT_ADMIN" && session.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(
        new URL(`/t/${tenantSlug}/dashboard`, request.url),
      );
    }
  }

  return response;
}

export const config = {
  matcher: ["/t/:path*"],
};
