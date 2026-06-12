---
description: Scaffolding guidato di un nuovo minigioco realtime (spec SpecDD, DB, API, pagina, i18n, test)
argument-hint: nome e breve descrizione del gioco (es. "quiz-rapido: domande a tempo con 4 risposte")
---

Aggiungi un nuovo minigioco a Sottobicchiere: **$ARGUMENTS**

Segui il percorso già tracciato dal gioco di riferimento **thumbs** (Pollice
Su). Prima di scrivere codice, leggi: `docs/game-modes.md`,
`docs/realtime-supabase.md`, `app.sdd`, e i file di thumbs elencati sotto.

## 0. Spec SpecDD (prima del codice)

Crea `docs/specs/<nome-gioco>.feature.sdd` sul modello di
`docs/specs/dynamic-game-areas.feature.sdd`: purpose, boundaries, decisioni
aperte `[?]`, task. Se ci sono decisioni di design ambigue (round, punteggi,
quorum, min giocatori), chiedile all'utente PRIMA di implementare.

## 1. Definizione del gioco (client)

- Registra il gioco nel catalogo della lobby (cerca `getGamesByCategory` /
  dove è definito l'elenco giochi con `id`, `icon`, `labelKey`, `category`,
  `minPlayers`, `avgDurationMinutes`).
- Tipi client in `shared/types/realtime.ts` (stato del gioco lato client,
  pattern `ThumbsClientState`).

## 2. Stato autoritativo (server + DB)

- Lo stato vive su Postgres (`games` o tabella dedicata) e arriva ai client
  via trigger `realtime.broadcast_changes()` — MAI stato in-memory (Vercel
  serverless). Se serve una migration: idempotente, RLS abilitata, niente
  policy client se non necessarie, FK indicizzate; falla auditare a
  **supabase-guardian**.
- Engine in `server/utils/game-<nome>.ts` (pure function, pattern
  `game-thumbs.ts`): transizioni di fase, punteggi, quorum/auto-avanzamento.
- API route in `server/api/[venue]/table/[token]/game/`: riusa
  `requireTable`/`requirePlayer`/`requireHostSession`; validazione input;
  errori `createError` con message in italiano.

## 3. Pagina di gioco (client)

- `app/pages/[venue]/table/[token]/game/<nome>.vue`, layout `game`, pattern di
  `thumbs.vue`: guard `playerStore.isJoined` in onMounted, `open()`/`close()`
  da `useTableSocket` (il channel resta vivo tra le pagine: non gestire la
  connessione a mano), banner di stato connessione, stato "in attesa di
  giocatori" CON la CTA invito (`<table-invite>`), toast pending/success/error
  per ogni azione, bottoni disabilitati quando `status !== 'OPEN'`.
- Navigazione: aggiorna i watcher della lobby (`lobby.vue`) che instradano i
  giocatori quando il gioco selezionato si avvia.
- Solo componenti Nuxt UI dove possibile (verifica finale con
  **design-system-guardian**).

## 4. i18n

Sezione `game.<nome>` in ENTRAMBI `i18n/locales/it.json` e `en.json`
(titolo, descrizione, stati, toast). Chiavi speculari, placeholder identici.

## 5. Test & verifica

- Unit test dell'engine in `test/unit/game-<nome>.test.ts` (pattern
  `game-thumbs.test.ts`): transizioni, punteggi, edge case (1 giocatore,
  uscita a metà round, voti duplicati). Delega a **test-author** se ampio.
- Esegui `/verifica`. Poi `/pre-pr` per review e documentazione.
