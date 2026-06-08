# Sottobicchiere

PWA gaming per bar e locali con tavoli.

Ogni tavolo ha un QR code: ogni persona lo scansiona, sceglie un nickname e un gruppo, e può giocare con (o contro) gli altri presenti. L'MVP è focalizzato su giochi social rapidi da tavolo (preserata), con estensioni future verso carte e strategia light. I gestori del locale possono creare sfide personalizzate con premi. La privacy è al centro: nessun dato permanente per i giocatori (tutto effimero, pulizia automatica), nessun account richiesto in MVP.


## Capability MVP attuali

Stato reale del progetto (maggio 2026):

- ✅ Base applicativa Nuxt 4 configurata (layout `default` + `game`, welcome page, i18n IT/EN).
- ✅ Fondazioni documentali prodotto/architettura/design/database già presenti.
- ✅ Backend realtime su Supabase: schema, RLS, presence, broadcast da DB (migration SQL native).
- ✅ Join tavolo via route dinamica QR, lobby e motore partita realtime end-to-end.
- ✅ **Tavoli dinamici**: crea uno spazio di gioco al volo (anche fuori dal bar) e fai entrare gli altri via QR, link o codice breve (pagine `/new` e `/join`, API `/api/rooms`). Anonimo ed effimero. **Aree di gioco** gestibili in lobby (tab "Aree": l'host crea zone, ognuno si auto-assegna), squadre per-tavolo (`groups`) e **classifica per squadra** nei giochi. Schema applicato e verificato a livello API su un progetto Supabase reale; resta solo la prova interattiva del realtime (vedi `docs/dynamic-game-areas-workflow.md`).
- ⚠️ Admin venue, premi e analytics sono **post-MVP**.
- ⚠️ Nessuna autenticazione giocatore persistente nell'MVP (sessioni effimere, accesso anonimo Supabase).

## Stack

- **Framework**: Nuxt 4 SSR + Nitro (API REST su Vercel)
- **Realtime**: Supabase Realtime (presence + broadcast da DB via trigger Postgres)
- **DB**: Supabase Postgres con migration SQL native (sessioni effimere)
- **Auth**: Supabase anonymous sign-ins (JWT per autorizzare i channel privati)
- **UI**: Nuxt UI 4 (Reka UI + Tailwind CSS 4), tema chiaro/scuro
- **Motion**: `@vueuse/motion`, lenis (smooth scroll)
- **State**: Pinia + `pinia-plugin-persistedstate`
- **i18n**: `@nuxtjs/i18n` — italiano come lingua primaria
- **PWA**: `@vite-pwa/nuxt`
- **Deploy**: Vercel (SSR + API) + Supabase (DB + Realtime)
- **Testing**: Vitest + Playwright

## Prerequisiti

- Node.js 24+
- pnpm 11 (pinned da `packageManager`)
- `mkcert` per HTTPS locale
- Supabase CLI (per lo stack locale: Postgres + Realtime + Auth)
- File `.env` con le variabili Supabase (vedi `.env.example`)

## Setup locale

```bash
pnpm install
```

Genera i certificati TLS per l'HTTPS locale (necessari una volta sola):

```bash
mkdir -p certificates
mkcert -key-file certificates/server.key.pem -cert-file certificates/server.cert.pem localhost 127.0.0.1 ::1
```

> `mkcert` va installato a parte (vedi sito ufficiale). Le chiavi restano locali e non vanno committate.

Avvia lo stack Supabase locale e il server di sviluppo:

```bash
pnpm db:start      # avvia Postgres + Realtime + Auth locali (Supabase CLI)
pnpm db:reset      # applica migration + seed demo
pnpm dev           # server dev HTTPS su localhost:3000
```

URL locale: `https://localhost:3000`

## Database (sessioni effimere)

Le migration sono **SQL native Supabase** in `supabase/migrations/` (niente più Drizzle).

```bash
pnpm db:start      # avvia lo stack Supabase locale
pnpm db:reset      # applica migration + seed
pnpm db:diff       # genera una migration dal diff dello schema
pnpm db:types      # rigenera shared/types/database.ts dallo schema
pnpm db:push       # applica le migration al progetto remoto
```

Tabelle principali (MVP): `venues` (bar o stanze `adhoc`), `tables` (con `short_code`), `table_sessions`, `groups`, `areas`, `player_sessions`, `games`, `votes`, `dating_messages`.

## Struttura del progetto

```
app/                Frontend Nuxt (pagine, componenti, layout, stores)
├── components/      UI riutilizzabile
├── composables/     Hook riutilizzabili (es. useTableSocket)
├── layouts/         Layout default + game
├── pages/           Routing file-based (incluso [venue]/table/[token])
├── plugins/         Accesso anonimo Supabase (supabase-anon.client)
└── stores/          Pinia (giocatore, sessione)

server/             Backend Nitro (API REST su Vercel)
├── api/             Endpoint REST ([venue]/table/[token]/{game,session,dating})
└── utils/           supabase, request, game-engine, game-thumbs, host-election, dating

supabase/
├── migrations/      Schema, RLS, trigger di broadcast, pg_cron, seed
└── config.toml      Auth anonima + realtime in locale

shared/             Codice condiviso client/server (framework-neutral)
└── types/           realtime.ts (dominio) + database.ts (schema Supabase)
```

## Convenzioni

- **Italiano** come lingua principale dei contenuti (UI, copy, commenti pubblici)
- **Conventional Commits** per i messaggi git
- **Lint/format** prima di ogni commit (`pnpm lint`)

## Realtime backend (Supabase)

Il realtime non gira più su WebSocket Nitro (incompatibili con il serverless di Vercel). È gestito da Supabase:

```
Client (browser)
├─ @nuxtjs/supabase → signInAnonymously()        # ogni visitatore ha un JWT
├─ Channel privato "table:<tableSessionId>"
│     • Presence       # giocatori online (+ elezione host quando l'host esce)
│     • Broadcast (DB) # stato partita/sessione dai trigger Postgres
│     • Broadcast      # messaggi dating
├─ Channel "dating:lobby"  # disponibilità tavoli
└─ Azioni → POST /api/[venue]/table/[token]/...   # Nitro su Vercel

Server (service role, autorità sullo stato)
└─ scrive su Postgres → trigger realtime.broadcast_changes() → client
```

Dettagli su RLS, presence, quorum e **riassegnazione automatica dell'host** in [`docs/realtime-supabase.md`](docs/realtime-supabase.md).

## Cleanup sessioni scadute

- Gestito da **pg_cron** dentro Supabase (vedi migration), non più da task Nitro né Vercel Cron.
- Rimuove periodicamente le sessioni scadute (`expires_at < now()`) e i dati correlati (cascade).

## Roadmap (estratto)

- Admin venue per sfide e premi
- Analytics aggregate, anonime e privacy-first
- Nuove modalità di gioco

## Approfondimenti

Documentazione estesa in `docs/`:

- [Fondazioni di prodotto](docs/product-foundations.md)
- [Architettura](docs/architecture.md)
- [Schema database](docs/database-schema.md)
- [Contratti API](docs/api-contracts.md)
- [Modalità di gioco](docs/game-modes.md)
- [Design](docs/design.md)
- [Realtime su Supabase](docs/realtime-supabase.md)

## CI/CD

GitHub Actions:

- **CI** (`.github/workflows/ci.yml`): lint, typecheck, unit, build su ogni push/PR.
- **Security** (`.github/workflows/security.yml`): actionlint + CodeQL + Scorecard su push/PR e scansione schedulata.
- **Clear PR cache** (`.github/workflows/clear-pr-cache.yml`): pulizia cache GitHub Actions alla chiusura delle PR.

## Setup Supabase (sintesi)

1. Crea un progetto Supabase, poi `supabase link` e `pnpm db:push` per applicare le migration.
2. Abilita **Anonymous sign-ins** (Authentication → Providers).
3. Disattiva *Allow public access* su Realtime (channel privati via RLS).
4. Configura `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_KEY`, `NUXT_SUPABASE_SECRET_KEY` (in locale e su Vercel).

Dettagli in [`docs/realtime-supabase.md`](docs/realtime-supabase.md).

---

Made with ❤️ by [LuXDAmore](https://github.com/LuXDAmore)
