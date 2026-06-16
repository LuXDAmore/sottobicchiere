<template>
    <div class="flex flex-col h-screen overflow-hidden">

        <game-header
            icon="🗂️"
            :title="$t('game.categorie.title')"
            @back="goBack"
            @rules="rulesOpen = true"
        />

        <connection-status-banner :status="status" @reconnect="reconnect()" />

        <main class="flex flex-1 flex-col items-center justify-center overflow-y-auto p-6">

            <!-- In attesa che l'host avvii il gioco a turni -->
            <template v-if="! turnState">
                <div class="flex flex-col gap-6 items-center max-w-sm text-center">
                    <span class="text-6xl">
                        🗂️
                    </span>
                    <p class="font-bold font-display text-2xl text-highlighted">
                        {{ $t('game.categorie.title') }}
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
                </div>
            </template>

            <!-- Gioco a turni in corso -->
            <template v-else>
                <div class="flex flex-col gap-8 items-center max-w-sm w-full">

                    <!-- Categoria condivisa -->
                    <div class="text-center">
                        <p class="font-semibold mb-2 text-muted text-sm tracking-wide uppercase">
                            {{ $t('game.categorie.category_heading') }}
                        </p>
                        <p class="font-bold font-display leading-tight text-4xl text-highlighted">
                            {{ categoryText }}
                        </p>
                    </div>

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

                    <!-- È il mio turno: timer + azioni -->
                    <template v-if="isMyTurn">
                        <div class="w-full">
                            <u-progress
                                :color="timerColor"
                                :max="turnDuration"
                                :model-value="remaining"
                                size="lg"
                            />
                            <p class="font-mono mt-2 text-center text-muted text-sm">
                                {{ secondsLeft }}s
                            </p>
                        </div>

                        <p v-if="timeUp" class="font-semibold text-error-500">
                            {{ $t('game.categorie.time_up') }}
                        </p>
                        <p v-else class="text-center text-muted text-sm">
                            {{ $t('game.categorie.your_turn_hint') }}
                        </p>

                        <u-button
                            block
                            :disabled="isAdvancing || status !== 'OPEN'"
                            icon="i-lucide-arrow-right"
                            :label="$t('game.categorie.pass')"
                            :loading="isAdvancing"
                            size="xl"
                            trailing
                            @click="pass"
                        />
                        <u-button
                            color="neutral"
                            :disabled="isAdvancing"
                            icon="i-lucide-shuffle"
                            :label="$t('game.categorie.new_category')"
                            size="sm"
                            variant="ghost"
                            @click="newCategory"
                        />
                    </template>

                    <!-- Non è il mio turno: guardo e aspetto -->
                    <template v-else>
                        <p class="text-center text-muted">
                            {{ $t('game.categorie.waiting_hint') }}
                        </p>
                        <u-button
                            v-if="isHost"
                            color="neutral"
                            :disabled="isAdvancing"
                            :label="$t('game.categorie.pass')"
                            size="sm"
                            variant="soft"
                            @click="pass"
                        />
                    </template>

                </div>
            </template>
        </main>

        <game-rules-modal v-model:open="rulesOpen" :game="categorieDefinition" />
    </div>
</template>

<script setup lang="ts">

    import type { LocalizedText } from '#shared/utils/party';

    definePageMeta( { layout: 'game' } );

    // Istante di scadenza del turno corrente (performance.now() + durata).
    let endTime = 0;

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

          , categorieDefinition = getGameDefinition( 'categorie' )
          , minPlayers = categorieDefinition?.minPlayers ?? 2
          , rulesOpen = ref( false )

          , isStarting = ref( false )
          , isAdvancing = ref( false )
          , timeUp = ref( false )

          , turnDuration = 8000
          , remaining = ref( turnDuration )

          , isMyTurn = computed( () => turnState.value?.currentPlayerId === playerStore.playerId )
          , currentPlayer = computed( () => players.value.find( p => p.id === turnState.value?.currentPlayerId ) ?? null )
          , currentNickname = computed( () => currentPlayer.value?.nickname ?? '…' )
          , currentColor = computed( () => currentPlayer.value?.color ?? '#6366F1' )
          , category = computed<LocalizedText | null>( () => ( turnState.value?.prompt as LocalizedText | null ) ?? null )
          , categoryText = computed( () => ( category.value ? ( locale.value === 'it' ? category.value.it : category.value.en ) : '' ) )
          , secondsLeft = computed( () => Math.ceil( remaining.value / 1000 ) )
          , timerColor = computed<'error' | 'success' | 'warning'>( () => {

              const ratio = remaining.value / turnDuration;

              if( ratio > 0.5 ) return 'success';
              if( ratio > 0.25 ) return 'warning';
              return 'error';

          } )

          // Tick a 100ms guidato da performance.now(): il residuo è la differenza reale
          // dalla scadenza, non deriva quando il browser sospende i timer.
          , { pause, resume } = useIntervalFn( () => {

              remaining.value = Math.max( 0, Math.round( endTime - performance.now() ) );
              if( remaining.value <= 0 ) {

                  pause();
                  timeUp.value = true;

              }

          }, 100, { immediate: false } );

    /**
     * Arma il timer del turno corrente.
     */
    function armTimer() {

        endTime = performance.now() + turnDuration;
        remaining.value = turnDuration;
        timeUp.value = false;
        resume();

    }

    // Quando tocca a me, o cambia il turno, o cambio categoria (deckIndex), arma il
    // timer; altrimenti spegnilo.
    watch( () => [ isMyTurn.value, turnState.value?.turnIndex, turnState.value?.deckIndex ], () => {

        if( isMyTurn.value ) armTimer();
        else {

            pause();
            timeUp.value = false;

        }

    } );

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
     * Passa al giocatore successivo (stessa categoria).
     */
    async function pass() {

        if( isAdvancing.value || status.value !== 'OPEN' ) return;
        isAdvancing.value = true;
        await advanceTurn( 'next' );
        isAdvancing.value = false;

    }

    /**
     * Cambia categoria senza cambiare il turno.
     */
    async function newCategory() {

        if( isAdvancing.value || status.value !== 'OPEN' ) return;
        isAdvancing.value = true;
        await advanceTurn( 'newPrompt' );
        isAdvancing.value = false;

    }

    onMounted( () => {

        if( ! playerStore.isJoined || playerStore.isExpired ) {

            navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }` ) );
            return;

        }
        open();

    } );

    onUnmounted( () => {

        pause();
        close();

    } );

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

        if( signal && signal.game !== 'categorie' )
            navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/game/${ signal.game }` ) );

    } );

    // L'host ha terminato il gioco a turni (sessione sbloccata, selected_game → null):
    // i giochi a turni non hanno una fase "finished" con podio, quindi torniamo in
    // lobby invece di restare appesi sulla schermata d'attesa. Solo sulla transizione
    // verso null (non al mount iniziale), così un refresh a gioco attivo non rimbalza.
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

    useHead( { title: computed( () => t( 'game.categorie.title' ) ) } );

</script>
