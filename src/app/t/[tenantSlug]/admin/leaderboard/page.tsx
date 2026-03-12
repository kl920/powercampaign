import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminLeaderboardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const session = await getSession();
  if (!session.userId) redirect(`/t/${tenantSlug}/auth/login`);

  const tenant = await db.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) redirect("/");

  const campaign = await db.campaign.findFirst({
    where: { tenantId: tenant.id, status: { in: ["LIVE", "COMPLETED", "SCHEDULED"] } },
    orderBy: { startsAt: "desc" },
  });

  if (!campaign) {
    return (
      <div>
        <PageHeader title="Rangliste (Admin)" />
        <p className="text-muted-foreground">Ingen kampagne fundet.</p>
      </div>
    );
  }

  const entries = await db.leaderboardEntry.findMany({
    where: { campaignId: campaign.id, leaderboardType: "GLOBAL" },
    orderBy: { rank: "asc" },
    include: {
      household: {
        select: {
          id: true,
          postalCode: true,
          ownerUser: { select: { name: true, email: true } },
          challengeResults: {
            where: { campaignId: campaign.id },
            select: {
              savingPercent: true,
              savingKwh: true,
              consistencyScore: true,
              anomalyFlag: true,
              anomalyReason: true,
              eligibleForMainLeaderboard: true,
            },
          },
        },
      },
    },
  });

  return (
    <div>
      <PageHeader
        title="Rangliste (Admin)"
        description={`${entries.length} rangerede husstande — ${campaign.name}`}
      />

      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Deltager</TableHead>
              <TableHead>Postnr.</TableHead>
              <TableHead>Besparelse %</TableHead>
              <TableHead>kWh sparet</TableHead>
              <TableHead>Konsistens</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Ranglisten er tom. Kør genberegning.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => {
                const result = entry.household.challengeResults[0];
                const pct = result ? Number(result.savingPercent) : 0;
                const kwh = result ? Number(result.savingKwh) : 0;
                const consistency = result?.consistencyScore
                  ? Number(result.consistencyScore)
                  : null;

                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-bold">{entry.rank}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {entry.household.ownerUser.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.household.ownerUser.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{entry.household.postalCode}</TableCell>
                    <TableCell>
                      <span
                        className={
                          pct > 0
                            ? "font-semibold text-green-600"
                            : "text-red-500"
                        }
                      >
                        {pct > 0 ? "+" : ""}
                        {pct.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>{kwh.toFixed(1)} kWh</TableCell>
                    <TableCell>
                      {consistency !== null ? (
                        <span>{(consistency * 100).toFixed(0)}%</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {result?.anomalyFlag && (
                          <Badge
                            variant="destructive"
                            title={result.anomalyReason ?? undefined}
                          >
                            Anomali
                          </Badge>
                        )}
                        {result && !result.eligibleForMainLeaderboard && (
                          <Badge variant="secondary">Ikke eligible</Badge>
                        )}
                        {result &&
                          !result.anomalyFlag &&
                          result.eligibleForMainLeaderboard && (
                            <Badge
                              variant="outline"
                              className="border-green-600 text-green-600"
                            >
                              OK
                            </Badge>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
