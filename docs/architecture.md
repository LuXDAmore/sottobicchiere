# Architettura — Sottobicchiere

## Panoramica

Sottobicchiere è una PWA multi-tenant per bar e locali con tavoli. Ogni installazione è associata a una venue (locale) identificata da un slug. I tavoli hanno QR code fisici; scansionando il QR, il cliente entra in una sessione di gioco associata al tavolo.

## Flusso principale

```
1. Scan QR code  →  /[venue]/table/[qr_token]
2. Nuxt SSR      →  valida qr_token, recupera table_session (o ne crea una nuova)
3. Player join   →  sceglie nickname + colore/gruppo
4. Lobby         →  grid giocatori live (WebSocket), countdown, scelta gioco
5. Gioco         →  stato in Vercel KV (Redis), sync WebSocket
6. Fine gioco    →  risultati, animazione vittoria, torna alla lobby
7. Cleanup       →  table_session.expires_at (TTL 8h), cron Nitro alle 03:00
```

## Layer architetturali

```
┌─────────────────────────────────────────────────────┐
│                    Cliente (Browser)                 │
│  Vue 3 SPA  ·  Nuxt UI  ·  Pinia  ·  @vueuse/motion │
└─────────────────┬───────────────────────────────────┘
                  │ HTTP + WebSocket
┌─────────────────▼───────────────────────────────────┐
│                 Nitro (Edge/Vercel)                   │
│  API routes  ·  WebSocket handlers  ·  Scheduled tasks│
└──────┬───────────────────┬──────────────────────────┘
       │ SQL (Drizzle ORM) │ KV (ioredis)
┌──────▼──────┐    ┌───────▼──────────────────────────┐
│ Neon Postgres│    │ Vercel Redis                      │
│ (dati base) │    │ (game state real-time, effimero)   │
└─────────────┘    └──────────────────────────────────┘
```

## Componenti chiave

### Venue (locale)
Ogni bar ha la sua installazione con un `slug` univoco (es: `bar-centrale`). In futuro supporterà sottodomini (`bar-centrale.sottobicchiere.app`) o domini custom.

### Table Session (sessione tavolo)
Una sessione viene aperta quando il primo cliente scansiona il QR di un tavolo. Scade automaticamente (TTL 8h). Contiene i riferimenti ai player e ai gruppi.

### Player Session (sessione giocatore)
Completamente anonima: solo nickname + colore assegnato randomicamente. Nessun account. Scade con la table_session.

### Group (gruppo)
I giocatori possono formare squadre o stare da soli. Un tavolo può avere più gruppi (es: squadre che competono).

### Game State (stato gioco)
Lo stato dei giochi vive in Vercel KV (Redis) per massima velocità real-time. Non è persistente: viene cancellato al termine della sessione.

### WebSocket (Nitro)
Nitro espone WebSocket via `server/routes/ws/table.ts` (accessibile su `/ws/table?tableSessionId=...`). Ogni client si connette a un namespace isolato per tavolo. Il server fa da relay per gli aggiornamenti di stato tramite pub/sub crossws.

## Multi-tenant

Il sistema supporta più venue sulla stessa installazione:
- Route: `/[venue]/...` identifica il locale
- Admin: `/[venue]/admin/` per la gestione del locale (token-based, futuro)
- QR token è univoco per tavolo e venue: `qr_token = hash(venue_id + table_id + salt)`

## Privacy

- Nessun dato PII salvato nel DB
- I nickname scelti dai giocatori non sono tracciabili a persone reali
- I dati di gioco (risposte, punteggi) sono associati solo al nickname corrente
- Database pulito ogni notte (sessioni scadute eliminate)
- In futuro: opt-in per account permanente con salvataggio dati esplicito

## Deployment

- **Produzione**: Vercel (NuxtHub, auto-deploy dal branch `main`)
- **Staging**: branch preview su Vercel
- **Dev**: `pnpm dev` su `https://localhost:3000`
- **Database**: Neon PostgreSQL (pooled per Nitro, unpooled per migrations)
- **KV**: Vercel Redis (Upstash)
- **Blob**: Vercel Blob (asset statici venue)
