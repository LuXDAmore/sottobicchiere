import { requireTable, resolveSessionId } from '../../../../../utils/request';

// Aree di una sessione con i relativi membri (e i giocatori senza area).
// Dati pubblici al tavolo (nickname/colore/squadra): nessun user_id esposto.
export default defineEventHandler( async event => {

    const { client, table } = await requireTable( event )
        , requestedSessionId = getQuery( event ).session as string | undefined
        , sessionId = await resolveSessionId( client, table.tableId, requestedSessionId );

    if( ! sessionId ) {

        return {
            areas: [],
            unassigned: [],
        };

    }

    const [ areasResult, playersResult ] = await Promise.all( [
            client
                .from( 'areas' )
                .select( 'id, name, color, ordinal' )
                .eq( 'table_session_id', sessionId )
                .order( 'ordinal', { ascending: true } )
                .order( 'created_at', { ascending: true } ),
            client
                .from( 'player_sessions' )
                .select( 'id, nickname, color, group_id, area_id' )
                .eq( 'table_session_id', sessionId )
                .order( 'joined_at', { ascending: true } ),
        ] )

        , members = ( playersResult.data ?? [] ).map( p => ( {
            id: p.id,
            nickname: p.nickname,
            color: p.color,
            groupId: p.group_id,
            areaId: p.area_id,
        } ) )

        , areas = ( areasResult.data ?? [] ).map( a => ( {
            id: a.id,
            name: a.name,
            color: a.color,
            ordinal: a.ordinal,
            members: members.filter( m => m.areaId === a.id ),
        } ) )

        , unassigned = members.filter( m => ! m.areaId );

    return {
        areas,
        unassigned,
    };

} );
