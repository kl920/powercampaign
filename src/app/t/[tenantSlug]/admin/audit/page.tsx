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
import { format } from "date-fns";
import { da } from "date-fns/locale";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const session = await getSession();
  if (!session.userId) redirect(`/t/${tenantSlug}/auth/login`);

  const tenant = await db.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) redirect("/");

  const logs = await db.auditLog.findMany({
    where: { tenantId: tenant.id },
    include: {
      actorUser: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="De seneste 200 handlinger"
      />

      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tidspunkt</TableHead>
              <TableHead>Aktør</TableHead>
              <TableHead>Handling</TableHead>
              <TableHead>Enhed</TableHead>
              <TableHead>Enhed ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Ingen log-poster
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {format(log.createdAt, "d. MMM yyyy HH:mm:ss", { locale: da })}
                  </TableCell>
                  <TableCell>
                    {log.actorUser ? (
                      <div>
                        <p className="text-sm font-medium">{log.actorUser.name}</p>
                        <p className="text-xs text-muted-foreground">{log.actorUser.email}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">System</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ActionBadge action={log.action} />
                  </TableCell>
                  <TableCell className="text-sm">{log.entityType}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {log.entityId ? log.entityId.slice(0, 12) + "…" : "—"}
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

function ActionBadge({ action }: { action: string }) {
  const lower = action.toLowerCase();
  if (lower.includes("delete") || lower.includes("revoke")) {
    return <Badge variant="destructive">{action}</Badge>;
  }
  if (lower.includes("create") || lower.includes("register")) {
    return <Badge className="bg-green-600">{action}</Badge>;
  }
  if (lower.includes("recalculate")) {
    return <Badge className="bg-blue-600">{action}</Badge>;
  }
  return <Badge variant="outline">{action}</Badge>;
}
