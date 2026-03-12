# PowerCampaign — Internt Produktdokument

## Hvad er PowerCampaign?

En white-label kampagneplatform der gør det muligt for energiselskaber at køre datadrevne strømspare-challenges for deres kunder.

**Første use case:** 7-dages strømspare-challenge hvor husholdninger konkurrerer om at reducere elforbrug.

**Det rigtige produkt:** En genbrugelig kampagnemotor der kan drive mange typer challenges: peak-shifting, grøn uge, by-mod-by, vinterchallenge, familieudfordring osv.

---

## Hvorfor eksisterer det?

Energiselskaber vil gerne:
- **Engagere kunder** gennem gamification og konkurrence
- **Generere first-party data** via samtykkebaseret dataadgang
- **Fortælle en grøn historie** med målbar CO₂-reduktion
- **Skabe leads** via permission marketing
- **Differentiere sig** i et marked med identiske produkter

Borgerens adgang til egne forbrugsdata via Energinet/ElOverblik er det danske datafundament der gør det muligt.

---

## Value Proposition

### Til energiselskabet
> En white-label challenge platform der gør energiselskabets kundedata levende — med målbar kampagneeffekt, lead capture og ESG-storytelling.

### Til deltageren
> Se hvor meget du sparer i kroner og CO₂. Konkurrer mod andre husstande. Nemt, sjovt og konkret.

---

## Hvordan virker det?

### Deltager-flow
1. Ser kampagne-landingsside (branded af energiselskab)
2. Opretter konto
3. Udfylder husstandsoplysninger
4. Giver samtykke (deltagelse + data access + evt. marketing)
5. Forbinder eldata (demo i Fase 1, Energinet i Fase 2)
6. Platformen beregner en fair baseline (gennemsnit af 4 foregående uger)
7. Challenge-ugen starter — systemet sammenligner dagligt forbrug mod baseline
8. Dashboard viser: kWh sparet, kr sparet, CO₂ sparet, placering
9. Leaderboard viser ranking (procent-besparelse, ikke absolut kWh)

### Admin-flow
1. Logger ind som Tenant Admin (`admin@gronstrom.dk`)
2. Ser kampagne-overview med KPI'er (tilmeldte, forbundne, rangerede, kWh/kr/CO₂)
3. **Deltagere:** Tabel med filtre (forbundne, eligible, anomali, slettede)
4. **Forbindelser:** Meter connection status, provider, seneste synk
5. **Rangliste:** Admin-view med anomali-flags og konsistens-score
6. **Eksport:** Download CSV (deltagere, resultater, samtykker, rangliste)
7. **Samtykker:** Per-bruger oversigt med type, version, dato
8. **Audit Log:** De 200 seneste handlinger med aktør og enhed
9. **Kampagne:** Rediger navn, status, datoer, CO₂/pris-faktorer
10. **Branding:** Farver, overskrift, underoverskrift med live preview
11. **Genberegn:** Kør fuld pipeline (baseline → scoring → leaderboard)

---

## Forretningsmodel (anbefalet)

| Lag | Pris |
|-----|------|
| **Setup fee** | Opsætning, branding, integration |
| **Campaign license** | Per kampagne eller per måned |
| **Add-ons** | Ekstra rapportering, CRM-integration, AI tips, lokal leaderboard |

---

## Roller i systemet

| Rolle | Hvem | Kan |
|-------|------|-----|
| Participant | Husstand/borger | Tilmelde, forbinde data, se resultater, se leaderboard |
| Tenant Admin | Energiselskab-medarbejder | Styre kampagner, se analytics, eksportere, monitorere |
| Super Admin | PowerCampaign team | Administrere tenants, system-config, audit |

---

## Baseline & Fairness

**Problemet:** Hvis vi bare siger "brug mindre strøm", vinder store villaer der slukker varmepumpen i en uge. Det er hverken fair eller nyttigt.

**Løsningen:**
- Baseline = gennemsnit af de 4 foregående sammenlignelige uger
- Ranking = procent-besparelse (ikke absolut kWh)
- Fallback-system for manglende data (2 uger → samme uge sidste år → limited baseline)
- Anomaly-detection for svindel/fejl

**Resultat:** En single-person lejlighed der sparer 15% har lige så gode chancer som en villa — det handler om adfærdsændring, ikke om at have et stort hus.

---

## Samtykkemodel

Tre separate samtykker — aldrig merged:

| Type | Krævet for | Kan trækkes tilbage |
|------|-----------|-------------------|
| **PARTICIPATION** | At deltage i challenge | Ja → forlader challenge |
| **DATA_ACCESS** | At forbinde eldata | Ja → connection revoked |
| **MARKETING** | At modtage marketing efter kampagnen | Ja, altid |

