import type { ServiceClient } from './supabase';
import type { Database, Json } from '../../shared/types/database';
import type { VoteChoice } from '../../shared/types/realtime';

import { computeReveal } from './game-thumbs';

/**
 * Numero di giocatori attualmente iscritti alla sessione (denominatore dei voti).
 * @param client - client Supabase service role.
 * @param tableSessionId - id della sessione.
 */
export async function countSessionPlayers( client: ServiceClient, tableSessionId: string ): Promise<number> {

    const { count } = await client
        .from( 'player_sessions' )
        .select( 'id', {
            count: 'exact',
            head: true,
        } )
        .eq( 'table_session_id', tableSessionId );

    return count ?? 0;

}

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
 * L'UPDATE su `games` viene propagato ai client dal trigger di broadcast.
 * @param client - client Supabase service role.
 * @param game - riga della partita corrente.
 */
export async function recomputeAndMaybeReveal( client: ServiceClient, game: GameRow ): Promise<void> {

    const totalCount = await countSessionPlayers( client, game.table_session_id )

        , { data: voteRows } = await client
            .from( 'votes' )
            .select( 'player_id, vote' )
            .eq( 'game_id', game.id )
            .eq( 'round_index', game.round_index )

        , votes = voteRows ?? []
        , votedCount = votes.length

        , update: Database['public']['Tables']['games']['Update'] = {
            voted_count: votedCount,
            total_count: totalCount,
        };

    if( game.phase === 'voting' && totalCount > 0 && votedCount >= totalCount ) {

        const voteMap = Object.fromEntries( votes.map( v => [ v.player_id, v.vote as VoteChoice ] ) )
            , { scores } = computeReveal( voteMap, ( game.scores ?? {} ) as Record<string, number> );

        update.phase = 'reveal';
        update.scores = scores as unknown as Json;
        update.revealed_votes = voteMap as unknown as Json;

    }

    await client.from( 'games' ).update( update ).eq( 'id', game.id );

}
