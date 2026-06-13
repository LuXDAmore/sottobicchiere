# TODO — Sottobicchiere MVP Sprint Plan

Aggiornato: 2026-06-13

## Giochi: nuovo set + categoria "solo" (2026-06-13)

- [x] **Riflessi** (`reflex`, solo): reaction game client-side, record in localStorage
- [x] **Duello** (`duello`, 2 giocatori 1 device): duello di riflessi a schermo diviso, al meglio dei 3
- [x] **Pre-Serata** (`dares`, preserata): mazzo Picolo-like (Verità/Obbligo/Regola/Sorso/Tutti), bilingue
- [x] **Categorie** (`categorie`, both): pass-the-phone con timer per turno
- [x] Categoria `solo` nel catalogo + tab/badge in lobby; `getGamesByCategory` isola i solo dai both
- [x] Contenuti in `shared/utils/party.ts` (mazzi + `shuffle`) con unit test; catalogo testato (`games.test.ts`)
- [x] `select.post.ts`: enum giochi derivato dal catalogo (single source of truth)
- [x] i18n IT/EN per i 4 giochi (parità 250/250); docs (`game-modes.md`) e changelog allineati
- [ ] Terzo gioco realtime competitivo (trivia/quiz multiplayer con stato su DB) — vedi "Giochi (fase 2)"
- [ ] Estrarre un `GameHeader` condiviso (header ora duplicato in lobby + 6 pagine di gioco)

## Condivisione tavolo & resilienza realtime (2026-06-12)

- [x] **Fix race connessione lobby↔gioco**: `useTableSocket` non smonta più il channel a ogni
      navigazione (close differito con finestra di grazia + smaltimento serializzato).
      Root cause: realtime-js riusa l'istanza per topic finché il leave non è completato →
      il channel "nuovo" era quello morente (subscribe no-op o throw su `.on('presence')`),
      da cui i banner "Connessione persa" entrando in un gioco.
- [x] Toast "Connessione interrotta" solo dopo 3 errori consecutivi di subscribe (prima era
      immediato): i retry transitori (es. cold start realtime) restano un'attesa soft (banner ambra)
- [x] Bottone "Riconnetti" ora ricrea il channel anche se il vecchio è stato chiuso dal server
- [x] `GET /api/[venue]/table/[token]` espone `shortCode` (null per i tavoli fisici)
- [x] Componente `table-invite`: bottom sheet d'invito (QR + codice + link + share nativo),
      trigger negli header di lobby/thumbs/word-blitz e CTA nell'attesa "servono 2 giocatori"
- [ ] Estrarre un `GameHeader` condiviso (header oggi duplicato in lobby/thumbs/word-blitz)
- [ ] Mostrare il pannello invito anche nella pagina di join (`index.vue`) per chi non è ancora entrato
- [x] **Fix "Connection lost" dopo "back to lobby"**: reference counting dei consumatori in
      `useTableSocket` (Vue monta la pagina nuova PRIMA di smontare la vecchia: il close
      della vecchia non deve smontare il channel appena riusato) + `reconnect()` dedicato
- [x] Lobby: spinner solo sulla card del gioco selezionato (prima giravano tutte)
- [x] Niente navigazione forzata su stato recuperato: refresh/riconnessione/broadcast non
      ributtano in partita; banner "Partita in corso" con **Rientra** + **Termina** (host)
- [x] `POST /game/end` (host): termina la partita e sblocca la selezione → si può cambiare gioco
- [x] `POST /leave`: rimuove il giocatore (conteggi sessioni veritieri), fa scadere la sessione
      vuota e azzera `host_player_id` se esce l'host
- [x] Regole giochi: descrizione breve sulle card + modale "Come si gioca" (`game-rules-modal`)
      in lobby e dentro thumbs/word-blitz; back-to-lobby sempre presente nell'header di thumbs
- [x] Filtro "siamo in N" nella tab Giochi (min/max dal catalogo)
- [x] **Verifica live sui flussi** (`scripts/e2e-live-flows.mjs`, contro la preview del PR):
      22/22 step — min giocatori, end/sblocco, ri-selezione, guardie host/impersonificazione,
      leave singolo/doppio, sessione svuotata scaduta. Regressione gioco completo 15/15 ✓
