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

export default async function ParticipantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { tenantSlug } = await params;
  const { filter } = await searchParams;
  const session = await getSession();
  if (!session.userId) redirect(`/t/${tenantSlug}/auth/login`);

  const tenant = await db.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) redirect("/");

  const campaign = await db.campaign.findFirst({
    where: { tenantId: tenant.id, status: { in: ["LIVE", "COMPLETED", "SCHEDULED"] } },
    orderBy: { startsAt: "desc" },
  });

  // Fetch all participants with their households, connections and results
  const memberships = await db.tenantMembership.findMany({
    where: { tenantId: tenant.id, role: "PARTICIPANT" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          onboardingCompletedAt: true,
          deletedAt: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const userIds = memberships.map((m) => m.userId);

  const [households, challengeResults] = await Promise.all([
    db.household.findMany({
      where: { tenantId: tenant.id, ownerUserId: { in: userIds }, deletedAt: null },
      include: {
        meterConnections: { select: { status: true } },
      },
    }),
    campaign
      ? db.challengeResult.findMany({
          where: { campaignId: campaign.id, household: { ownerUserId: { in: userIds } } },
          select: {
            householdId: true,
            savingPercent: true,
            anomalyFlag: true,
            eligibleForMainLeaderboard: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const householdByUser = new Map(households.map((h) => [h.ownerUserId, h]));
  const resultByHousehold = new Map(challengeResults.map((r) => [r.householdId, r]));

  type Row = {
    userId: string;
    name: string;
    email: string;
    createdAt: Date;
    deleted: boolean;
    onboarded: boolean;
    connectionStatus: string;
    savingPercent: number | null;
    anomaly: boolean;
    eligible: boolean;
  };

  let rows: Row[] = memberships.map((m) => {
    const household = householdByUser.get(m.userId);
    const connection = household?.meterConnections[0];
    const result = household ? resultByHousehold.get(household.id) : undefined;

    return {
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      createdAt: m.createdAt,
      deleted: !!m.user.deletedAt,
      onboarded: !!m.user.onboardingCompletedAt,
      connectionStatus: connection?.status ?? "NONE",
      savingPercent: result ? Number(result.savingPercent) : null,
      anomaly: result?.anomalyFlag ?? false,
      eligible: result?.eligibleForMainLeaderboard ?? false,
    };
  });

  // Apply filter
  if (filter === "connected") {
    rows = rows.filter((r) => r.connectionStatus === "CONNECTED");
  } else if (filter === "anomaly") {
    rows = rows.filter((r) => r.anomaly);
  } else if (filter === "eligible") {
    rows = rows.filter((r) => r.eligible);
  } else if (filter === "deleted") {
    rows = rows.filter((r) => r.deleted);
  }

  const filterLinks = [
    { key: "", label: "Alle" },
    { key: "connected", label: "Forbundne" },
    { key: "eligible", label: "Eligible" },
    { key: "anomaly", label: "Anomalier" },
    { key: "deleted", label: "Slettede" },
  ];

  return (
    <div>
      <PageHeader
        title="Deltagere"
        description={`${memberships.length} tilmeldte`}
      />

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        {filterLinks.map((f) => (
          <a
            key={f.key}
            href={
              f.key
                ? `/t/${tenantSlug}/admin/participants?filter=${f.key}`
                : `/t/${tenantSlug}/admin/participants`
            }
            className={`rounded-full border px-3 py-1 text-sm transition-colors hover:bg-accent ${
              (filter ?? "") === f.key ? "bg-accent font-medium" : ""
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Navn</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Onboarded</TableHead>
              <TableHead>Forbindelse</TableHead>
              <TableHead>Besparelse</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Ingen deltagere fundet
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.userId} className={row.deleted ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">{row.email}</TableCell>
                  <TableCell>
                    {row.onboarded ? (
                      <Badge variant="default" className="bg-green-600">Ja</Badge>
                    ) : (
                      <Badge variant="secondary">Nej</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <ConnectionBadge status={row.connectionStatus} />
                  </TableCell>
                  <TableCell>
                    {row.savingPercent !== null ? (
                      <span className={row.savingPercent > 0 ? "text-green-600" : "text-red-500"}>
                        {row.savingPercent > 0 ? "+" : ""}
                        {row.savingPercent.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {row.anomaly && <Badge variant="destructive">Anomali</Badge>}
                      {row.deleted && <Badge variant="outline">Slettet</Badge>}
                      {!row.anomaly && !row.deleted && row.eligible && (
                        <Badge variant="outline" className="border-green-600 text-green-600">OK</Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ConnectionBadge({ status }: { status: string }) {
  switch (status) {
    case "CONNECTED":
      return <Badge className="bg-green-600">Forbundet</Badge>;
    case "PENDING":
      return <Badge variant="secondary">Venter</Badge>;
    case "FAILED":
      return <Badge variant="destructive">Fejlet</Badge>;
    case "REVOKED":
      return <Badge variant="outline">Tilbagekaldt</Badge>;
    default:
      return <Badge variant="outline">Ikke forbundet</Badge>;
  }
}
