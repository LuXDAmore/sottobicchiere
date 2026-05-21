import { and, eq, gt } from 'drizzle-orm';

import {
    playerSessions,
    tableSessions,
    tables,
    venues,
} from '../../../../db/schema';

export default defineEventHandler( async event => {

    const venueSlug = getRouterParam( event, 'venue' )
        , qrToken = getRouterParam( event, 'token' );

    if( ! venueSlug || ! qrToken ) {

        throw createError( {
            statusCode: 400,
            message: 'Parametri mancanti',
        } );

    }

    const tableRow = await db
        .select( { id: tables.id } )
        .from( tables )
        .innerJoin( venues, eq( tables.venueId, venues.id ) )
        .where( and( eq( tables.qrToken, qrToken ), eq( venues.slug, venueSlug ) ) )
        .limit( 1 )
        .then( ( rows: { id: string }[] ) => rows[ 0 ] ?? null );

    if( ! tableRow ) {

        throw createError( {
            statusCode: 404,
            message: 'QR code non valido',
        } );

    }

    const now = new Date()
        , session = await db
            .select( { id: tableSessions.id } )
            .from( tableSessions )
            .where( and( eq( tableSessions.tableId, tableRow.id ), gt( tableSessions.expiresAt, now ) ) )
            .limit( 1 )
            .then( ( rows: { id: string }[] ) => rows[ 0 ] ?? null );

    if( ! session ) return [];

    return db
        .select( {
            color: playerSessions.color,
            groupId: playerSessions.groupId,
            id: playerSessions.id,
            joinedAt: playerSessions.joinedAt,
            nickname: playerSessions.nickname,
        } )
        .from( playerSessions )
        .where( eq( playerSessions.tableSessionId, session.id ) )
        .orderBy( playerSessions.joinedAt );

} );
