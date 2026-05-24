import type { ClientMessage, ServerMessage } from '../../../shared/types/ws';
import type { PlayerColor } from '../../../shared/utils/colors';

import { and, eq, gt } from 'drizzle-orm';

import { tableSessions } from '../../db/schema';
import { createDatingInboxMessage, getRoomStatus, isTableAvailable, mapDatingRoom, removeTableFromDatingRoom, setTableAvailability, validateDatingMessage } from '../../utils/dating-room';
import { getPeersForTable, registerTablePeer, unregisterTablePeer } from '../../utils/table-ws-broker';
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

// Per-peer dating state (in-memory, not persisted)
const peerDatingEnabled = new Map<string, boolean>(); // peerId → enabled
const sessionDatingPeerCount = new Map<string, number>(); // tableSessionId → count of dating-enabled peers

function setPeerDating( peerId: string, tableSessionId: string, enabled: boolean ): void {
    const wasEnabled = peerDatingEnabled.get( peerId ) ?? false;
    if( wasEnabled === enabled ) return;
    peerDatingEnabled.set( peerId, enabled );
    const current = sessionDatingPeerCount.get( tableSessionId ) ?? 0;
    const updated = enabled ? current + 1 : Math.max( 0, current - 1 );
    sessionDatingPeerCount.set( tableSessionId, updated );
    setTableAvailability( tableSessionId, updated > 0 );
}

function cleanupPeerDating( peerId: string, tableSessionId: string ): void {
    if( peerDatingEnabled.get( peerId ) ) setPeerDating( peerId, tableSessionId, false );
    peerDatingEnabled.delete( peerId );
}

