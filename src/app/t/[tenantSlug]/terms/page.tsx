import Link from "next/link";
import { getTenantBySlug } from "@/lib/tenant";
import { notFound } from "next/navigation";
import { Zap } from "lucide-react";

export default async function TermsPage({
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
        <h1>Vilkår og betingelser</h1>
        <p>Sidst opdateret: {new Date().toLocaleDateString("da-DK")}</p>

        <h2>1. Generelt</h2>
        <p>
          Disse vilkår gælder for din brug af {tenant.name}&apos;s
          energi-challenge-platform. Ved at oprette en bruger accepterer
          du disse vilkår.
        </p>

        <h2>2. Deltagelse</h2>
        <p>
          Deltagelse i challenge kræver, at du giver samtykke til at dele
          dine forbrugsdata. Du kan til enhver tid trække dette samtykke
          tilbage.
        </p>

        <h2>3. Databehandling</h2>
        <p>
          Se vores <Link href={`/t/${(await params).tenantSlug}/privacy`}>privatlivspolitik</Link> for
          detaljer om, hvordan vi behandler dine data.
        </p>

        <h2>4. Rangering og præmier</h2>
        <p>
          Rangering baseres på procentuel besparelse i forhold til din
          personlige baseline. Præmier uddeles iht. kampagnens regler.
        </p>

        <h2>5. Ansvar</h2>
        <p>
          Platformen leveres som den er. Vi garanterer ikke fuldstændig
          nøjagtighed af forbrugsdata, da disse afhænger af
          tredjeparts-datakilder.
        </p>
      </div>
    </div>
  );
}
