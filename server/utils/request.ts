import type { H3Event } from 'h3';

import { serviceClient } from './supabase';
import { resolveTableRow } from './table-resolver';

/**
 * Estrae venue/token dalla route, risolve il tavolo e crea il client service.
 * Lancia 400/404 con messaggi coerenti se mancano i parametri o il tavolo.
 * @param event - evento H3 della request.
 */
export async function requireTable( event: H3Event ) {

    const venueSlug = getRouterParam( event, 'venue' )
        , qrToken = getRouterParam( event, 'token' );

    if( ! venueSlug || ! qrToken ) {

        throw createError( {
            statusCode: 400,
            statusMessage: 'MISSING_ROUTE_PARAMS',
            message: 'Parametri mancanti nel link. Controlla il QR code.',
        } );

    }

    const client = serviceClient( event )
        , table = await resolveTableRow( client, venueSlug, qrToken );

    if( ! table ) {

        throw createError( {
            statusCode: 404,
            statusMessage: 'TABLE_NOT_FOUND',
            message: 'QR code non riconosciuto. Chiedi al personale del locale.',
        } );

    }

    return {
        client,
        qrToken,
        table,
        venueSlug,
    };

}

/**
 * Risolve la riga player_session da un playerId, o lancia 403.
 * @param client - client Supabase service role.
 * @param playerId - id del giocatore (player_sessions.id).
 */
export async function requirePlayer( client: ReturnType<typeof serviceClient>, playerId: string ) {

    const { data } = await client
        .from( 'player_sessions' )
        .select( 'id, table_session_id, is_host' )
        .eq( 'id', playerId )
        .maybeSingle();

    if( ! data ) {

        throw createError( {
            statusCode: 403,
            statusMessage: 'PLAYER_NOT_FOUND',
            message: 'Giocatore non riconosciuto. Torna alla lobby e riprova.',
        } );

    }

    return data;

}

/**
 * Verifica che un giocatore sia l'host della propria sessione, o lancia 403/404.
 * @param client - client Supabase service role.
 * @param playerId - id del giocatore.
 */
export async function requireHostSession( client: ReturnType<typeof serviceClient>, playerId: string ) {

    const player = await requirePlayer( client, playerId )

        , { data: session } = await client
            .from( 'table_sessions' )
            .select( 'id, host_player_id, session_mode, dating_enabled' )
            .eq( 'id', player.table_session_id )
            .gt( 'expires_at', new Date().toISOString() )
            .maybeSingle();

    if( ! session ) {

        throw createError( {
            statusCode: 404,
            statusMessage: 'SESSION_NOT_FOUND',
            message: 'La sessione è scaduta. Torna alla lobby e riprova.',
        } );

    }

    const hostPlayerId = session.host_player_id ?? playerId;

    if( hostPlayerId !== playerId ) {

        throw createError( {
            statusCode: 403,
            statusMessage: 'NOT_HOST',
            message: 'Solo l\'host può eseguire questa azione.',
        } );

    }

    return {
        hostPlayerId,
        player,
        session,
    };

}

/**
 * Risolve l'id di sessione da usare: quella richiesta (se valida e del tavolo),
 * altrimenti la più recente attiva.
 * @param client - client Supabase service role.
 * @param tableId - id del tavolo.
 * @param requestedSessionId - id sessione richiesto (opzionale).
 */
export async function resolveSessionId( client: ReturnType<typeof serviceClient>, tableId: string, requestedSessionId?: string ): Promise<string | null> {

    if( requestedSessionId ) {

        const { data } = await client
            .from( 'table_sessions' )
            .select( 'id' )
            .eq( 'id', requestedSessionId )
            .eq( 'table_id', tableId )
            .gt( 'expires_at', new Date().toISOString() )
            .maybeSingle();

        if( data ) return data.id;

    }

    const latest = await findLatestActiveSession( client, tableId );

    return latest?.id ?? null;

}

/**
 * Risolve la sessione attiva più recente per un tavolo, se esiste.
 * @param client - client Supabase service role.
 * @param tableId - id del tavolo.
 */
export async function findLatestActiveSession( client: ReturnType<typeof serviceClient>, tableId: string ) {

    const { data } = await client
        .from( 'table_sessions' )
        .select( 'id, started_at, expires_at, selected_game, game_mode, session_mode, locked_at, host_player_id, dating_enabled' )
        .eq( 'table_id', tableId )
        .gt( 'expires_at', new Date().toISOString() )
        .order( 'started_at', { ascending: false } )
        .limit( 1 )
        .maybeSingle();

    return data;

}
