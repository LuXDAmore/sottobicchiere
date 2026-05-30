# Architettura — Sottobicchiere

## Panoramica

Sottobicchiere è una PWA multi-tenant per bar e locali con tavoli. Ogni installazione è associata a una venue (locale) identificata da un slug. I tavoli hanno QR code fisici; scansionando il QR, il cliente entra in una sessione di gioco associata al tavolo.

Lo stack è **Nuxt 4** (SSR + API REST via Nitro su Vercel) con **Supabase** per database, autenticazione anonima e real-time (presence + broadcast da DB). Niente più WebSocket Nitro né stato in-memory: incompatibili con il serverless di Vercel.

## Flusso principale

```
1. Scan QR code  →  /[venue]/table/[qr_token]
2. Nuxt SSR      →  valida qr_token, recupera table_session (o ne crea una nuova)
3. Accesso anon  →  signInAnonymously() Supabase (JWT per autorizzare il channel)
4. Player join   →  sceglie nickname + colore/gruppo (POST /join)
5. Lobby         →  giocatori live via presence, scelta gioco
6. Gioco         →  stato su Postgres; azioni via POST, sync via broadcast da DB
7. Fine gioco    →  risultati, torna alla lobby
8. Cleanup       →  table_session.expires_at (TTL 8h), pg_cron
```

## Layer architetturali

```
┌─────────────────────────────────────────────────────┐
│                    Cliente (Browser)                  │
│  Vue 3 SPA  ·  Nuxt UI  ·  Pinia  ·  @vueuse/motion   │
│  @nuxtjs/supabase (presence + broadcast)              │
└───────┬───────────────────────────────┬──────────────┘
        │ HTTP (azioni)                  │ Realtime (WS gestito da Supabase)
┌───────▼──────────────────┐   ┌─────────▼─────────────┐
│   Nitro (Vercel)          │   │   Supabase Realtime    │
│   API REST                │   │   presence + broadcast │
│   service role (autorità) │   └─────────▲─────────────┘
└───────┬──────────────────┘             │ trigger broadcast_changes()
        │ SQL (service role)              │
┌───────▼─────────────────────────────────┴────────────┐
│                  Supabase Postgres                     │
│  venue/table/sessions/games/votes/dating + RLS + cron │
└───────────────────────────────────────────────────────┘
```

## Componenti chiave

### Venue (locale)
Ogni bar ha la sua installazione con un `slug` univoco (es: `bar-centrale`). In futuro supporterà sottodomini (`bar-centrale.sottobicchiere.app`) o domini custom.

### Table Session (sessione tavolo)
Una sessione viene aperta quando il primo cliente scansiona il QR di un tavolo. Scade automaticamente (TTL 8h). Contiene i riferimenti a player e gruppi e lo stato di lobby/sessione (`selected_game`, `session_mode`, `host_player_id`, ecc.).

### Player Session (sessione giocatore)
Anonima: nickname + colore assegnato randomicamente, collegata a un utente Supabase anonimo (`user_id`) che autorizza il channel realtime. Nessun account. Scade con la table_session.

### Group (gruppo)
I giocatori possono formare squadre o stare da soli. Un tavolo può avere più gruppi (es: squadre che competono).

### Game State (su Postgres)
Lo stato della partita vive nella tabella `games` (una riga per sessione): `phase`, `round_index`, `questions`, `scores`, `voted_count`/`total_count` e — solo in fase `reveal` — `revealed_votes`. Nessuno stato in memoria: un cold start non perde nulla. La logica resta server-authoritative nelle API (`server/utils/game-engine.ts`, `game-thumbs.ts`).

### Realtime (Supabase)
Channel privato per-tavolo `table:<tableSessionId>`:
- **Presence** — giocatori online (sostituisce il registro peer in-memory), base per il quorum dei voti e per l'**elezione automatica dell'host** (vedi `docs/realtime-supabase.md`).
- **Broadcast da DB** — i trigger su `games`/`table_sessions`/`dating_messages` chiamano `realtime.broadcast_changes()` → i client ricevono lo stato aggiornato.

