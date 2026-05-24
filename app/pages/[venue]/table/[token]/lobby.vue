<template>
    <div class="flex flex-col h-screen overflow-hidden">

        <!-- Top bar -->
        <header class="border-[var(--ui-border)] border-b flex items-center justify-between px-4 py-3 shrink-0 gap-3">

            <div class="min-w-0">
                <p class="font-semibold text-highlighted text-sm truncate">{{ playerStore.venueName }}</p>
                <p class="text-muted text-xs">{{ $t('table.table_number', { n: playerStore.tableNumber }) }}</p>
            </div>

            <div class="flex gap-2 items-center shrink-0">

                <!-- Dating toggle -->
                <button
                    class="relative flex items-center gap-1.5 px-3 h-9 rounded-full text-sm font-semibold transition-all"
                    :class="datingEnabled
                        ? 'bg-secondary-500/15 text-secondary-500'
                        : 'bg-[var(--ui-bg-elevated)] text-muted border border-[var(--ui-border)] hover:border-secondary-500/40'"
                    :title="$t('lobby.dating_toggle_hint')"
                    @click="toggleDating"
                >
                    <u-icon class="size-4" name="i-lucide-heart" />
                    <span class="hidden sm:inline">{{ $t('lobby.dating_toggle_label') }}</span>
                    <span
                        v-if="datingUnreadCount > 0"
                        class="absolute -top-1 -right-1 flex items-center justify-center bg-secondary-500 text-white rounded-full min-w-[18px] h-[18px] text-[10px] font-bold px-1"
                    >{{ datingUnreadCount > 9 ? '9+' : datingUnreadCount }}</span>
                </button>

                <!-- Player pill -->
                <div
                    class="flex gap-2 h-9 items-center px-3 rounded-full text-sm shrink-0"
                    :style="{ backgroundColor: (playerStore.playerColor ?? '#6366F1') + '22', color: playerStore.playerColor ?? '#6366F1' }"
                >
                    <span class="block rounded-full size-2.5" :style="{ backgroundColor: playerStore.playerColor ?? 'currentColor' }" />
                    <span class="font-semibold max-w-[80px] truncate">{{ playerStore.playerNickname }}</span>
                </div>

                <u-button
                    color="neutral"
                    icon="i-lucide-log-out"
                    size="sm"
                    variant="ghost"
                    :disabled="isLeaving"
                    :loading="isLeaving"
                    :label="$t('lobby.leave')"
                    @click="handleLeave"
                />
            </div>
        </header>

        <!-- Connection status banner -->
        <div
            v-if="status !== 'OPEN'"
            class="flex items-center justify-between gap-2 px-4 py-2 text-sm shrink-0"
            :class="status === 'CONNECTING' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-error-500/10 text-error-500'"
        >
            <div class="flex gap-2 items-center">
                <u-icon class="size-4" :class="status !== 'CLOSED' ? 'animate-spin' : ''" name="i-lucide-loader-2" />
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

        <!-- Dating panel -->
        <transition name="slide-down">
            <div v-if="datingEnabled" class="shrink-0 border-b border-secondary-500/20 bg-secondary-500/5 px-4 py-4">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <u-icon class="size-4 text-secondary-500" name="i-lucide-heart" />
                        <p class="font-semibold text-highlighted text-sm">{{ $t('lobby.dating_inbox_title') }}</p>
                    </div>
                    <span v-if="datingRoomStatus.availableTableSessionIds.length > 0" class="text-xs text-secondary-500 font-medium">
                        {{ $t('lobby.dating_available_tables', { n: datingRoomStatus.availableTableSessionIds.length }) }}
                    </span>
                </div>

                <!-- Send message -->
                <div v-if="datingRoomStatus.availableTableSessionIds.length > 0" class="flex gap-2 mb-3">
                    <div class="flex-1 min-w-0">
                        <select
                            v-model="datingTarget"
                            class="w-full text-sm bg-[var(--ui-bg)] border border-[var(--ui-border)] rounded-lg px-3 py-2 text-highlighted focus:outline-none focus:ring-2 focus:ring-secondary-500/50 mb-2"
                        >
                            <option value="">{{ $t('lobby.dating_select_target') }}</option>
                            <option v-for="tid in datingRoomStatus.availableTableSessionIds" :key="tid" :value="tid">
                                {{ $t('lobby.dating_table_label', { id: tid.slice(0, 8) }) }}
                            </option>
                        </select>
                        <div class="flex gap-2">
                            <u-input
                                v-model="datingBody"
                                class="flex-1"
                                maxlength="240"
                                :placeholder="$t('lobby.dating_send_placeholder')"
                                size="sm"
                                @keyup.enter="onSendDating"
                            />
                            <u-button
                                color="secondary"
                                icon="i-lucide-send"
                                :label="$t('lobby.dating_send_button')"
                                size="sm"
                                :disabled="!datingTarget || !datingBody.trim()"
                                @click="onSendDating"
                            />
                        </div>
                    </div>
                </div>

                <!-- Inbox -->
                <div class="space-y-1.5 max-h-32 overflow-y-auto">
                    <p v-if="datingInbox.length === 0" class="text-muted text-xs py-2">{{ $t('lobby.dating_no_messages') }}</p>
                    <div
                        v-for="msg in datingInbox"
                        :key="msg.id"
                        class="bg-[var(--ui-bg)] rounded-lg px-3 py-2 text-sm"
                    >
                        <p class="text-highlighted">{{ msg.body }}</p>
                        <p class="text-muted text-xs mt-0.5">{{ formatTime(msg.createdAt) }}</p>
                    </div>
                </div>
            </div>
        </transition>

        <!-- Tabs navigation -->
        <div class="flex border-b border-[var(--ui-border)] shrink-0 px-4">
            <button
                v-for="tab in tabs"
                :key="tab.id"
                class="flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px"
                :class="activeTab === tab.id
                    ? 'border-primary-500 text-primary-500'
                    : 'border-transparent text-muted hover:text-highlighted'"
                @click="activeTab = tab.id"
            >
                <u-icon class="size-4" :name="tab.icon" />
                {{ tab.label }}
            </button>
        </div>

        <!-- Main content area -->
        <main class="flex-1 overflow-y-auto">

            <!-- Players tab -->
            <section v-show="activeTab === 'players'" class="p-4 space-y-4">

                <div class="flex items-center gap-2">
                    <span v-if="status === 'OPEN'" class="live-dot" />
                    <p class="text-muted text-xs font-medium uppercase tracking-wide">{{ players.length }} {{ $t('lobby.players_title').toLowerCase() }}</p>
                </div>

                <div v-if="isWsBootstrapping" class="flex flex-wrap gap-2">
                    <u-skeleton v-for="i in 4" :key="i" class="h-10 w-28 rounded-full" />
                </div>

                <div v-else class="flex flex-wrap gap-2">
                    <div
                        v-for="player in players"
                        :key="player.id"
                        class="flex gap-2 items-center px-3 py-2 rounded-full text-sm transition-all"
                        :class="player.id === playerStore.playerId ? 'ring-2' : ''"
                        :style="{ backgroundColor: player.color + '22', color: player.color }"
                    >
                        <span class="block rounded-full shrink-0 size-2.5" :style="{ backgroundColor: player.color }" />
                        <span class="font-semibold">{{ player.nickname }}</span>
                        <span v-if="player.id === playerStore.playerId" class="opacity-60 text-xs">{{ $t('lobby.you') }}</span>
                    </div>

                    <div v-if="players.length === 0" class="py-6 text-center text-muted text-sm w-full">
                        {{ $t('lobby.no_players') }}
                    </div>
                </div>

            </section>

            <!-- Games tab -->
            <section v-show="activeTab === 'games'" class="p-4 space-y-4">

                <!-- Active game banner -->
                <div v-if="gameSelection.selectedGame" class="rounded-xl bg-primary-500/10 border border-primary-500/20 p-4">
                    <div class="flex items-center gap-3">
                        <div class="flex items-center justify-center size-10 rounded-full bg-primary-500/20">
                            <u-icon class="size-5 text-primary-500" name="i-lucide-gamepad-2" />
                        </div>
                        <div>
                            <p class="font-semibold text-highlighted text-sm">{{ $t('lobby.game_in_progress') }}</p>
                            <p class="text-primary-500 text-xs font-medium">{{ gameSelection.selectedGame }}</p>
                        </div>
                    </div>
                </div>

                <template v-else>

                    <!-- Category filter tabs -->
                    <div class="flex gap-1 bg-[var(--ui-bg-elevated)] rounded-lg p-1">
                        <button
                            v-for="cat in gameCategories"
                            :key="cat.id"
                            class="flex-1 text-sm font-semibold py-1.5 px-2 rounded-md transition-colors"
                            :class="activeGameCategory === cat.id
                                ? 'bg-[var(--ui-bg)] text-highlighted shadow-sm'
                                : 'text-muted hover:text-highlighted'"
                            @click="activeGameCategory = cat.id"
                        >
                            {{ cat.label }}
                        </button>
                    </div>

                    <!-- Game cards -->
                    <div class="space-y-3">
                        <button
                            v-for="game in filteredGames"
                            :key="game.id"
                            class="w-full text-left rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-4 transition-all"
                            :class="isHostSelector
                                ? 'hover:border-primary-500/50 hover:bg-primary-500/5 cursor-pointer active:scale-[0.98]'
                                : 'opacity-60 cursor-not-allowed'"
                            :disabled="!isHostSelector || isSelectingGame"
                            @click="isHostSelector && selectGame(game.id)"
                        >
                            <div class="flex items-center gap-4">
                                <span class="text-3xl">{{ game.icon }}</span>
                                <div class="flex-1 min-w-0">
                                    <p class="font-semibold text-highlighted">{{ $t(game.labelKey) }}</p>
                                    <div class="flex items-center gap-3 mt-1">
                                        <span class="text-muted text-xs flex items-center gap-1">
                                            <u-icon class="size-3" name="i-lucide-users" />
                                            {{ $t('lobby.game_min_players', { n: game.minPlayers }) }}
                                        </span>
                                        <span class="text-muted text-xs flex items-center gap-1">
                                            <u-icon class="size-3" name="i-lucide-clock" />
                                            {{ $t('lobby.game_duration', { n: game.avgDurationMinutes }) }}
                                        </span>
                                        <span
                                            class="text-xs font-medium px-2 py-0.5 rounded-full"
                                            :class="game.category === 'preserata'
                                                ? 'bg-accent-500/15 text-accent-500'
                                                : game.category === 'board'
                                                    ? 'bg-primary-500/15 text-primary-500'
                                                    : 'bg-success-500/15 text-success-500'"
                                        >
                                            {{ game.category === 'preserata' ? '🍹' : game.category === 'board' ? '🎲' : '✨' }}
                                            {{ $t(`lobby.game_category_${ game.category === 'both' ? 'both' : game.category }`) }}
                                        </span>
                                    </div>
                                </div>
                                <u-icon v-if="isSelectingGame" class="size-5 text-muted animate-spin" name="i-lucide-loader-2" />
                                <u-icon v-else-if="isHostSelector" class="size-5 text-muted" name="i-lucide-chevron-right" />
                            </div>
                        </button>
                    </div>

                    <p v-if="!isHostSelector" class="text-center text-muted text-xs py-2">
                        <u-icon class="inline-block mr-1 size-3" name="i-lucide-lock" />
                        {{ $t('lobby.game_host_only') }}
                    </p>

                </template>

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
        players,
        gameSelection,
        gameState,
        status,
        open,
        close,
        wsError,
        datingEnabled,
        datingInbox,
        datingRoomStatus,
        datingUnreadCount,
        enableDating,
        disableDating,
        clearDatingUnread,
        sendDatingMessage,
    } = useTableSocket()

    , isLeaving = ref( false )
    , isSelectingGame = ref( false )
    , activeTab = ref<'players' | 'games'>( 'players' )
    , activeGameCategory = ref<'all' | GameCategory>( 'all' )
    , datingTarget = ref( '' )
    , datingBody = ref( '' )
    , isSendingDating = ref( false )
    , pendingSelectedGame = ref<string | null>( null )
    , pendingDatingMessage = ref<{ body: string; toTableSessionId: string } | null>( null );

