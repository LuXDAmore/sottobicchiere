---
description: Verifica completa del progetto - lint, typecheck, unit test, build e parità i18n IT/EN
---

Esegui la verifica completa di Sottobicchiere e riporta un esito sintetico.

## Pipeline (interrompi e diagnostica al primo fallimento)

1. **Lint** — `pnpm lint` (ESLint + Stylelint). Deve uscire 0. I warning sono
   tollerati, ma segnala i warning NUOVI nei file toccati dal branch
   (`git diff main...HEAD --name-only`).
2. **Typecheck** — `pnpm typecheck`. Deve uscire 0.
3. **Unit test** — `pnpm test:unit`. Tutti verdi.
4. **Parità i18n** — confronta le chiavi (flatten ricorsivo) di
   `i18n/locales/it.json` e `i18n/locales/en.json`: devono essere identiche.
   Elenca le chiavi presenti in una sola lingua. Verifica anche che i
   placeholder `{...}` corrispondano tra le due lingue per ogni chiave.
5. **Build** — `pnpm build`. Deve completare senza errori.

## Output

Tabella finale: step → ✅/❌ (+ durata). Se tutto verde, dichiara il branch
verificabile. Se qualcosa fallisce: diagnosi della causa con file:riga e
proposta di fix — NON applicare fix senza conferma, a meno che il fallimento
non sia stato introdotto da questa stessa sessione.
