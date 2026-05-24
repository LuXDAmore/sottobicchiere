import { tableSessions } from '../../../../../db/schema';
import { DEMO_TABLE_SESSION_ID } from '../../../../../utils/demo-session';
import { resolveTableRow } from '../../../../../utils/table-resolver';

export default defineEventHandler( async event => {

    const venueSlug = getRouterParam( event, 'venue' )
        , qrToken = getRouterParam( event, 'token' );

    if( ! venueSlug || ! qrToken ) throw createError( { statusCode: 400, message: 'Parametri mancanti' } );

    const tableRow = await resolveTableRow( venueSlug, qrToken );

    if( ! tableRow ) throw createError( { statusCode: 404, message: 'QR code non valido' } );

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

    if( ! created ) throw createError( { statusCode: 500, message: 'Errore durante la creazione della sessione' } );

    return { expiresAt: created.expiresAt.toISOString(), tableSessionId: created.tableSessionId };

} );