// Game categories for filter tabs
const gameCategories = computed( () => [
    { id: 'all' as const, label: t( 'lobby.games_tab_all' ) },
    { id: 'board' as const, label: t( 'lobby.games_tab_board' ) },
    { id: 'preserata' as const, label: t( 'lobby.games_tab_preserata' ) },
] );

const filteredGames = computed( () => getGamesByCategory( activeGameCategory.value ) );

const isHostSelector = computed( () => ! gameSelection.value.hostPlayerId || gameSelection.value.hostPlayerId === playerStore.playerId );
const isWsBootstrapping = computed( () => status.value === 'CONNECTING' && players.value.length === 0 );

const tabs = computed( () => [
    { id: 'players' as const, label: t( 'lobby.tab_players' ), icon: 'i-lucide-users' },
    { id: 'games' as const, label: t( 'lobby.tab_games' ), icon: 'i-lucide-gamepad-2' },
] );

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
        pendingSelectedGame.value = null;
        isSelectingGame.value = false;
        toast.remove( 'lobby-select-game-loading' );
        toast.remove( 'lobby-dating-send-loading' );
        isSendingDating.value = false;
        pendingDatingMessage.value = null;
        toast.add( { color: 'error', description: error, duration: 4000 } );
        wsError.value = null;
    }
} );

