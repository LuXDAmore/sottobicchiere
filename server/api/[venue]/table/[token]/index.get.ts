import { and, desc, eq, gt } from 'drizzle-orm';

import { tableSessions } from '../../../../db/schema';
import { resolveTableRow } from '../../../../utils/table-resolver';

export default defineEventHandler( async event => {

    const venueSlug = getRouterParam( event, 'venue' )
        , qrToken = getRouterParam( event, 'token' );

    if( ! venueSlug || ! qrToken ) {

        throw createError( {
            statusCode: 400,
            message: 'Parametri mancanti',
        } );

    }

    const row = await resolveTableRow( venueSlug, qrToken );

    if( ! row ) {

        if( venueSlug === 'demo' && qrToken === 'demo-001' ) {

            return {
                hasActiveSession: false,
                tableNumber: 1,
                venueName: 'Sottobicchiere Demo',
                venueSlug: 'demo',
            };

        }

        throw createError( {
            statusCode: 404,
            message: 'QR code non valido o scaduto',
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
