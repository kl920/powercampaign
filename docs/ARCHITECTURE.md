# PowerCampaign — Arkitekturdokument

## Overblik

PowerCampaign er en white-label kampagneplatform til danske energiselskaber. Husholdninger deltager i en 7-dages strømspare-challenge baseret på rigtige elforbrugsdata, konkurrerer om at reducere elforbrug mod en fair baseline, og ser besparelse i kWh, kr og CO₂.

Platformen er multi-tenant: flere energiselskaber kører separate kampagner på samme infrastruktur med eget branding.

---

## Tech Stack

| Lag | Teknologi | Begrundelse |
|-----|-----------|-------------|
| Framework | Next.js 15 (App Router) | Server Components gør data-composition naturligt, ingen separat API-server |
| Sprog | TypeScript strict | Compile-time type safety på tværs af hele stakken |
| Styling | Tailwind CSS 4 + shadcn/ui | Hurtig, konsistent, god komponentbibliotek |
| Database | PostgreSQL | Proven, relational, Prisma-support, Neon for prod |
| ORM | Prisma 7 | Type-safe queries, client engine, migrations, seeding |
| Auth | Custom: bcrypt + iron-session | Fuld kontrol over multi-tenant sessions, ingen dependency lock-in |
| Charts | Recharts | Moden, SSR-kompatibel, god til energi-dashboards |
| Validation | Zod | Runtime + compile-time validering, Prisma-kompatibel |

---

## Systemarkitektur

