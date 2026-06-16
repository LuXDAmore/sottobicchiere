import type { ServiceClient } from './supabase';

export interface ResolvedTableRow {
    tableId: string;
    tableNumber: number;
    venueName: string;
    venueSlug: string;
    // Tipo di venue: 'venue' (locale fisico, il numero di tavolo è significativo)
    // oppure 'adhoc' (stanza creata al volo da /new, dove conta il nome non il numero).
    venueKind: 'adhoc' | 'venue';
    // Codice breve condivisibile (presente solo per i tavoli ad-hoc creati da /new).
    shortCode: string | null;
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
        .select( 'id, table_number, short_code, venues!inner( name, slug, kind )' )
        .eq( 'qr_token', qrToken )
        .eq( 'venues.slug', venueSlug )
        .limit( 1 )
        .maybeSingle();

    if( error || ! data ) return null;

    const venue = data.venues as unknown as { name: string; slug: string; kind: string };

    return {
        tableId: data.id,
        tableNumber: data.table_number,
        venueName: venue.name,
        venueSlug: venue.slug,
        venueKind: venue.kind === 'adhoc' ? 'adhoc' : 'venue',
        shortCode: data.short_code ?? null,
    };

};
