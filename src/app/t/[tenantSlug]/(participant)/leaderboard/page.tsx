import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const session = await getSession();
  if (!session.userId) redirect(`/t/${tenantSlug}/auth/login`);

  const household = await db.household.findFirst({
    where: {
      ownerUserId: session.userId,
      tenant: { slug: tenantSlug },
      deletedAt: null,
    },
  });

  const campaign = await db.campaign.findFirst({
    where: {
      tenant: { slug: tenantSlug },
      status: { in: ["LIVE", "COMPLETED"] },
    },
    orderBy: { startsAt: "desc" },
  });

  if (!campaign) {
    return (
      <div>
        <PageHeader title="Rangliste" />
        <p className="text-muted-foreground">Ingen aktiv kampagne.</p>
      </div>
    );
  }

  const entries = await db.leaderboardEntry.findMany({
    where: {
      campaignId: campaign.id,
      leaderboardType: "GLOBAL",
    },
    orderBy: { rank: "asc" },
    include: {
      household: { select: { postalCode: true, id: true } },
    },
  });

  const myEntry = household
    ? entries.find((e) => e.householdId === household.id)
    : null;

  return (
    <div>
      <PageHeader
        title="Rangliste"
        description={`${campaign.name} — ${entries.length} deltagere`}
        gradient
      />

      {myEntry && (
        <div className="mb-6 glass-card border-energy-green/30 p-4">
          <p className="text-sm text-muted-foreground">Din placering</p>
          <p className="text-2xl font-bold">
            #{myEntry.rank} af {entries.length}
          </p>
          <p className="text-sm text-muted-foreground">
            {Number(myEntry.score).toFixed(1)}% besparelse
          </p>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-3 border-b border-border/50 px-4 py-3 text-sm font-medium text-muted-foreground">
          <span>#</span>
          <span>Husstand</span>
          <span className="text-right">Besparelse</span>
        </div>
        {entries.map((entry) => {
          const isMe = household && entry.householdId === household.id;
          return (
            <div
              key={entry.id}
              className={`grid grid-cols-3 border-b border-border/50 px-4 py-3 text-sm last:border-b-0 ${
                isMe ? "bg-energy-green/5 font-medium" : ""
              }`}
            >
              <span className="font-bold text-muted-foreground">
                {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}
              </span>
              <span>
                Husstand i {entry.household.postalCode}
                {isMe && (
                  <span className="ml-2 text-xs text-energy-green">(dig)</span>
                )}
              </span>
              <span className="text-right">
                {Number(entry.score).toFixed(1)}%
              </span>
            </div>
          );
        })}

        {entries.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            Ingen rangerede deltagere endnu.
          </div>
        )}
      </div>
    </div>
  );
}
