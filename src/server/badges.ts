import { db } from "@/lib/db";

const BADGE_DEFINITIONS = [
  { code: "saver-10", title: "Sparer 10 %", description: "Sparede mindst 10 % af din baseline", iconKey: "zap" },
  { code: "saver-20", title: "Sparer 20 %", description: "Sparede mindst 20 % af din baseline", iconKey: "zap" },
  { code: "saver-30", title: "Sparer 30 %", description: "Sparede mindst 30 % af din baseline", iconKey: "zap" },
  { code: "night-saver", title: "Natspar", description: "Reducerede peak-forbruget med over 15 %", iconKey: "moon" },
  { code: "co2-hero", title: "CO₂-helt", description: "Sparede mindst 1 kg CO₂", iconKey: "leaf" },
  { code: "top-10", title: "Top 10", description: "Placerede dig i top 10 % på ranglisten", iconKey: "crown" },
  { code: "streak-7", title: "7-dages streak", description: "Sparede strøm konsekvent alle 7 dage", iconKey: "flame" },
];

export async function evaluateBadges(campaignId: string) {
  // Ensure all badge definitions exist
  for (const def of BADGE_DEFINITIONS) {
    await db.badge.upsert({
      where: { code: def.code },
      create: def,
      update: { title: def.title, description: def.description, iconKey: def.iconKey },
    });
  }

  const badges = await db.badge.findMany();
  const badgeMap = new Map(badges.map((b) => [b.code, b.id]));

  // Fetch challenge results + leaderboard
  const [results, leaderboard] = await Promise.all([
    db.challengeResult.findMany({
      where: { campaignId },
      select: {
        householdId: true,
        savingPercent: true,
        estimatedCo2Saved: true,
        peakHourReductionPercent: true,
        consistencyScore: true,
      },
    }),
    db.leaderboardEntry.findMany({
      where: { campaignId, leaderboardType: "GLOBAL" },
      select: { householdId: true, rank: true },
    }),
  ]);

  const totalRanked = leaderboard.length;
  const top10Cutoff = Math.max(3, Math.ceil(totalRanked * 0.1));
  const rankMap = new Map(leaderboard.map((e) => [e.householdId, e.rank]));

  let awarded = 0;

  for (const r of results) {
    const pct = Number(r.savingPercent);
    const co2 = Number(r.estimatedCo2Saved);
    const peak = r.peakHourReductionPercent ? Number(r.peakHourReductionPercent) : null;
    const consistency = r.consistencyScore ? Number(r.consistencyScore) : null;
    const rank = rankMap.get(r.householdId);

    const earned: string[] = [];
    if (pct >= 10) earned.push("saver-10");
    if (pct >= 20) earned.push("saver-20");
    if (pct >= 30) earned.push("saver-30");
    if (peak !== null && peak >= 15) earned.push("night-saver");
    if (co2 >= 1.0) earned.push("co2-hero");
    if (rank !== undefined && rank <= top10Cutoff) earned.push("top-10");
    if (consistency !== null && consistency >= 90) earned.push("streak-7");

    for (const code of earned) {
      const badgeId = badgeMap.get(code);
      if (!badgeId) continue;
      await db.userBadge.upsert({
        where: { badgeId_householdId: { badgeId, householdId: r.householdId } },
        create: { badgeId, householdId: r.householdId },
        update: {},
      });
      awarded++;
    }
  }

  return { evaluated: results.length, awarded };
}