Channel `dating:lobby`: broadcast di disponibilità dei tavoli in dating mode. Lato client tutto è incapsulato in `app/composables/useTableSocket.ts` (API pubblica invariata rispetto al vecchio composable WS).

## 3. Struttura del codice

### 3.1 Frontend (`app/`)
- **Pages**: routing file-based, incluso `[venue]/table/[token]/...`.
- **Composables**: `useTableSocket` per presence + broadcast e gli eventi real-time.
- **Plugins**: `supabase-anon.client` garantisce a ogni visitatore una sessione Supabase anonima.
- **Stores**: Pinia (giocatore, sessione).

### 3.2 Backend (`server/`)
- **API REST** (`server/api/`): bootstrap sessioni, fetch stato e tutte le mutazioni di gioco (service role, autorità sullo stato).
- **Utils** (`server/utils/`): `supabase` (client service role), `request` (auth/risoluzione tavolo), `game-engine`, `game-thumbs`, `host-election`, `dating`.
- Niente più `server/routes/ws/`, `server/db/` o `server/tasks/`.

### 3.3 Database (Supabase Postgres)
- Tabelle: `venues`, `tables`, `table_sessions`, `groups`, `player_sessions`, `games`, `votes`, `dating_messages`.
- Migration **SQL native** in `supabase/migrations/` (schema, RLS, trigger di broadcast, pg_cron, seed).
- Accesso dei client mediato dalle API server; RLS blocca l'accesso diretto tranne la propria riga in `player_sessions`.
- Sessioni e dati di gioco **effimeri**: pulizia con **pg_cron**.

## 4. Multi-tenant

Il sistema supporta più venue sulla stessa installazione:
- Route: `/[venue]/...` identifica il locale
- Admin: `/[venue]/admin/` per la gestione del locale (token-based, futuro)
- QR token univoco per tavolo e venue

## 5. Flussi principali

### 5.1 Ingresso
1. Scan QR → SSR risolve il tavolo.
2. Accesso anonimo Supabase (JWT) + setup giocatore (nickname, gruppo) → `POST /join` crea/recupera sessione.
3. Iscrizione al channel `table:<tableSessionId>` → presence e sincronizzazione stato (REST + broadcast).

### 5.2 Partita
1. Host avvia (`POST game/start`) → server genera round e domande, scrive su `games`.
2. Voti via `POST game/vote`; il server valida, upserta su `votes` e ricalcola; quando tutti i presenti hanno votato passa a `reveal`.
3. Avanzamento round (`POST game/next`); ogni scrittura su `games` è propagata via broadcast. A fine partita, classifica/risultati.

### 5.3 Cleanup
- **pg_cron** in Supabase elimina sessioni/dati scaduti (retention breve, cascade).

## Privacy

- Nessun dato PII salvato nel DB
- I nickname scelti dai giocatori non sono tracciabili a persone reali
- I dati di gioco (risposte, punteggi) sono associati solo al nickname corrente
- Database pulito periodicamente (sessioni scadute eliminate)
- In futuro: opt-in per account permanente con salvataggio dati esplicito

## Sicurezza

- Validazione input lato server (Zod); rate-limit delle azioni (es. messaggi dating) su finestra DB.
- Ogni azione verifica l'utente Supabase e la proprietà del `playerId` (no impersonificazione: gli ID sono visibili via presence).
- Channel privati autorizzati via RLS su `realtime.messages`; i client inseriscono solo `presence`, mai broadcast di stato.
- Token tavolo non indovinabile (QR), scope per sessione.
- I **voti restano segreti**: i client non leggono `votes`; i risultati compaiono in `games.revealed_votes` solo in fase `reveal`.

## Deployment

- **Produzione**: Vercel (SSR + API), auto-deploy dal branch `main`
- **Staging**: branch preview su Vercel
- **Dev**: `pnpm dev` su `https://localhost:3000` + stack Supabase locale (`pnpm db:start`)
- **Database & Realtime**: Supabase (Postgres + Realtime + Auth anonima)
