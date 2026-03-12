import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Users, Zap, Banknote, Leaf, AlertTriangle, Trophy } from "lucide-react";
import { RecalculateButton } from "@/components/admin/recalculate-button";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const session = await getSession();
  if (!session.userId) redirect(`/t/${tenantSlug}/auth/login`);

  const tenant = await db.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) redirect("/");

  const campaign = await db.campaign.findFirst({
    where: {
      tenantId: tenant.id,
      status: { in: ["LIVE", "COMPLETED", "SCHEDULED"] },
    },
    orderBy: { startsAt: "desc" },
  });

  if (!campaign) {
    return (
      <div>
        <PageHeader title="Admin Dashboard" />
        <p className="text-muted-foreground">Ingen kampagne fundet.</p>
      </div>
    );
  }

  // Aggregate KPIs
  const [
    totalMembers,
    totalHouseholds,
    connectedHouseholds,
    challengeResults,
    anomalyCount,
    leaderboardCount,
    connectionStatuses,
  ] = await Promise.all([
    db.tenantMembership.count({
      where: { tenantId: tenant.id, role: "PARTICIPANT" },
    }),
    db.household.count({
      where: { tenantId: tenant.id, deletedAt: null },
    }),
    db.meterConnection.count({
      where: {
        household: { tenantId: tenant.id, deletedAt: null },
        status: "CONNECTED",
      },
    }),
    db.challengeResult.findMany({
      where: { campaignId: campaign.id },
      select: {
        savingKwh: true,
        savingPercent: true,
        estimatedDkkSaved: true,
        estimatedCo2Saved: true,
        anomalyFlag: true,
        eligibleForMainLeaderboard: true,
      },
    }),
    db.challengeResult.count({
      where: { campaignId: campaign.id, anomalyFlag: true },
    }),
    db.leaderboardEntry.count({
      where: { campaignId: campaign.id, leaderboardType: "GLOBAL" },
    }),
    db.meterConnection.groupBy({
      by: ["status"],
      where: { household: { tenantId: tenant.id, deletedAt: null } },
      _count: true,
    }),
  ]);

  const totalKwhSaved = challengeResults.reduce(
    (sum, r) => sum + Number(r.savingKwh),
    0,
  );
  const totalDkkSaved = challengeResults.reduce(
    (sum, r) => sum + Number(r.estimatedDkkSaved),
    0,
  );
  const totalCo2Saved = challengeResults.reduce(
    (sum, r) => sum + Number(r.estimatedCo2Saved),
    0,
  );
  const eligibleCount = challengeResults.filter(
    (r) => r.eligibleForMainLeaderboard,
  ).length;

  return (
    <div>
      <PageHeader title="Admin Dashboard" description={campaign.name} gradient>
        <RecalculateButton campaignId={campaign.id} />
      </PageHeader>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Tilmeldte"
          value={String(totalMembers)}
          icon={<Users className="h-5 w-5" />}
          accent="blue"
        />
        <StatCard
          title="Forbundne"
          value={String(connectedHouseholds)}
          subtitle={`af ${totalHouseholds} husstande`}
          icon={<Zap className="h-5 w-5" />}
          accent="green"
        />
        <StatCard
          title="Rangerede"
          value={String(leaderboardCount)}
          subtitle={`${eligibleCount} eligible`}
          icon={<Trophy className="h-5 w-5" />}
          accent="amber"
        />
        <StatCard
          title="Total kWh sparet"
          value={`${totalKwhSaved.toFixed(1)}`}
          icon={<Zap className="h-5 w-5" />}
          trend={totalKwhSaved > 0 ? "up" : "down"}
          accent="green"
        />
        <StatCard
          title="Total kr. sparet"
          value={`${totalDkkSaved.toFixed(0)} kr`}
          icon={<Banknote className="h-5 w-5" />}
          accent="blue"
        />
        <StatCard
          title="Total CO₂"
          value={`${totalCo2Saved.toFixed(1)} kg`}
          icon={<Leaf className="h-5 w-5" />}
          accent="amber"
        />
      </div>

      {/* Anomalies & Connection Status */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Anomalies */}
        <div className="glass-card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-energy-amber" />
            Anomalier
          </h3>
          {anomalyCount > 0 ? (
            <p>
              <span className="text-2xl font-bold text-energy-amber">
                {anomalyCount}
              </span>{" "}
              deltagere med anomali-flag
            </p>
          ) : (
            <p className="text-muted-foreground">Ingen anomalier fundet.</p>
          )}
        </div>

        {/* Connection statuses */}
        <div className="glass-card p-6">
          <h3 className="mb-4 font-semibold">Forbindelsesstatus</h3>
          <div className="space-y-2">
            {connectionStatuses.map((cs) => (
              <div key={cs.status} className="flex justify-between text-sm">
                <span className="capitalize">
                  {cs.status === "CONNECTED"
                    ? "Forbundet"
                    : cs.status === "PENDING"
                      ? "Venter"
                      : cs.status === "FAILED"
                        ? "Fejlet"
                        : "Tilbagekaldt"}
                </span>
                <span className="font-medium">{cs._count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Saving distribution */}
      <div className="mt-6 glass-card p-6">
        <h3 className="mb-4 font-semibold">Besparelsesfordeling</h3>
        <SavingDistribution results={challengeResults} />
      </div>
    </div>
  );
}

function SavingDistribution({
  results,
}: {
  results: { savingPercent: unknown; anomalyFlag: boolean }[];
}) {
  const bands = [
    { label: "< -10%", min: -Infinity, max: -10 },
    { label: "-10% – 0%", min: -10, max: 0 },
    { label: "0% – 10%", min: 0, max: 10 },
    { label: "10% – 20%", min: 10, max: 20 },
    { label: "> 20%", min: 20, max: Infinity },
  ];

  const counts = bands.map(() => 0);
  for (const r of results) {
    const pct = Number(r.savingPercent);
    for (let i = 0; i < bands.length; i++) {
      if (pct >= bands[i].min && pct < bands[i].max) {
        counts[i]++;
        break;
      }
    }
  }
  const total = results.length;

  return (
    <div className="space-y-2">
      {bands.map((band, i) => (
        <div key={band.label} className="flex items-center gap-3">
          <span className="w-28 text-sm text-muted-foreground">
            {band.label}
          </span>
          <div className="flex-1">
            <div
              className="h-6 rounded bg-primary/20"
              style={{
                width: `${total > 0 ? (counts[i] / total) * 100 : 0}%`,
                minWidth: counts[i] > 0 ? "4px" : undefined,
              }}
            />
          </div>
          <span className="w-8 text-right text-sm font-medium">
            {counts[i]}
          </span>
        </div>
      ))}
      <p className="mt-2 text-xs text-muted-foreground">
        Total: {total} resultater
      </p>
    </div>
  );
}
