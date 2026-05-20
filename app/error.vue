<template>
    <u-app :locale="it" :toaster="toaster">

        <nuxt-loading-indicator color="oklch(70.4% 0.191 22.216)" />

        <nuxt-layout name="error">

            <u-error
                as="div"
                class="absolute inset-0 m-auto max-w-100 min-h-screen z-20"
                :clear="{
                    color: 'neutral',
                    size: 'xl',
                    icon: 'lucide:arrow-left',
                    class: 'rounded-md',
                    variant: 'subtle',
                    label: 'Torna alla dashboard',
                }"
                :error="error"
                redirect="/"
                :ui="{
                    message: 'text-white text-xl!',
                }"
            />

        </nuxt-layout>

    </u-app>
</template>

<script setup lang="ts">

    // Nuxt - UI
    import { it } from '@nuxt/ui/locale';

    // Third Party - Zod
    import { config } from 'zod';
    import { it as zodLocaleIt } from 'zod/locales';

    // Types
    import type { ToasterProps } from '@nuxt/ui';

    // Types
    import type { NuxtError } from '#app';

    interface Properties {
        error: NuxtError
    }

    defineProps<Properties>();

    // Notifications
    const toaster: ToasterProps = { position: 'bottom-right' };

    useHead( { title: "Ooops! C'è stato un errore" } );

    config( zodLocaleIt() );

</script>
