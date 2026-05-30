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
        , player = await requirePlayer( event, client, parsed.data.playerId );

    const { error } = await client
        .from( 'table_sessions' )
        .update( { dating_enabled: false } )
        .eq( 'id', player.table_session_id );

    if( error ) throw createError( {
        statusCode: 500,
        statusMessage: 'DATING_UPDATE_FAILED',
        message: 'Non sono riuscito a disattivare il dating. Riprova.',
    } );

    return {
        ok: true,
        enabled: false,
    };

} );
