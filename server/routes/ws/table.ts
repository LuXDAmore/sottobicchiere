import type { ClientMessage, ServerMessage } from '../../../shared/types/ws';

import {
    addPlayer,
    cleanupSession,
    getOrCreateSession,
    getPlayers,
    nextRound,
    registerVote,
    removePlayer,
    revealRound,
    startGame,
} from '../../utils/game-state';

interface GamePeerContext {
    tableSessionId: string;
    playerId: string;
    nickname: string;
    color: string;
}

/**
 *
 * @param peer
 * @param peer.context
 */
function context( peer: { context: Record<string, unknown> } ): GamePeerContext {

    return peer.context as unknown as GamePeerContext;

}

/**
 *
 * @param peer
 * @param peer.send
 * @param message
 */
function emit( peer: { send( data: string ): void }, message: ServerMessage ): void {

    peer.send( JSON.stringify( message ) );

}

/**
 *
 * @param peer
 * @param peer.publish
 * @param message
 */
function broadcast( peer: { publish( topic: string, data: string ): void }, message: ServerMessage ): void {

    peer.publish( 'game', JSON.stringify( message ) );

}

export default defineWebSocketHandler( {
    upgrade( request ) {

        const url = new URL( request.url ?? '', 'http://x' )
            , tableSessionId = url.searchParams.get( 'tableSessionId' ) ?? ''
            , playerId = url.searchParams.get( 'playerId' ) ?? ''
            , nickname = url.searchParams.get( 'nickname' ) ?? ''
            , color = url.searchParams.get( 'color' ) ?? '';

        if( ! tableSessionId || ! playerId || ! nickname || ! color )
            throw new Response( 'Missing params', { status: 400 } );

        return {
            context: {
                color,
                nickname,
                playerId,
                tableSessionId,
            },
            namespace: `table-${ tableSessionId }`,
        };

    },

    open( peer ) {

        const {
                tableSessionId, playerId, nickname, color,
            } = context( peer )

            , session = getOrCreateSession( tableSessionId );

        addPlayer( session, peer.id, {
            color,
            id: playerId,
            nickname,
        } );

        peer.subscribe( 'game' );

        broadcast( peer, {
            player: {
                color,
                id: playerId,
                nickname,
            },
            type: 'player:joined',
        } );
        emit( peer, {
            players: getPlayers( session ),
            type: 'players:sync',
        } );

        // Re-sync game state for reconnecting players
        if( session.game && session.game.phase === 'voting' ) {

            const g = session.game;

            emit( peer, {
                hostPlayerId: g.hostPlayerId,
                question: g.currentQuestion,
                roundIndex: g.roundIndex,
                totalRounds: g.totalRounds,
                type: 'game:question',
            } );

        }

    },

    message( peer, message ) {

        const { tableSessionId, playerId } = context( peer )
            , session = getOrCreateSession( tableSessionId );

        let data: ClientMessage;

        try {

            data = JSON.parse( message.text() ) as ClientMessage;

        } catch{

            emit( peer, {
                message: 'Invalid JSON',
                type: 'error',
            } );
            return;

        }

        if( data.type === 'game:start' ) {

            if( session.game && session.game.phase !== 'finished' ) {

                emit( peer, {
                    message: 'Game already in progress',
                    type: 'error',
                } );
                return;

            }

            const game = startGame( session, playerId, data.totalRounds ?? 10 );

            if( ! game ) {

                emit( peer, {
                    message: 'Need at least 2 players',
                    type: 'error',
                } );
                return;

            }

            const questionMessage: ServerMessage = {
                hostPlayerId: game.hostPlayerId,
                question: game.currentQuestion,
                roundIndex: game.roundIndex,
                totalRounds: game.totalRounds,
                type: 'game:question',
            };

            broadcast( peer, questionMessage );
            emit( peer, questionMessage );
            return;

        }

        if( data.type === 'game:vote' ) {

            const result = registerVote( session, playerId, data.vote );

            if( result.votedCount === 0 ) {

                emit( peer, {
                    message: 'No active voting round',
                    type: 'error',
                } );
                return;

            }

            const ack: ServerMessage = {
                totalCount: result.totalCount,
                type: 'game:vote-ack',
                votedCount: result.votedCount,
            };

            broadcast( peer, ack );
            emit( peer, ack );

            if( result.allVoted ) {

                const revealed = revealRound( session );

                if( revealed ) {

                    const revealMessage: ServerMessage = {
                        ... revealed,
                        type: 'game:reveal',
                    };

                    broadcast( peer, revealMessage );
                    emit( peer, revealMessage );

                }

            }
            return;

        }

        if( data.type === 'game:next' ) {

            if( ! session.game || session.game.hostPlayerId !== playerId ) {

                emit( peer, {
                    message: 'Only the host can advance rounds',
                    type: 'error',
                } );
                return;

            }

            const game = nextRound( session );

            if( ! game ) {

                emit( peer, {
                    message: 'No active game',
                    type: 'error',
                } );
                return;

            }

            if( game.phase === 'finished' ) {

                const finishedMessage: ServerMessage = {
                    scores: Object.fromEntries( game.scores ),
                    type: 'game:finished',
                };

                broadcast( peer, finishedMessage );
                emit( peer, finishedMessage );

            } else {

                const questionMessage: ServerMessage = {
                    hostPlayerId: game.hostPlayerId,
                    question: game.currentQuestion,
                    roundIndex: game.roundIndex,
                    totalRounds: game.totalRounds,
                    type: 'game:question',
                };

                broadcast( peer, questionMessage );
                emit( peer, questionMessage );

            }

        }

    },

    close( peer ) {

        const { tableSessionId } = context( peer )
            , session = getOrCreateSession( tableSessionId )

            , player = removePlayer( session, peer.id );

        if( player ) {

            setTimeout( () => {

                broadcast( peer, {
                    playerId: player.id,
                    type: 'player:left',
                } );

            }, 100 );

        }

        cleanupSession( tableSessionId );

    },

    error( _peer, error ) {

        console.error( '[ws/table]', error );

    },
} );
