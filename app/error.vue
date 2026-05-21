<template>
    <u-app :locale="it" :toaster="toaster">

        <nuxt-loading-indicator color="oklch(0.5602 0.2295 264.05)" />

        <nuxt-layout>

            <u-error
                as="div"
                class="absolute inset-0 m-auto max-w-100 min-h-screen z-20"
                :clear="{
                    color: 'neutral',
                    size: 'xl',
                    icon: 'lucide:arrow-left',
                    class: 'rounded-md',
                    variant: 'subtle',
                    label: 'Torna alla home',
                }"
                :error="error"
                redirect="/"
                :ui="{
                    message: 'text-highlighted text-xl!',
                }"
            />

        </nuxt-layout>

    </u-app>
</template>

<script setup lang="ts">

    // Nuxt - UI
    import { it } from '@nuxt/ui/locale';

    // Types
    import type { ToasterProps } from '@nuxt/ui';

    import type { NuxtError } from '#app';

    interface Properties {
        error: NuxtError
    }

    defineProps<Properties>();

    const toaster: ToasterProps = { position: 'bottom-right' };

    useHead( { title: "Oops! C'è stato un errore" } );

</script>
