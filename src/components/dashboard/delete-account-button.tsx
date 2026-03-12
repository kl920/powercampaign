"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteAccountButton({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (res.ok) {
      router.push(`/t/${tenantSlug}`);
    }
    setLoading(false);
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
      >
        Slet min konto
      </button>
    );
  }

  return (
    <div className="flex gap-3">
      <button
        onClick={handleDelete}
        disabled={loading}
        className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
      >
        {loading ? "Sletter..." : "Ja, slet min konto"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
      >
        Annuller
      </button>
    </div>
  );
}
