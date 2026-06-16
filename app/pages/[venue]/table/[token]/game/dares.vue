<template>
    <div class="flex flex-col h-screen overflow-hidden">

        <game-header
            icon="🍸"
            :title="$t('game.dares.title')"
            @back="goBack"
            @rules="rulesOpen = true"
        />

        <connection-status-banner :status="status" @reconnect="reconnect()" />

        <main class="flex flex-1 flex-col items-center justify-center overflow-y-auto p-6">

            <!-- In attesa che l'host avvii il gioco a turni -->
            <template v-if="! turnState">
                <div class="flex flex-col gap-6 items-center max-w-sm text-center">
                    <span class="text-6xl">
                        🍸
                    </span>
                    <p class="font-bold font-display text-2xl text-highlighted">
                        {{ $t('game.dares.title') }}
                    </p>

                    <div v-if="players.length > 0" class="flex flex-wrap gap-2 justify-center">
                        <player-pill
                            v-for="player in players"
                            :key="player.id"
                            :color="player.color"
                            :nickname="player.nickname"
                            :you="player.id === playerStore.playerId"
                        />
                    </div>

                    <template v-if="isHost">
                        <u-button
                            v-if="players.length >= minPlayers"
                            :disabled="isStarting || status !== 'OPEN'"
                            icon="i-lucide-play"
                            :label="$t('game.turn.start_button')"
                            :loading="isStarting"
                            size="xl"
                            @click="handleStart"
                        />
                        <div v-else class="flex flex-col gap-3 items-center">
                            <p class="text-muted text-sm">
                                {{ $t('game.turn.need_players', { n: minPlayers }) }}
                            </p>
                            <table-invite>
                                <u-button
                                    color="primary"
                                    icon="i-lucide-user-plus"
                                    :label="$t('invite.waiting_cta')"
                                    size="lg"
                                    variant="soft"
                                />
                            </table-invite>
                        </div>
                    </template>
                    <p v-else class="text-muted">
                        {{ $t('game.turn.waiting_host') }}
                    </p>
                    <p class="text-muted text-xs">
                        {{ $t('game.dares.sip_disclaimer') }}
                    </p>
                </div>
            </template>

            <!-- Gioco a turni in corso -->
            <template v-else>
                <div class="flex flex-col gap-6 items-center max-w-sm w-full">

                    <!-- Di chi è il turno -->
                    <div
                        class="flex gap-2 items-center px-4 py-2 rounded-full"
                        :style="{ backgroundColor: currentColor + '22' }"
                    >
                        <span class="block rounded-full size-2.5" :style="{ backgroundColor: currentColor }" />
                        <span class="font-semibold" :style="{ color: currentColor }">
                            {{ isMyTurn ? $t('game.turn.your_turn') : $t('game.turn.others_turn', { name: currentNickname }) }}
                        </span>
                    </div>

                    <!-- Carta condivisa -->
                    <div
                        v-if="card"
                        class="border flex flex-col gap-5 items-center justify-center min-h-[260px] p-6 rounded-3xl text-center w-full"
                        :style="{ borderColor: kindColor(card.kind) + '66', backgroundColor: kindColor(card.kind) + '14' }"
                    >
                        <span
                            class="font-bold px-3 py-1 rounded-full text-xs tracking-wide uppercase"
                            :style="{ backgroundColor: kindColor(card.kind) + '22', color: kindColor(card.kind) }"
                        >
                            {{ kindIcon(card.kind) }} {{ $t(`game.dares.kind_${ card.kind }`) }}
                        </span>
                        <p class="font-display font-semibold leading-snug text-2xl text-highlighted">
                            {{ locale === 'it' ? card.text.it : card.text.en }}
                        </p>
                    </div>

                    <!-- È il mio turno: eseguo e passo -->
                    <template v-if="isMyTurn">
                        <p class="text-center text-muted text-sm">
                            {{ $t('game.dares.your_turn_hint') }}
                        </p>
                        <u-button
                            block
                            :disabled="isAdvancing || status !== 'OPEN'"
                            icon="i-lucide-arrow-right"
                            :label="$t('game.dares.done_button')"
                            :loading="isAdvancing"
                            size="xl"
                            trailing
                            @click="pass"
                        />
                    </template>

                    <!-- Non è il mio turno: guardo e aspetto -->
                    <template v-else>
                        <p class="text-center text-muted">
                            {{ $t('game.dares.waiting_hint') }}
                        </p>
                        <u-button
                            v-if="isHost"
                            color="neutral"
                            :disabled="isAdvancing"
                            :label="$t('game.dares.done_button')"
                            size="sm"
                            variant="soft"
                            @click="pass"
                        />
                    </template>

                </div>
            </template>
        </main>

        <game-rules-modal v-model:open="rulesOpen" :game="daresDefinition" />
    </div>
