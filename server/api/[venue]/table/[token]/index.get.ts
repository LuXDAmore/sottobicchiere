import {
    and,
    desc,
    eq,
    gt,
} from 'drizzle-orm';

import { tableSessions, tables, venues } from '../../../../db/schema';

export default defineEventHandler( async event => {

    const venueSlug = getRouterParam( event, 'venue' )
        , qrToken = getRouterParam( event, 'token' );

    if( ! venueSlug || ! qrToken ) {

        throw createError( {
            statusCode: 400,
            message: 'Parametri mancanti',
        } );

    }

    const row = await db
        .select( {
            tableId: tables.id,
            tableNumber: tables.tableNumber,
            venueName: venues.name,
            venueSlug: venues.slug,
        } )
        .from( tables )
        .innerJoin( venues, eq( tables.venueId, venues.id ) )
        .where( and( eq( tables.qrToken, qrToken ), eq( venues.slug, venueSlug ) ) )
        .limit( 1 )
        .then( ( rows: { tableId: string; tableNumber: number; venueName: string; venueSlug: string }[] ) => rows[ 0 ] ?? null );

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
