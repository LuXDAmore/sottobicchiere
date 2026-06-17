# Production Audit — Sottobicchiere (Nuxt + Supabase)

> Checklist viva delle cose trovate durante l'audit di produzione (Nuxt + backend
> Supabase). Da smarcare pian piano. Ogni voce ha un ID stabile per riferirla nei
> commit/PR. Severità: 🔴 bloccante · 🟠 alta · 🟡 media · 🔵 edge/future-proof.
>
> Aggiornato: 2026-06-17 · Branch: `claude/nuxt-production-audit-r9b6xw`

## Esito verifiche tecniche (questo ambiente)

- ✅ `pnpm install` · `typecheck` (0 errori) · `test:unit` (65/65) · `build` di produzione
- ✅ Parità i18n IT/EN (267/267)
- ✅ Nessun `TODO/FIXME` o `console.log` residuo nel sorgente
- ✅ Flussi Nuxt↔Supabase coerenti: join · select→launch · thumbs realtime · giochi a
  turni · dating · aree · elezione host (schema ↔ endpoint ↔ trigger ↔ client allineati)
- ✅ Boundary di sicurezza solido: RLS deny-all + channel realtime privati,
  service-role solo server, anti-impersonificazione (`user_id`), anti-spoofing presence
- ✅ `NUXT_SUPABASE_SECRET_KEY` corretto (allineato a `@nuxtjs/supabase` v2, verificato nel modulo)
- ✅ CSP di default di `nuxt-security` **non** blocca il WSS realtime (nessun `connect-src`/`default-src` nel preset non-strict)

---

## 🔴 Bloccanti

- [ ] **B1 — Limiti per-IP incompatibili con lo scenario "locale".** In un bar tutti i
      telefoni escono dallo stesso IP pubblico (NAT del WiFi); due limiti per-IP lo
      penalizzano:
  - **Supabase** `supabase/config.toml` → `anonymous_users = 30`: accessi anonimi per
    ora per IP. >30 clienti/ora in un locale → `signInAnonymously()` fallisce (401) e il
    nuovo utente non entra.
  - **Nuxt** `nuxt-security` registrato senza config in `nuxt.config.ts`: rate limiter
    globale **attivo di default** = 150 req / 5 min per IP, driver `lruCache` in-memory.
    Falsi positivi (tutti i tavoli del locale condividono il budget → `429` collettivi) e
    protezione inefficace su Vercel serverless (memoria per-lambda, non condivisa, azzerata
    a cold start). Solo `/__nuxt_hints/**` è escluso di default.
  - **Fix:** alzare/parametrizzare `anonymous_users` (valutare captcha o sign-in lato
    server per venue ad alto traffico); configurare esplicitamente `security.rateLimiter`
    (driver condiviso es. Upstash/Redis, oppure disattivarlo affidandosi al rate-limit DB
    del dating) con soglie consapevoli che "1 IP = 1 locale".

## 🟠 Alti

- [ ] **B2 — `supabase/bootstrap_all.sql` incompleto (drift di schema).** Lo snapshot
      "incolla in SQL Editor → Run" è fermo a `20260603090000_harden_function_grants.sql`:
      **mancano** `20260611090000_games_host_player_index`, `20260613120000_indexes_and_votes_fk`
      e **`20260614120000_turn_based_games` (colonna `games.turn_state`)**. Un DB inizializzato
      con questo file **non ha `turn_state`** → `game/turn/start` e `game/turn/advance`
      (categorie/dares) falliscono a runtime; mancano anche la FK `votes.player_id` e gli indici.
      **Fix:** rigenerare `bootstrap_all.sql` dalle migration (preferibilmente in CI) o rimuoverlo
      e lasciare `db:push` come unica via. Vedi anche E8.

- [ ] **B3 — `nuxt-security` ereditato dai default, non configurato.** `xssValidator` è
      attivo su GET e POST con `throwError`: i body delle POST (nickname, **messaggi dating**,
      nomi gruppo/area) possono ricevere `400` su input legittimi con caratteri "sospetti".
      Anche CSP/headers/CORS/COEP sono ereditati senza verifica esplicita.
      **Fix:** dichiarare un blocco `security: {…}` esplicito (xssValidator mirato/whitelist sulle
      route di testo, CSP rivista, rateLimiter di B1) e testare end-to-end con input reali.

- [ ] **B4 — CI GitHub Actions mai eseguita.** I workflow CI/Security risultano attivi ma con
      0 run nella storia del repo (`TODO.md:127`): lint/typecheck/build/test non sono mai stati
      verificati in pipeline. **Fix:** abilitare Actions e ottenere almeno un run verde pre-go-live.

- [ ] **B5 — Indicizzazione bloccata mentre SEO è configurato.** `robots: { disallow: ['/'] }`
      in `nuxt.config.ts` + `public/_robots.txt` bloccano tutti i crawler, ma `@nuxtjs/seo`
      (sitemap/schema-org/og-image) è attivo (scelta QA voluta, `TODO.md:129`).
      **Fix:** riabilitare l'indicizzazione al go-live (Site Config `indexable`).

## 🟡 Medi

