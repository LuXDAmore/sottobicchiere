import { z } from 'zod';

import type { Json } from '../../../../../../../shared/types/database';
import type { TurnState } from '../../../../../../utils/game-turns';

import { isTurnBasedGame } from '../../../../../../../shared/utils/games';
import { getActiveGame } from '../../../../../../utils/game-engine';
import { advanceTurnState, currentTurnPlayer, promptAt } from '../../../../../../utils/game-turns';
import { isSessionHost, requirePlayer, requireTable } from '../../../../../../utils/request';

const payloadSchema = z.object( {
    playerId: z.string().uuid(),
    action: z.enum( [ 'newPrompt', 'next' ] ),
    // Id online (presence) per saltare al prossimo giocatore presente; opzionale.
    online: z.array( z.string().uuid() ).optional(),
} );

// Avanza un gioco a turni. Può farlo SOLO il giocatore di turno (o l'host, che può
// sbloccare se il giocatore di turno è uscito). Lo stato nuovo viene propagato dal
// trigger di broadcast su `games`.
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
        , { playerId, action, online } = parsed.data
        , player = await requirePlayer( event, client, playerId )

        , { data: session } = await client
            .from( 'table_sessions' )
            .select( 'id, host_player_id' )
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

    const game = await getActiveGame( client, session.id );

    if( ! game || game.phase === 'finished' || ! game.turn_state || ! isTurnBasedGame( game.kind ) ) {

        throw createError( {
            statusCode: 404,
            statusMessage: 'GAME_NOT_FOUND',
            message: 'Nessuna partita a turni in corso.',
        } );

    }

    const state = game.turn_state as unknown as TurnState;

    // Solo il giocatore di turno avanza; l'host è l'eccezione (sblocco se chi è di
    // turno è andato offline).
    if( currentTurnPlayer( state ) !== player.id && ! isSessionHost( session, player ) ) {

        throw createError( {
            statusCode: 403,
            statusMessage: 'NOT_YOUR_TURN',
            message: 'Aspetta il tuo turno.',
        } );

    }

    const deck = ( game.questions ?? [] ) as unknown[]
        , nextState = advanceTurnState( state, game.kind, action, online )
        , prompt = promptAt( deck, nextState.deckIndex )

        , { error } = await client
            .from( 'games' )
            .update( {
                turn_state: nextState as unknown as Json,
                current_question: prompt as unknown as Json,
            } )
            .eq( 'id', game.id );

    if( error ) {

        throw createError( {
            statusCode: 500,
            statusMessage: 'GAME_UPDATE_FAILED',
            message: 'Non è stato possibile aggiornare la partita. Riprova.',
        } );

    }

    return { ok: true };

} );
