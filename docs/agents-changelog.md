# Agents Changelog

Log delle sessioni di sviluppo AI significative.
Non modificare CHANGELOG.md — è gestito dagli npm scripts.

---

## 2026-06-02 — Fix Server error homepage + pianificazione Tavoli/Aree dinamici

Sessione in due parti: (1) fix di resilienza della homepage quando Supabase non è
ancora configurato; (2) pianificazione SpecDD della feature "tavoli e aree di gioco
dinamici". Nessun codice della feature scritto (in attesa di conferma della spec).

### Fix resilienza homepage (no Supabase configurato)
- **Causa accertata** (lettura sorgente del modulo + verifica runtime con
  `@supabase/ssr`): il plugin server di `@nuxtjs/supabase` esegue `createServerClient`
  ad ogni richiesta SSR senza guardie; con `url`/`key` vuoti lancia
  *"Your project's URL and Key are required"* → **500 su ogni pagina**, homepage compresa.
  La homepage in sé è statica e non tocca il DB.
- `nuxt.config.ts` — aggiunti fallback placeholder alle **opzioni native** `url`/`key`
  del blocco `supabase` (`process.env.NUXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'`,
  idem key). Con env valide (build o runtime) i placeholder vengono sovrascritti dal modulo.
- `app/plugins/supabase-anon.client.ts` — guardia che salta `signInAnonymously()` quando
  l'URL è il placeholder, con warning chiaro. Usa solo composable/config nativi
  (`useRuntimeConfig().public.supabase`, `useSupabaseClient`, `useSupabaseUser`).
- **Nessuna dipendenza aggiunta** (`package.json`/lockfile invariati).
- **Verificato**: `pnpm build` senza env Supabase → avvio server → `GET /` restituisce
  **HTTP 200** e renderizza "Sottobicchiere" (prima: 500).

### Pianificazione feature (SpecDD)
- `docs/specs/dynamic-game-areas.feature.sdd` — contratto SpecDD: stanze dinamiche come
  venue `kind='adhoc'` + tavolo generato (riusa join/lobby/gioco/cleanup); aree come nuovo
  livello, squadre = `groups` esistenti; accesso via QR + link + short_code; tutto
  anonimo/effimero. Include Scenari, Tasks e decisioni aperte `[?]`.
- `docs/dynamic-game-areas-workflow.md` — workflow a fasi (F0–F5), modello dati proposto,
  decisioni da confermare e **ruoli degli agenti** (DB, Types, API, Realtime, Frontend,
  i18n, QA/Test, Docs) con scope e *done when*.

### Allineamento documentazione
- `app.sdd` e `.specdd/bootstrap.project.md` — corretti i riferimenti di stack rimasti
  indietro (Neon/NuxtHub/Drizzle/WebSocket Nitro) allineandoli allo stack reale
  **Supabase** (DB + realtime + auth anonima), come da README e migrazioni esistenti.
- `TODO.md` — nuova sezione 2026-06-02.

---

## 2026-06-01 — Audit MVP pre-preview: bugfix realtime, anti-spam, branding

Controllo completo A→Z del repository in vista della preview pubblica. Backend
(API Nitro, RLS, trigger, concorrenza voti/host) trovato solido; interventi
mirati su un bug realtime reale, hardening anti-spam e pulizia del branding.

### Bugfix
- `app/composables/useTableSocket.ts` — **race `close()`/`open()`**: navigando
  tra lobby e pagina di gioco, `close()` (async) cedeva il controllo prima di
  azzerare `tableChannel`; l'`open()` della nuova pagina vedeva il canale ancora
  valorizzato e faceva early-return, lasciando la connessione morta (banner
  "disconnesso", presence/quorum/host KO). Ora i riferimenti ai channel vengono
  azzerati in modo sincrono prima dell'`await unsubscribe`, così un `open()`
  concorrente ricrea sempre un canale pulito.
- `server/api/[venue]/table/[token]/game/select.post.ts` — `selectedGame`
  ristretto a `z.enum(['thumbs','word-blitz'])`: uno slug arbitrario veniva
  persistito e portava tutti i giocatori su `/game/<inesistente>` (404).

