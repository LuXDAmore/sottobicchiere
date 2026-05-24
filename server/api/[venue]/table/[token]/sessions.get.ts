import { and, count, desc, eq, gt } from 'drizzle-orm';

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
        .orderBy( desc( tableSessions.startedAt ) ); // newest first

    if( activeSessions.length === 0 ) return { sessions: [] };

    // Fetch player count and host nickname for all sessions in parallel
    const countMap = new Map<string, number>();
    const nicknameMap = new Map<string, string | null>();

    await Promise.all(
        activeSessions.map( async ( s: SessionRow ) => {
            const [ playerCount, hostNickname ] = await Promise.all( [
                db
                    .select( { count: count() } )
                    .from( playerSessions )
                    .where( eq( playerSessions.tableSessionId, s.sessionId ) )
                    .then( ( r: { count: number }[] ) => r[ 0 ]?.count ?? 0 )
                    .catch( () => 0 ),
                s.hostPlayerId
                    ? db
                        .select( { nickname: playerSessions.nickname } )
                        .from( playerSessions )
                        .where( eq( playerSessions.id, s.hostPlayerId ) )
                        .limit( 1 )
                        .then( ( r: { nickname: string }[] ) => r[ 0 ]?.nickname ?? null )
                        .catch( () => null )
                    : Promise.resolve( null ),
            ] );

            countMap.set( s.sessionId, playerCount );
            nicknameMap.set( s.sessionId, hostNickname );
        } )
    );

    return {
        sessions: activeSessions.map( ( s: SessionRow ) => ( {
            hasActiveGame: !! s.lockedAt,
            hostNickname: nicknameMap.get( s.sessionId ) ?? null,
            playerCount: countMap.get( s.sessionId ) ?? 0,
            selectedGame: s.selectedGame,
            sessionId: s.sessionId,
            startedAt: s.startedAt.toISOString(),
        } ) ),
    };

} );
