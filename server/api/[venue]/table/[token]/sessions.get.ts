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

    const sessionIds = activeSessions.map( s => s.id )
        , hostIds = activeSessions.map( s => s.host_player_id ).filter( Boolean ) as string[]

        // Due query batch invece di 2N query (pattern N+1).
        , [ { data: allPlayers }, { data: hostRows } ] = await Promise.all( [

            // Tutti i player_sessions delle sessioni attive: conteggio in memoria.
            client
                .from( 'player_sessions' )
                .select( 'table_session_id' )
                .in( 'table_session_id', sessionIds ),

            // Nickname degli host in un unico round-trip.
            hostIds.length > 0
                ? client
                    .from( 'player_sessions' )
                    .select( 'id, nickname' )
                    .in( 'id', hostIds )
                : Promise.resolve( { data: [] } ),

        ] );

    // Mappa id sessione → conteggio giocatori.
    const countBySession = new Map<string, number>();

    for( const row of allPlayers ?? [] ) {

        countBySession.set( row.table_session_id, ( countBySession.get( row.table_session_id ) ?? 0 ) + 1 );

    }

    // Mappa player id → nickname.
    const nicknameByPlayer = new Map( ( hostRows ?? [] ).map( r => [ r.id, r.nickname ] ) );

    const sessions = activeSessions.map( s => ( {
        hasActiveGame: !! s.locked_at,
        hostNickname: s.host_player_id ? ( nicknameByPlayer.get( s.host_player_id ) ?? null ) : null,
        playerCount: countBySession.get( s.id ) ?? 0,
        selectedGame: s.selected_game,
        sessionId: s.id,
        startedAt: s.started_at,
    } ) );

    return { sessions };

} );
