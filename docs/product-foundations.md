# Product Foundations — Sottobicchiere

## Obiettivo
Sottobicchiere è una PWA per locali che permette ai clienti di aprire o raggiungere un tavolo di gioco tramite QR code, entrare con nickname anonimo e giocare in tempo reale con amici presenti al tavolo.

## Flussi principali
1. **Apri tavolo demo / nuovo tavolo**: l'utente entra in una lobby e avvia una sessione.
2. **Entra in tavolo esistente**: l'utente usa QR/link condiviso dai propri amici.
3. **Scelta gioco**: in lobby il tavolo seleziona il gioco da avviare.
4. **Persistenza minima**: sessioni e dati giocatore sono temporanei.

## Modalità di gioco
- **Giochi da tavolo**: esperienze multiplayer classiche da lobby.
- **Giochi preserata**: minigiochi sociali rapidi per gruppi in uscita.
- **Dating mode**: i tavoli attivi in questa modalità possono scambiarsi messaggi anonimi inter-tavolo.

## Regole dati
- Nessun account richiesto.
- Nessuna PII permanente.
- Sessioni temporanee con scadenza.

## Cleanup giornaliero
Ogni giorno alle **06:00 UTC** viene eseguito un job di cleanup che elimina le sessioni scadute (e relativi dati collegati in cascata).
