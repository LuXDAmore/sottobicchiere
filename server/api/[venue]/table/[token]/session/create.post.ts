import { requireTable } from '../../../../../utils/request';

export default defineEventHandler( async event => {

    const { client, table } = await requireTable( event )

        , { data: created, error } = await client
            .from( 'table_sessions' )
            .insert( { table_id: table.tableId } )
            .select( 'id, expires_at' )
            .single();

    if( error || ! created ) {

        throw createError( {
            statusCode: 500,
            statusMessage: 'SESSION_CREATE_FAILED',
            message: 'Non è stato possibile creare la sessione. Riprova tra qualche secondo.',
        } );

    }

    return {
        expiresAt: created.expires_at,
        tableSessionId: created.id,
    };

} );
