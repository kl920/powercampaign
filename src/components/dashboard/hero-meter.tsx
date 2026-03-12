"use client";
import { useEffect, useState } from "react";

const R = 75;
const CX = 100;
const CY = 98;
const CIRC = 2 * Math.PI * R;
const TRACK = CIRC * 0.75;

const ACTS = [
  { text: "Anna K. sparede 27% i går", icon: "⚡" },
  { text: "Lars P. rykkede op til #2", icon: "🏆" },
  { text: "Sarah M. fik badge: Natuglen", icon: "🦉" },
  { text: "Morten T. sparede 31 kWh", icon: "🌿" },
  { text: "Ida B. er Danmarks nye #1", icon: "👑" },
];

export function HeroMeter() {
  const [pct, setPct] = useState(0);
  const [kwh, setKwh] = useState(0);
  const [actIdx, setActIdx] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    const target = 72;
    const targetKwh = 285;
    const dur = 2000;
    const t0 = performance.now();
    let raf: number;
    function tick(now: number) {
      const t = Math.min((now - t0) / dur, 1);
      const e = 1 - (1 - t) ** 3;
      setPct(Math.round(e * target));
      setKwh(Math.round(e * targetKwh));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setActIdx((i) => (i + 1) % ACTS.length);
        setFadeIn(true);
      }, 350);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const fillLen = Math.max(0, (pct / 100) * TRACK);
  const act = ACTS[actIdx];

  return (
    <div
      className="float-medium overflow-hidden rounded-3xl border"
      style={{
        background: "#FFFFFF",
        borderColor: "rgba(37,99,235,0.22)",
        boxShadow:
          "0 32px 80px rgba(37,99,235,0.15), 0 8px 24px rgba(37,99,235,0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-0">
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: "#64748B" }}
        >
          Dit dashboard
        </span>
        <span
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
          style={{ background: "rgba(34,197,94,0.1)", color: "#16A34A" }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
          </span>
          Live
        </span>
      </div>

      {/* SVG Gauge */}
      <div className="px-6 pt-1 pb-0">
        <svg
          viewBox="0 0 200 192"
          className="mx-auto w-full max-w-[250px]"
          aria-label={`${pct}% sparet ift. baseline`}
        >
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="45%" stopColor="#22C55E" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <filter id="gaugeGlow" x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background track */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="rgba(148,163,184,0.18)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${TRACK} ${CIRC - TRACK}`}
            transform={`rotate(135 ${CX} ${CY})`}
          />

          {/* Tick marks */}
          {Array.from({ length: 11 }, (_, i) => {
            const angleDeg = 135 + i * 27;
            const angleRad = (angleDeg * Math.PI) / 180;
            const isDone = i * 10 <= pct && i > 0;
            const isEdge = i === 0 || i === 10;
            const inner = isEdge ? R - 14 : R - 11;
            const outer = isEdge ? R - 6 : R - 7;
            return (
              <line
                key={i}
                x1={CX + inner * Math.cos(angleRad)}
                y1={CY + inner * Math.sin(angleRad)}
                x2={CX + outer * Math.cos(angleRad)}
                y2={CY + outer * Math.sin(angleRad)}
                stroke={
                  isDone
                    ? "rgba(34,197,94,0.7)"
                    : "rgba(148,163,184,0.25)"
                }
                strokeWidth={isEdge ? "2" : "1.5"}
                strokeLinecap="round"
              />
            );
          })}

          {/* Filled arc */}
          {fillLen > 0 && (
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke="url(#gaugeGrad)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${fillLen} ${CIRC - fillLen}`}
              transform={`rotate(135 ${CX} ${CY})`}
              filter="url(#gaugeGlow)"
            />
          )}

          {/* Percentage */}
          <text
            x={CX}
            y={CY - 5}
            textAnchor="middle"
            fontSize="42"
            fontWeight="900"
            fill="#0F172A"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {pct}%
          </text>
          <text
            x={CX}
            y={CY + 16}
            textAnchor="middle"
            fontSize="11"
            fill="#64748B"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            sparet ift. baseline
          </text>
          <text
            x={CX}
            y={CY + 34}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="#22C55E"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            ↓ {kwh} kWh denne uge
          </text>

          {/* Axis labels */}
          <text
            x="18"
            y="176"
            fontSize="9"
            fill="#94A3B8"
            textAnchor="middle"
            fontFamily="system-ui"
          >
            0%
          </text>
          <text
            x="182"
            y="176"
            fontSize="9"
            fill="#94A3B8"
            textAnchor="middle"
            fontFamily="system-ui"
          >
            100%
          </text>
        </svg>
      </div>

      {/* KPI chips */}
      <div className="grid grid-cols-3 gap-2 px-4 pb-3">
        <div
          className="rounded-xl p-2.5 text-center"
          style={{ background: "rgba(37,99,235,0.06)" }}
        >
          <p
            className="text-[9px] font-bold uppercase tracking-wider"
            style={{ color: "#94A3B8" }}
          >
            Kr. sparet
          </p>
          <p
            className="mt-0.5 text-base font-black"
            style={{ color: "#2563EB" }}
          >
            427 kr
          </p>
        </div>
        <div
          className="rounded-xl p-2.5 text-center"
          style={{ background: "rgba(34,197,94,0.07)" }}
        >
          <p
            className="text-[9px] font-bold uppercase tracking-wider"
            style={{ color: "#94A3B8" }}
          >
            CO₂
          </p>
          <p
            className="mt-0.5 text-base font-black"
            style={{ color: "#16A34A" }}
          >
            24 kg
          </p>
        </div>
        <div
          className="rounded-xl p-2.5 text-center"
          style={{ background: "rgba(250,204,21,0.1)" }}
        >
          <p
            className="text-[9px] font-bold uppercase tracking-wider"
            style={{ color: "#94A3B8" }}
          >
            Placering
          </p>
          <p
            className="mt-0.5 text-base font-black"
            style={{ color: "#D97706" }}
          >
            #4
          </p>
        </div>
      </div>

      {/* Activity ticker */}
      <div
        className="border-t px-4 py-2.5"
        style={{
          borderColor: "rgba(148,163,184,0.1)",
          background: "rgba(248,250,252,0.9)",
        }}
      >
        <div
          className="flex items-center gap-2 text-xs font-medium"
          style={{
            color: "#64748B",
            opacity: fadeIn ? 1 : 0,
            transition: "opacity 0.35s ease",
          }}
        >
          <span className="text-sm leading-none">{act.icon}</span>
          <span>{act.text}</span>
        </div>
      </div>
    </div>
  );
}
