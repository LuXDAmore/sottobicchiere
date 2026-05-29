import { z } from 'zod';

import type { Json } from '../../../../../../shared/types/database';

import { getActiveGame } from '../../../../../utils/game-engine';
import { requireHostSession, requireTable } from '../../../../../utils/request';

const payloadSchema = z.object( { playerId: z.string().uuid() } );

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
        , { playerId } = parsed.data
        , { session } = await requireHostSession( event, client, playerId )
        , game = await getActiveGame( client, session.id );

    if( ! game ) {

        throw createError( {
            statusCode: 409,
            statusMessage: 'NO_GAME',
            message: 'Nessuna partita da avanzare.',
        } );

    }
    if( game.phase !== 'reveal' ) {

        throw createError( {
            statusCode: 409,
            statusMessage: 'NOT_REVEAL',
            message: game.phase === 'voting' ? 'La votazione è ancora in corso.' : 'Nessuna partita da avanzare.',
        } );

    }

    const nextIndex = game.round_index + 1
        , questions = ( game.questions ?? [] ) as { it: string; en: string }[];

    if( nextIndex >= game.total_rounds ) {

        await client.from( 'games' ).update( {
            phase: 'finished',
            revealed_votes: null,
        } ).eq( 'id', game.id );
        return {
            ok: true,
            phase: 'finished',
        };

    }

    await client
        .from( 'games' )
        .update( {
            round_index: nextIndex,
            current_question: ( questions[ nextIndex ] ?? null ) as unknown as Json,
            phase: 'voting',
            voted_count: 0,
            revealed_votes: null,
        } )
        .eq( 'id', game.id );

    return {
        ok: true,
        phase: 'voting',
        roundIndex: nextIndex,
    };

} );
