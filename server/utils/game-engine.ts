import type { ServiceClient } from './supabase';
import type { Database, Json } from '../../shared/types/database';
import type { VoteChoice } from '../../shared/types/realtime';

import { computeReveal } from './game-thumbs';

// Colonne minime per gestire voto/quorum/host senza caricare il JSON `questions`
// (l'intero mazzo) né `current_question`/`revealed_votes`: usate dal path caldo dei
// voti e dalle azioni host. La riga completa serve solo a state.get e next.
const LITE_COLUMNS = 'id, phase, round_index, total_count, scores, host_player_id';

/**
 * Partita corrente di una sessione (riga completa), se esiste.
 * @param client - client Supabase service role.
 * @param tableSessionId - id della sessione.
 */
export async function getActiveGame( client: ServiceClient, tableSessionId: string ) {

    const { data } = await client
        .from( 'games' )
        .select( '*' )
        // C'è al più una partita per sessione (upsert onConflict 'table_session_id'):
        // .limit(1) è cintura+bretelle perché un'eventuale riga duplicata non faccia
        // lanciare maybeSingle (degrada alla prima riga invece di rompere il flusso).
        .eq( 'table_session_id', tableSessionId )
        .limit( 1 )
        .maybeSingle();

    return data;

}

/**
 * Partita corrente con sole le colonne necessarie a voto/quorum/host: evita di
 * caricare `questions`/`current_question`/`revealed_votes` sul path caldo dei voti.
 * @param client - client Supabase service role.
 * @param tableSessionId - id della sessione.
 */
export async function getActiveGameLite( client: ServiceClient, tableSessionId: string ) {

    const { data } = await client
        .from( 'games' )
        .select( LITE_COLUMNS )
        .eq( 'table_session_id', tableSessionId )
        .limit( 1 )
        .maybeSingle();

    return data;

}

type GameRow = NonNullable<Awaited<ReturnType<typeof getActiveGame>>>;

// Forma minima richiesta dal recompute: compatibile sia con la riga completa sia
// con quella "lite", così i chiamatori possono passare la versione più economica.
type RevealableGame = Pick<GameRow, 'id' | 'phase' | 'round_index' | 'scores' | 'total_count'>;

/**
 * Ricalcola i conteggi del round e, se tutti hanno votato, svela i risultati.
 * Il quorum (`total_count`) è il numero di giocatori online: viene mantenuto dal
 * client host tramite la presence (vedi route game/presence). Qui di default si
 * usa il valore già memorizzato sulla partita, sovrascrivibile con `totalCount`.
 * L'UPDATE su `games` viene propagato ai client dal trigger di broadcast.
 *
 * Ottimizzazione: nel caso comune (voto che NON chiude il round) si fa solo un
 * COUNT leggero (`head: true`) invece di caricare tutte le righe dei voti; le righe
 * si leggono solo al raggiungimento del quorum, quando servono per il reveal.
 * @param client - client Supabase service role.
 * @param game - partita corrente (riga completa o "lite").
 * @param totalCount - quorum esplicito (es. conteggio online dalla presence).
 */
export async function recomputeAndMaybeReveal( client: ServiceClient, game: RevealableGame, totalCount?: number ): Promise<void> {

    const quorum = totalCount ?? game.total_count

        , { count, error: countError } = await client
            .from( 'votes' )
            .select( '*', {
                count: 'exact',
                head: true,
            } )
            .eq( 'game_id', game.id )
            .eq( 'round_index', game.round_index );

    // Se il COUNT fallisce tratteremmo i voti come 0, sovrascrivendo voted_count
    // (e magari impedendo il reveal) con uno stato errato: meglio fallire.
    if( countError ) {

        throw createError( {
            statusCode: 500,
            statusMessage: 'VOTES_READ_FAILED',
            message: 'Non sono riuscito a leggere i voti. Riprova.',
        } );

    }

    let votedCount = count ?? 0;

    const update: Database['public']['Tables']['games']['Update'] = {
        voted_count: votedCount,
        total_count: quorum,
    };

    if( game.phase === 'voting' && quorum > 0 && votedCount >= quorum ) {

        // Quorum raggiunto: ora servono i voti per costruire la mappa del reveal.
        const { data: voteRows, error: votesError } = await client
            .from( 'votes' )
            .select( 'player_id, vote' )
            .eq( 'game_id', game.id )
            .eq( 'round_index', game.round_index );

        if( votesError ) {

            throw createError( {
                statusCode: 500,
                statusMessage: 'VOTES_READ_FAILED',
                message: 'Non sono riuscito a leggere i voti. Riprova.',
            } );

        }

        const votes = voteRows ?? []
            , voteMap = Object.fromEntries( votes.map( v => [ v.player_id, v.vote as VoteChoice ] ) )
            , { scores } = computeReveal( voteMap, ( game.scores ?? {} ) as Record<string, number> );

        // Allinea voted_count alla mappa svelata (potrebbe essere arrivato un voto
        // tra il COUNT e questa SELECT): mantiene conteggio e reveal coerenti.
        votedCount = votes.length;
        update.voted_count = votedCount;
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
