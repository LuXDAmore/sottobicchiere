import type { ServiceClient } from './supabase';
import type { Database, Json } from '../../shared/types/database';
import type { VoteChoice } from '../../shared/types/realtime';

import { computeReveal } from './game-thumbs';

/**
 * Partita corrente di una sessione, se esiste.
 * @param client - client Supabase service role.
 * @param tableSessionId - id della sessione.
 */
export async function getActiveGame( client: ServiceClient, tableSessionId: string ) {

    const { data } = await client
        .from( 'games' )
        .select( '*' )
        .eq( 'table_session_id', tableSessionId )
        .maybeSingle();

    return data;

}

type GameRow = NonNullable<Awaited<ReturnType<typeof getActiveGame>>>;

/**
 * Ricalcola i conteggi del round e, se tutti hanno votato, svela i risultati.
 * Il quorum (`total_count`) è il numero di giocatori online: viene mantenuto dal
 * client host tramite la presence (vedi route game/presence). Qui di default si
 * usa il valore già memorizzato sulla partita, sovrascrivibile con `totalCount`.
 * L'UPDATE su `games` viene propagato ai client dal trigger di broadcast.
 * @param client - client Supabase service role.
 * @param game - riga della partita corrente.
 * @param totalCount - quorum esplicito (es. conteggio online dalla presence).
 */
export async function recomputeAndMaybeReveal( client: ServiceClient, game: GameRow, totalCount?: number ): Promise<void> {

    const quorum = totalCount ?? game.total_count

        , { data: voteRows } = await client
            .from( 'votes' )
            .select( 'player_id, vote' )
            .eq( 'game_id', game.id )
            .eq( 'round_index', game.round_index )

        , votes = voteRows ?? []
        , votedCount = votes.length

        , update: Database['public']['Tables']['games']['Update'] = {
            voted_count: votedCount,
            total_count: quorum,
        };

    if( game.phase === 'voting' && quorum > 0 && votedCount >= quorum ) {

        const voteMap = Object.fromEntries( votes.map( v => [ v.player_id, v.vote as VoteChoice ] ) )
            , { scores } = computeReveal( voteMap, ( game.scores ?? {} ) as Record<string, number> );

        update.phase = 'reveal';
        update.scores = scores as unknown as Json;
        update.revealed_votes = voteMap as unknown as Json;

    }

    const { error } = await client.from( 'games' ).update( update ).eq( 'id', game.id );

    // Se l'UPDATE fallisce (permessi, rete, lock) i client resterebbero
    // desincronizzati: meglio fallire esplicitamente che rispondere ok.
    if( error ) {

        throw createError( {
            statusCode: 500,
            statusMessage: 'GAME_UPDATE_FAILED',
            message: 'Non sono riuscito ad aggiornare la partita. Riprova.',
        } );

    }

}
