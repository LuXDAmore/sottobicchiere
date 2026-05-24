<template>
    <div class="flex flex-col h-screen overflow-hidden">

        <!-- Top bar -->
        <header class="border-[var(--ui-border)] border-b flex items-center justify-between px-4 py-3 shrink-0">
            <div>
                <p class="font-semibold text-highlighted text-sm">
                    {{ playerStore.venueName }}
                </p>
                <p class="text-muted text-xs">
                    {{ $t('table.table_number', { n: playerStore.tableNumber }) }}
                </p>
            </div>

            <div class="flex gap-3 items-center">
                <div
                    class="flex gap-2 h-9 items-center px-3 rounded-full text-sm"
                    :style="{ backgroundColor: (playerStore.playerColor ?? '#6366F1') + '22', color: playerStore.playerColor ?? '#6366F1' }"
                >
                    <span
                        class="block rounded-full size-2.5"
                        :style="{ backgroundColor: playerStore.playerColor ?? 'currentColor' }"
                    />
                    <span class="font-semibold">
                        {{ playerStore.playerNickname }}
                    </span>
                </div>

                <u-button
                    color="neutral"
                    icon="i-lucide-log-out"
                    :label="$t('lobby.leave')"
                    size="sm"
                    variant="ghost"
                    @click="handleLeave"
                    :disabled="isLeaving"
                    :loading="isLeaving"
                />
            </div>
        </header>

        <!-- Main content -->
        <main class="flex flex-1 flex-col gap-6 overflow-y-auto p-4">

            <!-- WebSocket status -->
            <div
                v-if="status !== 'OPEN'"
                class="flex flex-col gap-2 items-center justify-center py-2 rounded-lg text-sm"
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

            <section v-if="sessionMetaPending" class="rounded-lg border border-[var(--ui-border)] p-3 text-sm">
                <div class="space-y-2">
                    <u-skeleton class="h-4 w-44" />
                    <u-skeleton class="h-4 w-52" />
                    <u-skeleton class="h-4 w-40" />
                </div>
            </section>

            <section v-else-if="sessionMetaError" class="rounded-lg border border-error-500/30 bg-error-500/10 p-3 text-sm">
                <p class="text-error-500">Errore caricamento sessione.</p>
                <u-button class="mt-2" color="neutral" icon="i-lucide-refresh-cw" label="Riprova" size="xs" variant="soft" @click="refreshSessionMeta" />
            </section>

            <section v-else-if="sessionMeta" class="rounded-lg border border-[var(--ui-border)] p-3 text-sm">
                <p><strong>{{ $t('lobby.session_status') }}:</strong> {{ sessionMeta.status }}</p>
                <p><strong>{{ $t('lobby.session_host') }}:</strong> {{ sessionMeta.hostNickname ?? '-' }}</p>
                <p><strong>{{ $t('lobby.session_remaining') }}:</strong> {{ Math.max(0, remainingSeconds) }}s</p>
                <u-button class="mt-2" color="neutral" icon="i-lucide-refresh-cw" label="Aggiorna sessione" size="xs" variant="ghost" @click="refreshSessionMeta" />
            </section>

            <!-- Players section -->
            <section>
                <div class="flex gap-2 items-center mb-3">
                    <u-icon
                        class="size-4 text-muted"
                        name="i-lucide-users"
                    />
                    <h2 class="font-semibold text-highlighted text-sm">
                        {{ $t('lobby.players_title') }}
                    </h2>
                    <span
                        v-if="status === 'OPEN'"
                        class="live-dot ml-auto"
                    />
                </div>

                <div class="flex flex-wrap gap-2">
                    <div
                        v-for="player in players"
                        :key="player.id"
                        class="flex gap-2 items-center px-3 py-2 rounded-full text-sm transition-all"
                        :class="player.id === playerStore.playerId ? 'ring-2' : ''"
                        :style="{
                            backgroundColor: player.color + '22',
                            color: player.color,
                        }"
                    >
                        <span
                            class="block rounded-full shrink-0 size-2.5"
                            :style="{ backgroundColor: player.color }"
                        />
                        <span class="font-semibold">
                            {{ player.nickname }}
                        </span>
                        <span
                            v-if="player.id === playerStore.playerId"
                            class="opacity-60 text-xs"
                        >{{ $t('lobby.you') }}</span>
                    </div>

                    <div
                        v-if="players.length === 0"
                        class="py-4 text-center text-muted text-sm w-full"
                    >
                        {{ $t('lobby.no_players') }}
                    </div>
                </div>
            </section>

            <!-- Games section -->
            <section>
                <div class="flex gap-2 items-center mb-3">
                    <u-icon class="size-4 text-muted" name="i-lucide-gamepad-2" />
                    <h2 class="font-semibold text-highlighted text-sm">{{ $t('lobby.games_title') }}</h2>
                </div>
                <div v-if="gameSelection.selectedGame" class="bg-primary-500/10 p-4 rounded-xl text-sm">
                    <p class="font-semibold">Gioco corrente: {{ gameSelection.selectedGame }}</p>
                    <p class="text-muted">Selezione bloccata{{ gameSelection.lockedAt ? ' alle ' + new Date(gameSelection.lockedAt).toLocaleTimeString() : '' }}</p>
                </div>
                <div v-else class="grid gap-3">
                    <u-button :disabled="isSelectingGame || !isHostSelector" @click="selectGame('thumbs')">👍 {{ $t('game.thumbs.title') }}</u-button>
                    <u-button :disabled="isSelectingGame || !isHostSelector" @click="selectGame('word-blitz')">⚡ {{ $t('game.word_blitz.title') }}</u-button>
                    <p v-if="!isHostSelector" class="text-muted text-xs">Solo l'host può scegliere il gioco.</p>
                </div>
            </section>

        </main>

    </div>
