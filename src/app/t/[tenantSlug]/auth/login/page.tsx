"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Zap } from "lucide-react";

export default function LoginPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenantSlug, setTenantSlug] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useState(() => {
    params.then((p) => setTenantSlug(p.tenantSlug));
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const data = {
      email: form.get("email") as string,
      password: form.get("password") as string,
      tenantSlug,
    };

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Login fejlede");
        return;
      }

      const result = await res.json();
      const redirect = searchParams.get("redirect");

      if (result.role === "TENANT_ADMIN" || result.role === "SUPER_ADMIN") {
        router.push(redirect ?? `/t/${tenantSlug}/admin`);
      } else if (!result.onboardingCompleted) {
        router.push(`/t/${tenantSlug}/onboarding`);
      } else {
        router.push(redirect ?? `/t/${tenantSlug}/dashboard`);
      }
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
        className="relative w-full max-w-sm space-y-6 rounded-3xl border p-8 shadow-xl"
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
            GreenStrøm Energi
          </Link>
          <h1 className="mt-4 text-2xl font-black" style={{ color: "#0F172A" }}>
            Velkommen tilbage
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#64748B" }}>
            Log ind for at se dit dashboard
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

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-sm font-semibold"
              style={{ color: "#0F172A" }}
            >
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="h-11 w-full rounded-xl border px-3 text-sm outline-none transition-all focus:ring-2"
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
              placeholder="din@email.dk"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-sm font-semibold"
              style={{ color: "#0F172A" }}
            >
              Adgangskode
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
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
              placeholder="Din adgangskode"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-xl py-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
            style={{ background: blue }}
          >
            {loading ? "Logger ind..." : "Log ind"}
          </button>
        </form>

        <p className="text-center text-sm" style={{ color: "#64748B" }}>
          Har du ikke en konto?{" "}
          <Link
            href={`/t/${tenantSlug}/auth/signup`}
            className="font-semibold hover:underline"
            style={{ color: blue }}
          >
            Opret konto
          </Link>
        </p>
      </div>
    </div>
  );
}
