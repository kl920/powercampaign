"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface BrandingData {
  primaryColor: string;
  secondaryColor: string;
  headline: string;
  subheadline: string;
  supportEmail: string;
}

const defaultBranding: BrandingData = {
  primaryColor: "#0F766E",
  secondaryColor: "#F59E0B",
  headline: "",
  subheadline: "",
  supportEmail: "",
};

export function BrandingForm({
  tenantSlug,
  branding,
}: {
  tenantSlug: string;
  branding?: BrandingData;
}) {
  const [formData, setFormData] = useState<BrandingData>(branding ?? defaultBranding);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/branding`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, tenantSlug }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Fejl ved opdatering");
        return;
      }
      toast.success("Branding opdateret");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="primary">Primærfarve</Label>
              <div className="flex gap-2">
                <Input
                  id="primary"
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) =>
                    setFormData({ ...formData, primaryColor: e.target.value })
                  }
                  className="h-10 w-14 p-1"
                />
                <Input
                  value={formData.primaryColor}
                  onChange={(e) =>
                    setFormData({ ...formData, primaryColor: e.target.value })
                  }
                  className="flex-1 font-mono"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="secondary">Sekundærfarve</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary"
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) =>
                    setFormData({ ...formData, secondaryColor: e.target.value })
                  }
                  className="h-10 w-14 p-1"
                />
                <Input
                  value={formData.secondaryColor}
                  onChange={(e) =>
                    setFormData({ ...formData, secondaryColor: e.target.value })
                  }
                  className="flex-1 font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="headline">Overskrift (landingsside)</Label>
            <Input
              id="headline"
              value={formData.headline}
              onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
              placeholder="Spar på strømmen — vind præmier!"
            />
          </div>

          <div>
            <Label htmlFor="subheadline">Underoverskrift</Label>
            <Input
              id="subheadline"
              value={formData.subheadline}
              onChange={(e) =>
                setFormData({ ...formData, subheadline: e.target.value })
              }
              placeholder="Tilmeld dig vores energichallenge"
            />
          </div>

          <div>
            <Label htmlFor="supportEmail">Support-email</Label>
            <Input
              id="supportEmail"
              type="email"
              value={formData.supportEmail}
              onChange={(e) =>
                setFormData({ ...formData, supportEmail: e.target.value })
              }
              placeholder="support@energiselskab.dk"
            />
          </div>

          {/* Preview */}
          <div className="rounded-lg border p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Forhåndsvisning</p>
            <div
              className="rounded-lg p-4 text-white"
              style={{ backgroundColor: formData.primaryColor }}
            >
              <h3 className="text-lg font-bold">
                {formData.headline || "Overskrift"}
              </h3>
              <p className="text-sm opacity-90">
                {formData.subheadline || "Underoverskrift"}
              </p>
              <div
                className="mt-2 inline-block rounded px-3 py-1 text-sm font-medium"
                style={{ backgroundColor: formData.secondaryColor, color: "#000" }}
              >
                Tilmeld dig
              </div>
            </div>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Gemmer…" : "Gem branding"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
