"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileSpreadsheet, Users, Shield, Trophy } from "lucide-react";

const exportTypes = [
  {
    type: "PARTICIPANTS",
    title: "Deltagere",
    description: "Alle tilmeldte med status, onboarding og sletning",
    icon: Users,
  },
  {
    type: "RESULTS",
    title: "Resultater",
    description: "Besparelser, kWh, CO₂, anomalier og konsistens",
    icon: FileSpreadsheet,
  },
  {
    type: "CONSENTS",
    title: "Samtykker",
    description: "Samtykkeregistreringer per bruger og type",
    icon: Shield,
  },
  {
    type: "GROUP_STANDINGS",
    title: "Rangliste",
    description: "Global rangliste med rank, score og kontaktinfo",
    icon: Trophy,
  },
] as const;

export default function ExportPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleExport(type: string) {
    setLoading(type);
    try {
      const res = await fetch("/api/admin/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, tenantSlug }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Eksport fejlede");
        return;
      }

      // Download the CSV
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        `${type.toLowerCase()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Eksport"
        description="Download data som CSV (semikolon-separeret, UTF-8)"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {exportTypes.map((exp) => (
          <Card key={exp.type}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <exp.icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">{exp.title}</CardTitle>
                  <CardDescription>{exp.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleExport(exp.type)}
                disabled={loading !== null}
                size="sm"
              >
                <Download className="mr-2 h-4 w-4" />
                {loading === exp.type ? "Eksporterer…" : "Download CSV"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
