<template>
    <div class="flex flex-col gap-10 items-center justify-center min-h-screen px-4 py-16">

        <!-- Hero -->
        <div class="text-center">
            <div
                aria-hidden="true"
                class="bg-primary-500 flex items-center justify-center mb-5 mx-auto rounded-3xl shadow-[var(--shadow-lift)] size-20"
            >
                <u-icon class="size-10 text-white" name="i-lucide-dice-6" />
            </div>

            <h1 class="font-bold font-display text-5xl text-highlighted tracking-tight">
                {{ $t('app.name') }}
            </h1>

            <p class="mt-3 text-lg text-muted max-w-xs mx-auto">
                {{ $t('app.tagline') }}
            </p>
        </div>

        <!-- Feature pills -->
        <div class="flex flex-wrap gap-3 items-center justify-center max-w-sm">
            <span class="flex items-center gap-2 bg-primary-500/10 text-primary-500 px-4 py-2 rounded-full text-sm font-semibold">
                🎲 {{ $t('welcome.feature_board') }}
            </span>
            <span class="flex items-center gap-2 bg-accent-500/10 text-accent-500 px-4 py-2 rounded-full text-sm font-semibold">
                🍹 {{ $t('welcome.feature_preserata') }}
            </span>
            <span class="flex items-center gap-2 bg-secondary-500/10 text-secondary-500 px-4 py-2 rounded-full text-sm font-semibold">
                💌 {{ $t('welcome.feature_dating') }}
            </span>
        </div>

        <!-- Demo CTA -->
        <div class="max-w-xs w-full">
            <u-card :ui="{ body: 'flex flex-col gap-4 p-6' }">
                <div class="text-center">
                    <p class="font-semibold text-highlighted">
                        {{ $t('welcome.scan_title') }}
                    </p>
                    <p class="mt-1 text-muted text-sm">
                        {{ $t('welcome.scan_description') }}
                    </p>
                </div>

                <u-button
                    block
                    color="primary"
                    icon="i-lucide-play"
                    size="xl"
                    :label="$t('welcome.open_demo_table')"
                    :to="demoTablePath"
                />

                <p class="text-center text-muted text-xs">
                    {{ $t('welcome.mobile_qr_hint') }}
                </p>
            </u-card>
        </div>

        <p class="max-w-xs text-center text-muted text-xs">
            <u-icon class="inline-block mr-1 size-3" name="i-lucide-shield-check" />
            {{ $t('welcome.privacy_note') }}
        </p>

    </div>
</template>

<script setup lang="ts">

const { t } = useI18n();
const localePath = useLocalePath();

const demoTablePath = computed( () => localePath( '/demo/table/demo-001' ) );

useHead( {
    title: computed( () => t( 'welcome.page_title' ) ),
    meta: [
        {
            content: computed( () => t( 'app.description' ) ),
            name: 'description',
        },
    ],
} );

</script>
