import { and, desc, eq, gt } from 'drizzle-orm';

import { playerSessions, tableSessions } from '../../../../db/schema';
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

    const tableRow = await resolveTableRow( venueSlug, qrToken );

    if( ! tableRow ) {

        throw createError( {
            statusCode: 404,
            statusMessage: 'TABLE_NOT_FOUND',
            message: 'QR code non riconosciuto. Chiedi al personale del locale.',
        } );

    }

    if( tableRow.tableId === 'demo-table-001' ) return [];

    const now = new Date()
        , session = await db
            .select( { id: tableSessions.id } )
            .from( tableSessions )
            .where( and( eq( tableSessions.tableId, tableRow.tableId ), gt( tableSessions.expiresAt, now ) ) )
            .orderBy( desc( tableSessions.startedAt ) )
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
