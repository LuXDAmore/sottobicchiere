import type { RealtimeChannel } from '@supabase/supabase-js';

import type { Database } from '../../shared/types/database';
import type { DatingInboxMessage, DatingRoomStatus, LobbyGameSelection, SessionMode, ThumbsClientState, WsPlayer } from '../../shared/types/realtime';
import type { PlayerColor } from '../../shared/utils/colors';

interface PresenceMeta { id: string; nickname: string; color: PlayerColor }
type ConnectionStatus = 'CLOSED' | 'CONNECTING' | 'OPEN';

// Mantiene la stessa API pubblica del vecchio composable WebSocket: le pagine
// (lobby, thumbs, word-blitz) non cambiano. Il trasporto è ora Supabase Realtime:
//  • presence       → elenco giocatori online sul channel "table:<id>"
//  • broadcast da DB → stato partita/sessione (trigger su games/table_sessions)
//  • azioni          → POST alle API server (autorità sullo stato di gioco)
const _useTableSocket = createGlobalState( () => {

    const playerStore = usePlayerStore()
        , supabase = useSupabaseClient<Database>()

        , players = ref<WsPlayer[]>( [] )
        , gameState = ref<ThumbsClientState | null>( null )
        , wsError = ref<string | null>( null )
        , gameSelection = ref<LobbyGameSelection>( {
            selectedGame: null,
            gameMode: null,
            lockedAt: null,
            hostPlayerId: null,
        } )
        , sessionMode = ref<SessionMode>( 'board' )
        , datingEnabled = ref<boolean>( false )
        , datingUnreadCount = ref<number>( 0 )
        , datingInbox = ref<DatingInboxMessage[]>( [] )
        , datingRoomStatus = ref<DatingRoomStatus>( {
            availableTableSessionIds: [],
            unavailableTableSessionIds: [],
        } )
        , status = ref<ConnectionStatus>( 'CLOSED' );

    let tableChannel: RealtimeChannel | null = null
        , lobbyChannel: RealtimeChannel | null = null
        , presenceSyncTimer: ReturnType<typeof setTimeout> | null = null
        , hostClaimTimer: ReturnType<typeof setTimeout> | null = null
        , lastRoundIndex = - 1;

    const apiBase = () => `/api/${ playerStore.venueSlug }/table/${ playerStore.qrToken }`;

    /**
     *
     * @param path
     * @param body
     */
    async function post<T = unknown>( path: string, body: Record<string, unknown> ): Promise<T | null> {

        try {

            wsError.value = null;
            return await $fetch( `${ apiBase() }${ path }`, {
                method: 'POST',
                body,
            } ) as T;

        } catch( exception ) {

            const e = exception as { data?: { message?: string }; statusMessage?: string };

            wsError.value = e?.data?.message ?? e?.statusMessage ?? 'Si è verificato un errore. Riprova.';
            return null;

        }

    }

    // ── Mapping righe DB → stato client ──────────────────────────────────────

    /**
     *
     * @param record
     */
    function mapGame( record: Database['public']['Tables']['games']['Row'] ) {

        const isNewRound = record.phase === 'voting' && record.round_index !== lastRoundIndex;

        if( isNewRound ) lastRoundIndex = record.round_index;

        gameState.value = {
            hostPlayerId: record.host_player_id,
            myVote: isNewRound ? null : ( gameState.value?.myVote ?? null ),
            phase: record.phase as ThumbsClientState['phase'],
            question: ( record.current_question as { it: string; en: string } | null ) ?? {
                it: '',
                en: '',
            },
            roundIndex: record.round_index,
            scores: ( record.scores as Record<string, number> ) ?? {},
            totalCount: record.total_count,
            totalRounds: record.total_rounds,
            votedCount: record.voted_count,
            votes: record.phase === 'reveal' ? ( record.revealed_votes as Record<string, 'down' | 'up'> | null ) : null,
        };

    }

    /**
     *
     * @param record
     */
    function mapSession( record: Database['public']['Tables']['table_sessions']['Row'] ) {

        gameSelection.value = {
            gameMode: record.game_mode,
            hostPlayerId: record.host_player_id,
            lockedAt: record.locked_at,
            selectedGame: record.selected_game,
        };
        sessionMode.value = record.session_mode as SessionMode;
        datingEnabled.value = record.dating_enabled;

    }

    // ── Handler broadcast (eventi generati dai trigger DB) ───────────────────

    /**
     *
     * @param message
     * @param message.payload
     */
    function handleDatabaseBroadcast( message: { payload?: Record<string, unknown> } ) {

        const body = message.payload ?? {}
            , table = body.table as string | undefined
            , record = body.record as Record<string, unknown> | undefined;

        if( ! record ) return;

        if( table === 'games' ) mapGame( record as Database['public']['Tables']['games']['Row'] );
        else if( table === 'table_sessions' ) mapSession( record as Database['public']['Tables']['table_sessions']['Row'] );

    }

    /**
     *
     * @param message
     * @param message.payload
     */
    function handleDatingMessage( message: { payload?: Record<string, unknown> } ) {

        const body = message.payload ?? {}
            , record = body.record as Database['public']['Tables']['dating_messages']['Row'] | undefined;

        if( ! record ) return;

        const inboxMessage: DatingInboxMessage = {
            body: record.body,
            createdAt: record.created_at,
            fromTableSessionId: record.from_table_session_id,
            id: record.id,
            toTableSessionId: record.to_table_session_id,
        };

        datingInbox.value = [ inboxMessage, ... datingInbox.value ].slice( 0, 100 );

        // Conta come non letto solo i messaggi in arrivo, non i propri.
        if( record.to_table_session_id === playerStore.tableSessionId ) datingUnreadCount.value += 1;

    }

    /**
     * Riassegnazione host lato client. Su Supabase non c'è una connessione
     * persistente: quando l'host esce sparisce solo dalla presence. I client
     * superstiti eleggono in modo deterministico (id più piccolo tra gli online)
     * un successore; SOLO l'eletto chiama `/session/claim-host`. Il debounce evita
     * chiamate ripetute a ogni `presence sync`. Il server resta l'autorità: valida
     * l'elezione sui membri reali e applica un update ottimistico con guardia.
     */
    function maybeClaimHost() {

        const onlineIds = players.value.map( p => p.id )
            , currentHost = gameSelection.value.hostPlayerId ?? gameState.value?.hostPlayerId ?? null;

        // Nessun online o host ancora presente: niente da rivendicare.
        if( onlineIds.length === 0 ) return;
        if( currentHost && onlineIds.includes( currentHost ) ) return;

        // Elezione deterministica: l'id più piccolo tra gli online vince.
        const winner = onlineIds.toSorted()[ 0 ];

        // Rivendica solo se sono io l'eletto, altrimenti aspetto.
        if( winner !== playerStore.playerId ) return;

        if( hostClaimTimer ) clearTimeout( hostClaimTimer );

        hostClaimTimer = setTimeout( () => {

            post( '/session/claim-host', {
                playerId: playerStore.playerId,
                online: onlineIds,
            } ).catch( () => { /* best-effort: la prossima presence sync riproverà */ } );

        }, 600 );

    }

    /**
     *
     */
    function syncPresence() {

        if( ! tableChannel ) return;

        const state = tableChannel.presenceState<PresenceMeta>()
            , seen = new Map<string, WsPlayer>();

        for( const key of Object.keys( state ) ) {

            const meta = state[ key ]?.[ 0 ];

            // La presence key è l'id canonico (impostata su track con il proprio
            // playerId). meta.id è payload controllato dal client: usare la key
            // come source-of-truth e scartare i mismatch evita lo spoofing di id
            // online (e quindi di quorum/elezione host).
            if( meta && meta.id === key ) {

                seen.set( key, {
                    color: meta.color,
                    id: key,
                    nickname: meta.nickname,
                } );

            }

        }

        players.value = [ ... seen.values() ];

        // Se l'host è uscito, i superstiti eleggono un successore (solo l'eletto chiama).
        maybeClaimHost();

        // L'host comunica al server i presenti: è il quorum dei voti, così
        // l'auto-reveal scatta e l'uscita di qualcuno non blocca il round.
        if( isHost.value && gameState.value?.phase === 'voting' ) {

            if( presenceSyncTimer ) clearTimeout( presenceSyncTimer );

            presenceSyncTimer = setTimeout( () => {

                $fetch( `${ apiBase() }/game/presence`, {
                    method: 'POST',
                    body: {
                        playerId: playerStore.playerId,
                        online: players.value.map( p => p.id ),
                    },
                } ).catch( () => { /* best-effort */ } );

            }, 400 );

        }

    }

    // ── Stato iniziale (REST) ────────────────────────────────────────────────

    /**
     *
     */
    async function loadInitialState() {

        try {

            const [ selection, datingRooms, game ] = await Promise.all( [
                $fetch<LobbyGameSelection & { sessionMode: SessionMode; datingEnabled: boolean }>( `${ apiBase() }/game/current`, { query: { session: playerStore.tableSessionId } } ),
                $fetch<DatingRoomStatus>( `${ apiBase() }/dating/rooms`, { query: { self: playerStore.tableSessionId } } ),
                $fetch<Database['public']['Tables']['games']['Row'] | null>( `${ apiBase() }/game/state`, { query: { session: playerStore.tableSessionId } } ),
            ] );

            if( selection ) {

                gameSelection.value = {
                    gameMode: selection.gameMode,
                    hostPlayerId: selection.hostPlayerId,
                    lockedAt: selection.lockedAt,
                    selectedGame: selection.selectedGame,
                };
                sessionMode.value = selection.sessionMode;
                datingEnabled.value = selection.datingEnabled;

            }
            if( datingRooms ) datingRoomStatus.value = datingRooms;

            // Allinea chi entra/ricarica a partita in corso (il realtime invia solo i cambi).
            if( game ) mapGame( game );

        } catch{ /* non bloccante: il realtime allineerà lo stato */ }

    }

    /**
     *
     */
    async function refreshDatingRooms() {

        try {

            datingRoomStatus.value = await $fetch<DatingRoomStatus>( `${ apiBase() }/dating/rooms`, { query: { self: playerStore.tableSessionId } } );

        } catch{ /* ignore */ }

    }

    // ── Ciclo di vita connessione ────────────────────────────────────────────

    /**
     *
     */
    async function open() {

        if( ! playerStore.tableSessionId || ! playerStore.playerId ) return;
        if( tableChannel ) return;

        status.value = 'CONNECTING';

        // Assicura che il token corrente sia noto al realtime (channel privati).
        await supabase.auth.getSession();
        await supabase.realtime.setAuth();

        const meta: PresenceMeta = {
            color: ( playerStore.playerColor ?? '#6366F1' ) as PlayerColor,
            id: playerStore.playerId,
            nickname: playerStore.playerNickname ?? '',
        };

        tableChannel = supabase
            .channel( `table:${ playerStore.tableSessionId }`, {
                config: {
                    private: true,
                    presence: { key: playerStore.playerId },
                },
            } )
            .on( 'broadcast', { event: 'INSERT' }, handleDatabaseBroadcast )
            .on( 'broadcast', { event: 'UPDATE' }, handleDatabaseBroadcast )
            .on( 'broadcast', { event: 'DELETE' }, handleDatabaseBroadcast )
            .on( 'broadcast', { event: 'dating:message' }, handleDatingMessage )
            .on( 'presence', { event: 'sync' }, syncPresence )
            .subscribe( async statusValue => {

                switch( statusValue ) {
                    case 'SUBSCRIBED': {

                        status.value = 'OPEN';
                        await tableChannel?.track( meta );
                        await loadInitialState();

                        break;

                    }
                    case 'CLOSED': {

                        status.value = 'CLOSED';
                        break;

                    }
                    case 'CHANNEL_ERROR':
                    case 'TIMED_OUT': {

                        status.value = 'CONNECTING';
                        wsError.value = 'Connessione interrotta, riprovo…';

                        break;

                    }
                // No default
                }

            } );

        // Lobby dating condivisa: aggiorna l'elenco tavoli disponibili in tempo reale.
        lobbyChannel = supabase
            .channel( 'dating:lobby', { config: { private: true } } )
            .on( 'broadcast', { event: 'dating:availability' }, () => {

                refreshDatingRooms();

            } )
            .subscribe();

    }

    /**
     *
     */
    async function close() {

        // Solo disconnessione dal realtime: il record del giocatore resta nel DB
        // (come con il vecchio WS), così navigare tra lobby e gioco o ricaricare
        // la pagina non distrugge la sessione. La pulizia avviene a scadenza.
        if( presenceSyncTimer ) {

            clearTimeout( presenceSyncTimer );
            presenceSyncTimer = null;

        }

        if( hostClaimTimer ) {

            clearTimeout( hostClaimTimer );
            hostClaimTimer = null;

        }

        // Azzera i riferimenti in modo SINCRONO prima di awaitare l'unsubscribe.
        // Navigando tra pagine (lobby → gioco) l'onUnmounted chiama close() e
        // l'onMounted della nuova pagina chiama open(): se i ref fossero ancora
        // valorizzati durante l'await, open() farebbe early-return su `if(tableChannel)`
        // e la connessione resterebbe morta (banner "disconnesso"). Catturando i
        // channel in locali e azzerando subito i ref, un open() concorrente ricrea
        // sempre un channel pulito mentre il vecchio viene smaltito qui sotto.
        const closingTable = tableChannel
            , closingLobby = lobbyChannel;

        tableChannel = null;
        lobbyChannel = null;
        status.value = 'CLOSED';

        if( closingTable ) {

            await closingTable.unsubscribe();
            await supabase.removeChannel( closingTable );

        }

        if( closingLobby ) {

            await closingLobby.unsubscribe();
            await supabase.removeChannel( closingLobby );

        }

    }

    // ── Azioni di gioco / sessione ───────────────────────────────────────────

    /**
     *
     * @param totalRounds
     */
    function startGame( totalRounds = 10 ) {

        return post( '/game/start', {
            playerId: playerStore.playerId,
            totalRounds,
        } );

    }

    /**
     *
     * @param choice
     */
    function vote( choice: 'down' | 'up' ) {

        if( gameState.value ) {

            gameState.value = {
                ... gameState.value,
                myVote: choice,
            };

        }

        return post( '/game/vote', {
            playerId: playerStore.playerId,
            vote: choice,
        } );

    }

    /**
     *
     */
    function nextRound() {

        return post( '/game/next', { playerId: playerStore.playerId } );

    }

    /**
     *
     * @param mode
     */
    function setSessionMode( mode: SessionMode ) {

        return post( '/session/mode', {
            playerId: playerStore.playerId,
            mode,
        } );

    }

    /**
     *
     */
    function enableDating() {

        return post( '/dating/enable', { playerId: playerStore.playerId } );

    }

    /**
     *
     */
    function disableDating() {

        return post( '/dating/disable', { playerId: playerStore.playerId } );

    }

    /**
     *
     * @param toTableSessionId
     * @param body
     */
    function sendDatingMessage( toTableSessionId: string, body: string ) {

        return post( '/dating/message', {
            playerId: playerStore.playerId,
            toTableSessionId,
            body,
        } );

    }

    /**
     *
     */
    function clearDatingUnread() {

        datingUnreadCount.value = 0;

    }

    const isHost = computed( () => {

        const host = gameSelection.value.hostPlayerId ?? gameState.value?.hostPlayerId ?? null;

        return host ? host === playerStore.playerId : playerStore.isHost;

    } );

    return {
        clearDatingUnread,
        close,
        datingEnabled,
        datingInbox,
        datingRoomStatus,
        datingUnreadCount,
        disableDating,
        enableDating,
        gameSelection,
        gameState,
        isHost,
        nextRound,
        open,
        players,
        sendDatingMessage,
        sessionMode,
        setSessionMode,
        startGame,
        status,
        vote,
        wsError,
    };

} );

/**
 *
 */
export function useTableSocket() {

    return _useTableSocket();

}
