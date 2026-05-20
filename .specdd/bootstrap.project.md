# SpecDD project specific overrides

This is a Nuxt 4, Nitro, Vue 3, TypeScript, Nuxt UI, NuxtHub, Neon PostgreSQL, Better Auth, Stripe, Resend, Vercel Redis, and Vercel Blob project for the WeGree B2B telematic auction marketplace.

When applying SpecDD in this repository:

1. Resolve `app.sdd` first, then any ancestor `.sdd` files down to the target path.
2. Treat `docs/architecture.md`, `docs/database-schema.md`, `docs/moduli-business-aste.md`, `docs/modulo-mobiliare-flusso-compratore.md`, `docs/cauzioni-stati-flusso.md`, and `docs/glossario-terminologia.md` as product/architecture context when a local spec references them.
3. Keep public auction and realtime behavior pseudonymized; never expose private identity fields in public payloads.
4. Keep Compra Subito/Buy Now out of MVP implementation unless an explicit later spec changes that scope.
5. Do not introduce Supabase as an implementation dependency; the active stack uses Neon PostgreSQL and NuxtHub.
6. Update the relevant `.sdd` file when behavior, ownership, or local tasks change.
7. Follow the repository documentation rule: update `TODO.md` and `docs/agents-changelog.md` in the same PR for meaningful coding/spec sessions.
