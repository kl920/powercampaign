import Link from "next/link";
import { getTenantBySlug } from "@/lib/tenant";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  Zap,
  ArrowRight,
  Trophy,
  BarChart3,
  Plug,
  Eye,
  Medal,
  Leaf,
  Moon,
  Crown,
  Flame,
  TrendingDown,
  Users,
  Wind,
  Clock,
  Sun,
} from "lucide-react";
import { HeroMeter } from "@/components/dashboard/hero-meter";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

async function getLandingData(tenantId: string) {
  const campaign = await db.campaign.findFirst({
    where: { tenantId, status: { in: ["LIVE", "COMPLETED"] } },
    orderBy: { startsAt: "desc" },
  });

  if (!campaign) {
    return {
      campaign: null,
      participantCount: 0,
      totalKwhSaved: 0,
      totalCo2Saved: 0,
      totalDkkSaved: 0,
      topLeaderboard: [] as { rank: number; name: string; score: number }[],
    };
  }

  const [members, results, leaderboard] = await Promise.all([
    db.tenantMembership.count({
      where: { tenantId, role: "PARTICIPANT" },
    }),
    db.challengeResult.findMany({
      where: { campaignId: campaign.id },
      select: {
        savingKwh: true,
        estimatedCo2Saved: true,
        estimatedDkkSaved: true,
      },
    }),
    db.leaderboardEntry.findMany({
      where: { campaignId: campaign.id, leaderboardType: "GLOBAL" },
      orderBy: { rank: "asc" },
      take: 5,
      include: {
        household: {
          include: { ownerUser: { select: { name: true } } },
        },
      },
    }),
  ]);

  return {
    campaign,
    participantCount: members,
    totalKwhSaved: results.reduce(
      (s, r) => s + Math.max(0, Number(r.savingKwh)),
      0,
    ),
    totalCo2Saved: results.reduce(
      (s, r) => s + Math.max(0, Number(r.estimatedCo2Saved)),
      0,
    ),
    totalDkkSaved: results.reduce(
      (s, r) => s + Math.max(0, Number(r.estimatedDkkSaved)),
      0,
    ),
    topLeaderboard: leaderboard.map((e) => ({
      rank: e.rank,
      name: e.household.ownerUser.name.split(" ")[0],
      score: Number(e.score),
    })),
  };
}

/* ------------------------------------------------------------------ */
/*  Palette constants (Tailwind arbitrary)                             */
/* ------------------------------------------------------------------ */

