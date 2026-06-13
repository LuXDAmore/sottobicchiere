import type { H3Event } from 'h3';

import { serviceClient } from './supabase';
import { resolveTableRow } from './table-resolver';
import { supabaseUserId } from '../../shared/utils/supabase-user';

import { serverSupabaseUser } from '#supabase/server';

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
 * Risolve la riga player_session da un playerId verificando che l'utente Supabase
 * corrente ne sia il proprietario. Usa il service role (bypassa RLS) ma confronta
 * `player_sessions.user_id` con `auth.uid`, impedendo l'impersonificazione di altri
 * giocatori (gli ID sono visibili agli altri tavoli via presence).
 * @param event - evento H3 della request (per leggere l'utente autenticato).
 * @param client - client Supabase service role.
 * @param playerId - id del giocatore (player_sessions.id).
 */
export async function requirePlayer( event: H3Event, client: ReturnType<typeof serviceClient>, playerId: string ) {

    const user = await serverSupabaseUser( event ).catch( () => null )
        , userId = supabaseUserId( user );

    if( ! userId ) {

        throw createError( {
            statusCode: 401,
            statusMessage: 'NOT_AUTHENTICATED',
            message: 'Sessione non pronta. Aggiorna la pagina e riprova.',
        } );

    }

    const { data } = await client
        .from( 'player_sessions' )
        .select( 'id, table_session_id, is_host, user_id' )
        .eq( 'id', playerId )
        .maybeSingle();

    if( ! data || data.user_id !== userId ) {

        throw createError( {
            statusCode: 403,
            statusMessage: 'PLAYER_NOT_FOUND',
            message: 'Giocatore non riconosciuto. Torna alla lobby e riprova.',
        } );

    }

    return data;

}

/**
 * Decide se un giocatore è l'host della sessione. Se `host_player_id` non è
 * ancora valorizzato (subito dopo la creazione o in una race di riassegnazione)
 * NON si usa il playerId come fallback — renderebbe host chiunque: può procedere
 * solo chi ha creato la sessione (`is_host`). Fonte unica condivisa tra
 * `requireHostSession` e l'API di selezione gioco.
 * @param session - sessione con il campo `host_player_id`.
 * @param session.host_player_id
 * @param player - giocatore con `id` e `is_host`.
 * @param player.id
 * @param player.is_host
 */
export function isSessionHost( session: { host_player_id: string | null }, player: { id: string; is_host: boolean } ): boolean {

    return session.host_player_id === null
        ? player.is_host
        : session.host_player_id === player.id;

}

/**
 * Verifica che un giocatore (di cui l'utente corrente è proprietario) sia l'host
 * della propria sessione, o lancia 401/403/404.
 * @param event - evento H3 della request.
 * @param client - client Supabase service role.
 * @param playerId - id del giocatore.
 * @param tableId - id del tavolo atteso (opzionale, per vincolare la route).
 */
export async function requireHostSession( event: H3Event, client: ReturnType<typeof serviceClient>, playerId: string, tableId?: string ) {

    const player = await requirePlayer( event, client, playerId )

        , { data: session } = await client
            .from( 'table_sessions' )
            .select( 'id, host_player_id, session_mode, dating_enabled, table_id' )
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

    if( tableId && session.table_id !== tableId ) {

        throw createError( {
            statusCode: 403,
            statusMessage: 'PLAYER_TABLE_MISMATCH',
            message: 'Questo giocatore non appartiene a questo tavolo o la sessione è scaduta.',
        } );

    }

    if( ! isSessionHost( session, player ) ) {

        throw createError( {
            statusCode: 403,
            statusMessage: 'NOT_HOST',
            message: 'Solo l\'host può eseguire questa azione.',
        } );

    }

    return {
        hostPlayerId: session.host_player_id ?? playerId,
        player,
        session,
    };

}

/**
 * Verifica che un giocatore (di cui l'utente corrente è proprietario) appartenga
 * al tavolo specificato (parametri di route), o lancia 401/403/404.
 * Senza questo controllo un client potrebbe usare un `playerId` di un'altra
 * sessione verso qualunque route valida, rendendo `[venue]/[token]` solo decorativi.
 * @param event - evento H3 della request.
 * @param client - client Supabase service role.
 * @param playerId - id del giocatore.
 * @param tableId - id del tavolo risolto dai parametri di route.
 */
export async function requirePlayerForTable( event: H3Event, client: ReturnType<typeof serviceClient>, playerId: string, tableId: string ) {

    const player = await requirePlayer( event, client, playerId )

        , { data: session } = await client
            .from( 'table_sessions' )
            .select( 'id, table_id' )
            .eq( 'id', player.table_session_id )
            .eq( 'table_id', tableId )
            .gt( 'expires_at', new Date().toISOString() )
            .maybeSingle();

    if( ! session ) {

        throw createError( {
            statusCode: 403,
            statusMessage: 'PLAYER_TABLE_MISMATCH',
            message: 'Questo giocatore non appartiene a questo tavolo o la sessione è scaduta.',
        } );

    }

    return {
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

    const latest = await client
        .from( 'table_sessions' )
        .select( 'id' )
        .eq( 'table_id', tableId )
        .gt( 'expires_at', new Date().toISOString() )
        .order( 'started_at', { ascending: false } )
        .limit( 1 )
        .maybeSingle();

    return latest.data?.id ?? null;

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
