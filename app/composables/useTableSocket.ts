
import type { Database } from '../../shared/types/database';
import type {
    DatingInboxMessage,
    DatingRoomStatus,
    LobbyGameSelection,
    SessionMode,
    ThumbsClientState,
    WsPlayer,
} from '../../shared/types/realtime';
import type { PlayerColor } from '../../shared/utils/colors';
import type { RealtimeChannel } from '@supabase/supabase-js';

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

        // $i18n risolto al momento dell'uso (mai catturato): questo stato è un
        // singleton condiviso, in SSR terrebbe viva l'istanza della prima richiesta
        // (cross-request state pollution). Sul client `tryUseNuxtApp()` risolve
        // l'app anche nei callback realtime; il fallback copre solo l'SSR.
        , translateError = ( key: string, fallback: string ) => tryUseNuxtApp()?.$i18n.t( key ) ?? fallback

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
        // Contatore bumpato quando aree o iscrizioni cambiano (trigger DB `lobby:changed`):
        // la lobby lo osserva per rifare il fetch di aree/membri senza esporre righe.
        , lobbyVersion = ref<number>( 0 )
        , status = ref<ConnectionStatus>( 'CLOSED' );

    let tableChannel: RealtimeChannel | null = null
        , lobbyChannel: RealtimeChannel | null = null
        , presenceSyncTimer: ReturnType<typeof setTimeout> | null = null
        , hostClaimTimer: ReturnType<typeof setTimeout> | null = null
        , lastRoundIndex = - 1
        // Sessione a cui è agganciato tableChannel: open() la confronta con lo store
        // per riusare la connessione (stessa sessione) o ricrearla (sessione cambiata).
        , connectedSessionId: string | null = null
        // Smaltimento differito (vedi close()): il timer è la finestra di grazia tra
        // l'unmount di una pagina e il mount della successiva.
        , disposeTimer: ReturnType<typeof setTimeout> | null = null
        // Promise dello smaltimento in corso: open() la attende prima di creare un
        // nuovo channel, perché realtime-js riusa l'istanza per topic finché il
        // leave non è completato (un channel morente non è più sottoscrivibile).
        , disposalPromise: Promise<void> | null = null
        // Errori consecutivi di subscribe: il toast d'errore appare solo oltre la
        // soglia, prima è una normale attesa di riconnessione (rejoin con backoff).
        , consecutiveChannelErrors = 0;

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

            wsError.value = e?.data?.message ?? e?.statusMessage ?? translateError( 'error.generic', 'Si è verificato un errore. Riprova.' );
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

            const [
                selection,
                datingRooms,
                game,
            ] = await Promise.all( [
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

        // Cattura subito sessione e giocatore: gli await qui sotto lasciano spazio
        // a un leave/join concorrente e il channel deve restare coerente con i
        // valori per cui open() è stata chiamata.
        const sessionId = playerStore.tableSessionId
            , playerId = playerStore.playerId;

        if( ! sessionId || ! playerId ) return;

        // Navigazione lobby↔gioco: il close() della pagina precedente ha solo
        // schedulato lo smaltimento. Annullarlo qui mantiene viva la connessione
        // (il topic è lo stesso), senza flash di "disconnesso" né race sul channel.
        if( disposeTimer ) {

            clearTimeout( disposeTimer );
            disposeTimer = null;

        }

        if( tableChannel ) {

            // Channel vivo sulla stessa sessione: nulla da fare. Se invece lo status
            // è CLOSED il channel è morto (es. chiuso dal server): va ricreato,
            // altrimenti il bottone "Riconnetti" non avrebbe effetto.
            if( connectedSessionId === sessionId && status.value !== 'CLOSED' ) return;

            // Sessione cambiata (leave + join di un altro tavolo) o channel morto:
            // smaltisci il vecchio prima di crearne uno nuovo.
            disposalPromise = disposeChannels();

        }

        // realtime-js restituisce l'istanza ESISTENTE per lo stesso topic finché il
        // leave non è completato: creare il channel durante lo smaltimento darebbe
        // l'istanza morente (subscribe no-op, o throw su .on('presence')). Attendere
        // qui serializza chiusura e riapertura.
        if( disposalPromise ) await disposalPromise;

        // Un open() concorrente potrebbe aver già ricreato il channel durante l'await.
        if( tableChannel ) return;

        status.value = 'CONNECTING';

        // Assicura che il token corrente sia noto al realtime (channel privati).
        await supabase.auth.getSession();
        await supabase.realtime.setAuth();

        if( tableChannel ) return;

        const meta: PresenceMeta = {
            color: ( playerStore.playerColor ?? '#6366F1' ) as PlayerColor,
            id: playerId,
            nickname: playerStore.playerNickname ?? '',
        }

            , channel = supabase
                .channel( `table:${ sessionId }`, {
                    config: {
                        private: true,
                        presence: { key: playerId },
                    },
                } )
                .on( 'broadcast', { event: 'INSERT' }, handleDatabaseBroadcast )
                .on( 'broadcast', { event: 'UPDATE' }, handleDatabaseBroadcast )
                .on( 'broadcast', { event: 'DELETE' }, handleDatabaseBroadcast )
                .on( 'broadcast', { event: 'dating:message' }, handleDatingMessage )
                .on( 'broadcast', { event: 'lobby:changed' }, () => {

                    lobbyVersion.value += 1;

                } )
                .on( 'presence', { event: 'sync' }, syncPresence );

        tableChannel = channel;
        // eslint-disable-next-line require-atomic-updates -- falso positivo: gli early-return su `tableChannel` sopra impediscono open() concorrenti di arrivare qui
        connectedSessionId = sessionId;

        channel
            .subscribe( async statusValue => {

                // Ignora i callback di un channel non più corrente. Durante una
                // navigazione lobby↔gioco il vecchio channel viene smaltito con
                // unsubscribe() mentre il nuovo è già attivo: senza questa guardia
                // il suo CLOSED (o CONNECTING) sovrascriverebbe lo status del nuovo
                // channel, mostrando il banner "disconnesso" a connessione viva.
                if( channel !== tableChannel ) return;

                switch( statusValue ) {
                    case 'SUBSCRIBED': {

                        consecutiveChannelErrors = 0;
                        status.value = 'OPEN';
                        await channel.track( meta );
                        await loadInitialState();

                        break;

                    }
                    case 'CLOSED': {

                        status.value = 'CLOSED';
                        break;

                    }
                    case 'CHANNEL_ERROR':
                    case 'TIMED_OUT': {

                        // realtime-js rientra da solo con backoff: finché i tentativi
                        // sono pochi è una normale attesa (banner ambra), il toast
                        // d'errore scatta solo su fallimenti ripetuti.
                        status.value = 'CONNECTING';
                        consecutiveChannelErrors += 1;

                        if( consecutiveChannelErrors >= 3 )
                            wsError.value = translateError( 'error.connection_lost', 'Connessione interrotta, riprovo…' );

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
     * Chiusura "morbida": schedula lo smaltimento con una finestra di grazia.
     * Navigando tra le pagine del tavolo (lobby ↔ gioco) l'onUnmounted chiama
     * close() e l'onMounted successivo chiama open(), che annulla il timer: la
     * connessione resta viva (il topic è lo stesso) e non c'è né flash del banner
     * "disconnesso" né race sul riuso del channel in realtime-js. Solo un close()
     * "vero" (leave, uscita dal tavolo) arriva fino a disposeChannels().
     */
    function close() {

        if( disposeTimer ) clearTimeout( disposeTimer );

        disposeTimer = setTimeout( () => {

            disposeTimer = null;
            disposalPromise = disposeChannels();

        }, 250 );

    }

    /**
     * Disconnette davvero dal realtime e azzera lo stato condiviso. Il record del
     * giocatore resta nel DB (la pulizia avviene a scadenza), così un rientro o
     * un refresh non distruggono la sessione.
     */
    async function disposeChannels() {

        if( presenceSyncTimer ) {

            clearTimeout( presenceSyncTimer );
            presenceSyncTimer = null;

        }

        if( hostClaimTimer ) {

            clearTimeout( hostClaimTimer );
            hostClaimTimer = null;

        }

        // Azzera i riferimenti in modo SINCRONO prima di awaitare l'unsubscribe:
        // un open() concorrente (rientro immediato) trova i ref puliti e attende
        // disposalPromise prima di ricreare il channel.
        const closingTable = tableChannel
            , closingLobby = lobbyChannel;

        tableChannel = null;
        lobbyChannel = null;
        connectedSessionId = null;
        consecutiveChannelErrors = 0;
        status.value = 'CLOSED';

        // Stato di sessione azzerato: chi rientra (anche su un altro tavolo)
        // riparte pulito invece di vedere giocatori/partita del tavolo precedente.
        players.value = [];
        gameState.value = null;
        lastRoundIndex = - 1;
        gameSelection.value = {
            selectedGame: null,
            gameMode: null,
            lockedAt: null,
            hostPlayerId: null,
        };
        datingEnabled.value = false;
        datingUnreadCount.value = 0;
        datingInbox.value = [];
        datingRoomStatus.value = {
            availableTableSessionIds: [],
            unavailableTableSessionIds: [],
        };

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
        lobbyVersion,
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
