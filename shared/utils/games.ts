export type GameCategory = 'board' | 'preserata' | 'both';

export interface GameDefinition {
    id: 'thumbs' | 'word-blitz';
    category: GameCategory;
    minPlayers: number;
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
        minPlayers: 2,
        avgDurationMinutes: 5,
        icon: '⚡',
        labelKey: 'game.word_blitz.title',
    },
];

export function getGamesByCategory( category: GameCategory | 'all' ): GameDefinition[] {
    if( category === 'all' ) return GAME_DEFINITIONS;
    return GAME_DEFINITIONS.filter( g => g.category === category || g.category === 'both' );
}
