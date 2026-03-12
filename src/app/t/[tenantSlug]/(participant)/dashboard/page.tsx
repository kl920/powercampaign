import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { Zap, Banknote, Leaf, Trophy, Clock, TrendingDown } from "lucide-react";
import { DailyChart } from "@/components/dashboard/daily-chart";
import { ShiftVisualization } from "@/components/dashboard/shift-visualization";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const session = await getSession();
  if (!session.userId) redirect(`/t/${tenantSlug}/auth/login`);

  // Find household for current user
  const household = await db.household.findFirst({
    where: {
      ownerUserId: session.userId,
      tenant: { slug: tenantSlug },
      deletedAt: null,
    },
  });

  if (!household) {
    redirect(`/t/${tenantSlug}/onboarding`);
  }

  // Find active/completed campaign
  const campaign = await db.campaign.findFirst({
    where: {
      tenantId: household.tenantId,
      status: { in: ["LIVE", "COMPLETED"] },
    },
    orderBy: { startsAt: "desc" },
  });

  if (!campaign) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Ingen aktiv kampagne endnu" />
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Der er ingen aktiv kampagne lige nu. Tjek tilbage snart!
        </div>
      </div>
    );
  }

  // Get challenge result and baseline
  const [challengeResult, baseline, leaderboardEntry, totalParticipants] =
    await Promise.all([
      db.challengeResult.findUnique({
        where: {
          campaignId_householdId: {
            campaignId: campaign.id,
            householdId: household.id,
          },
        },
      }),
      db.baselineSnapshot.findUnique({
        where: {
          campaignId_householdId: {
            campaignId: campaign.id,
            householdId: household.id,
          },
        },
      }),
      db.leaderboardEntry.findFirst({
        where: {
          campaignId: campaign.id,
          householdId: household.id,
          leaderboardType: "GLOBAL",
        },
      }),
      db.leaderboardEntry.count({
        where: {
          campaignId: campaign.id,
          leaderboardType: "GLOBAL",
        },
      }),
    ]);

  // Get daily chart data
  const dailyData = await getDailyChartData(campaign.id, household.id, campaign.startsAt, campaign.endsAt, baseline ? Number(baseline.baselineKwh) : 0);

  const savingKwh = challengeResult ? Number(challengeResult.savingKwh) : 0;
  const savingPercent = challengeResult ? Number(challengeResult.savingPercent) : 0;
  const dkkSaved = challengeResult ? Number(challengeResult.estimatedDkkSaved) : 0;
  const co2Saved = challengeResult ? Number(challengeResult.estimatedCo2Saved) : 0;
  const rank = leaderboardEntry?.rank;

  const isPositive = savingKwh > 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={campaign.name}
        gradient
      />

      {/* Status message */}
      {challengeResult && (
        <div
          className={`mb-6 glass-card p-4 ${
            isPositive
              ? "border-energy-green/30 text-energy-green"
              : "border-energy-amber/30 text-energy-amber"
          }`}
        >
          {isPositive
            ? `🎉 Du har sparet ${savingKwh.toFixed(1)} kWh (${savingPercent.toFixed(1)}%) i challenge-ugen!`
            : `📊 Dit forbrug steg ${Math.abs(savingPercent).toFixed(1)}% denne uge. Næste gang klarer du det bedre!`}
        </div>
      )}

      {baseline?.limitedBaseline && (
        <div className="mb-6 glass-card border-energy-blue/30 p-4 text-energy-blue">
          ⚠️ Du er med, men vi mangler nok historik til en fuld baseline.
          Dine resultater er estimerede.
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="kWh sparet"
          value={`${savingKwh.toFixed(1)} kWh`}
          icon={<Zap className="h-5 w-5" />}
          trend={isPositive ? "up" : "down"}
          trendValue={`${Math.abs(savingPercent).toFixed(1)}%`}
          accent="green"
        />
        <StatCard
          title="Kr. sparet"
          value={`${dkkSaved.toFixed(2)} kr`}
          icon={<Banknote className="h-5 w-5" />}
          trend={isPositive ? "up" : "down"}
          accent="blue"
        />
        <StatCard
          title="CO₂ sparet"
          value={`${co2Saved.toFixed(3)} kg`}
          icon={<Leaf className="h-5 w-5" />}
          trend={isPositive ? "up" : "down"}
          accent="amber"
        />
        <StatCard
          title="Placering"
          value={rank ? `#${rank} af ${totalParticipants}` : "Ikke rangeret"}
          icon={<Trophy className="h-5 w-5" />}
        />
      </div>

      {/* Daily Chart */}
      <div className="mt-6 glass-card p-6">
        <h3 className="mb-4 font-semibold">Dagligt forbrug: Baseline vs. Challenge</h3>
        <DailyChart data={dailyData} />
      </div>

      {/* Spar + Flyt */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Spar-score */}
        <div className="glass-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-energy-blue/10 text-energy-blue">
              <TrendingDown className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dimension 1</p>
              <h3 className="font-bold">Spar strøm</h3>
            </div>
          </div>
          <div className="mb-2 flex items-end justify-between">
            <span className="text-3xl font-black text-energy-green">
              {isPositive ? `−${savingPercent.toFixed(1)}%` : `+${Math.abs(savingPercent).toFixed(1)}%`}
            </span>
            <span className="text-sm text-muted-foreground">vs. din baseline</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-energy-green transition-all"
              style={{ width: `${Math.min(100, Math.max(0, savingPercent))}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {isPositive
              ? `Du har sparet ${savingKwh.toFixed(1)} kWh og ${dkkSaved.toFixed(0)} kr. i denne challenge-uge.`
              : "Prøv at slukke standby, undgå tørretumbler og sæt termostaten 1 grad ned."}
          </p>
        </div>

        {/* Flyt-score */}
        <div className="glass-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
              <Clock className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dimension 2</p>
              <h3 className="font-bold">Flyt forbruget</h3>
            </div>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Placer dit forbrug i de billige, grønne timer. Kør vaskemaskinen om natten eller midt på dagen.
          </p>
          {/* 24-timers tidslinje */}
          <div className="flex gap-px overflow-hidden rounded-lg h-7">
            {Array.from({ length: 24 }, (_, h) => {
              const color =
                h < 6
                  ? "#22C55E"
                  : h < 8
                    ? "#F59E0B"
                    : h < 15
                      ? "#22C55E"
                      : h < 21
                        ? "#EF4444"
                        : "#F59E0B";
              return (
                <div
                  key={h}
                  className="flex-1"
                  style={{ background: color, opacity: 0.7 }}
                  title={`Kl. ${h.toString().padStart(2, "0")}:00`}
                />
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs">
            <span className="flex items-center gap-1 text-green-500"><span className="h-2 w-2 rounded-full bg-green-500"/>Billig &amp; grøn</span>
            <span className="flex items-center gap-1 text-amber-500"><span className="h-2 w-2 rounded-full bg-amber-500"/>Middel</span>
            <span className="flex items-center gap-1 text-red-500"><span className="h-2 w-2 rounded-full bg-red-500"/>Peak — dyr</span>
          </div>
        </div>
      </div>

      {/* Shift visualization */}
      <ShiftVisualization />

      {/* Top 5 leaderboard preview */}
      <div className="mt-6 glass-card p-6">
        <h3 className="mb-4 font-semibold">Top 5</h3>
        <TopFivePreview campaignId={campaign.id} myHouseholdId={household.id} />
      </div>
    </div>
  );
}

async function getDailyChartData(
  campaignId: string,
  householdId: string,
  startsAt: Date,
  endsAt: Date,
  baselineWeeklyKwh: number,
) {
  const intervals = await db.consumptionInterval.findMany({
    where: {
      householdId,
      granularity: "HOUR",
      timestamp: { gte: startsAt, lt: endsAt },
    },
    select: { timestamp: true, kwh: true },
  });

  const dailyBaselineKwh = baselineWeeklyKwh / 7;
  const dayNames = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];

  // Group by day
  const dailyMap = new Map<string, number>();
  for (const interval of intervals) {
    const dateKey = interval.timestamp.toISOString().slice(0, 10);
    dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + Number(interval.kwh));
  }

  // Sort by date and map to chart data
  return Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateStr, kwh]) => ({
      day: dayNames[new Date(dateStr).getDay()],
      challenge: Number(kwh.toFixed(1)),
      baseline: Number(dailyBaselineKwh.toFixed(1)),
    }));
}

async function TopFivePreview({
  campaignId,
  myHouseholdId,
}: {
  campaignId: string;
  myHouseholdId: string;
}) {
  const entries = await db.leaderboardEntry.findMany({
    where: { campaignId, leaderboardType: "GLOBAL" },
    orderBy: { rank: "asc" },
    take: 5,
    include: {
      household: {
        select: {
          id: true,
          ownerUser: { select: { name: true } },
        },
      },
    },
  });

  if (entries.length === 0) {
    return <p className="text-muted-foreground">Ingen rangerede deltagere endnu.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const isMe = entry.householdId === myHouseholdId;
        const firstName = entry.household.ownerUser.name.split(" ")[0];
        return (
          <div
            key={entry.id}
            className={`flex items-center justify-between rounded-lg px-4 py-2 ${
              isMe ? "bg-primary/10 font-medium" : "hover:bg-muted/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-8 text-center text-sm font-bold text-muted-foreground">
                #{entry.rank}
              </span>
              <span>
                {firstName}
                {isMe && " (dig)"}
              </span>
            </div>
            <span className="text-sm font-medium">
              {Number(entry.score).toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
