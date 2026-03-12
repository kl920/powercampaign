"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface CampaignData {
  id: string;
  name: string;
  description: string;
  status: string;
  startsAt: string;
  endsAt: string;
  co2Factor: number;
  pricePerKwh: number;
}

export function CampaignForm({
  tenantSlug,
  campaign,
}: {
  tenantSlug: string;
  campaign: CampaignData;
}) {
  const [formData, setFormData] = useState(campaign);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/campaign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, tenantSlug }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Fejl ved opdatering");
        return;
      }
      toast.success("Kampagne opdateret");
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
              <Label htmlFor="name">Kampagnenavn</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => { if (v) setFormData({ ...formData, status: v }); }}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Kladde</SelectItem>
                  <SelectItem value="SCHEDULED">Planlagt</SelectItem>
                  <SelectItem value="LIVE">Live</SelectItem>
                  <SelectItem value="COMPLETED">Afsluttet</SelectItem>
                  <SelectItem value="ARCHIVED">Arkiveret</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="desc">Beskrivelse</Label>
            <Textarea
              id="desc"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="startsAt">Startdato</Label>
              <Input
                id="startsAt"
                type="date"
                value={formData.startsAt}
                onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="endsAt">Slutdato</Label>
              <Input
                id="endsAt"
                type="date"
                value={formData.endsAt}
                onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="co2">CO₂-faktor (kg/kWh)</Label>
              <Input
                id="co2"
                type="number"
                step="0.000001"
                value={formData.co2Factor}
                onChange={(e) =>
                  setFormData({ ...formData, co2Factor: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label htmlFor="price">Pris per kWh (DKK)</Label>
              <Input
                id="price"
                type="number"
                step="0.0001"
                value={formData.pricePerKwh}
                onChange={(e) =>
                  setFormData({ ...formData, pricePerKwh: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Gemmer…" : "Gem kampagne"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
