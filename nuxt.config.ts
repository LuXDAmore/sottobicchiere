// Nuxt
import { defineNuxtConfig } from 'nuxt/config';

// Vite - Plugins
import sbom from 'rollup-plugin-sbom';

// Package
import packageJson from './package.json';

const
    // Colori brand: primario e accento (per personalizzazione per venue in futuro)
    COLORS = ( process.env.NUXT_COLORS || '#4F46E5,#F59E0B' ).split( ',' )
    , [ PRIMARY_COLOR ] = COLORS ?? []
    , appEnvironment = process.env.NUXT_APP_ENV || ( process.env.NUXT_NODE_ENV === 'production' ? 'production' : 'development' )
    , isVitest = process.env.VITEST === 'true'
;

// Nuxt Config
export default defineNuxtConfig(
    {

        app: {
            baseURL: process.env.NUXT_APP_BASE_URL || '/',
            head: {
                htmlAttrs: {
                    'data-v': packageJson.version,
                    translate: 'no',
                },
                link: [
                    {
                        href: '/favicon.ico',
                        rel: 'shortcut icon',
                        type: 'image/x-icon',
                    },
                ],
                meta: [
                    { charset: 'utf-8' },
                    {
                        content: process.env.NUXT_SITE_DESCRIPTION || 'Sottobicchiere — Giochi da tavolo per il tuo locale',
                        name: 'description',
                    },
                    {
                        content: 'yes',
                        name: 'mobile-web-app-capable',
                    },
                    {
                        content: PRIMARY_COLOR,
                        key: 'theme-color-light',
                        media: '(prefers-color-scheme: light)',
                        name: 'theme-color',
                    },
                    {
                        content: PRIMARY_COLOR,
                        key: 'theme-color-dark',
                        media: '(prefers-color-scheme: dark)',
                        name: 'theme-color',
                    },
                    {
                        content: PRIMARY_COLOR,
                        name: 'msapplication-TileColor',
                    },
                    {
                        content: 'default',
                        key: 'status-bar-light',
                        media: '(prefers-color-scheme: light)',
                        name: 'apple-mobile-web-app-status-bar-style',
                    },
                    {
                        content: 'black-translucent',
                        key: 'status-bar-dark',
                        media: '(prefers-color-scheme: dark)',
                        name: 'apple-mobile-web-app-status-bar-style',
                    },
                ],
                title: process.env.NUXT_SITE_NAME || 'Sottobicchiere',
                titleTemplate: `%s - ${ process.env.NUXT_SITE_NAME || 'Sottobicchiere' }`,
                viewport: 'width=device-width,initial-scale=1',
            },
        },

        appId: 'sottobicchiere',

        colorMode: {
            fallback: 'dark',
            preference: 'system',
        },

        compatibilityDate: '2026-03-14',

        css: [ '~/assets/styles/ui.css' ],

        devServer: {
            https: {
                cert: './certificates/server.cert.pem',
                key: './certificates/server.key.pem',
            },
        },

        experimental: {
            nitroAutoImports: true,
            sharedPrerenderData: true,
            typescriptPlugin: true,
        },

        fonts: {
            defaults: {
                styles: [ 'normal', 'italic' ],
                subsets: [ 'latin' ],
                weights: [
                    400,
                    600,
                    700,
                ],
            },
            families: [
                {
                    // Titoli, punteggi, game titles — gaming senza essere cartoon
                    name: 'Fredoka',
                    provider: 'google',
                },
                {
                    // Body UI — arrotondato, leggibilissimo su mobile
                    name: 'Nunito',
                    provider: 'google',
                },
                {
                    // Numeri e room code — tabular numerals
                    name: 'Space Grotesk',
                    provider: 'google',
                },
            ],
        },

        future: { compatibilityVersion: 5 },

        htmlValidator: {
            options: {
                rules: {
                    'attribute-allowed-values': 'off',
                    'attribute-misuse': 'off',
                    'element-permitted-content': 'off',
                    'heading-level': 'off',
                    'input-missing-label': 'off',
                    'long-title': 'off',
                    'no-redundant-for': 'off',
                    'prefer-native-element': 'off',
                    'tel-non-breaking': 'off',
                    'text-content': 'off',
                    'unique-landmark': 'off',
                    'wcag/h32': 'off',
                    'wcag/h71': 'off',
                },
            },
            usePrettier: true,
        },

        i18n: {
            defaultLocale: 'it',
            langDir: 'locales/',
            locales: [
                {
                    code: 'it',
                    file: 'it.json',
                    language: 'it-IT',
                    name: 'Italiano',
                },
                {
                    code: 'en',
                    file: 'en.json',
                    language: 'en-US',
                    name: 'English',
                },
            ],
            strategy: 'prefix_except_default',
        },

        modules: [
            '@nuxt/test-utils/module',
            '@nuxt/eslint',
            '@nuxtjs/html-validator',
            '@vueuse/nuxt',
            '@vueuse/motion/nuxt',
            '@nuxt/image',
            '@nuxt/scripts',
            '@nuxt/fonts',
            '@nuxt/icon',
            '@nuxtjs/mdc',
            '@nuxtjs/i18n',
            '@nuxt/ui',
            'lenis/nuxt',
            'nuxt-security',
            'nuxt-qrcode',
            '@nuxtjs/seo',
            '@pinia/nuxt',
            'pinia-plugin-persistedstate/nuxt',
            '@nuxtjs/supabase',
            ... isVitest ? [] : [ '@vercel/speed-insights' ],
            ... isVitest ? [] : [ '@vite-pwa/nuxt' ],
        ],

        image: {
            quality: 80,
            format: [
                'webp',
                'avif',
                'jpg',
            ],
            screens: {
                xs: 320,
                sm: 640,
                md: 768,
                lg: 1024,
                xl: 1280,
                xxl: 1536,
            },
        },

        nitro: {
            compressPublicAssets: {
                brotli: true,
                gzip: true,
            },
            experimental: {
                openAPI: true,
            },
        },

        ogImage: {
            enabled: ! isVitest,
            zeroRuntime: true,
        },

        piniaPluginPersistedstate: { key: `sottobicchiere_${ appEnvironment }_%id` },

        pwa: {
            client: { installPrompt: true },
            includeAssets: [ 'favicon.ico' ],
            includeManifestIcons: true,
            injectManifest: { minify: true },
            manifest: {
                display: 'standalone',
                name: process.env.NUXT_SITE_NAME || 'Sottobicchiere',
                short_name: 'Sottobicchiere',
                start_url: '/',
                theme_color: PRIMARY_COLOR,
            },
            minify: true,
            registerType: 'autoUpdate',
            workbox: { cleanupOutdatedCaches: true },
        },

        robots: { disallow: [ '/' ] },

        runtimeConfig: {

            // Public (safe to expose)
            public: {

                appEnvironment,

                portal: {
                    colors: process.env.NUXT_COLORS,
                    description: process.env.NUXT_SITE_DESCRIPTION || 'Sottobicchiere — Giochi da tavolo per il tuo locale',
                    name: process.env.NUXT_SITE_NAME || 'Sottobicchiere',
                    url: process.env.NUXT_SITE_URL,
                    version: packageJson.version,
                },

            },

        },

        schemaOrg: {
            identity: {
                type: 'Organization',
                name: process.env.NUXT_SITE_NAME || 'Sottobicchiere',
                url: process.env.NUXT_SITE_URL || 'https://sottobicchiere.app',
            },
            minify: true,
            reactive: false,
        },

        site: {
            description: process.env.NUXT_SITE_DESCRIPTION,
            name: process.env.NUXT_SITE_NAME,
            url: process.env.NUXT_SITE_URL,
        },

        sitemap: { zeroRuntime: true },

        supabase: {
            // Fallback sicuri quando l'ambiente non è ancora configurato.
            // Il plugin server di @nuxtjs/supabase chiama `createServerClient` ad ogni
            // richiesta SSR: con url/key vuoti lancia «URL and Key are required» e manda
            // in 500 OGNI pagina (homepage compresa). Con un placeholder l'app si avvia
            // comunque — le pagine statiche renderizzano e solo le chiamate realtime
            // falliscono (gestite a runtime) finché non si imposta un vero progetto.
            // Con env valide (build o runtime) questi placeholder vengono sovrascritti.
            key: process.env.NUXT_PUBLIC_SUPABASE_KEY || 'placeholder-anon-key',
            // Gestiamo l'autenticazione (anonima) da un plugin: niente redirect a /login.
            redirect: false,
            // Tipi del database tenuti a mano in shared/types: senza questo path il
            // modulo cerca il default `~/types/database.types.ts` (inesistente) e
            // tipa `useSupabaseClient()` come `unknown`.
            types: '~~/shared/types/database.ts',
            url: process.env.NUXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        },

        ui: {
            theme: {
                colors: [
                    'primary',
                    'secondary',
                    'accent',
                    'info',
                    'success',
                    'warning',
                    'error',
                    'neutral',
                ],
            },
        },

        vite: {
            optimizeDeps: {
                include: [
                    '@vue/devtools-core',
                    '@vue/devtools-kit',
                    'zod',
                    'zod/locales',
                    '@internationalized/date',
                ],
            },

            plugins: [ sbom() ],
            vue: { template: { compilerOptions: { whitespace: 'condense' } } },
        },

    }
);
