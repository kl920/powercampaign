import { NextRequest } from "next/server";
import { requireTenantAdmin, authErrorResponse } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateAllBaselines } from "@/server/baseline";
import { scoreAllHouseholds } from "@/server/scoring";
import { rebuildGlobalLeaderboard } from "@/server/leaderboard";
import { evaluateBadges } from "@/server/badges";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  try {
    const { campaignId } = await params;

    // Find campaign and verify tenant access
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      include: { tenant: true },
    });
    if (!campaign) {
      return Response.json({ error: "Campaign not found" }, { status: 404 });
    }

    const session = await requireTenantAdmin(campaign.tenant.slug);

    // Run the full pipeline
    const baselineResult = await calculateAllBaselines(campaignId);
    const scoringResult = await scoreAllHouseholds(campaignId);
    const leaderboardResult = await rebuildGlobalLeaderboard(campaignId);
    const badgeResult = await evaluateBadges(campaignId);

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId: campaign.tenantId,
        actorUserId: session.userId,
        action: "CAMPAIGN_RECALCULATED",
        entityType: "Campaign",
        entityId: campaignId,
        metadataJson: {
          baselineProcessed: baselineResult.processed,
          scoringProcessed: scoringResult.processed,
          leaderboardEntries: leaderboardResult.entries,
          badgesAwarded: badgeResult.awarded,
        },
      },
    });

    return Response.json({
      baselineProcessed: baselineResult.processed,
      scoringProcessed: scoringResult.processed,
      leaderboardRebuilt: leaderboardResult.entries,
      badgesAwarded: badgeResult.awarded,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
