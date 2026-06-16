import { z } from 'zod';

import type { Json } from '../../../../../../../shared/types/database';

import { getGameDefinition, isTurnBasedGame } from '../../../../../../../shared/utils/games';
import { getActiveGame } from '../../../../../../utils/game-engine';
import { buildTurnDeck, buildTurnState, promptAt } from '../../../../../../utils/game-turns';
import { requireHostSession, requireTable } from '../../../../../../utils/request';

const payloadSchema = z.object( { playerId: z.string().uuid() } );

// Avvia un gioco a turni (categorie/dares): solo l'host. Il gioco è quello già
// bloccato sulla sessione (selected_game). Crea/azzera la riga `games` con il mazzo
// mescolato e l'ordine dei turni; lo stato arriva ai client dal trigger di broadcast.
export default defineEventHandler( async event => {

    const parsed = payloadSchema.safeParse( await readBody( event ) );

    if( ! parsed.success ) {

        throw createError( {
            statusCode: 422,
            statusMessage: 'INVALID_PAYLOAD',
            message: 'Richiesta non valida.',
        } );

    }

    const { client, table } = await requireTable( event )
        , { playerId } = parsed.data
        , { session } = await requireHostSession( event, client, playerId, table.tableId )
        , tableSessionId = session.id

        // Il gioco a turni è quello bloccato sulla sessione (no trust del client).
        , { data: sessionRow } = await client
            .from( 'table_sessions' )
            .select( 'selected_game' )
            .eq( 'id', tableSessionId )
            .maybeSingle()

        , kind = sessionRow?.selected_game ?? '';

    if( ! isTurnBasedGame( kind ) ) {

        throw createError( {
            statusCode: 422,
            statusMessage: 'NOT_TURN_BASED',
            message: 'Questo gioco non è a turni.',
        } );

    }

    const existing = await getActiveGame( client, tableSessionId );

    // Già avviato per lo stesso gioco: idempotente (refresh/doppio tap), niente reset.
    if( existing && existing.phase !== 'finished' && existing.kind === kind ) return { ok: true };

    const { data: players } = await client
            .from( 'player_sessions' )
            .select( 'id' )
            .eq( 'table_session_id', tableSessionId )

        , playerIds = ( players ?? [] ).map( p => p.id )
        , minPlayers = getGameDefinition( kind )?.minPlayers ?? 2;

    if( playerIds.length < minPlayers ) {

        throw createError( {
            statusCode: 422,
            statusMessage: 'NOT_ENOUGH_PLAYERS',
            message: `Servono almeno ${ minPlayers } giocatori per iniziare.`,
        } );

    }

    const deck = buildTurnDeck( kind )
        , turnState = buildTurnState( playerIds )
        , prompt = promptAt( deck, 0 )

        // upsert: una sola partita per sessione (sostituisce eventuale partita conclusa).
        , { error } = await client
            .from( 'games' )
            .upsert( {
                table_session_id: tableSessionId,
                kind,
                phase: 'turn',
                round_index: 0,
                total_rounds: 0,
                questions: deck as unknown as Json,
                current_question: prompt as unknown as Json,
                scores: {},
                voted_count: 0,
                total_count: playerIds.length,
                revealed_votes: null,
                host_player_id: playerId,
                turn_state: turnState as unknown as Json,
            }, { onConflict: 'table_session_id' } );

    if( error ) {

        throw createError( {
            statusCode: 500,
            statusMessage: 'GAME_START_FAILED',
            message: 'Non è stato possibile avviare la partita. Riprova.',
        } );

    }

    // Pulisci eventuali voti residui da una partita thumbs precedente sulla sessione.
    if( existing ) await client.from( 'votes' ).delete().eq( 'game_id', existing.id );

    return { ok: true };

} );
