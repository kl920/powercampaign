"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

export function RecalculateButton({ campaignId }: { campaignId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleRecalculate() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(
        `/api/admin/campaigns/${campaignId}/recalculate`,
        { method: "POST" },
      );

      if (!res.ok) {
        setResult("Fejl ved genberegning");
        return;
      }

      const data = await res.json();
      setResult(
        `✅ Baseline: ${data.baselineProcessed}, Scoring: ${data.scoringProcessed}, Leaderboard: ${data.leaderboardRebuilt}`,
      );
    } catch {
      setResult("Netværksfejl");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleRecalculate}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Beregner..." : "Genberegn"}
      </button>
      {result && (
        <span className="text-xs text-muted-foreground">{result}</span>
      )}
    </div>
  );
}
