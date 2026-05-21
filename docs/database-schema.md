# Schema Database — Sottobicchiere

Stack: Neon PostgreSQL + Drizzle ORM (`server/db/schema.ts`)

## Principi

- **Effimero per i giocatori**: `table_sessions`, `player_sessions`, `groups` hanno TTL (8h). Puliti ogni notte dal task `cleanup-expired-sessions`.
- **Permanente per le venue**: `venues` e `tables` non vengono cancellate.
- **Nessun PII**: i nickname sono scelti liberamente, nessun dato identificativo reale.
- **Game state non in DB**: lo stato dei giochi vive in Vercel KV (Redis) per velocità real-time.

## Tabelle

### `venues`

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
slug        text NOT NULL UNIQUE          -- es: "bar-centrale"
name        text NOT NULL                 -- nome del locale
config      jsonb NOT NULL DEFAULT '{}'   -- config personalizzata (colori brand, ecc.)
created_at  timestamptz NOT NULL DEFAULT now()
```

### `tables`

```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
venue_id     uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE
table_number integer NOT NULL               -- numero tavolo (es: 5)
qr_token     text NOT NULL UNIQUE           -- token per il QR code
created_at   timestamptz NOT NULL DEFAULT now()

UNIQUE (venue_id, table_number)
```

### `table_sessions`

Sessione effimera aperta per un tavolo.

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
table_id    uuid NOT NULL REFERENCES tables(id) ON DELETE CASCADE
started_at  timestamptz NOT NULL DEFAULT now()
expires_at  timestamptz NOT NULL DEFAULT now() + interval '8 hours'
```

Index: `expires_at` (per il cleanup task notturno)

### `player_sessions`

Giocatore anonimo in una sessione tavolo.

```sql
id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
table_session_id uuid NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE
nickname         text NOT NULL                 -- scelto dal giocatore, max 20 caratteri
color            text NOT NULL                 -- hex colore identità (#6366F1, #8B5CF6, ecc.)
group_id         uuid REFERENCES groups(id)    -- null = giocatore solitario
joined_at        timestamptz NOT NULL DEFAULT now()
```

### `groups`

Squadre all'interno di una sessione tavolo.

```sql
id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
table_session_id uuid NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE
name             text NOT NULL                 -- nome squadra (scelto dai giocatori)
color            text NOT NULL                 -- hex colore squadra
created_at       timestamptz NOT NULL DEFAULT now()
```

## Colori giocatore

I colori sono assegnati automaticamente al join da una palette predefinita (8 colori massimo per sessione):

```typescript
const PLAYER_COLORS = [
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#EF4444', // Red
];
```

## Game State (fuori DB — Vercel KV)

Lo stato dei giochi è strutturato come JSON in Redis con TTL allineato alla sessione:

```
Key pattern: game:{table_session_id}:{game_id}
TTL: 8 ore

Struttura:
{
  gameId: string,
  gameType: 'who-am-i' | 'trivia' | ...,
  status: 'waiting' | 'playing' | 'finished',
  round: number,
  players: { [playerId]: { score, status, answer } },
  currentQuestion: object | null,
  startedAt: ISO string,
}
```

## Cleanup Task

Nitro scheduled task `cleanup-expired-sessions` (ogni notte alle 03:00):

```sql
DELETE FROM table_sessions WHERE expires_at < now();
-- CASCADE: cancella automaticamente player_sessions e groups associati
```
