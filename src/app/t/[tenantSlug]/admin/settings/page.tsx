import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { CampaignForm } from "@/components/admin/campaign-form";
import { BrandingForm } from "@/components/admin/branding-form";
import { Separator } from "@/components/ui/separator";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const session = await getSession();
  if (!session.userId) redirect(`/t/${tenantSlug}/auth/login`);

  const tenant = await db.tenant.findUnique({
    where: { slug: tenantSlug },
    include: { branding: true },
  });
  if (!tenant) redirect("/");

  const campaign = await db.campaign.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { startsAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Kampagneindstillinger"
        description="Rediger kampagne og branding"
      />

      <div className="space-y-8">
        <section>
          <h2 className="mb-4 text-lg font-semibold">Aktiv kampagne</h2>
          {campaign ? (
            <CampaignForm
              tenantSlug={tenantSlug}
              campaign={{
                id: campaign.id,
                name: campaign.name,
                description: campaign.description ?? "",
                status: campaign.status,
                startsAt: campaign.startsAt.toISOString().slice(0, 10),
                endsAt: campaign.endsAt.toISOString().slice(0, 10),
                co2Factor: Number(campaign.co2FactorKgPerKwh),
                pricePerKwh: Number(campaign.estimatedPricePerKwhDkk),
              }}
            />
          ) : (
            <p className="text-muted-foreground">
              Ingen kampagne oprettet endnu.
            </p>
          )}
        </section>

        <Separator />

        <section>
          <h2 className="mb-4 text-lg font-semibold">Branding</h2>
          <BrandingForm
            tenantSlug={tenantSlug}
            branding={
              tenant.branding
                ? {
                    primaryColor: tenant.branding.primaryColor,
                    secondaryColor: tenant.branding.secondaryColor,
                    headline: tenant.branding.headline ?? "",
                    subheadline: tenant.branding.subheadline ?? "",
                    supportEmail: tenant.branding.supportEmail ?? "",
                  }
                : undefined
            }
          />
        </section>
      </div>
    </div>
  );
}
