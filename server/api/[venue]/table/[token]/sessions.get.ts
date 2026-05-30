import { requireTable } from '../../../../utils/request';

export default defineEventHandler( async event => {

    const { client, table } = await requireTable( event )
        , nowIso = new Date().toISOString()

        , { data: activeSessions } = await client
            .from( 'table_sessions' )
            .select( 'id, started_at, selected_game, locked_at, host_player_id' )
            .eq( 'table_id', table.tableId )
            .gt( 'expires_at', nowIso )
            .order( 'started_at', { ascending: false } );

    if( ! activeSessions || activeSessions.length === 0 ) return { sessions: [] };

    const sessions = await Promise.all(
        activeSessions.map( async s => {

            const { count } = await client
                .from( 'player_sessions' )
                .select( 'id', {
                    count: 'exact',
                    head: true,
                } )
                .eq( 'table_session_id', s.id );

            let hostNickname: string | null = null;

            if( s.host_player_id ) {

                const { data: host } = await client
                    .from( 'player_sessions' )
                    .select( 'nickname' )
                    .eq( 'id', s.host_player_id )
                    .maybeSingle();

                hostNickname = host?.nickname ?? null;

            }

            return {
                hasActiveGame: !! s.locked_at,
                hostNickname,
                playerCount: count ?? 0,
                selectedGame: s.selected_game,
                sessionId: s.id,
                startedAt: s.started_at,
            };

        } )
    );

    return { sessions };

} );
