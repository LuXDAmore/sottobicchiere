export type GameCategory = 'board' | 'preserata' | 'both';

export interface GameDefinition {
    id: 'thumbs' | 'word-blitz';
    category: GameCategory;
    minPlayers: number;
    // Limite superiore di giocatori; undefined = nessun limite (la UI mostra "Min. {n}").
    maxPlayers?: number;
    avgDurationMinutes: number;
    icon: string;
    labelKey: string;
}

export const GAME_DEFINITIONS: GameDefinition[] = [
    {
        id: 'thumbs',
        category: 'both',
        minPlayers: 2,
        avgDurationMinutes: 8,
        icon: '👍',
        labelKey: 'game.thumbs.title',
    },
    {
        id: 'word-blitz',
        category: 'preserata',
        // Prototipo locale: giocabile anche da soli (allineato alla descrizione i18n "1+").
        minPlayers: 1,
        avgDurationMinutes: 5,
        icon: '⚡',
        labelKey: 'game.word_blitz.title',
    },
];

export function getGamesByCategory( category: GameCategory | 'all' ): GameDefinition[] {
    if( category === 'all' ) return GAME_DEFINITIONS;
    return GAME_DEFINITIONS.filter( g => g.category === category || g.category === 'both' );
}

/**
 * Definizione di un gioco dal catalogo; null se l'id non esiste.
 * Fonte unica per i vincoli sui giocatori (min/max): usata da UI e API di start.
 * @param id - identificatore del gioco.
 */
export function getGameDefinition( id: GameDefinition['id'] ): GameDefinition | null {
    return GAME_DEFINITIONS.find( g => g.id === id ) ?? null;
}
