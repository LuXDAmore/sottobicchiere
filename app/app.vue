<template>
    <u-app :toaster="toaster">

        <nuxt-loading-indicator color="oklch(0.5602 0.2295 264.05)" />

        <nuxt-pwa-assets />
        <nuxt-announcer />
        <nuxt-route-announcer />

        <nuxt-layout>
            <nuxt-page />
        </nuxt-layout>

    </u-app>
</template>

<script setup lang="ts">

    // Types
    import type { ToasterProps } from '@nuxt/ui';

    const
        // Route
        route = useRoute()
        // Runtime Config
        , { public: { portal: { name } } } = useRuntimeConfig()
        // Notifications
        , toaster: ToasterProps = { position: 'bottom-right' }
    ;

    useHead( { titleTemplate: () => `${ route.meta?.title || name } — %s` } );

</script>