### Hardening anti-spam / loading
- `app/pages/[venue]/table/[token]/lobby.vue` — toggle dating con guardia
  `isTogglingDating`: bottone `disabled` + spinner finché la POST non si risolve,
  per impedire flip-flop e raffiche di richieste da click ripetuti.

### Config / DX
- `nuxt.config.ts` — `supabase.types` → `./shared/types/database.ts`: rimuove il
  warning del modulo e il fallback `Database = unknown` sul client tipizzato.

### Branding (rimozione residui WeGree)
- Nuovo logo placeholder Sottobicchiere: `public/logo-sottobicchiere-square.svg`
  (coaster + pattern dadi, palette "Notte Italiana") e `public/favicon.svg`.
- `pwa-assets.config.ts` punta al nuovo SVG sorgente.
- Rimossi gli asset orfani `public/logo-wegree-*.{svg,png}` e
  `public/images/logo-wegree.png`.
- `.versionrc.json` URL commit/compare/issue → repo `sottobicchiere`.
- `.cspell/custom-dictionary.txt` → `sottobicchiere`.

### Verifiche
- `pnpm typecheck` pulito, `pnpm test:unit` 14/14 verdi, ESLint 0 errori sui file
  toccati, parità chiavi i18n IT/EN 119/119 (nessuna chiave usata nel codice mancante).

---

## 2026-05-30 — Riassegnazione automatica dell'host + allineamento documentazione

### Feature: riassegnazione automatica dell'host
Ripristinato il comportamento del vecchio WebSocket (`reassignHost`), perso nella migrazione a Supabase: senza connessione persistente, se l'host chiudeva la pagina nessuno poteva più avanzare i round, cambiare modalità o riportare il quorum per l'auto-reveal.

- `server/utils/host-election.ts` — `electHost(currentHost, online, members)`: elezione pura e deterministica (id minore tra i membri online), con test unitari (`test/unit/host-election.test.ts`).
- `server/api/[venue]/table/[token]/session/claim-host.post.ts` — l'eletto rivendica l'host; il server valida proprietà/appartenenza/presenza, usa un update ottimistico con guardia su `host_player_id` (vince una sola richiesta) e allinea `games.host_player_id`.
- `app/composables/useTableSocket.ts` — alla presence sync, se l'host non è più online il client eletto chiama l'endpoint (debounce); il trigger su `table_sessions` propaga il nuovo host.

### Documentazione
- `README.md`, `docs/realtime-supabase.md`, `docs/architecture.md`, `docs/database-schema.md`, `docs/api-contracts.md` allineati allo stack Supabase (niente più Drizzle/Neon/Redis/Blob/WebSocket Nitro); aggiunte sezioni su presence/quorum e riassegnazione host.

### Verifiche
- `pnpm typecheck`, `pnpm eslint .`, `pnpm test:unit` verdi (14 test).

---


## 2026-05-25 — Fix loop disconnect/reconnect WebSocket (heartbeat ping/pong)

### Root cause fix
- `server/routes/ws/table.ts` — il client (`useWebSocket` di VueUse) invia un heartbeat `{ type: 'ping' }` ogni 15s e chiude la connessione se non riceve risposta entro `pongTimeout` (~1s). Il server non gestiva il messaggio `ping`, quindi la socket veniva chiusa e `autoReconnect` la riapriva in loop, rendendo inutilizzabili lobby, giochi e dating. Aggiunto handler che rimanda indietro il `ping`.
- `shared/types/ws.ts` — aggiunto `{ type: 'ping' }` a `ClientMessage` e `ServerMessage`.


## 2026-05-24 — Fix creazione gruppo demo + miglioramento messaggi di errore

### Root cause fix
- `server/utils/table-resolver.ts` — spostato il controllo demo **prima** della query al DB in `resolveTableRow`. Precedentemente la query avveniva sempre per prima: se il DB era irraggiungibile (cold start serverless, timeout), il path demo non veniva mai raggiunto e si otteneva un 500. Ora la demo non tocca mai il database.

