// Elezione pura dell'host: nessun IO, facile da testare. Replica la semantica
// del vecchio reassignHost in memoria («promuovi il primo giocatore rimasto»),
// ma in modo deterministico così che client diversi eleggano lo stesso successore.

/**
 * Decide chi deve diventare host dato l'host corrente e i presenti.
 *  • Se l'host corrente è ancora online → nessuna riassegnazione (null).
 *  • Altrimenti vince l'id più piccolo tra i presenti che sono membri reali.
 *  • Se non c'è nessun candidato → null.
 *
 * @param currentHost host attuale (o null se assente)
 * @param onlineIds   id riportati come online (presence)
 * @param memberIds   id dei giocatori realmente iscritti alla sessione
 */
export function electHost(
    currentHost: string | null,
    onlineIds: string[],
    memberIds: Iterable<string>,
): string | null {

    const members = new Set( memberIds )
        , onlineMembers = onlineIds.filter( id => members.has( id ) ).toSorted();

    if( currentHost && onlineMembers.includes( currentHost ) ) return null;

    return onlineMembers[ 0 ] ?? null;

}
