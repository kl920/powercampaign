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

export default async function ConsentsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const session = await getSession();
  if (!session.userId) redirect(`/t/${tenantSlug}/auth/login`);

  const tenant = await db.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) redirect("/");

  const consents = await db.consentRecord.findMany({
    where: { tenantId: tenant.id },
    include: {
      user: { select: { name: true, email: true, deletedAt: true } },
    },
    orderBy: { acceptedAt: "desc" },
  });

  // Group by user
  const byUser = new Map<string, typeof consents>();
  for (const c of consents) {
    const existing = byUser.get(c.userId) ?? [];
    existing.push(c);
    byUser.set(c.userId, existing);
  }

  return (
    <div>
      <PageHeader
        title="Samtykker"
        description={`${byUser.size} brugere — ${consents.length} samtykkeregistreringer`}
      />

      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bruger</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Accepteret</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Dato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {consents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Ingen samtykker registreret
                </TableCell>
              </TableRow>
            ) : (
              consents.map((c) => (
                <TableRow key={c.id} className={c.user.deletedAt ? "opacity-50" : ""}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{c.user.name}</p>
                      <p className="text-xs text-muted-foreground">{c.user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ConsentTypeBadge type={c.consentType} />
                  </TableCell>
                  <TableCell>
                    {c.accepted ? (
                      <Badge className="bg-green-600">Ja</Badge>
                    ) : (
                      <Badge variant="destructive">Nej</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{c.version}</TableCell>
                  <TableCell className="text-sm">
                    {format(c.acceptedAt, "d. MMM yyyy HH:mm", { locale: da })}
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

function ConsentTypeBadge({ type }: { type: string }) {
  switch (type) {
    case "PARTICIPATION":
      return <Badge variant="outline">Deltagelse</Badge>;
    case "MARKETING":
      return <Badge variant="secondary">Marketing</Badge>;
    case "DATA_ACCESS":
      return <Badge className="bg-blue-600">Data</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}
