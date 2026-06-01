import { describe, expect, it } from 'vitest';

import { electHost } from '../../server/utils/host-election';

describe( 'electHost', () => {

    const members = [ 'p-1', 'p-2', 'p-3' ];

    it( 'non riassegna se l\'host corrente è ancora online', () => {

        expect( electHost( 'p-2', [ 'p-2', 'p-3' ], members ) ).toBeNull();

    } );

    it( 'promuove l\'id minore tra i presenti quando l\'host è uscito', () => {

        expect( electHost( 'p-1', [ 'p-3', 'p-2' ], members ) ).toBe( 'p-2' );

    } );

    it( 'ritorna null se non c\'è nessun candidato online', () => {

        expect( electHost( 'p-1', [], members ) ).toBeNull();

    } );

    it( 'ignora id online che non sono membri della sessione', () => {

        expect( electHost( 'p-1', [ 'intruso', 'p-3' ], members ) ).toBe( 'p-3' );

    } );

    it( 'gestisce host assente promuovendo il primo presente', () => {

        expect( electHost( null, [ 'p-3', 'p-1' ], members ) ).toBe( 'p-1' );

    } );

} );
