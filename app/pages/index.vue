<template>
    <div class="flex flex-col gap-8 items-center justify-center min-h-screen px-4 py-12">

        <!-- Logo / Brand -->
        <div class="text-center">
            <div
                aria-hidden="true"
                class="bg-primary-500 flex items-center justify-center mb-4 mx-auto rounded-3xl shadow-[var(--shadow-lift)] size-20"
            >
                <u-icon
                    class="size-10 text-white"
                    name="i-lucide-dice-6"
                />
            </div>

            <h1 class="font-bold font-display text-5xl text-highlighted">
                {{ $t('app.name') }}
            </h1>

            <p class="mt-2 text-lg text-muted">
                {{ $t('app.tagline') }}
            </p>
        </div>

        <!-- CTA Scan QR -->
        <div class="max-w-sm text-center w-full">
            <u-card
                class="p-2"
                :ui="{ body: 'flex flex-col items-center gap-4 p-6' }"
            >

                <u-icon
                    class="size-16 text-primary-500"
                    name="i-lucide-qr-code"
                />

                <div>
                    <p class="font-semibold text-highlighted">
                        {{ $t('welcome.scan_title') }}
                    </p>
                    <p class="mt-1 text-muted text-sm">
                        {{ $t('welcome.scan_description') }}
                    </p>
                </div>

            </u-card>
        </div>

        <!-- Privacy note -->
        <p class="max-w-xs text-center text-muted text-xs">
            <u-icon
                class="inline-block mr-1 size-3"
                name="i-lucide-shield-check"
            />
            {{ $t('welcome.privacy_note') }}
        </p>

    </div>
</template>

<script setup lang="ts">

    const { t } = useI18n();

    useHead( {
        title: t( 'welcome.page_title' ),
        meta: [
            {
                content: t( 'app.description' ),
                name: 'description',
            },
        ],
    } );

</script>