</template>

<script setup lang="ts">

    definePageMeta( { layout: 'game' } );

    const route = useRoute()
          , { t } = useI18n()
          , playerStore = usePlayerStore()
          , localePath = useLocalePath()
          , toast = useToast()

          , venueSlug = route.params.venue as string
          , qrToken = route.params.token as string

          , {
              players, gameSelection, gameState, status, open, close, wsError,
          } = useTableSocket()

          , isLeaving = ref( false )
          , {
              data: sessionMeta,
              pending: sessionMetaPending,
              error: sessionMetaError,
              refresh: refreshSessionMeta,
          } = await useLazyAsyncData(
              `session-meta-${ venueSlug }-${ qrToken }`,
              () => $fetch(`/api/${ venueSlug }/table/${ qrToken }/session`),
          )
          , remainingSeconds = ref( 0 )
          , isSelectingGame = ref( false );

    onMounted( () => {

        if( ! playerStore.isJoined || playerStore.isExpired ) {

            navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }` ) );
            return;

        }
        open();

    } );

    onUnmounted( () => close() );

    watchEffect(() => {
        if (!sessionMeta.value) return;
        remainingSeconds.value = sessionMeta.value.remainingSeconds;
    });

    let countdownTimer: ReturnType<typeof setInterval> | null = null;

    onMounted(() => {
        if (import.meta.client) {
            countdownTimer = setInterval(() => {
                if (remainingSeconds.value > 0) remainingSeconds.value -= 1;
            }, 1000);
        }
    });

    onUnmounted(() => {
        if (countdownTimer) clearInterval(countdownTimer);
    });

    watch( wsError, error => {

        if( error ) {

            toast.add( {
                color: 'error',
                description: error,
                duration: 4000,
            } );
            wsError.value = null;

        }

    } );

    // Navigate to game whenever an active phase is received (handles late reconnects too)
    watch( gameState, state => {

        if( state && ( state.phase === 'voting' || state.phase === 'reveal' ) )
            navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/game/thumbs` ) );

    } );

    const isHostSelector = computed( () => ! gameSelection.value.hostPlayerId || gameSelection.value.hostPlayerId === playerStore.playerId );

    async function selectGame( selectedGame: 'thumbs' | 'word-blitz' ) {

        if( ! isHostSelector.value || gameSelection.value.lockedAt || isSelectingGame.value ) return;

        isSelectingGame.value = true;

        try {

            await $fetch( `/api/${ venueSlug }/table/${ qrToken }/game/select`, {
                method: 'POST',
                body: {
                    selectedGame,
                    gameMode: 'default',
                    playerId: playerStore.playerId,
                },
            } );

        } finally {

            isSelectingGame.value = false;

        }

    }

    async function handleLeave() {

        if( isLeaving.value ) return;

        isLeaving.value = true;

        try {

            close();
            playerStore.leave();
            await navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }` ) );

        } finally {

            isLeaving.value = false;

        }

    }

    useHead( {
        title: computed( () => ( playerStore.venueName
            ? t( 'lobby.page_title', { venue: playerStore.venueName } )
            : t( 'app.name' ) ) ),
    } );

</script>
