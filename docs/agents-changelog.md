# Agents Changelog

Log delle sessioni di sviluppo AI significative.
Non modificare CHANGELOG.md — è gestito dagli npm scripts.

---

## 2026-05-21 — Bootstrap documentazione e design system

**Obiettivo**: Ripulire il repository da WeGree, impostare la base documentale e il design system per Sottobicchiere.

### File modificati/creati

**Documentazione**:
- `README.md` — riscritto completamente per Sottobicchiere
- `Agents.md` — aggiornati riferimenti stack da WeGree a Sottobicchiere
- `app.sdd` — riscritto come contratto SpecDD Sottobicchiere
- `.specdd/bootstrap.project.md` — riscritto per regole Sottobicchiere
- `TODO.md` — creata task list MVP con stati SpecDD
- `docs/architecture.md` — creato: architettura sistema, flusso QR→gioco
- `docs/database-schema.md` — creato: schema Drizzle per MVP
- `docs/design.md` — creato: design system "Notte Italiana", palette, tipografia, motion
- `docs/agents-changelog.md` — creato (questo file)

**Configurazione**:
- `package.json` — nome/descrizione/keywords/url aggiornati; rimossi: `better-auth`, `@onmax/nuxt-better-auth`, `stripe`, `@stripe/stripe-js`, `@vue-stripe/vue-stripe`, `resend`, `cheerio`, `papaparse`, `file-saver`, `@types/file-saver`, `@types/papaparse`; rimossi script WeGree-specific
- `nuxt.config.ts` — riscritto: rimossa config WeGree (auth, Stripe, Resend, Zucchetti, routeRules auth); aggiornati font (Fredoka, Nunito, Space Grotesk); semplificata i18n (solo it + en); aggiornato appId, piniaPluginPersistedstate key, pwa config, runtimeConfig
- `.env.example` — aggiornato per Sottobicchiere (rimossi secret WeGree)

**Design system**:
- `app/app.config.ts` — sostituito tema WeGree (verde) con "Notte Italiana" (indigo + violet + amber)
- `app/assets/styles/ui.css` — nuovo design system: palette Stone warm dark, Indigo primary, tipografia Fredoka/Nunito/Space Grotesk, gamification CSS
- `public/manifest.json` — aggiornato: nome, theme_color `#4F46E5`, background_color `#1C1917`

**App**:
- `app/app.vue` — aggiornato colore loading indicator (indigo)
- `app/pages/index.vue` — creata welcome page
- `app/layouts/default.vue` — creato layout principale
- `app/layouts/game.vue` — creato layout in-game full-screen
- `i18n/locales/it.json` — create traduzioni italiane MVP
- `i18n/locales/en.json` — create traduzioni inglesi MVP

**Database**:
- `server/db/schema.ts` — creato schema Drizzle MVP (venues, tables, table_sessions, player_sessions, groups)

### Decisioni tecniche

- **Better Auth / Stripe / Resend**: rimossi dall'MVP, pianificati per v2
- **Stone warm dark vs navy**: scelto Stone per background dark — più accogliente in ambienti bar con luci calde
- **Fredoka vs Syne**: scelto Fredoka per titoli gaming — più leggibile a distanza, più universale per tutte le età
- **colorMode.fallback**: cambiato da `light` a `dark` — la maggior parte dei bar ha ambienti con bassa luminosità
- **i18n semplificato**: solo `it` + `en` per MVP (rimossi de, fr, es)


## 2026-05-24 — Fix tavolo demo e documentazione prodotto

- Fix API `GET /api/[venue]/table/[token]` con fallback per `demo/demo-001` per evitare errore QR invalido in ambiente senza seed DB.
- Fix API `POST /api/[venue]/table/[token]/join` con join demo fallback e session/player temporanei anonimi.
- Fix API `GET /api/[venue]/table/[token]/players` con fallback demo.
- Aggiornata schedulazione cleanup sessioni Nitro a `0 6 * * *` (06:00 UTC).
- Creata `docs/product-foundations.md` con obiettivi prodotto, flussi, modalità (inclusa dating mode), e policy cleanup dati.
- Aggiornato `TODO.md` con task completati e data header.
