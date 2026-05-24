import { and, desc, eq, gt } from 'drizzle-orm';

import { playerSessions, tableSessions } from '../../../../../db/schema';
import { resolveTableRow } from '../../../../../utils/table-resolver';

export default defineEventHandler( async event => {
    const venueSlug = getRouterParam( event, 'venue' )
        , qrToken = getRouterParam( event, 'token' );

    if( ! venueSlug || ! qrToken ) throw createError( { statusCode: 400, message: 'Parametri mancanti' } );

    const tableRow = await resolveTableRow( venueSlug, qrToken );
    if( ! tableRow ) throw createError( { statusCode: 404, message: 'QR code non valido' } );

    const now = new Date();

    const session = await db
        .select( { id: tableSessions.id, expiresAt: tableSessions.expiresAt } )
        .from( tableSessions )
        .where( and( eq( tableSessions.tableId, tableRow.tableId ), gt( tableSessions.expiresAt, now ) ) )
        .orderBy( desc( tableSessions.startedAt ) )
        .limit( 1 )
        .then( ( rows: { id: string; expiresAt: Date }[] ) => rows[ 0 ] ?? null );

    if( ! session ) return null;

    const host = await db
        .select( { id: playerSessions.id, nickname: playerSessions.nickname } )
        .from( playerSessions )
        .where( and( eq( playerSessions.tableSessionId, session.id ), eq( playerSessions.isHost, true ) ) )
        .orderBy( playerSessions.joinedAt )
        .limit( 1 )
        .then( ( rows: { id: string; nickname: string }[] ) => rows[ 0 ] ?? null );

    return {
        expiresAt: session.expiresAt.toISOString(),
        hostNickname: host?.nickname ?? null,
        hostPlayerId: host?.id ?? null,
        id: session.id,
        remainingSeconds: Math.max( 0, Math.floor( ( session.expiresAt.getTime() - now.getTime() ) / 1000 ) ),
        status: 'active' as const,
    };
} );
