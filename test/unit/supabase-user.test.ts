import { describe, expect, it } from 'vitest';

import { supabaseUserId } from '../../shared/utils/supabase-user';

describe( 'supabaseUserId', () => {

    it( 'usa il claim `sub` (forma claims JWT di @nuxtjs/supabase v2)', () => {

        expect( supabaseUserId( { sub: 'uid-1' } ) ).toBe( 'uid-1' );

    } );

    it( 'ripiega su `id` se `sub` manca (forma oggetto User)', () => {

        expect( supabaseUserId( { id: 'uid-2' } ) ).toBe( 'uid-2' );

    } );

    it( 'preferisce `sub` quando ci sono entrambi', () => {

        expect( supabaseUserId( {
            id: 'uid-id',
            sub: 'uid-sub',
        } ) ).toBe( 'uid-sub' );

    } );

    it( 'ritorna undefined per null/undefined', () => {

        expect( supabaseUserId( null ) ).toBeUndefined();
        expect( supabaseUserId( undefined ) ).toBeUndefined();

    } );

} );
