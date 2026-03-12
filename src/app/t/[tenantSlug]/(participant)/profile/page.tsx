import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { DeleteAccountButton } from "@/components/dashboard/delete-account-button";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const session = await getSession();
  if (!session.userId) redirect(`/t/${tenantSlug}/auth/login`);

  const [user, household, consents, meterConnection] = await Promise.all([
    db.user.findUnique({ where: { id: session.userId } }),
    db.household.findFirst({
      where: {
        ownerUserId: session.userId,
        tenant: { slug: tenantSlug },
        deletedAt: null,
      },
    }),
    db.consentRecord.findMany({
      where: {
        userId: session.userId,
        tenant: { slug: tenantSlug },
      },
      orderBy: { acceptedAt: "desc" },
    }),
    db.meterConnection.findFirst({
      where: {
        household: {
          ownerUserId: session.userId,
          tenant: { slug: tenantSlug },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const consentLabels: Record<string, string> = {
    PARTICIPATION: "Deltagelse",
    DATA_ACCESS: "Dataadgang",
    MARKETING: "Markedsføring",
  };

  const statusLabels: Record<string, string> = {
    CONNECTED: "Forbundet",
    PENDING: "Venter",
    FAILED: "Fejlet",
    REVOKED: "Tilbagekaldt",
  };

  return (
    <div>
      <PageHeader title="Profil" description="Dine oplysninger og samtykker" gradient />

      <div className="space-y-6">
        {/* User info */}
        <section className="glass-card p-6">
          <h3 className="mb-4 font-semibold">Brugeroplysninger</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Navn</span>
              <span>{user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">E-mail</span>
              <span>{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rolle</span>
              <span>{session.role}</span>
            </div>
          </div>
        </section>

        {/* Household */}
        {household && (
          <section className="glass-card p-6">
            <h3 className="mb-4 font-semibold">Husstand</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Postnummer</span>
                <span>{household.postalCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Boligtype</span>
                <span>{household.housingType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Antal personer</span>
                <span>{household.householdSize}</span>
              </div>
              {household.floorAreaM2 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Areal</span>
                  <span>{household.floorAreaM2} m²</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Connection status */}
        {meterConnection && (
          <section className="glass-card p-6">
            <h3 className="mb-4 font-semibold">Dataforbindelse</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    meterConnection.status === "CONNECTED"
                      ? "bg-energy-green/15 text-energy-green"
                      : meterConnection.status === "PENDING"
                        ? "bg-energy-amber/15 text-energy-amber"
                        : "bg-danger/15 text-danger"
                  }`}
                >
                  {statusLabels[meterConnection.status]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span>{meterConnection.providerType}</span>
              </div>
              {meterConnection.lastSyncedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sidst synkroniseret</span>
                  <span>
                    {meterConnection.lastSyncedAt.toLocaleDateString("da-DK")}
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Consents */}
        <section className="glass-card p-6">
          <h3 className="mb-4 font-semibold">Samtykker</h3>
          <div className="space-y-3">
            {consents.map((consent) => (
              <div
                key={consent.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {consentLabels[consent.consentType] ?? consent.consentType}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {consent.acceptedAt.toLocaleDateString("da-DK")} — v{consent.version}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium ${
                    consent.accepted ? "text-success" : "text-danger"
                  }`}
                >
                  {consent.accepted ? "Givet" : "Afvist"}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Delete account */}
        <section className="glass-card border-danger/30 p-6">
          <h3 className="mb-2 font-semibold text-danger">Slet konto</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Når du sletter din konto, anonymiseres dine forbrugsdata og din
            bruger soft-deletes. Denne handling kan ikke fortrydes.
          </p>
          <DeleteAccountButton tenantSlug={tenantSlug} />
        </section>
      </div>
    </div>
  );
}
