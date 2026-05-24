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

## Implicazioni MVP

- Il primo set giochi MVP dovrebbe partire dai **preserata** (time-to-fun più alto, complessità minore).
- I **giochi da tavolo** richiedono più investimenti in engine stato/turni.
- Il **dating mode** necessita linee guida copy/moderazione prima del rollout pubblico.
