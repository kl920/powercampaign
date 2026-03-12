import Link from "next/link";
import { getTenantBySlug } from "@/lib/tenant";
import { notFound } from "next/navigation";
import { Zap } from "lucide-react";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  return (
    <div className="min-h-screen">
      <nav className="glass sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4">
          <Link href={`/t/${tenantSlug}`} className="flex items-center gap-2 text-lg font-bold">
            <Zap className="h-5 w-5 text-energy-green" />
            {tenant.name}
          </Link>
        </div>
      </nav>
      <div className="prose mx-auto max-w-3xl px-4 py-16">
        <h1>Privatlivspolitik</h1>
        <p>Sidst opdateret: {new Date().toLocaleDateString("da-DK")}</p>

        <h2>1. Dataansvarlig</h2>
        <p>
          {tenant.name} er dataansvarlig for behandling af dine
          personoplysninger i forbindelse med energi-challenge-platformen.
        </p>

        <h2>2. Hvilke data indsamles</h2>
        <ul>
          <li>Navn og e-mailadresse (ved registrering)</li>
          <li>Husstandsoplysninger (postnummer, boligtype, størrelse)</li>
          <li>Elforbrug pr. time (via datadeling-samtykke)</li>
          <li>Samtykkeregistreringer</li>
        </ul>

        <h2>3. Formål</h2>
        <p>
          Dine data bruges udelukkende til at beregne din baseline,
          score din besparelse, og vise din anonymiserede placering på
          ranglisten.
        </p>

        <h2>4. Dine rettigheder</h2>
        <ul>
          <li>Indsigt i dine data</li>
          <li>Rettelse af fejlagtige data</li>
          <li>Sletning af din konto og data</li>
          <li>Tilbagetrækning af samtykke</li>
          <li>Dataportabilitet</li>
        </ul>

        <h2>5. Kontakt</h2>
        <p>
          {tenant.branding?.supportEmail
            ? `E-mail: ${tenant.branding.supportEmail}`
            : "Kontakt os via din administrator."}
        </p>
      </div>
    </div>
  );
}
