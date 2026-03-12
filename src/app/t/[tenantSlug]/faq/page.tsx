import Link from "next/link";
import { getTenantBySlug } from "@/lib/tenant";
import { notFound } from "next/navigation";
import { Zap } from "lucide-react";

const faqs = [
  {
    q: "Hvordan beregnes min baseline?",
    a: "Vi bruger dit gennemsnitlige elforbrug fra de seneste 4 uger som din baseline. Hvis du ikke har nok historik, bruger vi de uger, der er tilgængelige.",
  },
  {
    q: "Er mine data sikre?",
    a: "Ja. Vi opbevarer kun de data, du giver samtykke til. Du kan til enhver tid trække dit samtykke tilbage og slette din konto.",
  },
  {
    q: "Hvad sker der, hvis mit forbrug stiger?",
    a: "Det er helt okay — du vil se, at dit forbrug steg, men du mister ikke din plads. Du konkurrerer mod din egen baseline.",
  },
  {
    q: "Kan jeg se andres forbrug?",
    a: "Nej. Ranglisten viser kun besparelses-procent og en anonym betegnelse (fx 'Husstand i 2200'). Intet personligt forbrug deles.",
  },
  {
    q: "Hvem kan deltage?",
    a: "Alle med en elmåler i det område, kampagnen dækker. Du skal blot oprette en bruger og give samtykke til datadeling.",
  },
  {
    q: "Koster det noget?",
    a: "Nej, det er helt gratis at deltage.",
  },
];

export default async function FAQPage({
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
        <h1 className="text-3xl font-bold">Ofte stillede spørgsmål</h1>
        <div className="mt-8 space-y-6">
          {faqs.map((faq) => (
            <div key={faq.q} className="glass-card p-6">
              <h3 className="font-semibold">{faq.q}</h3>
              <p className="mt-2 text-muted-foreground">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