export default defineWebSocketHandler( {

    async open( peer ) {

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
            peer.close();
            return;

        }

        const session = getOrCreateSession( tableSessionId );

        addPlayer( session, peer.id, {
            color: color as PlayerColor,
            id: playerId,
            nickname,
        } );

        peer.subscribe( topic( tableSessionId ) );
        registerTablePeer( tableSessionId, peer.id, peer );

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
        const persistedSession = await db.select({ selectedGame: tableSessions.selectedGame, gameMode: tableSessions.gameMode, lockedAt: tableSessions.lockedAt, hostPlayerId: tableSessions.hostPlayerId, sessionMode: tableSessions.sessionMode })
            .from(tableSessions)
            .where(and(eq(tableSessions.id, tableSessionId), gt(tableSessions.expiresAt, new Date())))
            .limit(1)
            .then(( rows: any[] ) => rows[0] ?? null);

        if (persistedSession?.selectedGame && persistedSession.hostPlayerId) {
            emit(peer, { type: 'game:selected', selectedGame: persistedSession.selectedGame, gameMode: persistedSession.gameMode ?? null, hostPlayerId: persistedSession.hostPlayerId });
        }

        if (persistedSession?.sessionMode) {
            emit(peer, { type: 'session:mode:sync', mode: persistedSession.sessionMode as 'board' | 'dating' | 'preserata' });
            setTableAvailability(tableSessionId, persistedSession.sessionMode === 'dating');
            const status = getRoomStatus(tableSessionId);
            emit(peer, { type: 'dating:room:status', availableTableSessionIds: status.available, unavailableTableSessionIds: status.unavailable });
        }

        if (persistedSession?.lockedAt) {
            emit(peer, { type: 'game:locked', lockedAt: persistedSession.lockedAt.toISOString() });
        }


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

    async message( peer, message ) {

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


        if( data.type === 'session:mode:set' ) {

            const persistedSession = await db
                .select( { hostPlayerId: tableSessions.hostPlayerId } )
                .from( tableSessions )
                .where( and( eq( tableSessions.id, tableSessionId ), gt( tableSessions.expiresAt, new Date() ) ) )
                .limit( 1 )
                .then( ( rows: { hostPlayerId: string | null }[] ) => rows[ 0 ] ?? null );

            if( !persistedSession ) {
                emit( peer, { type: 'error', message: 'Sessione non trovata' } );
                return;
            }

            const hostPlayerId = persistedSession.hostPlayerId ?? playerId;

            if( hostPlayerId !== playerId ) {
                emit( peer, { type: 'error', message: 'Solo host può impostare la modalità' } );
                return;
            }

            await db.update( tableSessions )
                .set( { sessionMode: data.mode, hostPlayerId } )
                .where( and( eq( tableSessions.id, tableSessionId ), gt( tableSessions.expiresAt, new Date() ) ) );

            setTableAvailability( tableSessionId, data.mode === 'dating' );
            broadcast( peer, tableSessionId, { type: 'session:mode:sync', mode: data.mode } );
            const status = getRoomStatus( tableSessionId );
            broadcast( peer, tableSessionId, { type: 'dating:room:status', availableTableSessionIds: status.available, unavailableTableSessionIds: status.unavailable } );
            return;

        }

        if( data.type === 'dating:enable' ) {

            setPeerDating( peer.id, tableSessionId, true );
            emit( peer, { type: 'dating:status', enabled: true } );
            const status = getRoomStatus( tableSessionId );
            emit( peer, { type: 'dating:room:status', availableTableSessionIds: status.available, unavailableTableSessionIds: status.unavailable } );
            return;

        }

        if( data.type === 'dating:disable' ) {

            setPeerDating( peer.id, tableSessionId, false );
            emit( peer, { type: 'dating:status', enabled: false } );
            return;

        }

        if( data.type === 'dating:message:send' ) {

            if( ! ( peerDatingEnabled.get( peer.id ) ?? false ) ) {
                emit( peer, { type: 'error', message: 'Abilita la dating mode prima di inviare messaggi' } );
                return;
            }

            if( !isTableAvailable( data.toTableSessionId ) ) {
                emit( peer, { type: 'error', message: 'Tavolo destinatario non disponibile' } );
                return;
            }

            const reason = validateDatingMessage( data.body, Date.now(), playerId, tableSessionId, data.toTableSessionId );

            if( reason ) {
                emit( peer, { type: 'error', message: reason } );
                return;
            }

            mapDatingRoom( tableSessionId, data.toTableSessionId );
            const datingMessage = createDatingInboxMessage( tableSessionId, data.toTableSessionId, data.body );

            broadcast( peer, tableSessionId, { type: 'dating:message:new', message: datingMessage } );

            const targetPeers = getPeersForTable( data.toTableSessionId );
            for( const targetPeer of targetPeers ) {
                targetPeer.send( JSON.stringify( { type: 'dating:message:new', message: datingMessage } ) );
            }

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

            if( session.game.phase !== 'reveal' ) {

                emit( peer, {
                    message: session.game.phase === 'voting' ? 'Voting still in progress' : 'No active game to advance',
                    type: 'error',
                } );
                return;

            }

            const game = nextRound( session );

            if( ! game ) {

                emit( peer, {
                    message: 'Failed to advance round',
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
            , tableSessionId = url.searchParams.get( 'tableSessionId' ) ?? '';

        if( ! tableSessionId ) return;

        cleanupPeerDating( peer.id, tableSessionId );
        unregisterTablePeer( tableSessionId, peer.id );

        if( getPeersForTable( tableSessionId ).length === 0 ) {
            removeTableFromDatingRoom( tableSessionId );
        }

        const session = findSession( tableSessionId );

        if( ! session ) return;

        const player = removePlayer( session, peer.id );

        // Auto-reveal if the departing player was the last one who hadn't voted
        if( player && session.game?.phase === 'voting' ) {

            const votedCount = session.game.votes.size
                , totalCount = session.players.size;

            if( totalCount > 0 && votedCount >= totalCount ) {

                const revealed = revealRound( session );

                if( revealed ) {

                    broadcast( peer, tableSessionId, {
                        ... revealed,
                        type: 'game:reveal',
                    } );

                }

            }

        }

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