- [ ] **M1 — JWT anonimo 1h vs sessione 8h.** `config.toml` → `jwt_expiry = 3600`, ma le
      `table_sessions` durano 8h. Per una serata lunga il token va rinnovato via refresh: se il
      realtime non recepisce il nuovo token, dopo ~1h il channel privato può perdere
      l'autorizzazione. **Fix:** verificare il refresh token sul realtime in una sessione >1h
      (test dedicato) e, se serve, forzare `realtime.setAuth()` sul refresh.

- [ ] **M2 — Cleanup pg_cron 1 volta/giorno (06:00 UTC) vs TTL 8h.** Sessioni scadute e
      dati correlati (`games`/`votes`/`dating_messages`) restano fino a ~24h+. Funzionalmente
      innocuo (le query filtrano `expires_at > now()`), ma accumula dati effimeri e indebolisce
      la promessa "privacy-first". **Fix:** schedulare il cleanup ogni ora.

- [ ] **M3 — Moderazione dating simbolica + errori non i18n.** `server/utils/dating.ts`:
      blacklist di 3 parole solo IT, nessun anti-link/PII; i motivi di rifiuto sono stringhe IT
      hardcoded mostrate anche all'utente EN. **Fix:** filtro più robusto + chiavi i18n per gli errori.

- [ ] **M4 — `dating_messages` ritenuti a lungo.** Cancellati solo per cascade alla scadenza
      della sessione (~24h+). Contenuto utente in chiaro conservato oltre il necessario.
      **Fix:** includere i messaggi nel cleanup (es. TTL breve dedicato).

- [ ] **M5 — Nessuna osservabilità server.** Nessun error tracking (Sentry/simili) né logging
      strutturato sulle API: i `createError(500)` spariscono nei log Vercel grezzi. **Fix:** aggiungere
      error tracking + log strutturato sulle route critiche.

- [ ] **M6 — Copertura test solo su logica pura.** 65 unit test ok, ma `test/nuxt` e `test/e2e`
      sono vuoti: l'intero livello autoritativo (endpoint, RLS, broadcast) è verificato solo da
      script live manuali. **Fix:** test d'integrazione su join/vote/claim-host/dating + e2e Playwright.

- [ ] **M7 — PWA monolingue + icone raster.** `manifest.lang: it` anche su `/en/`, icone raster
      ereditate da rigenerare (`TODO.md:131,201`). **Fix:** manifest per-locale + rigenerare icone dal SVG.

- [ ] **M8 — `shared/types/database.ts` mantenuto a mano.** Rischio drift schema↔tipi.
      **Fix:** check `db:types` in CI (diff fallisce la build se i tipi sono disallineati).

## 🔵 Edge case / Future-proof

- [ ] **E1 — Banner "partita in corso" mostra l'id grezzo del gioco** invece dell'etichetta
      i18n (`lobby.vue:338` → `{{ gameSelection.selectedGame }}`).

- [ ] **E2 — `leave` non riallinea `games.host_player_id`.** Quando l'host esce, azzera solo
      `table_sessions.host_player_id`; la riga `games` resta col vecchio host fino al successivo
      `claim-host`. Coperto dal fallback client `isHost`, ma è una finestra di incoerenza.

- [ ] **E3 — Lock join durante partita attiva.** Chi entra a partita in corso viene trascinato
      e (in thumbs) può votare pur non essendo in `scores`/`total_count` iniziale; manca una UX
      "spettatore/attendi prossima partita" (`TODO.md:163,202`).

- [ ] **E4 — `duello`/`word-blitz` bloccano la sessione senza stato server condiviso.** Sono
      giochi non-`solo` (categoria `both`/`preserata`) quindi passano da `game/select` (lock +
      broadcast) e trascinano tutti i device, ma `duello` è "2 su 1 device" e `word-blitz` è un
      prototipo locale: nessuna riga `games`. Coerenza semantica da rivedere (es. categoria
      "device" o flusso dedicato).

- [ ] **E5 — Dispatch motore di gioco hardcoded.** `game/start.post.ts` assume `thumbs`: debito
      dichiarato, da sciogliere all'arrivo del 2° gioco realtime con engine server.

- [ ] **E6 — `games.phase` senza CHECK constraint.** I giochi a turni usano `phase='turn'` (non
      previsto dal commento `voting|reveal|finished`). Funziona, ma un typo non verrebbe intercettato.
      **Fix:** valutare un CHECK constraint allineato a tutte le fasi reali.

- [ ] **E7 — RLS realtime: EXISTS per-messaggio su `player_sessions`.** Le policy su
      `realtime.messages` valutano un EXISTS a ogni messaggio (indicizzato su `user_id`):
      monitorare il costo a scala.

- [ ] **E8 — `bootstrap_all.sql` è una seconda fonte di verità dello schema.** Anche una volta
      riallineato (B2), duplica le migration e può ridivergere. **Fix:** generarlo in CI dalle
      migration, oppure rimuoverlo.

---

## Priorità consigliata verso il go-live

1. **B1** (limiti per-IP) — è ciò che rompe l'uso reale in un locale.
2. **B2** (bootstrap_all / `turn_state`) + **B3** (config esplicita `nuxt-security`).
3. **B4** (CI verde) + **B5** (indicizzazione al lancio).
4. **M1** (token 1h su serate lunghe) + **M2** (cleanup orario).
5. **M5/M6** (osservabilità + test d'integrazione) e il resto in coda.
