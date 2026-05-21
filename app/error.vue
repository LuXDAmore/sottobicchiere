<template>
    <u-app :locale="uiLocale" :toaster="toaster">

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
                    label: t('error.back'),
                }"
                :error="error"
                :redirect="localePath('/')"
                :ui="{
                    message: 'text-highlighted text-xl!',
                }"
            />

        </nuxt-layout>

    </u-app>
</template>

<script setup lang="ts">

    import { en as enLocale, it as itLocale } from '@nuxt/ui/locale';

    import type { ToasterProps } from '@nuxt/ui';

    import type { NuxtError } from '#app';

    interface Properties {
        error: NuxtError
    }

    defineProps<Properties>();

    const { t, locale } = useI18n()
          , localePath = useLocalePath()
          , uiLocale = computed( () => ( locale.value === 'it' ? itLocale : enLocale ) )
          , toaster: ToasterProps = { position: 'bottom-right' };

    useHead( { title: computed( () => t( 'error.title' ) ) } );

</script>
