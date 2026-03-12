import { NextResponse } from "next/server";
import { requireTenantAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(request: Request) {
  const body = await request.json();
  const { tenantSlug, id, name, description, status, startsAt, endsAt, co2Factor, pricePerKwh } = body;

  if (!tenantSlug || !id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
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

  // Verify campaign belongs to this tenant
  const campaign = await db.campaign.findFirst({
    where: { id, tenantId: tenant.id },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  await db.campaign.update({
    where: { id },
    data: {
      name: name ?? campaign.name,
      description: description ?? campaign.description,
      status: status ?? campaign.status,
      startsAt: startsAt ? new Date(startsAt) : campaign.startsAt,
      endsAt: endsAt ? new Date(endsAt) : campaign.endsAt,
      co2FactorKgPerKwh: co2Factor ?? campaign.co2FactorKgPerKwh,
      estimatedPricePerKwhDkk: pricePerKwh ?? campaign.estimatedPricePerKwhDkk,
    },
  });

  await db.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorUserId: session.userId,
      action: "UPDATE_CAMPAIGN",
      entityType: "Campaign",
      entityId: id,
    },
  });

  return NextResponse.json({ ok: true });
}
