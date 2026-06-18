# Production Audit — Sottobicchiere (Nuxt + Supabase)

> Checklist viva delle cose trovate durante l'audit di produzione (Nuxt + backend
> Supabase). Ogni voce ha un ID stabile. Legenda: `[x]` fatto · `[~]` parziale ·
> `[ ]` da fare (azione umana/infra o rinviato per scelta). Severità: 🔴 bloccante ·
> 🟠 alta · 🟡 media · 🔵 edge/future-proof.
>
> Aggiornato: 2026-06-17 · Branch: `claude/nuxt-production-audit-r9b6xw` · PR #34

## Stato implementazione (2026-06-17)

Smarcati in questa sessione: **B1, B2, B3, M1, M2, M3, M5, M7, M8, E1, E6, E8**
(M3/M6/M7 parziali). Restano azioni **umane/infra** (B4, valore prod di B1) o **scelte
deliberate** (B5 indicizzazione pre-go-live) e **rinvii motivati** (E2, E3, E4, E5, E7).

Tutto verificato verde: `typecheck` · `test:unit` (71/71, +6 sul dating) · `build` di
produzione · `eslint` (0 errori).

---

## 🔴 Bloccanti

- [x] **B1 — Limiti per-IP incompatibili con lo scenario "locale".**
  - **Fatto (Nuxt):** `nuxt-security.rateLimiter: false` in `nuxt.config.ts` — eliminato il
    rate limiter in-memory globale per-IP (generava 429 collettivi a un intero locale dietro
    NAT, ed era inefficace su Vercel serverless). I limiti che contano restano applicativi (DB)
    sul dating + rate-limit anonimo di Supabase.
  - **Fatto (Supabase):** `config.toml` → `anonymous_users` 30 → **150** (con nota: è un tetto
    per-locale, non per-utente).
  - **[ ] Resta umano/infra:** replicare `anonymous_users` in Dashboard → Auth → Rate Limits;
    per venue ad altissimo traffico valutare CAPTCHA e/o un rate limiter all'edge con driver
    condiviso (non in-memory).

## 🟠 Alti

- [x] **B2 — `bootstrap_all.sql` incompleto.** Aggiunto `scripts/build-bootstrap-sql.mjs`
  (generatore deterministico) e rigenerato il file da **tutte** le 11 migration (ora include
  `games.turn_state`, FK `votes.player_id`, indici). Non più editabile a mano → niente drift.

