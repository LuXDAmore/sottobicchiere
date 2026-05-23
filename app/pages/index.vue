<template>
    <div class="flex flex-col gap-8 items-center justify-center min-h-screen px-4 py-12">

        <div class="text-center">
            <div
                aria-hidden="true"
                class="bg-primary-500 flex items-center justify-center mb-4 mx-auto rounded-3xl shadow-[var(--shadow-lift)] size-20"
            >
                <u-icon class="size-10 text-white" name="i-lucide-dice-6" />
            </div>

            <h1 class="font-bold font-display text-5xl text-highlighted">
                {{ $t('app.name') }}
            </h1>

            <p class="mt-2 text-lg text-muted">
                {{ $t('app.tagline') }}
            </p>
        </div>

        <div class="max-w-sm text-center w-full">
            <u-card class="p-2" :ui="{ body: 'flex flex-col items-center gap-4 p-6' }">
                <div class="bg-white p-4 rounded-2xl shadow-[var(--shadow-lift)]">
                    <Qrcode :height="180" :value="demoJoinUrl" :width="180" black-color="#111" white-color="#fff" />
                </div>

                <div>
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
                    :to="localePath('/demo/table/demo-001')"
                />

                <p class="text-muted text-xs">
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
const { origin } = useRequestURL();

const demoJoinUrl = computed(() => `${origin}/demo/table/demo-001`);

useHead({
    title: computed(() => t('welcome.page_title')),
    meta: [
        {
            content: computed(() => t('app.description')),
            name: 'description',
        },
    ],
});

</script>
