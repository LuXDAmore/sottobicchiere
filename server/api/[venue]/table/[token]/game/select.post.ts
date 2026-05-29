import { z } from 'zod';

import { requirePlayer, requireTable } from '../../../../../utils/request';

const payloadSchema = z.object( {
    gameMode: z.string().min( 1 ).max( 40 ).optional(),
    playerId: z.string().uuid(),
    selectedGame: z.string().min( 1 ).max( 40 ),
} );

export default defineEventHandler( async event => {

    const parsed = payloadSchema.safeParse( await readBody( event ) );

    if( ! parsed.success ) {

        throw createError( {
            statusCode: 422,
            statusMessage: 'INVALID_PAYLOAD',
            message: 'Selezione gioco non valida. Riprova.',
        } );

    }

    const body = parsed.data
        , { client, table } = await requireTable( event )

        // Verifica proprietà del giocatore (anti-impersonificazione) e ne ricava la sessione.
        , player = await requirePlayer( event, client, body.playerId );

    const { data: session } = await client
        .from( 'table_sessions' )
        .select( 'id, host_player_id, locked_at' )
        .eq( 'id', player.table_session_id )
        .eq( 'table_id', table.tableId )
        .gt( 'expires_at', new Date().toISOString() )
        .maybeSingle();

    if( ! session ) {

        throw createError( {
            statusCode: 404,
            statusMessage: 'SESSION_NOT_FOUND',
            message: 'La sessione è scaduta. Torna alla lobby e riprova.',
        } );

    }
    if( session.locked_at ) {

        throw createError( {
            statusCode: 409,
            statusMessage: 'GAME_ALREADY_LOCKED',
            message: 'Un gioco è già stato selezionato per questa sessione.',
        } );

    }
    if( session.host_player_id && session.host_player_id !== body.playerId ) {

        throw createError( {
            statusCode: 403,
            statusMessage: 'NOT_HOST',
            message: 'Solo l\'host può selezionare il gioco.',
        } );

    }

    const hostPlayerId = session.host_player_id ?? body.playerId
        , lockedAt = new Date().toISOString()

        // L'UPDATE viene propagato ai client dal trigger di broadcast su table_sessions.
        , { error } = await client
            .from( 'table_sessions' )
            .update( {
                selected_game: body.selectedGame,
                game_mode: body.gameMode ?? null,
                locked_at: lockedAt,
                host_player_id: hostPlayerId,
            } )
            .eq( 'id', session.id );

    if( error ) {

        throw createError( {
            statusCode: 500,
            statusMessage: 'GAME_SELECT_FAILED',
            message: 'Non è stato possibile selezionare il gioco. Riprova.',
        } );

    }

    return {
        ok: true,
        selectedGame: body.selectedGame,
        gameMode: body.gameMode ?? null,
        lockedAt,
        hostPlayerId,
    };

} );
