import {
    boolean,
    index,
    integer,
    jsonb,
    pgTable,
    text,
    timestamp,
    unique,
    uuid,
} from 'drizzle-orm/pg-core';

// ── Venues ───────────────────────────────────────────────────────────────────

export const venues = pgTable( 'venues', {
    id: uuid( 'id' ).primaryKey().defaultRandom(),
    slug: text( 'slug' ).notNull().unique(),
    name: text( 'name' ).notNull(),
    config: jsonb( 'config' ).notNull().default( {} ),
    createdAt: timestamp( 'created_at', { withTimezone: true } ).notNull().defaultNow(),
} );

// ── Tables (tavoli fisici per venue) ─────────────────────────────────────────

export const tables = pgTable(
    'tables',
    {
        id: uuid( 'id' ).primaryKey().defaultRandom(),
        venueId: uuid( 'venue_id' ).notNull().references( () => venues.id, { onDelete: 'cascade' } ),
        tableNumber: integer( 'table_number' ).notNull(),
        qrToken: text( 'qr_token' ).notNull().unique(),
        createdAt: timestamp( 'created_at', { withTimezone: true } ).notNull().defaultNow(),
    },
    t => [ unique().on( t.venueId, t.tableNumber ) ]
);

// ── Table Sessions (sessioni effimere, TTL 8h) ────────────────────────────────

export const tableSessions = pgTable(
    'table_sessions',
    {
        id: uuid( 'id' ).primaryKey().defaultRandom(),
        tableId: uuid( 'table_id' ).notNull().references( () => tables.id, { onDelete: 'cascade' } ),
        startedAt: timestamp( 'started_at', { withTimezone: true } ).notNull().defaultNow(),
        expiresAt: timestamp( 'expires_at', { withTimezone: true } ).notNull()
            .$defaultFn( () => new Date( Date.now() + ( 8 * 60 * 60 * 1000 ) ) ),
    },
    t => [ index( 'idx_table_sessions_expires_at' ).on( t.expiresAt ) ]
);

// ── Groups (squadre all'interno di una sessione) ──────────────────────────────

export const groups = pgTable( 'groups', {
    id: uuid( 'id' ).primaryKey().defaultRandom(),
    tableSessionId: uuid( 'table_session_id' ).notNull().references( () => tableSessions.id, { onDelete: 'cascade' } ),
    name: text( 'name' ).notNull(),
    color: text( 'color' ).notNull(),
    createdAt: timestamp( 'created_at', { withTimezone: true } ).notNull().defaultNow(),
} );

// ── Player Sessions (giocatori anonimi, effimeri) ─────────────────────────────

export const playerSessions = pgTable( 'player_sessions', {
    id: uuid( 'id' ).primaryKey().defaultRandom(),
    tableSessionId: uuid( 'table_session_id' ).notNull().references( () => tableSessions.id, { onDelete: 'cascade' } ),
    groupId: uuid( 'group_id' ).references( () => groups.id ),
    nickname: text( 'nickname' ).notNull(),
    color: text( 'color' ).notNull(),
    isHost: boolean( 'is_host' ).notNull().default( false ),
    joinedAt: timestamp( 'joined_at', { withTimezone: true } ).notNull().defaultNow(),
} );

// ── Types ─────────────────────────────────────────────────────────────────────

export type Venue = typeof venues.$inferSelect;
export type InsertVenue = typeof venues.$inferInsert;

export type Table = typeof tables.$inferSelect;
export type InsertTable = typeof tables.$inferInsert;

export type TableSession = typeof tableSessions.$inferSelect;
export type InsertTableSession = typeof tableSessions.$inferInsert;

export type Group = typeof groups.$inferSelect;
export type InsertGroup = typeof groups.$inferInsert;

export type PlayerSession = typeof playerSessions.$inferSelect;
export type InsertPlayerSession = typeof playerSessions.$inferInsert;
