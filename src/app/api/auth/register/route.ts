import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { name, email, password, tenantSlug, marketingConsent } = parsed.data;

    // Find tenant
    const tenant = await db.tenant.findUnique({
      where: { slug: tenantSlug, status: "ACTIVE" },
    });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Check existing user for this tenant
    const existingMembership = await db.tenantMembership.findFirst({
      where: {
        user: { email: email.toLowerCase() },
        tenantId: tenant.id,
      },
    });
    if (existingMembership) {
      return NextResponse.json(
        { error: "En bruger med denne e-mail er allerede tilmeldt" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create user + membership + consents in a transaction
    const user = await db.$transaction(async (tx) => {
      // Find or create user (can exist in another tenant)
      let user = await tx.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (user) {
        // User exists in another tenant — just add membership
      } else {
        user = await tx.user.create({
          data: {
            name,
            email: email.toLowerCase(),
            passwordHash,
          },
        });
      }

      await tx.tenantMembership.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: "PARTICIPANT",
        },
      });

      // Required consent: participation
      await tx.consentRecord.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          consentType: "PARTICIPATION",
          version: "1.0",
          accepted: true,
          acceptedAt: new Date(),
        },
      });

      // Optional: marketing
      if (marketingConsent) {
        await tx.consentRecord.create({
          data: {
            userId: user.id,
            tenantId: tenant.id,
            consentType: "MARKETING",
            version: "1.0",
            accepted: true,
            acceptedAt: new Date(),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorUserId: user.id,
          action: "USER_REGISTERED",
          entityType: "User",
          entityId: user.id,
        },
      });

      return user;
    });

    // Set session
    const session = await getSession();
    session.userId = user.id;
    session.tenantId = tenant.id;
    session.role = "PARTICIPANT";
    session.email = user.email;
    session.name = user.name;
    await session.save();

    return NextResponse.json(
      {
        user: { id: user.id, name: user.name, email: user.email },
        tenantSlug,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
