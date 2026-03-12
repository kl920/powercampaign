import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { db } from "./db";
import type { UserRole } from "@prisma/client";

export interface SessionData {
  userId: string;
  tenantId: string;
  role: UserRole;
  email: string;
  name: string;
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "pc_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session.userId) {
    throw new AuthError("Not authenticated", 401);
  }
  return session;
}

export async function requireParticipant(tenantSlug?: string) {
  const session = await requireAuth();
  if (tenantSlug) {
    await verifyTenantAccess(session.userId, tenantSlug);
  }
  return session;
}

export async function requireTenantAdmin(tenantSlug: string) {
  const session = await requireAuth();
  const membership = await verifyTenantAccess(session.userId, tenantSlug);
  if (membership.role !== "TENANT_ADMIN" && membership.role !== "SUPER_ADMIN") {
    throw new AuthError("Insufficient permissions", 403);
  }
  return session;
}

export async function requireSuperAdmin() {
  const session = await requireAuth();
  if (session.role !== "SUPER_ADMIN") {
    throw new AuthError("Insufficient permissions", 403);
  }
  return session;
}

async function verifyTenantAccess(userId: string, tenantSlug: string) {
  const membership = await db.tenantMembership.findFirst({
    where: {
      userId,
      tenant: { slug: tenantSlug, status: "ACTIVE" },
    },
  });
  if (!membership) {
    throw new AuthError("No access to this tenant", 403);
  }
  return membership;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