### Fix: selezione gioco nella demo
- `server/api/[venue]/table/[token]/game/select.post.ts` — aggiunto path demo: emette `game:selected` e `game:locked` via WS broker in-memory (DEMO_TABLE_SESSION_ID) senza query DB. In precedenza la demo riceveva sempre 404 "Tavolo non trovato".

### Fix: session:mode:set WebSocket in demo
- `server/routes/ws/table.ts` — aggiunto guard per `tableSessionId === DEMO_TABLE_SESSION_ID` nel handler `session:mode:set`: ora esegue il broadcast in-memory senza query DB, evitando l'errore "Sessione non trovata" per la demo.

### Miglioramento messaggi di errore (backend)
- `server/routes/ws/table.ts` — tutti i messaggi di errore tradotti in italiano: "Missing connection params", "Invalid JSON", "Game already in progress", "Need at least 2 players", "No active voting round", "Only the host can advance rounds", "Voting still in progress", "No active game to advance", "Failed to advance round".
- Aggiunto `statusMessage` machine-readable su tutti i `createError()` negli endpoint API.
- Migliorati i testi user-facing: più specifici e azionabili (es. "QR code non riconosciuto. Chiedi al personale del locale." invece di "QR code non valido").

### Miglioramento messaggi di errore (frontend)
- `i18n/locales/it.json` — `join_error_generic`, `game_select_error_toast`, `leave_error_toast` aggiornati con testi più informativi.
- `i18n/locales/en.json` — stesse chiavi aggiornate in inglese.

### Cleanup
- `server/api/[venue]/table/[token]/index.get.ts` — rimosso fallback hardcoded per demo (`venueSlug === 'demo' && qrToken === 'demo-001'`) reso obsoleto dal fix in `resolveTableRow`.
- `server/api/[venue]/table/[token]/players.get.ts` — rimosso analogo fallback hardcoded obsoleto.

---

## 2026-05-24 — Timeout resiliente con VueUse (`useTimeoutFn`)

- `server/routes/ws/table.ts` — sostituito `setTimeout` (grace period su `player:left`) con `useTimeoutFn` per uniformare l'uso dei timer con utility VueUse/Nuxt auto-import compatibili e ridurre logica imperativa raw.

---

## 2026-05-24 — Fix feedback dating send (no timeout fragile)

- `app/pages/[venue]/table/[token]/lobby.vue` — rimosso reset `setTimeout(300ms)` per `isSendingDating`; ora lo stato pending si chiude su ack WS (`dating:message:new` coerente con sender/target/body) o su `wsError`.
- `i18n/locales/it.json` e `i18n/locales/en.json` — rimossa chiave orfana `dating_message_sent_toast` (non usata).

---

## 2026-05-24 — Fix commenti PR: toast thumbs/lobby + UUID demo session/create

- `app/pages/[venue]/table/[token]/game/thumbs.vue` — corrette condizioni toast: `vote_success` mostrato solo quando il voto locale è impostato; `start_success` mostrato una sola volta su transizione reale (pending start → phase voting), evitando duplicati a ogni update `gameState`.
- `app/pages/[venue]/table/[token]/lobby.vue` — `dating` non mostra più success ottimistico fuorviante: ora feedback di invio in corso; per `selectGame` il success toast è agganciato alla conferma WS (`lockedAt`) invece che alla sola risposta HTTP.
- `server/api/[venue]/table/[token]/session/create.post.ts` — demo branch aggiornato con stesso UUID-safe `tableSessionId` del join demo.
- `server/utils/demo-session.ts` — nuova costante condivisa `DEMO_TABLE_SESSION_ID` usata da join/session-create per evitare drift.
- `server/api/[venue]/table/[token]/join.post.ts` — usa la costante condivisa demo session id.

---

## 2026-05-24 — Toast UX uniforme per azioni async

- `app/pages/[venue]/table/[token]/lobby.vue` — aggiunti toast pending/success/error per selezione gioco, uscita lobby e invio messaggi dating.
- `app/pages/[venue]/table/[token]/game/thumbs.vue` — aggiunti toast per azioni async di gioco (start, voto, prossimo round, ritorno lobby) con cleanup su error/disconnessione.
- `i18n/locales/it.json` — nuove chiavi traduzione toast per lobby e game thumbs.
- `i18n/locales/en.json` — nuove chiavi traduzione toast per lobby e game thumbs.

