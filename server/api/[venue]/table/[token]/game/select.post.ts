import { and, eq, gt } from 'drizzle-orm';
import { z } from 'zod';

import {
    playerSessions,
    tableSessions,
} from '../../../../../db/schema';
import { DEMO_TABLE_SESSION_ID } from '../../../../../utils/demo-session';
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
            statusMessage: 'MISSING_ROUTE_PARAMS',
            message: 'Parametri mancanti nel link. Controlla il QR code.',
        } );

    }

    const parsed = payloadSchema.safeParse( await readBody( event ) );

    if( ! parsed.success ) {

        throw createError( {
            statusCode: 422,
            statusMessage: 'INVALID_PAYLOAD',
            message: 'Selezione gioco non valida. Riprova.',
        } );

    }

    const body = parsed.data
        , table = await resolveTableRow( venueSlug, qrToken );

    if( ! table ) {

        throw createError( {
            statusCode: 404,
            statusMessage: 'TABLE_NOT_FOUND',
            message: 'Tavolo non trovato o QR code non valido.',
        } );

    }

    if( table.tableId === 'demo-table-001' ) {

        const lockedAt = new Date();

        emitTableEvent( DEMO_TABLE_SESSION_ID, {
            type: 'game:selected',
            selectedGame: body.selectedGame,
            gameMode: body.gameMode ?? null,
            hostPlayerId: body.playerId,
        } );

        emitTableEvent( DEMO_TABLE_SESSION_ID, {
            type: 'game:locked',
            lockedAt: lockedAt.toISOString(),
        } );

        return {
            ok: true,
            selectedGame: body.selectedGame,
            gameMode: body.gameMode ?? null,
            lockedAt: lockedAt.toISOString(),
            hostPlayerId: body.playerId,
        };

    }

    const now = new Date();

    // Resolve the session the player actually belongs to (not the newest one on the table)
    const playerRow = await db
        .select( { tableSessionId: playerSessions.tableSessionId } )
        .from( playerSessions )
        .where( eq( playerSessions.id, body.playerId ) )
        .limit( 1 )
        .then( ( rows: { tableSessionId: string }[] ) => rows[ 0 ] ?? null );

    if( ! playerRow ) {

        throw createError( {
            statusCode: 403,
            statusMessage: 'PLAYER_NOT_FOUND',
            message: 'Giocatore non riconosciuto. Torna alla lobby e riprova.',
        } );

    }

    const session = await db
        .select( {
            id: tableSessions.id,
            hostPlayerId: tableSessions.hostPlayerId,
            lockedAt: tableSessions.lockedAt,
        } )
        .from( tableSessions )
        .where( and(
            eq( tableSessions.id, playerRow.tableSessionId ),
            eq( tableSessions.tableId, table.tableId ),
            gt( tableSessions.expiresAt, now )
        ) )
        .limit( 1 )
        .then( ( rows: { id: string; hostPlayerId: string | null; lockedAt: Date | null }[] ) => rows[ 0 ] ?? null );

    if( ! session ) {

        throw createError( {
            statusCode: 404,
            statusMessage: 'SESSION_NOT_FOUND',
            message: 'La sessione è scaduta. Torna alla lobby e riprova.',
        } );

    }

    if( session.lockedAt ) {

        throw createError( {
            statusCode: 409,
            statusMessage: 'GAME_ALREADY_LOCKED',
            message: 'Un gioco è già stato selezionato per questa sessione.',
        } );

    }

    if( session.hostPlayerId && session.hostPlayerId !== body.playerId ) {

        throw createError( {
            statusCode: 403,
            statusMessage: 'NOT_HOST',
            message: 'Solo l\'host può selezionare il gioco.',
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
