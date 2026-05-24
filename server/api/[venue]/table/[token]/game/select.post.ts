import { and, desc, eq, gt } from 'drizzle-orm';
import { z } from 'zod';

import {
    playerSessions,
    tableSessions,
} from '../../../../../db/schema';
import { resolveTableRow } from '../../../../../utils/table-resolver';
import { emitTableEvent } from '../../../../../utils/table-ws-broker';

const payloadSchema = z.object( {
    gameMode: z.string().min( 1 ).max( 40 ).optional(),
    playerId: z.string().uuid(),
    selectedGame: z.string().min( 1 ).max( 40 ),
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

    const parsed = payloadSchema.safeParse( await readBody( event ) );

    if( ! parsed.success ) {

        throw createError( {
            statusCode: 422,
            message: 'Payload non valido',
        } );

    }

    const body = parsed.data
        , table = await resolveTableRow( venueSlug, qrToken );

    if( ! table || table.tableId === 'demo-table-001' ) {

        throw createError( {
            statusCode: 404,
            message: 'Tavolo non trovato',
        } );

    }

    const now = new Date()
        , session = await db
            .select( {
                id: tableSessions.id,
                hostPlayerId: tableSessions.hostPlayerId,
                lockedAt: tableSessions.lockedAt,
            } )
            .from( tableSessions )
            .where( and( eq( tableSessions.tableId, table.tableId ), gt( tableSessions.expiresAt, now ) ) )
            .orderBy( desc( tableSessions.startedAt ) )
            .limit( 1 )
            .then( ( rows: { id: string; hostPlayerId: string | null; lockedAt: Date | null }[] ) => rows[ 0 ] ?? null );

    if( ! session ) {

        throw createError( {
            statusCode: 404,
            message: 'Sessione non trovata',
        } );

    }

    const player = await db
        .select( { id: playerSessions.id } )
        .from( playerSessions )
        .where( and( eq( playerSessions.id, body.playerId ), eq( playerSessions.tableSessionId, session.id ) ) )
        .limit( 1 )
        .then( ( rows: { id: string }[] ) => rows[ 0 ] ?? null );

    if( ! player ) {

        throw createError( {
            statusCode: 403,
            message: 'Player non valido per questa sessione',
        } );

    }

    if( session.lockedAt ) {

        throw createError( {
            statusCode: 409,
            message: 'Gioco già bloccato',
        } );

    }

    if( session.hostPlayerId && session.hostPlayerId !== body.playerId ) {

        throw createError( {
            statusCode: 403,
            message: 'Solo host può selezionare il gioco',
        } );

    }

    const hostPlayerId = session.hostPlayerId ?? body.playerId
        , lockedAt = new Date();

    await db
        .update( tableSessions )
        .set( {
            gameMode: body.gameMode ?? null,
            hostPlayerId,
            lockedAt,
            selectedGame: body.selectedGame,
        } )
        .where( eq( tableSessions.id, session.id ) );

    emitTableEvent( session.id, {
        type: 'game:selected',
        selectedGame: body.selectedGame,
        gameMode: body.gameMode ?? null,
        hostPlayerId,
    } );
    emitTableEvent( session.id, {
        type: 'game:locked',
        lockedAt: lockedAt.toISOString(),
    } );

    return {
        ok: true,
        selectedGame: body.selectedGame,
        gameMode: body.gameMode ?? null,
        lockedAt: lockedAt.toISOString(),
        hostPlayerId,
    };

} );
