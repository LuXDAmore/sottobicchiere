import { describe, expect, it } from 'vitest';

import { CATEGORY_PROMPTS, PARTY_DARES, shuffle } from '../../shared/utils/party';

describe( 'shuffle', () => {

    it( 'non muta l\'array di input', () => {

        const source = [
                1,
                2,
                3,
                4,
                5,
            ]
            , copy = [ ... source ];

        shuffle( source );

        expect( source ).toEqual( copy );

    } );

    it( 'conserva tutti gli elementi (stessa multiset)', () => {

        const source = [
                'a',
                'b',
                'c',
                'd',
                'e',
            ]
            , result = shuffle( source );

        expect( result ).toHaveLength( source.length );
        // Elementi unici: stesso insieme ⇒ nessuna perdita/duplicazione nel mescolamento.
        expect( new Set( result ) ).toEqual( new Set( source ) );

    } );

    it( 'gestisce array vuoti e singoletti', () => {

        expect( shuffle( [] ) ).toEqual( [] );
        expect( shuffle( [ 42 ] ) ).toEqual( [ 42 ] );

    } );

} );

describe( 'mazzi pre-serata', () => {

    it( 'ogni carta ha testo IT ed EN non vuoti', () => {

        for( const card of PARTY_DARES ) {

            expect( card.text.it.trim().length ).toBeGreaterThan( 0 );
            expect( card.text.en.trim().length ).toBeGreaterThan( 0 );

        }

    } );

    it( 'ogni carta ha un tipo valido', () => {

        const kinds = new Set( [
            'dare',
            'group',
            'rule',
            'sip',
            'truth',
        ] );

        for( const card of PARTY_DARES ) expect( kinds.has( card.kind ) ).toBe( true );

    } );

    it( 'le categorie hanno testo IT ed EN non vuoti', () => {

        expect( CATEGORY_PROMPTS.length ).toBeGreaterThan( 0 );

        for( const category of CATEGORY_PROMPTS ) {

            expect( category.it.trim().length ).toBeGreaterThan( 0 );
            expect( category.en.trim().length ).toBeGreaterThan( 0 );

        }

    } );

} );
