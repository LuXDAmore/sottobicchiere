# TODO — Sottobicchiere MVP Sprint Plan

Aggiornato: 2026-05-21

## Bootstrap (fase 0) — Documentazione e Design System

- [x] Riscrivere README.md per Sottobicchiere
- [x] Aggiornare Agents.md (stack references)
- [x] Riscrivere .specdd/bootstrap.project.md per Sottobicchiere
- [x] Riscrivere app.sdd come contratto SpecDD Sottobicchiere
- [x] Aggiornare package.json (nome, descrizione, rimuovere dep WeGree)
- [x] Riscrivere nuxt.config.ts (rimuovere config WeGree)
- [x] Aggiornare app.config.ts con tema "Notte Italiana"
- [x] Aggiornare ui.css con design tokens Sottobicchiere
- [x] Aggiornare public/manifest.json
- [x] Creare docs/architecture.md
- [x] Creare docs/database-schema.md
- [x] Creare docs/design.md
- [x] Creare docs/agents-changelog.md
- [ ] Creare il logo SVG placeholder di Sottobicchiere

## Database (fase 1)

- [ ] Schema Drizzle: `venues`, `tables`, `table_sessions`, `player_sessions`, `groups`
- [ ] Generare e applicare la prima migrazione
- [ ] Scheduled task Nitro: `cleanup-expired-sessions` (TTL 8h)

## App Structure (fase 1)

- [x] Layout `default` (header: logo + theme toggle + lang switcher)
- [x] Layout `game` (full-screen, minimal chrome)
- [x] Pagina welcome `index.vue` (QR scan prompt, branding, onboarding)
- [ ] Rotta dinamica `/[venue]/table/[token]` — join tavolo
- [ ] Pagina lobby tavolo — lista giocatori, scelta gruppo, countdown

## i18n (fase 1)

- [x] Creare `i18n/locales/it.json` con chiavi MVP
- [x] Creare `i18n/locales/en.json` con chiavi MVP
- [ ] Verificare ogni stringa visibile in IT e EN prima del primo deploy

## Giochi (fase 2)

- [ ] Definire la struttura dati di un `Game` e `GameState`
- [ ] Implementare WebSocket handler Nitro per sync real-time
- [ ] Primo gioco MVP: "Chi sono io?" (indovina il personaggio)
- [ ] Secondo gioco: quiz trivia a scelta multipla

## Venue Admin (fase 2)

- [ ] Rotta `/admin` protetta da token venue
- [ ] Dashboard venue: lista tavoli, QR code, sfide attive
- [ ] CRUD sfide venue con campo premio

## Funzionalità Future (backlog)

- [ ] v2: Autenticazione giocatori (Better Auth, Google OAuth)
- [ ] v2: Profili utente persistenti con statistiche
- [ ] v2: Chat anonima inter-tavolo
- [ ] v2: Marketplace giochi (gioco portato da un bar all'altro)
- [ ] v2: Stripe per premi a pagamento
- [ ] v2: Resend per notifiche venue admin
