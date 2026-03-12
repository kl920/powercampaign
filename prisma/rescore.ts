/**
 * Production reseed utility — runs baseline/scoring/leaderboard/badges
 * using the SAME prisma client that connected to Neon (avoids lib/db singleton).
 *
 * Usage:  $env:DATABASE_URL="neon_url"  npx tsx prisma/rescore.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL!;
const pool = new pg.Pool({ connectionString, max: 2 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// ─── Inline mini-versions of the engine functions using this prisma ──────────

async function runBaselines(campaignId: string) {
  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: {
      tenant: {
        include: {
          households: {
            where: { deletedAt: null },
            include: { meterConnections: true },
          },
        },
      },
    },
  });

  const households = campaign.tenant.households.filter(
    (h) => h.meterConnections.some((c) => c.status === "CONNECTED"),
  );

  let processed = 0;
  for (const h of households) {
    const allIntervals = await prisma.consumptionInterval.findMany({
      where: { householdId: h.id, granularity: "HOUR" },
      orderBy: { timestamp: "asc" },
      select: { timestamp: true, kwh: true },
    });
    if (allIntervals.length === 0) continue;

    const startsAt = campaign.startsAt;
    // Build 4 weeks history
    const weeks = Array.from({ length: 4 }, (_, i) => {
      const weekEnd = new Date(startsAt);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);
      return { start: weekStart, end: weekEnd, intervals: [] as { timestamp: Date; kwh: number }[] };
    });

    for (const iv of allIntervals) {
      if (iv.timestamp >= startsAt) continue;
      for (const w of weeks) {
        if (iv.timestamp >= w.start && iv.timestamp < w.end) {
          w.intervals.push({ timestamp: iv.timestamp, kwh: Number(iv.kwh) });
        }
      }
    }

    const qualified = weeks.filter((w) => w.intervals.length / 168 >= 0.85);
    if (qualified.length === 0) continue;

    const used = qualified.slice(0, Math.min(qualified.length, 4));
    const weekTotals = used.map((w) => w.intervals.reduce((s, i) => s + i.kwh, 0));
    const baselineKwh = weekTotals.reduce((a, b) => a + b, 0) / weekTotals.length;
    const peakTotals = used.map((w) =>
      w.intervals.filter((i) => { const h2 = i.timestamp.getHours(); return h2 >= 17 && h2 <= 20; })
        .reduce((s, i) => s + i.kwh, 0),
    );
    const baselinePeakKwh = peakTotals.reduce((a, b) => a + b, 0) / peakTotals.length;

    await prisma.baselineSnapshot.upsert({
      where: { campaignId_householdId: { campaignId, householdId: h.id } },
      update: { baselineKwh, baselinePeakKwh, calculatedAt: new Date(), method: used.length >= 4 ? "LAST_4_WEEKS" : used.length >= 2 ? "LAST_2_WEEKS" : "MODELED", comparisonWeeksCount: used.length, limitedBaseline: used.length < 2, dataCompletenessScore: (used.reduce((s, w) => s + w.intervals.length, 0) / (used.length * 168)) * 100, sameWeekLastYearKwh: null },
      create: { campaignId, householdId: h.id, baselineKwh, baselinePeakKwh, calculatedAt: new Date(), method: used.length >= 4 ? "LAST_4_WEEKS" : used.length >= 2 ? "LAST_2_WEEKS" : "MODELED", comparisonWeeksCount: used.length, limitedBaseline: used.length < 2, dataCompletenessScore: (used.reduce((s, w) => s + w.intervals.length, 0) / (used.length * 168)) * 100, sameWeekLastYearKwh: null },
    });
    processed++;
  }
  return processed;
}

async function runScoring(campaignId: string) {
  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  const baselines = await prisma.baselineSnapshot.findMany({ where: { campaignId } });

  let processed = 0;
  for (const b of baselines) {
    const intervals = await prisma.consumptionInterval.findMany({
      where: { householdId: b.householdId, granularity: "HOUR", timestamp: { gte: campaign.startsAt, lt: campaign.endsAt } },
      select: { timestamp: true, kwh: true },
    });
    if (intervals.length === 0) continue;

    const challengeKwh = intervals.reduce((s, i) => s + Number(i.kwh), 0);
    const baselineKwh = Number(b.baselineKwh);
    const savingKwh = baselineKwh - challengeKwh;
    const savingPercent = baselineKwh > 0 ? (savingKwh / baselineKwh) * 100 : 0;
    const estimatedDkkSaved = savingKwh * Number(campaign.estimatedPricePerKwhDkk);
    const estimatedCo2Saved = savingKwh * Number(campaign.co2FactorKgPerKwh);

    await prisma.challengeResult.upsert({
      where: { campaignId_householdId: { campaignId, householdId: b.householdId } },
      update: { challengeKwh, savingKwh, savingPercent, estimatedDkkSaved, estimatedCo2Saved, challengeDataCompleteness: (intervals.length / 168) * 100, eligibleForMainLeaderboard: true, anomalyFlag: false, anomalyReason: null, peakHourReductionPercent: null, consistencyScore: 0 },
      create: { campaignId, householdId: b.householdId, challengeKwh, savingKwh, savingPercent, estimatedDkkSaved, estimatedCo2Saved, challengeDataCompleteness: (intervals.length / 168) * 100, eligibleForMainLeaderboard: true, anomalyFlag: false, anomalyReason: null, peakHourReductionPercent: null, consistencyScore: 0 },
    });
    processed++;
  }
  return processed;
}

async function runLeaderboard(campaignId: string) {
  const results = await prisma.challengeResult.findMany({
    where: { campaignId, eligibleForMainLeaderboard: true, savingKwh: { gt: 0 } },
    orderBy: { savingPercent: "desc" },
  });

  await prisma.leaderboardEntry.deleteMany({ where: { campaignId, leaderboardType: "GLOBAL" } });

  for (let i = 0; i < results.length; i++) {
    await prisma.leaderboardEntry.create({
      data: { campaignId, householdId: results[i].householdId, leaderboardType: "GLOBAL", rank: i + 1, score: results[i].savingPercent },
    });
  }
  return results.length;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const campaign = await prisma.campaign.findFirst({
    where: { status: { in: ["LIVE", "COMPLETED"] } },
    orderBy: { startsAt: "desc" },
  });
  if (!campaign) { console.error("No LIVE campaign found"); process.exit(1); }

  console.log(`Campaign: ${campaign.name} (${campaign.id})`);

  const b = await runBaselines(campaign.id);
  console.log(`Baselines written: ${b}`);

  const s = await runScoring(campaign.id);
  console.log(`Scores written: ${s}`);

  const l = await runLeaderboard(campaign.id);
  console.log(`Leaderboard entries: ${l}`);

  // Verify anna0
  const anna = await prisma.user.findUnique({ where: { email: "anna0@demo.dk" } });
  const annaH = anna ? await prisma.household.findFirst({ where: { ownerUserId: anna.id } }) : null;
  const annaBl = annaH ? await prisma.baselineSnapshot.findFirst({ where: { householdId: annaH.id } }) : null;
  const annaCr = annaH ? await prisma.challengeResult.findFirst({ where: { householdId: annaH.id } }) : null;
  console.log(`\nanna0 baseline: ${annaBl?.baselineKwh} | saving: ${annaCr?.savingKwh} | pct: ${annaCr?.savingPercent}`);

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
