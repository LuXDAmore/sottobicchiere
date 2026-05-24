import { and, desc, eq, gt } from 'drizzle-orm';

import { tableSessions } from '../../../../db/schema';
import { resolveTableRow } from '../../../../utils/table-resolver';

export default defineEventHandler( async event => {

    const venueSlug = getRouterParam( event, 'venue' )
        , qrToken = getRouterParam( event, 'token' );

    if( ! venueSlug || ! qrToken ) {

        throw createError( {
            statusCode: 400,
            statusMessage: 'MISSING_ROUTE_PARAMS',
            message: 'Parametri mancanti nel link. Controlla il QR code.',
        } );

    }

    const row = await resolveTableRow( venueSlug, qrToken );

    if( ! row ) {

        throw createError( {
            statusCode: 404,
            statusMessage: 'TABLE_NOT_FOUND',
            message: 'QR code non riconosciuto. Chiedi al personale del locale.',
        } );

    }

    if( row.tableId === 'demo-table-001' ) return {
        hasActiveSession: false,
        tableNumber: row.tableNumber,
        venueName: row.venueName,
        venueSlug: row.venueSlug,
    };

    const now = new Date()
        , activeSession = await db
            .select( { id: tableSessions.id } )
            .from( tableSessions )
            .where(
                and(
                    eq( tableSessions.tableId, row.tableId ),
                    gt( tableSessions.expiresAt, now )
                )
            )
            .orderBy( desc( tableSessions.startedAt ) )
            .limit( 1 )
            .then( ( rows: { id: string }[] ) => rows[ 0 ] ?? null );

    return {
        hasActiveSession: !! activeSession,
        tableNumber: row.tableNumber,
        venueName: row.venueName,
        venueSlug: row.venueSlug,
    };

} );
