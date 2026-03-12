import { db } from "@/lib/db";

/**
 * Rebuild the global leaderboard for a campaign.
 * Sort: savingPercent DESC → consistencyScore DESC → savingKwh DESC → householdId ASC
 */
export async function rebuildGlobalLeaderboard(campaignId: string) {
  // Get all eligible challenge results
  const results = await db.challengeResult.findMany({
    where: {
      campaignId,
      eligibleForMainLeaderboard: true,
    },
    orderBy: [
      { savingPercent: "desc" },
      { consistencyScore: "desc" },
      { savingKwh: "desc" },
      { householdId: "asc" },
    ],
  });

  // Delete existing global leaderboard entries
  await db.leaderboardEntry.deleteMany({
    where: {
      campaignId,
      leaderboardType: "GLOBAL",
    },
  });

  // Create new entries with ranks
  if (results.length > 0) {
    await db.leaderboardEntry.createMany({
      data: results.map((r, index) => ({
        campaignId,
        householdId: r.householdId,
        leaderboardType: "GLOBAL" as const,
        rank: index + 1,
        score: r.savingPercent,
      })),
    });
  }

  return { entries: results.length };
}
