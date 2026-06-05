// Aggregazione dei punteggi per squadra (group) a partire dai punteggi per giocatore.
// Decisione di prodotto #2: il gioco resta per-tavolo, ma i punteggi si possono
// leggere anche per squadra (Team Blu vs Team Rosso). Funzione pura e testabile.

export interface TeamScore {
    groupId: string;
    name: string;
    color: string;
    score: number;
    memberCount: number;
}

export interface TeamScoreInput {
    // Squadre della sessione.
    groups: { id: string; name: string; color: string }[];
    // Mappa giocatore → squadra (null se senza squadra).
    playerGroups: Record<string, string | null>;
    // Punteggi per giocatore (es. games.scores).
    scores: Record<string, number>;
}

/**
 * Somma i punteggi dei giocatori per squadra e ordina dalla più alta.
 * I giocatori senza squadra non contribuiscono ad alcun totale.
 * @param input - squadre, appartenenze e punteggi per giocatore.
 */
export function aggregateTeamScores( input: TeamScoreInput ): TeamScore[] {

    const totals = new Map<string, { score: number; members: number }>();

    for( const group of input.groups ) {

        totals.set( group.id, {
            score: 0,
            members: 0,
        } );

    }

    for( const [ playerId, groupId ] of Object.entries( input.playerGroups ) ) {

        if( ! groupId ) continue;

        const bucket = totals.get( groupId );

        if( ! bucket ) continue;

        bucket.score += input.scores[ playerId ] ?? 0;
        bucket.members += 1;

    }

    const ranked = input.groups.map( group => {

        const bucket = totals.get( group.id ) ?? {
            score: 0,
            members: 0,
        };

        return {
            groupId: group.id,
            name: group.name,
            color: group.color,
            score: bucket.score,
            memberCount: bucket.members,
        };

    } );

    // .sort() su un array appena creato da map() (nessun input esterno mutato).
    // Non usiamo .toSorted(): è ES2023 e non è coperto da browserslist `defaults`
    // senza polyfill → rischio crash a runtime su browser più datati.
    // eslint-disable-next-line unicorn/no-array-sort
    return ranked.sort( ( a, b ) => b.score - a.score );

}
