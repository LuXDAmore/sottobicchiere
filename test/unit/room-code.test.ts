import { describe, expect, it } from 'vitest';

import {
    ROOM_CODE_ALPHABET,
    ROOM_CODE_LENGTH,
    generateRoomCode,
    generateToken,
    isValidRoomCode,
    normalizeRoomCode,
} from '../../shared/utils/room-code';

describe( 'generateRoomCode', () => {

    it( 'genera codici della lunghezza richiesta usando solo l\'alfabeto consentito', () => {

        for( let index = 0; index < 50; index ++ ) {

            const code = generateRoomCode();

            expect( code ).toHaveLength( ROOM_CODE_LENGTH );
            expect( [ ... code ].every( c => ROOM_CODE_ALPHABET.includes( c ) ) ).toBe( true );

        }

    } );

    it( 'non usa mai caratteri ambigui (I, L, O, 0, 1)', () => {

        const joined = Array.from( { length: 100 }, () => generateRoomCode() ).join( '' );

        expect( /[ILO01]/.test( joined ) ).toBe( false );

    } );

} );

describe( 'normalizeRoomCode', () => {

    it( 'porta in maiuscolo e rimuove spazi e simboli estranei', () => {

        expect( normalizeRoomCode( ' ab2-3 cd ' ) ).toBe( 'AB23CD' );

    } );

    it( 'scarta i caratteri non presenti nell\'alfabeto', () => {

        // 0, 1, I non fanno parte dell'alfabeto e vengono rimossi.
        expect( normalizeRoomCode( 'a0b1iC' ) ).toBe( 'ABC' );

    } );

} );

describe( 'isValidRoomCode', () => {

    it( 'accetta un codice generato', () => {

        expect( isValidRoomCode( generateRoomCode() ) ).toBe( true );

    } );

    it( 'rifiuta lunghezze errate o caratteri non validi', () => {

        expect( isValidRoomCode( 'ABC' ) ).toBe( false );
        expect( isValidRoomCode( 'ABCDE0' ) ).toBe( false );
        expect( isValidRoomCode( '' ) ).toBe( false );

    } );

} );

describe( 'generateToken', () => {

    it( 'è URL-safe (solo minuscole e cifre) e della lunghezza richiesta', () => {

        const token = generateToken( 12 );

        expect( token ).toHaveLength( 12 );
        expect( /^[a-z\d]+$/.test( token ) ).toBe( true );

    } );

} );
