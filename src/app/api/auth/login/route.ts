import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { email, password, tenantSlug } = parsed.data;

    // Find user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Forkert e-mail eller adgangskode" },
        { status: 401 },
      );
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Forkert e-mail eller adgangskode" },
        { status: 401 },
      );
    }

    // Find tenant membership
    const membership = await db.tenantMembership.findFirst({
      where: {
        userId: user.id,
        tenant: { slug: tenantSlug, status: "ACTIVE" },
      },
      include: { tenant: true },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "Du har ikke adgang til denne organisation" },
        { status: 403 },
      );
    }

    // Set session
    const session = await getSession();
    session.userId = user.id;
    session.tenantId = membership.tenantId;
    session.role = membership.role;
    session.email = user.email;
    session.name = user.name;
    await session.save();

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId: membership.tenantId,
        actorUserId: user.id,
        action: "USER_LOGIN",
        entityType: "User",
        entityId: user.id,
      },
    });

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
      role: membership.role,
      tenantSlug,
      onboardingCompleted: !!user.onboardingCompletedAt,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
