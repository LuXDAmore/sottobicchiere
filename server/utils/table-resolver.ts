import type { ServiceClient } from './supabase';

export interface ResolvedTableRow {
    tableId: string;
    tableNumber: number;
    venueName: string;
    venueSlug: string;
}

/**
 * Risolve venue + tavolo a partire da slug e QR token.
 *
 * Il tavolo demo (`/demo/table/demo-001`) non è più un caso speciale in-memory:
 * è seminato nel database (vedi supabase/migrations) e passa da questa query.
 * @param client - client Supabase service role.
 * @param venueSlug - slug del locale.
 * @param qrToken - token del QR del tavolo.
 */
export const resolveTableRow = async(
    client: ServiceClient,
    venueSlug: string,
    qrToken: string
): Promise<ResolvedTableRow | null> => {

    const { data, error } = await client
        .from( 'tables' )
        .select( 'id, table_number, venues!inner( name, slug )' )
        .eq( 'qr_token', qrToken )
        .eq( 'venues.slug', venueSlug )
        .limit( 1 )
        .maybeSingle();

    if( error || ! data ) return null;

    const venue = data.venues as unknown as { name: string; slug: string };

    return {
        tableId: data.id,
        tableNumber: data.table_number,
        venueName: venue.name,
        venueSlug: venue.slug,
    };

};
