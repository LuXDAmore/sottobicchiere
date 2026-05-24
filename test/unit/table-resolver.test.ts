import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isDemoFallbackEnabled, isDemoQr, resolveTableRow } from '../../server/utils/table-resolver';

const runtimeConfig = {
    public: {
        appEnvironment: 'development',
        enableDemoFallback: 'false',
    },
};

vi.stubGlobal( 'useRuntimeConfig', () => runtimeConfig );

const setDbRows = ( rows: unknown[] ) => {

    const chain = {
        from: () => chain,
        innerJoin: () => chain,
        where: () => chain,
        limit: () => chain,
        then: ( cb: ( rows: unknown[] ) => unknown ) => Promise.resolve( cb( rows ) ),
    };

    vi.stubGlobal( 'db', { select: () => chain } );

};

describe( 'table API fallback guard', () => {

    beforeEach( () => {

        runtimeConfig.public.appEnvironment = 'development';
        runtimeConfig.public.enableDemoFallback = 'false';
        delete process.env.NUXT_ENABLE_DEMO_FALLBACK;
        setDbRows( [] );

    } );

    it( 'demo fallback attivo/disattivo con flag runtime in ambiente non production', () => {

        runtimeConfig.public.enableDemoFallback = 'false';
        expect( isDemoFallbackEnabled() ).toBe( false );

        runtimeConfig.public.enableDemoFallback = 'true';
        expect( isDemoFallbackEnabled() ).toBe( true );

    } );

    it( 'in production il fallback demo è sempre disattivato', () => {

        runtimeConfig.public.appEnvironment = 'production';
        runtimeConfig.public.enableDemoFallback = 'true';
        process.env.NUXT_ENABLE_DEMO_FALLBACK = 'true';

        expect( isDemoFallbackEnabled() ).toBe( false );

    } );

    it( 'fallback demo valido solo su demo/demo-001', () => {

        expect( isDemoQr( 'demo', 'demo-001' ) ).toBe( true );
        expect( isDemoQr( 'demo', 'wrong' ) ).toBe( false );
        expect( isDemoQr( 'bar-roma-centro', 'demo-001' ) ).toBe( false );

    } );

    it( 'QR reale esistente: ritorna il record DB', async () => {

        setDbRows( [ {
            tableId: 'table-1',
            tableNumber: 3,
            venueName: 'Bar Roma Centro',
            venueSlug: 'bar-roma-centro',
        } ] );

        expect( await resolveTableRow( 'bar-roma-centro', 'roma-003' ) ).toEqual( {
            tableId: 'table-1',
            tableNumber: 3,
            venueName: 'Bar Roma Centro',
            venueSlug: 'bar-roma-centro',
        } );

    } );

    it( 'QR reale inesistente: con fallback demo off ritorna null', async () => {

        runtimeConfig.public.enableDemoFallback = 'false';
        setDbRows( [] );

        expect( await resolveTableRow( 'bar-roma-centro', 'roma-999' ) ).toBeNull();

    } );

    it( 'QR demo inesistente: con fallback demo on ritorna il tavolo demo', async () => {

        runtimeConfig.public.enableDemoFallback = 'true';
        setDbRows( [] );

        expect( await resolveTableRow( 'demo', 'demo-001' ) ).toEqual( {
            tableId: 'demo-table-001',
            tableNumber: 1,
            venueName: 'Demo Venue',
            venueSlug: 'demo',
        } );

    } );

} );
