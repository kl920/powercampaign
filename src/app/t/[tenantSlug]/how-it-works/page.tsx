import Link from "next/link";
import { getTenantBySlug } from "@/lib/tenant";
import { notFound } from "next/navigation";
import { Zap } from "lucide-react";

export default async function HowItWorksPage({
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
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold">Sådan virker det</h1>
        <div className="mt-8 space-y-8 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">Baseline</h2>
            <p className="mt-2">
              Vi analyserer dit elforbrug fra de seneste 4 uger og beregner en
              fair baseline — dit gennemsnitlige forbrug per uge. Det er din
              personlige reference, så du kun konkurrerer mod dig selv.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">Challenge-ugen</h2>
            <p className="mt-2">
              I 7 dage forsøger du at spare mere strøm end din baseline. Vi
              måler time for time og viser dine fremskridt i realtid.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">Rangering</h2>
            <p className="mt-2">
              Alle deltagere rangeres efter procentuel besparelse — ikke
              absolut kWh. Det betyder, at en lejlighed og et hus har lige
              gode chancer for at vinde.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">Præmier</h2>
            <p className="mt-2">
              De bedste sparere vinder præmier! Tjek kampagnesiden for
              aktuelle præmier.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
