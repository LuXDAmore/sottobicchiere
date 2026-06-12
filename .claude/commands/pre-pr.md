---
description: Workflow completo pre-PR - verifica tecnica, review del codice, audit design system, audit dati e allineamento documentazione
---

Prepara il branch corrente all'apertura di un PR per Sottobicchiere,
orchestrando gli agenti verticali del progetto. Procedi in quest'ordine:

## 1. Verifica tecnica

Esegui il workflow `/verifica` (lint, typecheck, unit test, parità i18n,
build). Se fallisce, fermati: prima si sistema, poi si riparte dal punto 1.

## 2. Review parallele del diff (`git diff main...HEAD`)

Lancia in parallelo gli agenti pertinenti al perimetro del diff:

- **code-reviewer** — sempre.
- **design-system-guardian** — se il diff tocca file `.vue` o `app/assets/`.
- **supabase-guardian** — se il diff tocca `supabase/`, `server/` o
  `shared/types/database.ts`.
- **test-author** — se il diff aggiunge logica in `shared/utils/` o
  `server/utils/` senza test corrispondenti, fagli scrivere i test mancanti.

## 3. Triage dei finding

- 🔴 bloccanti: correggili e torna al punto 1.
- 🟡 importanti: correggi quelli a basso rischio; elenca gli altri nel corpo
  del PR come follow-up consapevoli.
- ⚪ nit: applica solo se banali, altrimenti ignora.

## 4. Documentazione

Lancia l'agente **docs-curator** per allineare `TODO.md`,
`docs/agents-changelog.md`, le spec `.sdd` e `docs/` al diff.

## 5. Chiusura

1. Commit con messaggio convenzionale in italiano (il repo usa commitlint).
2. Push del branch e apertura del PR in **draft**, con: riepilogo delle
   modifiche, esito della verifica (punto 1), finding 🟡 rimandati, istruzioni
   di test manuale se servono.