---

## 2026-05-24 — UX error handling + fix server error su demo01

- `app/pages/[venue]/table/[token]/index.vue` — migliorata UX join: toast di stato per azioni async (pending/success/error) e messaggi d'errore più espliciti in pagina.
- `i18n/locales/it.json` — aggiunte stringhe toast per join (`join_pending_toast`, `join_success_toast`).
- `i18n/locales/en.json` — aggiunte stringhe toast per join (`join_pending_toast`, `join_success_toast`).
- `server/api/[venue]/table/[token]/join.post.ts` — messaggi errore server più parlanti con `statusMessage` esplicito; fix demo session id con UUID valido (`00000000-0000-4000-8000-000000000001`) per evitare errori downstream quando si inseriscono nome e gruppo nel demo.

---

## 2026-05-24 — MVP: fix QR demo, multi-sessione, dating per-player, UI refactor

**Obiettivo**: Far funzionare il demo QR, aggiungere il join flow multi-gruppo per tavolo, trasformare il dating in toggle individuale, rivedere l'UI con tre sezioni e aggiornare tutta la documentazione.

### Bug fix
- `server/utils/table-resolver.ts` — `isDemoFallbackEnabled()` ora torna `true` per default in non-production; rimossa dipendenza dal flag esplicito
- `.env.example` — default `NUXT_ENABLE_DEMO_FALLBACK` cambiato da `"false"` a `"true"`
- `nuxt.config.ts` — default `enableDemoFallback` cambiato da `|| 'false'` a `?? 'true'`

### Join flow multi-sessione (più gruppi per tavolo fisico)
- `server/api/[venue]/table/[token]/sessions.get.ts` — **nuovo**: lista sessioni attive per tavolo (playerCount, hasActiveGame, hostNickname)
- `server/api/[venue]/table/[token]/join.post.ts` — aggiunto campo `sessionId` per join diretto a una sessione specifica
- `shared/types/index.ts` — aggiunti `ActiveSessionSummary`, `SessionsResponse`
- `app/pages/[venue]/table/[token]/index.vue` — riscritto: card lista sessioni attive, selezione o creazione gruppo, navigazione diretta al gioco se partita in corso

### Dating mode per-player
- `shared/types/ws.ts` — aggiunti messaggi `dating:enable`, `dating:disable` (client→server) e `dating:status` (server→client)
- `server/routes/ws/table.ts` — tracking `peerDatingEnabled` e `sessionDatingPeerCount` in-memory; handler per i nuovi messaggi; cleanup al close; `dating:message:send` non richiede più `sessionMode === 'dating'`
- `app/composables/useTableSocket.ts` — aggiunti `datingEnabled`, `datingUnreadCount`, `enableDating()`, `disableDating()`, `clearDatingUnread()`

### Tre sezioni + UI polish
- `shared/utils/games.ts` — **nuovo**: `GameDefinition`, `GameCategory`, `GAME_DEFINITIONS`, `getGamesByCategory()`
- `app/pages/index.vue` — riscritto: hero + feature pills (Giochi da tavolo / Pre-serata / Dating), CTA pulita senza QR inline
- `app/pages/[venue]/table/[token]/lobby.vue` — riscritto: dating toggle nell'header con badge unread, pannello dating slide-down, tab navigation (Giocatori | Giochi), filtro categoria giochi, game card con icona/badge/durata
- `i18n/locales/it.json` — aggiornate chiavi per nuovi elementi UI
- `i18n/locales/en.json` — aggiornate chiavi per nuovi elementi UI

### Documentazione
- `docs/product-foundations.md` — aggiornato con multi-gruppo per tavolo, dating individuale, tre sezioni
- `docs/game-modes.md` — aggiunta sezione `GameDefinition` con tabella giochi MVP
- `TODO.md` — aggiunto sprint 2026-05-24 con tutti i task completati e backlog aggiornato

---

## 2026-05-21 — Bootstrap documentazione e design system