const C = {
  blue: "#2563EB",
  green: "#22C55E",
  yellow: "#FACC15",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function TenantHomePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  const data = await getLandingData(tenant.id);
  const hasStats = data.participantCount > 0;

  const leaders =
    data.topLeaderboard.length > 0
      ? data.topLeaderboard
      : [
          { rank: 1, name: "Christian", score: 31.0 },
          { rank: 2, name: "Line", score: 28.0 },
          { rank: 3, name: "Martin", score: 25.0 },
          { rank: 4, name: "Ida", score: 24.0 },
          { rank: 5, name: "Rasmus", score: 23.0 },
        ];

  const proofKwh = hasStats ? data.totalKwhSaved.toFixed(0) : "285";
  const proofParticipants = hasStats
    ? data.participantCount.toString()
    : "31";
  const proofCo2 = hasStats ? data.totalCo2Saved.toFixed(0) : "24";

  return (
    <div
      className="min-h-screen font-sans antialiased"
      style={{ background: C.bg, color: C.text }}
    >
      {/* ─────────────── NAV ─────────────── */}
      <nav
        className="sticky top-0 z-50 border-b backdrop-blur-md"
        style={{
          background: "rgba(248,250,252,0.85)",
          borderColor: C.border,
        }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link
            href={`/t/${tenantSlug}`}
            className="flex items-center gap-2 text-lg font-bold"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: C.blue }}
            >
              <Zap className="h-4 w-4 text-white" />
            </span>
            {tenant.name}
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href={`/t/${tenantSlug}/auth/login`}
              className="hidden text-sm font-medium sm:inline"
              style={{ color: C.muted }}
            >
              Log ind
            </Link>
            <Link
              href={`/t/${tenantSlug}/auth/signup`}
              className="rounded-full px-5 py-2.5 text-sm font-bold text-white transition-shadow hover:shadow-lg"
              style={{ background: C.blue }}
            >
              Start din challenge
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════ */}
      {/*  1. HERO                                */}
      {/* ═══════════════════════════════════════ */}
      <section
        className="relative overflow-hidden px-6 pt-20 pb-24 lg:pt-28 lg:pb-32"
        style={{
          background: `linear-gradient(160deg, ${C.blue}0d 0%, ${C.bg} 45%, ${C.green}08 100%)`,
        }}
      >
        {/* Decorative blobs */}
        <div
          className="pointer-events-none absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full opacity-30 blur-[120px]"
          style={{ background: C.blue }}
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full opacity-20 blur-[120px]"
          style={{ background: C.green }}
        />

        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Text */}
          <div>
            <div
              className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold"
              style={{
                borderColor: `${C.green}40`,
                background: `${C.green}10`,
                color: C.green,
              }}
            >
              <Zap className="h-3.5 w-3.5" />
              Energi-challenge
            </div>

            <h1
              className="font-black tracking-tight"
              style={{
                color: C.text,
                fontSize: "clamp(2.4rem,5vw,4.4rem)",
                lineHeight: 1.05,
              }}
            >
              Er du Danmarks
              <br />
              <span
                style={{
                  color: C.blue,
                  display: "block",
                  marginTop: "0.1em",
                }}
              >
                st&oslash;rste lyseslukker?
              </span>
            </h1>

            <p
              className="mt-6 max-w-md text-lg leading-relaxed"
              style={{ color: C.muted }}
            >
              Tilslut din elm&aring;ler og se dit str&oslash;mforbrug live.
              Deltag i Danmarks energi-challenge og konkurr&eacute;r med
              andre husstande.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href={`/t/${tenantSlug}/auth/signup`}
                className="group inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-bold text-white shadow-lg transition-all hover:shadow-xl"
                style={{
                  background: C.blue,
                  boxShadow: `0 8px 30px ${C.blue}30`,
                }}
              >
                Start din challenge
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href={`/t/${tenantSlug}/how-it-works`}
                className="text-sm font-semibold transition-colors hover:underline"
                style={{ color: C.muted }}
              >
                Se hvordan det virker &rarr;
              </Link>
            </div>
          </div>

          {/* Hero visual — product cards */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            {/* Glow ring behind card */}
            <div
              className="pointer-events-none absolute inset-0 rounded-3xl"
              style={{
                boxShadow: `0 0 80px 20px ${C.blue}18`,
                borderRadius: "24px",
              }}
            />
            {/* Dashboard card — animated */}
            <HeroMeter />

            {/* Floating leaderboard */}
            <div
              className="absolute -right-2 -bottom-8 w-52 rounded-2xl border p-4 shadow-2xl sm:-right-6 sm:-bottom-10 sm:w-60"
              style={{
                background: C.card,
                borderColor: `${C.blue}30`,
                boxShadow: `0 16px 48px ${C.blue}22`,
              }}
            >
              <div className="mb-3 flex items-center gap-1.5">
                <Trophy
                  className="h-4 w-4"
                  style={{ color: "#D97706" }}
                />
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: C.muted }}
                >
                  Rangliste
                </span>
              </div>
              {leaders.slice(0, 3).map((e, i) => (
                <div
                  key={e.rank}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                  style={
                    i === 0
                      ? {
                          background: `${C.yellow}20`,
                          borderLeft: `3px solid #D97706`,
                          paddingLeft: "6px",
                        }
                      : undefined
                  }
                >
                  <span
                    className="w-4 text-xs font-extrabold"
                    style={{
                      color: i === 0 ? "#D97706" : `${C.muted}80`,
                    }}
                  >
                    {e.rank}
                  </span>
                  <span
                    className="flex-1 text-xs font-semibold"
                    style={{ color: C.text }}
                  >
                    {e.name}
                  </span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: C.green }}
                  >
                    {e.score.toFixed(0)}%
                  </span>
                </div>
              ))}
              <p
                className="mt-3 text-center text-[11px] font-bold"
                style={{ color: C.blue }}
              >
                Kan du sl&aring; dem?
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ */}
      {/*  2. HOW IT WORKS                        */}
      {/* ═══════════════════════════════════════ */}
      <section className="px-6 py-24 lg:py-32">
        <div className="mx-auto max-w-6xl text-center">
          <p
            className="mb-3 text-sm font-bold uppercase tracking-wider"
            style={{ color: C.blue }}
          >
            S&aring;dan virker det
          </p>
          <h2
            className="text-3xl font-black tracking-tight sm:text-4xl"
            style={{ color: C.text }}
          >
            Tre enkle trin
          </h2>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {[
              {
                icon: <Plug className="h-7 w-7 text-white" />,
                bg: C.blue,
                num: "01",
                title: "Tilslut din elm\u00e5ler",
                desc: "Vi henter automatisk dit str\u00f8mforbrug \u2014 sikkert og nemt.",
              },
              {
                icon: <Eye className="h-7 w-7 text-white" />,
                bg: C.green,
                num: "02",
                title: "F\u00f8lg dit forbrug",
                desc: "Se live hvor meget str\u00f8m du bruger og sparer.",
              },
              {
                icon: <Medal className="h-7 w-7 text-white" />,
                bg: "#D97706",
                num: "03",
                title: "Vind over andre",
                desc: "Se din placering p\u00e5 ranglisten og konkurr\u00e9r.",
              },
            ].map((step) => (
              <div
                key={step.num}
                className="text-left rounded-3xl border p-8"
                style={{
                  background: C.card,
                  borderColor: C.border,
                }}
              >
                <div
                  className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: step.bg }}
                >
                  {step.icon}
                </div>
                <p
                  className="mb-1 text-xs font-bold"
                  style={{ color: `${C.blue}60` }}
                >
                  Trin {step.num}
                </p>
                <h3
                  className="mb-2 text-xl font-bold"
                  style={{ color: C.text }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: C.muted }}
                >
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ */}
      {/*  NEW: SPAR + FLYT                        */}
      {/* ═══════════════════════════════════════ */}
      <section className="px-6 py-24 lg:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p
              className="mb-3 text-sm font-bold uppercase tracking-wider"
              style={{ color: C.blue }}
            >
              To veje til at vinde
            </p>
            <h2
              className="text-3xl font-black tracking-tight sm:text-4xl"
              style={{ color: C.text }}
            >
              Spar. Flyt.{" "}
              <span style={{ color: C.blue }}>Vind.</span>
            </h2>
            <p
              className="mx-auto mt-4 max-w-lg text-base leading-relaxed"
              style={{ color: C.muted }}
            >
              Du kan vinde p&aring; to m&aring;der: reducer dit samlede forbrug,
              eller flyt forbruget til de timer hvor str&oslash;mmen er
              billigst og gr&oslash;nnest.
            </p>
          </div>

          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            {/* SPAR */}
            <div
              className="rounded-3xl border p-8"
              style={{
                background: C.card,
                borderColor: `${C.blue}30`,
                boxShadow: `0 8px 32px ${C.blue}08`,
              }}
            >
              <div className="mb-5 flex items-center gap-3">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: `${C.blue}15`, color: C.blue }}
                >
                  <TrendingDown className="h-6 w-6" />
                </span>
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: C.blue }}
                  >
                    Dimension 1
                  </p>
                  <h3
                    className="text-xl font-black"
                    style={{ color: C.text }}
                  >
                    Spar str&oslash;m
                  </h3>
                </div>
              </div>
              <p
                className="mb-6 text-sm leading-relaxed"
                style={{ color: C.muted }}
              >
                Reducer dit forbrug i forhold til din egen historiske baseline.
                Sluk lyset, undg&aring; standby, vask ved lavere temperatur.
                Hver kWh under baseline giver point.
              </p>
              <div
                className="rounded-2xl p-4"
                style={{ background: `${C.blue}06` }}
              >
                <div className="flex h-16 items-end gap-1.5">
                  {[70, 68, 65, 52, 48, 38, 35].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-md"
                      style={{
                        height: `${h}%`,
                        background:
                          i < 3
                            ? `${C.muted}28`
                            : `linear-gradient(to top, ${C.blue}, ${C.green})`,
                        opacity: i < 3 ? 0.5 : 0.85,
                      }}
                    />
                  ))}
                </div>
                <p
                  className="mt-2 text-center text-xs font-bold"
                  style={{ color: C.green }}
                >
                  &darr; 49% under baseline denne uge
                </p>
              </div>
            </div>

            {/* FLYT */}
            <div
              className="rounded-3xl border p-8"
              style={{
                background: C.card,
                borderColor: "rgba(124,58,237,0.28)",
                boxShadow: "0 8px 32px rgba(124,58,237,0.06)",
              }}
            >
              <div className="mb-5 flex items-center gap-3">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{
                    background: "rgba(124,58,237,0.12)",
                    color: "#7C3AED",
                  }}
                >
                  <Clock className="h-6 w-6" />
                </span>
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: "#7C3AED" }}
                  >
                    Dimension 2
                  </p>
                  <h3
                    className="text-xl font-black"
                    style={{ color: C.text }}
                  >
                    Flyt forbruget
                  </h3>
                </div>
              </div>
              <p
                className="mb-6 text-sm leading-relaxed"
                style={{ color: C.muted }}
              >
                Behold dit forbrug &mdash; men l&aelig;g det p&aring; de rigtige
                timer. K&oslash;r vaskemaskinen om natten. Oplad bilen midt p&aring;
                dagen. Hj&aelig;lp elnettet og spar penge p&aring; spotprisen.
              </p>
              {/* 24-timers tidslinje */}
              <div>
                <div className="flex gap-px overflow-hidden rounded-xl h-9">
                  {Array.from({ length: 24 }, (_, h) => {
                    const col =
                      h < 6
                        ? C.green
                        : h < 8
                          ? "#F59E0B"
                          : h < 15
                            ? C.green
                            : h < 21
                              ? "#EF4444"
                              : "#F59E0B";
                    return (
                      <div
                        key={h}
                        className="flex-1 relative group cursor-default"
                        style={{ background: col, opacity: 0.72 }}
                        title={`Kl. ${h.toString().padStart(2,"0")}:00`}
                      />
                    );
                  })}
                </div>
                <div
                  className="mt-1.5 flex justify-between text-[10px] font-semibold"
                  style={{ color: C.muted }}
                >
                  <span>00</span>
                  <span>06</span>
                  <span>12</span>
                  <span>18</span>
                  <span>24</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-4">
                  <span
                    className="flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: C.green }}
                  >
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: C.green }} />
                    Billig &amp; gr&oslash;n
                  </span>
                  <span
                    className="flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: "#F59E0B" }}
                  >
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#F59E0B" }} />
                    Middel
                  </span>
                  <span
                    className="flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: "#EF4444" }}
                  >
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#EF4444" }} />
                    Peak &mdash; dyr
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Kombineret score */}
          <div
            className="rounded-3xl border px-8 py-6 text-center"
            style={{
              background: `linear-gradient(135deg, ${C.blue}05, rgba(124,58,237,0.05))`,
              borderColor: `${C.blue}18`,
            }}
          >
            <p
              className="text-lg font-black tracking-tight"
              style={{ color: C.text }}
            >
              <span style={{ color: C.blue }}>Spar-score</span>
              {" + "}
              <span style={{ color: "#7C3AED" }}>Flyt-score</span>
              {" = "}
              <span style={{ color: "#D97706" }}>Din Energihelt-score</span>
            </p>
            <p className="mt-1.5 text-sm" style={{ color: C.muted }}>
              Du kan vinde p&aring; &eacute;n dimension eller dominere begge.
              Ranglisten viser dit samlede resultat.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ */}
      {/*  3. LIVE LEADERBOARD                    */}
      {/* ═══════════════════════════════════════ */}
      <section
        className="px-6 py-24 lg:py-32"
        style={{ background: `${C.blue}04` }}
      >
        <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
          <div>
            <p
              className="mb-3 text-sm font-bold uppercase tracking-wider"
              style={{ color: "#D97706" }}
            >
              Live rangliste
            </p>
            <h2
              className="text-3xl font-black tracking-tight sm:text-4xl"
              style={{ color: C.text }}
            >
              K&aelig;mp om{" "}
              <span style={{ color: C.blue }}>f&oslash;rstepladsen.</span>
            </h2>
            <p
              className="mt-2 text-base font-semibold"
              style={{ color: C.muted }}
            >
              Top i din by i denne uge
            </p>
            <p
              className="mt-4 max-w-sm text-base leading-relaxed"
              style={{ color: C.muted }}
            >
              Ranglisten opdateres automatisk hver dag. Se din placering og
              hvad der skal til for at rykke op.
            </p>
          </div>

          <div className="space-y-3">
            {leaders.map((entry, i) => (
              <div
                key={entry.rank}
                className="overflow-hidden rounded-2xl border px-5 py-4"
                style={{
                  background: C.card,
                  borderColor: i === 0 ? `${C.yellow}50` : C.border,
                  boxShadow:
                    i === 0 ? `0 4px 20px ${C.yellow}20` : undefined,
                  transition: "all 0.2s ease",
                }}
              >
                <div className="flex items-center gap-4">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black"
                    style={{
                      background:
                        i === 0
                          ? `${C.yellow}20`
                          : i === 1
                            ? `${C.blue}10`
                            : C.border,
                      color:
                        i === 0
                          ? "#D97706"
                          : i === 1
                            ? C.blue
                            : C.muted,
                    }}
                  >
                    {entry.rank}
                  </span>
                  <span
                    className="flex-1 font-semibold"
                    style={{ color: C.text }}
                  >
                    {entry.name}
                  </span>
                  <span
                    className="text-sm font-bold"
                    style={{ color: C.green }}
                  >
                    {entry.score.toFixed(0)}%
                  </span>
                </div>
                <div
                  className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full"
                  style={{ background: `${C.blue}10` }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, entry.score)}%`,
                      background:
                        i === 0
                          ? `linear-gradient(to right, #D97706, ${C.yellow})`
                          : `linear-gradient(to right, ${C.blue}, ${C.green})`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ */}
      {/*  4. SAVINGS DASHBOARD                   */}
      {/* ═══════════════════════════════════════ */}
      <section className="px-6 py-24 lg:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p
              className="mb-3 text-sm font-bold uppercase tracking-wider"
              style={{ color: C.green }}
            >
              Dit overblik
            </p>
            <h2
              className="text-3xl font-black tracking-tight sm:text-4xl"
              style={{ color: C.text }}
            >
              F&oslash;lg din{" "}
              <span style={{ color: C.blue }}>besparelse.</span>
            </h2>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-3">
            {[
              {
                label: "Besparelse",
                value: "14%",
                color: C.blue,
                icon: <TrendingDown className="h-6 w-6" />,
              },
              {
                label: "Sparet energi",
                value: "285 kWh",
                color: C.green,
                icon: <Zap className="h-6 w-6" />,
              },
              {
                label: "CO\u2082 sparet",
                value: "24 kg",
                color: "#D97706",
                icon: <Leaf className="h-6 w-6" />,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-3xl border p-8"
                style={{
                  background: C.card,
                  borderColor: C.border,
                  boxShadow: `0 4px 20px ${stat.color}08`,
                }}
              >
                <div
                  className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{
                    background: `${stat.color}12`,
                    color: stat.color,
                  }}
                >
                  {stat.icon}
                </div>
                <p
                  className="text-sm font-semibold uppercase tracking-wider"
                  style={{ color: C.muted }}
                >
                  {stat.label}
                </p>
                <p
                  className="mt-1 text-4xl font-black"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div
            className="mt-8 rounded-3xl border p-8 sm:p-10"
            style={{
              background: C.card,
              borderColor: C.border,
              boxShadow: `0 8px 40px ${C.blue}08`,
            }}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3
                  className="h-4 w-4"
                  style={{ color: C.blue }}
                />
                <span
                  className="text-sm font-semibold"
                  style={{ color: C.muted }}
                >
                  Ugentligt forbrug
                </span>
              </div>
              <span
                className="text-xs font-medium"
                style={{ color: `${C.muted}80` }}
              >
                Denne uge
              </span>
            </div>
            <div className="flex h-64 items-end gap-4 sm:h-80">
              {[
                { actual: 52, baseline: 70 },
                { actual: 48, baseline: 68 },
                { actual: 55, baseline: 72 },
                { actual: 38, baseline: 65 },
                { actual: 42, baseline: 70 },
                { actual: 35, baseline: 68 },
                { actual: 40, baseline: 70 },
              ].map((d, i) => (
                <div
                  key={i}
                  className="relative flex flex-1 flex-col items-center gap-2"
                  style={{ height: "100%" }}
                >
                  <div
                    className="relative flex w-full items-end justify-center"
                    style={{ height: "100%" }}
                  >
                    <div
                      className="absolute bottom-0 w-full rounded-xl"
                      style={{
                        height: `${d.baseline}%`,
                        background: `${C.blue}10`,
                      }}
                    />
                    <div
                      className="relative z-10 w-3/4 rounded-xl"
                      style={{
                        height: `${d.actual}%`,
                        background: `linear-gradient(to top, ${C.blue}, ${C.green})`,
                        opacity: 0.8,
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-medium"
                    style={{ color: C.muted }}
                  >
                    {["Ma", "Ti", "On", "To", "Fr", "L\u00f8", "S\u00f8"][i]}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-center gap-6 text-xs">
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-6 rounded-full"
                  style={{
                    background: `linear-gradient(to right, ${C.blue}, ${C.green})`,
                  }}
                />
                <span style={{ color: C.muted }}>Dit forbrug</span>
              </span>
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-6 rounded-full"
                  style={{ background: `${C.blue}15` }}
                />
                <span style={{ color: C.muted }}>Baseline</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ */}
      {/*  5. BADGES                              */}
      {/* ═══════════════════════════════════════ */}
      <section
        className="px-6 py-24 lg:py-32"
        style={{
          background: `linear-gradient(135deg, ${C.blue}06, ${C.green}06)`,
        }}
      >
        <div className="mx-auto max-w-4xl text-center">
          <p
            className="mb-3 text-sm font-bold uppercase tracking-wider"
            style={{ color: "#D97706" }}
          >
            Gamification
          </p>
          <h2
            className="text-3xl font-black tracking-tight sm:text-4xl"
            style={{ color: C.text }}
          >
            Saml <span style={{ color: C.blue }}>badges.</span>
          </h2>
          <p
            className="mx-auto mt-4 max-w-md text-lg"
            style={{ color: C.muted }}
          >
            Optjen badges mens du sparer str&oslash;m. Se din fremgang i realtid.
          </p>

          <div className="mt-14 flex flex-wrap items-center justify-center gap-4">
            {[
              {
                icon: <Zap className="h-6 w-6" />,
                label: "Spar 10%",
                color: C.blue,
                progress: 65,
              },
              {
                icon: <Zap className="h-6 w-6" />,
                label: "Spar 20%",
                color: C.blue,
                progress: 30,
              },
              {
                icon: <Moon className="h-6 w-6" />,
                label: "Natsparer",
                color: "#7C3AED",
                progress: 80,
              },
              {
                icon: <Leaf className="h-6 w-6" />,
                label: "CO\u2082 helt",
                color: C.green,
                progress: 50,
              },
              {
                icon: <Crown className="h-6 w-6" />,
                label: "Top 10",
                color: "#D97706",
                progress: 90,
              },
              {
                icon: <Flame className="h-6 w-6" />,
                label: "7 dage i tr\u00e6k",
                color: "#EF4444",
                progress: 43,
              },
              {
                icon: <Moon className="h-6 w-6" />,
                label: "Natuglen",
                color: "#7C3AED",
                progress: 55,
              },
              {
                icon: <Sun className="h-6 w-6" />,
                label: "Solsluger",
                color: "#D97706",
                progress: 35,
              },
              {
                icon: <Wind className="h-6 w-6" />,
                label: "Samfundshj\u00e6lper",
                color: C.green,
                progress: 20,
              },
            ].map((b) => (
              <div
                key={b.label}
                className="flex cursor-pointer flex-col items-center gap-2.5 rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                style={{
                  background: C.card,
                  borderColor: `${b.color}25`,
                  boxShadow: `0 2px 12px ${b.color}10`,
                  width: "138px",
                }}
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ background: `${b.color}15`, color: b.color }}
                >
                  {b.icon}
                </span>
                <span
                  className="text-center text-sm font-bold leading-tight"
                  style={{ color: C.text }}
                >
                  {b.label}
                </span>
                <div
                  className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full"
                  style={{ background: `${b.color}18` }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${b.progress}%`, background: b.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ */}
      {/*  6. SOCIAL PROOF                        */}
      {/* ═══════════════════════════════════════ */}
      <section
        className="px-6 py-24 lg:py-32"
        style={{ background: `${C.green}05` }}
      >
        <div className="mx-auto max-w-3xl text-center">
          <p
            className="mb-3 text-sm font-bold uppercase tracking-wider"
            style={{ color: C.green }}
          >
            Platformens samlede impact
          </p>
          <h2
            className="mb-14 text-3xl font-black tracking-tight"
            style={{ color: C.text }}
          >
            Vi sparer{" "}
            <span style={{ color: C.green }}>sammen.</span>
          </h2>
          <div className="grid grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="h-6 w-6" />,
                value: `${proofKwh} kWh`,
                label: "sparet energi",
                color: C.blue,
              },
              {
                icon: <Users className="h-6 w-6" />,
                value: proofParticipants,
                label: "aktive deltagere",
                color: C.green,
              },
              {
                icon: <Wind className="h-6 w-6" />,
                value: `${proofCo2} kg`,
                label: "CO\u2082 reduceret",
                color: "#D97706",
              },
            ].map((stat) => (
              <div key={stat.label}>
                <div
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{
                    background: `${stat.color}12`,
                    color: stat.color,
                  }}
                >
                  {stat.icon}
                </div>
                <p
                  className="text-3xl font-black sm:text-4xl"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </p>
                <p
                  className="mt-1 text-sm font-medium"
                  style={{ color: C.muted }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ */}
      {/*  7. FINAL CTA                           */}
      {/* ═══════════════════════════════════════ */}
      <section
        className="relative overflow-hidden px-6 py-36 lg:py-48"
        style={{
          background: `linear-gradient(150deg, #1e3a8a 0%, ${C.blue} 40%, #0891b2 75%, #059669 100%)`,
        }}
      >
        {/* Decorative blobs */}
        <div
          className="pointer-events-none absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full opacity-20 blur-[100px]"
          style={{ background: C.green }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full opacity-15 blur-[100px]"
          style={{ background: "#0ea5e9" }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-widest text-white/50">
            Klar til at spare?
          </p>
          <h2
            className="font-black tracking-tight text-white"
            style={{ fontSize: "clamp(2.8rem,6vw,5.5rem)", lineHeight: 1.05 }}
          >
            Start din energi-challenge
            <br />
            <span style={{ color: C.green }}>i dag.</span>
          </h2>
          <p className="mx-auto mt-8 max-w-sm text-xl text-white/70">
            Opret din profil p&aring; under 2 minutter. Det er helt gratis.
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-white/40">
            <Users className="h-4 w-4" />
            <span>Slut dig til {proofParticipants} deltagere</span>
          </div>
          <Link
            href={`/t/${tenantSlug}/auth/signup`}
            className="group mt-10 inline-flex items-center gap-3 rounded-full bg-white px-12 py-5 text-xl font-black shadow-2xl transition-all hover:scale-105 hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
            style={{ color: C.blue }}
          >
            Start challenge
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <p className="mt-6 text-sm text-white/30">
            Gratis &middot; Ingen binding &middot; Tilslut p&aring; 2 minutter
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-10" style={{ borderColor: C.border }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div
            className="flex items-center gap-2.5 text-sm"
            style={{ color: C.muted }}
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded"
              style={{ background: C.blue }}
            >
              <Zap className="h-3 w-3 text-white" />
            </span>
            &copy; {new Date().getFullYear()} {tenant.name}
          </div>
          <div className="flex gap-6 text-sm" style={{ color: C.muted }}>
            <Link
              href={`/t/${tenantSlug}/privacy`}
              className="hover:underline"
            >
              Privatlivspolitik
            </Link>
            <Link
              href={`/t/${tenantSlug}/terms`}
              className="hover:underline"
            >
              Vilk&aring;r
            </Link>
            <Link href={`/t/${tenantSlug}/faq`} className="hover:underline">
              FAQ
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

