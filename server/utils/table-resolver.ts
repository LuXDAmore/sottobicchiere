import { and, eq } from 'drizzle-orm';

import { tables, venues } from '../db/schema';

export type ResolvedTableRow = {
    tableId: string;
    tableNumber: number;
    venueName: string;
    venueSlug: string;
};

const DEMO_TABLE: ResolvedTableRow = {
    tableId: 'demo-table-001',
    tableNumber: 1,
    venueName: 'Demo Venue',
    venueSlug: 'demo',
};

export const isDemoFallbackEnabled = () => {

    const runtime = useRuntimeConfig().public;
    const appEnvironment = runtime.appEnvironment ?? 'development';

    const demoFlag = runtime.enableDemoFallback;

    // Explicit opt-out always wins
    if( demoFlag === 'false' ) return false;

    // Explicit opt-in enables demo fallback even in production
    if( demoFlag === 'true' ) return true;

    // Safe default for missing/unknown values
    return appEnvironment !== 'production';

};

export const isDemoQr = ( venueSlug: string, qrToken: string ) => venueSlug === 'demo' && qrToken === 'demo-001';

export const resolveTableRow = async ( venueSlug: string, qrToken: string ): Promise<ResolvedTableRow | null> => {

    const row = await db
        .select( {
            tableId: tables.id,
            tableNumber: tables.tableNumber,
            venueName: venues.name,
            venueSlug: venues.slug,
        } )
        .from( tables )
        .innerJoin( venues, eq( tables.venueId, venues.id ) )
        .where( and( eq( tables.qrToken, qrToken ), eq( venues.slug, venueSlug ) ) )
        .limit( 1 )
        .then( ( rows: ResolvedTableRow[] ) => rows[ 0 ] ?? null );

    if( row ) return row;
    if( isDemoFallbackEnabled() && isDemoQr( venueSlug, qrToken ) ) return DEMO_TABLE;

    return null;

};
