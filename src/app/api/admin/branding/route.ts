import { NextResponse } from "next/server";
import { requireTenantAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(request: Request) {
  const body = await request.json();
  const { tenantSlug, primaryColor, secondaryColor, headline, subheadline, supportEmail } = body;

  if (!tenantSlug) {
    return NextResponse.json({ error: "Missing tenantSlug" }, { status: 400 });
  }

  let session;
  try {
    session = await requireTenantAdmin(tenantSlug);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const tenant = await db.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  await db.tenantBranding.upsert({
    where: { tenantId: tenant.id },
    update: {
      primaryColor: primaryColor ?? "#0F766E",
      secondaryColor: secondaryColor ?? "#F59E0B",
      headline: headline || null,
      subheadline: subheadline || null,
      supportEmail: supportEmail || null,
    },
    create: {
      tenantId: tenant.id,
      primaryColor: primaryColor ?? "#0F766E",
      secondaryColor: secondaryColor ?? "#F59E0B",
      headline: headline || null,
      subheadline: subheadline || null,
      supportEmail: supportEmail || null,
    },
  });

  await db.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorUserId: session.userId,
      action: "UPDATE_BRANDING",
      entityType: "TenantBranding",
      entityId: tenant.id,
    },
  });

  return NextResponse.json({ ok: true });
}
