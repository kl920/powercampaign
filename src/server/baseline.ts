import { db } from "@/lib/db";
import type { BaselineMethod } from "@prisma/client";

interface BaselineResult {
  method: BaselineMethod;
  baselineKwh: number;
  baselinePeakKwh: number;
  comparisonWeeksCount: number;
  limitedBaseline: boolean;
  dataCompletenessScore: number;
  sameWeekLastYearKwh: number | null;
}

const HOURS_PER_WEEK = 168;
const COMPLETENESS_THRESHOLD = 0.85;

/**
 * Calculate baseline for a household in a campaign.
 * Looks back from campaign.startsAt to find qualifying weeks.
 */
export async function calculateBaseline(
  campaignId: string,
  householdId: string,
): Promise<BaselineResult | null> {
  const campaign = await db.campaign.findUniqueOrThrow({
    where: { id: campaignId },
  });

  // Get all hourly consumption data for this household, ordered by timestamp
  const allIntervals = await db.consumptionInterval.findMany({
    where: {
      householdId,
      granularity: "HOUR",
    },
    orderBy: { timestamp: "asc" },
    select: { timestamp: true, kwh: true },
  });

  if (allIntervals.length === 0) return null;

  const startsAt = campaign.startsAt;

  // Define 4 week windows going backwards from campaign start
  const weeks: { start: Date; end: Date; intervals: { timestamp: Date; kwh: number }[] }[] = [];
  for (let w = 1; w <= 4; w++) {
    const weekEnd = new Date(startsAt);
    weekEnd.setDate(weekEnd.getDate() - (w - 1) * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 7);
    weeks.push({ start: weekStart, end: weekEnd, intervals: [] });
  }

  // Assign intervals to weeks
  for (const interval of allIntervals) {
    const ts = interval.timestamp;
    if (ts >= startsAt) continue; // skip challenge data
    for (const week of weeks) {
      if (ts >= week.start && ts < week.end) {
        week.intervals.push({
          timestamp: ts,
          kwh: Number(interval.kwh),
        });
        break;
      }
    }
  }

  // Check completeness per week
  const qualifiedWeeks = weeks.filter(
    (w) => w.intervals.length / HOURS_PER_WEEK >= COMPLETENESS_THRESHOLD,
  );

  let method: BaselineMethod;
  let comparisonWeeksCount: number;
  let limitedBaseline = false;

  if (qualifiedWeeks.length >= 4) {
    method = "LAST_4_WEEKS";
    comparisonWeeksCount = 4;
  } else if (qualifiedWeeks.length >= 2) {
    method = "LAST_2_WEEKS";
    comparisonWeeksCount = qualifiedWeeks.length;
  } else if (qualifiedWeeks.length >= 1) {
    method = "MODELED";
    comparisonWeeksCount = qualifiedWeeks.length;
    limitedBaseline = true;
  } else {
    // Check for DAY-granularity fallback
    const dayIntervals = await db.consumptionInterval.findMany({
      where: {
        householdId,
        granularity: "DAY",
        timestamp: { lt: startsAt },
      },
      orderBy: { timestamp: "asc" },
      select: { timestamp: true, kwh: true },
    });

    if (dayIntervals.length >= 6) {
      // Use daily data as modeled baseline
      const totalDayKwh = dayIntervals
        .slice(-7)
        .reduce((sum, d) => sum + Number(d.kwh), 0);
      const avgDailyKwh = totalDayKwh / Math.min(dayIntervals.length, 7);

      return {
        method: "MODELED",
        baselineKwh: Number((avgDailyKwh * 7).toFixed(4)),
        baselinePeakKwh: Number((avgDailyKwh * 0.3).toFixed(4)), // estimate 30% is peak
        comparisonWeeksCount: 0,
        limitedBaseline: true,
        dataCompletenessScore: Number(
          ((dayIntervals.length / 28) * 100).toFixed(2),
        ),
        sameWeekLastYearKwh: null,
      };
    }

    return null; // not enough data
  }

  // Calculate baseline from qualified weeks
  const usedWeeks = qualifiedWeeks.slice(0, comparisonWeeksCount);
  const weekTotals = usedWeeks.map((w) =>
    w.intervals.reduce((sum, i) => sum + i.kwh, 0),
  );
  const baselineKwh = weekTotals.reduce((a, b) => a + b, 0) / weekTotals.length;

  // Peak hours: 17:00-20:59
  const peakTotals = usedWeeks.map((w) =>
    w.intervals
      .filter((i) => {
        const h = i.timestamp.getHours();
        return h >= 17 && h <= 20;
      })
      .reduce((sum, i) => sum + i.kwh, 0),
  );
  const baselinePeakKwh = peakTotals.reduce((a, b) => a + b, 0) / peakTotals.length;

  // Overall data completeness
  const totalIntervals = usedWeeks.reduce((sum, w) => sum + w.intervals.length, 0);
  const maxExpected = comparisonWeeksCount * HOURS_PER_WEEK;
  const dataCompletenessScore = (totalIntervals / maxExpected) * 100;

  // Same week last year (look for data ~52 weeks before challenge start)
  let sameWeekLastYearKwh: number | null = null;
  const lastYearStart = new Date(startsAt);
  lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
  const lastYearEnd = new Date(lastYearStart);
  lastYearEnd.setDate(lastYearEnd.getDate() + 7);

  const lastYearIntervals = allIntervals.filter(
    (i) => i.timestamp >= lastYearStart && i.timestamp < lastYearEnd,
  );
  if (lastYearIntervals.length / HOURS_PER_WEEK >= 0.5) {
    sameWeekLastYearKwh = lastYearIntervals.reduce(
      (sum, i) => sum + Number(i.kwh),
      0,
    );
  }

  return {
    method,
    baselineKwh: Number(baselineKwh.toFixed(4)),
    baselinePeakKwh: Number(baselinePeakKwh.toFixed(4)),
    comparisonWeeksCount,
    limitedBaseline,
    dataCompletenessScore: Number(dataCompletenessScore.toFixed(2)),
    sameWeekLastYearKwh: sameWeekLastYearKwh
      ? Number(sameWeekLastYearKwh.toFixed(4))
      : null,
  };
}

