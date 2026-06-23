<template>
    <div class="flex flex-col gap-6 items-center justify-center min-h-screen px-4 py-12">

        <!-- Loading skeleton -->
        <template v-if="tableInfoStatus === 'pending'">
            <div class="max-w-sm space-y-4 w-full">
                <div class="text-center">
                    <u-skeleton class="mb-4 mx-auto rounded-3xl size-16" />
                    <u-skeleton class="h-4 mx-auto w-36" />
                    <u-skeleton class="h-9 mt-3 mx-auto w-52" />
                </div>
                <u-skeleton class="h-48 rounded-xl w-full" />
            </div>
        </template>

        <!-- Error state -->
        <template v-else-if="tableError">
            <div class="max-w-sm text-center w-full">
                <u-icon class="mb-4 size-12 text-error-500" name="i-lucide-qr-code-off" />
                <h1 class="font-bold font-display text-2xl text-highlighted">
                    {{ $t('table.invalid_qr_title') }}
                </h1>
                <p class="mt-2 text-muted text-sm">
                    {{ $t('table.invalid_qr_description') }}
                </p>
                <u-button
                    class="mt-4"
                    color="neutral"
                    icon="i-lucide-refresh-cw"
                    :label="$t('lobby.reconnect')"
                    variant="soft"
                    @click="refreshTableInfo()"
                />
            </div>
        </template>

        <!-- Join form -->
        <template v-else-if="tableInfo">

            <!-- Venue + table header -->
            <div class="text-center">
                <div aria-hidden="true" class="bg-primary-500 flex items-center justify-center mb-4 mx-auto rounded-3xl shadow-[var(--shadow-lift)] size-16">
                    <u-icon class="size-8 text-white" name="i-lucide-dice-6" />
                </div>
                <p class="font-semibold text-muted text-sm tracking-wide uppercase">
                    {{ tableInfo.venueKind === 'adhoc' ? $t('table.room_label') : tableInfo.venueName }}
                </p>
                <h1 class="font-bold font-display text-4xl text-highlighted">
                    {{ tableInfo.venueKind === 'adhoc' ? tableInfo.venueName : $t('table.table_number', { n: tableInfo.tableNumber }) }}
                </h1>
            </div>

            <div class="max-w-sm space-y-4 w-full">

                <!-- Active sessions list -->
                <template v-if="sessions.length > 0">
                    <div>
                        <p class="font-semibold mb-3 text-highlighted text-sm">
                            {{ $t('table.active_sessions_title') }}
                        </p>
                        <div class="space-y-2">
                            <button
                                v-for="session in sessions"
                                :key="session.sessionId"
                                class="bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 hover:bg-primary-500/5 hover:border-primary-500/50 px-4 py-3 rounded-xl text-left transition-all w-full"
                                :class="selectedSessionId === session.sessionId ? 'border-primary-500/70 bg-primary-500/8 ring-1 ring-primary-500/30' : ''"
                                @click="pickSession(session.sessionId)"
                            >
                                <div class="flex gap-3 items-center justify-between">
                                    <div class="min-w-0">
                                        <p class="font-semibold text-highlighted text-sm truncate">
                                            {{ session.hostNickname ? $t('table.session_host_label', { name: session.hostNickname }) : $t('table.session_join') }}
                                        </p>
                                        <p class="mt-0.5 text-muted text-xs">
                                            {{ $t('table.session_players', { n: session.playerCount }) }}
                                        </p>
                                    </div>
                                    <div class="flex gap-2 items-center shrink-0">
                                        <span v-if="session.hasActiveGame" class="bg-accent-500/15 flex font-semibold gap-1 items-center px-2 py-0.5 rounded-full text-accent-500 text-xs">
                                            <u-icon class="size-3" name="i-lucide-gamepad-2" />
                                            {{ $t('table.session_game_in_progress') }}
                                        </span>
                                        <u-icon
                                            class="shrink-0 size-4"
                                            :class="selectedSessionId === session.sessionId ? 'text-primary-500' : 'text-muted'"
                                            :name="selectedSessionId === session.sessionId ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
                                        />
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    <!-- Separator -->
                    <div class="flex gap-3 items-center">
                        <div class="bg-[var(--ui-border)] flex-1 h-px" />
                        <p class="shrink-0 text-muted text-xs">
                            {{ $t('table.or_create_new') }}
                        </p>
                        <div class="bg-[var(--ui-border)] flex-1 h-px" />
                    </div>

                    <!-- Create new group button -->
                    <button
                        class="border border-[var(--ui-border)] border-dashed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 hover:bg-primary-500/5 hover:border-primary-500/50 px-4 py-3 rounded-xl text-left transition-all w-full"
                        :class="selectedSessionId === null ? 'border-primary-500/50 bg-primary-500/5' : ''"
                        @click="pickSession(null)"
                    >
                        <div class="flex gap-3 items-center">
                            <div class="bg-primary-500/10 flex items-center justify-center rounded-full size-8">
                                <u-icon class="size-4 text-primary-500" name="i-lucide-plus" />
                            </div>
                            <p class="font-semibold text-highlighted text-sm">
                                {{ $t('table.create_table_button') }}
                            </p>
                        </div>
                    </button>
                </template>

                <!-- Nickname form card -->
                <u-card :ui="{ body: 'flex flex-col gap-5 p-6' }">
                    <div class="text-center">
                        <p class="font-semibold text-highlighted">
                            {{ $t('table.join_title') }}
                        </p>
                        <p class="mt-1 text-muted text-sm">
                            {{ $t('table.join_description') }}
                        </p>
                    </div>

                    <u-form
                        class="flex flex-col gap-5"
                        :schema="joinSchema"
                        :state="state"
                        @submit="handleJoin"
                    >
                        <u-form-field :label="$t('table.nickname_label')" name="nickname">
                            <u-input
                                v-model="state.nickname"
                                autocomplete="off"
                                class="w-full"
                                :disabled="joining"
                                maxlength="20"
                                :placeholder="$t('table.nickname_placeholder')"
                                size="xl"
                                spellcheck="false"
                            />
                        </u-form-field>

                        <u-form-field
                            v-if="selectedSessionId === null"
                            :hint="$t('table.group_hint')"
                            :label="$t('table.group_label')"
                            name="groupName"
                        >
                            <u-input
                                v-model="state.groupName"
                                autocomplete="off"
                                class="w-full"
                                :disabled="joining"
                                maxlength="30"
                                :placeholder="$t('table.group_placeholder')"
                                size="xl"
                                spellcheck="false"
                            />
                        </u-form-field>

                        <u-button
                            block
                            :disabled="! state.nickname.trim() || joining"
                            :label="selectedSessionId ? $t('table.join_table_button') : $t('table.create_table_button')"
                            :loading="joining"
                            size="xl"
                            type="submit"
                        />

                        <p v-if="joinError" class="text-center text-error-500 text-sm">
                            {{ joinError }}
                        </p>
                    </u-form>
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
    import { z } from 'zod';

    import { useSupabaseAnonReady } from '~/composables/useSupabaseAnonReady';

    const route = useRoute()
          , { t } = useI18n()
          , playerStore = usePlayerStore()
          , ensureSupabaseAnonReady = useSupabaseAnonReady()
          , localePath = useLocalePath()
          , venueSlug = route.params.venue as string
          , qrToken = route.params.token as string
          , joinSchema = z.object( {
              nickname: z.string().trim().min( 1, t( 'table.nickname_required' ) ).max( 20 ),
              groupName: z.string().max( 30 ).optional(),
          } )
          , state = reactive( {
              nickname: '',
              groupName: '',
          } )
          , joining = ref( false )
          , joinError = ref<string | null>( null )
          , selectedSessionId = ref<string | null>( null )
          , toast = useToast()

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
              refresh: refreshSessions,
          } = await useLazyAsyncData(
              `table-sessions-${ venueSlug }-${ qrToken }`,
              () => $fetch<{ sessions: ActiveSessionSummary[] }>( `/api/${ venueSlug }/table/${ qrToken }/sessions` ),
              { default: () => ( { sessions: [] } ) },
          )

          , sessions = computed( () => sessionsData.value?.sessions ?? [] )

          // Diventa true appena l'utente sceglie esplicitamente (un gruppo o "crea nuovo"):
          // da quel momento non sovrascriviamo più la sua scelta con il default.
          , hasManualSelection = ref( false );

    // Default: chi arriva da un link/QR condiviso vuole entrare nel gruppo già al
    // tavolo, non crearne uno nuovo. Quando i gruppi attivi si caricano preselezioniamo
    // il più recente (primo in lista, ordinata per started_at desc). Resta possibile
    // creare un nuovo gruppo, ma l'azione prominente diventa "Unisciti".
    watch( sessions, list => {

        if( hasManualSelection.value ) return;
        // Se l'utente sta già compilando il form, non spostargli la selezione sotto le
        // mani: cambierebbe l'azione (Crea→Unisciti) e farebbe sparire il campo gruppo
        // (layout shift). In quel caso resta valida la sua intenzione implicita.
        if( state.nickname.trim() !== '' || state.groupName.trim() !== '' ) return;
        selectedSessionId.value = list.length > 0 ? list[ 0 ]!.sessionId : null;

    }, { immediate: true } );

    /**
     * Selezione esplicita di un gruppo (o "crea nuovo" con null): blocca il default
     * automatico così la scelta dell'utente non viene più sovrascritta.
     * @param sessionId - id della sessione scelta, o null per crearne una nuova.
     */
    function pickSession( sessionId: string | null ) {

        hasManualSelection.value = true;
        selectedSessionId.value = sessionId;

    }

    // La lista delle sessioni attive è idratata in SSR e poi riusata dalla cache di
    // useLazyAsyncData: un tavolo creato DOPO il primo render non comparirebbe mai
    // senza un reload manuale. Chi apre il link d'invito mentre l'host sta ancora
    // creando la sessione resterebbe quindi "da solo" (creerebbe una sessione a parte
    // invece di unirsi a quella esistente). Teniamo la lista viva lato client: un
    // refresh al mount sconfigge l'eventuale payload SSR vuoto/stale, un polling
    // leggero fa comparire la sessione appena creata in tempo reale.
    const { pause: pauseSessionsPoll, resume: resumeSessionsPoll } = useIntervalFn( () => refreshSessions(), 5000, { immediate: false } )
          , visibility = useDocumentVisibility();

    // Tab in primo piano: riprendi il polling (e aggiorna subito); in background
    // mettilo in pausa per non sprecare richieste.
    watch( visibility, value => {

        if( value === 'visible' ) {

            refreshSessions();
            resumeSessionsPoll();

        } else pauseSessionsPoll();

    } );

    onMounted( () => {

        // Sessione scaduta rimasta in localStorage (es. browser riaperto il giorno
        // dopo): pulisci lo store, così il form riparte da zero invece di portarsi
        // dietro dati morti nei flussi successivi.
        if( playerStore.isJoined && playerStore.isExpired ) playerStore.leave();

        if( playerStore.isJoined && ! playerStore.isExpired && playerStore.venueSlug === venueSlug && playerStore.qrToken === qrToken ) {

            navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/lobby` ) );
            return;

        }

        // Resta sulla pagina di join: idrata di nuovo le sessioni dal client e avvia
        // il polling finché l'utente non entra (la pagina si smonta alla navigazione,
        // e useIntervalFn si ferma da sé allo smontaggio dello scope).
        refreshSessions();
        resumeSessionsPoll();

    } );

    /**
     *
     * @param event
     * @param event.data
     * @param event.data.nickname
     * @param event.data.groupName
     */
    async function handleJoin( event: { data: { nickname: string; groupName?: string } } ) {

        const trimmed = event.data.nickname;

        if( ! trimmed || joining.value ) return;

        joining.value = true;
        joinError.value = null;

        const loadingToastId = 'join-table-loading';

        toast.add( {
            id: loadingToastId,
            color: 'primary',
            description: t( 'table.join_pending_toast' ),
            duration: 0,
            icon: 'i-lucide-loader-2',
        } );

        const isCreating = selectedSessionId.value === null;

        try {

            if( ! await ensureSupabaseAnonReady() ) throw new Error( t( 'table.join_error_generic' ) );

            const data = await $fetch<JoinResponse>( `/api/${ venueSlug }/table/${ qrToken }/join`, {
                method: 'POST',
                body: {
                    nickname: trimmed,
                    groupName: isCreating ? ( event.data.groupName?.trim() || undefined ) : undefined,
                    createSession: isCreating,
                    sessionId: selectedSessionId.value ?? undefined,
                },
            } );

            playerStore.join( data );

            toast.remove( loadingToastId );
            toast.add( {
                color: 'success',
                description: t( 'table.join_success_toast', { name: trimmed } ),
                duration: 2500,
                icon: 'i-lucide-check-circle-2',
            } );

            await ( data.hasActiveGame && data.selectedGame ? navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/game/${ data.selectedGame }` ) ) : navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/lobby` ) ) );

        } catch( exception: unknown ) {

            toast.remove( loadingToastId );
            const fetchError = exception as { data?: { message?: string } };

            joinError.value = fetchError.data?.message ?? t( 'table.join_error_generic' );
            toast.add( {
                color: 'error',
                description: joinError.value,
                duration: 4500,
                icon: 'i-lucide-circle-alert',
            } );

        } finally {

            joining.value = false;

        }

    }

    useHead( {
        meta: [
            {
                content: computed( () => t( 'app.description' ) ),
                name: 'description',
            },
        ],
        title: computed( () => {

            if( ! tableInfo.value ) return t( 'app.name' );

            // Stanza ad-hoc: il nome è l'identità (niente "Tavolo 1" fuorviante).
            return tableInfo.value.venueKind === 'adhoc'
                ? tableInfo.value.venueName
                : t( 'table.page_title', {
                    n: tableInfo.value.tableNumber,
                    venue: tableInfo.value.venueName,
                } );

        } ),
    } );
</script>