- [x] **B3 — `nuxt-security` ereditato dai default.** Aggiunto blocco `security: {}` esplicito:
  `rateLimiter: false` (B1) e `xssValidator: false` (rifiutava testo legittimo di chat/nickname;
  l'output è escapato da Vue e gli input validati da Zod). CSP/headers lasciati ai default del
  modulo in modo consapevole (la CSP non-strict non blocca il WSS realtime).

- [ ] **B4 — CI GitHub Actions mai eseguita.** **Azione umana:** abilitare in Settings → Actions
  e ottenere un run verde. I guard-rail sono pronti e cablati: aggiunto il job CI `db-bootstrap`
  (`db:bootstrap:check`, anti-drift del bootstrap, non serve un DB); `db:types:check` disponibile
  per uno step con DB.

- [ ] **B5 — Indicizzazione bloccata.** **Scelta deliberata pre-go-live** (QA): NON va riabilitata
  ora. Al go-live: Site Config `indexable` + rimuovere il blocco da `public/_robots.txt`.

## 🟡 Medi

- [x] **M1 — JWT 1h vs sessione 8h.** **Verificato non problematico:** supabase-js
  (`_handleTokenChanged`) chiama `realtime.setAuth(token)` su `TOKEN_REFRESHED`/`SIGNED_IN`,
  quindi l'auth del channel si rinnova da sola. Nessun codice da aggiungere.

- [x] **M2 — Cleanup 1/giorno → orario.** Migration `20260617120000`: cron a `0 * * * *`.
  Ritenzione post-scadenza da ~24h a ~1h.

- [~] **M3 — Moderazione dating.** **Fatto:** blacklist ampliata + blocco link (anti-spam/phishing)
  + unit test (`test/unit/dating.test.ts`). **Resta:** la i18n dei messaggi d'errore è un tema
  *trasversale* (tutta l'API server ritorna stringhe IT): localizzare solo il dating sarebbe
  incoerente → da affrontare come pattern unico (mappatura code→i18n lato client).

- [x] **M4 — Ritenzione `dating_messages`.** Mitigato da M2: con cleanup orario i messaggi delle
  sessioni scadute spariscono entro ~1h (prima ~24h). Un TTL dedicato più aggressivo
  cancellerebbe la chat di sessioni ancora attive → non desiderabile.

- [x] **M5 — Osservabilità server.** Aggiunto `server/plugins/error-logger.ts`: logga i 5xx con
  metodo/path/status via `consola` (sopravvive a `removeLoggers`). Primo livello, niente nuove
  dipendenze; un error tracker (Sentry) resta in roadmap.

- [~] **M6 — Copertura test.** **Fatto:** test della moderazione dating. **Resta:** test
  d'integrazione su API route/RLS/realtime + e2e Playwright (sforzo ampio, da pianificare).

- [~] **M7 — PWA.** **Fatto:** manifest arricchito (`lang`/`description`/`categories`). **Resta:**
  manifest davvero per-locale (limite di @vite-pwa, serve più lavoro) e rigenerazione icone raster
  dal SVG (richiede l'asset generator a build-time).

- [x] **M8 — db types a mano.** Aggiunti `db:types:check` (diff schema↔tipi) e `db:bootstrap:check`
  (anti-drift del bootstrap) come guard-rail per la CI (attivi quando B4 sarà abilitato).

## 🔵 Edge case / Future-proof

- [x] **E1 — Label gioco grezza in lobby.** Il banner mostra l'etichetta i18n (`selectedGameLabel`).

- [ ] **E2 — `leave` non riallinea `games.host_player_id`.** **Rinviato:** working-as-intended,
  la rielezione passa da `/session/claim-host`; toccarla cambierebbe la semantica di host-election
  per una finestra di incoerenza già coperta dal fallback client. Basso valore, rischio non nullo.

- [ ] **E3 — Lock join durante partita attiva.** **Rinviato (feature roadmap "Now"):** richiede una
  UX spettatore/attesa, non un fix puntuale.

- [ ] **E4 — Semantica `duello`/`word-blitz`.** **Rinviato:** decisione di prodotto (categoria
  "device" o flusso dedicato).

- [ ] **E5 — Dispatch engine hardcoded `thumbs`.** **Rinviato:** astrazione speculativa finché non
  arriva un 2° gioco realtime con engine server (coerente con "no abstractions speculative").

- [x] **E6 — `games.phase` senza CHECK.** Migration `20260617120000`: `check (phase in
  ('voting','reveal','finished','turn'))`.

- [ ] **E7 — Costo RLS realtime per-messaggio.** **Solo monitoraggio:** EXISTS indicizzato su
  `user_id`; nessuna azione finché non emerge un problema di scala.

- [x] **E8 — `bootstrap_all.sql` doppia fonte di verità.** Ora generato (B2) + `db:bootstrap:check`
  in CI per impedire la divergenza.

---

## Cosa resta prima del go-live

1. **B4** — abilitare GitHub Actions (umano) e far girare la CI verde.
2. **B1 (prod)** — impostare `anonymous_users` in Dashboard Supabase; valutare CAPTCHA/edge limiter.
3. **B5** — riabilitare l'indicizzazione al lancio.
4. **M6** — test d'integrazione su API/RLS/realtime.
5. Roadmap: M3 (i18n errori server), M7 (icone/manifest per-locale), E3 (spettatore), E5 (engine dispatch).
