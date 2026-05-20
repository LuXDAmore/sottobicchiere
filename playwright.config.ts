import { fileURLToPath } from 'node:url';

import { defineConfig } from '@playwright/test';

import type { ConfigOptions } from '@nuxt/test-utils/playwright';

process.env.NUXT_BETTER_AUTH_SECRET ??= 'playwright-ready-to-buy-smoke-secret';
process.env.NUXT_TEST_DEV ??= 'true';

export default defineConfig<ConfigOptions>( {
    timeout: 180_000,

    use: {
        nuxt: {
            dev: true,
            // eslint-disable-next-line compat/compat
            rootDir: fileURLToPath( new URL( '.', import.meta.url ) ),
        },
    },
} );
