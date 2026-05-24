import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { z } from 'zod';

import { pickAvailableColor } from '../../../../../shared/utils/colors';
import {
    groups,
    playerSessions,
    tableSessions,
} from '../../../../db/schema';
import { resolveTableRow } from '../../../../utils/table-resolver';

const joinSchema = z.object( {
    nickname: z.string().min( 1 ).max( 20 ).trim(),
    groupName: z.string().max( 30 ).trim().optional(),
} );

export default defineEventHandler( async event => {

    const venueSlug = getRouterParam( event, 'venue' )
        , qrToken = getRouterParam( event, 'token' );

    if( ! venueSlug || ! qrToken ) {

        throw createError( {
            statusCode: 400,
            message: 'Parametri mancanti',
        } );

    }

    const body = await readBody( event )
        , parsed = joinSchema.safeParse( body );

    if( ! parsed.success ) {

        throw createError( {
            statusCode: 422,
            message: 'Nickname non valido (1–20 caratteri)',
        } );

    }

    const { nickname, groupName } = parsed.data

        // 1. Trova il tavolo
        , tableRow = await resolveTableRow( venueSlug, qrToken );

    if( ! tableRow ) {

        if( venueSlug === 'demo' && qrToken === 'demo-001' ) {

            const demoSessionId = 'demo-session-001';

            return {
                expiresAt: new Date( Date.now() + ( 8 * 60 * 60 * 1000 ) ).toISOString(),
                groupId: null,
                playerId: crypto.randomUUID(),
                playerColor: '#4F46E5',
                playerNickname: nickname,
                qrToken,
                tableNumber: 1,
                tableSessionId: demoSessionId,
                venueName: 'Sottobicchiere Demo',
                venueSlug: 'demo',
            };

        }

        throw createError( {
            statusCode: 404,
            message: 'QR code non valido',
        } );

    }

    if( tableRow.tableId === 'demo-table-001' ) return {
        expiresAt: new Date( Date.now() + ( 8 * 60 * 60 * 1000 ) ).toISOString(),
        groupId: null,
        playerId: crypto.randomUUID(),
        playerColor: '#4F46E5',
        playerNickname: nickname,
        qrToken,
        tableNumber: tableRow.tableNumber,
        tableSessionId: 'demo-session-001',
        venueName: tableRow.venueName,
        venueSlug: tableRow.venueSlug,
    };

    const now = new Date()
        , expiresAt = new Date( now.getTime() + ( 8 * 60 * 60 * 1000 ) );

    // 2. Trova o crea la sessione tavolo attiva
    // Note: select-then-insert is non-atomic; neon-http doesn't support transactions.
    // A duplicate session on simultaneous joins is harmless — both rows expire in 8h
    // and subsequent lookups (orderBy startedAt desc) will consistently pick the latest.
    let session: { id: string; expiresAt: Date } | null = await db
        .select( {
            expiresAt: tableSessions.expiresAt,
            id: tableSessions.id,
        } )
        .from( tableSessions )
        .where( and( eq( tableSessions.tableId, tableRow.tableId ), gt( tableSessions.expiresAt, now ) ) )
        .orderBy( desc( tableSessions.startedAt ) )
        .limit( 1 )
        .then( ( rows: { id: string; expiresAt: Date }[] ) => rows[ 0 ] ?? null );

    if( ! session ) {

        const [ created ] = await db
            .insert( tableSessions )
            .values( {
                expiresAt,
                tableId: tableRow.tableId,
            } )
            .returning( {
                expiresAt: tableSessions.expiresAt,
                id: tableSessions.id,
            } );

        session = created ?? null;

    }

    if( ! session ) {

        throw createError( {
            statusCode: 500,
            message: 'Errore durante la creazione della sessione',
        } );

    }

    // 3. Colori già presi nella sessione
    const takenColors = await db
            .select( { color: playerSessions.color } )
            .from( playerSessions )
            .where( eq( playerSessions.tableSessionId, session.id ) )
            .then( ( rows: { color: string }[] ) => rows.map( r => r.color ) )

        , playerColor = pickAvailableColor( takenColors );

    // 4. Gestione gruppo (opzionale)
    let groupId: string | null = null;

    if( groupName ) {

        const existingGroup = await db
            .select( { id: groups.id } )
            .from( groups )
            .where( and( eq( groups.tableSessionId, session.id ), eq( sql`lower(${ groups.name })`, groupName.toLowerCase() ) ) )
            .limit( 1 )
            .then( ( rows: { id: string }[] ) => rows[ 0 ] ?? null );

        if( existingGroup )
            groupId = existingGroup.id;
        else {

            const groupColors = await db
                    .select( { color: groups.color } )
                    .from( groups )
                    .where( eq( groups.tableSessionId, session.id ) )
                    .then( ( rows: { color: string }[] ) => rows.map( r => r.color ) )

                , groupColor = pickAvailableColor( groupColors )
                , [ newGroup ] = await db
                    .insert( groups )
                    .values( {
                        tableSessionId: session.id,
                        name: groupName,
                        color: groupColor,
                    } )
                    .returning( { id: groups.id } );

            groupId = newGroup.id;

        }

    }

    // 5. Crea la player session
    const [ player ] = await db
        .insert( playerSessions )
        .values( {
            tableSessionId: session.id,
            nickname,
            color: playerColor,
            groupId,
        } )
        .returning( {
            id: playerSessions.id,
            color: playerSessions.color,
            joinedAt: playerSessions.joinedAt,
        } );

    return {
        expiresAt: session.expiresAt.toISOString(),
        groupId,
        playerId: player.id,
        playerColor: player.color,
        playerNickname: nickname,
        qrToken,
        tableNumber: tableRow.tableNumber,
        tableSessionId: session.id,
        venueName: tableRow.venueName,
        venueSlug: tableRow.venueSlug,
    };

} );
