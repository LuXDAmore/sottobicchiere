import { z } from 'zod';

import { getActiveGameLite, recomputeAndMaybeReveal } from '../../../../../utils/game-engine';
import { requirePlayerForTable, requireTable } from '../../../../../utils/request';

const payloadSchema = z.object( {
    playerId: z.string().uuid(),
    vote: z.enum( [ 'up', 'down' ] ),
} );

export default defineEventHandler( async event => {

    const parsed = payloadSchema.safeParse( await readBody( event ) );

    if( ! parsed.success ) {

        throw createError( {
            statusCode: 422,
            statusMessage: 'INVALID_PAYLOAD',
            message: 'Voto non valido.',
        } );

    }

    const { client, table } = await requireTable( event )
        , { playerId, vote } = parsed.data
        , { player } = await requirePlayerForTable( event, client, playerId, table.tableId )
        , game = await getActiveGameLite( client, player.table_session_id );

    if( ! game || game.phase !== 'voting' ) {

        throw createError( {
            statusCode: 409,
            statusMessage: 'NO_ACTIVE_VOTE',
            message: 'Nessuna votazione attiva al momento.',
        } );

    }

    // Voto idempotente per round: l'ultima scelta vince.
    const { error } = await client
        .from( 'votes' )
        .upsert(
            {
                game_id: game.id,
                round_index: game.round_index,
                player_id: playerId,
                vote,
            },
            { onConflict: 'game_id,round_index,player_id' }
        );

    if( error ) {

        throw createError( {
            statusCode: 500,
            statusMessage: 'VOTE_FAILED',
            message: 'Non è stato possibile registrare il voto. Riprova.',
        } );

    }

    await recomputeAndMaybeReveal( client, game );

    return { ok: true };

} );
