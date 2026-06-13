# Game Modes — MVP taxonomy

Questo documento definisce le differenze operative tra le tre famiglie di modalità di gioco supportate/progettate nell’MVP.

## 1) Giochi da tavolo

### Obiettivo
Replicare dinamiche più “classiche” (carte/strategia light) in formato digitale assistito.

### Caratteristiche
- Durata media partita: **10–25 minuti**.
- Richiede gruppi più stabili (meno join/leave nel mezzo).
- Regole più strutturate, spesso a turni.
- Peso maggiore su punteggio cumulativo e stato partita persistente per la sessione.

### Vincoli UX/tecnici
- Lock join quasi sempre attivo dopo start.
- Necessario stato round robusto e deterministico.
- Priorità a chiarezza regole e anti-errore input.

## 2) Giochi preserata

### Obiettivo
Creare engagement veloce e social prima della serata (ritmi rapidi, basso attrito).

### Caratteristiche
- Durata media: **3–10 minuti**.
- Round brevi, input semplici (tap/voto/scelta).
- Alta rotazione giocatori: onboarding frequente.
- Forte enfasi su divertimento immediato più che competizione profonda.

### Vincoli UX/tecnici
- Lobby e rejoin devono essere super veloci.
- Feedback realtime immediato (timer, reveal, classifiche flash).
- Error handling molto leggibile per contesto rumoroso (bar).

## 3) Dating mode

### Obiettivo
Favorire interazione sociale guidata tra gruppi/utenti (ice-breaker, matching light).

### Caratteristiche
- Durata media: **5–15 minuti**.
- Meccaniche orientate a preferenze/domande/affinità.
- Sensibilità maggiore su tono contenuti e moderazione.
- Possibile scoring “soft” (compatibilità, badge social), meno competitivo.

### Vincoli UX/tecnici
- Copy e microcopy devono essere inclusivi e non invasivi.
- Privacy-by-default: niente dati personali persistenti.
- Eventuale anonimizzazione parziale durante alcune fasi.

## Differenze sintetiche

| Aspetto | Giochi da tavolo | Giochi preserata | Dating mode |
|---|---|---|---|
| Durata media | 10–25 min | 3–10 min | 5–15 min |
| Complessità regole | Media/alta | Bassa | Bassa/media |
| Ritmo | Strutturato | Rapido | Conversazionale |
| Lock join | Quasi sempre | Spesso flessibile | Dipende dal format |
| Focus | Strategia/partita | Social quick fun | Interazione/affinità |
| Scoring | Competitivo | Leggero/flash | Soft/social |

## GameDefinition (codice)

Ogni gioco è descritto da `GameDefinition` in `shared/utils/games.ts`:

```typescript
interface GameDefinition {
    id: GameId; // unione tipizzata in shared/utils/games.ts
    category: 'board' | 'preserata' | 'both' | 'solo'; // 'both' = board + preserata
    minPlayers: number;
    maxPlayers?: number; // undefined = nessun limite superiore
    avgDurationMinutes: number;
    icon: string;
    labelKey: string; // chiave i18n
}
```

Il catalogo è la **fonte unica** dei vincoli sui giocatori: la card in lobby mostra
"Min. {n}" (o "{min}–{max}" se esiste un massimo), la pagina del gioco mostra il
gate di attesa con lo stesso minimo, e l'API di start (`game/start.post.ts`) li
applica server-side (422 `NOT_ENOUGH_PLAYERS` / `TOO_MANY_PLAYERS`). I giochi con
`minPlayers: 1` (es. solitari) sono giocabili da soli senza warning bloccanti.

`getGamesByCategory(category)` filtra il catalogo per la tab della lobby: i giochi
`both` (universali) compaiono sia in "board" sia in "preserata", ma **non** tra i
"solo"; viceversa i giochi `solo` non inquinano board/preserata.

### Realtime vs locale

Due famiglie di implementazione convivono:

- **Realtime/multiplayer** (es. `thumbs`): stato autoritativo su Postgres
  (`games`), sincronizzato via trigger di broadcast; engine in `server/utils/`,
  API in `server/api/.../game/`. Vedi `docs/realtime-supabase.md`.
- **Locale/pass-the-phone** (es. `reflex`, `duello`, `dares`, `categorie`,
  `word-blitz`): nessuno stato server né riga in `games`. La pagina è
  completamente client-side; chiama comunque `open()/close()` di `useTableSocket`
  per restare connessa al tavolo e seguire un eventuale cambio gioco dell'host
  (`gameLaunch`). I contenuti (mazzi carte, categorie) vivono in
  `shared/utils/party.ts`. Privacy-first: nessun dato lascia il dispositivo
  (il record personale di `reflex` è in `localStorage`).

Giochi implementati nell'MVP:
| ID | Category | Min | Max | Durata | Tipo |
|----|----------|-----|-----|--------|------|
| `thumbs` | `both` | 2 | — | 8 min | realtime |
| `dares` | `preserata` | 2 | — | 15 min | locale (pass-the-phone) |
| `categorie` | `both` | 2 | — | 6 min | locale (pass-the-phone) |
| `duello` | `both` | 2 | 2 | 3 min | locale (1 device, schermo diviso) |
| `reflex` | `solo` | 1 | 1 | 2 min | locale (solitario) |
| `word-blitz` | `preserata` | 1 | — | 5 min | locale (prototipo) |

## Implicazioni MVP

- Il primo set giochi MVP parte dai **preserata** (time-to-fun più alto, complessità minore).
- I **giochi da tavolo** richiedono più investimenti in engine stato/turni.
- Il **dating mode** è un toggle individuale per-player — non è una "modalità sessione" ma un layer indipendente che coesiste con i giochi.
- Nuovi giochi si aggiungono estendendo `GAME_DEFINITIONS` in `shared/utils/games.ts` e implementando la pagina `/game/[id].vue`.
