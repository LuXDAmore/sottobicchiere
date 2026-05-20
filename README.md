# Sottobicchiere

Principalmente è una pwa che sarà utilizzata in bar o sale con tavoli diciamo.

Questa idea è tipo quella di creare una serie di giochi da fare fra tutte le persone presenti al tavolo.

C'è un qr code, che ogni persona del tavolo scansiona e viene diciamo inserito in un gruppo (può anche scegliere di non fare parte del gruppo ed essere "solitario" diciamo, quindi per quel tavolo ci sono 2 o più gruppi in quel caso). A questo punto uno ha vari giochi da scegliere (che devo tutti creare ovviamente) e può giocare contro gli altri o insieme agli altri. Ci saranno giochi di ogni tipo, dal preserata dove si beve, al classico gioco da carte o do strategia dove si gioca per sfidarsi. I gestori del locale potranno anche creare sfide per i loro clienti e mettere in premio magari cene o bevande o altro. In futuro mi piacerebbe anche poter per esempio far chattare i tavoli, quindi diciamo da un utente o da un tavolo puoi fare richiesta per pingare un altro tavolo, una volta che l'altro tavolo accetta si può aprire diciamo una chat anonima. La privacy è essenziale, per ora nessun dato viene salvato (se non localmente per il gioco) e il db necessario viene svuotato ogni tot (in futuro si avrà anche la possibilità di creare un proprio account e tenere traccia dei propri progressi). Immagino anche un futuro dove diciamo la parte dei giochi sia un "marketplace" dove magari anche andando in un altro bar, puoi ritrovare il tuo gioco e il tuo profilo salvato con i dati, sempre in futuro. Ogni bar avrà la sua installazione personalizzata in un suo dominio (o sottodomini multipli) dove poi ci sarà la gestione dei tavoli e dei qr code da inserire nei tavoli.

## Stack

- Nuxt 4 SSR, Nitro API routes and Nitro WebSocket.
- Nuxt UI 4, Tailwind CSS 4, Pinia and `@nuxtjs/i18n`.
- NuxtHub with Neon PostgreSQL, Vercel Blob and Vercel Marketplace Redis.
- Better Auth through `@onmax/nuxt-better-auth`, with email/password and Google/LinkedIn OAuth.
- Stripe for deposits and Resend for transactional email.
- Drizzle ORM schema in `server/db/schema.ts`.

## Prerequisites

- Node.js 24.
- pnpm 10.33.3, pinned by `packageManager`.
- `mkcert` for trusted HTTPS on localhost.
- Local `.env` copied from the vercel command `vercel env pull .env`.

Install dependencies:

```bash

    pnpm install

```

## Local Certificate HTTPs

The local dev server runs over HTTPS. Install and trust the local certificate once:

```bash

    winget install mkcert
    mkcert -install
    mkcert -key-file certificates/server.key.pem -cert-file certificates/server.cert.pem localhost 127.0.0.1 ::1

```

Start the app (dev):

```bash
    
    pnpm dev

```

Default local URL:

```text
    
    https://localhost:3000

```

## Database

Database schema changes must start from Drizzle schema files, not manual SQL migrations.

1. Edit `server/db/schema.ts` or another schema file under `server/db/schema/`.
2. Generate migrations with NuxtHub
3. Apply migrations

Never create files manually in `server/db/migrations/`.

Useful scripts:

```bash

    pnpm db:generate
    pnpm db:migrate
    pnpm db:sql

```

## Shared Runtime Utilities

Nuxt shared code lives in `shared/` and is kept framework-neutral so it can be reused by both Vue app code and Nitro server code. Current shared utilities:

Do not import Vue composables, Nitro event helpers or database clients from `shared/`. Keep those in `app/` or `server/` and pass plain data into shared helpers.

## Frontend i18n

All frontend-facing copy must be checked against the configured locales. When adding new visible content, labels, form messages, empty states, notifications, SEO text or page sections, add the matching translations in the i18n resources instead of hardcoding only one language.

Before opening a PR, verify the affected UI in Italian and at least one non-Italian locale, and confirm that no newly added frontend content is missing translations.

The framework used Nuxt UI is accessibility first, it means by default it fix accessibility issue, so You don't have to take care of it.

### Linting and Type Checking

Run quality checks after code or seed changes:

```bash

    pnpm prepare
    pnpm lint
    pnpm typecheck

```

For frontend changes, also verify the affected pages/components in multiple locales and make sure every new visible content string has i18n entries.

## Quality Commands

Use these checks before opening a PR or deploying:

```bash

    pnpm prepare
    pnpm lint
    pnpm typecheck
    pnpm test:unit -- --run
    pnpm test:nuxt
    pnpm test:coverage

```

`pnpm lint` should finish with a clean console before release. Current local status on 2026-05-11: `pnpm prepare`, `pnpm lint` and `pnpm typecheck` exit 0 with no project warnings; only the Node `[DEP0040]` punycode deprecation appears during Nuxt prepare/typecheck and is currently ignored.

For local build validation, run `pnpm build` as a smoke with a 4-minute cutoff. In this project the full build can take more than 10 minutes; if it has not failed within the first 4 minutes, treat the local agent check as non-blocking and stop the process.

In the agent environment only, Vitest may fail during config load with `DataCloneError` from `@nuxt/test-utils`; that error is an environment limitation and should not be counted as a project test failure when the same command passes on the developer machine.

Frontend quality includes i18n coverage: new user-facing text must be added in all supported languages and checked in the UI before release.

## Main Scripts

```bash

    pnpm dev
    pnpm build
    pnpm start
    pnpm generate
    pnpm preview
    pnpm lint
    pnpm lint:fix
    pnpm test
    pnpm test:unit -- --run
    pnpm test:nuxt
    pnpm test:coverage
	
```

## Commit Rules

This repository uses Conventional Commits and commitlint. Commit messages follow:

```text
    
    type(scope?): subject

```

Common types:

```text
    
    feat, fix, docs, chore, ci, test, refactor, perf, build, style, revert

```

Rules:

- Keep commits atomic: one logical change per commit.
- Do not commit unrelated files or broad "misc" changes.
- Prefer short English technical subjects for changelog and release automation.
- Run `pnpm lint` and the relevant tests before committing.
- Keep PR history readable; squash only when the final commit message remains meaningful.

References:

- https://www.conventionalcommits.org/en/about/
- https://github.com/conventional-changelog/commitlint
- https://commitlint.js.org/guides/getting-started.html

## Releases

Versioning and changelog generation use `commit-and-tag-version`:

```bash
    
    pnpm version:patch
    pnpm version:minor
    pnpm version:major

```

## Documentation

Project documentation lives in the `docs/*.{md|doc|docx|pdf}` folder.

## Design

Project design principles, UI/UX guidelines, and visual assets are placed inside the `design/` folder.

## AI Agents and SpecDD

Before working on this project, read "Agents.md" and ".specdd/bootstrap.md".

Assume the role, rules, workflow, and implementation constraints described in SpecDD.
Treat SpecDD specs as source-adjacent development contracts, not optional documentation.
Adhere to SpecDD rules unless explicitly instructed otherwise.
