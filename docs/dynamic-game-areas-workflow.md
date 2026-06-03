# Workflow & Agenti — Tavoli & Aree di gioco dinamici

> Documento di workflow per la feature **Dynamic Game Areas**.
> Contratto SpecDD associato: [`docs/specs/dynamic-game-areas.feature.sdd`](specs/dynamic-game-areas.feature.sdd).
> Stato: **F1–F5 implementate** — decisioni confermate (§3); modello dati, API stanze, UI
> crea/entra, aree & squadre in lobby e punteggio per squadra nei giochi sono fatti e
> verificati (typecheck/eslint/unit/build). Lo schema è applicato a un Supabase reale e
> verificato a livello API. Resta solo l'**e2e automatico** e la prova interattiva del realtime.

## 1. Visione

Oggi Sottobicchiere funziona così: un **bar (venue)** ha **tavoli** con **QR fisici**;
chi scansiona entra in una **sessione**, sceglie nickname e gruppo, e gioca.

Vogliamo estenderlo perché l'app sia usabile **anche fuori dal bar**:

- A casa per una serata giochi da tavolo.
- Al parco, in spiaggia, al circoletto.
- Da remoto ("tutti a casa propria che usano lo stesso QR/link").

Idea chiave: chiunque può **creare al volo una "stanza" di gioco** e farci aggregare
gli altri (e sé stesso) con **QR + link + codice breve**. Dentro la stanza si possono
definire **aree di gioco** (zone) e **squadre** (Team Blu vs Team Rosso). Dopo,
il flusso è quello già esistente (lobby → gioco → risultati → cleanup).

Tutto resta **anonimo ed effimero** come l'MVP: nessun account, nessun PII, TTL automatico.

## 2. Modello concettuale (proposta)

Riusiamo al massimo lo schema attuale. Una **stanza dinamica = una `venue` ad-hoc con
un solo tavolo generato**: così join, lobby, presence, giochi e cleanup funzionano *gratis*.

```
venue (kind = 'venue'  → bar preimpostato | 'adhoc' → stanza creata al volo)
  └─ table (qr_token + short_code generati per le stanze ad-hoc)
       └─ table_session (effimera, TTL)
            ├─ areas[]        ← NUOVO livello 1: zone (es. "Salotto", "Cucina")
            │     └─ groups[] ← livello 2: squadre (Team Blu vs Rosso) — già esistenti
            └─ player_sessions[]  (ogni player: area_id? + group_id? + nickname)
```

Due livelli, entrambi **opzionali**:

1. **Aree** = zone fisiche/logiche dentro la stanza (nuova entità `areas`).
2. **Squadre** = i `groups` già esistenti (Team Blu vs Rosso).

### Modifiche di schema previste

