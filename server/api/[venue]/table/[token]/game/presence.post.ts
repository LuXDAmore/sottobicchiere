import { z } from 'zod';

import { getActiveGame, recomputeAndMaybeReveal } from '../../../../../utils/game-engine';
import { requireHostSession, requireTable } from '../../../../../utils/request';

// Il client host comunica i giocatori online (dalla presence del channel): è il
// quorum dei voti. Così l'auto-reveal scatta quando tutti i presenti hanno votato
// e l'uscita di un giocatore non blocca il round (riproduce il comportamento WS).
const payloadSchema = z.object( {
    playerId: z.string().uuid(),
    online: z.array( z.string().uuid() ).max( 64 ),
} );

export default defineEventHandler( async event => {

    const parsed = payloadSchema.safeParse( await readBody( event ) );

    if( ! parsed.success ) return { ok: true };

    const { client, table } = await requireTable( event )
        , { playerId, online } = parsed.data
        , { session } = await requireHostSession( event, client, playerId, table.tableId )
        , game = await getActiveGame( client, session.id );

    if( ! game || game.phase !== 'voting' ) return { ok: true };

    await recomputeAndMaybeReveal( client, game, online.length );

    return { ok: true };

} );
