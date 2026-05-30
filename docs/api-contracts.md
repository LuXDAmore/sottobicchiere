# API & Realtime Contracts — Sottobicchiere (MVP)

> Allinea a implementazione (`server/api/[venue]/table/[token]/...`). Il realtime non usa più WebSocket: è gestito da **Supabase Realtime** (channel privati). Le mutazioni sono **REST**; lo stato è propagato ai client via **broadcast da DB** (trigger Postgres).

## Autenticazione

Ogni visitatore ha una sessione **Supabase anonima** (JWT, plugin `supabase-anon.client`). Le API verificano l'utente (`serverSupabaseUser`) e che possieda il `playerId` indicato; le azioni host verificano anche `table_sessions.host_player_id`.

## REST (`server/api`)

Convenzioni: JSON, `camelCase`. Errori con `createError` → `{ statusCode, statusMessage, message }`. Base path: `/api/[venue]/table/[token]`.

### Join & sessione

| Metodo | Path | Descrizione |
|---|---|---|
| POST | `/join` | Crea/recupera sessione ed entra. Body `{ nickname, groupName?, createSession?, sessionId? }`. Restituisce `playerId`, `tableSessionId`, `isHost`, colore, ecc. |
| GET | `/session` | Dettagli della sessione attiva del tavolo. |
| POST | `/session/create` | Crea una nuova sessione di tavolo. |
| POST | `/session/mode` | (host) Cambia `session_mode` (`board`/`dating`/`preserata`). |
| POST | `/session/claim-host` | Rivendica l'host quando quello corrente è offline. Body `{ playerId, online[], session? }` → `{ ok, hostPlayerId }`. |

### Gioco

| Metodo | Path | Descrizione |
|---|---|---|
| GET | `/game/current` | Selezione gioco + `sessionMode` + `datingEnabled` (query `?session=`). |
| GET | `/game/state` | Riga `games` completa per la sync iniziale (query `?session=`). |
| POST | `/game/select` | Seleziona il gioco in lobby. |
| POST | `/game/start` | (host) Avvia la partita. Body `{ playerId, totalRounds? }`. |
| POST | `/game/vote` | Invia il voto del round. Body `{ playerId, vote: 'up'\|'down' }` (upsert idempotente). |
| POST | `/game/next` | (host) Avanza al round successivo. |
| POST | `/game/presence` | (host) Riporta i giocatori online → quorum per l'auto-reveal. Body `{ playerId, online[] }`. |

### Dating

| Metodo | Path | Descrizione |
|---|---|---|
| GET | `/dating/rooms` | Tavoli disponibili/non disponibili (query `?self=`). |
| POST | `/dating/enable` | Attiva il dating per la sessione. |
| POST | `/dating/disable` | Disattiva il dating. |
| POST | `/dating/message` | Invia un messaggio a un altro tavolo. Body `{ playerId, toTableSessionId, body }` (rate-limit su finestra DB). |

## Realtime (Supabase channels)

Lo stato non viaggia su eventi client→server: i client **ascoltano** i channel, le mutazioni passano dalle API REST, e i **trigger DB** trasmettono i cambi.

### Channel `table:<tableSessionId>` (privato)

- **Presence** — ogni client traccia `{ id, nickname, color }`; l'evento `sync` ricostruisce l'elenco online. Base per il quorum e per l'elezione dell'host.
- **Broadcast `INSERT`/`UPDATE`/`DELETE`** (dai trigger su `games`/`table_sessions`) — payload `{ table, record }`; il client mappa la riga in stato partita/sessione.
- **Broadcast `dating:message`** — nuovo messaggio dating per i due tavoli coinvolti.

### Channel `dating:lobby` (privato)

- **Broadcast `dating:availability`** — un tavolo è entrato/uscito dalla lobby dating; il client ricarica `/dating/rooms`.

Autorizzazione via RLS su `realtime.messages`: i client possono inserire solo `presence` (non broadcast di stato) e non possono scrivere su `dating:lobby`.

## Sicurezza

- Validazione payload server-side (Zod); rate-limit (es. messaggi dating) su finestra DB.
- Verifica utente Supabase + proprietà del `playerId` (no impersonificazione: gli ID sono visibili via presence).
- Token tavolo non indovinabile (QR); scope per sessione.
- Nessun dato persistente del giocatore oltre la sessione (pulizia pg_cron).
