import { and, count, eq, gt } from 'drizzle-orm';

import { playerSessions, tableSessions } from '../../../../db/schema';
import { resolveTableRow } from '../../../../utils/table-resolver';

interface SessionRow {
    sessionId: string;
    startedAt: Date;
    selectedGame: string | null;
    lockedAt: Date | null;
    hostPlayerId: string | null;
}

export default defineEventHandler( async event => {

    const venueSlug = getRouterParam( event, 'venue' )
        , qrToken = getRouterParam( event, 'token' );

    if( ! venueSlug || ! qrToken ) throw createError( { statusCode: 400, message: 'Parametri mancanti' } );

    const row = await resolveTableRow( venueSlug, qrToken );

    if( ! row ) throw createError( { statusCode: 404, message: 'QR code non valido o scaduto' } );

    // Demo table has no persisted sessions
    if( row.tableId === 'demo-table-001' ) return { sessions: [] };

    const now = new Date();

    const activeSessions: SessionRow[] = await db
        .select( {
            sessionId: tableSessions.id,
            startedAt: tableSessions.startedAt,
            selectedGame: tableSessions.selectedGame,
            lockedAt: tableSessions.lockedAt,
            hostPlayerId: tableSessions.hostPlayerId,
        } )
        .from( tableSessions )
        .where( and( eq( tableSessions.tableId, row.tableId ), gt( tableSessions.expiresAt, now ) ) )
        .orderBy( tableSessions.startedAt );

    if( activeSessions.length === 0 ) return { sessions: [] };

    const sessionIds = activeSessions.map( ( s: SessionRow ) => s.sessionId );

    // Fetch player counts for all sessions
    const countMap = new Map<string, number>();
    await Promise.all(
        sessionIds.map( ( id: string ) =>
            db
                .select( { count: count() } )
                .from( playerSessions )
                .where( eq( playerSessions.tableSessionId, id ) )
                .then( ( r: { count: number }[] ) => countMap.set( id, r[ 0 ]?.count ?? 0 ) )
        )
    );

    // Fetch host nickname for each session
    const nicknameMap = new Map<string, string | null>();
    await Promise.all(
        activeSessions.map( async ( s: SessionRow ) => {
            if( ! s.hostPlayerId ) {
                nicknameMap.set( s.sessionId, null );
                return;
            }
            const host = await db
                .select( { nickname: playerSessions.nickname } )
                .from( playerSessions )
                .where( eq( playerSessions.id, s.hostPlayerId ) )
                .limit( 1 )
                .then( ( r: { nickname: string }[] ) => r[ 0 ] ?? null );
            nicknameMap.set( s.sessionId, host?.nickname ?? null );
        } )
    );

    return {
        sessions: activeSessions.map( ( s: SessionRow ) => ( {
            sessionId: s.sessionId,
            playerCount: countMap.get( s.sessionId ) ?? 0,
            hasActiveGame: !! s.lockedAt,
            selectedGame: s.selectedGame,
            hostNickname: nicknameMap.get( s.sessionId ) ?? null,
            startedAt: s.startedAt.toISOString(),
        } ) ),
    };

} );
