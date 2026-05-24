<template>
    <div class="flex flex-col h-screen overflow-hidden">

        <!-- Header -->
        <header class="border-[var(--ui-border)] border-b flex items-center justify-between px-4 py-3 shrink-0">
            <div class="flex gap-2 items-center">
                <span class="text-2xl">
                    👍
                </span>
                <p class="font-bold font-display text-highlighted">
                    {{ $t('game.thumbs.title') }}
                </p>
            </div>

            <div class="flex gap-3 items-center">
                <span
                    v-if="gameState"
                    class="font-mono text-muted text-sm"
                >
                    {{ gameState.roundIndex + 1 }}/{{ gameState.totalRounds }}
                </span>
                <div
                    class="flex gap-2 h-8 items-center px-3 rounded-full text-xs"
                    :style="{ backgroundColor: (playerStore.playerColor ?? '#6366F1') + '22', color: playerStore.playerColor ?? '#6366F1' }"
                >
                    <span
                        class="block rounded-full size-2"
                        :style="{ backgroundColor: playerStore.playerColor ?? 'currentColor' }"
                    />
                    {{ playerStore.playerNickname }}
                </div>
            </div>
        </header>

        <!-- WebSocket status banner -->
        <div
            v-if="status !== 'OPEN'"
            class="flex flex-col gap-2 items-center justify-center py-2 shrink-0 text-sm"
            :class="status === 'CONNECTING' ? 'bg-amber-500/10 text-amber-500' : 'bg-error-500/10 text-error-500'"
        >
            <div class="flex gap-2 items-center">
                <u-icon
                    class="size-4"
                    :class="status !== 'CLOSED' ? 'animate-spin' : ''"
                    name="i-lucide-loader-2"
                />
                {{ status === 'CONNECTING' ? $t('lobby.connecting') : $t('lobby.disconnected') }}
            </div>
            <u-button
                v-if="status === 'CLOSED'"
                color="neutral"
                icon="i-lucide-refresh-cw"
                :label="$t('lobby.reconnect')"
                size="xs"
                variant="ghost"
                @click="open()"
            />
        </div>

        <!-- Main -->
        <main class="flex flex-1 flex-col items-center justify-between overflow-y-auto px-4 py-6">

            <!-- Waiting for game to start -->
            <template v-if="! gameState">
                <div class="flex flex-1 flex-col gap-6 items-center justify-center">
                    <div class="text-center">
                        <p class="font-bold font-display mb-2 text-3xl text-highlighted">
                            {{ $t('game.thumbs.waiting_title') }}
                        </p>
                        <p class="text-muted">
                            {{ $t('game.thumbs.waiting_description') }}
                        </p>
                    </div>

                    <!-- Players preview -->
                    <div class="flex flex-wrap gap-2 justify-center max-w-xs">
                        <div
                            v-for="player in players"
                            :key="player.id"
                            class="flex gap-1.5 items-center px-3 py-1.5 rounded-full text-sm"
                            :style="{ backgroundColor: player.color + '22', color: player.color }"
                        >
                            <span
                                class="block rounded-full size-2"
                                :style="{ backgroundColor: player.color }"
                            />
                            {{ player.nickname }}
                        </div>
                    </div>

                    <u-button
                        v-if="players.length >= 2"
                        icon="i-lucide-play"
                        :label="$t('game.thumbs.start_button')"
                        size="xl"
                        :disabled="isStartingGame || status !== 'OPEN'"
                        :loading="isStartingGame"
                        @click="handleStartGame"
                    />
                    <p
                        v-else
                        class="text-center text-muted text-sm"
                    >
                        {{ $t('game.thumbs.need_players') }}
                    </p>
                </div>
            </template>

            <!-- Voting phase -->
            <template v-else-if="gameState.phase === 'voting'">
                <div class="flex flex-1 flex-col gap-8 items-center justify-center max-w-md w-full">

                    <!-- Question -->
                    <div class="text-center">
                        <p class="font-semibold mb-3 text-muted text-sm tracking-wide uppercase">
                            {{ $t('game.thumbs.round', { n: gameState.roundIndex + 1, total: gameState.totalRounds }) }}
                        </p>
                        <p class="font-bold font-display leading-snug text-3xl text-highlighted">
                            {{ locale === 'it' ? gameState.question.it : gameState.question.en }}
                        </p>
                    </div>

                    <!-- Voted indicator -->
                    <div
                        v-if="gameState.myVote"
                        class="flex flex-col gap-3 items-center"
                    >
                        <div class="text-5xl">
                            {{ gameState.myVote === 'up' ? '👍' : '👎' }}
                        </div>
                        <p class="text-muted text-sm">
                            {{ $t('game.thumbs.waiting_others', { voted: gameState.votedCount, total: gameState.totalCount }) }}
                        </p>
                        <div class="bg-[var(--ui-border)] h-1.5 overflow-hidden rounded-full w-48">
                            <div
                                class="bg-primary-500 duration-500 h-full rounded-full transition-all"
                                :style="{ width: `${ (gameState.votedCount / Math.max(gameState.totalCount, 1)) * 100 }%` }"
                            />
                        </div>
                    </div>

                    <!-- Vote buttons -->
                    <div
                        v-else
                        class="flex gap-4 w-full"
                    >
                        <button
                            class="active:scale-95 bg-emerald-500/10 border-2 border-emerald-500/30 flex flex-1 flex-col gap-2 hover:bg-emerald-500/20 hover:border-emerald-500 items-center justify-center min-h-[140px] rounded-3xl text-emerald-500 transition-all"
                            :disabled="isSubmittingVote || status !== 'OPEN'"
                            @click="handleVote('up')"
                        >
                            <span class="text-5xl">
                                👍
                            </span>
                            <span class="font-bold font-display text-lg">
                                {{ $t('game.thumbs.yes') }}
                            </span>
                        </button>
                        <button
                            class="active:scale-95 bg-error-500/10 border-2 border-error-500/30 flex flex-1 flex-col gap-2 hover:bg-error-500/20 hover:border-error-500 items-center justify-center min-h-[140px] rounded-3xl text-error-500 transition-all"
                            :disabled="isSubmittingVote || status !== 'OPEN'"
                            @click="handleVote('down')"
                        >
                            <span class="text-5xl">
                                👎
                            </span>
                            <span class="font-bold font-display text-lg">
                                {{ $t('game.thumbs.no') }}
                            </span>
                        </button>
                    </div>

                </div>
            </template>

            <!-- Reveal phase -->
            <template v-else-if="gameState.phase === 'reveal'">
                <div class="flex flex-1 flex-col gap-6 items-center justify-center max-w-md w-full">

                    <p class="font-bold font-display text-2xl text-center text-highlighted">
                        {{ locale === 'it' ? gameState.question.it : gameState.question.en }}
                    </p>

                    <!-- Votes reveal -->
                    <div class="flex flex-wrap gap-2 justify-center">
                        <div
                            v-for="player in players"
                            :key="player.id"
                            class="flex gap-2 items-center px-3 py-2 rounded-full text-sm"
                            :style="{ backgroundColor: player.color + '22', color: player.color }"
                        >
                            <span
                                class="block rounded-full size-2"
                                :style="{ backgroundColor: player.color }"
                            />
                            <span class="font-semibold">
                                {{ player.nickname }}
                            </span>
                            <span class="text-lg">
                                {{ gameState.votes?.[player.id] === 'up' ? '👍' : gameState.votes?.[player.id] === 'down' ? '👎' : '—' }}
                            </span>
                        </div>
                    </div>

                    <!-- Scores -->
                    <div class="w-full">
                        <p class="font-semibold mb-2 text-muted text-sm tracking-wide uppercase">
                            {{ $t('game.thumbs.scores') }}
                        </p>
                        <div class="flex flex-col gap-1.5">
                            <div
                                v-for="player in sortedPlayers"
                                :key="player.id"
                                class="flex gap-3 items-center px-4 py-2.5 rounded-2xl"
                                :style="{ backgroundColor: player.color + '18' }"
                            >
                                <span
                                    class="block rounded-full shrink-0 size-3"
                                    :style="{ backgroundColor: player.color }"
                                />
                                <span
                                    class="flex-1 font-semibold text-highlighted"
                                    :style="{ color: player.color }"
                                >{{ player.nickname }}</span>
                                <span class="font-bold font-display text-highlighted text-lg">
                                    {{ gameState.scores[player.id] ?? 0 }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Next round button (host only) -->
                    <u-button
                        v-if="isHost"
                        block
                        :label="gameState.roundIndex + 1 < gameState.totalRounds ? $t('game.thumbs.next_round') : $t('game.thumbs.show_results')"
                        size="xl"
                        :disabled="isAdvancingRound || status !== 'OPEN'"
                        :loading="isAdvancingRound"
                        @click="handleNextRound"
                    />
                    <p
                        v-else
                        class="text-center text-muted text-sm"
                    >
                        {{ $t('game.thumbs.waiting_host') }}
                    </p>

                </div>
            </template>

            <!-- Finished phase -->
            <template v-else-if="gameState.phase === 'finished'">
                <div class="flex flex-1 flex-col gap-6 items-center justify-center max-w-md w-full">

                    <p class="font-bold font-display text-4xl text-highlighted">
                        🏆 {{ $t('game.thumbs.finished_title') }}
                    </p>

                    <!-- Podium -->
                    <div class="flex flex-col gap-2 w-full">
                        <div
                            v-for="( player, index ) in sortedPlayers"
                            :key="player.id"
                            class="flex gap-3 items-center px-4 py-3 rounded-2xl"
                            :class="index === 0 ? 'ring-2 ring-amber-400' : ''"
                            :style="{ backgroundColor: player.color + '22' }"
                        >
                            <span class="font-bold font-display text-2xl w-8">
                                {{ index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${ index + 1 }.` }}
                            </span>
                            <span
                                class="flex-1 font-semibold text-highlighted"
                                :style="{ color: player.color }"
                            >
                                {{ player.nickname }}
                                <span
                                    v-if="player.id === playerStore.playerId"
                                    class="ml-1 opacity-60 text-xs"
                                >{{ $t('lobby.you') }}</span>
                            </span>
                            <span class="font-bold font-display text-highlighted text-xl">
                                {{ gameState.scores[player.id] ?? 0 }}
                            </span>
                        </div>
                    </div>

                    <div class="flex gap-3 w-full">
                        <u-button
                            v-if="isHost"
                            block
                            icon="i-lucide-refresh-cw"
                            :label="$t('game.thumbs.play_again')"
                            size="xl"
                            :disabled="isStartingGame || status !== 'OPEN'"
                            :loading="isStartingGame"
                            @click="handleStartGame"
                        />
                        <u-button
                            block
                            color="neutral"
                            icon="i-lucide-arrow-left"
                            :label="$t('game.thumbs.back_lobby')"
                            size="xl"
                            variant="ghost"
                            :disabled="isGoingBack"
                            :loading="isGoingBack"
                            @click="goToLobby"
                        />
                    </div>

                </div>
            </template>

        </main>

    </div>
</template>

<script setup lang="ts">

    definePageMeta( { layout: 'game' } );

    const route = useRoute()
          , { t, locale } = useI18n()
          , playerStore = usePlayerStore()
          , localePath = useLocalePath()
          , toast = useToast()

          , venueSlug = route.params.venue as string
          , qrToken = route.params.token as string

          , {
              players, gameState, status, open, close, isHost, startGame, vote, nextRound, wsError,
          } = useTableSocket()

          , isStartingGame = ref( false )
          , isSubmittingVote = ref( false )
          , isAdvancingRound = ref( false )
          , isGoingBack = ref( false );

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

            toast.add( {
                color: 'error',
                description: error,
                duration: 4000,
            } );

            isStartingGame.value = false;
            isSubmittingVote.value = false;
            isAdvancingRound.value = false;
            toast.remove( 'thumbs-start-loading' );
            toast.remove( 'thumbs-vote-loading' );
            toast.remove( 'thumbs-next-round-loading' );

            wsError.value = null;

        }

    } );


    watch( status, value => {

        if( value !== 'OPEN' ) {

            isStartingGame.value = false;
            isAdvancingRound.value = false;

        }

    } );

    watch( gameState, state => {

        if( ! state ) {

            isSubmittingVote.value = false;
            isAdvancingRound.value = false;
            return;

        }

        if( state.phase === 'voting' && ! state.myVote ) {
            isSubmittingVote.value = false;
            toast.remove( 'thumbs-vote-loading' );
            toast.add( { color: 'success', description: t( 'game.thumbs.vote_success_toast' ), duration: 2200, icon: 'i-lucide-check-circle-2' } );
        }
        if( state.phase !== 'reveal' ) {
            isAdvancingRound.value = false;
            toast.remove( 'thumbs-next-round-loading' );
        }
        if( state.phase === 'voting' || state.phase === 'finished' ) {
            isStartingGame.value = false;
            toast.remove( 'thumbs-start-loading' );
            if( state.phase === 'voting' ) toast.add( { color: 'success', description: t( 'game.thumbs.start_success_toast' ), duration: 2200, icon: 'i-lucide-check-circle-2' } );
        }

    }, { deep: true } );

    const sortedPlayers = computed( () => {

        if( ! gameState.value ) return players.value;
        const scores = gameState.value.scores;

        return players.value.toSorted( ( a, b ) => ( scores[ b.id ] ?? 0 ) - ( scores[ a.id ] ?? 0 ) );

    } );

    /**
     *
     */
    async function goToLobby() {

        if( isGoingBack.value ) return;

        isGoingBack.value = true;
        const leavingGameToastId = 'thumbs-back-lobby-loading';
        toast.add( { id: leavingGameToastId, color: 'primary', description: t( 'game.thumbs.back_lobby_pending_toast' ), duration: 0, icon: 'i-lucide-loader-2' } );

        try {

            close();
            await navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/lobby` ) );
            toast.remove( leavingGameToastId );

        } catch( exception: unknown ) {

            toast.remove( leavingGameToastId );
            const fetchError = exception as { data?: { message?: string } };
            toast.add( { color: 'error', description: fetchError.data?.message ?? t( 'game.thumbs.back_lobby_error_toast' ), duration: 4500, icon: 'i-lucide-circle-alert' } );

        } finally {

            isGoingBack.value = false;

        }

    }

    function handleStartGame() {

        if( isStartingGame.value || status.value !== 'OPEN' ) return;

        isStartingGame.value = true;
        toast.add( { id: 'thumbs-start-loading', color: 'primary', description: t( 'game.thumbs.start_pending_toast' ), duration: 0, icon: 'i-lucide-loader-2' } );
        startGame();

    }

    function handleVote( choice: 'down' | 'up' ) {

        if( isSubmittingVote.value || status.value !== 'OPEN' ) return;

        isSubmittingVote.value = true;
        toast.add( { id: 'thumbs-vote-loading', color: 'primary', description: t( 'game.thumbs.vote_pending_toast' ), duration: 0, icon: 'i-lucide-loader-2' } );
        vote( choice );

    }

    function handleNextRound() {

        if( isAdvancingRound.value || status.value !== 'OPEN' ) return;

        isAdvancingRound.value = true;
        toast.add( { id: 'thumbs-next-round-loading', color: 'primary', description: t( 'game.thumbs.next_round_pending_toast' ), duration: 0, icon: 'i-lucide-loader-2' } );
        nextRound();

    }

    useHead( { title: computed( () => t( 'game.thumbs.title' ) ) } );

</script>