**Obiettivo**: Ripulire il repository da WeGree, impostare la base documentale e il design system per Sottobicchiere.

### File modificati/creati

**Documentazione**:
- `README.md` — riscritto completamente per Sottobicchiere
- `Agents.md` — aggiornati riferimenti stack da WeGree a Sottobicchiere
- `app.sdd` — riscritto come contratto SpecDD Sottobicchiere
- `.specdd/bootstrap.project.md` — riscritto per regole Sottobicchiere
- `TODO.md` — creata task list MVP con stati SpecDD
- `docs/architecture.md` — creato: architettura sistema, flusso QR→gioco
- `docs/database-schema.md` — creato: schema Drizzle per MVP
- `docs/design.md` — creato: design system "Notte Italiana", palette, tipografia, motion
- `docs/agents-changelog.md` — creato (questo file)

**Configurazione**:
- `package.json` — nome/descrizione/keywords/url aggiornati; rimossi: `better-auth`, `@onmax/nuxt-better-auth`, `stripe`, `@stripe/stripe-js`, `@vue-stripe/vue-stripe`, `resend`, `cheerio`, `papaparse`, `file-saver`, `@types/file-saver`, `@types/papaparse`; rimossi script WeGree-specific
- `nuxt.config.ts` — riscritto: rimossa config WeGree (auth, Stripe, Resend, Zucchetti, routeRules auth); aggiornati font (Fredoka, Nunito, Space Grotesk); semplificata i18n (solo it + en); aggiornato appId, piniaPluginPersistedstate key, pwa config, runtimeConfig
- `.env.example` — aggiornato per Sottobicchiere (rimossi secret WeGree)

**Design system**:
- `app/app.config.ts` — sostituito tema WeGree (verde) con "Notte Italiana" (indigo + violet + amber)
- `app/assets/styles/ui.css` — nuovo design system: palette Stone warm dark, Indigo primary, tipografia Fredoka/Nunito/Space Grotesk, gamification CSS
- `public/manifest.json` — aggiornato: nome, theme_color `#4F46E5`, background_color `#1C1917`

**App**:
- `app/app.vue` — aggiornato colore loading indicator (indigo)
- `app/pages/index.vue` — creata welcome page
- `app/layouts/default.vue` — creato layout principale
- `app/layouts/game.vue` — creato layout in-game full-screen
- `i18n/locales/it.json` — create traduzioni italiane MVP
- `i18n/locales/en.json` — create traduzioni inglesi MVP

**Database**:
- `server/db/schema.ts` — creato schema Drizzle MVP (venues, tables, table_sessions, player_sessions, groups)

### Decisioni tecniche

- **Better Auth / Stripe / Resend**: rimossi dall'MVP, pianificati per v2
- **Stone warm dark vs navy**: scelto Stone per background dark — più accogliente in ambienti bar con luci calde
- **Fredoka vs Syne**: scelto Fredoka per titoli gaming — più leggibile a distanza, più universale per tutte le età
- **colorMode.fallback**: cambiato da `light` a `dark` — la maggior parte dei bar ha ambienti con bassa luminosità
- **i18n semplificato**: solo `it` + `en` per MVP (rimossi de, fr, es)


## 2026-05-24 — Fix tavolo demo e documentazione prodotto

- Fix API `GET /api/[venue]/table/[token]` con fallback per `demo/demo-001` per evitare errore QR invalido in ambiente senza seed DB.
- Fix API `POST /api/[venue]/table/[token]/join` con join demo fallback e session/player temporanei anonimi.
- Fix API `GET /api/[venue]/table/[token]/players` con fallback demo.
- Aggiornata schedulazione cleanup sessioni Nitro a `0 6 * * *` (06:00 UTC).
- Creata `docs/product-foundations.md` con obiettivi prodotto, flussi, modalità (inclusa dating mode), e policy cleanup dati.
- Aggiornato `TODO.md` con task completati e data header.
## 2026-05-24 — Milestone documentazione prodotto/API MVP

**Obiettivo**: Consolidare documentazione funzionale MVP (journey, modalità gioco, contratti API) e riallineare README/TODO allo stato reale.

