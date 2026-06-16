import { findLatestActiveSession, requireTable } from '../../../../utils/request';

export default defineEventHandler( async event => {

    const { client, table } = await requireTable( event )
        , activeSession = await findLatestActiveSession( client, table.tableId );

    return {
        hasActiveSession: !! activeSession,
        shortCode: table.shortCode,
        tableNumber: table.tableNumber,
        venueName: table.venueName,
        venueSlug: table.venueSlug,
        venueKind: table.venueKind,
    };

} );
