import { getCleanupLastRun } from '../../utils/cleanup-expired-sessions';

export default defineEventHandler( event => {

    const { cronSecret } = useRuntimeConfig( event );
    const providedSecret = getHeader( event, 'x-cron-secret' ) ?? getQuery( event ).secret;

    if( cronSecret && providedSecret !== cronSecret ) {

        throw createError( {
            statusCode: 401,
            statusMessage: 'Unauthorized',
        } );

    }

    const lastCleanupRun = getCleanupLastRun();

    return {
        hasRun: !! lastCleanupRun,
        lastCleanupRun,
        task: 'cleanup-expired-sessions',
        timezone: 'UTC',
    };

} );
