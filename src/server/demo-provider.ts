import { db as defaultDb } from "@/lib/db";
import type { PrismaClient } from "@prisma/client";
import type { HousingType } from "@prisma/client";

// Hourly base profiles (kWh per hour) by housing type
const BASE_PROFILES: Record<HousingType, number> = {
  APARTMENT: 0.35,
  HOUSE: 0.55,
  TOWNHOUSE: 0.45,
  OTHER: 0.40,
};

// Hour-of-day multipliers (0-23) for weekday
const WEEKDAY_PATTERN = [
  0.3, 0.25, 0.2, 0.2, 0.25, 0.4, // 00-05: sleep
  0.8, 1.2, 1.0, 0.7, 0.6, 0.6,   // 06-11: morning peak
  0.65, 0.6, 0.6, 0.7, 0.9, 1.4,  // 12-17: afternoon → evening ramp
  1.5, 1.4, 1.2, 0.9, 0.6, 0.4,   // 18-23: evening peak → wind down
];

// Weekend: flatter morning, higher daytime
const WEEKEND_PATTERN = [
  0.3, 0.25, 0.2, 0.2, 0.25, 0.3, // 00-05
  0.5, 0.7, 0.9, 1.0, 1.0, 0.95,  // 06-11: later, gentler morning
  0.9, 0.85, 0.8, 0.85, 0.95, 1.3, // 12-17
  1.4, 1.3, 1.1, 0.9, 0.6, 0.4,   // 18-23
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

interface GenerateOptions {
  householdId: string;
  meterPointId: string;
  housingType: HousingType;
  householdSize: number;
  floorAreaM2: number;
  weeksOfHistory: number;
  challengeStartDate: Date;
  challengeDays: number;
  savingFactor: number; // 0.0 = no change, 0.15 = 15% savings, -0.1 = 10% increase
  seed: number;
}

export async function generateConsumptionData(opts: GenerateOptions, prismaClient?: PrismaClient) {
  const db = prismaClient ?? defaultDb;
  const {
    meterPointId,
    housingType,
    householdSize,
    floorAreaM2,
    weeksOfHistory,
    challengeStartDate,
    challengeDays,
    savingFactor,
    seed,
  } = opts;

  const rng = seededRandom(seed);

  // Calculate household-specific base consumption
  const typeBase = BASE_PROFILES[housingType];
  const sizeMultiplier = 1 + (householdSize - 1) * 0.15; // +15% per extra person
  const areaMultiplier = floorAreaM2 / 100; // normalize to 100m²
  const householdVariation = 0.85 + rng() * 0.3; // ±15%
  const baseKwh = typeBase * sizeMultiplier * areaMultiplier * householdVariation;

  const intervals: {
    householdId: string;
    meterPointId: string;
    timestamp: Date;
    kwh: number;
    granularity: "HOUR";
    source: "DEMO";
  }[] = [];

  // Historical data: weeksOfHistory weeks before challenge start
  const historyStart = new Date(challengeStartDate);
  historyStart.setDate(historyStart.getDate() - weeksOfHistory * 7);

  // Generate hour-by-hour from historyStart to challengeStart + challengeDays
  const totalEnd = new Date(challengeStartDate);
  totalEnd.setDate(totalEnd.getDate() + challengeDays);

  let current = new Date(historyStart);
  while (current < totalEnd) {
    const hour = current.getHours();
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isChallenge = current >= challengeStartDate;

    const pattern = isWeekend ? WEEKEND_PATTERN : WEEKDAY_PATTERN;
    const multiplier = pattern[hour];

    // Random noise per hour (±20%)
    const noise = 0.8 + rng() * 0.4;

    let kwh = baseKwh * multiplier * noise;

    // Apply saving factor during challenge period
    if (isChallenge) {
      // Savings vary by hour — more during peak, less at night
      const peakBonus = hour >= 17 && hour <= 20 ? 1.3 : 1.0;
      kwh *= 1 - savingFactor * peakBonus;

      // Additional daily variation in challenge effort
      const dayVariation = 0.9 + rng() * 0.2;
      kwh *= dayVariation;
    }

    // Clamp to non-negative
    kwh = Math.max(0.01, kwh);

    intervals.push({
      householdId: opts.householdId,
      meterPointId,
      timestamp: new Date(current),
      kwh: Number(kwh.toFixed(3)),
      granularity: "HOUR" as const,
      source: "DEMO" as const,
    });

    current = new Date(current.getTime() + 60 * 60 * 1000); // +1 hour
  }

  // Batch insert
  await db.consumptionInterval.createMany({ data: intervals });

  return { intervalsCreated: intervals.length };
}

export async function connectDemoHousehold(householdId: string) {
  const household = await defaultDb.household.findUniqueOrThrow({
    where: { id: householdId },
    include: { meterConnections: true },
  });

  // Create meter connection if none exists
  let connection = household.meterConnections[0];
  if (!connection) {
    connection = await defaultDb.meterConnection.create({
      data: {
        householdId,
        providerType: "DEMO",
        status: "CONNECTED",
        consentGrantedAt: new Date(),
        lastSyncedAt: new Date(),
      },
    });
  } else {
    connection = await defaultDb.meterConnection.update({
      where: { id: connection.id },
      data: { status: "CONNECTED", consentGrantedAt: new Date(), lastSyncedAt: new Date() },
    });
  }

  // Create meter point if none exists
  let meterPoint = await defaultDb.meterPoint.findFirst({
    where: { meterConnectionId: connection.id },
  });
  if (!meterPoint) {
    meterPoint = await defaultDb.meterPoint.create({
      data: {
        meterConnectionId: connection.id,
        externalMeterId: `DEMO-${householdId.slice(0, 8)}`,
      },
    });
  }

  return { connection, meterPoint };
}

export async function revokeDemoConnection(householdId: string) {
  await defaultDb.meterConnection.updateMany({
    where: { householdId },
    data: { status: "REVOKED", consentRevokedAt: new Date() },
  });
}
