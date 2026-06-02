import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import type { ServiceClient } from '../../server/utils/supabase';

import { createAdhocRoom } from '../../server/utils/room';

// `createError` è auto-importato da Nitro a runtime; in unit test lo forniamo come
// globale così i percorsi che lanciano producono un errore con `statusCode`.
beforeAll( () => {

    vi.stubGlobal( 'createError', ( options: { statusCode?: number; message?: string } ) =>
        Object.assign( new Error( options.message ), options ) );

} );

// Ripristina i globali stubbati: il test resta isolato e non contamina gli altri.
afterAll( () => {

    vi.unstubAllGlobals();

} );

interface QueryResult { data: unknown; error: { code?: string } | null }

// Stub minimale del client: serve `from().insert().select().single()` per venues/tables
// e `from('venues').delete().eq()` per il rollback. Conta le chiamate per le asserzioni.
/**
 *
 * @param venueInserts
 * @param tableInserts
 */
function makeClient( venueInserts: QueryResult[], tableInserts: QueryResult[] ) {

    const calls = {
            venue: 0,
            table: 0,
            venueDeletes: 0,
        }

        , client = {
            from( name: string ) {

                return {
                    insert() {

                        return {
                            select() {

                                return {
                                    single() {

                                        return name === 'venues'
                                            ? Promise.resolve( venueInserts[ calls.venue ++ ] )
                                            : Promise.resolve( tableInserts[ calls.table ++ ] );

                                    },
                                };

                            },
                        };

                    },
                    delete() {

                        return {
                            eq() {

                                if( name === 'venues' ) calls.venueDeletes ++;
                                return Promise.resolve( {
                                    data: null,
                                    error: null,
                                } );

                            },
                        };

                    },
                };

            },
        };

    return {
        calls,
        client: client as unknown as ServiceClient,
    };

}

const user = 'user-1';

describe( 'createAdhocRoom', () => {

    it( 'crea venue + tavolo e ritorna slug/qrToken/shortCode', async() => {

        const { client } = makeClient(
            [
                {
                    data: {
                        id: 'v1',
                        slug: 'r-abc',
                    },
                    error: null,
                },
            ],
            [
                {
                    data: {
                        qr_token: 'qr-1',
                        short_code: 'ABC234',
                    },
                    error: null,
                },
            ],
        );

        await expect( createAdhocRoom( client, user, 'Casa' ) ).resolves.toEqual( {
            qrToken: 'qr-1',
            shortCode: 'ABC234',
            venueSlug: 'r-abc',
        } );

    } );

    it( 'ritenta la venue su violazione di unicità (23505)', async() => {

        const { calls, client } = makeClient(
                [
                    {
                        data: null,
                        error: { code: '23505' },
                    },
                    {
                        data: {
                            id: 'v1',
                            slug: 'r-xyz',
                        },
                        error: null,
                    },
                ],
                [
                    {
                        data: {
                            qr_token: 'qr-1',
                            short_code: 'ABC234',
                        },
                        error: null,
                    },
                ],
            )

            , room = await createAdhocRoom( client, user );

        expect( room.venueSlug ).toBe( 'r-xyz' );
        expect( calls.venue ).toBe( 2 );

    } );

    it( 'non ritenta su errori non di unicità e fallisce', async() => {

        const { calls, client } = makeClient(
            [
                {
                    data: null,
                    error: { code: 'XX000' },
                },
            ],
            [],
        );

        await expect( createAdhocRoom( client, user ) ).rejects.toMatchObject( { statusCode: 500 } );
        expect( calls.venue ).toBe( 1 );

    } );

    it( 'fa rollback della venue se la creazione del tavolo fallisce', async() => {

        const { calls, client } = makeClient(
            [
                {
                    data: {
                        id: 'v1',
                        slug: 'r-abc',
                    },
                    error: null,
                },
            ],
            Array.from( { length: 5 }, () => ( {
                data: null,
                error: { code: '23505' },
            } ) ),
        );

        await expect( createAdhocRoom( client, user ) ).rejects.toMatchObject( { statusCode: 500 } );
        expect( calls.venueDeletes ).toBe( 1 );

    } );

} );
