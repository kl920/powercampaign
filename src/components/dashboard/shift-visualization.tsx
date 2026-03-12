"use client";

// Fictional average hourly consumption profile for illustration
const HOURLY: { h: number; b: number; c: number }[] = [
  { h: 0,  b: 0.15, c: 0.25 },
  { h: 1,  b: 0.12, c: 0.22 },
  { h: 2,  b: 0.10, c: 0.18 },
  { h: 3,  b: 0.10, c: 0.20 },
  { h: 4,  b: 0.12, c: 0.25 },
  { h: 5,  b: 0.15, c: 0.30 },
  { h: 6,  b: 0.35, c: 0.30 },
  { h: 7,  b: 0.65, c: 0.45 },
  { h: 8,  b: 0.80, c: 0.50 },
  { h: 9,  b: 0.45, c: 0.40 },
  { h: 10, b: 0.40, c: 0.38 },
  { h: 11, b: 0.38, c: 0.35 },
  { h: 12, b: 0.42, c: 0.55 },
  { h: 13, b: 0.38, c: 0.50 },
  { h: 14, b: 0.35, c: 0.48 },
  { h: 15, b: 0.40, c: 0.35 },
  { h: 16, b: 0.55, c: 0.30 },
  { h: 17, b: 0.75, c: 0.40 },
  { h: 18, b: 0.90, c: 0.45 },
  { h: 19, b: 0.85, c: 0.40 },
  { h: 20, b: 0.70, c: 0.35 },
  { h: 21, b: 0.55, c: 0.28 },
  { h: 22, b: 0.35, c: 0.22 },
  { h: 23, b: 0.20, c: 0.15 },
];

const MAX_KWH = 0.90;
const CHART_H = 100; // px

const ZONE_BANDS = [
  { from: 0,  to: 6,  color: "#22C55E", label: "" },
  { from: 6,  to: 8,  color: "#F59E0B", label: "" },
  { from: 8,  to: 15, color: "#22C55E", label: "" },
  { from: 15, to: 21, color: "#EF4444", label: "" },
  { from: 21, to: 24, color: "#F59E0B", label: "" },
] as const;

function zoneColor(h: number): string {
  if (h < 6)  return "#22C55E";
  if (h < 8)  return "#F59E0B";
  if (h < 15) return "#22C55E";
  if (h < 21) return "#EF4444";
  return "#F59E0B";
}

export function ShiftVisualization() {
  const totalBench = HOURLY.reduce((s, d) => s + d.b, 0);
  const totalCamp  = HOURLY.reduce((s, d) => s + d.c, 0);
  const dailySaved  = totalBench - totalCamp;
  const weeklySaved = dailySaved * 7;
  const dkkSaved    = Math.round(weeklySaved * 3.5);

  const benchGreen = HOURLY
    .filter((d) => d.h < 6 || (d.h >= 8 && d.h < 15))
    .reduce((s, d) => s + d.b, 0);
  const campGreen = HOURLY
    .filter((d) => d.h < 6 || (d.h >= 8 && d.h < 15))
    .reduce((s, d) => s + d.c, 0);
  const greenPct = Math.round(((campGreen - benchGreen) / benchGreen) * 100);

  return (
    <div className="mt-6 glass-card p-6">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">Forbrugsprofil · Benchmark vs. Kampagne</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Gns. time-for-time — se hvordan du har forskudt dit forbrug mod billige timer
          </p>
        </div>
        <div className="flex items-center gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-4 rounded-sm"
              style={{ background: "#94A3B8", opacity: 0.6 }}
            />
            Benchmark
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-4 rounded-sm"
              style={{ background: "#22C55E" }}
            />
            Kampagne
          </span>
        </div>
      </div>

      {/* Chart area */}
      <div className="relative overflow-hidden rounded-xl" style={{ height: CHART_H + 24 }}>
        {/* Zone background bands */}
        {ZONE_BANDS.map((band) => (
          <div
            key={band.from}
            className="pointer-events-none absolute top-0"
            style={{
              height: CHART_H,
              left:  `${(band.from / 24) * 100}%`,
              width: `${((band.to - band.from) / 24) * 100}%`,
              background: band.color,
              opacity: 0.07,
            }}
          />
        ))}

        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75, 1.0].map((frac) => (
          <div
            key={frac}
            className="pointer-events-none absolute left-0 right-0"
            style={{
              bottom: 24 + frac * CHART_H,
              borderTop: "1px solid rgba(255,255,255,0.04)",
            }}
          />
        ))}

        {/* Bars */}
        <div
          className="absolute inset-x-0 flex items-end gap-px"
          style={{ bottom: 24, height: CHART_H }}
        >
          {HOURLY.map((d) => {
            const benchH = (d.b / MAX_KWH) * CHART_H;
            const campH  = (d.c / MAX_KWH) * CHART_H;
            const color  = zoneColor(d.h);
            const label  = `Kl. ${String(d.h).padStart(2, "0")}:00 — Benchmark: ${d.b.toFixed(2)} kWh · Kampagne: ${d.c.toFixed(2)} kWh`;
            return (
              <div key={d.h} className="flex flex-1 items-end gap-[1px]" title={label}>
                {/* Benchmark bar */}
                <div
                  className="flex-1 rounded-t-[2px] transition-all"
                  style={{ height: benchH, background: "#94A3B8", opacity: 0.45 }}
                />
                {/* Campaign bar */}
                <div
                  className="flex-1 rounded-t-[2px] transition-all"
                  style={{ height: campH, background: color, opacity: 0.88 }}
                />
              </div>
            );
          })}
        </div>

        {/* Time axis */}
        <div
          className="absolute inset-x-0 bottom-0 flex justify-between px-px text-[10px] text-muted-foreground"
        >
          <span>00</span>
          <span>06</span>
          <span>12</span>
          <span>18</span>
          <span>24</span>
        </div>
      </div>

      {/* Shift annotations */}
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
          Peak 15–21: forbrug reduceret markant
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
          Billige timer 00–06 og 08–15: forbrug øget
        </span>
      </div>

      {/* Divider */}
      <div className="my-4 border-t border-white/5" />

      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center rounded-xl border border-energy-green/20 bg-energy-green/10 p-4 text-center">
          <span className="text-2xl font-black tracking-tight text-energy-green">
            −{weeklySaved.toFixed(1)} kWh
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Total sparet · 7 dage
          </span>
        </div>
        <div
          className="flex flex-col items-center rounded-xl border p-4 text-center"
          style={{
            borderColor: "rgba(56,189,248,0.2)",
            background: "rgba(56,189,248,0.07)",
          }}
        >
          <span
            className="text-2xl font-black tracking-tight"
            style={{ color: "rgb(56,189,248)" }}
          >
            ~{dkkSaved} kr.
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Estimeret kr. sparet
          </span>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-purple-500/20 bg-purple-500/10 p-4 text-center">
          <span className="text-2xl font-black tracking-tight text-purple-400">
            +{greenPct}%
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Øget i grøn zone
          </span>
        </div>
      </div>

      <p className="mt-3 text-[10px] text-muted-foreground/50 text-right">
        * Illustration baseret på typisk timeprofil — ikke dine faktiske målerdata time-for-time
      </p>
    </div>
  );
}
