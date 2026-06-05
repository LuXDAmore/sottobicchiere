import { z } from 'zod';

import { pickAvailableColor } from '../../../../../shared/utils/colors';
import { supabaseUserId } from '../../../../../shared/utils/supabase-user';
import { requireTable } from '../../../../utils/request';

import { serverSupabaseUser } from '#supabase/server';

const joinSchema = z.object( {
    nickname: z.string().trim().min( 1 ).max( 20 ),
    groupName: z.string().trim().max( 30 ).optional(),
    createSession: z.boolean().optional(),
    sessionId: z.string().uuid().optional(),
} );

export default defineEventHandler( async event => {

    const parsed = joinSchema.safeParse( await readBody( event ) );

    if( ! parsed.success ) {

        throw createError( {
            statusCode: 422,
            statusMessage: 'INVALID_JOIN_PAYLOAD',
            message: 'Nickname non valido: usa da 1 a 20 caratteri.',
        } );

    }

    const {
            nickname, groupName, createSession = false, sessionId: requestedSessionId,
        } = parsed.data
        , { client, qrToken, table } = await requireTable( event )

        // Il giocatore deve essere autenticato (anche solo anonimo): l'user_id collega
        // la sua iscrizione all'utente Supabase ed è ciò che autorizza il channel realtime.
        , user = await serverSupabaseUser( event ).catch( () => null )
        , userId = supabaseUserId( user );

    if( ! userId ) {

        throw createError( {
            statusCode: 401,
            statusMessage: 'NOT_AUTHENTICATED',
            message: 'Sessione non pronta. Aggiorna la pagina e riprova.',
        } );

    }

    const nowIso = new Date().toISOString();

    let session: { id: string; expires_at: string; locked_at: string | null; selected_game: string | null } | null = null;

    if( requestedSessionId ) {

        const { data } = await client
            .from( 'table_sessions' )
            .select( 'id, expires_at, locked_at, selected_game' )
            .eq( 'id', requestedSessionId )
            .eq( 'table_id', table.tableId )
            .gt( 'expires_at', nowIso )
            .maybeSingle();

        session = data;

        if( ! session ) {

            throw createError( {
                statusCode: 404,
                statusMessage: 'SESSION_NOT_FOUND',
                message: 'La sessione selezionata non esiste più o è scaduta. Aggiorna la pagina e riprova.',
            } );

        }

    } else if( ! createSession ) {

        const { data } = await client
            .from( 'table_sessions' )
            .select( 'id, expires_at, locked_at, selected_game' )
            .eq( 'table_id', table.tableId )
            .gt( 'expires_at', nowIso )
            .order( 'started_at', { ascending: false } )
            .limit( 1 )
            .maybeSingle();

        session = data;

    }

    if( ! session ) {

        const { data, error } = await client
            .from( 'table_sessions' )
            .insert( { table_id: table.tableId } )
            .select( 'id, expires_at, locked_at, selected_game' )
            .single();

        if( error || ! data ) {

            throw createError( {
                statusCode: 500,
                statusMessage: 'SESSION_CREATE_FAILED',
                message: 'Non sono riuscito a creare la sessione di tavolo. Riprova tra qualche secondo.',
            } );

        }

        session = data;

    }

    const { data: colorRows } = await client
            .from( 'player_sessions' )
            .select( 'color' )
            .eq( 'table_session_id', session.id )

        , takenColors = ( colorRows ?? [] ).map( r => r.color )
        , playerColor = pickAvailableColor( takenColors );

    let groupId: string | null = null;

    if( groupName ) {

        // Carica i gruppi della sessione e confronta il nome in modo case-insensitive
        // lato applicazione: evita di passare input utente a un pattern ILIKE (i
        // caratteri %/_ sarebbero wildcard e matcherebbero gruppi inattesi).
        const { data: sessionGroups } = await client
                .from( 'groups' )
                .select( 'id, name, color' )
                .eq( 'table_session_id', session.id )

            , groups = sessionGroups ?? []
            , wanted = groupName.toLowerCase()
            , existingGroup = groups.find( g => g.name.toLowerCase() === wanted );

        if( existingGroup ) groupId = existingGroup.id;
        else {

            const groupColor = pickAvailableColor( groups.map( g => g.color ) )

                , { data: newGroup, error: groupError } = await client
                    .from( 'groups' )
                    .insert( {
                        table_session_id: session.id,
                        name: groupName,
                        color: groupColor,
                    } )
                    .select( 'id' )
                    .single();

            // L'utente ha chiesto un gruppo: se l'INSERT fallisce non proseguire con
            // groupId null (stato incoerente lato UI), ma fallire esplicitamente.
            if( groupError || ! newGroup ) {

                throw createError( {
                    statusCode: 500,
                    statusMessage: 'GROUP_CREATE_FAILED',
                    message: 'Non sono riuscito a creare il gruppo. Riprova.',
                } );

            }

            groupId = newGroup.id;

        }

    }

    // Rientro idempotente: se questo utente ha già una riga in questa sessione
    // (refresh, multi-tab, rientro dopo navigazione) la restitiamo com'è senza
    // creare un duplicato. Non usiamo upsert perché sovrascrirebbe is_host.
    const { data: existing } = await client
        .from( 'player_sessions' )
        .select( 'id, color, is_host, group_id, nickname' )
        .eq( 'table_session_id', session.id )
        .eq( 'user_id', userId )
        .maybeSingle();

    if( existing ) {

        return {
            expiresAt: session.expires_at,
            groupId: existing.group_id,
            hasActiveGame: !! session.locked_at,
            isHost: existing.is_host,
            playerId: existing.id,
            playerColor: existing.color,
            playerNickname: existing.nickname,
            qrToken,
            selectedGame: session.selected_game ?? null,
            tableNumber: table.tableNumber,
            tableSessionId: session.id,
            venueName: table.venueName,
            venueSlug: table.venueSlug,
        };

    }

    // is_host è possibile solo creando una sessione nuova; entrare in una esistente non rende host.
    const isHost = ! requestedSessionId && createSession

        , { data: player, error: playerError } = await client
            .from( 'player_sessions' )
            .insert( {
                table_session_id: session.id,
                nickname,
                color: playerColor,
                group_id: groupId,
                user_id: userId,
                is_host: isHost,
            } )
            .select( 'id, color, is_host' )
            .single();

    if( playerError || ! player ) {

        throw createError( {
            statusCode: 500,
            statusMessage: 'PLAYER_CREATE_FAILED',
            message: 'Non sono riuscito a registrarti al tavolo. Riprova.',
        } );

    }

    // Se è host, registra subito l'host della sessione (serve a vote/next/mode).
    // Se l'UPDATE fallisce il client riceverebbe isHost:true ma la sessione
    // resterebbe senza host, causando 403/NOT_HOST: meglio fallire la join.
    if( isHost ) {

        const { error: hostError } = await client
            .from( 'table_sessions' )
            .update( { host_player_id: player.id } )
            .eq( 'id', session.id )
            .is( 'host_player_id', null );

        if( hostError ) {

            throw createError( {
                statusCode: 500,
                statusMessage: 'HOST_REGISTER_FAILED',
                message: 'Non sono riuscito a registrarti come host. Riprova.',
            } );

        }

    }

    return {
        expiresAt: session.expires_at,
        groupId,
        hasActiveGame: !! session.locked_at,
        isHost: player.is_host,
        playerId: player.id,
        playerColor: player.color,
        playerNickname: nickname,
        qrToken,
        selectedGame: session.selected_game ?? null,
        tableNumber: table.tableNumber,
        tableSessionId: session.id,
        venueName: table.venueName,
        venueSlug: table.venueSlug,
    };

} );
