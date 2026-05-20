// Nuxt
import { defineNuxtConfig } from 'nuxt/config';

// Vite - Plugins
import sbom from 'rollup-plugin-sbom';
import { Mode, plugin as mdPlugin } from 'vite-plugin-markdown';

// Package
import packageJson from './package.json';

const
    COLORS = ( process.env.NUXT_COLORS || '#1f9263,#4d6dab' ).split( ',' )
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
                    lang: 'it',
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
                        content: process.env.NUXT_SITE_DESCRIPTION || 'WeGree — B2B telematic auction marketplace',
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
                title: process.env.NUXT_SITE_NAME || 'WeGree',
                titleTemplate: `%s - ${ process.env.NUXT_SITE_NAME || 'WeGree' }`,
                viewport: 'width=device-width,initial-scale=1',
            },
        },

        appId: 'wegree',

        auth: {
            hubSecondaryStorage: true,
            preserveRedirect: true,
            redirects: {
                authenticated: '/account',
                guest: '/',
                login: '/auth/login',
                logout: '/auth/login',
            },
            schema: {
                casing: 'snake_case',
                usePlural: false,
            },
        },

        colorMode: {
            fallback: 'light',
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
                    200,
                    300,
                    400,
                    500,
                    600,
                    700,
                    800,
                    900,
                ],
            },
            families: [
                {
                    name: 'DM Serif Display',
                    provider: 'google',
                },
                {
                    name: 'Plus Jakarta Sans',
                    provider: 'google',
                },
                {
                    name: 'JetBrains Mono',
                    provider: 'google',
                },
            ],
        },

        future: { compatibilityVersion: 5 },

        htmlValidator: {
            options: {
                rules: {
                    'attribute-allowed-values': 'off',
                    'attribute-misuse': 'off', // ?: Forse da tenere
                    'element-permitted-content': 'off',
                    'heading-level': 'off', // ?: Da tenere
                    'input-missing-label': 'off', // ?: Da valutare se tenerlo
                    'long-title': 'off', // ?: Da tenere
                    'no-redundant-for': 'off', // ?: Da tenere
                    'prefer-native-element': 'off', // ?: Forse da tenere
                    'tel-non-breaking': 'off',
                    'text-content': 'off',
                    'unique-landmark': 'off',
                    'wcag/h32': 'off', // ?: Da tenere
                    'wcag/h71': 'off', // ?: Da tenere
                },
            },
            usePrettier: true,
        },

        hub: {
            blob: { driver: 'vercel-blob' },
            cache: true,
            db: {
                casing: 'snake_case',
                dialect: 'postgresql',
                driver: 'neon-http',
            },
            kv: true,
        },

        /*
        llms: {
            description: process.env.NUXT_SITE_DESCRIPTION,
            domain: process.env.NUXT_SITE_URL,
            full: {
                description: 'Full documentation of the application',
                title: 'Full Documentation',
            },
            // TODO: Finire questa per la documentazione rapida da AI
            sections: [
                {
                    description: 'Section 1 Description',
                    links: [
                        {
                            description: 'Link 1 Description',
                            href: '/link-1',
                            title: 'Link 1',
                        },
                        {
                            description: 'Link 2 Description',
                            href: '/link-2',
                            title: 'Link 2',
                        },
                    ],
                    title: 'Section 1',
                },
            ],
            title: process.env.NUXT_SITE_NAME,
        },
        */

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
                {
                    code: 'de',
                    file: 'de.json',
                    language: 'de-DE',
                    name: 'Deutsch',
                },
                {
                    code: 'fr',
                    file: 'fr.json',
                    language: 'fr-FR',
                    name: 'Français',
                },
                {
                    code: 'es',
                    file: 'es.json',
                    language: 'es-ES',
                    name: 'Español',
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
            '@nuxtjs/seo',
            '@pinia/nuxt',
            'pinia-plugin-persistedstate/nuxt',
            '@nuxthub/core',
            ... isVitest ? [] : [ '@vercel/speed-insights' ],
            ... isVitest ? [] : [ '@onmax/nuxt-better-auth' ],
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
            domains: [ 'blob.vercel-storage.com', 'public.blob.vercel-storage.com' ],
            presets: {
                lot: {
                    modifiers: {
                        width: 800,
                        quality: 80,
                    },
                },
                thumbnail: {
                    modifiers: {
                        width: 200,
                        height: 200,
                        quality: 70,
                    },
                },
            },
        },

        nitro: {
            compressPublicAssets: {
                brotli: true,
                gzip: true,
            },
            experimental: {
                openAPI: true,
                tasks: true,
                websocket: true,
            },
            scheduledTasks: {
                // Every night at 02:30: align Direct Sale machinery catalog (data) from Zucchetti API.
                '30 2 * * *': [ 'zucchetti-nightly-sync' ],
                // Every night at 03:00: sync machinery media from Zucchetti FTP to Vercel Blob.
                '0 3 * * *': [ 'zucchetti-ftp-sync' ],
                // Every hour: flag awarded lots whose payment deadline has elapsed.
                '0 * * * *': [ 'payment-deadline-check' ],
                // Every day at 09:00: dispatch T-3 / T-1 / T0 payment reminder emails.
                '0 9 * * *': [ 'payment-reminders' ],
                // Every hour: dispatch T-24h "event starting soon" reminders to participants with active deposits.
                '15 * * * *': [ 'event-starting-soon' ],
                // Every 4 hours: sync Fallco auctions from wegree.fallcoaste.it.
                '0 */4 * * *': [ 'fallco-sync' ],
                // Every 15 minutes: auto-close expired free_market auctions.
                '*/15 * * * *': [ 'seller-auction-expiry' ],
            },
        },

        ogImage: {
            enabled: ! isVitest,
            zeroRuntime: true,
        },

        piniaPluginPersistedstate: { key: `wegree_${ appEnvironment }_%id` },

        pwa: {
            client: { installPrompt: true },
            includeAssets: [ 'favicon.ico', 'logo-wegree-square.png' ],
            includeManifestIcons: true,
            injectManifest: { minify: true },
            manifest: {
                display: 'standalone',
                name: process.env.NUXT_SITE_NAME,
                short_name: 'WeGree',
                start_url: '/',
                theme_color: PRIMARY_COLOR,
            },
            minify: true,
            registerType: 'autoUpdate',
            workbox: { cleanupOutdatedCaches: true },
        },

        robots: { disallow: [ '/' ] },

        routeRules: {
            '/backoffice/admin/actions': {
                auth: { user: { role: [ 'admin' ] } },
                ssr: false,
            },
            '/account/**': { auth: 'user' },
            '/aste/mobili/**/live': { auth: 'user' },
            '/auth/login': { auth: 'guest' },
            '/auth/register': { auth: 'guest' },
            '/backoffice/**': {
                auth: { user: { role: [ 'admin', 'operator' ] } },
                ssr: false,
            },
        },

        runtimeConfig: {

            // Private (server-side only — never exposed to the client)
            astalegaleWebhookSecret: process.env.ASTALEGALE_WEBHOOK_SECRET || '',
            astalegaleAuctionsEndpoint: process.env.ASTALEGALE_AUCTIONS_ENDPOINT || '',
            astalegaleAuctionDetailEndpoint: process.env.ASTALEGALE_AUCTION_DETAIL_ENDPOINT || '',
            astalegaleRequestTimeoutMs: Number( process.env.ASTALEGALE_REQUEST_TIMEOUT_MS || 10_000 ),

            // Auth
            betterAuthSecret: process.env.BETTER_AUTH_SECRET || process.env.NUXT_BETTER_AUTH_SECRET || '',
            emailVerificationPepper: process.env.EMAIL_VERIFICATION_PEPPER || '',

            // Vercel Blob — media upload (foto lotti, PDF perizie, planimetrie)
            blobReadWriteToken: process.env.BLOB_READ_WRITE_TOKEN || '',

            // Vercel Cron auth
            cronSecret: process.env.CRON_SECRET || '',

            // Demo Auction Seed
            demoAuctionSeedEnabled: process.env.DEMO_AUCTION_SEED_ENABLED === 'true',
            demoAuctionSeedToken: process.env.DEMO_AUCTION_SEED_TOKEN || '',

            // Dev Seed Users
            devSeedUsersEnabled: process.env.DEV_SEED_USERS_ENABLED === 'true',
            devSeedUsersToken: process.env.DEV_SEED_USERS_TOKEN || '',

            // Google OAuth
            googleClientId: process.env.GOOGLE_CLIENT_ID || '',
            googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',

            // LinkedIn OAuth
            linkedinClientId: process.env.LINKEDIN_CLIENT_ID || '',
            linkedinClientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',

            // Fallco crawler
            fallcoBaseUrl: process.env.FALLCO_BASE_URL || '',
            fallcoCrawlDelayMs: Number( process.env.FALLCO_CRAWL_DELAY_MS || 500 ),
            fallcoCrawlTimeoutMs: Number( process.env.FALLCO_CRAWL_TIMEOUT_MS || 30_000 ),

            // Ops Sync
            opsSyncToken: process.env.OPS_SYNC_TOKEN || '',

            // Production Smoke Users
            prodSmokeUsersEnabled: process.env.PROD_SMOKE_USERS_ENABLED === 'true',
            prodSmokeUsersPassword: process.env.PROD_SMOKE_USERS_PASSWORD || '',
            prodSmokeUsersToken: process.env.PROD_SMOKE_USERS_TOKEN || '',

            // Public (safe to expose to the client)
            public: {

                api: { httpsUrl: process.env.NUXT_PUBLIC_OPEN_FETCH_WEGREE_BASE_URL },

                appEnvironment,

                authFeatures: {
                    socialProviders: {
                        google: !! ( process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ),
                        linkedin: !! ( process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET ),
                    },
                },

                company: {
                    address: process.env.COMPANY_ADDRESS || '',
                    email: process.env.COMPANY_EMAIL || 'info@wegree.it',
                    phone: process.env.COMPANY_PHONE || '',
                    registrarNumber: process.env.COMPANY_REGISTRAR_NUMBER || '',
                    vatNumber: process.env.COMPANY_VAT_NUMBER || '',
                },

                portal: {
                    colors: process.env.NUXT_COLORS,
                    description: process.env.NUXT_SITE_DESCRIPTION || 'WeGree — B2B telematic auction marketplace',
                    name: process.env.NUXT_SITE_NAME || 'WeGree',
                    url: process.env.NUXT_SITE_URL,
                    version: packageJson.version,
                },

                stripePublishableKey: process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',

            },

            // Private (continued — after public for alphabetical sort-keys compliance)
            redisUrl: process.env.REDIS_URL || '',
            resendApiKey: process.env.RESEND_API_KEY || '',
            resendFromEmail: process.env.RESEND_FROM_EMAIL || 'WeGree <noreply@wegree.it>',
            stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
            stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',

            // Machinio lead delivery
            machinioLeadEndpoint: process.env.MACHINIO_LEAD_ENDPOINT || '',
            machinioLeadToken: process.env.MACHINIO_LEAD_TOKEN || '',

            // Wire (bonifico) deposit bank details
            wireIban: process.env.WIRE_IBAN || '',
            wireBeneficiary: process.env.WIRE_BENEFICIARY || 'WeGree S.r.l.',

            // Zucchetti API — Direct Sale data sync (configurare con programmatore Zucchetti / Eleonora Passeri)
            zucchettiApiBaseUrl: process.env.ZUCCHETTI_API_BASE_URL || '',
            zucchettiApiKey: process.env.ZUCCHETTI_API_KEY || '',
            zucchettiRequestTimeoutMs: Number( process.env.ZUCCHETTI_REQUEST_TIMEOUT_MS || 10_000 ),
            zucchettiWebhookSecret: process.env.ZUCCHETTI_WEBHOOK_SECRET || '',

            // Zucchetti FTP — Direct Sale media sync (blocked by partner: credenziali non ancora fornite)
            zucchettiMediaFtpHost: process.env.ZUCCHETTI_MEDIA_FTP_HOST || '',
            zucchettiMediaFtpPort: process.env.ZUCCHETTI_MEDIA_FTP_PORT || '21',
            zucchettiMediaFtpUser: process.env.ZUCCHETTI_MEDIA_FTP_USER || '',
            zucchettiMediaFtpPassword: process.env.ZUCCHETTI_MEDIA_FTP_PASSWORD || '',
            zucchettiMediaFtpBasePath: process.env.ZUCCHETTI_MEDIA_FTP_BASE_PATH || '/',

        },

        schemaOrg: {
            identity: {
                type: 'Organization',
                logo: '/logo-wegree-horizontal.svg',
                name: process.env.NUXT_SITE_NAME || 'WeGree',
                url: process.env.NUXT_SITE_URL || 'https://wegree.com',
            },
            minify: true,
            reactive: false,
        },

        site: {
            description: process.env.NUXT_SITE_DESCRIPTION,
            name: process.env.NUXT_SITE_NAME,
            url: process.env.NUXT_SITE_URL,
        },

        sitemap: {
            sitemaps: {
                auctionTypes: { sources: [ '/api/__sitemap__/auction-types' ] },
                categories: { sources: [ '/api/__sitemap__/categories' ] },
                regions: { sources: [ '/api/__sitemap__/regions' ] },
                publicContent: { sources: [ '/api/__sitemap__/public-content' ] },
            },
            zeroRuntime: true,
        },
        ssr: true,

        ui: {
            theme: {
                colors: [
                    'wegree',
                    'primary',
                    'secondary',
                    'navy',
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
                    '@tanstack/vue-table',
                    'zod',
                    'zod/locales',
                    '@internationalized/date',
                    'papaparse',
                ],
            },

            plugins: [ mdPlugin( { mode: [ Mode.MARKDOWN ] } ), sbom() ],
            vue: { template: { compilerOptions: { whitespace: 'condense' } } },
        },

    }
);