- [x] **Hardening da review full-stack**: navigazione al gioco guidata da un segnale di
      "lancio" (`gameLaunch`) emesso solo dai broadcast live, al posto dell'euristica sul
      clock (`Date.now()` vs `locked_at`) che poteva non far entrare i guest con clock
      sfasato; le pagine di gioco seguono un eventuale cambio gioco (chiude l'edge: host
      termina e lancia un gioco diverso mentre un guest è ancora nel vecchio);
      `disposalPromise` riazzerato nel `finally` (niente unhandled rejection su open futuri);
      commento MVP sul gioco cablato in `game/start`
- [x] Agenti Claude Code verticali (`.claude/agents/`): docs-curator, design-system-guardian,
      code-reviewer, test-author, supabase-guardian; workflow (`.claude/commands/`):
      `/verifica`, `/pre-pr`, `/nuovo-gioco` (vedi Agents.md §6)
- [x] **Fix "Connection lost" al primo ingresso nel tavolo appena creato**: riapertura
      automatica con backoff (3 tentativi) quando il server chiude il channel inaspettatamente
      (autorizzazione realtime non ancora visibile al cold start) — equivale al "Riconnetti"
      manuale che già funzionava
- [x] Avviso "Sei solo al tavolo" in lobby (UAlert + CTA invito) quando presence = 1
- [x] `GameDefinition.maxPlayers` opzionale + min/max mostrati sulle card della lobby
      ("Min. {n}" o "{min}–{max}"); min/max applicati anche server-side in `game/start`;
      `word-blitz` ora `minPlayers: 1` (allineato alla descrizione "1+"); il minimo di
      thumbs è data-driven dal catalogo (UI + API)

## Review MVP & go-live (2026-06-11)

- [x] Fix `pnpm lint` rotto: `stylelint:check` puntava a `**/*.scss` inesistenti → ora `.css`
      (sbloccato anche il job CI `lint`, prerequisito di `build`)
- [x] CI: rimossi residui WeGree (fallback env/branding) e variabili dello stack vecchio;
      validazione env ora sul trio Supabase
- [x] i18n: messaggi d'errore hardcoded in `useTableSocket.ts` → chiavi `error.generic` /
      `error.connection_lost` (IT/EN)
- [x] DB: indice su FK `games.host_player_id` (migration + applicato al progetto reale)
- [x] README: sezione CI/CD allineata ai workflow reali (no e2e.yml/deploy.yml)
- [x] Diagnosi "errore generico" su creazione tavolo: **Anonymous sign-ins disabilitati** sul
      progetto Supabase reale → 401 su `/api/rooms`. Abilitati in dashboard ✓
- [x] **Verifica live su produzione** (`scripts/e2e-live-game.mjs`): 2 utenti anonimi →
      crea stanza → short code/link condivisibile → join → channel realtime privati
      SUBSCRIBED → thumbs → voti → reveal → broadcast DB ricevuti da entrambi. 15/15 step ✓
- [x] **Verifica live dating** (`scripts/e2e-live-dating.mjs`): 2 tavoli → online/offline
      → messaggio A→B + risposta B→A via realtime → invio a tavolo offline rifiutato (409)
      → ritorno online. 21/21 step ✓ (anche su preview del branch con i fix)
- [x] Giro finale di review pre-go-live: fix host-claim in `game/select` (semantica
      requireHostSession), timeout ACK dating in lobby (8s), reset store player scaduto
- [ ] I workflow GitHub Actions (CI/Security) risultano attivi ma **non sono mai stati
      eseguiti** (0 run nella storia del repo): controllare Settings → Actions
- [ ] Riabilitare l'indicizzazione al go-live (`public/_robots.txt` + `robots` in
      `nuxt.config.ts` oggi bloccano tutti i crawler — scelta QA voluta)
- [ ] Manifest PWA monolingue (`lang: "it"` anche su `/en/`) + icone raster da rigenerare

## Resilienza & Tavoli dinamici (2026-06-02)

