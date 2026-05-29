import { describe, expect, it } from 'vitest';

import type { ServiceClient } from '../../server/utils/supabase';
import { resolveTableRow } from '../../server/utils/table-resolver';

// Stub del client Supabase: ogni metodo della catch è concatenabile e `maybeSingle`
// risolve il risultato configurato ({ data, error }).
function stubClient( result: { data: unknown; error: unknown } ): ServiceClient {

    const chain: Record<string, unknown> = {};

    for( const method of [ 'from', 'select', 'eq', 'limit' ] ) chain[ method ] = () => chain;

    chain.maybeSingle = () => Promise.resolve( result );

    return chain as unknown as ServiceClient;

}

describe( 'resolveTableRow', () => {

    it( 'mappa il record trovato (join su venues)', async () => {

        const client = stubClient( {
            data: { id: 'table-1', table_number: 3, venues: { name: 'Bar Centrale', slug: 'bar-centrale' } },
            error: null,
        } );

        await expect( resolveTableRow( client, 'bar-centrale', 'qr-xyz' ) ).resolves.toEqual( {
            tableId: 'table-1',
            tableNumber: 3,
            venueName: 'Bar Centrale',
            venueSlug: 'bar-centrale',
        } );

    } );

    it( 'ritorna null se il record non esiste', async () => {

        const client = stubClient( { data: null, error: null } );

        await expect( resolveTableRow( client, 'bar-centrale', 'mancante' ) ).resolves.toBeNull();

    } );

    it( 'ritorna null in caso di errore Supabase', async () => {

        const client = stubClient( { data: null, error: { message: 'boom' } } );

        await expect( resolveTableRow( client, 'bar-centrale', 'qr-xyz' ) ).resolves.toBeNull();

    } );

} );
