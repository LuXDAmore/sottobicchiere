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

    if( appEnvironment === 'production' ) return false;

    const envFlag = process.env.NUXT_ENABLE_DEMO_FALLBACK;

    if( envFlag !== undefined ) return envFlag === 'true';

    return runtime.enableDemoFallback === 'true';

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
