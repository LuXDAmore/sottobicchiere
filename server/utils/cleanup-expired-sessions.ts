import { lt } from 'drizzle-orm';

import { tableSessions } from '../db/schema';

export interface CleanupLastRun {
    deleted: number;
    durationMs: number;
    executedAt: string;
}

let lastCleanupRun: CleanupLastRun | null = null;

export async function deleteExpiredSessions( now: Date = new Date() ): Promise<number> {

    const deleted = await db
        .delete( tableSessions )
        .where( lt( tableSessions.expiresAt, now ) )
        .returning( { id: tableSessions.id } );

    return deleted.length;

}

export function setCleanupLastRun( payload: CleanupLastRun ): void {

    lastCleanupRun = payload;

}

export function getCleanupLastRun(): CleanupLastRun | null {

    return lastCleanupRun;

}

export function resetCleanupLastRun(): void {

    lastCleanupRun = null;

}
