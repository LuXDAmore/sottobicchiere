import { findLatestActiveSession, requireTable } from '../../../../../utils/request';

export default defineEventHandler( async event => {

    const { client, table } = await requireTable( event )
        , session = await findLatestActiveSession( client, table.tableId );

    return {
        selectedGame: session?.selected_game ?? null,
        gameMode: session?.game_mode ?? null,
        lockedAt: session?.locked_at ?? null,
        hostPlayerId: session?.host_player_id ?? null,
    };

} );
