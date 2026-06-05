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

            <p class="max-w-xs mt-3 mx-auto text-lg text-muted">
                {{ $t('app.tagline') }}
            </p>
        </div>

        <!-- Feature pills -->
        <div class="flex flex-wrap gap-3 items-center justify-center max-w-sm">
            <span class="bg-primary-500/10 flex font-semibold gap-2 items-center px-4 py-2 rounded-full text-primary-500 text-sm">
                🎲 {{ $t('welcome.feature_board') }}
            </span>
            <span class="bg-accent-500/10 flex font-semibold gap-2 items-center px-4 py-2 rounded-full text-accent-500 text-sm">
                🍹 {{ $t('welcome.feature_preserata') }}
            </span>
            <span class="bg-secondary-500/10 flex font-semibold gap-2 items-center px-4 py-2 rounded-full text-secondary-500 text-sm">
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
                    :label="$t('welcome.open_demo_table')"
                    size="xl"
                    :to="demoTablePath"
                />

                <p class="text-center text-muted text-xs">
                    {{ $t('welcome.mobile_qr_hint') }}
                </p>
            </u-card>
        </div>

        <!-- Separator -->
        <div class="flex gap-3 items-center max-w-xs w-full">
            <div class="bg-[var(--ui-border)] flex-1 h-px" />
            <p class="shrink-0 text-muted text-xs tracking-wide uppercase">
                {{ $t('welcome.or_separator') }}
            </p>
            <div class="bg-[var(--ui-border)] flex-1 h-px" />
        </div>

        <!-- Create dynamic table CTA -->
        <div class="max-w-xs w-full">
            <u-card :ui="{ body: 'flex flex-col gap-4 p-6' }">
                <div class="text-center">
                    <p class="font-semibold text-highlighted">
                        {{ $t('welcome.create_room_title') }}
                    </p>
                    <p class="mt-1 text-muted text-sm">
                        {{ $t('welcome.create_room_description') }}
                    </p>
                </div>

                <u-button
                    block
                    color="primary"
                    icon="i-lucide-plus-circle"
                    :label="$t('welcome.create_room_cta')"
                    size="xl"
                    :to="newRoomPath"
                    variant="solid"
                />

                <u-button
                    block
                    color="neutral"
                    icon="i-lucide-keyboard"
                    :label="$t('welcome.join_code_cta')"
                    size="xl"
                    :to="joinCodePath"
                    variant="subtle"
                />
            </u-card>
        </div>

        <p class="max-w-xs text-center text-muted text-xs">
            <u-icon class="inline-block mr-1 size-3" name="i-lucide-shield-check" />
            {{ $t('welcome.privacy_note') }}
        </p>

    </div>
</template>

<script setup lang="ts">

    const { t } = useI18n()
          , localePath = useLocalePath()

          , demoTablePath = computed( () => localePath( '/demo/table/demo-001' ) )
          , newRoomPath = computed( () => localePath( '/new' ) )
          , joinCodePath = computed( () => localePath( '/join' ) );

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
