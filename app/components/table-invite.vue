<template>
    <u-slideover
        v-model:open="isOpen"
        :description="$t('invite.description')"
        side="bottom"
        :title="$t('invite.title')"
        :ui="{ content: 'rounded-t-3xl' }"
    >

        <!-- Trigger: lo fornisce la pagina (icona in header, CTA in attesa, ecc.) -->
        <slot />

        <template #body>
            <div class="flex flex-col gap-5 items-center max-w-sm mx-auto pb-2 w-full">

                <!-- QR — always white bg for scanner compatibility -->
                <div class="bg-white p-4 rounded-3xl shadow-[var(--shadow-lift)]">
                    <qrcode
                        black-color="#111"
                        :height="170"
                        :value="joinUrl"
                        white-color="#fff"
                        :width="170"
                    />
                </div>
                <p class="max-w-xs text-center text-muted text-sm">
                    {{ $t('invite.qr_hint') }}
                </p>

                <div class="space-y-4 w-full">

                    <!-- Codice breve (solo tavoli ad-hoc creati da /new) -->
                    <div v-if="shortCode">
                        <p class="font-semibold mb-2 text-highlighted text-sm">
                            {{ $t('room.share_code_label') }}
                        </p>
                        <div class="flex gap-2 items-center">
                            <span class="bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] flex-1 font-bold font-mono py-3 rounded-xl text-2xl text-center text-highlighted tracking-[0.3em]">
                                {{ shortCode }}
                            </span>
                            <u-button
                                :aria-label="$t('room.copy_code')"
                                color="neutral"
                                icon="i-lucide-copy"
                                size="xl"
                                variant="soft"
                                @click="copyText(shortCode)"
                            />
                        </div>
                    </div>

                    <!-- Link -->
                    <div>
                        <p class="font-semibold mb-2 text-highlighted text-sm">
                            {{ $t('room.share_link_label') }}
                        </p>
                        <div class="flex gap-2 items-center">
                            <span class="bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] break-all flex-1 px-3 py-3 rounded-xl text-muted text-xs">
                                {{ joinUrl }}
                            </span>
                            <u-button
                                :aria-label="$t('room.copy_link')"
                                color="neutral"
                                icon="i-lucide-copy"
                                size="xl"
                                variant="soft"
                                @click="copyText(joinUrl)"
                            />
                        </div>
                    </div>

                    <u-button
                        v-if="isShareSupported"
                        block
                        color="primary"
                        icon="i-lucide-share-2"
                        :label="$t('invite.share_native')"
                        size="xl"
                        @click="shareInvite"
                    />

                </div>

            </div>
        </template>

    </u-slideover>
</template>

<script setup lang="ts">

    const route = useRoute()
          , { t } = useI18n()
          , playerStore = usePlayerStore()
          , localePath = useLocalePath()
          , toast = useToast()
          , { copy } = useClipboard()
          , { isSupported: isShareSupported, share } = useShare()
          , { origin } = useRequestURL()

          // Route come fonte primaria (il componente vive sulle pagine del tavolo),
          // store come fallback per usi futuri fuori da quelle rotte.
          , venueSlug = ( route.params.venue as string | undefined ) ?? playerStore.venueSlug ?? ''
          , qrToken = ( route.params.token as string | undefined ) ?? playerStore.qrToken ?? ''

          // Link con prefisso lingua di chi invita, come in new.vue.
          , joinUrl = `${ origin }${ localePath( `/${ venueSlug }/table/${ qrToken }` ) }`

          , isOpen = ref( false )

          // Il codice breve non è nello store: fetch pigro alla prima apertura,
          // con la stessa chiave della pagina di join per condividere la cache.
          , {
              data: tableInfo,
              execute: fetchTableInfo,
              status: tableInfoStatus,
          } = useLazyAsyncData(
              `table-info-${ venueSlug }-${ qrToken }`,
              () => $fetch( `/api/${ venueSlug }/table/${ qrToken }` ),
              { immediate: false },
          )

          , shortCode = computed( () => tableInfo.value?.shortCode ?? null );

    watch( isOpen, opened => {

        // 'error' incluso: alla riapertura si ritenta il fetch del codice breve.
        // QR e link non dipendono dal fetch e restano comunque visibili.
        if( opened && ( tableInfoStatus.value === 'idle' || tableInfoStatus.value === 'error' ) ) fetchTableInfo();

    } );

    /**
     *
     * @param value
     */
    async function copyText( value: string ) {

        await copy( value );
        toast.add( {
            color: 'success',
            description: t( 'room.copied_toast' ),
            duration: 1500,
            icon: 'i-lucide-check',
        } );

    }

    /**
     *
     */
    async function shareInvite() {

        try {

            await share( {
                text: t( 'invite.share_text', { venue: playerStore.venueName ?? t( 'app.name' ) } ),
                title: t( 'app.name' ),
                url: joinUrl,
            } );

        } catch{

            // Condivisione annullata dall'utente: nessun errore da mostrare.

        }

    }

</script>
