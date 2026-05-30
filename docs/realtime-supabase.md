# Realtime su Supabase

Questo documento descrive l'architettura realtime dopo la migrazione da WebSocket (Nitro) a Supabase.

## Perché

Vercel (serverless) non mantiene connessioni WebSocket persistenti né stato in-memory tra invocazioni. La soluzione sposta il realtime su **Supabase** (servizio gestito) mantenendo le API di mutazione su Vercel.

## Architettura

```
Client (browser)
  │
  ├─ @nuxtjs/supabase → signInAnonymously()        ogni visitatore ha un JWT
  │
  ├─ Channel privato "table:<tableSessionId>"
  │     • Presence       → giocatori online (+ elezione host quando l'host esce)
  │     • Broadcast (DB) → stato partita/sessione (trigger Postgres)
  │     • Broadcast      → messaggi dating
  │
  ├─ Channel "dating:lobby"  → disponibilità tavoli (broadcast da DB)
  │
  └─ Azioni → POST /api/[venue]/table/[token]/...   (Nitro su Vercel)

Server API (service role, autorità sullo stato)
  └─ scrive su Postgres → trigger realtime.broadcast_changes() → client
```

## Componenti

### Database (`supabase/migrations`)

- **Schema**: `venues`, `tables`, `table_sessions`, `groups`, `player_sessions`, `games`, `votes`, `dating_messages`
- **RLS**: i client non accedono direttamente alle tabelle (tranne la propria riga `player_sessions`); tutto passa dalle API con service role
- **Trigger di broadcast**: `games`, `table_sessions`, `dating_messages` chiamano `realtime.broadcast_changes()`
- **Autorizzazione Realtime**: policy su `realtime.messages` per i channel privati
- **Pulizia**: `pg_cron` rimuove sessioni scadute

### Client (`app/`)

- `plugins/supabase-anon.client.ts` → accesso anonimo automatico
- `composables/useTableSocket.ts` → presence + broadcast, stessa API pubblica del vecchio composable

### Server (`server/`)

- `utils/supabase.ts` → client service role
- `utils/request.ts` → risoluzione tavolo/sessione + verifica autenticazione (`requireTable`, `requirePlayer`, `requireHostSession`)
- `utils/game-engine.ts` → stato di gioco server-authoritative
- `utils/game-thumbs.ts` → logica pura del gioco (round/reveal/scoring)
- `utils/host-election.ts` → logica pura di elezione del nuovo host (`electHost`)
- `utils/dating.ts` → validazione contenuti dating
- `api/.../game/*`, `session/*`, `dating/*` → endpoint REST

## Flusso di gioco

1. Il giocatore entra (`join`) → riceve `tableSessionId` e `playerId`
2. Il client apre il channel `table:<tableSessionId>` (presence + broadcast)
3. Le azioni (start/vote/next) sono POST alle API; il server scrive su Postgres
4. I trigger propagano i cambi a tutti i client via broadcast
5. Lo stato iniziale (a freddo/refresh) è caricato via REST (`game/current`, `game/state`, `dating/rooms`)

## Presence e quorum

La presence del channel `table:<tableSessionId>` sostituisce il vecchio registro peer in-memory:

- ogni client traccia `{ id, nickname, color }`; l'evento `sync` ricostruisce l'elenco dei giocatori online
- l'**host** comunica al server i presenti (`POST game/presence`), che li usa come **quorum** per l'auto-reveal: quando tutti gli online hanno votato il round si svela, e l'uscita di qualcuno non blocca la partita

## Riassegnazione automatica dell'host

L'host (chi crea la sessione, `table_sessions.host_player_id`) è l'unico che può avviare la partita, avanzare i round, cambiare modalità e **riportare il quorum** per l'auto-reveal. Con il vecchio WebSocket, quando l'host si disconnetteva veniva promosso «il primo giocatore rimasto» (`reassignHost`). Su Supabase non c'è una connessione persistente, quindi questa logica è ricostruita sulla presence:

1. **Elezione (client, deterministica)** — a ogni `presence sync`, se l'host corrente non è più tra i presenti, tutti i client calcolano lo stesso successore: il giocatore online con `id` minore (`electHost`). Solo l'eletto invia la richiesta (con un piccolo debounce), evitando una corsa tra più client.
2. **Rivendicazione (server)** — `POST /session/claim-host` con `{ playerId, online, session }`. Il server:
   - verifica autenticazione e proprietà del `playerId` (`requirePlayer`)
   - verifica appartenenza alla sessione del tavolo
   - rivaluta l'elezione sui **soli membri reali** della sessione (no presence spoofing)
   - **non toglie l'host a chi è ancora online**
   - applica un **update ottimistico con guardia su `host_player_id`**: in caso di race vince una sola richiesta
   - allinea anche `games.host_player_id` della partita attiva
3. **Propagazione** — l'update su `table_sessions` fa scattare il trigger di broadcast: tutti i client ricevono il nuovo host, `isHost` si ricalcola e il nuovo host inizia a riportare il quorum.

La funzione pura `electHost(currentHost, online, members)` è coperta da test unitari (`test/unit/host-election.test.ts`).

## Sicurezza

- Ogni azione verifica l'utente Supabase (`serverSupabaseUser`) e che possieda il `playerId` indicato (impedisce l'impersonificazione: gli ID sono visibili via presence)
- I voti restano segreti: i client non leggono `votes`, solo `games.revealed_votes` in fase reveal
- I channel privati richiedono autorizzazione via RLS su `realtime.messages`: i client possono solo inserire `presence` (i broadcast di stato arrivano dai trigger DB) e non possono scrivere su `dating:lobby`
- La riassegnazione host è validata lato server (proprietà, appartenenza, elezione sui membri reali, update ottimistico)

## Setup

Vedi README e `.env.example`. Passi principali: creare progetto Supabase, `supabase db push`, abilitare anonymous sign-ins, configurare le variabili `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_KEY`, `NUXT_SUPABASE_SECRET_KEY`.
