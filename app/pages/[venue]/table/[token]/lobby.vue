<template>
    <div class="flex flex-col h-screen overflow-hidden">

        <!-- Top bar -->
        <header class="border-[var(--ui-border)] border-b flex gap-3 items-center justify-between px-4 py-3 shrink-0">

            <div class="min-w-0">
                <p class="font-semibold text-highlighted text-sm truncate">
                    {{ playerStore.venueName }}
                </p>
                <p class="text-muted text-xs">
                    {{ $t('table.table_number', { n: playerStore.tableNumber }) }}
                </p>
            </div>

            <div class="flex gap-2 items-center shrink-0">

                <!-- Invita al tavolo (QR/link/codice per chi arriva dopo) -->
                <table-invite>
                    <u-button
                        :aria-label="$t('invite.trigger_label')"
                        color="neutral"
                        icon="i-lucide-user-plus"
                        size="sm"
                        variant="ghost"
                    />
                </table-invite>

                <!-- Dating toggle -->
                <button
                    :aria-label="$t('lobby.dating_toggle_label')"
                    class="disabled:cursor-not-allowed disabled:opacity-60 flex font-semibold gap-1.5 h-9 items-center px-3 relative rounded-full text-sm transition-all"
                    :class="datingEnabled
                        ? 'bg-secondary-500/15 text-secondary-500'
                        : 'bg-[var(--ui-bg-elevated)] text-muted border border-[var(--ui-border)] hover:border-secondary-500/40'"
                    :disabled="isTogglingDating"
                    :title="$t('lobby.dating_toggle_hint')"
                    @click="toggleDating"
                >
                    <u-icon
                        class="size-4"
                        :class="isTogglingDating ? 'animate-spin' : ''"
                        :name="isTogglingDating ? 'i-lucide-loader-2' : 'i-lucide-heart'"
                    />
                    <span class="hidden sm:inline">
                        {{ $t('lobby.dating_toggle_label') }}
                    </span>
                    <span
                        v-if="datingUnreadCount > 0"
                        class="-right-1 -top-1 absolute bg-secondary-500 flex font-bold h-[18px] items-center justify-center min-w-[18px] px-1 rounded-full text-[10px] text-white"
                    >{{ datingUnreadCount > 9 ? '9+' : datingUnreadCount }}</span>
                </button>

                <!-- Player pill -->
                <div
                    class="flex gap-2 h-9 items-center px-3 rounded-full shrink-0 text-sm"
                    :style="{ backgroundColor: (playerStore.playerColor ?? '#6366F1') + '22', color: playerStore.playerColor ?? '#6366F1' }"
                >
                    <span class="block rounded-full size-2.5" :style="{ backgroundColor: playerStore.playerColor ?? 'currentColor' }" />
                    <span class="font-semibold max-w-[80px] truncate">
                        {{ playerStore.playerNickname }}
                    </span>
                </div>

                <u-button
                    color="neutral"
                    :disabled="isLeaving"
                    icon="i-lucide-log-out"
                    :label="$t('lobby.leave')"
                    :loading="isLeaving"
                    size="sm"
                    variant="ghost"
                    @click="handleLeave"
                />
            </div>
        </header>

        <!-- Connection status banner -->
        <div
            v-if="status !== 'OPEN'"
            class="flex gap-2 items-center justify-between px-4 py-2 shrink-0 text-sm"
            :class="status === 'CONNECTING' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-error-500/10 text-error-500'"
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
                @click="reconnect()"
            />
        </div>

        <!-- Dating panel -->
        <transition name="slide-down">
            <div v-if="datingEnabled" class="bg-secondary-500/5 border-b border-secondary-500/20 px-4 py-4 shrink-0">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex gap-2 items-center">
                        <u-icon class="size-4 text-secondary-500" name="i-lucide-heart" />
                        <p class="font-semibold text-highlighted text-sm">
                            {{ $t('lobby.dating_inbox_title') }}
                        </p>
                    </div>
                    <span v-if="datingRoomStatus.availableTableSessionIds.length > 0" class="font-medium text-secondary-500 text-xs">
                        {{ $t('lobby.dating_available_tables', { n: datingRoomStatus.availableTableSessionIds.length }) }}
                    </span>
                </div>

                <!-- Send message -->
                <div v-if="datingRoomStatus.availableTableSessionIds.length > 0" class="flex gap-2 mb-3">
                    <div class="flex-1 min-w-0">
                        <u-select
                            v-model="datingTarget"
                            class="mb-2 w-full"
                            color="secondary"
                            :items="datingTargetItems"
                            :placeholder="$t('lobby.dating_select_target')"
                            size="sm"
                        />
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
                                :disabled="! datingTarget || ! datingBody.trim()"
                                icon="i-lucide-send"
                                :label="$t('lobby.dating_send_button')"
                                size="sm"
                                @click="onSendDating"
                            />
                        </div>
                    </div>
                </div>

                <!-- Inbox -->
                <div class="max-h-32 overflow-y-auto space-y-1.5">
                    <p v-if="datingInbox.length === 0" class="py-2 text-muted text-xs">
                        {{ $t('lobby.dating_no_messages') }}
                    </p>
                    <div
                        v-for="msg in datingInbox"
                        :key="msg.id"
                        class="bg-[var(--ui-bg)] px-3 py-2 rounded-lg text-sm"
                    >
                        <p class="text-highlighted">
                            {{ msg.body }}
                        </p>
                        <p class="mt-0.5 text-muted text-xs">
                            {{ formatTime(msg.createdAt) }}
                        </p>
                    </div>
                </div>
            </div>
        </transition>

        <!-- Tabs navigation (design system: UTabs, solo i trigger; il contenuto resta sotto) -->
        <u-tabs
            class="px-4 shrink-0"
            color="primary"
            :content="false"
            :items="tabs"
            :model-value="activeTab"
            variant="link"
            @update:model-value="value => ( activeTab = value as typeof activeTab )"
        />

        <!-- Main content area -->
        <main class="flex-1 overflow-y-auto">

            <!-- Players tab -->
            <section v-show="activeTab === 'players'" class="p-4 space-y-4">

                <!-- Da soli al tavolo: avviso soft + invito (la maggior parte dei giochi richiede 2+) -->
                <div v-if="isAloneAtTable" class="space-y-3">
                    <u-alert
                        color="warning"
                        :description="$t('lobby.alone_description')"
                        icon="i-lucide-user-round-plus"
                        :title="$t('lobby.alone_title')"
                        variant="soft"
                    />
                    <table-invite>
                        <u-button
                            block
                            color="warning"
                            icon="i-lucide-user-plus"
                            :label="$t('invite.waiting_cta')"
                            size="lg"
                            variant="soft"
                        />
                    </table-invite>
                </div>

                <div class="flex gap-2 items-center">
                    <span v-if="status === 'OPEN'" class="live-dot" />
                    <p class="font-medium text-muted text-xs tracking-wide uppercase">
                        {{ players.length }} {{ $t('lobby.players_title').toLowerCase() }}
                    </p>
                </div>

                <div v-if="isWsBootstrapping" class="flex flex-wrap gap-2">
                    <u-skeleton
                        v-for="i in 4"
                        :key="i"
                        class="h-10 rounded-full w-28"
                    />
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
                        <span class="font-semibold">
                            {{ player.nickname }}
                        </span>
                        <span v-if="player.id === playerStore.playerId" class="opacity-60 text-xs">
                            {{ $t('lobby.you') }}
                        </span>
                    </div>

                    <div v-if="players.length === 0" class="py-6 text-center text-muted text-sm w-full">
                        {{ $t('lobby.no_players') }}
                    </div>
                </div>

            </section>

            <!-- Areas tab -->
            <section v-show="activeTab === 'areas'" class="p-4 space-y-4">

                <p class="text-muted text-xs">
                    {{ $t('lobby.areas_description') }}
                </p>

                <!-- Create area: solo l'host reale (allineato al server, niente UI per i non-host) -->
                <div v-if="isCurrentHost" class="flex gap-2">
                    <u-input
                        v-model="areaName"
                        :aria-label="$t('lobby.area_create_placeholder')"
                        class="flex-1"
                        :disabled="isCreatingArea"
                        maxlength="30"
                        :placeholder="$t('lobby.area_create_placeholder')"
                        size="md"
                        @keyup.enter="createArea"
                    />
                    <u-button
                        color="primary"
                        :disabled="! areaName.trim() || isCreatingArea"
                        icon="i-lucide-plus"
                        :label="$t('lobby.area_create_button')"
                        :loading="isCreatingArea"
                        size="md"
                        @click="createArea"
                    />
                </div>

                <p v-if="areas.length === 0" class="py-6 text-center text-muted text-sm">
                    {{ $t('lobby.areas_empty') }}
                </p>

                <!-- Area cards -->
                <div class="space-y-3">
                    <div
                        v-for="area in areas"
                        :key="area.id"
                        class="border p-4 rounded-xl"
                        :style="{ borderColor: area.color + '55', backgroundColor: area.color + '0d' }"
                    >
                        <div class="flex gap-3 items-center justify-between mb-3">
                            <div class="flex gap-2 items-center min-w-0">
                                <span class="block rounded-full shrink-0 size-3" :style="{ backgroundColor: area.color }" />
                                <p class="font-semibold text-highlighted truncate">
                                    {{ area.name }}
                                </p>
                                <span class="shrink-0 text-muted text-xs">
                                    {{ $t('lobby.area_members', { n: area.members.length }) }}
                                </span>
                            </div>
                            <u-button
                                v-if="myAreaId === area.id"
                                color="neutral"
                                :disabled="isAssigningArea"
                                :label="$t('lobby.area_leave')"
                                size="xs"
                                variant="soft"
                                @click="assignArea(null)"
                            />
                            <u-button
                                v-else
                                color="primary"
                                :disabled="isAssigningArea"
                                :label="$t('lobby.area_join')"
                                size="xs"
                                variant="soft"
                                @click="assignArea(area.id)"
                            />
                        </div>

                        <div v-if="area.members.length > 0" class="flex flex-wrap gap-2">
                            <span
                                v-for="member in area.members"
                                :key="member.id"
                                class="flex gap-1.5 items-center px-2.5 py-1 rounded-full text-xs"
                                :style="{ backgroundColor: member.color + '22', color: member.color }"
                            >
                                <span class="block rounded-full shrink-0 size-2" :style="{ backgroundColor: member.color }" />
                                {{ member.nickname }}
                            </span>
                        </div>
                        <p v-else class="text-muted text-xs">
                            {{ $t('lobby.area_no_members') }}
                        </p>
                    </div>
                </div>

                <!-- Unassigned players -->
                <div v-if="unassignedMembers.length > 0" class="pt-2">
                    <p class="font-medium mb-2 text-muted text-xs tracking-wide uppercase">
                        {{ $t('lobby.areas_unassigned') }}
                    </p>
                    <div class="flex flex-wrap gap-2">
                        <span
                            v-for="member in unassignedMembers"
                            :key="member.id"
                            class="flex gap-1.5 items-center px-2.5 py-1 rounded-full text-xs"
                            :style="{ backgroundColor: member.color + '22', color: member.color }"
                        >
                            <span class="block rounded-full shrink-0 size-2" :style="{ backgroundColor: member.color }" />
                            {{ member.nickname }}
                        </span>
                    </div>
                </div>

            </section>

            <!-- Games tab -->
            <section v-show="activeTab === 'games'" class="p-4 space-y-4">

                <!-- Active game banner: niente navigazione forzata, si rientra (o si termina) da qui -->
                <div v-if="gameSelection.selectedGame" class="bg-primary-500/10 border border-primary-500/20 p-4 rounded-xl">
                    <div class="flex gap-3 items-center">
                        <div class="bg-primary-500/20 flex items-center justify-center rounded-full size-10">
                            <u-icon class="size-5 text-primary-500" name="i-lucide-gamepad-2" />
                        </div>
                        <div>
                            <p class="font-semibold text-highlighted text-sm">
                                {{ $t('lobby.game_in_progress') }}
                            </p>
                            <p class="font-medium text-primary-500 text-xs">
                                {{ gameSelection.selectedGame }}
                            </p>
                        </div>
                    </div>
                    <div class="flex gap-2 mt-3">
                        <u-button
                            color="primary"
                            icon="i-lucide-play"
                            :label="$t('lobby.game_resume')"
                            size="sm"
                            :to="localePath(`/${venueSlug}/table/${qrToken}/game/${gameSelection.selectedGame}`)"
                        />
                        <u-button
                            v-if="isCurrentHost"
                            color="error"
                            :disabled="isEndingGame"
                            icon="i-lucide-square"
                            :label="$t('lobby.game_end')"
                            :loading="isEndingGame"
                            size="sm"
                            variant="soft"
                            @click="endGame"
                        />
                    </div>
                </div>

                <template v-else>

                    <!-- Category filter (design system: UTabs pill a tutta larghezza) -->
                    <u-tabs
                        class="w-full"
                        :content="false"
                        :items="gameCategories"
                        :model-value="activeGameCategory"
                        size="sm"
                        :ui="{ list: 'w-full', trigger: 'grow justify-center' }"
                        variant="pill"
                        @update:model-value="value => ( activeGameCategory = value as typeof activeGameCategory )"
                    />

                    <!-- Filtro per numero di giocatori ("siamo in N") -->
                    <div class="flex gap-2 items-center">
                        <u-icon class="shrink-0 size-4 text-muted" name="i-lucide-users" />
                        <u-select
                            v-model="playersFilter"
                            :aria-label="$t('lobby.players_filter_label')"
                            class="flex-1"
                            :items="playersFilterItems"
                            size="sm"
                        />
                    </div>

                    <p v-if="filteredGames.length === 0" class="py-6 text-center text-muted text-sm">
                        {{ $t('lobby.games_filter_empty') }}
                    </p>

                    <!-- Game cards -->
                    <div class="space-y-3">
                        <div
                            v-for="game in filteredGames"
                            :key="game.id"
                            class="relative"
                        >
                            <button
                                class="bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] p-4 rounded-xl text-left transition-all w-full"
                                :class="isHostSelector
                                    ? 'hover:border-primary-500/50 hover:bg-primary-500/5 cursor-pointer active:scale-[0.98]'
                                    : 'opacity-60 cursor-not-allowed'"
                                :disabled="! isHostSelector || isSelectingGame"
                                @click="isHostSelector && selectGame(game.id)"
                            >
                                <div class="flex gap-4 items-center">
                                    <span class="text-3xl">
                                        {{ game.icon }}
                                    </span>
                                    <div class="flex-1 min-w-0">
                                        <p class="font-semibold pr-8 text-highlighted">
                                            {{ $t(game.labelKey) }}
                                        </p>
                                        <p class="mt-0.5 pr-8 text-muted text-xs">
                                            {{ $t(game.descriptionKey) }}
                                        </p>
                                        <div class="flex flex-wrap gap-3 items-center mt-2">
                                            <span class="flex gap-1 items-center text-muted text-xs">
                                                <u-icon class="size-3" name="i-lucide-users" />
                                                {{ game.maxPlayers
                                                    ? $t('lobby.game_players_range', { min: game.minPlayers, max: game.maxPlayers })
                                                    : $t('lobby.game_min_players', { n: game.minPlayers }) }}
                                            </span>
                                            <span class="flex gap-1 items-center text-muted text-xs">
                                                <u-icon class="size-3" name="i-lucide-clock" />
                                                {{ $t('lobby.game_duration', { n: game.avgDurationMinutes }) }}
                                            </span>
                                            <span
                                                class="font-medium px-2 py-0.5 rounded-full text-xs"
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
                                    <u-icon
                                        v-if="isSelectingGame && pendingSelectedGame === game.id"
                                        class="animate-spin size-5 text-muted"
                                        name="i-lucide-loader-2"
                                    />
                                    <u-icon
                                        v-else-if="isHostSelector"
                                        class="size-5 text-muted"
                                        name="i-lucide-chevron-right"
                                    />
                                </div>
                            </button>

                            <!-- Info regole: fuori dal button della card (niente bottoni annidati) -->
                            <u-button
                                :aria-label="$t('lobby.game_rules_aria')"
                                class="absolute right-2 top-2"
                                color="neutral"
                                icon="i-lucide-circle-help"
                                size="xs"
                                variant="ghost"
                                @click="rulesGame = game"
                            />
                        </div>
                    </div>

                    <p v-if="! isHostSelector" class="py-2 text-center text-muted text-xs">
                        <u-icon class="inline-block mr-1 size-3" name="i-lucide-lock" />
                        {{ $t('lobby.game_host_only') }}
                    </p>

                </template>

            </section>

        </main>

        <!-- Modale regole del gioco (aperta dal tasto info sulle card) -->
        <game-rules-modal
            :game="rulesGame"
            :open="rulesGame !== null"
            @update:open="value => { if (! value) rulesGame = null }"
        />

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
              gameLaunch,
              status,
              open,
              close,
              reconnect,
              wsError,
              lobbyVersion,
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
          , isEndingGame = ref( false )
          , activeTab = ref<'areas' | 'games' | 'players'>( 'players' )
          , activeGameCategory = ref<GameCategory | 'all'>( 'all' )
          , playersFilter = ref<number | 'all'>( 'all' )
          , rulesGame = ref<GameDefinition | null>( null )
          , datingTarget = ref( '' )
          , datingBody = ref( '' )
          , isSendingDating = ref( false )
          , isTogglingDating = ref( false )

          // Sblocca l'invio dating se l'ACK realtime non arriva (es. connessione
          // caduta tra la POST e il broadcast): senza, spinner e input resterebbero
          // bloccati per sempre.
          , datingAckTimeout = useTimeoutFn( () => {

              if( ! isSendingDating.value ) return;

              toast.remove( 'lobby-dating-send-loading' );
              isSendingDating.value = false;
              pendingDatingMessage.value = null;
              toast.add( {
                  color: 'warning',
                  description: t( 'lobby.dating_message_timeout_toast' ),
                  duration: 4000,
                  icon: 'i-lucide-clock-alert',
              } );

          }, 8000, { immediate: false } )
          , pendingSelectedGame = ref<string | null>( null )
          , pendingDatingMessage = ref<{ body: string; toTableSessionId: string } | null>( null )
          , areas = ref<AreaWithMembers[]>( [] )
          , unassignedMembers = ref<AreaMember[]>( [] )
          , areaName = ref( '' )
          , isCreatingArea = ref( false )
          , isAssigningArea = ref( false )

          // Game categories for filter tabs
          , gameCategories = computed( () => [
              {
                  value: 'all' as const,
                  label: t( 'lobby.games_tab_all' ),
              },
              {
                  value: 'board' as const,
                  label: t( 'lobby.games_tab_board' ),
              },
              {
                  value: 'preserata' as const,
                  label: t( 'lobby.games_tab_preserata' ),
              },
          ] )

          // Destinatari dating per USelect (id tavolo abbreviato come etichetta).
          , datingTargetItems = computed( () => datingRoomStatus.value.availableTableSessionIds.map( tid => ( {
              label: t( 'lobby.dating_table_label', { id: tid.slice( 0, 8 ) } ),
              value: tid,
          } ) ) )

          // Opzioni filtro "siamo in N" (1–8 copre i tavoli reali; 'all' = nessun filtro).
          , playersFilterItems = computed( () => [
              {
                  label: t( 'lobby.players_filter_all' ),
                  value: 'all' as const,
              },
              ... Array.from( { length: 8 }, ( _, index ) => ( {
                  label: t( 'lobby.players_filter_n', { n: index + 1 } ),
                  value: index + 1,
              } ) ),
          ] )

          // Categoria + numero giocatori: un gioco è fattibile in N se N >= min e
          // (nessun massimo, oppure N <= max).
          , filteredGames = computed( () => getGamesByCategory( activeGameCategory.value ).filter( game => {

              if( playersFilter.value === 'all' ) return true;

              const n = playersFilter.value;

              return game.minPlayers <= n && ( ! game.maxPlayers || game.maxPlayers >= n );

          } ) )

          , isHostSelector = computed( () => ! gameSelection.value.hostPlayerId || gameSelection.value.hostPlayerId === playerStore.playerId )
          // Host "reale", allineato al server (requireHostSession): l'host corrente, o —
          // se non ancora assegnato — solo chi ha creato la sessione. Evita di mostrare
          // ai non-host azioni che il server rifiuterebbe con 403.
          , isCurrentHost = computed( () => ( gameSelection.value.hostPlayerId
              ? gameSelection.value.hostPlayerId === playerStore.playerId
              : playerStore.isHost ) )
          , isWsBootstrapping = computed( () => status.value === 'CONNECTING' && players.value.length === 0 )

          // Da soli al tavolo (connessione viva e presence sincronizzata): mostra
          // l'avviso che quasi tutti i giochi richiedono almeno 2 giocatori.
          , isAloneAtTable = computed( () => status.value === 'OPEN' && players.value.length === 1 )

          , tabs = computed( () => [
              {
                  value: 'players' as const,
                  label: t( 'lobby.tab_players' ),
                  icon: 'i-lucide-users',
              },
              {
                  value: 'areas' as const,
                  label: t( 'lobby.tab_areas' ),
                  icon: 'i-lucide-layout-grid',
              },
              {
                  value: 'games' as const,
                  label: t( 'lobby.tab_games' ),
                  icon: 'i-lucide-gamepad-2',
              },
          ] )

          // Area in cui si trova il giocatore corrente (null = nessuna).
          , myAreaId = computed( () => areas.value.find( a => a.members.some( m => m.id === playerStore.playerId ) )?.id ?? null );

    onMounted( () => {

        if( ! playerStore.isJoined || playerStore.isExpired ) {

            navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }` ) );
            return;

        }
        open();
        refreshAreas();

    } );

    onUnmounted( () => close() );

    // Aree/iscrizioni cambiate (segnale realtime `lobby:changed`): rifai il fetch.
    watch( lobbyVersion, () => refreshAreas() );

    /**
     *
     */
    async function refreshAreas() {

        try {

            const data = await $fetch<AreasResponse>( `/api/${ venueSlug }/table/${ qrToken }/areas`, { query: { session: playerStore.tableSessionId ?? undefined } } );

            areas.value = data.areas;
            unassignedMembers.value = data.unassigned;

        } catch{

            // Le aree sono accessorie: in caso di errore la lobby resta usabile.

        }

    }

    /**
     *
     */
    async function createArea() {

        const name = areaName.value.trim();

        if( ! name || isCreatingArea.value ) return;

        isCreatingArea.value = true;

        try {

            await $fetch( `/api/${ venueSlug }/table/${ qrToken }/areas`, {
                method: 'POST',
                body: {
                    playerId: playerStore.playerId,
                    name,
                },
            } );
            areaName.value = '';
            await refreshAreas();

        } catch( exception: unknown ) {

            const fetchError = exception as { data?: { message?: string } };

            toast.add( {
                color: 'error',
                description: fetchError.data?.message ?? t( 'lobby.area_create_error_toast' ),
                duration: 4000,
                icon: 'i-lucide-circle-alert',
            } );

        } finally {

            isCreatingArea.value = false;

        }

    }

    /**
     *
     * @param areaId
     */
    async function assignArea( areaId: string | null ) {

        if( isAssigningArea.value ) return;

        isAssigningArea.value = true;

        try {

            await $fetch( `/api/${ venueSlug }/table/${ qrToken }/areas/assign`, {
                method: 'POST',
                body: {
                    playerId: playerStore.playerId,
                    areaId,
                },
            } );
            await refreshAreas();

        } catch( exception: unknown ) {

            const fetchError = exception as { data?: { message?: string } };

            toast.add( {
                color: 'error',
                description: fetchError.data?.message ?? t( 'lobby.area_join_error_toast' ),
                duration: 4000,
                icon: 'i-lucide-circle-alert',
            } );

        } finally {

            isAssigningArea.value = false;

        }

    }

    watch( wsError, error => {

        if( error ) {

            pendingSelectedGame.value = null;
            isSelectingGame.value = false;
            toast.remove( 'lobby-select-game-loading' );
            toast.remove( 'lobby-dating-send-loading' );
            datingAckTimeout.stop();
            isSendingDating.value = false;
            pendingDatingMessage.value = null;
            toast.add( {
                color: 'error',
                description: error,
                duration: 4000,
            } );
            wsError.value = null;

        }

    } );

    // Lancio gioco dal vivo (segnale emesso solo dai broadcast di sessione, mai
    // dall'hydration REST): porta tutti — host e non — sul gioco selezionato.
    // Un refresh o un rientro in lobby ricarica lo stato via REST senza emettere
    // il segnale, quindi non ri-trascina in partita: per quello c'è il banner
    // "Rientra in partita". Niente dipendenza dal clock del client.
    watch( () => gameLaunch.value, signal => {

        if( ! signal ) return;

        // Pulisci lo stato di loading dell'host che aveva appena selezionato.
        if( pendingSelectedGame.value ) {

            toast.remove( 'lobby-select-game-loading' );
            pendingSelectedGame.value = null;
            isSelectingGame.value = false;

        }

        navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/game/${ signal.game }` ) );

    } );

    watch( () => datingInbox.value[ 0 ], latestMessage => {

        if( ! latestMessage || ! pendingDatingMessage.value ) return;

        const isOwnAck = latestMessage.fromTableSessionId === playerStore.tableSessionId
            && latestMessage.toTableSessionId === pendingDatingMessage.value.toTableSessionId
            && latestMessage.body.trim() === pendingDatingMessage.value.body.trim();

        if( ! isOwnAck ) return;

        datingAckTimeout.stop();
        toast.remove( 'lobby-dating-send-loading' );
        isSendingDating.value = false;
        pendingDatingMessage.value = null;

    } );

    // Clear unread when dating panel is open
    watch( datingEnabled, enabled => {

        if( enabled ) clearDatingUnread();

    } );

    /**
     *
     */
    async function toggleDating() {

        // Guardia anti-spam: l'utente potrebbe cliccare ripetutamente il toggle.
        // Blocchiamo finché la POST non si risolve (lo stato reale arriva via realtime).
        if( isTogglingDating.value ) return;

        isTogglingDating.value = true;

        try {

            await ( datingEnabled.value ? disableDating() : enableDating() );

        } finally {

            isTogglingDating.value = false;

        }

    }

    /**
     *
     * @param isoString
     */
    function formatTime( isoString: string ): string {

        try {

            return new Date( isoString ).toLocaleTimeString( [], {
                hour: '2-digit',
                minute: '2-digit',
            } );

        } catch{

            return '';

        }

    }

    /**
     *
     */
    function onSendDating() {

        if( ! datingTarget.value || ! datingBody.value.trim() || isSendingDating.value ) return;

        const messageBody = datingBody.value.trim();

        isSendingDating.value = true;
        pendingDatingMessage.value = {
            body: messageBody,
            toTableSessionId: datingTarget.value,
        };
        toast.add( {
            id: 'lobby-dating-send-loading',
            color: 'primary',
            description: t( 'lobby.dating_message_sending_toast' ),
            duration: 0,
            icon: 'i-lucide-loader-2',
        } );
        sendDatingMessage( datingTarget.value, messageBody );
        datingAckTimeout.start();
        datingBody.value = '';

    }

    /**
     *
     * @param selectedGame
     */
    async function selectGame( selectedGame: 'thumbs' | 'word-blitz' ) {

        if( ! isHostSelector.value || gameSelection.value.lockedAt || isSelectingGame.value ) return;

        isSelectingGame.value = true;
        pendingSelectedGame.value = selectedGame;
        const selectingToastId = 'lobby-select-game-loading';

        toast.add( {
            id: selectingToastId,
            color: 'primary',
            description: t( 'lobby.game_select_pending_toast' ),
            duration: 0,
            icon: 'i-lucide-loader-2',
        } );

        try {

            await $fetch( `/api/${ venueSlug }/table/${ qrToken }/game/select`, {
                method: 'POST',
                body: {
                    selectedGame,
                    gameMode: 'default',
                    playerId: playerStore.playerId,
                },
            } );

        } catch( exception: unknown ) {

            pendingSelectedGame.value = null;
            isSelectingGame.value = false;
            toast.remove( selectingToastId );
            const fetchError = exception as { data?: { message?: string } };

            toast.add( {
                color: 'error',
                description: fetchError.data?.message ?? t( 'lobby.game_select_error_toast' ),
                duration: 4500,
                icon: 'i-lucide-circle-alert',
            } );

        }

    }

    /**
     * Termina la partita in corso e sblocca la selezione (solo host). Lo stato
     * aggiornato arriva a tutti via broadcast (games + table_sessions).
     */
    async function endGame() {

        if( isEndingGame.value ) return;

        isEndingGame.value = true;

        try {

            await $fetch( `/api/${ venueSlug }/table/${ qrToken }/game/end`, {
                method: 'POST',
                body: { playerId: playerStore.playerId },
            } );
            toast.add( {
                color: 'success',
                description: t( 'lobby.game_end_success_toast' ),
                duration: 2500,
                icon: 'i-lucide-check-circle-2',
            } );

        } catch( exception: unknown ) {

            const fetchError = exception as { data?: { message?: string } };

            toast.add( {
                color: 'error',
                description: fetchError.data?.message ?? t( 'lobby.game_end_error_toast' ),
                duration: 4500,
                icon: 'i-lucide-circle-alert',
            } );

        } finally {

            isEndingGame.value = false;

        }

    }

    /**
     *
     */
    async function handleLeave() {

        if( isLeaving.value ) return;
        isLeaving.value = true;
        const leavingToastId = 'lobby-leaving-loading';

        toast.add( {
            id: leavingToastId,
            color: 'primary',
            description: t( 'lobby.leave_pending_toast' ),
            duration: 0,
            icon: 'i-lucide-loader-2',
        } );

        try {

            // Rimuove la riga del giocatore (e fa scadere la sessione se resta
            // vuota): best-effort, in caso di errore resta la pulizia a TTL.
            await $fetch( `/api/${ venueSlug }/table/${ qrToken }/leave`, {
                method: 'POST',
                body: { playerId: playerStore.playerId },
            } ).catch( () => null );

            close();
            playerStore.leave();
            await navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }` ) );
            toast.remove( leavingToastId );

        } catch( exception: unknown ) {

            toast.remove( leavingToastId );
            const fetchError = exception as { data?: { message?: string } };

            toast.add( {
                color: 'error',
                description: fetchError.data?.message ?? t( 'lobby.leave_error_toast' ),
                duration: 4500,
                icon: 'i-lucide-circle-alert',
            } );

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
