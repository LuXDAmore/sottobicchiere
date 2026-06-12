import type { VoteChoice } from '../../shared/types/realtime';

import { type Question, THUMBS_QUESTIONS, shuffleQuestions } from './questions';

/**
 * Prepara le domande di una nuova partita "thumbs".
 * @param totalRounds - round richiesti (limitati al numero di domande disponibili).
 */
export function buildGameRounds( totalRounds = 10 ): { questions: Question[]; totalRounds: number } {

    const requestedRounds = Number.isFinite( totalRounds )
            ? Math.trunc( totalRounds )
            : 1
        , rounds = Math.min( Math.max( 1, requestedRounds ), THUMBS_QUESTIONS.length )
        , questions = shuffleQuestions( THUMBS_QUESTIONS ).slice( 0, rounds );

    return {
        questions,
        totalRounds: rounds,
    };

}

/**
 * Calcola i punteggi del round svelato: +1 a chi ha votato con la maggioranza
 * (nessun punto in caso di parità). Server-authoritative, eseguito solo al reveal.
 * @param votes - mappa playerId → voto del round.
 * @param currentScores - punteggi cumulati prima del reveal.
 */
export function computeReveal(
    votes: Record<string, VoteChoice>,
    currentScores: Record<string, number>
): { scores: Record<string, number>; votes: Record<string, VoteChoice> } {

    const entries = Object.entries( votes )
        , upCount = entries.filter( ( [ , v ] ) => v === 'up' ).length
        , downCount = entries.length - upCount
        , majority: VoteChoice | null = upCount > downCount ? 'up' : ( downCount > upCount ? 'down' : null )

        , scores: Record<string, number> = { ... currentScores };

    if( majority ) {

        for( const [ playerId, vote ] of entries )

            if( vote === majority ) scores[ playerId ] = ( scores[ playerId ] ?? 0 ) + 1;

    }

    return {
        scores,
        votes,
    };

}
