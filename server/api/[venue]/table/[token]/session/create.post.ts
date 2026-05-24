import { tableSessions } from '../../../../../db/schema';
import { DEMO_TABLE_SESSION_ID } from '../../../../../utils/demo-session';
import { resolveTableRow } from '../../../../../utils/table-resolver';

export default defineEventHandler( async event => {

    const venueSlug = getRouterParam( event, 'venue' )
        , qrToken = getRouterParam( event, 'token' );

    if( ! venueSlug || ! qrToken ) throw createError( { statusCode: 400, statusMessage: 'MISSING_ROUTE_PARAMS', message: 'Parametri mancanti nel link. Controlla il QR code.' } );

    const tableRow = await resolveTableRow( venueSlug, qrToken );

    if( ! tableRow ) throw createError( { statusCode: 404, statusMessage: 'TABLE_NOT_FOUND', message: 'QR code non riconosciuto. Chiedi al personale del locale.' } );

    if( tableRow.tableId === 'demo-table-001' ) return {
        expiresAt: new Date( Date.now() + ( 8 * 60 * 60 * 1000 ) ).toISOString(),
        tableSessionId: DEMO_TABLE_SESSION_ID,
    };

    const now = new Date()
        , expiresAt = new Date( now.getTime() + ( 8 * 60 * 60 * 1000 ) )
        , [ created ] = await db
            .insert( tableSessions )
            .values( {
                tableId: tableRow.tableId,
                expiresAt,
            } )
            .returning( {
                tableSessionId: tableSessions.id,
                expiresAt: tableSessions.expiresAt,
            } );

    if( ! created ) throw createError( { statusCode: 500, statusMessage: 'SESSION_CREATE_FAILED', message: 'Non è stato possibile creare la sessione. Riprova tra qualche secondo.' } );

    return { expiresAt: created.expiresAt.toISOString(), tableSessionId: created.tableSessionId };

} );
