"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap } from "lucide-react";

export default function SignUpPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const router = useRouter();
  const [tenantSlug, setTenantSlug] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Resolve params
  useState(() => {
    params.then((p) => setTenantSlug(p.tenantSlug));
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name") as string,
      email: form.get("email") as string,
      password: form.get("password") as string,
      tenantSlug,
      acceptTerms: form.get("acceptTerms") === "on",
      marketingConsent: form.get("marketingConsent") === "on",
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Registrering fejlede");
        return;
      }

      router.push(`/t/${tenantSlug}/onboarding`);
    } catch {
      setError("Netværksfejl — prøv igen");
    } finally {
      setLoading(false);
    }
  }

  const blue = "#2563EB";
  const green = "#22C55E";

  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4 py-12"
      style={{ background: "#F8FAFC" }}
    >
      {/* Blobs */}
      <div
        className="pointer-events-none fixed -top-40 -right-40 h-[500px] w-[500px] rounded-full opacity-20 blur-[120px]"
        style={{ background: blue }}
      />
      <div
        className="pointer-events-none fixed -bottom-40 -left-40 h-[400px] w-[400px] rounded-full opacity-15 blur-[120px]"
        style={{ background: green }}
      />

      <div
        className="relative w-full max-w-sm space-y-5 rounded-3xl border p-8 shadow-xl"
        style={{ background: "#ffffff", borderColor: "#E2E8F0" }}
      >
        {/* Logo */}
        <div className="text-center">
          <Link
            href={`/t/${tenantSlug}`}
            className="mb-5 inline-flex items-center gap-2 text-base font-bold"
            style={{ color: "#0F172A" }}
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: blue }}
            >
              <Zap className="h-4 w-4 text-white" />
            </span>
            GrønStrøm Energi
          </Link>
          <h1 className="mt-4 text-2xl font-black" style={{ color: "#0F172A" }}>
            Start din challenge
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#64748B" }}>
            Tilmeld dig og spar strøm — det er gratis
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className="rounded-xl border p-3 text-sm"
              style={{
                background: "#FEF2F2",
                borderColor: "#FECACA",
                color: "#DC2626",
              }}
            >
              {error}
            </div>
          )}

          {([
            { id: "name", label: "Navn", type: "text", placeholder: "Dit fulde navn", minLength: 2 },
            { id: "email", label: "E-mail", type: "email", placeholder: "din@email.dk" },
            { id: "password", label: "Adgangskode", type: "password", placeholder: "Mindst 8 tegn", minLength: 8 },
          ] as const).map((f) => (
            <div key={f.id} className="space-y-1.5">
              <label
                htmlFor={f.id}
                className="text-sm font-semibold"
                style={{ color: "#0F172A" }}
              >
                {f.label}
              </label>
              <input
                id={f.id}
                name={f.id}
                type={f.type}
                required
                minLength={"minLength" in f ? f.minLength : undefined}
                className="h-11 w-full rounded-xl border px-3 text-sm outline-none transition-all"
                style={{
                  background: "#F8FAFC",
                  borderColor: "#E2E8F0",
                  color: "#0F172A",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = blue)
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "#E2E8F0")
                }
                placeholder={f.placeholder}
              />
            </div>
          ))}

          <div className="space-y-3 pt-1">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                name="acceptTerms"
                type="checkbox"
                required
                className="mt-0.5 h-4 w-4 rounded"
                style={{ accentColor: blue }}
              />
              <span className="text-sm" style={{ color: "#64748B" }}>
                Jeg accepterer{" "}
                <Link
                  href={`/t/${tenantSlug}/terms`}
                  className="font-semibold hover:underline"
                  style={{ color: blue }}
                >
                  vilkår
                </Link>{" "}
                og{" "}
                <Link
                  href={`/t/${tenantSlug}/privacy`}
                  className="font-semibold hover:underline"
                  style={{ color: blue }}
                >
                  privatlivspolitik
                </Link>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                name="marketingConsent"
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded"
                style={{ accentColor: blue }}
              />
              <span className="text-sm" style={{ color: "#64748B" }}>
                Jeg vil gerne modtage tips om energibesparelse (valgfrit)
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-xl py-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
            style={{ background: blue }}
          >
            {loading ? "Opretter..." : "Opret konto — gratis"}
          </button>
        </form>

        <p className="text-center text-sm" style={{ color: "#64748B" }}>
          Har du allerede en konto?{" "}
          <Link
            href={`/t/${tenantSlug}/auth/login`}
            className="font-semibold hover:underline"
            style={{ color: blue }}
          >
            Log ind
          </Link>
        </p>
      </div>
    </div>
  );
}
