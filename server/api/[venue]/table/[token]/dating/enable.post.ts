import { z } from 'zod';

import { requirePlayerForTable, requireTable } from '../../../../../utils/request';

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

    const { client, table } = await requireTable( event )
        , { player } = await requirePlayerForTable( event, client, parsed.data.playerId, table.tableId );

    // Cambio di dating_enabled → trigger annuncia la disponibilità sulla lobby dating.
    const { error } = await client
        .from( 'table_sessions' )
        .update( { dating_enabled: true } )
        .eq( 'id', player.table_session_id );

    if( error ) throw createError( {
        statusCode: 500,
        statusMessage: 'DATING_UPDATE_FAILED',
        message: 'Non sono riuscito ad attivare il dating. Riprova.',
    } );

    return {
        ok: true,
        enabled: true,
    };

} );
