# Agents Changelog

Log delle sessioni di sviluppo AI significative.
Non modificare CHANGELOG.md — è gestito dagli npm scripts.

---

## 2026-06-14 — Giochi a turni interattivi (categorie, dares) multi-dispositivo

Bug 3 del report: i giochi "passa il telefono" diventano interattivi, ognuno dal
proprio dispositivo, a turni. Riusa l'infrastruttura realtime di `thumbs` (stato
autoritativo su `games` + broadcast da trigger + presence), nessuna dipendenza nuova.

### Spec
- `docs/specs/turn-based-games.feature.sdd` (nuovo): ownership, boundaries, scenari,
  decisioni (#1 solo categorie/dares; duello rinviato; #2 gioco "infinito"; #3 semantica
  next/newPrompt).

### Dati / server
- `supabase/migrations/20260614120000_turn_based_games.sql` (nuovo): colonna
  `games.turn_state jsonb` (`order` + `turnIndex` + `deckIndex`). Inclusa automaticamente
  nel broadcast di `games` (nessuna policy/trigger nuovi).
- `server/utils/game-turns.ts` (nuovo): engine puro — `buildTurnDeck`, `buildTurnState`,
  `currentTurnPlayer`, `advanceTurnState`, `promptAt`. `test/unit/game-turns.test.ts`.
- `server/api/.../game/turn/start.post.ts` e `advance.post.ts` (nuovi): start solo host,
  advance solo per il giocatore di turno (host come eccezione, sblocca se chi è di turno
  esce). Stato autoritativo sul server, mai dal client.
- `shared/utils/games.ts`: `isTurnBasedGame` + `TURN_BASED_GAMES` (fonte unica).
- `shared/types/{database,realtime}.ts`: `turn_state` su games row; `TurnBasedClientState`.

### Client
- `app/composables/useTableSocket.ts`: `turnState` (mutuamente esclusivo con `gameState`),
  `mapTurnGame`, `startTurnGame`, `advanceTurn`.
- `app/pages/.../game/categorie.vue` e `dares.vue`: riscritte come multiplayer a turni —
  schermata di attesa host, "tocca a {nickname}"/"tocca a te", azioni solo nel proprio
  turno, timer locale per il giocatore di turno (categorie).
- `i18n/{it,en}.json`: blocco `game.turn.*` + nuove stringhe categorie/dares, parità IT/EN.

## 2026-06-14 — Fix join via link/QR e nome stanza ad-hoc

Bug report dell'Operatore su link condiviso, nome del tavolo e interattività.

### Bug 1 — Link/QR non univa il giocatore alla stessa sessione
- `app/pages/[venue]/table/[token]/index.vue`: chi arriva da un link/QR condiviso ora
  trova preselezionato il gruppo attivo più recente (watch su `sessions`), così la POST
  di join entra nella sessione dell'host invece di crearne una nuova. Il default cede
  appena l'utente sceglie esplicitamente (`pickSession` + flag `hasManualSelection`).

### Bug 2 — Stanze ad-hoc mostravano "Tavolo 1" invece del nome
- `server/utils/table-resolver.ts`: `resolveTableRow` espone `venueKind` ('venue'|'adhoc')
  leggendo `venues.kind`.
- `server/api/.../index.get.ts`, `join.post.ts`, `shared/types/index.ts` (`TableInfo`),
  `app/stores/player.ts`: propagano `venueKind` fino allo store persistito.
- `index.vue` e `lobby.vue`: per le stanze ad-hoc il titolo è il nome scelto e l'etichetta
  è "Stanza privata" (`table.room_label`), niente più "Tavolo 1" fuorviante.
- `test/unit/table-resolver.test.ts`: aggiornati gli stub + test per `venueKind`.

## 2026-06-13 — Applicazione completa delle migliorie da audit (server + UI + toast)

Dopo i quick win, applicate tutte le migliorie strutturali emerse dai tre audit.

### Server / dati
- `server/api/.../game/bootstrap.get.ts` (nuovo): unisce game/current + game/state,
  risolve la sessione una volta; `loadInitialState` passa da 3 a 2 fetch. Rimossi
  `game/current.get.ts` e `game/state.get.ts` (usati solo dal composable).