| Tabella | Modifica |
|---|---|
| `venues` | `kind text default 'venue'` (`venue`\|`adhoc`), `created_by_user_id uuid`, `expires_at timestamptz` |
| `tables` | `short_code text unique`, `created_by_user_id uuid` |
| `areas` *(nuova)* | `id, table_session_id FK, name, color, ordinal, created_at` |
| `player_sessions` | `area_id uuid` FK (nullable, set null) |
| `groups` | invariato (vedi Decisione #1: eventuale `area_id`) |
| pg_cron | estendere il cleanup per rimuovere venue/tavoli `adhoc` scaduti (cascade) |

### Tre forme d'accesso (equivalenti)

- **QR**: codifica il link di join `/{venueSlug}/table/{qr_token}` (render via `nuxt-qrcode`).
- **Link condivisibile**: lo stesso URL, da mandare su WhatsApp/Telegram.
- **Codice breve**: `short_code` (6 caratteri non ambigui) → risolto da `/join` →
  redirect al tavolo.

Il flusso **bar** resta identico: venue `kind='venue'`, tavoli e QR preimpostati.

## 3. Decisioni (confermate dall'Operator, 2026-06-02)

- **#1 — Squadre per-tavolo.** I `groups` (Team Blu/Rosso) valgono per l'intera stanza.
  Niente `groups.area_id` per ora.
- **#2 — Scope del gioco: per-tavolo + punteggio per squadra.** Il "per-area" è rinviato.
- **#3 — TTL stanza ad-hoc: 8h** come `table_session`, senza rinnovo manuale per ora
  (possibile "mantieni viva finché ci sono giocatori online" come iterazione futura).

## 4. Workflow a fasi

Ogni fase ha un *Done when* verificabile (vedi AGENTS.md §4 Goal-Driven Execution).

| Fase | Obiettivo | Done when |
|---|---|---|
| **F0 — Pianificazione** *(questo branch)* | Spec SpecDD + questo workflow + **fix resilienza homepage** | Homepage 200 senza Supabase configurato; spec e workflow committati |
| **F1 — Dati** | Migration (venue ad-hoc, short_code, areas, area_id) + RLS + cron + tipi | `pnpm db:reset` ok; `pnpm db:types` rigenerato; RLS verificata |
| **F2 — API** | `POST /api/rooms`, `GET /api/rooms/resolve`, API aree | Test unit del resolver e anti-collisione code verdi |
| **F3 — UI accesso** | Pagina `/new`, share sheet (QR+link+code), pagina `/join`, CTA homepage | Crea→condividi→join end-to-end in locale |
| **F4 — Aree & squadre** | Aree/squadre in lobby + selezione al join + broadcast | Stato aree live tra due client |
| **F5 — Gioco & rifinitura** | Scope gioco (Decisione #2), i18n, test e2e, docs | E2E "crea→join→gioca" verde; docs allineate |

## 5. Agenti (ruoli di esecuzione)

La feature si presta a essere realizzata da **agenti specializzati** orchestrati per fase.
Ogni agente ha scope, input, output e *done when* chiari; lavora dentro i confini del suo
`.sdd` locale (da creare accanto al codice quando la fase parte).

| Agente | Responsabilità | Scrive in | Done when |
|---|---|---|---|
| **DB/Migration** | Schema, RLS, trigger broadcast aree, estensione pg_cron | `supabase/migrations/` | `db:reset` ok, RLS testata |
| **Types** | Rigenerazione tipi DB + tipi dominio Room/Area | `shared/types/` | `pnpm db:types` pulito, nessun `unknown` |
| **API** | Endpoint Nitro (zod, service role, anti-collisione code) | `server/api/rooms/`, `server/api/.../areas/` | contratti rispettati, unit verdi |
| **Realtime** | Broadcast da DB per aree; coerenza con presence/host | `supabase/migrations/`, `app/composables/` | cambi aree live tra client |
| **Frontend** | Pagine `/new` e `/join`, share sheet, lobby aree/squadre, CTA | `app/pages/`, `app/components/`, `app/stores/` | flusso navigabile e accessibile |
| **i18n** | Chiavi IT/EN per ogni stringa nuova | `i18n/locales/` | parità chiavi IT/EN, nessuna chiave mancante |
| **QA/Test** | Unit (Vitest) + e2e (Playwright) degli scenari della spec | `test/` | tutti gli Scenario coperti, CI verde |
| **Docs** | Allineamento documentazione e changelog | `docs/`, `README.md`, `TODO.md` | doc coerenti col codice nello stesso PR |

> Regola di orchestrazione: gli agenti **DB → Types → API → Realtime** sono in sequenza
> (dipendenze dirette); **Frontend/i18n** partono appena i contratti API sono stabili;
> **QA/Test** e **Docs** chiudono ogni fase. Un agente non tocca file fuori dal proprio
> scope `.sdd` (SpecDD §7 Write authority).

## 6. Privacy & sicurezza (invarianti)

- Nessun account, nessun PII, nessuna geolocalizzazione del giocatore.
- Stanze ad-hoc effimere con TTL e cleanup `pg_cron` (cascade).
- RLS su tutte le tabelle; scrittura solo via API server (service role).
- Short_code non indovinabile a forza bruta utile (spazio ampio + scadenza breve).

## 7. Riferimenti

- Contratto: [`docs/specs/dynamic-game-areas.feature.sdd`](specs/dynamic-game-areas.feature.sdd)
- Architettura: [`docs/architecture.md`](architecture.md)
- Schema DB: [`docs/database-schema.md`](database-schema.md)
- Realtime: [`docs/realtime-supabase.md`](realtime-supabase.md)
- API: [`docs/api-contracts.md`](api-contracts.md)
