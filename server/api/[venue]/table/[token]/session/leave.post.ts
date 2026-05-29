import { z } from 'zod';

import { getActiveGame, recomputeAndMaybeReveal } from '../../../../../utils/game-engine';
import { requireTable } from '../../../../../utils/request';

const payloadSchema = z.object( { playerId: z.string().uuid() } );

// Uscita esplicita dal tavolo: rimuove il record persistente del giocatore.
// La presenza "online" è gestita lato client dalla presence del channel; questa
// route serve a non lasciare giocatori fantasma che bloccherebbero il reveal.
export default defineEventHandler( async event => {

    const parsed = payloadSchema.safeParse( await readBody( event ) );

    if( ! parsed.success ) return { ok: true };

    const { client } = await requireTable( event )
        , { playerId } = parsed.data

        , { data: player } = await client
            .from( 'player_sessions' )
            .select( 'id, table_session_id' )
            .eq( 'id', playerId )
            .maybeSingle();

    if( ! player ) return { ok: true };

    await client.from( 'player_sessions' ).delete().eq( 'id', player.id );

    // Se una votazione era in corso, l'uscita può aver completato il quorum.
    const game = await getActiveGame( client, player.table_session_id );

    if( game && game.phase === 'voting' ) await recomputeAndMaybeReveal( client, game );

    return { ok: true };

} );
