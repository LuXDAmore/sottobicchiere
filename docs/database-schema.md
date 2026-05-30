# Database Schema — Sottobicchiere (MVP)

> DB: **Supabase Postgres**. Migration **SQL native** in `supabase/migrations/`. I tipi TypeScript sono generati in `shared/types/database.ts` (`pnpm db:types`).

## Convenzioni

- Chiavi primarie `uuid` (`gen_random_uuid()`); timestamp in UTC (`timestamptz`).
- Sessioni e dati di gioco **effimeri** (TTL via `expires_at` + pulizia `pg_cron`).
- Nomi tabella in `snake_case` plurale; colonne in `snake_case`.
- **RLS** attiva su tutte le tabelle: l'accesso passa dalle API server (service role). I client leggono solo la propria riga in `player_sessions` (serve ad autorizzare il channel).

## Entità principali

### venues

Locali/bar che ospitano i tavoli.

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| slug | text | univoco, per URL |
| name | text | nome locale |
| created_at | timestamptz | |

### tables

Tavoli fisici con QR.

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| venue_id | uuid | FK → venues.id (cascade) |
| qr_token | text | univoco, nel QR |
| table_number | integer | numero tavolo; `unique(venue_id, table_number)` |
| created_at | timestamptz | |

### table_sessions

Sessione di gioco effimera per un tavolo.

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| table_id | uuid | FK → tables.id (cascade) |
| started_at | timestamptz | |
| expires_at | timestamptz | TTL (default `now() + 6h`) |
| selected_game | text | gioco scelto in lobby |
| game_mode | text | modalità del gioco |
| session_mode | text | `board` \| `dating` \| `preserata` (default `board`) |
| dating_enabled | boolean | toggle dating della sessione |
| locked_at | timestamptz | lock dopo l'avvio |
| host_player_id | uuid | host corrente (riassegnabile) |

### groups

Gruppi/squadre opzionali al tavolo.

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| table_session_id | uuid | FK (cascade) |
| name | text | nome gruppo |
| color | text | colore UI |
| created_at | timestamptz | |

### player_sessions

Giocatori effimeri in una sessione.

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| table_session_id | uuid | FK (cascade) |
| nickname | text | visualizzato |
| color | text | colore UI |
| group_id | uuid | FK opzionale (set null) |
| user_id | uuid | utente Supabase anonimo (autorizza il channel) |
| is_host | boolean | host della sessione |
| created_at | timestamptz | |

### games

Partita di un mini-gioco nella sessione (i round sono incorporati, non una tabella separata).

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| table_session_id | uuid | FK **unique** (cascade) — una partita attiva per sessione |
| kind | text | es. `thumbs` (default) |
| phase | text | `voting` \| `reveal` \| `finished` |
| round_index | integer | round corrente |
| total_rounds | integer | round totali |
| questions | jsonb | domande della partita |
| current_question | jsonb | domanda del round |
| scores | jsonb | punteggi cumulati |
| voted_count | integer | voti del round |
| total_count | integer | quorum (presenti online) |
| revealed_votes | jsonb | valorizzato solo in fase `reveal` |
| host_player_id | uuid | host della partita |
| created_at / updated_at | timestamptz | |

### votes

Voti per round (segreti: nessun accesso client, solo service role).

| Campo | Tipo | Note |
|---|---|---|
| game_id | uuid | FK (cascade) |
| round_index | integer | round |
| player_id | uuid | giocatore |
| vote | text | `up` \| `down` |
| created_at | timestamptz | |
| | | PK composta `(game_id, round_index, player_id)` → voto idempotente |

### dating_messages

Messaggi tra tavoli in dating mode.

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| from_table_session_id | uuid | FK → table_sessions (cascade) |
| to_table_session_id | uuid | FK → table_sessions (cascade) |
| body | text | contenuto |
| created_at | timestamptz | |

## Relazioni (alto livello)

- venue 1—N tables
- table 1—N table_sessions
- table_session 1—N groups, player_sessions; 1—1 games (attiva)
- game 1—N votes (per round)
- table_session N—N table_session via dating_messages

## Realtime & sicurezza

- I cambi su `games`, `table_sessions` e `dating_messages` sono propagati ai client da **trigger** che chiamano `realtime.broadcast_changes()`.
- I **voti restano segreti**: i client non leggono `votes`; i risultati compaiono in `games.revealed_votes` solo in fase `reveal`.
- Pulizia con **pg_cron**: rimozione delle sessioni scadute e dei dati correlati (cascade).

## Note di implementazione

- Indici su FK e su `table_sessions.expires_at` per il cleanup.
- Vincoli univoci: `venues.slug`, `tables.qr_token`, `tables(venue_id, table_number)`, `games.table_session_id`.
- Soft-delete non necessario (dati effimeri); hard-delete via pg_cron.
