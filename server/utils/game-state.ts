import type { Question } from './questions';
import type { WsPlayer } from '../../shared/types/ws';

import { THUMBS_QUESTIONS, shuffleQuestions } from './questions';

export interface TableSession {
    players: Map<string, WsPlayer & { peerId: string }>;
    game: ThumbsGameState | null;
}

export interface ThumbsGameState {
    phase: 'finished' | 'reveal' | 'voting' | 'waiting';
    roundIndex: number;
    totalRounds: number;
    questions: Question[];
    currentQuestion: Question;
    votes: Map<string, 'down' | 'up'>;
    scores: Map<string, number>;
    hostPlayerId: string;
}

const sessions = new Map<string, TableSession>();

/**
 *
 * @param tableSessionId
 */
export function getOrCreateSession( tableSessionId: string ): TableSession {

    let session = sessions.get( tableSessionId );

    if( ! session ) {

        session = {
            game: null,
            players: new Map(),
        };
        sessions.set( tableSessionId, session );

    }
    return session;

}

/**
 *
 * @param session
 * @param peerId
 * @param player
 */
export function addPlayer(
    session: TableSession,
    peerId: string,
    player: WsPlayer
): void {

    session.players.set( peerId, {
        ... player,
        peerId,
    } );

}

/**
 *
 * @param session
 * @param peerId
 */
export function removePlayer( session: TableSession, peerId: string ): WsPlayer | null {

    const player = session.players.get( peerId );

    if( ! player ) return null;
    session.players.delete( peerId );

    if( session.game ) {

        session.game.votes.delete( player.id );
        if( session.game.hostPlayerId === player.id ) {

            const next = session.players.values().next().value;

            if( next ) session.game.hostPlayerId = next.id;

        }

    }
    return player;

}

/**
 *
 * @param session
 */
export function getPlayers( session: TableSession ): WsPlayer[] {

    return [ ... session.players.values() ].map( p => ( {
        color: p.color,
        id: p.id,
        nickname: p.nickname,
    } ) );

}

/**
 *
 * @param session
 * @param hostPlayerId
 * @param totalRounds
 */
export function startGame(
    session: TableSession,
    hostPlayerId: string,
    totalRounds = 10
): ThumbsGameState | null {

    if( session.players.size < 2 ) return null;

    const rounds = Math.min( totalRounds, THUMBS_QUESTIONS.length )
        , questions = shuffleQuestions( THUMBS_QUESTIONS ).slice( 0, rounds )

        , scores = new Map<string, number>();

    for( const player of session.players.values() ) scores.set( player.id, 0 );

    session.game = {
        currentQuestion: questions[ 0 ]!,
        hostPlayerId,
        phase: 'voting',
        questions,
        roundIndex: 0,
        scores,
        totalRounds: rounds,
        votes: new Map(),
    };
    return session.game;

}

/**
 *
 * @param session
 * @param playerId
 * @param vote
 */
export function registerVote(
    session: TableSession,
    playerId: string,
    vote: 'down' | 'up'
): { allVoted: boolean; votedCount: number; totalCount: number } {

    if( ! session.game || session.game.phase !== 'voting' ) {

        return {
            allVoted: false,
            totalCount: 0,
            votedCount: 0,
        };

    }

    session.game.votes.set( playerId, vote );

    const votedCount = session.game.votes.size
        , totalCount = session.players.size;

    return {
        allVoted: votedCount >= totalCount,
        totalCount,
        votedCount,
    };

}

/**
 *
 * @param session
 */
export function revealRound( session: TableSession ): {
    votes: Record<string, 'down' | 'up'>;
    scores: Record<string, number>;
} | null {

    if( ! session.game || session.game.phase !== 'voting' ) return null;

    session.game.phase = 'reveal';

    // Award 1pt to majority side (or 0 if tie)
    const upCount = [ ... session.game.votes.values() ].filter( v => v === 'up' ).length
        , downCount = session.game.votes.size - upCount
        , majorityVote: 'down' | 'up' | null = upCount > downCount ? 'up' : ( downCount > upCount ? 'down' : null );

    if( majorityVote ) {

        for( const [ playerId, vote ] of session.game.votes ) {

            if( vote === majorityVote )
                session.game.scores.set( playerId, ( session.game.scores.get( playerId ) ?? 0 ) + 1 );

        }

    }

    return {
        scores: Object.fromEntries( session.game.scores ),
        votes: Object.fromEntries( session.game.votes ),
    };

}

/**
 *
 * @param session
 */
export function nextRound( session: TableSession ): ThumbsGameState | null {

    if( ! session.game || session.game.phase !== 'reveal' ) return null;

    const nextIndex = session.game.roundIndex + 1;

    if( nextIndex >= session.game.totalRounds ) {

        session.game.phase = 'finished';
        return session.game;

    }

    session.game.roundIndex = nextIndex;
    session.game.currentQuestion = session.game.questions[ nextIndex ]!;
    session.game.votes = new Map();
    session.game.phase = 'voting';
    return session.game;

}

/**
 *
 * @param tableSessionId
 */
export function cleanupSession( tableSessionId: string ): void {

    const session = sessions.get( tableSessionId );

    if( session && session.players.size === 0 ) sessions.delete( tableSessionId );

}
