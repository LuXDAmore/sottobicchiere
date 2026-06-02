# TODO — Sottobicchiere MVP Sprint Plan

Aggiornato: 2026-06-02

## Resilienza & Tavoli dinamici (2026-06-02)

- [x] Fix "Server error" in homepage senza Supabase configurato: il plugin server di
  `@nuxtjs/supabase` chiamava `createServerClient('','')` ad ogni richiesta SSR e
  lanciava → 500 su ogni pagina. Aggiunti fallback placeholder alle opzioni native
  `url`/`key` del modulo in `nuxt.config.ts` (sovrascritte dalle env reali) e guardia
  in `app/plugins/supabase-anon.client.ts` che salta l'accesso anonimo se non
  configurato. Verificato: build senza env → homepage HTTP 200.
- [x] Spec SpecDD feature "Dynamic Game Areas" (`docs/specs/dynamic-game-areas.feature.sdd`)
- [x] Documento workflow/agenti (`docs/dynamic-game-areas-workflow.md`)
- [?] Decidere: squadre per-area o per-tavolo (Decisione #1)
- [?] Decidere: scope del gioco (tavolo/area/squadra) (Decisione #2)
- [?] Decidere: TTL e rinnovo stanza ad-hoc (Decisione #3)
- [ ] F1 — Migration: venue ad-hoc, `short_code`, tabella `areas`, `player_sessions.area_id`, RLS, cron
- [ ] F2 — API: `POST /api/rooms`, `GET /api/rooms/resolve`, API aree
- [ ] F3 — UI: pagina `/new`, share sheet (QR+link+code), pagina `/join`, CTA homepage
- [ ] F4 — Lobby: aree & squadre + selezione al join + broadcast
- [ ] F5 — Scope gioco, i18n, test e2e, allineamento docs

## Bootstrap (fase 0) — Documentazione e Design System

- [x] Riscrivere README.md per Sottobicchiere
- [x] Aggiornare Agents.md (stack references)
- [x] Riscrivere .specdd/bootstrap.project.md per Sottobicchiere
- [x] Riscrivere app.sdd come contratto SpecDD Sottobicchiere
- [x] Aggiornare package.json (nome, descrizione, rimuovere dep WeGree)
- [x] Riscrivere nuxt.config.ts (rimuovere config WeGree)
- [x] Aggiornare app.config.ts con tema "Notte Italiana"
- [x] Aggiornare ui.css con design tokens Sottobicchiere
- [x] Aggiornare public/manifest.json
- [x] Creare docs/architecture.md
- [x] Creare docs/database-schema.md
- [x] Creare docs/design.md
- [x] Creare docs/agents-changelog.md
- [x] Espandere docs/product-foundations.md (journey, ruoli, lock, errori UI)
- [x] Creare docs/game-modes.md
- [x] Creare docs/api-contracts.md
- [x] Allineare README.md alle capability MVP effettive
- [x] Creare il logo SVG placeholder di Sottobicchiere (`public/logo-sottobicchiere-square.svg` + `favicon.svg`) e rimuovere gli asset WeGree residui

## Audit MVP pre-preview (2026-06-01)

- [x] Fix race realtime `close()`/`open()`: navigando lobby↔gioco la connessione restava morta (canale azzerato dopo l'await mentre `open()` faceva early-return)
- [x] Anti-spam toggle dating in lobby (stato di loading + `disabled` finché la POST non si risolve)
- [x] `game/select`: ristretto `selectedGame` ai giochi reali (`thumbs`/`word-blitz`) — niente più navigazioni verso `/game/<inesistente>`
- [x] `nuxt.config` supabase `types` → `shared/types/database.ts` (basta `Database = unknown` lato client)
- [x] Pulizia branding WeGree residuo: favicon + logo Sottobicchiere, `pwa-assets.config`, `.versionrc.json`, dizionario cspell
- [ ] Rigenerare il set completo di icone PWA dal nuovo SVG (`/images/icons/*` sono ancora i raster ereditati)
- [ ] Lock join durante partita attiva (attualmente chi entra viene portato direttamente nel gioco in corso)

## Database (fase 1)

- [x] Schema Drizzle: `venues`, `tables`, `table_sessions`, `player_sessions`, `groups`
- [ ] Generare e applicare la prima migrazione
- [x] Scheduled task Nitro: `cleanup-expired-sessions` (run giornaliero alle 06:00 UTC)

## App Structure (fase 1)

- [x] Layout `default` (header: logo + theme toggle + lang switcher)
- [x] Layout `game` (full-screen, minimal chrome)
- [x] Pagina welcome `index.vue` — hero + feature pills, CTA demo senza QR inline
- [x] Rotta dinamica `/[venue]/table/[token]` — join tavolo con lista sessioni attive
- [x] Pagina lobby tavolo — tabs (Giocatori | Giochi), gaming cards con categoria, dating toggle per-player

## MVP Sprint (2026-05-24)

### Fix bug critico
- [x] Migliorare messaggi di errore/join con toast async lato app
- [x] Uniformare i toast per tutte le principali azioni async (join, lobby, game)
- [x] Fix logica toast thumbs (vote/start) evitando success duplicati/falsi positivi
- [x] Allineare demo `tableSessionId` UUID anche in `session/create`
- [x] Rimuovere toast dating orfano e legare il pending a conferma WS/errore (no timeout fragile)
- [x] Sostituire i `setTimeout` con `useTimeoutFn` (VueUse) dove applicabile
- [x] Fix demo join: usare `tableSessionId` UUID-safe per evitare server error nei flussi successivi
- [x] Fix `isDemoFallbackEnabled()` — default `true` in non-production
- [x] Aggiornare `.env.example` default demo fallback a `true`
- [x] Fix `nuxt.config.ts` default `enableDemoFallback`
- [x] Fix `resolveTableRow`: controllo demo prima della query DB (demo resiliente a DB irraggiungibile)
- [x] Fix `select.post.ts`: path demo via WS broker in-memory (no 404 su selezione gioco)
- [x] Fix `ws/table.ts`: guard demo per `session:mode:set`, messaggi di errore italiani
- [x] Fix `ws/table.ts`: handler heartbeat `ping` (echo) per evitare loop disconnect/reconnect
- [x] Miglioramento messaggi di errore backend (statusMessage + testi user-friendly)
- [x] Miglioramento messaggi di errore frontend (fallback i18n più specifici)

### Join flow multi-sessione
- [x] Nuovo endpoint `GET /api/[venue]/table/[token]/sessions` — lista sessioni attive
- [x] Join page: mostra sessioni attive con card; seleziona o crea nuovo gruppo
- [x] `join.post.ts`: accept `sessionId` per join diretto a sessione specifica
- [x] Navigazione diretta al gioco se la sessione ha una partita in corso
- [x] Tipi `ActiveSessionSummary` e `SessionsResponse` in `shared/types/index.ts`

### Dating mode per-player
- [x] Nuovi WS messages: `dating:enable`, `dating:disable` (client→server)
- [x] Nuovo WS message: `dating:status` (server→client)
- [x] Tracking per-peer dating state in `server/routes/ws/table.ts` (in-memory)
- [x] `dating-room.ts`: session availability aggiornata per count di peer con dating enabled
- [x] Composable: `datingEnabled`, `datingUnreadCount`, `enableDating()`, `disableDating()`, `clearDatingUnread()`
- [x] Lobby: dating toggle in header con badge messaggi non letti
- [x] Lobby: pannello dating slide-down con inbox e form invio

### Tre sezioni + UI polish
- [x] Home page: hero + feature pills, rimozione QR inline, CTA pulita
- [x] `shared/utils/games.ts`: `GameDefinition`, `GameCategory`, `GAME_DEFINITIONS`, `getGamesByCategory()`
- [x] Lobby: tab navigation (Giocatori | Giochi)
- [x] Lobby: filtro giochi per categoria (Tutti | Da tavolo | Pre-serata)
- [x] Lobby: game card con icona, categoria badge, durata, min players
- [x] i18n: aggiornate chiavi IT + EN per tutti i nuovi elementi UI

### Documentazione
- [x] `docs/product-foundations.md` — aggiornato con nuovo join flow, dating individuale, tre sezioni
- [x] `docs/game-modes.md` — aggiornato con GameCategory e GameDefinition
- [x] `docs/agents-changelog.md` — nuova entry 2026-05-24
- [x] `TODO.md` — aggiornato con tasks sprint

## i18n (fase 1)

- [x] Creare `i18n/locales/it.json` con chiavi MVP
- [x] Creare `i18n/locales/en.json` con chiavi MVP
- [x] Verificare ogni stringa visibile in IT e EN prima del primo deploy (parità chiavi 119/119, nessuna chiave usata nel codice mancante)

## Giochi (fase 2)

- [x] Implementare "Pollice Su" (Thumbs) con WebSocket realtime
- [x] Implementare "Word Blitz" (prototipo locale)
- [x] WebSocket handler Nitro per sync real-time
- [x] Game state in-memory con `game-state.ts`
- [ ] Host handover automatico se host disconnette
- [ ] Lock join durante partita attiva (messaggio "partita in corso")
- [ ] Terzo gioco MVP: trivia/quiz a scelta multipla
- [ ] Replay/rematch senza tornare alla join page

## Venue Admin (fase 2)

- [ ] Rotta `/admin` protetta da token venue
- [ ] Dashboard venue: lista tavoli, QR code, sfide attive
- [ ] CRUD sfide venue con campo premio

## Funzionalità Future (backlog v2)

- [ ] Autenticazione giocatori (Better Auth, Google OAuth)
- [ ] Profili utente persistenti con statistiche
- [ ] Dating: storico conversazioni con tavolo anonimizzato
- [ ] Dating: "match" quando due tavoli si scambiano messaggi reciproci
- [ ] Marketplace giochi (gioco portato da un bar all'altro)
- [ ] Stripe per premi a pagamento
- [ ] Resend per notifiche venue admin
- [ ] Multi-region game state (Redis invece di in-memory)
