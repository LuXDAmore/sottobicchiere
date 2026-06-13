<template>
    <div class="flex flex-col h-screen overflow-hidden relative select-none">

        <!-- ROSSO (in alto, ruotato 180° per chi sta di fronte) -->
        <button
            class="flex flex-1 flex-col gap-3 items-center justify-center transition-colors"
            :class="halfClass('red')"
            type="button"
            @pointerdown.prevent="onHalfTap('red')"
        >
            <div class="flex flex-col gap-2 items-center rotate-180 text-white">
                <p class="font-black font-display text-sm tracking-widest uppercase">
                    {{ $t('game.duello.player_red') }}
                </p>
                <p class="font-black font-display text-4xl">
                    {{ halfLabel }}
                </p>
                <p class="font-bold font-display text-2xl">
                    {{ scores.red }} – {{ scores.blue }}
                </p>
            </div>
        </button>

        <!-- BLU (in basso) -->
        <button
            class="flex flex-1 flex-col gap-3 items-center justify-center transition-colors"
            :class="halfClass('blue')"
            type="button"
            @pointerdown.prevent="onHalfTap('blue')"
        >
            <div class="flex flex-col gap-2 items-center text-white">
                <p class="font-black font-display text-sm tracking-widest uppercase">
                    {{ $t('game.duello.player_blue') }}
                </p>
                <p class="font-black font-display text-4xl">
                    {{ halfLabel }}
                </p>
                <p class="font-bold font-display text-2xl">
                    {{ scores.blue }} – {{ scores.red }}
                </p>
            </div>
        </button>

        <!-- Controlli centrali: header minimale + overlay intro/round/match -->
        <div class="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 top-1/2 z-10">

            <!-- Intro -->
            <div
                v-if="phase === 'intro'"
                class="backdrop-blur bg-[var(--ui-bg)]/95 border border-[var(--ui-border)] flex flex-col gap-3 items-center max-w-xs p-5 rounded-2xl shadow-xl text-center"
            >
                <span class="text-3xl">
                    ⚔️
                </span>
                <p class="font-bold font-display text-highlighted text-lg">
                    {{ $t('game.duello.title') }}
                </p>
                <p class="text-muted text-sm">
                    {{ $t('game.duello.intro') }}
                </p>
                <p class="font-medium text-muted text-xs">
                    {{ $t('game.duello.best_of', { n: roundsToWin }) }}
                </p>
                <u-button
                    icon="i-lucide-swords"
                    :label="$t('game.duello.start')"
                    size="lg"
                    @click="startRound"
                />
            </div>

            <!-- Risultato round (non match-point): bottone per proseguire -->
            <div
                v-else-if="phase === 'roundResult'"
                class="backdrop-blur bg-[var(--ui-bg)]/95 border border-[var(--ui-border)] flex flex-col gap-3 items-center max-w-xs p-5 rounded-2xl shadow-xl text-center"
            >
                <p class="font-bold font-display text-highlighted text-lg">
                    {{ $t('game.duello.round_win', { player: roundWinnerLabel }) }}
                </p>
                <p class="font-black font-display text-3xl text-highlighted">
                    {{ scores.red }} – {{ scores.blue }}
                </p>
                <u-button
                    icon="i-lucide-arrow-right"
                    :label="$t('game.duello.next_round')"
                    size="lg"
                    @click="startRound"
                />
            </div>

            <!-- Fine duello -->
            <div
                v-else-if="phase === 'matchResult'"
                class="backdrop-blur bg-[var(--ui-bg)]/95 border border-[var(--ui-border)] flex flex-col gap-3 items-center max-w-xs p-5 rounded-2xl shadow-xl text-center"
            >
                <span class="text-4xl">
                    🏆
                </span>
                <p class="font-bold font-display text-highlighted text-lg">
                    {{ $t('game.duello.match_win', { player: roundWinnerLabel }) }}
                </p>
                <p class="font-black font-display text-3xl text-highlighted">
                    {{ scores.red }} – {{ scores.blue }}
                </p>
                <div class="flex flex-col gap-2 w-full">
                    <u-button
                        block
                        icon="i-lucide-rotate-ccw"
                        :label="$t('game.duello.rematch')"
                        size="lg"
                        @click="resetMatch"
                    />
                    <u-button
                        block
                        color="neutral"
                        icon="i-lucide-arrow-left"
                        :label="$t('game.thumbs.back_lobby')"
                        size="lg"
                        variant="ghost"
                        @click="goBack"
                    />
                </div>
            </div>
        </div>

        <!-- Mini header flottante (regole / invito / uscita), fuori dalle metà tattili -->
        <div class="-translate-x-1/2 absolute flex gap-1 left-1/2 top-2 z-10">
            <u-button
                :aria-label="$t('lobby.game_rules_aria')"
                color="neutral"
                icon="i-lucide-circle-help"
                size="xs"
                @click="rulesOpen = true"
            />
            <u-button
                :aria-label="$t('game.thumbs.back_lobby')"
                color="neutral"
                icon="i-lucide-arrow-left"
                size="xs"
                @click="goBack"
            />
        </div>

        <game-rules-modal v-model:open="rulesOpen" :game="duelloDefinition" />
    </div>
