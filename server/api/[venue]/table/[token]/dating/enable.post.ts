import { z } from 'zod';

import { requirePlayer, requireTable } from '../../../../../utils/request';

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
        , player = await requirePlayer( client, parsed.data.playerId );

    // Cambio di dating_enabled → trigger annuncia la disponibilità sulla lobby dating.
    await client
        .from( 'table_sessions' )
        .update( { dating_enabled: true } )
        .eq( 'id', player.table_session_id );

    return {
        ok: true,
        enabled: true,
    };

} );
