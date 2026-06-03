import { requireTable, resolveSessionId } from '../../../../utils/request';

export default defineEventHandler( async event => {

    const { client, table } = await requireTable( event )
        , requestedSessionId = getQuery( event ).session as string | undefined
        , sessionId = await resolveSessionId( client, table.tableId, requestedSessionId );

    if( ! sessionId ) return [];

    const { data } = await client
        .from( 'player_sessions' )
        .select( 'id, nickname, color, group_id, area_id, joined_at' )
        .eq( 'table_session_id', sessionId )
        .order( 'joined_at', { ascending: true } );

    return ( data ?? [] ).map( p => ( {
        areaId: p.area_id,
        color: p.color,
        groupId: p.group_id,
        id: p.id,
        joinedAt: p.joined_at,
        nickname: p.nickname,
    } ) );

} );
