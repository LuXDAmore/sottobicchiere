# API Contracts — Core MVP

Contratti request/response per gli endpoint core dell’MVP Sottobicchiere.

> Nota: i payload sotto sono contratti applicativi; campi interni/metadata possono variare.

## Convenzioni generali

- Content-Type: `application/json`
- Error envelope standard:

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Questo tavolo non è disponibile. Riprova con un nuovo QR."
  }
}
```

- Success envelope standard:

```json
{
  "ok": true,
  "data": {}
}
```

---

## 1) Validate table token

### `POST /api/table/resolve`

Valida token tavolo e restituisce sessione attiva o metadata per crearla.

**Request**

```json
{
  "venueSlug": "bar-roma-centro",
  "tableToken": "TBL_8Q2X9A"
}
```

**Response 200**

```json
{
  "ok": true,
  "data": {
    "venueId": "ven_123",
    "tableId": "tbl_456",
    "tableSessionId": "ts_789",
    "status": "waiting",
    "expiresAt": "2026-05-24T23:59:59.000Z"
  }
}
```

---

## 2) Join table session

### `POST /api/session/join`

Crea/aggancia `player_session` alla sessione tavolo.

**Request**

```json
{
  "tableSessionId": "ts_789",
  "nickname": "LudoKing",
  "groupName": "Team Spritz"
}
```

**Response 200**

```json
{
  "ok": true,
  "data": {
    "playerSessionId": "ps_001",
    "role": "player",
    "displayName": "LudoKing",
    "group": {
      "id": "grp_77",
      "name": "Team Spritz"
    }
  }
}
```

---

## 3) Lobby snapshot

### `GET /api/lobby/:tableSessionId`

Recupera stato lobby corrente.

**Response 200**

```json
{
  "ok": true,
  "data": {
    "tableSessionId": "ts_789",
    "status": "waiting",
    "hostPlayerSessionId": "ps_001",
    "players": [
      {
        "playerSessionId": "ps_001",
        "nickname": "LudoKing",
        "groupName": "Team Spritz",
        "isHost": true,
        "isConnected": true
      }
    ],
    "gameLock": false,
    "maxPlayers": 12
  }
}
```

---

## 4) Start game (host only)

### `POST /api/game/start`

Avvia una partita dalla lobby.

**Request**

```json
{
  "tableSessionId": "ts_789",
  "hostPlayerSessionId": "ps_001",
  "gameMode": "preserata",
  "gameKey": "thumbs",
  "settings": {
    "rounds": 5,
    "roundTimerSec": 20
  }
}
```

**Response 200**

```json
{
  "ok": true,
  "data": {
    "gameSessionId": "gs_222",
    "status": "in_game",
    "lockJoin": true,
    "startedAt": "2026-05-24T20:11:00.000Z"
  }
}
```

---

## 5) Submit round action

### `POST /api/game/round-action`

Invia voto/mossa del player per round corrente.

**Request**

```json
{
  "gameSessionId": "gs_222",
  "playerSessionId": "ps_001",
  "round": 2,
  "action": {
    "type": "vote",
    "value": "thumbs_up"
  }
}
```

**Response 200**

```json
{
  "ok": true,
  "data": {
    "accepted": true,
    "serverRoundState": "collecting_inputs",
    "receivedAt": "2026-05-24T20:12:04.321Z"
  }
}
```

---

## 6) End game / back to lobby

### `POST /api/game/end`

Chiude partita attiva e ritorna in lobby.

**Request**

```json
{
  "gameSessionId": "gs_222",
  "hostPlayerSessionId": "ps_001"
}
```

**Response 200**

```json
{
  "ok": true,
  "data": {
    "tableSessionId": "ts_789",
    "status": "waiting",
    "summary": {
      "winner": "LudoKing",
      "scores": [
        { "playerSessionId": "ps_001", "points": 42 }
      ]
    }
  }
}
```

---

## Error codes MVP (proposti)

- `INVALID_TOKEN`
- `TABLE_SESSION_EXPIRED`
- `NICKNAME_INVALID`
- `LOBBY_FULL`
- `HOST_REQUIRED`
- `GAME_ALREADY_RUNNING`
- `GAME_LOCKED`
- `ROUND_TIMEOUT`
- `INVALID_ACTION_PAYLOAD`
- `REALTIME_DISCONNECTED`
