import { getActiveGame } from '../../../../../utils/game-engine';
import { requireTable, resolveSessionId } from '../../../../../utils/request';

// Stato completo della partita corrente: serve a chi entra/ricarica a partita in
// corso (il realtime invia solo i cambi successivi). Restituisce la riga `games`
// grezza, mappata dal client esattamente come un evento di broadcast.
// Query: ?session=<tableSessionId> per ancorarsi alla sessione del giocatore.
export default defineEventHandler( async event => {

    const { client, table } = await requireTable( event )
        , sessionId = await resolveSessionId( client, table.tableId, getQuery( event ).session as string | undefined );

    if( ! sessionId ) return null;

    return await getActiveGame( client, sessionId );

} );
