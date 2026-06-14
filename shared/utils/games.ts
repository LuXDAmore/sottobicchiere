// Categorie di gioco:
//  • board     → da tavolo, in compagnia (es. quiz, opinioni)
//  • preserata → pre-serata / festa, ritmo veloce e leggero (stile Picolo)
//  • solo      → giocabile anche da soli mentre si aspetta il gruppo
//  • both      → adatto sia da tavolo sia in pre-serata
export type GameCategory = 'board' | 'both' | 'preserata' | 'solo';

export type GameId = 'categorie' | 'dares' | 'duello' | 'reflex' | 'thumbs' | 'word-blitz';

export interface GameDefinition {
    id: GameId;
    category: GameCategory;
    minPlayers: number;
    // Limite superiore di giocatori; undefined = nessun limite (la UI mostra "Min. {n}").
    maxPlayers?: number;
    avgDurationMinutes: number;
    icon: string;
    labelKey: string;
    // Descrizione breve (card della lobby) e regole estese (modale "come si gioca").
    descriptionKey: string;
    rulesKey: string;
}

export const GAME_DEFINITIONS: GameDefinition[] = [
    {
        id: 'thumbs',
        category: 'both',
        minPlayers: 2,
        avgDurationMinutes: 8,
        icon: '👍',
        labelKey: 'game.thumbs.title',
        descriptionKey: 'game.thumbs.description',
        rulesKey: 'game.thumbs.rules',
    },
    {
        id: 'dares',
        category: 'preserata',
        // Mazzo di carte (obblighi, verità, sfide, regole): si passa il telefono.
        minPlayers: 2,
        avgDurationMinutes: 15,
        icon: '🍸',
        labelKey: 'game.dares.title',
        descriptionKey: 'game.dares.description',
        rulesKey: 'game.dares.rules',
    },
    {
        id: 'categorie',
        category: 'both',
        // Si passa il telefono: dici una parola della categoria prima dello scadere.
        minPlayers: 2,
        avgDurationMinutes: 6,
        icon: '🗂️',
        labelKey: 'game.categorie.title',
        descriptionKey: 'game.categorie.description',
        rulesKey: 'game.categorie.rules',
    },
    {
        id: 'duello',
        category: 'both',
        // Duello di riflessi su un solo telefono: schermo diviso, vince il più rapido.
        // Nessun tetto di giocatori: si gioca a coppie su un device, il tavolo può
        // essere di qualsiasi dimensione (più coppie possono sfidarsi a turno).
        minPlayers: 2,
        avgDurationMinutes: 3,
        icon: '⚔️',
        labelKey: 'game.duello.title',
        descriptionKey: 'game.duello.description',
        rulesKey: 'game.duello.rules',
    },
    {
        id: 'reflex',
        category: 'solo',
        // Allenamento riflessi in solitaria mentre si aspetta il gruppo.
        minPlayers: 1,
        maxPlayers: 1,
        avgDurationMinutes: 2,
        icon: '⚡',
        labelKey: 'game.reflex.title',
        descriptionKey: 'game.reflex.description',
        rulesKey: 'game.reflex.rules',
    },
    {
        id: 'word-blitz',
        category: 'preserata',
        // Prototipo locale: giocabile anche da soli (allineato alla descrizione i18n "1+").
        minPlayers: 1,
        avgDurationMinutes: 5,
        icon: '🔤',
        labelKey: 'game.word_blitz.title',
        descriptionKey: 'game.word_blitz.description',
        rulesKey: 'game.word_blitz.rules',
    },
];

/**
 * Giochi di una categoria. I giochi `both` compaiono sia in "board" sia in
 * "preserata" (sono universali), ma NON tra i "solo": un'attività di gruppo non
 * è un passatempo da soli. Viceversa i giochi `solo` non inquinano board/preserata.
 * @param category - categoria richiesta, o 'all' per l'intero catalogo.
 */
export function getGamesByCategory( category: GameCategory | 'all' ): GameDefinition[] {

    if( category === 'all' ) return GAME_DEFINITIONS;
    return GAME_DEFINITIONS.filter( g =>
        g.category === category
        || ( g.category === 'both' && ( category === 'board' || category === 'preserata' ) ) );

}

// Giochi a turni interattivi (multi-dispositivo): lo stato vive su `games`
// (turn_state) e ruota tra i giocatori. Sono i vecchi "passa il telefono".
export const TURN_BASED_GAMES = [ 'categorie', 'dares' ] as const satisfies readonly GameId[];

/**
 * True se il gioco è a turni interattivi (stato autoritativo su `games`, turno che
 * ruota tra i dispositivi). Fonte unica condivisa tra API server e client.
 * @param id - identificatore del gioco.
 */
export function isTurnBasedGame( id: string ): id is ( typeof TURN_BASED_GAMES )[ number ] {

    return ( TURN_BASED_GAMES as readonly string[] ).includes( id );

}

/**
 * Definizione di un gioco dal catalogo; null se l'id non esiste.
 * Fonte unica per i vincoli sui giocatori (min/max): usata da UI e API di start.
 * @param id - identificatore del gioco.
 */
export function getGameDefinition( id: GameId ): GameDefinition | null {

    return GAME_DEFINITIONS.find( g => g.id === id ) ?? null;

}
