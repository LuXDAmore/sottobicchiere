import { z } from 'zod';

import { getActiveGameLite } from '../../../../../utils/game-engine';
import { requireHostSession, requireTable } from '../../../../../utils/request';

const payloadSchema = z.object( { playerId: z.string().uuid() } );

// Termina la partita corrente e sblocca la selezione del gioco (solo host):
// la sessione torna alla lobby "libera" e si può scegliere un altro gioco.
// Entrambi gli UPDATE vengono propagati ai client dai trigger di broadcast.
export default defineEventHandler( async event => {

    const parsed = payloadSchema.safeParse( await readBody( event ) );

    if( ! parsed.success ) {

        throw createError( {
            statusCode: 422,
            statusMessage: 'INVALID_PAYLOAD',
            message: 'Richiesta non valida.',
        } );

    }

    const { client, table } = await requireTable( event )
        , { session } = await requireHostSession( event, client, parsed.data.playerId, table.tableId )

        , game = await getActiveGameLite( client, session.id );

    // Partita in corso → segnala la fine ai client (podio/risultati correnti).
    if( game && game.phase !== 'finished' ) {

        const { error: gameError } = await client
            .from( 'games' )
            .update( { phase: 'finished' } )
            .eq( 'id', game.id );

        if( gameError ) {

            throw createError( {
                statusCode: 500,
                statusMessage: 'GAME_END_FAILED',
                message: 'Non è stato possibile terminare la partita. Riprova.',
            } );

        }

    }

    // Sblocca la selezione: la lobby può scegliere un nuovo gioco.
    const { error: sessionError } = await client
        .from( 'table_sessions' )
        .update( {
            selected_game: null,
            game_mode: null,
            locked_at: null,
        } )
        .eq( 'id', session.id );

    if( sessionError ) {

        throw createError( {
            statusCode: 500,
            statusMessage: 'GAME_UNLOCK_FAILED',
            message: 'Non è stato possibile sbloccare la selezione del gioco. Riprova.',
        } );

    }

    return { ok: true };

} );
