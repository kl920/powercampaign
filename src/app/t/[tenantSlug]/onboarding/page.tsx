"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Zap } from "lucide-react";

const STEPS = ["Husstand", "Samtykke", "Forbind data", "Klar!"];

export default function OnboardingPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const router = useRouter();
  const [tenantSlug, setTenantSlug] = useState("");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [postalCode, setPostalCode] = useState("");
  const [housingType, setHousingType] = useState("APARTMENT");
  const [householdSize, setHouseholdSize] = useState(2);
  const [floorAreaM2, setFloorAreaM2] = useState(80);
  const [consentData, setConsentData] = useState(false);

  useEffect(() => {
    params.then((p) => setTenantSlug(p.tenantSlug));
  }, [params]);

  async function submitOnboarding() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postalCode,
          housingType,
          householdSize,
          floorAreaM2,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Fejl under opsætning");
        return;
      }

      setStep(3); // Success step
    } catch {
      setError("Netværksfejl — prøv igen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-energy-green/5 blur-3xl" />

      <div className="glass-card relative w-full max-w-lg space-y-8 p-8">
        {/* Stepper */}
        <div className="flex items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  i < step
                    ? "bg-primary text-primary-foreground"
                    : i === step
                      ? "border-2 border-primary text-primary"
                      : "border border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {i < step ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`hidden h-px w-8 sm:block ${
                    i < step ? "energy-gradient" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold">{STEPS[step]}</h2>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Step 0: Household */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Postnummer</label>
              <input
                type="text"
                pattern="\d{4}"
                maxLength={4}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="2100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Boligtype</label>
              <select
                value={housingType}
                onChange={(e) => setHousingType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="APARTMENT">Lejlighed</option>
                <option value="HOUSE">Hus</option>
                <option value="TOWNHOUSE">Rækkehus</option>
                <option value="OTHER">Andet</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Antal personer</label>
              <input
                type="number"
                min={1}
                max={20}
                value={householdSize}
                onChange={(e) => setHouseholdSize(Number(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Boligareal (m²)</label>
              <input
                type="number"
                min={10}
                max={1000}
                value={floorAreaM2}
                onChange={(e) => setFloorAreaM2(Number(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={() => {
                if (postalCode.length === 4) setStep(1);
              }}
              disabled={postalCode.length !== 4}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Næste
            </button>
          </div>
        )}

        {/* Step 1: Consent */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="glass-card p-4">
              <h3 className="font-semibold">Dataadgang (påkrævet)</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Vi henter dit elforbrug time for time for at beregne din
                baseline og score. Data bruges kun til denne kampagne.
              </p>
              <label className="mt-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={consentData}
                  onChange={(e) => setConsentData(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm">
                  Ja, jeg giver samtykke til at dele mine forbrugsdata
                </span>
              </label>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-accent"
              >
                Tilbage
              </button>
              <button
                onClick={() => {
                  if (consentData) setStep(2);
                }}
                disabled={!consentData}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Næste
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Connect */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="glass-card p-6 text-center">
              <Zap className="mx-auto mb-3 h-8 w-8 text-energy-green" />
              <p className="text-muted-foreground">
                Vi forbinder dig med demodata, så du kan se, hvordan
                platformen fungerer.
              </p>
              <button
                onClick={submitOnboarding}
                disabled={loading}
                className="mt-4 rounded-lg bg-primary px-8 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? "Forbinder..." : "Forbind Demo Data"}
              </button>
            </div>
            <button
              onClick={() => setStep(1)}
              className="w-full rounded-lg border py-2.5 text-sm font-medium hover:bg-accent"
            >
              Tilbage
            </button>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 3 && (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-energy-green/15 text-energy-green glow-green">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Du er klar!</h3>
              <p className="mt-2 text-muted-foreground">
                Din husstand er oprettet og forbundet. Gå til dit dashboard
                for at se dine resultater.
              </p>
            </div>
            <button
              onClick={() => router.push(`/t/${tenantSlug}/dashboard`)}
              className="rounded-lg bg-primary px-8 py-2.5 text-sm font-medium text-primary-foreground shadow-[0_0_20px_var(--energy-green-glow)] hover:bg-primary/90"
            >
              Gå til dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