### File modificati/creati

- `docs/product-foundations.md` — espanso con user journey completo, ruoli host/player, regole sessione+lock, errori utente e messaggi UI previsti.
- `docs/game-modes.md` — nuovo documento con differenze tra giochi da tavolo, giochi preserata e dating mode.
- `docs/api-contracts.md` — nuovo documento con request/response payload per endpoint core MVP + codici errore.
- `README.md` — aggiunta sezione “Capability MVP attuali” e allineamento descrizione scope MVP.
- `TODO.md` — aggiornato stato milestone documentale e data ultimo aggiornamento.

### Outcome

- Maggiore chiarezza tra ciò che è già implementato, in corso, e post-MVP.
- Base condivisa per frontend/backend su UX flow e contratti API.
- Riduzione ambiguità di prodotto su famiglie di game mode e relativi vincoli.


## 2026-05-24 — Fallback demo controllato + seed tavoli + test API

- `server/utils/table-resolver.ts` — introdotto resolver condiviso venue/table con fallback demo `demo/demo-001` dietro flag runtime `NUXT_ENABLE_DEMO_FALLBACK`.
- `server/api/[venue]/table/[token]/{index.get,join.post,players.get}.ts` — aggiornate le API: fallback solo in demo/dev (flag), in produzione 404 solo per QR inesistente.
- `nuxt.config.ts` e `.env.example` — aggiunto `NUXT_ENABLE_DEMO_FALLBACK` in runtime config pubblico.
- `server/db/migrations/postgresql/0001_seed_venues_tables.sql` — seed iniziale idempotente per venue e tavoli reali + demo.
- `test/unit/table-resolver.test.ts` — aggiunti test per fallback demo attivo/disattivo e casi QR demo/reale.
- `docs/database-schema.md` — aggiunta procedura operativa “genera QR + seed tavoli”.


## 2026-05-24 — Fix bug fallback demo in produzione + copertura casi QR reale

- `server/utils/table-resolver.ts` — corretto bug logico: fallback demo ora forzato `false` in `production` anche con flag/env impostati.
- `test/unit/table-resolver.test.ts` — estesi i test per coprire: production override, QR reale esistente, QR reale inesistente e fallback demo attivo.

- Migrazioni DB spostate in `server/database/migrations` (path di default NuxtHub) e rimossa la chiave `hub.db.migrationsDirs` da `nuxt.config.ts`.


## 2026-05-24 — Selezione gioco lobby con lock host + sync WebSocket

- `server/db/schema.ts` — esteso `table_sessions` con `selectedGame`, `gameMode`, `lockedAt`, `hostPlayerId`.
- `server/api/[venue]/table/[token]/game/select.post.ts` — nuovo endpoint host-only per selezione e lock gioco.
- `server/api/[venue]/table/[token]/game/current.get.ts` — nuovo endpoint per stato gioco corrente in lobby.
- `server/utils/table-ws-broker.ts` — broker in-memory per emettere eventi WS da API Nitro.
- `server/routes/ws/table.ts` — sync stato selezione/lock ai join e registrazione peer per push eventi `game:selected` / `game:locked`.
- `shared/types/ws.ts` — estesi i messaggi server con i nuovi eventi game selection.
- `app/composables/useTableSocket.ts` — aggiunto stato `gameSelection` e gestione eventi nuovi.
- `app/pages/[venue]/table/[token]/lobby.vue` — UI lobby aggiornata: scelta giochi solo host prima del lock; visualizzazione “Gioco corrente” dopo selezione.

## 2026-05-24 — Hardening selezione gioco host (bugfix)

- `server/api/[venue]/table/[token]/game/select.post.ts` — aggiunta validazione `safeParse` con risposta `422` su payload invalido.
- `server/api/[venue]/table/[token]/game/select.post.ts` — aggiunta guard server-side che verifica che `playerId` appartenga alla `table_session` attiva prima di permettere la selezione (chiusura bypass non-host).
- `app/pages/[venue]/table/[token]/lobby.vue` — pulizia funzioni inutilizzate e formattazione script per coerenza.
