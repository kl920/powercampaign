import { db } from "@/lib/db";

interface ScoringResult {
  challengeKwh: number;
  savingKwh: number;
  savingPercent: number;
  estimatedDkkSaved: number;
  estimatedCo2Saved: number;
  peakHourReductionPercent: number | null;
  consistencyScore: number;
  challengeDataCompleteness: number;
  eligible: boolean;
  anomalyFlag: boolean;
  anomalyReason: string | null;
}

const HOURS_IN_CHALLENGE = 168; // 7 days * 24 hours
const COMPLETENESS_THRESHOLD = 0.85;

/**
 * Score a single household for a campaign.
 * Requires a BaselineSnapshot to already exist.
 */
export async function scoreHousehold(
  campaignId: string,
  householdId: string,
): Promise<ScoringResult | null> {
  const campaign = await db.campaign.findUniqueOrThrow({
    where: { id: campaignId },
  });

  const baseline = await db.baselineSnapshot.findUnique({
    where: {
      campaignId_householdId: { campaignId, householdId },
    },
  });
  if (!baseline) return null;

  // Get challenge-week consumption
  const challengeIntervals = await db.consumptionInterval.findMany({
    where: {
      householdId,
      granularity: "HOUR",
      timestamp: {
        gte: campaign.startsAt,
        lt: campaign.endsAt,
      },
    },
    select: { timestamp: true, kwh: true },
  });

  if (challengeIntervals.length === 0) return null;

  // Challenge data completeness
  const challengeDataCompleteness =
    (challengeIntervals.length / HOURS_IN_CHALLENGE) * 100;

  // Total challenge consumption
  const challengeKwh = challengeIntervals.reduce(
    (sum, i) => sum + Number(i.kwh),
    0,
  );
  const baselineKwh = Number(baseline.baselineKwh);

  // Savings
  const savingKwh = baselineKwh - challengeKwh;
  const savingPercent =
    baselineKwh > 0 ? (savingKwh / baselineKwh) * 100 : 0;

  // Monetary and CO2
  const pricePerKwh = Number(campaign.estimatedPricePerKwhDkk);
  const co2Factor = Number(campaign.co2FactorKgPerKwh);
  const estimatedDkkSaved = Number((savingKwh * pricePerKwh).toFixed(2));
  const estimatedCo2Saved = Number((savingKwh * co2Factor).toFixed(6));

  // Peak hour reduction (17:00-20:59)
  let peakHourReductionPercent: number | null = null;
  if (baseline.baselinePeakKwh) {
    const challengePeakKwh = challengeIntervals
      .filter((i) => {
        const h = i.timestamp.getHours();
        return h >= 17 && h <= 20;
      })
      .reduce((sum, i) => sum + Number(i.kwh), 0);
    const baselinePeak = Number(baseline.baselinePeakKwh);
    if (baselinePeak > 0) {
      peakHourReductionPercent = Number(
        (((baselinePeak - challengePeakKwh) / baselinePeak) * 100).toFixed(4),
      );
    }
  }

  // Consistency: how many of the 7 days showed improvement
  const dailyMap = new Map<string, number>();
  for (const interval of challengeIntervals) {
    const dayKey = interval.timestamp.toISOString().slice(0, 10);
    dailyMap.set(dayKey, (dailyMap.get(dayKey) ?? 0) + Number(interval.kwh));
  }
  const baselineDailyAvg = baselineKwh / 7;
  let daysImproved = 0;
  for (const dayKwh of dailyMap.values()) {
    if (dayKwh < baselineDailyAvg) daysImproved++;
  }
  const consistencyScore = Number(
    ((daysImproved / Math.max(dailyMap.size, 1)) * 100).toFixed(2),
  );

  // Anomaly detection
  let anomalyFlag = false;
  let anomalyReason: string | null = null;

  if (challengeDataCompleteness < COMPLETENESS_THRESHOLD * 100) {
    anomalyFlag = true;
    anomalyReason = `Lav data-completeness: ${challengeDataCompleteness.toFixed(1)}%`;
  } else if (challengeKwh < baselineKwh * 0.1) {
    anomalyFlag = true;
    anomalyReason = "Forbruget er under 10% af baseline — usandsynligt lavt";
  } else if (savingPercent > 80) {
    anomalyFlag = true;
    anomalyReason = `Besparelse på ${savingPercent.toFixed(1)}% er usandsynligt høj`;
  }

  // Eligibility
  const eligible =
    !baseline.limitedBaseline &&
    challengeDataCompleteness >= COMPLETENESS_THRESHOLD * 100 &&
    !anomalyFlag;

  return {
    challengeKwh: Number(challengeKwh.toFixed(4)),
    savingKwh: Number(savingKwh.toFixed(4)),
    savingPercent: Number(savingPercent.toFixed(4)),
    estimatedDkkSaved,
    estimatedCo2Saved,
    peakHourReductionPercent,
    consistencyScore,
    challengeDataCompleteness: Number(challengeDataCompleteness.toFixed(2)),
    eligible,
    anomalyFlag,
    anomalyReason,
  };
}

/**
 * Run scoring for all households that have baselines.
 */
export async function scoreAllHouseholds(campaignId: string) {
  const baselines = await db.baselineSnapshot.findMany({
    where: { campaignId },
    select: { householdId: true },
  });

  let processed = 0;
  for (const { householdId } of baselines) {
    const result = await scoreHousehold(campaignId, householdId);
    if (!result) continue;

    await db.challengeResult.upsert({
      where: {
        campaignId_householdId: { campaignId, householdId },
      },
      update: {
        challengeKwh: result.challengeKwh,
        savingKwh: result.savingKwh,
        savingPercent: result.savingPercent,
        estimatedDkkSaved: result.estimatedDkkSaved,
        estimatedCo2Saved: result.estimatedCo2Saved,
        peakHourReductionPercent: result.peakHourReductionPercent,
        consistencyScore: result.consistencyScore,
        challengeDataCompleteness: result.challengeDataCompleteness,
        eligibleForMainLeaderboard: result.eligible,
        anomalyFlag: result.anomalyFlag,
        anomalyReason: result.anomalyReason,
        calculatedAt: new Date(),
      },
      create: {
        campaignId,
        householdId,
        challengeKwh: result.challengeKwh,
        savingKwh: result.savingKwh,
        savingPercent: result.savingPercent,
        estimatedDkkSaved: result.estimatedDkkSaved,
        estimatedCo2Saved: result.estimatedCo2Saved,
        peakHourReductionPercent: result.peakHourReductionPercent,
        consistencyScore: result.consistencyScore,
        challengeDataCompleteness: result.challengeDataCompleteness,
        eligibleForMainLeaderboard: result.eligible,
        anomalyFlag: result.anomalyFlag,
        anomalyReason: result.anomalyReason,
      },
    });
    processed++;
  }

  return { processed, total: baselines.length };
}
