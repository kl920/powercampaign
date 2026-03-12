import { NextResponse } from "next/server";
import { requireTenantAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ExportType } from "@prisma/client";

export async function POST(request: Request) {
  const body = await request.json();
  const tenantSlug = body.tenantSlug as string;
  const exportType = body.type as ExportType;

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
  const validTypes: ExportType[] = ["PARTICIPANTS", "RESULTS", "CONSENTS", "GROUP_STANDINGS"];
  if (!validTypes.includes(exportType)) {
    return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
  }

  const campaign = await db.campaign.findFirst({
    where: { tenantId: tenant.id, status: { in: ["LIVE", "COMPLETED", "SCHEDULED"] } },
    orderBy: { startsAt: "desc" },
  });

  let csvContent = "";
  let rowCount = 0;

  if (exportType === "PARTICIPANTS") {
    const memberships = await db.tenantMembership.findMany({
      where: { tenantId: tenant.id, role: "PARTICIPANT" },
      include: {
        user: {
          select: { name: true, email: true, onboardingCompletedAt: true, deletedAt: true, createdAt: true },
        },
      },
    });
    csvContent = "Navn;Email;Tilmeldt;Onboarded;Slettet\n";
    for (const m of memberships) {
      csvContent += [
        escapeCsv(m.user.name),
        escapeCsv(m.user.email),
        m.user.createdAt.toISOString(),
        m.user.onboardingCompletedAt ? "Ja" : "Nej",
        m.user.deletedAt ? "Ja" : "Nej",
      ].join(";") + "\n";
      rowCount++;
    }
  } else if (exportType === "RESULTS" && campaign) {
    const results = await db.challengeResult.findMany({
      where: { campaignId: campaign.id },
      include: {
        household: {
          select: {
            postalCode: true,
            ownerUser: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { savingPercent: "desc" },
    });
    csvContent = "Navn;Email;Postnr;kWh sparet;Besparelse %;DKK sparet;CO2 kg;Konsistens;Anomali;Eligible\n";
    for (const r of results) {
      csvContent += [
        escapeCsv(r.household.ownerUser.name),
        escapeCsv(r.household.ownerUser.email),
        r.household.postalCode,
        Number(r.savingKwh).toFixed(2),
        Number(r.savingPercent).toFixed(2),
        Number(r.estimatedDkkSaved).toFixed(2),
        Number(r.estimatedCo2Saved).toFixed(4),
        r.consistencyScore ? Number(r.consistencyScore).toFixed(2) : "",
        r.anomalyFlag ? "Ja" : "Nej",
        r.eligibleForMainLeaderboard ? "Ja" : "Nej",
      ].join(";") + "\n";
      rowCount++;
    }
  } else if (exportType === "CONSENTS") {
    const consents = await db.consentRecord.findMany({
      where: { tenantId: tenant.id },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { acceptedAt: "desc" },
    });
    csvContent = "Navn;Email;Type;Accepteret;Version;Dato\n";
    for (const c of consents) {
      csvContent += [
        escapeCsv(c.user.name),
        escapeCsv(c.user.email),
        c.consentType,
        c.accepted ? "Ja" : "Nej",
        c.version,
        c.acceptedAt.toISOString(),
      ].join(";") + "\n";
      rowCount++;
    }
  } else if (exportType === "GROUP_STANDINGS" && campaign) {
    const entries = await db.leaderboardEntry.findMany({
      where: { campaignId: campaign.id, leaderboardType: "GLOBAL" },
      orderBy: { rank: "asc" },
      include: {
        household: {
          select: {
            postalCode: true,
            ownerUser: { select: { name: true, email: true } },
          },
        },
      },
    });
    csvContent = "Rank;Navn;Email;Postnr;Score\n";
    for (const e of entries) {
      csvContent += [
        e.rank,
        escapeCsv(e.household.ownerUser.name),
        escapeCsv(e.household.ownerUser.email),
        e.household.postalCode,
        Number(e.score).toFixed(2),
      ].join(";") + "\n";
      rowCount++;
    }
  }

  // Log the export
  await db.exportJob.create({
    data: {
      tenantId: tenant.id,
      campaignId: campaign?.id,
      type: exportType,
      status: "COMPLETED",
      rowCount,
      createdByUserId: session.userId,
    },
  });

  await db.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorUserId: session.userId,
      action: "EXPORT",
      entityType: "ExportJob",
      entityId: exportType,
      metadataJson: { type: exportType, rowCount },
    },
  });

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportType.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

function escapeCsv(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
