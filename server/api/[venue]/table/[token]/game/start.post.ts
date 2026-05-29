import { z } from 'zod';

import type { Json } from '../../../../../../shared/types/database';

import { getActiveGame } from '../../../../../utils/game-engine';
import { buildGameRounds } from '../../../../../utils/game-thumbs';
import { requireHostSession, requireTable } from '../../../../../utils/request';

const payloadSchema = z.object( {
    playerId: z.string().uuid(),
    totalRounds: z.number().int().min( 1 ).max( 20 ).optional(),
} );

export default defineEventHandler( async event => {

    const parsed = payloadSchema.safeParse( await readBody( event ) );

    if( ! parsed.success ) {

        throw createError( {
            statusCode: 422,
            statusMessage: 'INVALID_PAYLOAD',
            message: 'Richiesta non valida.',
        } );

    }

    const { client } = await requireTable( event )
        , { playerId, totalRounds = 10 } = parsed.data
        , { session } = await requireHostSession( client, playerId )
        , tableSessionId = session.id

        // Non ripartire se una partita è già in corso.
        , existing = await getActiveGame( client, tableSessionId );

    if( existing && existing.phase !== 'finished' ) {

        throw createError( {
            statusCode: 409,
            statusMessage: 'GAME_IN_PROGRESS',
            message: 'Una partita è già in corso.',
        } );

    }

    const { data: players } = await client
            .from( 'player_sessions' )
            .select( 'id' )
            .eq( 'table_session_id', tableSessionId )

        , playerIds = ( players ?? [] ).map( p => p.id );

    if( playerIds.length < 2 ) {

        throw createError( {
            statusCode: 422,
            statusMessage: 'NOT_ENOUGH_PLAYERS',
            message: 'Servono almeno 2 giocatori per iniziare.',
        } );

    }

    const { questions, totalRounds: rounds } = buildGameRounds( totalRounds )
        , scores = Object.fromEntries( playerIds.map( id => [ id, 0 ] ) )

        // upsert: una sola partita per sessione (sostituisce eventuale partita conclusa).
        , { error } = await client
            .from( 'games' )
            .upsert( {
                table_session_id: tableSessionId,
                kind: 'thumbs',
                phase: 'voting',
                round_index: 0,
                total_rounds: rounds,
                questions: questions as unknown as Json,
                current_question: ( questions[ 0 ] ?? null ) as unknown as Json,
                scores,
                voted_count: 0,
                total_count: playerIds.length,
                revealed_votes: null,
                host_player_id: playerId,
            }, { onConflict: 'table_session_id' } );

    if( error ) {

        throw createError( {
            statusCode: 500,
            statusMessage: 'GAME_START_FAILED',
            message: 'Non è stato possibile avviare la partita. Riprova.',
        } );

    }

    // Round nuovo: rimuovi eventuali voti residui di una partita precedente.
    if( existing ) await client.from( 'votes' ).delete().eq( 'game_id', existing.id );

    return {
        ok: true,
        totalRounds: rounds,
    };

} );
