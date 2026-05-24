# Sottobicchiere

PWA gaming per bar e locali con tavoli.

Ogni tavolo ha un QR code: ogni persona lo scansiona, sceglie un nickname e un gruppo, e può giocare con (o contro) gli altri presenti. L'MVP è focalizzato su giochi social rapidi da tavolo (preserata), con estensioni future verso carte e strategia light. I gestori del locale possono creare sfide personalizzate con premi. La privacy è al centro: nessun dato permanente per i giocatori (tutto effimero, pulizia automatica), nessun account richiesto in MVP.


## Capability MVP attuali

Stato reale del progetto (maggio 2026):

- ✅ Base applicativa Nuxt 4 configurata (layout `default` + `game`, welcome page, i18n IT/EN).
- ✅ Fondazioni documentali prodotto/architettura/design/database già presenti.
- ✅ Schema dati iniziale Drizzle impostato a livello di codice (`server/db/schema.ts`).
- ⚠️ Join tavolo via route dinamica QR, lobby completa e motore partita realtime sono **in implementazione**.
- ⚠️ Admin venue, premi e analytics sono **post-MVP**.
- ⚠️ Nessuna autenticazione giocatore persistente nell’MVP (sessioni effimere).

## Stack

- **Framework**: Nuxt 4 SSR + Nitro (API e WebSocket real-time)
- **UI**: Nuxt UI 4 (Reka UI + Tailwind CSS 4), tema chiaro/scuro
- **Motion**: `@vueuse/motion`, lenis (smooth scroll)
- **State**: Pinia + `pinia-plugin-persistedstate`
- **i18n**: `@nuxtjs/i18n` — italiano come lingua primaria
- **DB**: NuxtHub con Neon PostgreSQL + Drizzle ORM (sessioni effimere)
- **KV**: Vercel Redis (stato real-time dei giochi)
- **Storage**: Vercel Blob (asset venue, future)
- **PWA**: `@vite-pwa/nuxt`
- **Deploy**: NuxtHub su Vercel
- **Testing**: Vitest + Playwright

## Prerequisiti

- Node.js 24+
- pnpm 11 (pinned da `packageManager`)
- `mkcert` per HTTPS locale
- File `.env` dalla CLI Vercel: `vercel env pull .env`

## Setup locale

```bash
pnpm install
```

### Certificati HTTPS locali

```bash
winget install mkcert          # o: brew install mkcert
mkcert -install
mkcert -key-file certificates/server.key.pem -cert-file certificates/server.cert.pem localhost 127.0.0.1 ::1
```

### Avvio dev

```bash
pnpm dev
```

URL locale: `https://localhost:3000`

## Database

Le migrazioni partono sempre dai file di schema Drizzle, mai da SQL manuale.

```bash
pnpm db:generate     # genera migrazione da schema
pnpm db:migrate      # applica migrazione
pnpm db:sql          # REPL SQL interattivo
```

Schema Drizzle: `server/db/schema.ts`

## Struttura directory

```
app/
├── assets/styles/   CSS globali e design tokens
├── components/      Componenti Vue riutilizzabili
├── composables/     Composable Vue
├── layouts/         Layout Nuxt (default, game)
├── pages/           Route Nuxt
├── stores/          Pinia stores
└── app.vue          Entry point

i18n/
└── locales/         File i18n (it.json, en.json)

server/
├── api/             API Nuxt/Nitro
├── db/              Schema Drizzle e migrazioni
├── routes/ws/       WebSocket handlers Nitro
├── tasks/           Scheduled tasks Nitro
└── utils/           Utility server-side

shared/              Tipi e utility cross-runtime
public/              Asset statici
docs/                Documentazione tecnica e di prodotto
```

## Shared Runtime

Il codice in `shared/` è framework-neutral: nessun composable Vue, nessun helper Nitro, nessun client DB. Solo tipi TypeScript puri e utility funzionali.

## i18n

Ogni stringa visibile all'utente deve avere traduzione in italiano (primario) e inglese. Prima di un PR, verificare l'UI in entrambe le lingue.

## Quality commands

```bash
pnpm prepare
pnpm lint
pnpm typecheck
pnpm test:unit -- --run
pnpm test:nuxt
pnpm test:coverage
```

`pnpm lint` deve terminare pulito prima del deploy.

## Script principali

```bash
pnpm dev           # server dev HTTPS su localhost:3000
pnpm build         # build produzione
pnpm preview       # anteprima build produzione
pnpm lint          # ESLint + Stylelint
pnpm lint:fix      # fix automatico
pnpm typecheck     # controllo TypeScript
pnpm test          # test unit
pnpm test:nuxt     # test Nuxt
pnpm test:coverage # coverage report
pnpm db:generate   # genera migrazione Drizzle
pnpm db:migrate    # applica migrazione
```

## Commit

Conventional Commits + commitlint:

```
type(scope?): subject
```

Tipi comuni: `feat`, `fix`, `docs`, `chore`, `ci`, `test`, `refactor`, `perf`, `style`

## Release

```bash
pnpm version:patch
pnpm version:minor
pnpm version:major
```

## Documentazione

- `docs/architecture.md` — architettura sistema e flussi dati
- `docs/database-schema.md` — schema DB e modello dati
- `docs/design.md` — design system, palette, tipografia, motion
- `docs/agents-changelog.md` — log delle sessioni di sviluppo AI

## Design

Asset, guide visive e palette in `design/`.
