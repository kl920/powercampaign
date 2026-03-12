import "dotenv/config";
import { PrismaClient, type HousingType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcrypt";
import { generateConsumptionData } from "../src/server/demo-provider";
import { calculateAllBaselines } from "../src/server/baseline";
import { scoreAllHouseholds } from "../src/server/scoring";
import { rebuildGlobalLeaderboard } from "../src/server/leaderboard";
import { evaluateBadges } from "../src/server/badges";

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL!;

const pool = new pg.Pool({ connectionString, max: 1 });

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

// ─── Archetypes ───────────────────────────────────────────────────────────────

interface Archetype {
  label: string;
  savingFactor: number; // positive = saving, negative = increase
  weeksOfHistory: number;
  connectionStatus: "CONNECTED" | "PENDING" | "FAILED" | "REVOKED";
  eligible: boolean;
}

const ARCHETYPES: Archetype[] = [
  // 12 Normal savers (5-15% saving)
  ...Array.from({ length: 12 }, (_, i) => ({
    label: "Normal",
    savingFactor: 0.05 + (i * 0.01),
    weeksOfHistory: 8,
    connectionStatus: "CONNECTED" as const,
    eligible: true,
  })),
  // 6 Strong savers (18-28%)
  ...Array.from({ length: 6 }, (_, i) => ({
    label: "StrongSaver",
    savingFactor: 0.18 + (i * 0.02),
    weeksOfHistory: 8,
    connectionStatus: "CONNECTED" as const,
    eligible: true,
  })),
  // 4 No improvement / slight increase
  ...Array.from({ length: 4 }, (_, i) => ({
    label: "NoImprovement",
    savingFactor: -0.05 - (i * 0.03),
    weeksOfHistory: 8,
    connectionStatus: "CONNECTED" as const,
    eligible: true,
  })),
  // 3 Limited baseline (only 1 week of history)
  ...Array.from({ length: 3 }, () => ({
    label: "LimitedBaseline",
    savingFactor: 0.10,
    weeksOfHistory: 1,
    connectionStatus: "CONNECTED" as const,
    eligible: false, // not enough baseline data
  })),
  // 2 Pending connection
  {
    label: "Pending",
    savingFactor: 0,
    weeksOfHistory: 0,
    connectionStatus: "PENDING" as const,
    eligible: false,
  },
  {
    label: "Pending",
    savingFactor: 0,
    weeksOfHistory: 0,
    connectionStatus: "PENDING" as const,
    eligible: false,
  },
  // 1 Failed connection
  {
    label: "Failed",
    savingFactor: 0,
    weeksOfHistory: 0,
    connectionStatus: "FAILED" as const,
    eligible: false,
  },
  // 1 Revoked
  {
    label: "Revoked",
    savingFactor: 0,
    weeksOfHistory: 0,
    connectionStatus: "REVOKED" as const,
    eligible: false,
  },
  // 1 Recent mover
  {
    label: "RecentMover",
    savingFactor: 0.08,
    weeksOfHistory: 2,
    connectionStatus: "CONNECTED" as const,
    eligible: true,
  },
];

// ─── Household generators ─────────────────────────────────────────────────────

const POSTAL_CODES = [
  "2100", "2200", "2300", "2400", "2500", "2600", "2700", "2800",
  "2900", "3000", "4000", "5000", "6000", "7000", "8000", "9000",
];
const HOUSING_TYPES: HousingType[] = ["APARTMENT", "HOUSE", "TOWNHOUSE", "OTHER"];
const FIRST_NAMES = [
  "Anna", "Peter", "Marie", "Lars", "Sofie", "Jens", "Katrine", "Anders",
  "Louise", "Thomas", "Mette", "Henrik", "Camilla", "Rasmus", "Ida", "Martin",
  "Line", "Christian", "Nanna", "Mikkel", "Emma", "Frederik", "Signe", "Jakob",
  "Karen", "Nikolaj", "Julie", "Magnus", "Pia", "Jonas",
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

async function main() {
  console.log("🌱 Starting seed...\n");

  // Clean existing data (sequential to avoid connection pool exhaustion)
  await prisma.notificationLog.deleteMany();
  await prisma.exportJob.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.consentRecord.deleteMany();
  await prisma.leaderboardEntry.deleteMany();
  await prisma.challengeResult.deleteMany();
  await prisma.baselineSnapshot.deleteMany();
  await prisma.consumptionInterval.deleteMany();
  await prisma.meterPoint.deleteMany();
  await prisma.meterConnection.deleteMany();
  await prisma.missionCompletion.deleteMany();
  await prisma.mission.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.reward.deleteMany();
  await prisma.groupMembership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.householdMember.deleteMany();
  await prisma.household.deleteMany();
  await prisma.tenantMembership.deleteMany();
  await prisma.tenantBranding.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // ─── Tenant ──────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.create({
    data: {
      name: "GrønStrøm Energi",
      slug: "gronstrom",
      status: "ACTIVE",
      branding: {
        create: {
          primaryColor: "#0F766E",
          secondaryColor: "#F59E0B",
          headline: "Spar strøm. Vind præmier.",
          subheadline: "7 dages energi-challenge for en grønnere fremtid",
          supportEmail: "support@gronstrom.dk",
        },
      },
    },
  });
  console.log(`✅ Tenant: ${tenant.name} (${tenant.slug})`);

  // ─── Admin users ────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin123!", 12);

  const superAdmin = await prisma.user.create({
    data: {
      name: "Super Admin",
      email: "super@powercampaign.dk",
      passwordHash: adminHash,
      onboardingCompletedAt: new Date(),
    },
  });
  await prisma.tenantMembership.create({
    data: { userId: superAdmin.id, tenantId: tenant.id, role: "SUPER_ADMIN" },
  });

  const tenantAdmin = await prisma.user.create({
    data: {
      name: "Tenant Admin",
      email: "admin@gronstrom.dk",
      passwordHash: adminHash,
      onboardingCompletedAt: new Date(),
    },
  });
  await prisma.tenantMembership.create({
    data: { userId: tenantAdmin.id, tenantId: tenant.id, role: "TENANT_ADMIN" },
  });
  console.log("✅ Admin users created");

  // ─── Campaign ────────────────────────────────────────────────────────
  // LIVE campaign: started 3 days ago, ends 4 days from now (7-day challenge)
  const now = new Date();
  const challengeStart = new Date(now);
  challengeStart.setDate(challengeStart.getDate() - 3);
  challengeStart.setHours(0, 0, 0, 0);

  const challengeEnd = new Date(challengeStart);
  challengeEnd.setDate(challengeEnd.getDate() + 7);

  const campaign = await prisma.campaign.create({
    data: {
      tenantId: tenant.id,
      name: "Forårschallenge 2026",
      slug: "foraar-2026",
      description: "Spar strøm i 7 dage og vind fantastiske præmier!",
      status: "LIVE",
      startsAt: challengeStart,
      endsAt: challengeEnd,
      baselineMethodDefault: "LAST_4_WEEKS",
      co2FactorKgPerKwh: 0.085,
      estimatedPricePerKwhDkk: 2.35,
    },
  });
  console.log(`✅ Campaign: ${campaign.name} (${campaign.status}) — ${challengeStart.toDateString()} → ${challengeEnd.toDateString()}`);

  // ─── Badges (Fase 2 read-only) ──────────────────────────────────────
  const badges = await Promise.all([
    prisma.badge.create({
      data: { code: "saver-10", title: "Sparer 10 %", description: "Sparede mindst 10 % af din baseline", iconKey: "zap" },
    }),
    prisma.badge.create({
      data: { code: "saver-20", title: "Sparer 20 %", description: "Sparede mindst 20 % af din baseline", iconKey: "zap" },
    }),
    prisma.badge.create({
      data: { code: "saver-30", title: "Sparer 30 %", description: "Sparede mindst 30 % af din baseline", iconKey: "zap" },
    }),
    prisma.badge.create({
      data: { code: "night-saver", title: "Natspar", description: "Reducerede peak-forbruget med over 15 %", iconKey: "moon" },
    }),
    prisma.badge.create({
      data: { code: "co2-hero", title: "CO\u2082-helt", description: "Sparede mindst 1 kg CO\u2082", iconKey: "leaf" },
    }),
    prisma.badge.create({
      data: { code: "top-10", title: "Top 10", description: "Placerede dig i top 10 % p\u00e5 ranglisten", iconKey: "crown" },
    }),
    prisma.badge.create({
      data: { code: "streak-7", title: "7-dages streak", description: "Sparede str\u00f8m konsekvent alle 7 dage", iconKey: "flame" },
    }),
  ]);

  // ─── Missions (Fase 2 read-only) ────────────────────────────────────
  const missions = await Promise.all([
    prisma.mission.create({
      data: {
        campaignId: campaign.id,
        title: "Sluk standby",
        description: "Sluk alle standby-apparater i 24 timer",
        type: "SELF_REPORTED",
        points: 50,
      },
    }),
    prisma.mission.create({
      data: {
        campaignId: campaign.id,
        title: "Energi-quiz",
        description: "Besvar 5 spørgsmål om energiforbrug",
        type: "EDUCATIONAL",
        points: 30,
      },
    }),
    prisma.mission.create({
      data: {
        campaignId: campaign.id,
        title: "Peak-undgåer",
        description: "Hold dit forbrug under baseline i peak-timer (17-21)",
        type: "DATA_DRIVEN",
        points: 100,
      },
    }),
  ]);

  // ─── Rewards (Fase 2 read-only) ─────────────────────────────────────
  await prisma.reward.createMany({
    data: [
      { campaignId: campaign.id, title: "Philips Hue Starterkit", criteriaType: "TOP_RANK", quantity: 3 },
      { campaignId: campaign.id, title: "Gavekort 500 kr", criteriaType: "RANDOM_DRAW", quantity: 10 },
    ],
  });

  // ─── Participants (30 households) ────────────────────────────────────
  const rng = seededRandom(42);
  const participantHash = await bcrypt.hash("test1234", 12);

  console.log("\n🏠 Creating 30 households with consumption data...");

  for (let i = 0; i < 30; i++) {
    const archetype = ARCHETYPES[i];
    const name = FIRST_NAMES[i];
    const email = `${name.toLowerCase()}${i}@demo.dk`;
    const postalCode = POSTAL_CODES[Math.floor(rng() * POSTAL_CODES.length)];
    const housingType = HOUSING_TYPES[Math.floor(rng() * HOUSING_TYPES.length)];
    const householdSize = Math.floor(rng() * 4) + 1;
    const floorAreaM2 = 40 + Math.floor(rng() * 160);

    // Determine movedInAt based on archetype
    const movedInAt = archetype.label === "RecentMover"
      ? new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000) // 20 days ago
      : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000 - rng() * 730 * 24 * 60 * 60 * 1000);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: `${name} Demo`,
        email,
        passwordHash: participantHash,
        onboardingCompletedAt: archetype.connectionStatus === "CONNECTED" ? new Date() : null,
      },
    });

    await prisma.tenantMembership.create({
      data: { userId: user.id, tenantId: tenant.id, role: "PARTICIPANT" },
    });

    // Consents
    await prisma.consentRecord.createMany({
      data: [
        {
          userId: user.id,
          tenantId: tenant.id,
          consentType: "PARTICIPATION",
          version: "1.0",
          accepted: true,
          acceptedAt: new Date(),
        },
        {
          userId: user.id,
          tenantId: tenant.id,
          consentType: "DATA_ACCESS",
          version: "1.0",
          accepted: archetype.connectionStatus === "CONNECTED",
          acceptedAt: new Date(),
        },
        {
          userId: user.id,
          tenantId: tenant.id,
          consentType: "MARKETING",
          version: "1.0",
          accepted: rng() > 0.4,
          acceptedAt: new Date(),
        },
      ],
    });

    // Household
    const household = await prisma.household.create({
      data: {
        tenantId: tenant.id,
        ownerUserId: user.id,
        postalCode,
        housingType,
        householdSize,
        floorAreaM2,
        movedInAt,
      },
    });

    // HouseholdMember
    await prisma.householdMember.create({
      data: {
        householdId: household.id,
        userId: user.id,
        roleLabel: "Ejer",
      },
    });

    // Meter connection
    const connection = await prisma.meterConnection.create({
      data: {
        householdId: household.id,
        providerType: "DEMO",
        status: archetype.connectionStatus,
        consentGrantedAt: archetype.connectionStatus === "CONNECTED" ? new Date() : null,
        consentRevokedAt: archetype.connectionStatus === "REVOKED" ? new Date() : null,
        lastSyncedAt: archetype.connectionStatus === "CONNECTED" ? new Date() : null,
      },
    });

    // Generate consumption data only for connected households
    if (archetype.weeksOfHistory > 0 && archetype.connectionStatus === "CONNECTED") {
      const meterPoint = await prisma.meterPoint.create({
        data: {
          meterConnectionId: connection.id,
          externalMeterId: `DEMO-${household.id.slice(0, 8)}`,
        },
      });

      await generateConsumptionData({
        householdId: household.id,
        meterPointId: meterPoint.id,
        housingType,
        householdSize,
        floorAreaM2,
        weeksOfHistory: archetype.weeksOfHistory,
        challengeStartDate: challengeStart,
        challengeDays: 7,
        savingFactor: archetype.savingFactor,
        seed: 1000 + i,
      }, prisma);

      // Assign badges randomly to some connected households (Fase 2 read-only)
      if (archetype.eligible && rng() > 0.5) {
        const badgeIndex = Math.floor(rng() * badges.length);
        await prisma.userBadge.create({
          data: {
            badgeId: badges[badgeIndex].id,
            householdId: household.id,
          },
        }).catch(() => { /* ignore duplicate */ });
      }

      // Mission completions for some households
      if (archetype.eligible && rng() > 0.6) {
        const missionIndex = Math.floor(rng() * missions.length);
        await prisma.missionCompletion.create({
          data: {
            missionId: missions[missionIndex].id,
            householdId: household.id,
          },
        }).catch(() => { /* ignore duplicate */ });
      }
    }

    const icon = archetype.connectionStatus === "CONNECTED" ? "✅" : "⏳";
    process.stdout.write(`${icon}`);
  }

  console.log("\n\n📊 Seed complete! Summary:");
  console.log(`   Tenant: ${tenant.slug}`);
  console.log(`   Campaign: ${campaign.slug} (${campaign.status})`);
  console.log(`   Households: 30`);
  console.log(`   Admin login: admin@gronstrom.dk / admin123!`);
  console.log(`   Super admin: super@powercampaign.dk / admin123!`);
  console.log(`   Participant: anna0@demo.dk / test1234`);

  // ─── Run calculation engines ─────────────────────────────────────────
  console.log("\n⚙️  Running baseline, scoring, leaderboard & badges...");
  const baselineResult = await calculateAllBaselines(campaign.id);
  console.log(`   Baselines: ${baselineResult.processed} processed`);
  const scoringResult = await scoreAllHouseholds(campaign.id);
  console.log(`   Scores: ${scoringResult.processed} processed`);
  const leaderboardResult = await rebuildGlobalLeaderboard(campaign.id);
  console.log(`   Leaderboard: ${leaderboardResult.entries} entries`);
  const badgeResult = await evaluateBadges(campaign.id);
  console.log(`   Badges: ${badgeResult.awarded} awarded`);
  console.log("\n✅ All done — dashboard is live!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
