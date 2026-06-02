import { requireTable, resolveSessionId } from '../../../../utils/request';

// Squadre (groups) di una sessione: id, nome, colore. Servono al gioco per
// mostrare la classifica per squadra (punteggio aggregato). Dati pubblici al tavolo.
export default defineEventHandler( async event => {

    const { client, table } = await requireTable( event )
        , requestedSessionId = getQuery( event ).session as string | undefined
        , sessionId = await resolveSessionId( client, table.tableId, requestedSessionId );

    if( ! sessionId ) return [];

    const { data } = await client
        .from( 'groups' )
        .select( 'id, name, color' )
        .eq( 'table_session_id', sessionId )
        .order( 'created_at', { ascending: true } );

    return ( data ?? [] ).map( g => ( {
        id: g.id,
        name: g.name,
        color: g.color,
    } ) );

} );
