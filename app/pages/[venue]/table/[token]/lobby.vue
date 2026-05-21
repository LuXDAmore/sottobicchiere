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
                <!-- Player color badge -->
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
                />
            </div>
        </header>

        <!-- Main content -->
        <main class="flex flex-1 flex-col gap-6 overflow-y-auto p-4">

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
                    <span class="live-dot ml-auto" />
                </div>

                <!-- Players grid -->
                <div
                    v-if="pending"
                    class="flex justify-center py-8"
                >
                    <u-icon
                        class="animate-spin size-8 text-primary-500"
                        name="i-lucide-loader-2"
                    />
                </div>

                <div
                    v-else
                    class="flex flex-wrap gap-2"
                >
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

            <!-- Games section (scaffold) -->
            <section>
                <div class="flex gap-2 items-center mb-3">
                    <u-icon
                        class="size-4 text-muted"
                        name="i-lucide-gamepad-2"
                    />
                    <h2 class="font-semibold text-highlighted text-sm">
                        {{ $t('lobby.games_title') }}
                    </h2>
                </div>

                <u-card :ui="{ body: 'flex flex-col items-center gap-3 p-8' }">
                    <u-icon
                        class="opacity-50 size-12 text-muted"
                        name="i-lucide-construction"
                    />
                    <p class="font-semibold text-highlighted">
                        {{ $t('lobby.games_coming_soon') }}
                    </p>
                    <p class="text-center text-muted text-sm">
                        {{ $t('lobby.games_description') }}
                    </p>
                </u-card>
            </section>

        </main>

    </div>
</template>

<script setup lang="ts">

    definePageMeta( { layout: 'game' } );

    const route = useRoute()
          , { t } = useI18n()
          , playerStore = usePlayerStore()

          , venueSlug = route.params.venue as string
          , qrToken = route.params.token as string;

    // Guard: if not joined, redirect to join page
    onMounted( () => {

        if( ! playerStore.isJoined || playerStore.isExpired )
            navigateTo( `/${ venueSlug }/table/${ qrToken }` );

    } );

    // Fetch current players in the session
    const { data: playersData, pending, refresh } = await useFetch(
              () => `/api/${ venueSlug }/table/${ qrToken }/players`,
              {
                  lazy: true,
                  server: false,
              }
          )

          , players = computed( () => playersData.value ?? [] );

    // Periodically refresh player list until WebSocket is implemented
    let refreshInterval: ReturnType<typeof setInterval> | null = null;

    onMounted( () => {

        refreshInterval = setInterval( () => refresh(), 10_000 );

    } );
    onUnmounted( () => {

        if( refreshInterval ) clearInterval( refreshInterval );

    } );

    /**
     *
     */
    function handleLeave() {

        playerStore.leave();
        navigateTo( `/${ venueSlug }/table/${ qrToken }` );

    }

    useHead( {
        title: playerStore.venueName
            ? t( 'lobby.page_title', { venue: playerStore.venueName } )
            : t( 'app.name' ),
    } );

</script>
