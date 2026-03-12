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
import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";

export default async function ConnectionsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const session = await getSession();
  if (!session.userId) redirect(`/t/${tenantSlug}/auth/login`);

  const tenant = await db.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) redirect("/");

  const connections = await db.meterConnection.findMany({
    where: { household: { tenantId: tenant.id, deletedAt: null } },
    include: {
      household: {
        select: {
          id: true,
          postalCode: true,
          ownerUser: { select: { name: true, email: true } },
        },
      },
      meterPoints: {
        select: { externalMeterId: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Forbindelser"
        description={`${connections.length} dataforbindelser`}
      />

      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deltager</TableHead>
              <TableHead>Postnummer</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Måler-ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Samtykke</TableHead>
              <TableHead>Sidst synk.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {connections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Ingen forbindelser
                </TableCell>
              </TableRow>
            ) : (
              connections.map((conn) => (
                <TableRow key={conn.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{conn.household.ownerUser.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {conn.household.ownerUser.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{conn.household.postalCode}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{conn.providerType}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {conn.meterPoints[0]?.externalMeterId ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={conn.status} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {conn.consentGrantedAt
                      ? formatDistanceToNow(conn.consentGrantedAt, {
                          addSuffix: true,
                          locale: da,
                        })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {conn.lastSyncedAt
                      ? formatDistanceToNow(conn.lastSyncedAt, {
                          addSuffix: true,
                          locale: da,
                        })
                      : "—"}
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

function StatusBadge({ status }: { status: string }) {
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
      return <Badge variant="outline">{status}</Badge>;
  }
}