</template>

<script setup lang="ts">

    definePageMeta( { layout: 'game' } );

    type Side = 'blue' | 'red';
    type DuelPhase = 'go' | 'intro' | 'matchResult' | 'roundResult' | 'wait';

    const route = useRoute()
          , localePath = useLocalePath()
          , playerStore = usePlayerStore()
          , { t } = useI18n()

          , { open, close, gameLaunch } = useTableSocket()

          , venueSlug = route.params.venue as string
          , qrToken = route.params.token as string

          , duelloDefinition = getGameDefinition( 'duello' )
          , rulesOpen = ref( false )

          , roundsToWin = 3
          , phase = ref<DuelPhase>( 'intro' )
          , scores = ref<Record<Side, number>>( {
              blue: 0,
              red: 0,
          } )
          , roundWinner = ref<Side | null>( null )

          , roundWinnerLabel = computed( () => ( roundWinner.value === 'red'
              ? t( 'game.duello.player_red' )
              : t( 'game.duello.player_blue' ) ) );

    let goTimer: ReturnType<typeof setTimeout> | null = null;

    /**
     * Colore di sfondo della metà in funzione della fase: verde solo durante "go".
     * Le tonalità scure (error-600/secondary-600) garantiscono contrasto AA con il
     * testo bianco; il vincitore del round è evidenziato con la tinta più accesa.
     * @param side - lato della metà (red/blue).
     */
    function halfClass( side: Side ): string {

        if( phase.value === 'go' ) return 'bg-emerald-600';

        // A round/match finito, evidenzia il vincitore del round con la tinta accesa.
        if( ( phase.value === 'roundResult' || phase.value === 'matchResult' ) && roundWinner.value === side )
            return side === 'red' ? 'bg-error-500' : 'bg-secondary-500';

        return side === 'red' ? 'bg-error-600' : 'bg-secondary-600';

    }

    // Etichetta grande mostrata su entrambe le metà (uguale per i due lati).
    const halfLabel = computed( () => {

        if( phase.value === 'go' ) return t( 'game.duello.tap' );
        if( phase.value === 'wait' ) return t( 'game.duello.wait' );
        return '';

    } );

    /**
     *
     */
    function clearGoTimer() {

        if( goTimer ) {

            clearTimeout( goTimer );
            goTimer = null;

        }

    }

    /**
     * Avvia un round: fase di attesa (rossa) e poi verde dopo un ritardo casuale.
     */
    function startRound() {

        roundWinner.value = null;
        phase.value = 'wait';
        clearGoTimer();

        const delay = 1500 + Math.floor( Math.random() * 3000 );

        goTimer = setTimeout( () => {

            phase.value = 'go';

        }, delay );

    }

    /**
     * Assegna il round a un lato e decide se il duello è finito.
     * @param side - lato vincitore del round.
     */
    function awardRound( side: Side ) {

        clearGoTimer();
        roundWinner.value = side;
        scores.value[ side ] += 1;

        phase.value = scores.value[ side ] >= roundsToWin ? 'matchResult' : 'roundResult';

    }

    /**
     * Tocco su una metà. In attesa è un anticipo (perde chi tocca); al verde
     * vince il primo a toccare (i tocchi successivi sono ignorati perché la fase
     * non è più "go").
     * @param side - lato che ha toccato.
     */
    function onHalfTap( side: Side ) {

        if( phase.value === 'wait' ) {

            // Anticipo: vince l'avversario.
            awardRound( side === 'red' ? 'blue' : 'red' );
            return;

        }

        if( phase.value === 'go' ) awardRound( side );

    }

    /**
     *
     */
    function resetMatch() {

        scores.value = {
            blue: 0,
            red: 0,
        };
        roundWinner.value = null;
        startRound();

    }

    onMounted( () => {

        if( ! playerStore.isJoined || playerStore.isExpired ) {

            navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }` ) );
            return;

        }

        open();

    } );

    onUnmounted( () => {

        clearGoTimer();
        close();

    } );

    // L'host ha lanciato un gioco DIVERSO mentre eravamo qui: seguilo.
    watch( () => gameLaunch.value, signal => {

        if( signal && signal.game !== 'duello' )
            navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/game/${ signal.game }` ) );

    } );

    /**
     *
     */
    function goBack() {

        navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/lobby` ) );

    }

    useHead( { title: computed( () => t( 'game.duello.title' ) ) } );

</script>
