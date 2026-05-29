import { z } from 'zod';

import { requireHostSession, requireTable } from '../../../../../utils/request';

const payloadSchema = z.object( {
    playerId: z.string().uuid(),
    mode: z.enum( [
        'board',
        'dating',
        'preserata',
    ] ),
} );

export default defineEventHandler( async event => {

    const parsed = payloadSchema.safeParse( await readBody( event ) );

    if( ! parsed.success ) {

        throw createError( {
            statusCode: 422,
            statusMessage: 'INVALID_PAYLOAD',
            message: 'Modalità non valida.',
        } );

    }

    const { client } = await requireTable( event )
        , { playerId, mode } = parsed.data
        , { session } = await requireHostSession( client, playerId )

        // L'UPDATE viene propagato ai client dal trigger di broadcast su table_sessions.
        , { error } = await client
            .from( 'table_sessions' )
            .update( { session_mode: mode } )
            .eq( 'id', session.id );

    if( error ) {

        throw createError( {
            statusCode: 500,
            statusMessage: 'MODE_SET_FAILED',
            message: 'Non è stato possibile cambiare modalità. Riprova.',
        } );

    }

    return {
        ok: true,
        mode,
    };

} );