- [x] Fix "Server error" in homepage senza Supabase configurato: il plugin server di
  `@nuxtjs/supabase` chiamava `createServerClient('','')` ad ogni richiesta SSR e
  lanciava → 500 su ogni pagina. Aggiunti fallback placeholder alle opzioni native
  `url`/`key` del modulo in `nuxt.config.ts` (sovrascritte dalle env reali) e guardia
  in `app/plugins/supabase-anon.client.ts` che salta l'accesso anonimo se non
  configurato. Verificato: build senza env → homepage HTTP 200.
- [x] Spec SpecDD della feature "Dynamic Game Areas" (`docs/specs/dynamic-game-areas.feature.sdd`)
- [x] Documento workflow/agenti (`docs/dynamic-game-areas-workflow.md`)
- [x] Decisioni confermate: #1 squadre per-tavolo · #2 gioco per-tavolo + punteggio squadra · #3 TTL 8h
- [x] F1 — Migration: venue ad-hoc, `short_code`, tabella `areas`, `player_sessions.area_id`, RLS, cron esteso
- [x] F1 — Tipi `shared/types/database.ts` allineati a mano (rieseguire `db:types` su DB reale per conferma)
- [x] F2 — API: `POST /api/rooms`, `GET /api/rooms/resolve` + `shared/utils/room-code` + unit test (7)
- [x] F3 — UI: pagina `/new`, share (QR+link+code), pagina `/join`, CTA homepage + i18n IT/EN
- [x] Fix realtime `user.id`→`user.sub` (claims JWT) in join/request/room — sblocca i channel privati
- [x] F4 — API aree (`/areas`, `/areas/assign`) + tab "Aree" in lobby + broadcast `lobby:changed`
- [x] Test `createAdhocRoom` (retry/rollback) + review Copilot PR #25 risolte
- [x] F5 — Punteggio per squadra: `aggregateTeamScores` + `GET /groups` + classifica squadre in thumbs
- [x] DB applicato al progetto Supabase reale (9 tabelle + RLS + seed + trigger + pg_cron) e
      verificato a livello API (preview: `GET /api/demo/table/demo-001` → 200)
- [x] Hardening da Supabase advisors: revoke EXECUTE sulle funzioni, search_path, indice FK groups
- [ ] Prova interattiva (browser): crea stanza `/new` → join via QR/link/codice → tab Aree +
      classifica per squadra in tempo reale. Richiede Anonymous sign-ins = ON in Supabase.
- [ ] Test e2e automatico (Playwright) crea→condividi→join→gioca

## Priorità operative (Now / Next / Later)

### Now
- [ ] E2E reale del flusso core: crea stanza → join multiplo → aree → partita → classifica team
- [ ] Join lock robusto durante partita attiva con UX chiara (spettatore/attesa prossima partita)

### Next
- [ ] Venue Admin MVP: gestione tavoli/QR/sfide con premi
- [ ] Moderazione dating: rate-limit avanzato, filtri contenuto, segnalazioni

### Later
- [ ] Analytics privacy-first per venue (engagement, conversioni gioco, retention sessione)
- [ ] Account opt-in post-MVP (progressi, profilo, continuità cross-venue)

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

## Database (fase 1 — post-migrazione Supabase SQL)

- [x] Schema SQL Supabase: `venues`, `tables`, `table_sessions`, `groups`, `areas`, `player_sessions`, `games`, `votes`, `dating_messages`
- [x] Migrazioni applicate via `supabase/migrations/` + `pnpm db:push`
- [x] Cleanup sessioni scadute su `pg_cron` (Supabase), non più su task Nitro

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
- [x] Giochi locali pass-the-phone/solitari: Riflessi, Duello, Pre-Serata, Categorie (2026-06-13)
- [x] WebSocket handler Nitro per sync real-time
- [x] Game state in-memory con `game-state.ts`
- [x] Host handover automatico se host disconnette (elezione deterministica + `POST /session/claim-host`)
- [ ] Lock join durante partita attiva (messaggio "partita in corso")
- [ ] Gioco realtime competitivo MVP: trivia/quiz multiplayer a scelta multipla (stato su DB)
- [x] Replay/rematch senza tornare alla join page (thumbs "Gioca ancora", duello "Rivincita")

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
