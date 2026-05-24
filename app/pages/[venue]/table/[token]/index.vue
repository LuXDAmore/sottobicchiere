<template>
    <div class="flex flex-col gap-6 items-center justify-center min-h-screen px-4 py-12">

        <!-- Loading skeleton -->
        <template v-if="tableInfoStatus === 'pending'">
            <div class="max-w-sm w-full space-y-4">
                <div class="text-center">
                    <u-skeleton class="mb-4 mx-auto rounded-3xl size-16" />
                    <u-skeleton class="h-4 mx-auto w-36" />
                    <u-skeleton class="h-9 mt-3 mx-auto w-52" />
                </div>
                <u-skeleton class="h-48 w-full rounded-xl" />
            </div>
        </template>

        <!-- Error state -->
        <template v-else-if="tableError">
            <div class="max-w-sm text-center w-full">
                <u-icon class="mb-4 size-12 text-error-500" name="i-lucide-qr-code-off" />
                <h1 class="font-bold font-display text-2xl text-highlighted">{{ $t('table.invalid_qr_title') }}</h1>
                <p class="mt-2 text-muted text-sm">{{ $t('table.invalid_qr_description') }}</p>
                <u-button class="mt-4" color="neutral" icon="i-lucide-refresh-cw" :label="$t('lobby.reconnect')" variant="soft" @click="refreshTableInfo()" />
            </div>
        </template>

        <!-- Join form -->
        <template v-else-if="tableInfo">

            <!-- Venue + table header -->
            <div class="text-center">
                <div aria-hidden="true" class="bg-primary-500 flex items-center justify-center mb-4 mx-auto rounded-3xl shadow-[var(--shadow-lift)] size-16">
                    <u-icon class="size-8 text-white" name="i-lucide-dice-6" />
                </div>
                <p class="font-semibold text-muted text-sm tracking-wide uppercase">{{ tableInfo.venueName }}</p>
                <h1 class="font-bold font-display text-4xl text-highlighted">{{ $t('table.table_number', { n: tableInfo.tableNumber }) }}</h1>
            </div>

            <div class="max-w-sm w-full space-y-4">

                <!-- Active sessions list -->
                <template v-if="sessions.length > 0">
                    <div>
                        <p class="font-semibold text-highlighted text-sm mb-3">{{ $t('table.active_sessions_title') }}</p>
                        <div class="space-y-2">
                            <button
                                v-for="session in sessions"
                                :key="session.sessionId"
                                class="w-full text-left rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] px-4 py-3 transition-all hover:border-primary-500/50 hover:bg-primary-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                                :class="selectedSessionId === session.sessionId ? 'border-primary-500/70 bg-primary-500/8 ring-1 ring-primary-500/30' : ''"
                                @click="selectedSessionId = session.sessionId"
                            >
                                <div class="flex items-center justify-between gap-3">
                                    <div class="min-w-0">
                                        <p class="font-semibold text-highlighted text-sm truncate">
                                            {{ session.hostNickname ? $t('table.session_host_label', { name: session.hostNickname }) : $t('table.session_join') }}
                                        </p>
                                        <p class="text-muted text-xs mt-0.5">
                                            {{ $t('table.session_players', { n: session.playerCount }) }}
                                        </p>
                                    </div>
                                    <div class="flex items-center gap-2 shrink-0">
                                        <span v-if="session.hasActiveGame" class="flex items-center gap-1 bg-accent-500/15 text-accent-500 px-2 py-0.5 rounded-full text-xs font-semibold">
                                            <u-icon class="size-3" name="i-lucide-gamepad-2" />
                                            {{ $t('table.session_game_in_progress') }}
                                        </span>
                                        <u-icon
                                            class="size-4 shrink-0"
                                            :class="selectedSessionId === session.sessionId ? 'text-primary-500' : 'text-muted'"
                                            :name="selectedSessionId === session.sessionId ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
                                        />
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    <!-- Separator -->
                    <div class="flex items-center gap-3">
                        <div class="flex-1 h-px bg-[var(--ui-border)]" />
                        <p class="text-muted text-xs shrink-0">{{ $t('table.or_create_new') }}</p>
                        <div class="flex-1 h-px bg-[var(--ui-border)]" />
                    </div>

                    <!-- Create new group button -->
                    <button
                        class="w-full text-left rounded-xl border border-dashed border-[var(--ui-border)] px-4 py-3 transition-all hover:border-primary-500/50 hover:bg-primary-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        :class="selectedSessionId === null ? 'border-primary-500/50 bg-primary-500/5' : ''"
                        @click="selectedSessionId = null"
                    >
                        <div class="flex items-center gap-3">
                            <div class="flex items-center justify-center size-8 rounded-full bg-primary-500/10">
                                <u-icon class="size-4 text-primary-500" name="i-lucide-plus" />
                            </div>
                            <p class="font-semibold text-highlighted text-sm">{{ $t('table.create_table_button') }}</p>
                        </div>
                    </button>
                </template>

                <!-- Nickname form card -->
                <u-card :ui="{ body: 'flex flex-col gap-5 p-6' }">
                    <div class="text-center">
                        <p class="font-semibold text-highlighted">{{ $t('table.join_title') }}</p>
                        <p class="mt-1 text-muted text-sm">{{ $t('table.join_description') }}</p>
                    </div>

                    <u-form-group :label="$t('table.nickname_label')">
                        <u-input
                            ref="nicknameInput"
                            v-model="nickname"
                            autocomplete="off"
                            :disabled="joining"
                            maxlength="20"
                            :placeholder="$t('table.nickname_placeholder')"
                            size="xl"
                            spellcheck="false"
                            @keyup.enter="handleJoin"
                        />
                    </u-form-group>

                    <u-form-group v-if="selectedSessionId === null" :hint="$t('table.group_hint')" :label="$t('table.group_label')">
                        <u-input
                            v-model="groupName"
                            autocomplete="off"
                            :disabled="joining"
                            maxlength="30"
                            :placeholder="$t('table.group_placeholder')"
                            size="xl"
                            spellcheck="false"
                            @keyup.enter="handleJoin"
                        />
                    </u-form-group>

                    <u-button
                        block
                        :disabled="!nickname.trim() || joining"
                        :label="joining ? $t('table.joining') : (selectedSessionId ? $t('table.join_table_button') : $t('table.create_table_button'))"
                        :loading="joining"
                        size="xl"
                        @click="handleJoin"
                    />

                    <p v-if="joinError" class="text-center text-error-500 text-sm">{{ joinError }}</p>
                </u-card>

            </div>

            <p class="max-w-xs text-center text-muted text-xs">
                <u-icon class="inline-block mr-1 size-3" name="i-lucide-shield-check" />
                {{ $t('welcome.privacy_note') }}
            </p>

        </template>

    </div>
