import { findLatestActiveSession, requireTable } from '../../../../utils/request';

export default defineEventHandler( async event => {

    const { client, table } = await requireTable( event )
        , session = await findLatestActiveSession( client, table.tableId );

    if( ! session ) return [];

    const { data } = await client
        .from( 'player_sessions' )
        .select( 'id, nickname, color, group_id, joined_at' )
        .eq( 'table_session_id', session.id )
        .order( 'joined_at', { ascending: true } );

    return ( data ?? [] ).map( p => ( {
        color: p.color,
        groupId: p.group_id,
        id: p.id,
        joinedAt: p.joined_at,
        nickname: p.nickname,
    } ) );

} );