- `server/utils/game-engine.ts`: `getActiveGameLite` (colonne mirate, niente JSON
  `questions`) per vote/end/presence/claim-host; `recomputeAndMaybeReveal` ora fa un
  COUNT leggero (`head:true`) e legge le righe dei voti solo al raggiungimento del quorum.
- `server/api/.../dating/rooms.get.ts`: `self` derivato dal giocatore autenticato
  (`?player=<id>` + `requirePlayerForTable`) invece che da un id sessione passato dal
  client — chiude l'enumerazione della rete contatti di un tavolo terzo.

### UI — componenti condivisi (riduzione duplicazione)
- `app/components/game-header.vue`: header delle pagine di gioco locali (reflex/duello/
  dares/categorie/word-blitz), slot `meta` per extra (contatore carte).
- `app/components/player-pill.vue`: pill giocatore (prima duplicata ~7 volte), size + slot.
- `app/components/connection-status-banner.vue`: banner stato realtime (lobby + thumbs).
- `app/components/game-category-badge.vue`: badge categoria (lobby + game-rules-modal).
- `app/composables/useActionToast.ts`: estrae il toast d'errore (cast + fallback i18n)
  ripetuto in lobby/thumbs; i toast pending/success accoppiati agli ACK realtime restano.

### A11y / design system
- `u-progress` al posto delle barre a mano (timer `categorie`, voted_count `thumbs`).
- Tap target: language/theme switch (`default.vue`) → md; mini-header `duello` → sm.
- `thumbs`: `aria-label`/`aria-hidden` sui bottoni voto (dal batch precedente).

Verifica: lint + stylelint + typecheck + 53 unit test + build verdi; SSR 200 su tutte
le pagine (IT/EN), nessun warning Vue/componente irrisolto; `game/current` e `game/state`
ora 404 (rimossi), `game/bootstrap` registrato.

---

## 2026-06-13 — Pass di ottimizzazione (quick win da audit logica/dati/UI)

Tre audit read-only sull'intera codebase (logica/perf, data layer Supabase, design
system). Applicati i **quick win sicuri** (ottimizzazioni pure, nessun cambio di
comportamento); le migliorie strutturali sono tracciate in TODO come decisioni.

### Server / dati
- `server/utils/game-engine.ts`: `getActiveGame` ora con `.limit(1)` (robustezza
  contro righe duplicate accidentali su `maybeSingle`).
- `server/utils/request.ts`: `resolveSessionId` usa una query snella `select('id')`
  invece della versione "fat" a 8 colonne; estratto l'helper condiviso
  `isSessionHost(session, player)` (fonte unica della logica di autorizzazione host,
  prima duplicata tra `requireHostSession` e `game/select.post.ts`).
- `server/api/.../game/select.post.ts`: usa `isSessionHost`.
- `supabase/migrations/20260613120000_indexes_and_votes_fk.sql` (nuova, additiva e
  idempotente): FK `votes.player_id → player_sessions(id) on delete cascade` (con
  cleanup preventivo degli orfani: prevenivano la distorsione del quorum in
  `recomputeAndMaybeReveal`) + indici su FK non indicizzate (`dating_messages.from_*`,
  `venues/tables.created_by_user_id` parziali, `table_sessions(table_id, started_at)`,
  `votes.player_id`). **Da applicare con `pnpm db:push` previa audit supabase-guardian.**

### Client
- `app/composables/useTableSocket.ts`: `syncPresence` non riassegna più `players` se
  l'insieme di id online è invariato (i `presence sync` periodici a tavolo stabile non
  ritriggerano più computed/liste). Confronto via `Set`.