```
┌─────────────────────────────────────────────────────┐
│                    NEXT.JS APP                       │
│                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Public   │  │ Participant  │  │    Admin      │  │
│  │  Pages    │  │   Pages      │  │    Pages      │  │
│  └────┬─────┘  └──────┬───────┘  └──────┬───────┘  │
│       │               │                 │           │
│  ┌────┴───────────────┴─────────────────┴───────┐  │
│  │           Server Layer (src/server/)           │  │
│  │                                               │  │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │Baseline │ │ Scoring  │ │ Leaderboard  │  │  │
│  │  │Engine   │ │ Engine   │ │ Engine       │  │  │
│  │  └─────────┘ └──────────┘ └──────────────┘  │  │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │Analytics│ │ Export   │ │ Dashboard    │  │  │
│  │  │         │ │          │ │ Data         │  │  │
│  │  └─────────┘ └──────────┘ └──────────────┘  │  │
│  └───────────────────┬───────────────────────────┘  │
│                      │                              │
│  ┌───────────────────┴───────────────────────────┐  │
│  │        Provider Layer (src/lib/providers/)     │  │
│  │  ┌──────────┐ ┌────────────┐ ┌────────────┐  │  │
│  │  │  Demo    │ │ Energinet  │ │  Utility   │  │  │
│  │  │ Provider │ │ Placeholder│ │ Placeholder│  │  │
│  │  └──────────┘ └────────────┘ └────────────┘  │  │
│  └───────────────────┬───────────────────────────┘  │
│                      │                              │
│  ┌───────────────────┴───────────────────────────┐  │
│  │              Prisma + PostgreSQL               │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Mappestruktur

```
src/
├── app/
│   ├── page.tsx                           # Root redirect / placeholder
│   ├── api/
│   │   ├── auth/
│   │   │   ├── register/route.ts          # POST — opret bruger + membership + consent
│   │   │   ├── login/route.ts             # POST — login med tenant-scope
│   │   │   ├── logout/route.ts            # POST — session destroy
│   │   │   └── me/route.ts               # GET — aktuel session
│   │   ├── onboarding/route.ts            # POST — husstand + consent + demo-connect
│   │   ├── account/delete/route.ts        # POST — soft delete + revoke
│   │   └── admin/
│   │       ├── campaign/route.ts          # PUT — opdater kampagne
│   │       ├── branding/route.ts          # PUT — upsert branding
│   │       ├── export/route.ts            # POST — CSV download
│   │       └── campaigns/[campaignId]/
│   │           └── recalculate/route.ts   # POST — genberegn pipeline
│   │
│   └── t/[tenantSlug]/
│       ├── layout.tsx                     # Tenant wrapper (branding CSS vars)
│       ├── page.tsx                       # Offentlig landingsside
│       ├── how-it-works/page.tsx          # Sådan virker det
│       ├── faq/page.tsx                   # FAQ
│       ├── privacy/page.tsx               # Privatlivspolitik
│       ├── terms/page.tsx                 # Vilkår
│       ├── auth/
│       │   ├── login/page.tsx             # Login-formular
│       │   └── signup/page.tsx            # Tilmelding + samtykke
│       ├── onboarding/page.tsx            # 4-trins stepper
│       ├── (participant)/
│       │   ├── layout.tsx                 # Auth nav (Dashboard, Rangliste, Profil)
│       │   ├── dashboard/page.tsx         # KPI-kort + dagligt chart + top 5
│       │   ├── leaderboard/page.tsx       # Fuld rangliste med medaljer
│       │   └── profile/page.tsx           # Profil, husstand, samtykker, slet konto
│       └── admin/
│           ├── layout.tsx                 # Sidebar med 8 nav-links
│           ├── page.tsx                   # KPI-grid + anomalier + besparelsesfordeling
│           ├── participants/page.tsx      # Deltagertabel med filtre
│           ├── connections/page.tsx       # Dataforbindelser overblik
│           ├── leaderboard/page.tsx       # Admin-rangliste med anomali-flag
│           ├── export/page.tsx            # CSV-download (4 typer)
│           ├── consents/page.tsx          # Samtykkeoverblik
│           ├── audit/page.tsx             # Audit log (200 seneste)
│           └── settings/page.tsx          # Kampagne + branding redigering
│
├── components/
│   ├── ui/                                # 21 shadcn/ui primitives
│   ├── shared/
│   │   ├── page-header.tsx                # Titel + beskrivelse + actions slot
│   │   └── stat-card.tsx                  # KPI-kort med trend-pil
│   ├── dashboard/
│   │   ├── daily-chart.tsx                # Recharts BarChart (baseline vs challenge)
│   │   └── delete-account-button.tsx      # To-trins bekræftelse
│   └── admin/
│       ├── recalculate-button.tsx         # Genberegn med spinner
│       ├── campaign-form.tsx              # Kampagne-redigering (navn, status, datoer, faktorer)
│       └── branding-form.tsx              # Farver, overskrift, live preview
│
├── lib/
│   ├── auth.ts                            # iron-session config + guards
│   ├── db.ts                              # Prisma client singleton (accelerateUrl)
│   ├── tenant.ts                          # getTenantBySlug() med React cache
│   └── validation.ts                      # Zod schemas (register, login, onboarding, consent)
│
├── server/
│   ├── baseline.ts                        # Baseline-beregning (4-ugers gennemsnit)
│   ├── scoring.ts                         # Scoring (kWh, DKK, CO₂, peak, konsistens)
│   ├── leaderboard.ts                     # Leaderboard rebuild
│   └── demo-provider.ts                   # Demo-data med realistiske forbrugsmønstre
│
└── middleware.ts                           # Auth + tenant guard for /t/* routes
```

---

## Multi-Tenant Arkitektur

### Tenant Resolution

Tenants resolves via **URL path-prefix**: `/t/[tenantSlug]/...`

```
/t/demo-energi/dashboard     → Tenant: Demo Energi
/t/noergi/admin              → Tenant: Nørgi
```

Middleware (`src/middleware.ts`) ekstrakter `tenantSlug`, slår op i DB og injicerer `tenantId` i session/context. Alle database-queries er scoped til aktiv tenant.

**Fase 2:** Subdomain-baseret resolution (`demo-energi.powercampaign.dk`).

### Brugerroller

| Rolle | Scope | Kan |
|-------|-------|-----|
| `PARTICIPANT` | Tenant | Tilmelde sig, forbinde data, se dashboard, se leaderboard |
| `TENANT_ADMIN` | Tenant | Administrere kampagner, se deltagere, eksportere, se analytics |
| `SUPER_ADMIN` | Global | Administrere tenants, system-settings, audit logs |

Rollen er defineret per `TenantMembership` — en bruger kan i princippet tilhøre flere tenants med forskellige roller.

---

## Auth System

Custom authentication — ingen Auth.js/Clerk dependency.

| Flow | Implementation |
|------|---------------|
| Register | Zod-validering → bcrypt hash (12 rounds) → User + TenantMembership → iron-session cookie |
| Login | Email lookup → bcrypt.compare → iron-session cookie med `userId`, `tenantId`, `role` |
| Session | `iron-session` encrypted cookie. Indeholder: `userId`, `tenantSlug`, `role` |
| Guards | `requireAuth()`, `requireTenantAdmin()`, `requireSuperAdmin()` |
| Logout | Session destroy |

**Hvorfor ikke Auth.js?** Auth.js er single-tenant. Multi-tenant session med `tenantId` + rolle-switching kræver hacks. Iron-session er 3KB og giver fuld kontrol.

---

## Data Provider Arkitektur

Al eldata-adgang er abstraheret bag et `MeterDataProvider` interface:

```typescript
interface MeterDataProvider {
  connectHousehold(input: ConnectInput): Promise<ConnectResult>
  fetchConsumption(input: FetchInput): Promise<ConsumptionRecord[]>
  revokeConnection(connectionId: string): Promise<void>
}
```

### Implementeringer

| Provider | Status | Beskrivelse |
|----------|--------|-------------|
| `DemoDataProvider` | ✅ Fase 1 | Genererer realistisk timebaseret elforbrug |
| `EnerginetPlaceholder` | 🔲 Fase 2 | Stub for Energinet/ElOverblik API |
| `UtilityPartnerPlaceholder` | 🔲 Fase 2 | Stub for direkte energiselskab-integration |

**Vigtigt:** Ingen del af platformen uden for provider-laget afhænger af en specifik datakilde. Scoring, baseline, leaderboard og UI virker uanset hvilken provider der er aktiv.

---

## Kampagnemotor

### Baseline Beregning

1. **Primær:** Gennemsnit af de seneste 4 fulde uger (≥85% datakomplethed, ≥143/168 timer)
2. **Fallback 1:** Seneste 2 uger
3. **Fallback 2:** Samme uge sidste år
4. **Fallback 3:** `limitedBaseline = true` — deltager kan ikke vinde hovedleaderboard

Baseline beregnes én gang per household per campaign og fryses som `BaselineSnapshot`.

### Scoring

```
savingKwh       = baselineKwh - challengeKwh
savingPercent   = (savingKwh / baselineKwh) * 100
estimatedDkk    = savingKwh × campaign.pricePerKwh
estimatedCo2    = savingKwh × campaign.co2Factor
```

Supplerende metrics: `peakHourReductionPercent`, `consistencyScore`, `anomalyFlag`.

### Leaderboard

Ranked efter `savingPercent` (ikke absolut kWh — ellers vinder store villaer altid). Tie-breaking: consistencyScore → savingKwh → householdId.

Kun `eligibleForMainLeaderboard = true` vises.

### Anomaly Detection

| Check | Trigger |
|-------|---------|
| Manglende data | Challenge completeness < 85% |
| Implausibelt lavt forbrug | challengeKwh < 10% af baseline |
| Extreme deviation | savingPercent > 80% |
| Nylig flytning | movedInAt < 35 dage før campaign start |

Anomaly = flag + reason, ikke automatisk diskvalifikation.

---

## Database Model (25+ modeller)

Se `prisma/schema.prisma` for komplet schema. Kernemodeller:

- **Tenant / TenantBranding / TenantMembership** — Multi-tenant fundament
- **Campaign** — Kampagnekonfiguration med CO₂-faktor og prisestimat
- **User / Household / HouseholdMember** — Brugere og husstande
- **MeterConnection / MeterPoint / ConsumptionInterval** — Eldata
- **BaselineSnapshot / ChallengeResult** — Beregninger
- **LeaderboardEntry** — Rankings
- **Group / Mission / Badge / Referral / Reward** — Social/gamification (Fase 2 UI)
- **ConsentRecord / AuditLog** — Compliance

---

## GDPR & Compliance

- **Separate samtykker:** PARTICIPATION, MARKETING, DATA_ACCESS — aldrig merged
- **Versioneret:** Hvert samtykke har version + timestamp
- **Revoke-ready:** Data access consent kan trækkes tilbage → connection revoked
- **Soft delete:** `deletedAt` på User + Household
- **Account deletion:** Anonymiserer consumption data, soft-deleter bruger, bevarer aggregeret statistik
- **Audit trail:** Alle admin-handlinger logges

---

## API Design

Server Actions bruges primært (Next.js 15 best practice). Route Handlers bruges til:

| Endpoint | Metode | Beskrivelse |
|----------|--------|-------------|
| `/api/auth/register` | POST | Opret bruger + TenantMembership + ConsentRecords (transaktionel) |
| `/api/auth/login` | POST | Login med tenant-scope, returnerer rolle + onboarding-status |
| `/api/auth/logout` | POST | Session destroy |
| `/api/auth/me` | GET | Returnerer aktuel session |
| `/api/onboarding` | POST | Opret husstand + member + DATA_ACCESS consent + demo-connect + 8 ugers data |
| `/api/account/delete` | POST | Soft delete bruger + husstande, revoke connections |
| `/api/admin/campaign` | PUT | Opdater kampagne (navn, status, datoer, CO₂/pris) |
| `/api/admin/branding` | PUT | Upsert tenant branding (farver, overskrift, email) |
| `/api/admin/export` | POST | Generer og download CSV (participants/results/consents/standings) |
| `/api/admin/campaigns/[id]/recalculate` | POST | Kør fuld pipeline: baseline → scoring → leaderboard |

---

## Faser

### Fase 1 (nuværende build)
Salgbar MVP: signup → connect demo data → dashboard → leaderboard → admin analytics → export

### Fase 2 (efter pilot)
Groups, missions, badges, referrals, notifications, Energinet integration, subdomain tenants

---

## Afrundingsstrategi

| Metric | Præcision |
|--------|-----------|
| kWh | 1 decimal |
| DKK | 2 decimaler |
| CO₂ (kg) | 3 decimaler |
| Procent | 1 decimal |

Prisma `Decimal` → JavaScript `number` via `Number()` med eksplicit `toFixed()` i præsentationslaget.
