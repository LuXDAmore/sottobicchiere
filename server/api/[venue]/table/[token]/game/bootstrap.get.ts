import type { SessionMode } from '../../../../../../shared/types/realtime';

import { getActiveGame } from '../../../../../utils/game-engine';
import { requireTable, resolveSessionId } from '../../../../../utils/request';

// Stato iniziale del tavolo in una sola chiamata: unisce game/current (selezione)
// e game/state (riga partita) risolvendo la sessione UNA volta. Riduce i round-trip
// e le risoluzioni di tavolo/sessione a ogni SUBSCRIBED/riconnessione del client.
// Query: ?session=<tableSessionId> per ancorarsi alla sessione del giocatore.
export default defineEventHandler( async event => {

    const { client, table } = await requireTable( event )
        , sessionId = await resolveSessionId( client, table.tableId, getQuery( event ).session as string | undefined )

        , empty = {
            selectedGame: null,
            gameMode: null,
            lockedAt: null,
            hostPlayerId: null,
            sessionMode: 'board' as SessionMode,
            datingEnabled: false,
            game: null,
        };

    if( ! sessionId ) return empty;

    // Selezione di sessione e riga partita in parallelo (stessa sessione già risolta).
    const [ sessionRes, game ] = await Promise.all( [
            client
                .from( 'table_sessions' )
                .select( 'selected_game, game_mode, locked_at, host_player_id, session_mode, dating_enabled' )
                .eq( 'id', sessionId )
                .maybeSingle(),
            getActiveGame( client, sessionId ),
        ] )

        , session = sessionRes.data;

    return {
        selectedGame: session?.selected_game ?? null,
        gameMode: session?.game_mode ?? null,
        lockedAt: session?.locked_at ?? null,
        hostPlayerId: session?.host_player_id ?? null,
        sessionMode: ( session?.session_mode ?? 'board' ) as SessionMode,
        datingEnabled: session?.dating_enabled ?? false,
        game,
    };

} );
