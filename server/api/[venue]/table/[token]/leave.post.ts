import { z } from 'zod';

import { requirePlayer, requireTable } from '../../../../utils/request';

const payloadSchema = z.object( { playerId: z.string().uuid() } );

// Uscita esplicita dal tavolo: rimuove la riga del giocatore (così i conteggi
// delle sessioni attive restano veritieri) e, se la sessione resta vuota, la fa
// scadere subito invece di lasciare un "tavolo fantasma" fino al TTL.
export default defineEventHandler( async event => {

    const parsed = payloadSchema.safeParse( await readBody( event ) );

    if( ! parsed.success ) {

        throw createError( {
            statusCode: 422,
            statusMessage: 'INVALID_PAYLOAD',
            message: 'Richiesta non valida.',
        } );

    }

    const { client, table } = await requireTable( event )

        // Anti-impersonificazione: si può rimuovere solo il proprio giocatore.
        , player = await requirePlayer( event, client, parsed.data.playerId )

        , { data: session } = await client
            .from( 'table_sessions' )
            .select( 'id, host_player_id, table_id' )
            .eq( 'id', player.table_session_id )
            .maybeSingle();

    if( ! session || session.table_id !== table.tableId ) {

        throw createError( {
            statusCode: 403,
            statusMessage: 'PLAYER_TABLE_MISMATCH',
            message: 'Questo giocatore non appartiene a questo tavolo.',
        } );

    }

    const { error: deleteError } = await client
        .from( 'player_sessions' )
        .delete()
        .eq( 'id', player.id );

    if( deleteError ) {

        throw createError( {
            statusCode: 500,
            statusMessage: 'LEAVE_FAILED',
            message: 'Non è stato possibile uscire dal tavolo. Riprova.',
        } );

    }

    const { data: remaining } = await client
        .from( 'player_sessions' )
        .select( 'id' )
        .eq( 'table_session_id', session.id )
        .limit( 1 );

    if( ! remaining || remaining.length === 0 ) {

        // Sessione vuota: falla scadere subito (sparisce dall'elenco e il cleanup
        // pg_cron la raccoglierà). Best-effort: in caso di errore resta il TTL.
        await client
            .from( 'table_sessions' )
            .update( { expires_at: new Date().toISOString() } )
            .eq( 'id', session.id );

    } else if( session.host_player_id === player.id ) {

        // L'host se n'è andato: azzera il puntatore, i superstiti eleggono un
        // successore via presence + /session/claim-host (logica già esistente).
        await client
            .from( 'table_sessions' )
            .update( { host_player_id: null } )
            .eq( 'id', session.id );

    }

    return { ok: true };

} );
