# SpecDD — regole specifiche di progetto per Sottobicchiere

Questo è un progetto Nuxt 4, Nitro, Vue 3, TypeScript, Nuxt UI, e Supabase
(Postgres + Realtime + auth anonima), con deploy su Vercel.
Sottobicchiere è una PWA gaming per bar e locali con tavoli.

Quando si applica SpecDD in questo repository:

1. Risolvere `app.sdd` prima, poi ogni file `.sdd` discendente verso il path target.
2. Trattare `docs/architecture.md`, `docs/database-schema.md`, e `docs/design.md`
   come contesto di prodotto/architettura quando una spec locale li referenzia.
3. Mantenere i dati dei giocatori anonimi e temporanei:
   nessun campo PII in payload pubblici o realtime; sessioni con TTL automatico.
4. Non introdurre autenticazione utente persistente (login, OAuth, account permanenti)
   nell'MVP; si usa solo l'accesso anonimo Supabase. Auth completa pianificata per v2.
5. Non introdurre pagamenti (Stripe) o email transazionali (Resend) nell'MVP.
6. Lo stack dati attivo è Supabase (Postgres + Realtime + auth anonima): migration SQL
   native in `supabase/migrations/`, accesso server via service role, RLS su tutte le tabelle.
7. Aggiornare il relevant file `.sdd` quando behavior, ownership, o task locali cambiano.
8. Seguire la documentation rule: aggiornare `TODO.md` e `docs/agents-changelog.md`
   nello stesso PR di ogni sessione di coding significativa.