</template>

<script setup lang="ts">
const route = useRoute()
    , { t } = useI18n()
    , playerStore = usePlayerStore()
    , localePath = useLocalePath()
    , venueSlug = route.params.venue as string
    , qrToken = route.params.token as string
    , nickname = ref( '' )
    , groupName = ref( '' )
    , joining = ref( false )
    , joinError = ref<string | null>( null )
    , selectedSessionId = ref<string | null>( null )

    , {
        data: tableInfo,
        error: tableError,
        status: tableInfoStatus,
        refresh: refreshTableInfo,
    } = await useLazyAsyncData(
        `table-info-${ venueSlug }-${ qrToken }`,
        () => $fetch( `/api/${ venueSlug }/table/${ qrToken }` ),
    )

    , {
        data: sessionsData,
    } = await useLazyAsyncData(
        `table-sessions-${ venueSlug }-${ qrToken }`,
        () => $fetch<{ sessions: ActiveSessionSummary[] }>( `/api/${ venueSlug }/table/${ qrToken }/sessions` ),
        { default: () => ( { sessions: [] } ) },
    );

const sessions = computed( () => sessionsData.value?.sessions ?? [] );

onMounted( () => {
    if( playerStore.isJoined && ! playerStore.isExpired && playerStore.venueSlug === venueSlug && playerStore.qrToken === qrToken )
        navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/lobby` ) );
} );

async function handleJoin() {
    const trimmed = nickname.value.trim();
    if( ! trimmed || joining.value ) return;

    joining.value = true;
    joinError.value = null;

    const isCreating = selectedSessionId.value === null;

    try {
        const data = await $fetch<JoinResponse>( `/api/${ venueSlug }/table/${ qrToken }/join`, {
            method: 'POST',
            body: {
                nickname: trimmed,
                groupName: isCreating ? ( groupName.value.trim() || undefined ) : undefined,
                createSession: isCreating,
                sessionId: selectedSessionId.value ?? undefined,
            },
        } );

        playerStore.join( data );

        if( data.hasActiveGame && data.selectedGame ) {
            await navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/game/${ data.selectedGame }` ) );
        } else {
            await navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/lobby` ) );
        }
    } catch( exception: unknown ) {
        const fetchError = exception as { data?: { message?: string } };
        joinError.value = fetchError.data?.message ?? t( 'table.join_error_generic' );
    } finally {
        joining.value = false;
    }
}

useHead( {
    meta: [ { content: computed( () => t( 'app.description' ) ), name: 'description' } ],
    title: computed( () => ( tableInfo.value
        ? t( 'table.page_title', { n: tableInfo.value.tableNumber, venue: tableInfo.value.venueName } )
        : t( 'app.name' ) ) ),
} );
</script>
