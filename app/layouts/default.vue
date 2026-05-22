<template>
    <div class="flex flex-col min-h-screen">

        <header class="backdrop-blur-md bg-[var(--ui-bg)]/80 border-b border-default sticky top-0 z-50">
            <div class="flex h-14 items-center justify-between max-w-2xl mx-auto px-4">

                <!-- Logo -->
                <nuxt-link
                    :aria-label="$t('app.name')"
                    class="flex font-bold font-display gap-2 items-center text-highlighted text-xl"
                    :to="localePath('/')"
                >
                    <u-icon
                        class="size-6 text-primary-500"
                        name="i-lucide-dice-6"
                    />
                    <span>{{ $t('app.name') }}</span>
                </nuxt-link>

                <!-- Controls -->
                <div class="flex gap-2 items-center">

                    <!-- Language switcher -->
                    <u-button
                        v-for="locale in locales"
                        :key="locale.code"
                        :aria-label="locale.name"
                        color="neutral"
                        :label="locale.code.toUpperCase()"
                        size="xs"
                        :variant="currentLocale === locale.code ? 'soft' : 'ghost'"
                        @click="setLocale(locale.code)"
                    />

                    <!-- Dark/light toggle -->
                    <u-button
                        :aria-label="$t('layout.toggle_theme')"
                        color="neutral"
                        :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
                        size="sm"
                        variant="ghost"
                        @click="toggleColorMode"
                    />

                </div>

            </div>
        </header>

        <main class="flex-1">
            <slot />
        </main>

    </div>
</template>

<script setup lang="ts">

    const colorMode = useColorMode()
          , { locale: currentLocale, locales, setLocale } = useI18n()
          , localePath = useLocalePath()

          , isDark = computed( () => colorMode.value === 'dark' );

    /**
     *
     */
    function toggleColorMode() {

        colorMode.preference = isDark.value ? 'light' : 'dark';

    }

</script>
