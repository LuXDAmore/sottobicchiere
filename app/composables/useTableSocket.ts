export interface LobbyGameSelection {
    selectedGame: string | null;
    gameMode: string | null;
    lockedAt: string | null;
    hostPlayerId: string | null;
}

export interface ThumbsClientState {
    phase: 'finished' | 'reveal' | 'voting';
    roundIndex: number;
    totalRounds: number;
    question: { it: string; en: string };
    votedCount: number;
    totalCount: number;
    myVote: 'down' | 'up' | null;
    votes: Record<string, 'down' | 'up'> | null;
    scores: Record<string, number>;
    hostPlayerId: string;
}

const _useTableSocket = createGlobalState( () => {

    const playerStore = usePlayerStore()
        , { protocol, host } = useRequestURL()

        , players = ref<WsPlayer[]>( [] )
        , gameState = ref<ThumbsClientState | null>( null )
        , wsError = ref<string | null>( null )
        , gameSelection = ref<LobbyGameSelection>( { selectedGame: null, gameMode: null, lockedAt: null, hostPlayerId: null } )
        , sessionMode = ref<SessionMode>( 'board' )
        , datingEnabled = ref<boolean>( false )
        , datingUnreadCount = ref<number>( 0 )
        , datingInbox = ref<DatingInboxMessage[]>( [] )
        , datingRoomStatus = ref<{ availableTableSessionIds: string[]; unavailableTableSessionIds: string[] }>( { availableTableSessionIds: [], unavailableTableSessionIds: [] } )

        , wsUrl = computed<string | undefined>( () => {

            if( ! playerStore.tableSessionId || ! playerStore.playerId ) return;

            const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:'
                , parameters = new URLSearchParams( {
                    color: playerStore.playerColor ?? '',
                    nickname: playerStore.playerNickname ?? '',
                    playerId: playerStore.playerId,
                    tableSessionId: playerStore.tableSessionId,
                } );

            return `${ wsProtocol }//${ host }/ws/table?${ parameters.toString() }`;

        } )

        , _openCount = ref( 0 )

        , {
            send: wsSend, status, open: wsOpen, close: wsClose,
        } = useWebSocket(
            wsUrl,
            {
                autoReconnect: {
                    delay: 1500,
                    retries: 10,
                },
                heartbeat: {
                    interval: 15_000,
                    message: JSON.stringify( { type: 'ping' } ),
                },
                immediate: false,
                onConnected() {
                    // Re-register dating after auto-reconnect: server creates a new peer, so the
                    // per-peer flag resets. We restore the client-visible state transparently.
                    if( datingEnabled.value ) wsSend( JSON.stringify( { type: 'dating:enable' } ) );
                },
                async onMessage( _ws, event ) {

                    const text = typeof event.data === 'string'
                        ? event.data
                        : await ( event.data as Blob ).text();

                    let message: ServerMessage;

                    try {

                        message = JSON.parse( text ) as ServerMessage;

                    } catch{

                        return;

                    }

                    handleMessage( message );

                },
            }
        );

    function handleMessage( message: ServerMessage ) {

        switch( message.type ) {
            case 'players:sync': {

                players.value = message.players;
                break;

            }
            case 'player:joined': {

                if( ! players.value.some( p => p.id === message.player.id ) )
                    players.value = [ ... players.value, message.player ];

                break;

            }
            case 'player:left': {

                players.value = players.value.filter( p => p.id !== message.playerId );
                break;

            }
            case 'game:question': {

                gameState.value = {
                    hostPlayerId: message.hostPlayerId,
                    myVote: null,
                    phase: 'voting',
                    question: message.question,
                    roundIndex: message.roundIndex,
                    scores: gameState.value?.scores ?? {},
                    totalCount: players.value.length,
                    totalRounds: message.totalRounds,
                    votedCount: 0,
                    votes: null,
                };
                break;

            }
            case 'game:vote-ack': {

                if( gameState.value ) {

                    gameState.value = {
                        ... gameState.value,
                        totalCount: message.totalCount,
                        votedCount: message.votedCount,
                    };

                }

                break;

            }
            case 'game:reveal': {

                if( gameState.value ) {

                    gameState.value = {
                        ... gameState.value,
                        phase: 'reveal',
                        scores: message.scores,
                        votes: message.votes,
                    };

                }

                break;

            }
            case 'game:finished': {

                if( gameState.value ) {

                    gameState.value = {
                        ... gameState.value,
                        phase: 'finished',
                        scores: message.scores,
                        votes: null,
                    };

                }
                break;

            }
            case 'game:selected': {

                gameSelection.value = { ...gameSelection.value, selectedGame: message.selectedGame, gameMode: message.gameMode, hostPlayerId: message.hostPlayerId };
                break;

            }
            case 'game:locked': {

                gameSelection.value = { ...gameSelection.value, lockedAt: message.lockedAt };
                break;

            }
            case 'dating:status': {

                datingEnabled.value = message.enabled;
                break;

            }
            case 'dating:message:new': {

                datingInbox.value = [ message.message, ...datingInbox.value ].slice(0, 100);
                datingUnreadCount.value += 1;
                break;

            }
            case 'dating:room:status': {

                datingRoomStatus.value = {
                    availableTableSessionIds: message.availableTableSessionIds,
                    unavailableTableSessionIds: message.unavailableTableSessionIds,
                };
                break;

            }
            case 'session:mode:sync': {

                sessionMode.value = message.mode;
                break;

            }
            case 'error': {

                wsError.value = message.message;
                break;

            }
            default: {

                break;

            }
        }

    }

    function send( message: ClientMessage ) {

        wsSend( JSON.stringify( message ) );

    }

    function startGame( totalRounds = 10 ) {

        send( {
            totalRounds,
            type: 'game:start',
        } );

    }

    function vote( choice: 'down' | 'up' ) {

        if( gameState.value ) {

            gameState.value = {
                ... gameState.value,
                myVote: choice,
            };

        }

        send( {
            type: 'game:vote',
            vote: choice,
        } );

    }

    function setSessionMode( mode: SessionMode ) {

        send( { type: 'session:mode:set', mode } );

    }

    function enableDating() {

        send( { type: 'dating:enable' } );

    }

    function disableDating() {

        send( { type: 'dating:disable' } );

    }

    function sendDatingMessage( toTableSessionId: string, body: string ) {

        send( { type: 'dating:message:send', toTableSessionId, body } );

    }

    function clearDatingUnread() {

        datingUnreadCount.value = 0;

    }

    function nextRound() {

        send( { type: 'game:next' } );

    }

    // Reference-counted open/close so navigating between pages (lobby → game)
    // doesn't race: the new page's open() increments before the old page's
    // close() decrements, keeping the socket alive through transitions.
    function open() {
        _openCount.value++;
        wsOpen();
    }

    function close() {
        if( _openCount.value > 0 ) {
            _openCount.value--;
            if( _openCount.value === 0 ) wsClose();
        }
    }

    const isHost = computed( () => gameState.value?.hostPlayerId === playerStore.playerId );

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

export function useTableSocket() {

    return _useTableSocket();

}
