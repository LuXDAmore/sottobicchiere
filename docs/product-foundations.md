# Product Foundations — Sottobicchiere

## Obiettivo
Sottobicchiere è una PWA per locali che permette ai clienti di aprire o raggiungere un tavolo di gioco tramite QR code, entrare con nickname anonimo e giocare in tempo reale con amici presenti al tavolo.

## Flussi principali
1. **Scan QR → scegli gruppo**: l'utente scansiona il QR, vede i gruppi attivi al tavolo e ne sceglie uno (o ne crea uno nuovo).
2. **Join gruppo con partita in corso**: se il gruppo scelto ha una partita attiva, l'utente è portato direttamente al gioco.
3. **Scelta gioco in lobby**: l'host del gruppo seleziona il gioco; gli altri attendono.
4. **Dating anonimo individuale**: ogni utente può attivare in autonomia il dating toggle e ricevere/inviare messaggi anonimi da altri tavoli — indipendentemente dal gioco in corso.
5. **Persistenza minima**: sessioni e dati giocatore sono temporanei.

## Tre sezioni del prodotto
- **Giochi da tavolo** (`category: 'board'`): partite strutturate, durata 10-25 min, lock join durante partita.
- **Giochi pre-serata** (`category: 'preserata'`): minigiochi rapidi sociali, durata 3-10 min, onboarding frequente.
- **Dating anonimo**: toggle per-player, attivabile in background; messaggi anonimi tra sessioni di tavoli diversi.

## Multi-gruppo per tavolo fisico
Un tavolo fisico può ospitare più sessioni (`table_sessions`) attive simultaneamente (es. due comitive separate allo stesso tavolo). Scansionando il QR si vedono tutte le sessioni attive con il numero di giocatori e lo stato del gioco, e si sceglie a quale unirsi o se crearne una nuova.

## Regole dati
- Nessun account richiesto.
- Nessuna PII permanente.
- Sessioni temporanee con scadenza.

## Cleanup giornaliero
Ogni giorno alle **06:00 UTC** viene eseguito un job di cleanup che elimina le sessioni scadute (e relativi dati collegati in cascata).
# Sottobicchiere — Product Foundations v1

## Visione MVP

Sottobicchiere è una PWA social gaming per tavoli reali di bar/locali: accesso istantaneo via QR, nessun account, sessioni effimere, partite brevi e coordinate da un host locale.

## User journey MVP (scan QR → join → lobby → game)

1. **Scan QR**
   - L’utente scansiona il QR del tavolo.
   - Fallback: URL breve stampato vicino al QR.
   - Se il token tavolo è valido, si apre la route del tavolo.

2. **Join**
   - Schermata join con campi minimi: nickname (obbligatorio), gruppo (opzionale).
   - Mostrare informativa breve privacy: dati temporanei, nessun account richiesto.
   - Alla conferma, viene creata/agganciata una `player_session` alla `table_session` attiva.

3. **Lobby**
   - Vista giocatori presenti in tempo reale.
   - Stato tavolo: `waiting`, `starting`, `in_game`, `ended`.
   - Se host presente: selezione gioco, impostazioni round/timer, start match.
   - Se player: stato read-only + feedback di readiness.

4. **Game**
   - Inizio round e sync realtime via canale websocket del tavolo.
   - Turni/fasi dipendono dal game mode, ma sempre con loop standard:
     `waiting room → round phase → reveal phase → results → replay/new game`.
   - Fine partita: recap punteggi + ritorno in lobby o rematch.

## Ruoli

### Host
- È il coordinatore operativo della sessione tavolo.
- Può:
  - scegliere modalità/gioco;
  - avviare partita;
  - bloccare accesso tardivo (lock join);
  - chiudere partita e rientrare in lobby.
- Nell’MVP l’host è un ruolo di sessione, non un account permanente.

### Player
- Partecipa con nickname temporaneo.
- Può:
  - entrare in lobby;
  - impostare/aggiornare il proprio gruppo (se abilitato);
  - giocare i round;
  - uscire liberamente dalla sessione.
- Non può avviare/chiudere partita se non host.

## Regole di sessione e lock gioco

- Una `table_session` è attiva per tavolo con TTL (cleanup automatico server-side).
- All’avvio partita lo stato passa a `in_game`.
- **Lock join in-game**:
  - default MVP: nuovi ingressi bloccati durante partita attiva;
  - i nuovi utenti vedono messaggio “Partita in corso, attendi il prossimo round”.
- **Reconnect grace**:
  - player già presenti possono rientrare se la loro sessione è ancora valida.
- **Host handover (fallback)**:
  - se host disconnette, il sistema promuove automaticamente il player più anziano in lobby.
- **Fine partita**:
  - stato `ended` e ritorno a `waiting` dopo recap/rematch decision.

## Errori utente e messaggi UI previsti

### Join / accesso tavolo
- **QR/token non valido**
  - Messaggio: “Questo tavolo non è disponibile. Riprova con un nuovo QR.”
- **Sessione tavolo scaduta**
  - Messaggio: “La sessione è scaduta. Aggiorna per crearne una nuova.”
- **Nickname non valido (vuoto/troppo lungo)**
  - Messaggio: “Inserisci un nickname valido (2–20 caratteri).”

### Lobby
- **Lobby piena (limite giocatori)**
  - Messaggio: “Tavolo al completo. Riprova tra poco.”
- **Permesso negato (azione host-only)**
  - Messaggio: “Solo l’host può eseguire questa azione.”
- **Gioco non selezionato (host start)**
  - Messaggio: “Seleziona un gioco prima di iniziare.”

### In game
- **Invio mossa/voto fuori tempo**
  - Messaggio: “Tempo scaduto per questo round.”
- **Payload round non valido**
  - Messaggio: “Azione non valida. Riprova.”
- **Connessione realtime persa**
  - Messaggio: “Connessione instabile. Riconnessione in corso…”

### Post game
- **Recap non disponibile (errore server)**
  - Messaggio: “Impossibile caricare i risultati. Riprova.”

## UX direction (light + dark, casual ma premium)

- Visual tone: playful social gaming, non infantile.
- Core mood: geometrie morbide, CTA ad alto contrasto, card soft-glass, micro-animazioni.
- Accessibilità baseline: contrasto AA, touch target 44px, fallback reduced motion.

## Venue admin roadmap (post-MVP)

- Dashboard gestione tavoli/QR per venue.
- Sfide personalizzate con premi e scadenze.
- Analytics aggregate privacy-safe, senza identificazione personale.
