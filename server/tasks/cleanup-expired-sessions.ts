import { deleteExpiredSessions, setCleanupLastRun } from '../utils/cleanup-expired-sessions';

export default defineTask( {
    meta: {
        name: 'cleanup-expired-sessions',
        description: 'Rimuove le table_sessions scadute (TTL 8h) — CASCADE su player_sessions e groups',
    },
    async run() {

        const startedAt = Date.now();
        const executedAt = new Date().toISOString();

        const deleted = await deleteExpiredSessions();
        const durationMs = Date.now() - startedAt;

        setCleanupLastRun( {
            deleted,
            durationMs,
            executedAt,
        } );

        const logPayload = {
            deleted,
            durationMs,
            executedAt,
            task: 'cleanup-expired-sessions',
        };

        console.info( '[cleanup-expired-sessions] completed', logPayload );

        return {
            result: 'success',
            ...logPayload,
        };

    },
} );
