// Sottobicchiere — App Config (Nuxt UI v4)
// Palette "Notte Italiana": Indigo primary + Violet secondary + Amber accent
// I token di colore custom sono definiti in app/assets/styles/ui.css.

export default defineAppConfig( {

    ui: {

        badge: { slots: { base: 'font-semibold' } },

        button: { slots: { base: 'font-semibold cursor-pointer transition-transform active:scale-[0.96] min-h-[52px] min-w-[52px]' } },

        card: {
            slots: {
                body: 'sm:p-5',
                root: 'rounded-2xl ring-1 ring-inset ring-neutral-200/60 dark:ring-neutral-700/40 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-md)] transition-shadow duration-300',
            },
        },

        // ── Semantic color mapping ───────────────────────────
        colors: {
            error: 'red',
            info: 'sky',
            neutral: 'stone',
            primary: 'indigo',
            secondary: 'violet',
            success: 'emerald',
            warning: 'amber',
        },

        formField: {
            slots: {
                error: 'text-error text-xs',
                help: 'text-muted text-xs',
                label: 'font-semibold text-toned text-sm',
            },
        },

        // ── Icon set ────────────────────────────────────────
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

        link: { base: 'transition-colors hover:text-primary-500' },

        select: { slots: { base: 'focus:ring-2 focus:ring-primary-500/30' } },

        selectMenu: { slots: { base: 'focus:ring-2 focus:ring-primary-500/30' } },

        textarea: { slots: { base: 'focus:ring-2 focus:ring-primary-500/30' } },

    },

} );