- `app/pages/.../game/thumbs.vue`: rimosso `{ deep: true }` dal watch su `gameState`
  (l'oggetto è già riassegnato per intero da `mapGame`: il deep era puro costo); aggiunti
  `aria-label` ai bottoni voto e `aria-hidden` agli emoji 👍/👎.

Verifica: lint + stylelint + typecheck + 53 unit test + build verdi; SSR 200 sulle 7
rotte tavolo/gioco; guardia `solo` su `select` ancora 422.

---

## 2026-06-13 — Quattro nuovi giochi locali + categoria "solo" nel catalogo

### Nuovi giochi (client-side, pass-the-phone / solitari)
Aggiunti seguendo il precedente di `word-blitz` (nessuno stato server né riga in
`games`): la pagina è completamente locale ma resta connessa al tavolo via
`useTableSocket` (`open()/close()`) e segue il cambio gioco dell'host (`gameLaunch`).

- `app/pages/[venue]/table/[token]/game/reflex.vue` — **Riflessi** (solo): reaction
  time, macchina a stati idle→waiting→go→result, anticipo = fallo; record personale
  in `localStorage` (`useLocalStorage`, privacy-first).
- `app/pages/[venue]/table/[token]/game/duello.vue` — **Duello** (2 giocatori, 1
  device): schermo diviso, metà in alto ruotata 180°; al verde vince il primo a
  toccare la propria metà, anticipo = round all'avversario, al meglio dei 3 round.
- `app/pages/[venue]/table/[token]/game/dares.vue` — **Pre-Serata** (stile Picolo):
  mazzo di carte Verità/Obbligo/Regola/Sorso/Tutti, bilingue, si passa il telefono.
- `app/pages/[venue]/table/[token]/game/categorie.vue` — **Categorie**: timer per
  turno (8s), si dice una parola della categoria e si passa il telefono; allo scadere
  chi ha il telefono fa un pegno.

### Catalogo & contenuti
- `shared/utils/games.ts`: nuovo tipo `GameId`, categoria `solo` aggiunta a
  `GameCategory`; 4 nuove `GAME_DEFINITIONS`; `getGamesByCategory` rivisto perché i
  giochi `both` compaiano in board/preserata ma **non** in solo (e viceversa).
- `shared/utils/party.ts` (nuovo): mazzo `PARTY_DARES` (30 carte IT/EN), elenco
  `CATEGORY_PROMPTS` (24 categorie IT/EN), helper puro `shuffle<T>` (Fisher-Yates,
  non muta l'input).
- `server/api/[venue]/table/[token]/game/select.post.ts`: l'enum dei giochi
  selezionabili è ora **derivato dal catalogo** (`GAME_DEFINITIONS`), così aggiungere
  un gioco lo abilita ovunque senza dimenticanze.

### UI lobby
- Tab categoria "Da soli" (`solo`) + badge/icona/colore dedicati nelle card e nella
  modale regole (`lobby.vue`, `game-rules-modal.vue`). `selectGame` tipizzato su `GameId`.

### i18n
- Sezioni `game.reflex`, `game.duello`, `game.dares`, `game.categorie` in IT ed EN +
  `lobby.games_tab_solo` / `lobby.game_category_solo`. Parità chiavi 250/250.

### Test
- `test/unit/party.test.ts`: `shuffle` (no mutazione, conservazione insieme, edge
  case) + integrità mazzi (IT/EN non vuoti, tipi validi).
- `test/unit/games.test.ts`: id unici, vincoli min/max coerenti, filtro categorie e
  isolamento dei giochi `solo`.
- Verifica: lint + stylelint + typecheck + 53 unit test verdi + build + SSR 200 sulle
  6 rotte di gioco (IT/EN).

---

## 2026-06-12 — Invito al tavolo da lobby/gioco + fix race connessione realtime

### Diagnosi (errore di connessione entrando in un gioco)
- Il sintomo "errore di connessione dentro thumbs" NON dipende dall'essere da soli: è una
  race nella navigazione lobby↔gioco. `close()` (onUnmounted) avviava `unsubscribe()` e
  `open()` (onMounted) creava "un nuovo" channel sullo stesso topic — ma realtime-js
  (`RealtimeClient.channel()`, v2.106) restituisce l'istanza ESISTENTE finché il leave non è
  completato. Risultato: subscribe no-op su channel in leaving (status bloccato su
  CONNECTING) oppure throw di `.on('presence')` su channel ancora joined, e banner
  "Connessione persa" appena entrati nel gioco. Gli e2e live non lo beccavano perché non
  navigano tra pagine.

### Fix & feature
- `app/composables/useTableSocket.ts`:
  - `close()` ora è "morbida": schedula lo smaltimento con finestra di grazia (250ms);
    l'`open()` della pagina successiva la annulla → la connessione resta viva tra lobby e
    giochi (stesso topic), niente flash del banner né race sul riuso del channel.
  - Smaltimento reale in `disposeChannels()`: serializzato via `disposalPromise` (open()
    la attende prima di creare un nuovo channel), azzera lo stato condiviso (players,
    gameState, gameSelection, dating, lobbyVersion) così un rientro/cambio tavolo riparte pulito.
  - `open()` ricrea il channel se lo status è CLOSED (channel chiuso dal server): prima il
    bottone "Riconnetti" poteva essere un no-op.
  - Toast `error.connection_lost` solo dopo 3 errori consecutivi di subscribe: i retry
    automatici (rejoin con backoff, cold start realtime) restano attesa soft.
- `server/utils/table-resolver.ts` + `GET /api/[venue]/table/[token]`: esposto `shortCode`
  (null per i tavoli fisici dei locali) — serve all'invito da qualunque membro del tavolo.
- `app/components/table-invite.vue` (nuovo): bottom sheet d'invito riusabile (USlideover
  side=bottom) con QR, codice breve (fetch pigro alla prima apertura), link localizzato e
  Web Share nativo. Trigger: icona `user-plus` negli header di lobby/thumbs/word-blitz e
  CTA "Invita amici al tavolo" nello stato di attesa di thumbs (<2 giocatori) — da soli
  l'attesa diventa un invito invece di un vicolo cieco.
- i18n: nuova sezione `invite` (IT/EN); riusate le chiavi `room.share_*`/`room.copy_*`.
- Test: `table-resolver.test.ts` aggiornato + caso `shortCode: null` per tavoli fisici.

### Agenti e workflow Claude Code di progetto
- `.claude/agents/` (5 agenti verticali): `docs-curator` (Documentation Rule),
  `design-system-guardian` (componenti Nuxt UI al posto di HTML grezzo — UTabs/UTable/
  USelect/UModal/… — palette "Notte Italiana", i18n nei template, a11y),
  `code-reviewer` (bug, race realtime, boundary RLS/service-role, convenzioni SpecDD),
  `test-author` (Vitest secondo i pattern di `test/unit/`), `supabase-guardian`
  (migrations idempotenti, RLS, policy realtime.messages, anti-spoofing, TTL).
- `.claude/commands/` (3 workflow): `/verifica` (lint+typecheck+test+parità i18n+build),
  `/pre-pr` (verifica + review parallele degli agenti + docs + PR draft),
  `/nuovo-gioco` (scaffolding guidato di un minigioco: spec SpecDD → DB → API → pagina →
  i18n → test, sul modello di thumbs).
- `Agents.md` §6: indice di agenti e workflow per le sessioni future.

### Secondo giro (feedback dal campo)
- **Fix "Connection lost" al primo ingresso nel tavolo creato**: una chiusura voluta del
  channel passa da `disposeChannels()` (filtrata dalla guardia), quindi un `CLOSED` che
  raggiunge il callback di subscribe è il server che chiude inaspettatamente — tipico al
  primo join su un tavolo appena creato (autorizzazione realtime non ancora visibile,
  cold start già osservato nei log). Ora `scheduleReopen()` riapre in automatico con
  backoff lineare (3 tentativi, budget azzerato da open() esplicito/"Riconnetti"),
  conservando lo stato della sessione (`disposeChannels(keepState)`).
- Lobby: avviso `UAlert` "Sei solo al tavolo" + CTA invito quando la presence conta 1.
- `shared/utils/games.ts`: `maxPlayers?` in `GameDefinition`, helper `getGameDefinition()`;
  `word-blitz` → `minPlayers: 1` (prototipo locale, allineato alla descrizione "1+").
  Card lobby: "Min. {n}" o "{min}–{max} giocatori". Il minimo di thumbs è data-driven
  (pagina + `game/start.post.ts`, che ora applica anche l'eventuale massimo con 422
  `TOO_MANY_PLAYERS`). `docs/game-modes.md` aggiornato (catalogo = fonte unica dei vincoli).

### Terzo giro (feedback dal campo: flussi rotti) + verifica live
- **Root cause "Connection lost" dopo "back to lobby"**: in Vue il `mounted` della pagina
  nuova scatta PRIMA dell'`unmounted` della vecchia → il close differito della vecchia non
  veniva mai annullato e smontava il channel appena riusato. Fix: reference counting dei
  consumatori in `useTableSocket` (open/close per pagina) + grazia per l'ordine inverso;
  `reconnect()` dedicato per il bottone "Riconnetti".
- **Niente più "ributtato in partita"**: rimossa la navigazione forzata della lobby su
  `gameState` recuperato; il watcher su `lockedAt` naviga solo su lock freschi (<15s) o
  propri; banner "Partita in corso" con Rientra + Termina (host).
- `POST /game/end` (host) e `POST /leave` (vedi `docs/api-contracts.md`): prima nessun
  endpoint azzerava `locked_at`/`selected_game` (sessione bloccata fino al TTL) e il leave
  era solo client-side (conteggi gonfiati, tavoli fantasma).
- Lobby: spinner solo sulla card selezionata; filtro "siamo in N"; descrizioni giochi sulle
  card + modale regole (`game-rules-modal`) riusata dentro thumbs/word-blitz; back-to-lobby
  fisso nell'header di thumbs.
- **Verifica live contro la preview del PR** (bypass Vercel via share link):
  `scripts/e2e-live-flows.mjs` (nuovo) 22/22 step; regressione `e2e-live-game.mjs` 15/15.

### Quarto giro (hardening da review full-stack)
- **Navigazione al gioco a prova di clock**: rimossa l'euristica `|Date.now() - locked_at| < 15s`
  in `lobby.vue` (poteva non far entrare in partita i guest con clock sfasato, e ri-trascinare
  dentro chi faceva refresh entro 15s). Introdotto `gameLaunch` in `useTableSocket`: un segnale
  valorizzato SOLO da `mapSession` (broadcast live di `table_sessions`), mai dall'hydration REST
  di `loadInitialState`. Lobby e pagine di gioco lo osservano: l'auto-join scatta solo su una
  selezione realmente avvenuta dal vivo; refresh/rientro in lobby non ri-navigano (resta il
  banner "Rientra in partita").
- **Cross-navigazione tra giochi**: thumbs e word-blitz seguono `gameLaunch` se viene lanciato
  un gioco diverso da quello corrente (chiude l'edge: l'host termina e ne lancia un altro mentre
  un guest è ancora nella vecchia pagina).
- **`disposalPromise` riazzerato nel `finally`**: senza, restava valorizzato per sempre e, se
  rigettasse, propagava come unhandled rejection sugli `open()` successivi (chiamati senza await
  in `onMounted`/`@click`).
- `game/start.post.ts`: commento sul gioco cablato `'thumbs'` (MVP, unico engine server-side).

Verificato: lint (0 errori), typecheck, 41 unit test, build di produzione.

## 2026-06-11 — Review prontezza MVP + diagnosi "errore generico" creazione tavolo

### Diagnosi (root cause della creazione tavolo che fallisce)
- Verificato dal vivo: il deploy Vercel è sano (homepage 200, env Supabase corrette) e lo
  schema DB è applicato; ma sul progetto Supabase reale gli **Anonymous sign-ins sono
  disabilitati** (`POST /auth/v1/signup` → `anonymous_provider_disabled`). Senza JWT anonimo
  ogni `POST /api/rooms` risponde 401 `NOT_AUTHENTICATED` → l'"errore generico" in `/new`.
  Fix di configurazione (dashboard → Authentication → Sign In / Providers → Anonymous), non di codice.

### Fix dalla review MVP
- `package.json`: `stylelint:check`/`stylelint:fix` puntavano a `**/*.scss` (nessun file
  SCSS nel repo → exit 1, `pnpm lint` e job CI `lint` rotti). Ora puntano ai `.css`.
- `.github/workflows/ci.yml`: rimossi i residui WeGree (fallback `NUXT_SITE_*`, colori) e le
  env dello stack vecchio (`DATABASE_URL`, `REDIS_URL`, `NUXT_BETTER_AUTH_SECRET`, ecc.);
  la validazione env ora richiede `NUXT_PUBLIC_SUPABASE_URL/KEY` e `NUXT_SUPABASE_SECRET_KEY`.
- `app/composables/useTableSocket.ts`: i 2 messaggi d'errore hardcoded in italiano ora usano
  i18n (`error.generic`, `error.connection_lost`, aggiunti in IT/EN).
- `supabase/migrations/20260611090000_games_host_player_index.sql`: indice sulla FK
  `games.host_player_id` (advisor/review). Applicato anche al progetto reale via MCP.
- `README.md`: sezione CI/CD allineata alla realtà (niente `e2e.yml`/`deploy.yml`; il deploy
  è l'integrazione Git di Vercel; esiste `security.yml`).

Verificato: `pnpm lint` ora exit 0, typecheck, 34 unit test, build di produzione.

### Verifica live su produzione (dopo abilitazione Anonymous sign-ins)
- `scripts/e2e-live-game.mjs` eseguito contro `https://sottobicchiere.vercel.app`:
  2 utenti anonimi → crea stanza (short code + link) → resolve codice → join nella stessa
  sessione → subscribe ai channel realtime privati (RLS ok) → select "thumbs" → start →
  voti di entrambi → reveal automatico al quorum → broadcast DB (INSERT/UPDATE su games)
  ricevuti da entrambi i client. **15/15 step passati.**
- Nota operativa: al primissimo collegamento realtime del tenant il channel può fallire con
  `CHANNEL_ERROR` (cold start: partizioni `realtime.messages` create in quel momento,
  `UnableToSetPolicies` transitorio nei log). Al retry successivo funziona.
- Da review (Gemini): `$i18n` non più catturato dentro `createGlobalState` (rischio
  cross-request state pollution in SSR) → risolto al momento dell'uso con `tryUseNuxtApp()`.
- Segnalato: i workflow GitHub Actions non sono mai stati eseguiti (0 run); verificare
  Settings → Actions del repo.

### Round finale (2026-06-12): dating live, merge main, fix review pre-go-live
- Merge di `origin/main` (PR #27/#28 Copilot) nel branch: conflitti risolti combinando
  `stylelint:check`→css (branch) con `--allow-empty-input` (main).
- `scripts/e2e-live-dating.mjs`: verifica live del dating — 2 tavoli, toggle online/offline,
  messaggio A→B e risposta B→A via broadcast realtime, invio verso tavolo offline → 409,
  ritorno online. **21/21 step** su produzione e sulla preview del branch.
- Giro finale di review (backend+frontend) con fix:
  - `game/select.post.ts`: con `host_player_id` null poteva diventare host il primo che
    selezionava un gioco → ora stessa semantica di `requireHostSession` (solo `is_host`).
  - `lobby.vue`: timeout 8s (`useTimeoutFn`) che sblocca l'invio dating se l'ACK realtime
    non arriva (prima restava bloccato per sempre) + chiave i18n dedicata.
  - `[token]/index.vue`: reset dello store player persistito se la sessione è scaduta.
  - Script e2e: `EXTRA_COOKIE` per testare le preview Vercel protette (`_vercel_jwt`).
- Falsi allarmi scartati con verifica: ordine cleanup timer in `close()` (già corretto),
  fallback host in `session/index.get.ts` (design ok), quorum presence (richiede host).
- Verificato: lint, typecheck, 40/40 unit test, build; e2e gioco 15/15 + dating 21/21
  sulla preview del branch (deployment `e20ebdc`).

Sostituiti i componenti "fatti a mano" con quelli del design system del progetto (Nuxt UI 4):
- Tab principali lobby (Giocatori/Aree/Giochi): da `<button v-for>` hand-rolled a **`UTabs`**
  (`variant="link"`, `:content="false"` → solo i trigger; il contenuto resta nelle section
  `v-show`, layout/scroll invariati). ARIA tab corretto fornito da Reka UI (rimpiazza i
  `role=tablist/tab` aggiunti a mano).
- Filtro categoria giochi: da button-group hand-rolled a **`UTabs`** (`variant="pill"`).
- Destinatario dating: da `<select>` nativo a **`USelect`** (+ computed `datingTargetItems`).
Form (new/join/join-tavolo) già su `UFormField`+`UInput`+`UButton`; voto 👍/👎, toggle dating
e card-lista sessioni restano bespoke (UX non standardizzabile in un componente).
Verificato: typecheck, eslint, 34 unit test, build.

---

## 2026-06-03 — DB live su Supabase + hardening (advisors) + review Copilot (round 6)

### Database attivato e verificato (progetto reale)
- Schema applicato al progetto Supabase `sottobicchiere-supabase` (creato dall'integrazione
  Vercel): 9 tabelle con RLS, seed demo, trigger realtime, pg_cron. Verificato via MCP
  (`list_tables`) e a livello API: `GET /api/demo/table/demo-001` sulla preview Vercel
  risponde **200** (`{venueName:"Demo Venue",...}`) → env reali + schema + app collegati.
- `supabase/migrations/20260603090000_harden_function_grants.sql` (da Supabase advisors):
  - `revoke execute` su tutte le funzioni trigger/utility (broadcast_*, notify_lobby_changes,
    touch_updated_at, cleanup_expired_sessions) da `public/anon/authenticated`: non più
    invocabili via PostgREST RPC (i trigger e pg_cron continuano a funzionare).
  - `set search_path = ''` su `touch_updated_at`.
  - indice di copertura su `groups.table_session_id`.
  - Dopo l'hardening gli advisor di sicurezza non riportano più WARN; restano solo INFO
    `rls_enabled_no_policy` (voluto: accesso solo server via service-role).

### Review Copilot (round 6) + code-review interno
- `players.get` ora onora `?session=` (resolveSessionId) come /groups e /areas → classifica
  per squadra coerente anche con più sessioni attive sullo stesso tavolo.
- `thumbs.loadTeams`: fetch /groups prima, salta /players se non ci sono squadre, passa la
  sessione anche a /players.
- `join.vue`: niente `6` hard-coded → `isValidRoomCode` / `ROOM_CODE_LENGTH`.
- `room.ts`: default venue neutro; il client invia un default localizzato (`room.default_name`).
- `resolve.get`: filtro `venues.kind='adhoc'`.
- migration 130000: trigger player_sessions solo INSERT/UPDATE (no DELETE) → niente raffica
  di broadcast durante il cleanup pg_cron.

---

## 2026-06-02 — F5 punteggio per squadra + review Copilot (round 5)

### F5 — Punteggio per squadra (decisione #2)
- `shared/utils/team-scores.ts`: `aggregateTeamScores` — funzione pura che somma i
  punteggi per-giocatore raggruppandoli per squadra (group) e ordina; testata
  (`test/unit/team-scores.test.ts`, 5 casi).
- `server/api/[venue]/table/[token]/groups.get.ts`: `GET /groups` → squadre della
  sessione (id, name, color). `shared/types/index.ts`: `GroupInfo`.
- `game/thumbs.vue`: carica squadre + mappa giocatore→squadra (`/groups` + `/players`),
  calcola `teamScores` e mostra la **classifica per squadra** nel tabellone di round e
  nella schermata finale (solo se esistono squadre). i18n `game.thumbs.team_scores` IT/EN.
- Il gioco resta per-tavolo; le squadre sono per-tavolo (decisione #1). Implementato e
  verificato a typecheck/eslint/unit/build; l'e2e funzionale resta da fare su un DB reale.

### Review Copilot (round 5)
- `supabase-user.test`: `supabaseUserId( undefined )` esplicito (il parametro non è opzionale).
- `rooms/index.post`: corretto il commento ("richiediamo che l'id esista" invece di
  "validato esplicitamente": è un controllo di esistenza, come in join/requirePlayer).
- `#shared/utils/*` mantenuto: è l'alias nativo Nuxt 4 (`.nuxt/tsconfig.json` → `../shared/*`),
  il build passa; cambiarlo in relativo dalle pagine profonde sarebbe solo peggiorativo.

---

## 2026-06-02 — F4 aree in lobby, fix user.id→sub, review Copilot

### Fix realtime (user.id → user.sub)
- `serverSupabaseUser` (v2) restituisce i claims JWT: l'id utente è **`sub`**, non `id`
  (che era `undefined` a runtime). Corretto in `join.post.ts`, `request.ts`, `room.ts`.
  Ora `player_sessions.user_id` = `auth.uid()` → l'autorizzazione dei channel realtime
  combacia. (Era il blocco segnalato nella sessione precedente.)

### F4 — Aree & squadre in lobby
- Migration `20260602130000_dynamic_areas_realtime.sql`: trigger `notify_lobby_changes()`
  su `areas` e `player_sessions` → segnale leggero `lobby:changed` sul channel del tavolo
  (nessuna riga nel payload: privacy-safe).
- API: `GET /areas` (aree + membri + non assegnati), `POST /areas` (host), `POST /areas/assign`
  (ognuno sposta solo sé stesso). `players.get` ora include `area_id`.
- `useTableSocket`: ascolta `lobby:changed` ed espone `lobbyVersion`.
- `lobby.vue`: nuovo tab **Aree** (host crea zone, ognuno si auto-assegna, lista membri per
  area + non assegnati), refetch su `lobbyVersion`. Squadre per-tavolo (decisione #1).
- Tipi `AreaMember`/`AreaWithMembers`/`AreasResponse`; i18n IT/EN per il tab aree.

### Review Copilot (PR #25) — risolti
- `user.id`→`sub` (2 commenti): risolto come sopra.
- `resolve.get`: messaggio "sei cifre" → "sei caratteri" (il codice è alfanumerico).
- `createAdhocRoom`: aggiunti unit test (retry su 23505, stop su errori non-unique, rollback
  venue) — `test/unit/room.test.ts`. `createError` resta auto-import Nitro; nel test è
  stubbato come globale (`vi.stubGlobal`, ripristinato in `afterAll`).
- Spec `.sdd` e `workflow.md`: stato aggiornato (da "planning" a "parz. implementata"),
  contratto API/Scenario allineati all'implementazione reale, "decisioni aperte" → confermate.

### Resta (F5, richiede DB reale)
- Scope del gioco con punteggio per squadra + risultati per team; e2e crea→join→gioca.
- Verifica funzionale su Supabase reale (`pnpm db:reset`): la Supabase CLI non è disponibile
  in questo ambiente, quindi F4 è verificata a typecheck/eslint/unit/build, non con DB attivo.

---

## 2026-06-02 — Tavoli & Aree dinamici: implementazione F1–F3

Implementazione della feature pianificata, dopo conferma delle decisioni
(#1 squadre per-tavolo, #2 gioco per-tavolo + punteggio squadra, #3 TTL 8h).

### F1 — Modello dati
- `supabase/migrations/20260602120000_dynamic_game_areas.sql` (additiva, idempotente):
  `venues` (kind/created_by_user_id/expires_at + check + indice), `tables`
  (short_code unique parziale + created_by_user_id), nuova tabella `areas` (+RLS),
  `player_sessions.area_id`; `cleanup_expired_sessions` estesa per rimuovere le
  venue `kind='adhoc'` scadute (cascade).
- `shared/types/database.ts` aggiornato a mano allo schema (il file è mantenuto a mano).

### F2 — API
- `shared/utils/room-code.ts`: generazione/normalizzazione codici (alfabeto non ambiguo,
  niente I/L/O/0/1) e token URL-safe — pure, testati (`test/unit/room-code.test.ts`, 7 test).
- `server/utils/room.ts` (`createAdhocRoom`): crea venue ad-hoc + tavolo con retry su
  collisione di slug/qr_token/short_code; rollback della venue se il tavolo fallisce.
- `server/api/rooms/index.post.ts` (`POST /api/rooms`) e
  `server/api/rooms/resolve.get.ts` (`GET /api/rooms/resolve`).
- Tipi `RoomCreatedResponse` / `ResolvedRoomResponse` in `shared/types/index.ts`.

### F3 — UI
- `app/pages/new.vue`: crea stanza → pannello di condivisione (QR via `nuxt-qrcode`,
  link e codice con copia negli appunti) → "Entra nel tavolo".
- `app/pages/join.vue`: inserimento codice → `resolve` → redirect al join del tavolo.
- `app/pages/index.vue`: CTA "Crea un tavolo" + "Entra con un codice" in homepage.
- i18n: sezione `room` + chiavi welcome in IT/EN (parità 155/155).

### Verifica
- `pnpm typecheck`, `eslint`, unit test e `pnpm build` puliti. Build senza env Supabase
  → SSR di `/`, `/new`, `/join` (IT ed EN) = **HTTP 200**.
- Restano F4 (aree/squadre in lobby) e F5 (scope gioco + e2e). La verifica funzionale
  completa richiede un Supabase reale (`pnpm db:reset`): la Supabase CLI non è
  disponibile in questo ambiente.

### Nota tecnica rilevata (pre-esistente, non modificata)
- `serverSupabaseUser` (v2) restituisce i **claims JWT** (`JwtPayload`), dove l'id utente
  è `sub`, non `id`. Il codice esistente (`join.post.ts`, `request.ts`) e il nuovo
  (`room.ts`) usano `user.id`, che l'index signature `[key:string]:any` rende valido a
  compile-time ma è `undefined` a runtime. Va verificato/uniformato (probabilmente a
  `user.sub`) quando il DB sarà attivo: impatta l'autorizzazione realtime di TUTTI i tavoli,
  non solo le stanze dinamiche. Non toccato qui per non uscire dallo scope.

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