</template>

<script setup lang="ts">

    import type { DareCard, DareKind } from '#shared/utils/party';

    definePageMeta( { layout: 'game' } );

    const route = useRoute()
          , localePath = useLocalePath()
          , playerStore = usePlayerStore()
          , toast = useToast()
          , { t, locale } = useI18n()

          , {
              players, turnState, gameSelection, gameLaunch, status, open, close, reconnect, isHost, startTurnGame, advanceTurn, wsError,
          } = useTableSocket()

          , venueSlug = route.params.venue as string
          , qrToken = route.params.token as string

          , daresDefinition = getGameDefinition( 'dares' )
          , minPlayers = daresDefinition?.minPlayers ?? 2
          , rulesOpen = ref( false )

          , isStarting = ref( false )
          , isAdvancing = ref( false )

          , isMyTurn = computed( () => turnState.value?.currentPlayerId === playerStore.playerId )
          , currentPlayer = computed( () => players.value.find( p => p.id === turnState.value?.currentPlayerId ) ?? null )
          , currentNickname = computed( () => currentPlayer.value?.nickname ?? '…' )
          , currentColor = computed( () => currentPlayer.value?.color ?? '#6366F1' )
          , card = computed<DareCard | null>( () => ( turnState.value?.prompt as DareCard | null ) ?? null )

          // Colori e icone per tipo carta, allineati alla palette "Notte Italiana".
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
     * Avvia il gioco a turni (solo host).
     */
    async function handleStart() {

        if( isStarting.value || status.value !== 'OPEN' ) return;
        isStarting.value = true;
        await startTurnGame();
        isStarting.value = false;

    }

    /**
     * Esegui la carta e passa al giocatore successivo (nuova carta).
     */
    async function pass() {

        if( isAdvancing.value || status.value !== 'OPEN' ) return;
        isAdvancing.value = true;
        await advanceTurn( 'next' );
        isAdvancing.value = false;

    }

    onMounted( () => {

        if( ! playerStore.isJoined || playerStore.isExpired ) {

            navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }` ) );
            return;

        }
        open();

    } );

    onUnmounted( () => close() );

    watch( wsError, error => {

        if( error ) {

            isStarting.value = false;
            isAdvancing.value = false;
            toast.add( {
                color: 'error',
                description: error,
                duration: 4000,
            } );
            wsError.value = null;

        }

    } );

    // L'host ha lanciato un gioco DIVERSO mentre eravamo qui: seguilo.
    watch( () => gameLaunch.value, signal => {

        if( signal && signal.game !== 'dares' )
            navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/game/${ signal.game }` ) );

    } );

    // L'host ha terminato il gioco a turni (sessione sbloccata, selected_game → null):
    // torna in lobby invece di restare appesi sulla schermata d'attesa. Solo sulla
    // transizione verso null, così un refresh a gioco attivo non rimbalza.
    watch( () => gameSelection.value.selectedGame, ( game, previous ) => {

        if( ! game && previous )
            navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/lobby` ) );

    } );

    /**
     *
     */
    function goBack() {

        navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/lobby` ) );

    }

    useHead( { title: computed( () => t( 'game.dares.title' ) ) } );

</script>
