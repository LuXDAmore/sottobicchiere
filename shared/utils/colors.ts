// Colori identità giocatori — usati sia dal client che dal server

export const PLAYER_COLORS = [
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#06B6D4', // Cyan
    '#F97316', // Orange
    '#EF4444', // Red
] as const;

export type PlayerColor = typeof PLAYER_COLORS[number];

/**
 *
 * @param takenColors
 */
export function pickAvailableColor( takenColors: readonly string[] ): PlayerColor {

    const available = PLAYER_COLORS.filter( c => ! takenColors.includes( c ) );

    if( available.length === 0 ) return PLAYER_COLORS[ takenColors.length % PLAYER_COLORS.length ] as PlayerColor;
    return available[ 0 ] as PlayerColor;

}
