import { and, desc, eq, gt } from 'drizzle-orm';

import { tableSessions } from '../../../../../db/schema';
import { resolveTableRow } from '../../../../../utils/table-resolver';

export default defineEventHandler(async event => {
  const venueSlug = getRouterParam(event, 'venue');
  const qrToken = getRouterParam(event, 'token');
  if (!venueSlug || !qrToken) throw createError({ statusCode: 400, statusMessage: 'MISSING_ROUTE_PARAMS', message: 'Parametri mancanti nel link. Controlla il QR code.' });

  const table = await resolveTableRow(venueSlug, qrToken);
  if (!table || table.tableId === 'demo-table-001') return { selectedGame: null, gameMode: null, lockedAt: null, hostPlayerId: null };

  const now = new Date();
  const session = await db.select({ selectedGame: tableSessions.selectedGame, gameMode: tableSessions.gameMode, lockedAt: tableSessions.lockedAt, hostPlayerId: tableSessions.hostPlayerId })
    .from(tableSessions).where(and(eq(tableSessions.tableId, table.tableId), gt(tableSessions.expiresAt, now)))
    .orderBy(desc(tableSessions.startedAt)).limit(1).then(( r: any[] ) => r[0] ?? null);

  return { selectedGame: session?.selectedGame ?? null, gameMode: session?.gameMode ?? null, lockedAt: session?.lockedAt ? session.lockedAt.toISOString() : null, hostPlayerId: session?.hostPlayerId ?? null };
});
