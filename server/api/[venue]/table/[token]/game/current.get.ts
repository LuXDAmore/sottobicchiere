import type { SessionMode } from '../../../../../../shared/types/realtime';
import { findLatestActiveSession, requireTable } from '../../../../../utils/request';

// Selezione gioco corrente. Query: ?session=<tableSessionId> per ancorarsi alla
// sessione del giocatore (un tavolo può avere più sessioni attive).
export default defineEventHandler( async event => {

    const { client, table } = await requireTable( event )
        , requested = getQuery( event ).session as string | undefined;

    let session = null;

    if( requested ) {

        const { data } = await client
            .from( 'table_sessions' )
            .select( 'selected_game, game_mode, locked_at, host_player_id, session_mode, dating_enabled' )
            .eq( 'id', requested )
            .eq( 'table_id', table.tableId )
            .gt( 'expires_at', new Date().toISOString() )
            .maybeSingle();

        session = data;

    }

    if( ! session ) session = await findLatestActiveSession( client, table.tableId );

    return {
        selectedGame: session?.selected_game ?? null,
        gameMode: session?.game_mode ?? null,
        lockedAt: session?.locked_at ?? null,
        hostPlayerId: session?.host_player_id ?? null,
        sessionMode: ( session?.session_mode ?? 'board' ) as SessionMode,
        datingEnabled: session?.dating_enabled ?? false,
    };

} );
