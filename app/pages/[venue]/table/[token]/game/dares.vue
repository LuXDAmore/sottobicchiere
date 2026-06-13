<template>
    <div class="flex flex-col h-screen overflow-hidden">

        <game-header
            icon="🍸"
            :title="$t('game.dares.title')"
            @back="goBack"
            @rules="rulesOpen = true"
        >
            <template #meta>
                <span v-if="phase === 'card'" class="font-mono text-muted text-sm">
                    {{ $t('game.dares.card_index', { n: index + 1, total: deck.length }) }}
                </span>
            </template>
        </game-header>

        <main class="flex flex-1 flex-col items-center justify-center overflow-y-auto p-6">

            <!-- Intro -->
            <div v-if="phase === 'intro'" class="flex flex-col gap-5 items-center max-w-sm text-center">
                <span class="text-6xl">
                    🍸
                </span>
                <p class="font-bold font-display text-2xl text-highlighted">
                    {{ $t('game.dares.title') }}
                </p>
                <p class="text-muted">
                    {{ $t('game.dares.intro') }}
                </p>
                <u-button
                    icon="i-lucide-shuffle"
                    :label="$t('game.dares.start')"
                    size="xl"
                    @click="start"
                />
                <p class="text-muted text-xs">
                    {{ $t('game.dares.sip_disclaimer') }}
                </p>
            </div>

            <!-- Carta -->
            <div v-else-if="phase === 'card' && currentCard" class="flex flex-col gap-6 items-center max-w-sm w-full">
                <div
                    class="border flex flex-col gap-5 items-center justify-center min-h-[260px] p-6 rounded-3xl text-center w-full"
                    :style="{ borderColor: kindColor(currentCard.kind) + '66', backgroundColor: kindColor(currentCard.kind) + '14' }"
                >
                    <span
                        class="font-bold px-3 py-1 rounded-full text-xs tracking-wide uppercase"
                        :style="{ backgroundColor: kindColor(currentCard.kind) + '22', color: kindColor(currentCard.kind) }"
                    >
                        {{ kindIcon(currentCard.kind) }} {{ $t(`game.dares.kind_${ currentCard.kind }`) }}
                    </span>
                    <p class="font-display font-semibold leading-snug text-2xl text-highlighted">
                        {{ locale === 'it' ? currentCard.text.it : currentCard.text.en }}
                    </p>
                </div>
                <u-button
                    block
                    icon="i-lucide-arrow-right"
                    :label="$t('game.dares.next')"
                    size="xl"
                    trailing
                    @click="next"
                />
            </div>

            <!-- Mazzo finito -->
            <div v-else class="flex flex-col gap-5 items-center max-w-sm text-center">
                <span class="text-6xl">
                    🎉
                </span>
                <p class="font-bold font-display text-highlighted text-xl">
                    {{ $t('game.dares.deck_done') }}
                </p>
                <u-button
                    icon="i-lucide-rotate-ccw"
                    :label="$t('game.dares.restart')"
                    size="xl"
                    @click="start"
                />
            </div>
        </main>

        <game-rules-modal v-model:open="rulesOpen" :game="daresDefinition" />
    </div>
</template>

<script setup lang="ts">

    import type { DareCard, DareKind } from '#shared/utils/party';

    import { PARTY_DARES, shuffle } from '#shared/utils/party';

    definePageMeta( { layout: 'game' } );

    const route = useRoute()
          , localePath = useLocalePath()
          , playerStore = usePlayerStore()
          , { t, locale } = useI18n()

          , { open, close, gameLaunch } = useTableSocket()

          , venueSlug = route.params.venue as string
          , qrToken = route.params.token as string

          , daresDefinition = getGameDefinition( 'dares' )
          , rulesOpen = ref( false )

          , phase = ref<'card' | 'done' | 'intro'>( 'intro' )
          , deck = ref<DareCard[]>( [] )
          , index = ref( 0 )

          , currentCard = computed<DareCard | null>( () => deck.value[ index.value ] ?? null )

          // Colori per tipo carta, allineati alla palette "Notte Italiana".
          // Colori dei token "Notte Italiana" (indigo/amber/violet/pink/emerald).
          , kindColors: Record<DareKind, string> = {
              truth: '#6366F1',
              dare: '#F59E0B',
              rule: '#8B5CF6',
              sip: '#EC4899',
              group: '#10B981',
          }
          , kindIcons: Record<DareKind, string> = {
              truth: '💬',
              dare: '🎯',
              rule: '📜',
              sip: '🥂',
              group: '👥',
          };

    /**
     * @param kind - tipo della carta.
     */
    function kindColor( kind: DareKind ): string {

        return kindColors[ kind ];

    }

    /**
     * @param kind - tipo della carta.
     */
    function kindIcon( kind: DareKind ): string {

        return kindIcons[ kind ];

    }

    /**
     * (Ri)mescola il mazzo e mostra la prima carta.
     */
    function start() {

        deck.value = shuffle( PARTY_DARES );
        index.value = 0;
        phase.value = 'card';

    }

    /**
     * Avanza alla carta successiva; a mazzo esaurito passa alla schermata finale.
     */
    function next() {

        if( index.value + 1 >= deck.value.length ) {

            phase.value = 'done';
            return;

        }

        index.value += 1;

    }

    onMounted( () => {

        if( ! playerStore.isJoined || playerStore.isExpired ) {

            navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }` ) );
            return;

        }

        open();

    } );

    onUnmounted( () => close() );

    // L'host ha lanciato un gioco DIVERSO mentre eravamo qui: seguilo.
    watch( () => gameLaunch.value, signal => {

        if( signal && signal.game !== 'dares' )
            navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/game/${ signal.game }` ) );

    } );

    /**
     *
     */
    function goBack() {

        navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/lobby` ) );

    }

    useHead( { title: computed( () => t( 'game.dares.title' ) ) } );

</script>
