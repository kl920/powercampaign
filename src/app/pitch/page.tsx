"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Zap, Users, Target, TrendingUp, Trophy, ArrowRight, BarChart3, Shield, MapPin } from "lucide-react";

/* ── Animated counter ────────────────────────────────────────────── */
function Counter({ end, suffix = "", duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - t, 3);
          setValue(Math.round(end * ease));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return (
    <span ref={ref}>
      {value.toLocaleString("da-DK")}
      {suffix}
    </span>
  );
}

/* ── Main pitch page ─────────────────────────────────────────────── */
export default function PitchPage() {
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(true), []);

  return (
    <div className="min-h-screen bg-[#050a14] text-white overflow-x-hidden">
      {/* ─── NAV ─────────────────────────────────────────────────── */}
      <nav className="fixed top-0 z-50 w-full backdrop-blur-xl bg-[#050a14]/80 border-b border-white/5">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2 font-bold text-sm tracking-tight">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            PowerCampaign
          </div>
          <Link
            href="/t/gronstrom"
            className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 transition-colors"
          >
            Se live demo →
          </Link>
        </div>
      </nav>

      {/* ─── HERO ────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center px-6 pt-20 text-center">
        {/* Glow orbs */}
        <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-emerald-500/8 blur-[150px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-blue-500/6 blur-[120px]" />

        <div
          className="transition-all duration-1000 ease-out"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(30px)" }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-xs text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Platform klar — demo live nu
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
            Danmark Sparer Strøm
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              — Sammen
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/50 leading-relaxed sm:text-xl">
            Den første nationale energi-challenge.
            <br className="hidden sm:block" />
            3,2 mio. husstande kan deltage — uanset leverandør.
            <br className="hidden sm:block" />
            <span className="text-white/70 font-medium">Powered by dit brand.</span>
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/t/gronstrom"
              className="group flex items-center gap-2 rounded-full bg-emerald-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all"
            >
              Prøv live demo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#koncept"
              className="rounded-full border border-white/10 px-8 py-3.5 text-sm font-medium text-white/60 hover:text-white hover:border-white/20 transition-all"
            >
              Se konceptet
            </a>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mt-20 grid w-full max-w-3xl grid-cols-3 gap-px rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          {[
            { value: 3.2, suffix: " mio.", label: "Danske husstande med smart-måler" },
            { value: 15, suffix: "%", label: "Gns. besparelse i kampagneuge" },
            { value: 40, suffix: "%", label: "Lavere churn hos deltagere" },
          ].map((s, i) => (
            <div key={i} className="px-4 py-6 text-center sm:px-8 sm:py-8">
              <div className="text-2xl font-bold text-emerald-400 sm:text-3xl">
                <Counter end={s.value * 10} duration={1800} suffix="" />
                {s.suffix === " mio." ? <span className="text-lg"> mio.</span> : s.suffix}
              </div>
              <div className="mt-1 text-[11px] text-white/40 leading-tight sm:text-xs">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── PROBLEM ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 py-24">
        <p className="text-center text-sm font-medium uppercase tracking-widest text-white/30">Problemet</p>
        <h2 className="mt-4 text-center text-2xl font-bold sm:text-3xl">
          Strøm er usynligt. Kunder skifter for 12 øre.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-white/45 leading-relaxed">
          Energimarkedet er en commodity-kamp. Prisen er ens. Kunderne har ingen relation til deres leverandør.
          Marketingbudgettet konkurrerer mod alle andre om det samme budskab:
          &ldquo;Skift til os, vi er billigst&rdquo;.
        </p>
        <p className="mt-6 text-center text-lg font-semibold text-emerald-400">
          Hvad nu hvis kunderne kom til dig — frivilligt, med deres forbrugsdata i hånden?
        </p>
      </section>

      {/* ─── KONCEPT ─────────────────────────────────────────────── */}
      <section id="koncept" className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-center text-sm font-medium uppercase tracking-widest text-white/30">Konceptet</p>
        <h2 className="mt-4 text-center text-2xl font-bold sm:text-3xl">
          Én uge. Hele Danmark. Ét mål.
        </h2>
        <div className="mt-14 grid gap-4 sm:grid-cols-5">
          {[
            { step: "01", icon: Shield, title: "Tilmeld", desc: "MitID + Eloverblik. 2 minutter." },
            { step: "02", icon: BarChart3, title: "Baseline", desc: "Vi beregner dit normaforbrug automatisk." },
            { step: "03", icon: Zap, title: "Spar", desc: "Følg besparelsen live — time for time." },
            { step: "04", icon: Trophy, title: "Konkurrér", desc: "Husstand, postnummer, kommune." },
            { step: "05", icon: TrendingUp, title: "Resultat", desc: "kWh, kroner, CO₂ — dokumenteret." },
          ].map((s, i) => (
            <div
              key={i}
              className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-emerald-500/20 hover:bg-emerald-500/[0.03] transition-all"
            >
              <span className="text-[10px] font-bold text-emerald-500/40">{s.step}</span>
              <s.icon className="mt-2 h-5 w-5 text-emerald-400" />
              <h3 className="mt-3 text-sm font-bold">{s.title}</h3>
              <p className="mt-1 text-xs text-white/40 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TROJANSK HEST ───────────────────────────────────────── */}
      <section className="relative py-24">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/[0.03] to-transparent" />
        <div className="relative mx-auto max-w-4xl px-6">
          <p className="text-center text-sm font-medium uppercase tracking-widest text-emerald-500/60">Den strategiske fordel</p>
          <h2 className="mt-4 text-center text-2xl font-bold sm:text-3xl">
            Hver deltager er et kvalificeret lead
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-white/45 leading-relaxed">
            Når en deltager forbinder via Eloverblik, giver de adgang til 12+ måneders timedata — <span className="text-white/70 font-medium">uanset hvem de køber strøm hos i dag.</span>
          </p>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Target, title: "Personaliseret tilbud", desc: "Beregn den præcise besparelse ved skift — baseret på deltagerens egne data." },
              { icon: Users, title: "Konkurrentens kunder", desc: "Alle danskere kan deltage. De der ikke er dine kunder endnu, bliver dine leads." },
              { icon: MapPin, title: "Komplet profil", desc: "Timeforbrug, boligtype, postnummer, peak-vaner. GDPR-samtykket og frivilligt afleveret." },
            ].map((c, i) => (
              <div key={i} className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.03] p-6">
                <c.icon className="h-5 w-5 text-emerald-400" />
                <h3 className="mt-3 text-sm font-bold">{c.title}</h3>
                <p className="mt-2 text-xs text-white/45 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center">
            <p className="text-sm text-white/50 leading-relaxed">
              Når kampagneugen slutter:
            </p>
            <p className="mt-3 text-sm font-medium text-white/80 italic">
              &ldquo;Du sparede 38 kWh denne uge. Med vores FlexEl-aftale
              kunne du spare 1.240 kr/år.&nbsp;
              <span className="text-emerald-400 not-italic font-bold">Skift nu →</span>&rdquo;
            </p>
            <p className="mt-3 text-[11px] text-white/30">
              Ikke en generisk reklame. Et personaliseret tilbud baseret på deres egne data.
            </p>
          </div>
        </div>
      </section>

      {/* ─── POSTNUMMER-DYST ─────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8 sm:p-12">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
              <Trophy className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Postnummerdysten</h3>
              <p className="mt-1 text-sm text-white/45 leading-relaxed">
                Hvert postnummer er et hold. Det postnummer der sparer mest, vinder en
                kontant præmie til den lokale sportsklub. Klubberne deler selv opfordringen
                — <span className="text-white/65">viralitet uden mediebudget.</span>
              </p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            {[
              { nr: "4600 Køge", pct: "14,2 %", rank: "🥇" },
              { nr: "8000 Aarhus C", pct: "13,8 %", rank: "🥈" },
              { nr: "6700 Esbjerg", pct: "12,1 %", rank: "🥉" },
            ].map((p, i) => (
              <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-4">
                <div className="text-lg">{p.rank}</div>
                <div className="mt-1 text-xs font-bold">{p.nr}</div>
                <div className="text-xs text-emerald-400">{p.pct} sparet</div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-white/30 text-center">
            Fodboldklubben poster på Facebook → Lokalavisen skriver &ldquo;Køge fører&rdquo; → Forældre tilmelder hele husstanden → Organisk vækst.
          </p>
        </div>
      </section>

      {/* ─── TRE TRIN ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <p className="text-center text-sm font-medium uppercase tracking-widest text-white/30">Udrulning</p>
        <h2 className="mt-4 text-center text-2xl font-bold sm:text-3xl">Tre-trins raketten</h2>

        <div className="mt-12 space-y-4">
          {[
            {
              phase: "Pilot",
              time: "Q3 2026",
              color: "border-blue-500/20 bg-blue-500/[0.03]",
              accent: "text-blue-400",
              desc: "500 eksisterende kunder. Én kampagneuge. Validér 5-15 % reduktion.",
            },
            {
              phase: "Kampagne",
              time: "Q4 2026",
              color: "border-emerald-500/20 bg-emerald-500/[0.03]",
              accent: "text-emerald-400",
              desc: "10.000-30.000 deltagere. Postnummerdyst aktiveret. PR, engagement-data, churn-reduktion.",
            },
            {
              phase: "National",
              time: "2027",
              color: "border-amber-500/20 bg-amber-500/[0.03]",
              accent: "text-amber-400",
              desc: "Åben for alle 3,2 mio. husstande. Dit brand ejer dagsordenen. Høst leads fra hele branchen — på én uge.",
            },
          ].map((s, i) => (
            <div key={i} className={`flex items-start gap-6 rounded-2xl border p-6 ${s.color}`}>
              <div className="shrink-0 text-center">
                <div className={`text-2xl font-extrabold ${s.accent}`}>0{i + 1}</div>
                <div className="text-[10px] text-white/30">{s.time}</div>
              </div>
              <div>
                <h3 className="text-sm font-bold">{s.phase}</h3>
                <p className="mt-1 text-sm text-white/45 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────── */}
      <section className="relative py-28">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/[0.04] to-transparent" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            Klar til at invitere hele Danmark?
          </h2>
          <p className="mt-4 text-white/45 leading-relaxed">
            Platformen er bygget. Konceptet er bevist internationalt. Ingen i Danmark har gjort det endnu.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/t/gronstrom"
              className="group flex items-center gap-2 rounded-full bg-emerald-500 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all"
            >
              Se live white-label demo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <p className="mt-6 text-xs text-white/25">
            Demo-login: anna0@demo.dk / test1234
          </p>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-white/20">
        PowerCampaign — White-label energi-kampagneplatform
      </footer>
    </div>
  );
}
