import { lt } from 'drizzle-orm';

import { tableSessions } from '../db/schema';

export default defineTask( {
    meta: {
        name: 'cleanup-expired-sessions',
        description: 'Rimuove le table_sessions scadute (TTL 8h) — CASCADE su player_sessions e groups',
    },
    async run() {

        const deleted = await db
            .delete( tableSessions )
            .where( lt( tableSessions.expiresAt, new Date() ) )
            .returning( { id: tableSessions.id } );

        return {
            result: 'success',
            deleted: deleted.length,
        };

    },
} );
