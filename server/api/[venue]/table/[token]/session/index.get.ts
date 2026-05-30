import { findLatestActiveSession, requireTable } from '../../../../../utils/request';

export default defineEventHandler( async event => {

    const { client, table } = await requireTable( event )
        , session = await findLatestActiveSession( client, table.tableId );

    if( ! session ) return null;

    let hostNickname: string | null = null
        , hostPlayerId: string | null = session.host_player_id ?? null;

    // Host: preferisci quello registrato sulla sessione, altrimenti il primo entrato.
    const { data: host } = hostPlayerId
        ? await client.from( 'player_sessions' ).select( 'id, nickname' ).eq( 'id', hostPlayerId ).maybeSingle()
        : await client.from( 'player_sessions' ).select( 'id, nickname' ).eq( 'table_session_id', session.id ).eq( 'is_host', true ).order( 'joined_at', { ascending: true } ).limit( 1 ).maybeSingle();

    if( host ) {

        hostPlayerId = host.id;
        hostNickname = host.nickname;

    }

    const expiresMs = new Date( session.expires_at ).getTime()
        , remainingSeconds = Math.max( 0, Math.floor( ( expiresMs - Date.now() ) / 1000 ) );

    return {
        expiresAt: session.expires_at,
        hostNickname,
        hostPlayerId,
        id: session.id,
        remainingSeconds,
        status: 'active' as const,
    };

} );