Hvert samtykke er versioneret med timestamp og metadata.

---

## Multi-Tenant (White-Label)

Hvert energiselskab (tenant) får:
- Eget branding: logo, farver, headline, subheadline
- Egne kampagner
- Egne deltagere (data er isoleret)
- Egen admin-adgang
- Fremtidig: eget domæne

Tenant resolves via URL: `/t/demo-energi/dashboard`

---

## Data & Privacy

- Elforbrug lagres som timeintervaller (kWh per time)
- Data hentes kun med aktivt samtykke
- Systemet lagrer forbrugsdata — ikke direkte Energinet-credentials
- GDPR: soft delete, data anonymisering, audit trail
- Consent records er versionerede og revoke-ready

---

## Hvad er bygget i Fase 1

✅ Multi-tenant fundament (Tenant, Branding, Membership)
✅ Custom auth med rollebaseret adgang
✅ Kampagnemodel og konfiguration
✅ Demo Data Provider (realistisk timebaseret elforbrug)
✅ Baseline calculation engine (4-ugers gennemsnit med fallbacks)
✅ Scoring engine (kWh, kr, CO₂, peak-reduction, consistency)
✅ Leaderboard (procent-ranking med anomaly-flags)
✅ Participant flow: signup → onboarding → connect → dashboard → leaderboard
✅ Admin: overview, participants, meter connections, exports, consents, audit logs
✅ Seed data: 30 realistiske husstande med 8 uger historik
✅ GDPR: separate samtykker, soft delete, audit logging

---

## Hvad bygges i Fase 2 (efter pilot)

🔲 Groups + gruppe-leaderboard
🔲 Missions (self-reported + educational)
🔲 Badges + auto-tildeling
🔲 Referral system med invite codes
🔲 Daily tips (regelbaseret)
🔲 Notification system (email via Resend)
🔲 Energinet/ElOverblik API integration
🔲 Subdomain-baseret tenant resolution
🔲 Avanceret anomaly review UI
🔲 CRM/webhook integration
🔲 i18n (engelsk)

---

## Seed / Demo Mode

Platformen indeholder en komplet demo-verden:
- **GrønStrøm Energi** (`/t/gronstrom`) — fiktivt energiselskab med branding
- **30 husstande** — varieret boligtype, størrelse, postnummer
- **8 ugers historisk elforbrug** — realistisk timebaseret mønster med sæsonvariation
- **5 arketyper:**
  - 12× Normal (5-15% besparelse)
  - 6× Strong Saver (18-28%)
  - 4× No Improvement (-5% til -14%)
  - 3× Limited Baseline (kun 1 uges historik)
  - 2× Pending, 1× Failed, 1× Revoked, 1× Recent Mover
- **Færdige challenge-resultater** klar til genberegning

### Demo-credentials
| Rolle | Email | Kode |
|-------|-------|------|
| Tenant Admin | admin@gronstrom.dk | admin123! |
| Super Admin | super@powercampaign.dk | admin123! |
| Deltager | anna0@demo.dk | test1234 |

### Kommandoer
```bash
npx prisma dev      # Start lokal PostgreSQL (Prisma 7)
npx prisma db push  # Push schema til database
npx prisma db seed  # Seed 30 husstande + 8 ugers data
npm run dev          # Start Next.js dev server
```

---

## Vigtige arkitekturbeslutninger

| Beslutning | Begrundelse |
|-----------|-------------|
| Custom auth over Auth.js | Auth.js er single-tenant. Vi har brug for multi-tenant sessions |
| Ingen CSV import | Sikkerhedsrisiko, dårlig UX, ingen reel use case |
| Pure functions over service-interfaces | Next.js App Router er ikke Java. Simpelt > abstrakt |
| Path-prefix tenants over subdomains | Nemmere at udvikle og deploye i Fase 1 |
| Procent-ranking over absolut kWh | Fairness — ellers vinder store villaer altid |
| Schema-komplet, features faseopdelt | Alle modeller fra dag 1, men UI/logik bygges trinvist |

---

## Kontaktpunkter

| System | Detalje |
|--------|---------|
| Repo | Lokalt: `C:\AI\powercampaign` |
| Dev database | PostgreSQL via `npx prisma dev` (Prisma 7 lokal server) |
| Database URL | `prisma+postgres://` (konfigureret i `prisma.config.ts`) |
| PrismaClient | Bruger `accelerateUrl` (Prisma 7 client engine) |
| Start dev server | `npm run dev` |
| Seed database | `npx prisma db seed` (kører `npx tsx prisma/seed.ts`) |
| Push schema | `npx prisma db push` |
| Build | `npx next build` |
| Tenant URL | `/t/gronstrom/` |
| Admin URL | `/t/gronstrom/admin` |
