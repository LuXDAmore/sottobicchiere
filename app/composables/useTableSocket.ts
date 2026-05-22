import type { ClientMessage, ServerMessage, WsPlayer } from '../../shared/types/ws';

export interface ThumbsClientState {
    phase: 'finished' | 'reveal' | 'voting' | 'waiting';
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

/**
 *
 */
export function useTableSocket() {

    const playerStore = usePlayerStore()
        , { protocol, host } = useRequestURL()

        , players = ref<WsPlayer[]>( [] )
        , gameState = ref<ThumbsClientState | null>( null )
        , wsError = ref<string | null>( null )

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

        , {
            send: wsSend, status, open, close,
        } = useWebSocket(
            wsUrl,
            {
                autoReconnect: {
                    delay: 2000,
                    retries: 5,
                },
                immediate: false,
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

    /**
     *
     * @param message
     */
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

            case 'error': {

                wsError.value = message.message;
                break;

            }

            default: {

                break;

            }
        }

    }

    /**
     *
     * @param message
     */
    function send( message: ClientMessage ) {

        wsSend( JSON.stringify( message ) );

    }

    /**
     *
     * @param totalRounds
     */
    function startGame( totalRounds = 10 ) {

        send( {
            totalRounds,
            type: 'game:start',
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

        send( {
            type: 'game:vote',
            vote: choice,
        } );

    }

    /**
     *
     */
    function nextRound() {

        send( { type: 'game:next' } );

    }

    const isHost = computed( () =>
        gameState.value?.hostPlayerId === playerStore.playerId );

    return {
        close,
        gameState,
        isHost,
        nextRound,
        open,
        players,
        startGame,
        status,
        vote,
        wsError,
    };

}
