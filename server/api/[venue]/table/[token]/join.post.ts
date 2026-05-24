import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { z } from 'zod';

import { pickAvailableColor } from '../../../../../shared/utils/colors';
import { groups, playerSessions, tableSessions } from '../../../../db/schema';
import { resolveTableRow } from '../../../../utils/table-resolver';

const joinSchema = z.object( {
    nickname: z.string().min( 1 ).max( 20 ).trim(),
    groupName: z.string().max( 30 ).trim().optional(),
    createSession: z.boolean().optional(),
    sessionId: z.string().uuid().optional(),
} );

export default defineEventHandler( async event => {
    const venueSlug = getRouterParam( event, 'venue' )
        , qrToken = getRouterParam( event, 'token' );

    if( ! venueSlug || ! qrToken ) throw createError( { statusCode: 400, message: 'Parametri mancanti' } );

    const parsed = joinSchema.safeParse( await readBody( event ) );
    if( ! parsed.success ) throw createError( { statusCode: 422, message: 'Nickname non valido (1–20 caratteri)' } );

    const { nickname, groupName, createSession = false, sessionId: requestedSessionId } = parsed.data
        , tableRow = await resolveTableRow( venueSlug, qrToken );

    if( ! tableRow ) throw createError( { statusCode: 404, message: 'QR code non valido' } );

    if( tableRow.tableId === 'demo-table-001' ) return {
        expiresAt: new Date( Date.now() + ( 8 * 60 * 60 * 1000 ) ).toISOString(),
        groupId: null,
        hasActiveGame: false,
        isHost: createSession,
        playerId: crypto.randomUUID(),
        playerColor: '#4F46E5',
        playerNickname: nickname,
        qrToken,
        selectedGame: null,
        tableNumber: tableRow.tableNumber,
        tableSessionId: 'demo-session-001',
        venueName: tableRow.venueName,
        venueSlug: tableRow.venueSlug,
    };

    const now = new Date()
        , expiresAt = new Date( now.getTime() + ( 8 * 60 * 60 * 1000 ) );

    let session: { id: string; expiresAt: Date; lockedAt: Date | null; selectedGame: string | null } | null = null;

    if( requestedSessionId ) {
        // Join a specific session by ID (validate it belongs to this table and is not expired)
        session = await db
            .select( { id: tableSessions.id, expiresAt: tableSessions.expiresAt, lockedAt: tableSessions.lockedAt, selectedGame: tableSessions.selectedGame } )
            .from( tableSessions )
            .where( and(
                eq( tableSessions.id, requestedSessionId ),
                eq( tableSessions.tableId, tableRow.tableId ),
                gt( tableSessions.expiresAt, now )
            ) )
            .limit( 1 )
            .then( ( rows: { id: string; expiresAt: Date; lockedAt: Date | null; selectedGame: string | null }[] ) => rows[ 0 ] ?? null );

        if( ! session ) throw createError( { statusCode: 404, message: 'Sessione non trovata o scaduta' } );
    } else if( ! createSession ) {
        session = await db
            .select( { id: tableSessions.id, expiresAt: tableSessions.expiresAt, lockedAt: tableSessions.lockedAt, selectedGame: tableSessions.selectedGame } )
            .from( tableSessions )
            .where( and( eq( tableSessions.tableId, tableRow.tableId ), gt( tableSessions.expiresAt, now ) ) )
            .orderBy( desc( tableSessions.startedAt ) )
            .limit( 1 )
            .then( ( rows: { id: string; expiresAt: Date; lockedAt: Date | null; selectedGame: string | null }[] ) => rows[ 0 ] ?? null );
    }

    if( ! session ) {
        const [ created ] = await db
            .insert( tableSessions )
            .values( { expiresAt, tableId: tableRow.tableId } )
            .returning( { id: tableSessions.id, expiresAt: tableSessions.expiresAt, lockedAt: tableSessions.lockedAt, selectedGame: tableSessions.selectedGame } );
        session = created ? { ...created, lockedAt: null, selectedGame: null } : null;
    }

    if( ! session ) throw createError( { statusCode: 500, message: 'Errore durante la creazione della sessione' } );

    const takenColors = await db.select( { color: playerSessions.color } ).from( playerSessions )
        .where( eq( playerSessions.tableSessionId, session.id ) ).then( ( rows: { color: string }[] ) => rows.map( ( r: { color: string } ) => r.color ) )
        , playerColor = pickAvailableColor( takenColors );

    let groupId: string | null = null;
    if( groupName ) {
        const existingGroup = await db.select( { id: groups.id } ).from( groups )
            .where( and( eq( groups.tableSessionId, session.id ), eq( sql`lower(${ groups.name })`, groupName.toLowerCase() ) ) )
            .limit( 1 ).then( ( rows: { id: string }[] ) => rows[ 0 ] ?? null );

        if( existingGroup ) groupId = existingGroup.id;
        else {
            const groupColors = await db.select( { color: groups.color } ).from( groups )
                .where( eq( groups.tableSessionId, session.id ) ).then( ( rows: { color: string }[] ) => rows.map( ( r: { color: string } ) => r.color ) )
                , groupColor = pickAvailableColor( groupColors )
                , [ newGroup ] = await db.insert( groups )
                    .values( { tableSessionId: session.id, name: groupName, color: groupColor } )
                    .returning( { id: groups.id } );
            groupId = newGroup.id;
        }
    }

    // isHost is only possible when creating a brand new session; joining an existing one can never claim host
    const isHost = ! requestedSessionId && createSession;

    const [ player ] = await db.insert( playerSessions ).values( {
        tableSessionId: session.id,
        nickname,
        color: playerColor,
        groupId,
        isHost,
    } ).returning( { id: playerSessions.id, color: playerSessions.color, isHost: playerSessions.isHost } );

    return {
        expiresAt: session.expiresAt.toISOString(),
        groupId,
        hasActiveGame: !! session.lockedAt,
        isHost: player.isHost,
        playerId: player.id,
        playerColor: player.color,
        playerNickname: nickname,
        qrToken,
        selectedGame: session.selectedGame ?? null,
        tableNumber: tableRow.tableNumber,
        tableSessionId: session.id,
        venueName: tableRow.venueName,
        venueSlug: tableRow.venueSlug,
    };
} );
