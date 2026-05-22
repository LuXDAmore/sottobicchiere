import type { ClientMessage, ServerMessage } from '../../../shared/types/ws';
import type { PlayerColor } from '../../../shared/utils/colors';

import {
    addPlayer,
    cleanupSession,
    findSession,
    getOrCreateSession,
    getPlayers,
    nextRound,
    registerVote,
    removePlayer,
    revealRound,
    startGame,
} from '../../utils/game-state';

/**
 *
 * @param tableSessionId
 */
function topic( tableSessionId: string ): string {

    return `game-${ tableSessionId }`;

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
 * @param tableSessionId
 * @param message
 */
function broadcast(
    peer: { publish( t: string, data: string ): void },
    tableSessionId: string,
    message: ServerMessage
): void {

    peer.publish( topic( tableSessionId ), JSON.stringify( message ) );

}

export default defineWebSocketHandler( {

    open( peer ) {

        const url = new URL( peer.request.url ?? '', 'http://x' )
            , tableSessionId = url.searchParams.get( 'tableSessionId' ) ?? ''
            , playerId = url.searchParams.get( 'playerId' ) ?? ''
            , nickname = url.searchParams.get( 'nickname' ) ?? ''
            , color = url.searchParams.get( 'color' ) ?? '';

        if( ! tableSessionId || ! playerId || ! nickname || ! color ) {

            emit( peer, {
                message: 'Missing connection params',
                type: 'error',
            } );
            return;

        }

        const session = getOrCreateSession( tableSessionId );

        addPlayer( session, peer.id, {
            color: color as PlayerColor,
            id: playerId,
            nickname,
        } );

        peer.subscribe( topic( tableSessionId ) );

        broadcast( peer, tableSessionId, {
            player: {
                color: color as PlayerColor,
                id: playerId,
                nickname,
            },
            type: 'player:joined',
        } );

        emit( peer, {
            players: getPlayers( session ),
            type: 'players:sync',
        } );

        // Re-sync game state for reconnecting players across all active phases
        if( session.game ) {

            const g = session.game;

            switch( g.phase ) {
                case 'voting': {

                    emit( peer, {
                        hostPlayerId: g.hostPlayerId,
                        question: g.currentQuestion,
                        roundIndex: g.roundIndex,
                        totalRounds: g.totalRounds,
                        type: 'game:question',
                    } );
                    break;

                }
                case 'reveal': {

                    emit( peer, {
                        hostPlayerId: g.hostPlayerId,
                        question: g.currentQuestion,
                        roundIndex: g.roundIndex,
                        totalRounds: g.totalRounds,
                        type: 'game:question',
                    } );
                    emit( peer, {
                        scores: Object.fromEntries( g.scores ),
                        type: 'game:reveal',
                        votes: Object.fromEntries( g.votes ),
                    } );
                    break;

                }
                case 'finished': {

                    emit( peer, {
                        scores: Object.fromEntries( g.scores ),
                        type: 'game:finished',
                    } );
                    break;

                }
                default: {

                    break;

                }
            }

        }

    },

    message( peer, message ) {

        const url = new URL( peer.request.url ?? '', 'http://x' )
            , tableSessionId = url.searchParams.get( 'tableSessionId' ) ?? ''
            , playerId = url.searchParams.get( 'playerId' ) ?? '';

        if( ! tableSessionId || ! playerId ) {

            emit( peer, {
                message: 'Missing connection params',
                type: 'error',
            } );
            return;

        }

        const session = getOrCreateSession( tableSessionId );

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

            broadcast( peer, tableSessionId, questionMessage );
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

            broadcast( peer, tableSessionId, ack );
            emit( peer, ack );

            if( result.allVoted ) {

                const revealed = revealRound( session );

                if( revealed ) {

                    const revealMessage: ServerMessage = {
                        ... revealed,
                        type: 'game:reveal',
                    };

                    broadcast( peer, tableSessionId, revealMessage );
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

                broadcast( peer, tableSessionId, finishedMessage );
                emit( peer, finishedMessage );

            } else {

                const questionMessage: ServerMessage = {
                    hostPlayerId: game.hostPlayerId,
                    question: game.currentQuestion,
                    roundIndex: game.roundIndex,
                    totalRounds: game.totalRounds,
                    type: 'game:question',
                };

                broadcast( peer, tableSessionId, questionMessage );
                emit( peer, questionMessage );

            }

        }

    },

    close( peer ) {

        const url = new URL( peer.request.url ?? '', 'http://x' )
            , tableSessionId = url.searchParams.get( 'tableSessionId' ) ?? ''
            , session = getOrCreateSession( tableSessionId )

            , player = removePlayer( session, peer.id );

        if( player ) {

            setTimeout( () => {

                // Only broadcast player:left if the player hasn't reconnected during the grace period
                const currentSession = findSession( tableSessionId );

                if( ! currentSession || ! currentSession.players.has( player.id ) ) {

                    broadcast( peer, tableSessionId, {
                        playerId: player.id,
                        type: 'player:left',
                    } );

                }

            }, 500 );

        }

        cleanupSession( tableSessionId );

    },

    error( _peer, error ) {

        console.error( '[ws/table]', error );

    },

} );