watch( gameState, state => {
    if( state && ( state.phase === 'voting' || state.phase === 'reveal' ) )
        navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/game/thumbs` ) );
} );

watch( () => gameSelection.value.lockedAt, ( lockedAt, previousLockedAt ) => {
    if( ! pendingSelectedGame.value || ! lockedAt || lockedAt === previousLockedAt ) return;

    toast.remove( 'lobby-select-game-loading' );
    toast.add( { color: 'success', description: t( 'lobby.game_select_success_toast' ), duration: 2500, icon: 'i-lucide-check-circle-2' } );
    pendingSelectedGame.value = null;
    isSelectingGame.value = false;
} );

watch( () => datingInbox.value[ 0 ], latestMessage => {
    if( ! latestMessage || ! pendingDatingMessage.value ) return;

    const isOwnAck = latestMessage.fromTableSessionId === playerStore.tableSessionId
        && latestMessage.toTableSessionId === pendingDatingMessage.value.toTableSessionId
        && latestMessage.body.trim() === pendingDatingMessage.value.body.trim();

    if( ! isOwnAck ) return;

    toast.remove( 'lobby-dating-send-loading' );
    isSendingDating.value = false;
    pendingDatingMessage.value = null;
} );

// Clear unread when dating panel is open
watch( datingEnabled, enabled => {
    if( enabled ) clearDatingUnread();
} );

function toggleDating() {
    if( datingEnabled.value ) disableDating();
    else enableDating();
}

function formatTime( isoString: string ): string {
    try {
        return new Date( isoString ).toLocaleTimeString( [], { hour: '2-digit', minute: '2-digit' } );
    } catch{
        return '';
    }
}

function onSendDating() {
    if( ! datingTarget.value || ! datingBody.value.trim() || isSendingDating.value ) return;

    const messageBody = datingBody.value.trim();

    isSendingDating.value = true;
    pendingDatingMessage.value = { body: messageBody, toTableSessionId: datingTarget.value };
    toast.add( { id: 'lobby-dating-send-loading', color: 'primary', description: t( 'lobby.dating_message_sending_toast' ), duration: 0, icon: 'i-lucide-loader-2' } );
    sendDatingMessage( datingTarget.value, messageBody );
    datingBody.value = '';
}

async function selectGame( selectedGame: 'thumbs' | 'word-blitz' ) {
    if( ! isHostSelector.value || gameSelection.value.lockedAt || isSelectingGame.value ) return;

    isSelectingGame.value = true;
    pendingSelectedGame.value = selectedGame;
    const selectingToastId = 'lobby-select-game-loading';
    toast.add( { id: selectingToastId, color: 'primary', description: t( 'lobby.game_select_pending_toast' ), duration: 0, icon: 'i-lucide-loader-2' } );

    try {
        await $fetch( `/api/${ venueSlug }/table/${ qrToken }/game/select`, {
            method: 'POST',
            body: { selectedGame, gameMode: 'default', playerId: playerStore.playerId },
        } );
    } catch( exception: unknown ) {
        pendingSelectedGame.value = null;
        isSelectingGame.value = false;
        toast.remove( selectingToastId );
        const fetchError = exception as { data?: { message?: string } };
        toast.add( { color: 'error', description: fetchError.data?.message ?? t( 'lobby.game_select_error_toast' ), duration: 4500, icon: 'i-lucide-circle-alert' } );
    }
}

async function handleLeave() {
    if( isLeaving.value ) return;
    isLeaving.value = true;
    const leavingToastId = 'lobby-leaving-loading';
    toast.add( { id: leavingToastId, color: 'primary', description: t( 'lobby.leave_pending_toast' ), duration: 0, icon: 'i-lucide-loader-2' } );

    try {
        close();
        playerStore.leave();
        await navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }` ) );
        toast.remove( leavingToastId );
    } catch( exception: unknown ) {
        toast.remove( leavingToastId );
        const fetchError = exception as { data?: { message?: string } };
        toast.add( { color: 'error', description: fetchError.data?.message ?? t( 'lobby.leave_error_toast' ), duration: 4500, icon: 'i-lucide-circle-alert' } );
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

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
    transition: all 0.2s ease;
    overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
    opacity: 0;
    max-height: 0;
}

.slide-down-enter-to,
.slide-down-leave-from {
    opacity: 1;
    max-height: 500px;
}
</style>
