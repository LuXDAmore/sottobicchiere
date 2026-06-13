import { z } from 'zod';

import type { GameId } from '../../../../../../shared/utils/games';

import { GAME_DEFINITIONS, getGameDefinition } from '../../../../../../shared/utils/games';
import { requirePlayer, requireTable } from '../../../../../utils/request';

// Solo i giochi del catalogo (che hanno una pagina reale): evita che venga
// persistito uno slug arbitrario che porterebbe gli altri giocatori su
// /game/<inesistente> (404). La lista è derivata dal catalogo condiviso, così
// aggiungere un gioco in `games.ts` lo abilita anche qui senza dimenticanze.
const gameIds = GAME_DEFINITIONS.map( g => g.id ) as [ GameId, ... GameId[] ]

    , payloadSchema = z.object( {
        gameMode: z.string().min( 1 ).max( 40 ).optional(),
        playerId: z.string().uuid(),
        selectedGame: z.enum( gameIds ),
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

    const body = parsed.data;

    // I giochi in solitaria si avviano localmente sul singolo dispositivo: non
    // devono bloccare la sessione né trascinare l'intero tavolo via broadcast.
    if( getGameDefinition( body.selectedGame )?.category === 'solo' ) {

        throw createError( {
            statusCode: 422,
            statusMessage: 'SOLO_GAME_NOT_SELECTABLE',
            message: 'I giochi in solitaria si avviano direttamente, senza bloccare il tavolo.',
        } );

    }

    const { client, table } = await requireTable( event )

        // Verifica proprietà del giocatore (anti-impersonificazione) e ne ricava la sessione.
        , player = await requirePlayer( event, client, body.playerId )

        , { data: session } = await client
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
    // Stessa semantica di requireHostSession: se host_player_id non è ancora
    // valorizzato (race subito dopo la creazione), può procedere solo chi ha
    // creato la sessione (is_host) — non il primo guest che seleziona un gioco.
    const isAuthorized = session.host_player_id === null
        ? player.is_host
        : session.host_player_id === body.playerId;

    if( ! isAuthorized ) {

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
