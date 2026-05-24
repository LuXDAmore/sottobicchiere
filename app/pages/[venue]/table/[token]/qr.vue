<template>
    <div class="flex flex-col gap-6 items-center justify-center min-h-screen px-4 py-12">

        <!-- Loading -->
        <template v-if="tableInfoStatus === 'pending'">
            <u-icon
                class="animate-spin size-10 text-primary-500"
                name="i-lucide-loader-2"
            />
        </template>

        <!-- Error -->
        <template v-else-if="tableError">
            <div class="max-w-sm text-center w-full">
                <u-icon
                    class="mb-4 size-12 text-error-500"
                    name="i-lucide-qr-code-off"
                />
                <p class="font-bold font-display text-2xl text-highlighted">
                    {{ $t('table.invalid_qr_title') }}
                </p>
                <p class="mt-2 text-muted text-sm">
                    {{ $t('table.invalid_qr_description') }}
                </p>
                <u-button
                    class="mt-4"
                    color="neutral"
                    icon="i-lucide-refresh-cw"
                    :label="$t('lobby.reconnect')"
                    variant="soft"
                    @click="refreshTableInfo"
                />
            </div>
        </template>

        <!-- QR display -->
        <template v-else-if="tableInfo">

            <div class="text-center">
                <p class="font-semibold text-muted text-sm tracking-wide uppercase">
                    {{ tableInfo.venueName }}
                </p>
                <h1 class="font-bold font-display text-3xl text-highlighted">
                    {{ $t('table.table_number', { n: tableInfo.tableNumber }) }}
                </h1>
            </div>

            <!-- QR code — always white bg for scanner compatibility -->
            <div class="bg-white p-5 rounded-3xl shadow-[var(--shadow-lift)]">
                <Qrcode
                    black-color="#111"
                    :height="220"
                    :value="joinUrl"
                    white-color="#fff"
                    :width="220"
                />
            </div>

            <!-- Instruction -->
            <p class="max-w-xs text-center text-muted text-sm">
                {{ $t('table.qr_instruction') }}
            </p>

            <!-- Clickable link -->
            <nuxt-link
                class="break-all font-semibold hover:underline max-w-xs text-center text-primary-500 text-sm"
                :to="localePath(`/${venueSlug}/table/${qrToken}`)"
            >
                {{ $t('table.qr_open_link') }}
            </nuxt-link>

        </template>

    </div>
</template>

<script setup lang="ts">

    const route = useRoute()
          , { t } = useI18n()
          , localePath = useLocalePath()

          , venueSlug = route.params.venue as string
          , qrToken = route.params.token as string

          , {
              data: tableInfo,
              error: tableError,
              status: tableInfoStatus,
              refresh: refreshTableInfo,
          } = await useLazyAsyncData(
              `table-info-${ venueSlug }-${ qrToken }`,
              () => $fetch( `/api/${ venueSlug }/table/${ qrToken }` ),
          )

          , { origin } = useRequestURL()
          , joinUrl = computed( () => `${ origin }/${ venueSlug }/table/${ qrToken }` );

    useHead( {
        title: computed( () =>
            ( tableInfo.value
                ? t( 'table.qr_page_title', { n: tableInfo.value.tableNumber } )
                : t( 'app.name' ) ) ),
    } );

</script>
