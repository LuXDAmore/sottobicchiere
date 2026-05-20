// WeGree — App Config (Nuxt UI v4)
// Le palette (wegree, navy) sono definite in ui.css via @theme static.

export default defineAppConfig( {

    ui: {

        // ── Semantic color mapping ───────────────────────────
        authForm: {
            slots: {
                base: 'space-y-4',
                description: 'text-muted text-sm',
                footer: 'text-center text-muted text-sm',
                title: 'text-highlighted',
            },
        },

        badge: { slots: { base: 'font-semibold' } },

        button: { slots: { base: 'font-semibold tracking-tight cursor-pointer transition-transform active:scale-[0.97]' } },

        card: {
            slots: {
                body: 'sm:p-5',
                root: 'rounded-2xl ring-1 ring-inset ring-neutral-200/70 dark:ring-neutral-800/70 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-md)] transition-shadow duration-300',
            },
        },

        colors: {
            error: 'red',
            info: 'sky',
            neutral: 'wegree-gray',
            primary: 'wegree',
            secondary: 'navy',
            success: 'wegree',
            warning: 'amber',
        },

        formField: {
            slots: {
                error: 'text-error text-xs',
                help: 'text-muted text-xs',
                label: 'font-semibold text-toned text-sm',
            },
        },

        // ── Component-level overrides (sintassi Nuxt UI v4) ──
        icons: {
            check: 'i-lucide-check',
            chevron: 'i-lucide-chevron-down',
            close: 'i-lucide-x',
            external: 'i-lucide-arrow-up-right',
            loading: 'i-lucide-loader-circle',
            menu: 'i-lucide-menu',
            search: 'i-lucide-search',
        },

        input: { slots: { base: 'rounded-xl focus:ring-2 focus:ring-primary-500/30' } },

        link: {
            // primary maps to wegree (see colors above), so this equals hover:text-wegree-600
            base: 'transition-colors hover:text-primary-600',
        },

        pageCard: { slots: { root: 'ring-1 ring-inset ring-default shadow-sm' } },

        select: { slots: { base: 'focus:ring-2 focus:ring-primary-500/30' } },

        selectMenu: { slots: { base: 'focus:ring-2 focus:ring-primary-500/30' } },

        table: {
            slots: {
                tbody: 'divide-y divide-neutral-100 dark:divide-neutral-800',
                td: 'px-4 py-3',
                th: 'font-semibold px-4 py-3 text-left text-slate-400 text-xs tracking-wide uppercase',
                thead: 'bg-neutral-50 dark:bg-neutral-900',
                tr: 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors duration-150',
            },
        },

        textarea: { slots: { base: 'focus:ring-2 focus:ring-primary-500/30' } },

    },

} );