/**
 * Run baseline calculation for all connected households in a campaign
 * and persist results as BaselineSnapshot.
 */
export async function calculateAllBaselines(campaignId: string) {
  const campaign = await db.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: {
      tenant: {
        include: {
          households: {
            where: { deletedAt: null },
            include: {
              meterConnections: { where: { status: "CONNECTED" } },
            },
          },
        },
      },
    },
  });

  const connectedHouseholds = campaign.tenant.households.filter(
    (h) => h.meterConnections.length > 0,
  );

  let processed = 0;
  for (const household of connectedHouseholds) {
    const result = await calculateBaseline(campaignId, household.id);
    if (!result) continue;

    await db.baselineSnapshot.upsert({
      where: {
        campaignId_householdId: {
          campaignId,
          householdId: household.id,
        },
      },
      update: {
        method: result.method,
        baselineKwh: result.baselineKwh,
        baselinePeakKwh: result.baselinePeakKwh,
        comparisonWeeksCount: result.comparisonWeeksCount,
        limitedBaseline: result.limitedBaseline,
        dataCompletenessScore: result.dataCompletenessScore,
        sameWeekLastYearKwh: result.sameWeekLastYearKwh,
        calculatedAt: new Date(),
      },
      create: {
        campaignId,
        householdId: household.id,
        method: result.method,
        baselineKwh: result.baselineKwh,
        baselinePeakKwh: result.baselinePeakKwh,
        comparisonWeeksCount: result.comparisonWeeksCount,
        limitedBaseline: result.limitedBaseline,
        dataCompletenessScore: result.dataCompletenessScore,
        sameWeekLastYearKwh: result.sameWeekLastYearKwh,
      },
    });
    processed++;
  }

  return { processed, total: connectedHouseholds.length };
}
