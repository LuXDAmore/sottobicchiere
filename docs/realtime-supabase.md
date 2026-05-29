# Realtime su Supabase

Il realtime non gira più su WebSocket Nitro (incompatibili con il serverless di
Vercel: le funzioni sono effimere e senza stato, non possono mantenere connessioni
persistenti né lo stato di gioco in memoria). È stato sostituito da **Supabase**.

## Architettura

```
Client (browser)
  ├─ @nuxtjs/supabase → signInAnonymously()   ogni giocatore ha un JWT reale
  ├─ Channel privato "table:<tableSessionId>"
  │     • Presence       → giocatori online (sostituisce il registro peer in-memory)
  │     • Broadcast (DB) → stato partita/sessione dai trigger Postgres
  │     • Broadcast      → messaggi dating consegnati ai due tavoli
  ├─ Channel "dating:lobby" → disponibilità tavoli in tempo reale
  └─ Azioni → POST /api/[venue]/table/[token]/...   (Nitro su Vercel)

Server API (service role, autorità sullo stato)
  └─ scrive su Postgres → trigger realtime.broadcast_changes() → client
```

Punti chiave:

- **Quorum dei voti = giocatori online**: il client host comunica i presenti
  (dalla presence) a `game/presence`, che imposta `games.total_count`. Così
  l'auto-reveal scatta quando tutti i presenti hanno votato e l'uscita di un
  giocatore non blocca il round (riproduce il comportamento del vecchio WS).
- **I record giocatore persistono**: chiudere/navigare non cancella la propria
  iscrizione (lo stato si recupera al rientro); la pulizia avviene a scadenza
  della sessione (`pg_cron`). La presence governa solo chi è *online*.
- **Niente stato in memoria**: partita, voti e presenza vivono su Postgres, quindi
  un cold start non perde nulla.
- **Voti segreti fino al reveal**: i client ascoltano solo il broadcast della riga
  `games`. La tabella `votes` non è esposta; i voti compaiono in `revealed_votes`
  solo quando il server passa la partita in fase `reveal`.
- **Server-authoritative**: tutta la logica di gioco resta in TypeScript nelle API
  server, che scrivono con il service role. I client non scrivono mai le tabelle.

## Schema e sicurezza

Le migration sono in `supabase/migrations/`:

- `…_init_realtime_backend.sql` — schema, RLS, autorizzazione Realtime, trigger di
  broadcast, pulizia sessioni con `pg_cron`.
- `…_seed_demo.sql` — venue/tavolo demo (`/demo/table/demo-001`).

RLS: tutte le tabelle hanno RLS attiva e **nessuna** policy d'accesso diretto per i
client, tranne la propria riga in `player_sessions` (serve ad autorizzare il
channel). I channel privati sono governati da policy su `realtime.messages`.

## Setup

### Locale (Supabase CLI)

```bash
supabase start            # avvia Postgres + Realtime + Auth locali
supabase db reset         # applica migration + seed
pnpm db:types             # rigenera shared/types/database.ts dallo schema
```

`supabase/config.toml` abilita già auth anonima e realtime in locale.

Copia in `.env` (vedi `.env.example`):

```
NUXT_PUBLIC_SUPABASE_URL=...
NUXT_PUBLIC_SUPABASE_KEY=...
NUXT_SUPABASE_SECRET_KEY=...
```

### Progetto remoto (produzione / Vercel)

1. Crea un progetto su Supabase (free tier sufficiente).
2. `supabase link --project-ref <ref>` poi `supabase db push` per applicare le migration.
3. Dashboard → **Authentication → Providers** → abilita *Anonymous sign-ins*.
4. Dashboard → **Realtime → Settings** → disattiva *Allow public access*
   (i channel diventano privati, governati dalle policy RLS).
5. Imposta le tre env var Supabase nel progetto Vercel.

Nessuna funzione WebSocket da deployare: Vercel serve solo SSR + API routes, il
realtime è gestito interamente dall'infrastruttura Supabase.
