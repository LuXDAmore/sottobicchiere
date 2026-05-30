import { z } from 'zod';

import { getActiveGame } from '../../../../../utils/game-engine';
import { electHost } from '../../../../../utils/host-election';
import { requirePlayer, requireTable } from '../../../../../utils/request';

const claimSchema = z.object( {
    playerId: z.string().uuid(),
    online: z.array( z.string().uuid() ).default( [] ),
    session: z.string().uuid().optional(),
} );

/**
 * Riassegnazione automatica dell'host. Con il vecchio WebSocket lo stato viveva
 * in memoria e quando l'host si disconnetteva il server promuoveva «il primo
 * giocatore rimasto» (reassignHost). Con Supabase non c'è una connessione
 * persistente: la presence è l'unico segnale di chi è online. Quando l'host non
 * è più tra i presenti i client eleggono in modo deterministico (id più piccolo)
 * un successore, che chiama questo endpoint per rivendicare l'host.
 *
 * Sicurezza/robustezza:
 *  • requirePlayer → chi rivendica deve essere autenticato e proprietario del player.
 *  • non si ruba l'host a chi è ancora presente.
 *  • l'elezione è validata lato server sui soli membri reali della sessione.
 *  • update ottimistico con guardia su host_player_id: vince una sola richiesta.
 */
export default defineEventHandler( async event => {

    const parsed = claimSchema.safeParse( await readBody( event ) );

    if( ! parsed.success ) {

        throw createError( {
            statusCode: 422,
            statusMessage: 'INVALID_CLAIM_PAYLOAD',
            message: 'Richiesta non valida.',
        } );

    }

    const { playerId, online, session: requestedSession } = parsed.data
        , { client, table } = await requireTable( event )
        , player = await requirePlayer( event, client, playerId )
        , sessionId = requestedSession ?? player.table_session_id;

    // Il giocatore può rivendicare l'host solo della propria sessione.
    if( player.table_session_id !== sessionId ) {

        throw createError( {
            statusCode: 403,
            statusMessage: 'FORBIDDEN_SESSION',
            message: 'Azione non consentita per questa sessione.',
        } );

    }

    // Non riassegnare host su sessioni scadute: il filtro su expires_at evita di
    // propagare broadcast verso sessioni già terminate.
    const now = new Date().toISOString()

        , { data: session } = await client
            .from( 'table_sessions' )
            .select( 'id, host_player_id, table_id' )
            .eq( 'id', sessionId )
            .gt( 'expires_at', now )
            .maybeSingle();

    if( ! session ) {

        throw createError( {
            statusCode: 404,
            statusMessage: 'SESSION_NOT_FOUND',
            message: 'Sessione non trovata o scaduta.',
        } );

    }

    if( session.table_id !== table.tableId ) {

        throw createError( {
            statusCode: 403,
            statusMessage: 'SESSION_TABLE_MISMATCH',
            message: 'Sessione non valida per questo tavolo.',
        } );

    }

    const currentHost = session.host_player_id;

    // Già host: idempotente.
    if( currentHost === playerId ) return { ok: true, hostPlayerId: playerId };

    // Valida l'elezione sui soli membri reali della sessione (no presence spoofing).
    const { data: members } = await client
            .from( 'player_sessions' )
            .select( 'id' )
            .eq( 'table_session_id', sessionId )

        , memberIds = ( members ?? [] ).map( m => m.id )
        , winner = electHost( currentHost, online, memberIds );

    // Riassegna solo se chi rivendica è davvero l'eletto (host assente + id minore).
    if( ! winner || winner !== playerId ) return { ok: false, hostPlayerId: currentHost };

    // Update ottimistico: la guardia su host_player_id fa vincere una sola
    // richiesta; il filtro su expires_at esclude le sessioni scadute tra la SELECT
    // e l'UPDATE. `.select()` ci dice se la riga è stata davvero aggiornata.
    const base = client
            .from( 'table_sessions' )
            .update( { host_player_id: playerId } )
            .eq( 'id', sessionId )
            .gt( 'expires_at', now )

        , { data: updated, error } = await ( currentHost === null
            ? base.is( 'host_player_id', null )
            : base.eq( 'host_player_id', currentHost ) ).select( 'host_player_id' );

    if( error ) {

        throw createError( {
            statusCode: 500,
            statusMessage: 'HOST_CLAIM_FAILED',
            message: 'Non sono riuscito a riassegnare l\'host. Riprova.',
        } );

    }

    // Nessuna riga aggiornata: sessione scaduta o host già rivendicato da un altro
    // client nella race tra SELECT e UPDATE. Risposta coerente, niente broadcast.
    if( ! updated || updated.length === 0 ) return { ok: false, hostPlayerId: currentHost };

    // Allinea l'host anche sulla partita attiva: il quorum/auto-reveal segue chi
    // riporta la presence, e il fallback isHost lato client legge games.host_player_id.
    const activeGame = await getActiveGame( client, sessionId );

    if( activeGame && activeGame.host_player_id !== playerId ) {

        await client
            .from( 'games' )
            .update( { host_player_id: playerId } )
            .eq( 'id', activeGame.id );

    }

    return { ok: true, hostPlayerId: playerId };

} );
