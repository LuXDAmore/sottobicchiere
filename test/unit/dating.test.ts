import { describe, expect, it } from 'vitest';

import { DATING_MAX_MESSAGE_LENGTH, validateDatingContent } from '../../server/utils/dating';

describe( 'validateDatingContent', () => {

    it( 'accetta un messaggio normale', () => {

        expect( validateDatingContent( 'Ciao, ci vediamo al bancone?' ) ).toBeNull();

    } );

    it( 'rifiuta un messaggio vuoto o di soli spazi', () => {

        expect( validateDatingContent( '' ) ).toBe( 'Messaggio vuoto' );
        expect( validateDatingContent( '   ' ) ).toBe( 'Messaggio vuoto' );

    } );

    it( 'rifiuta un messaggio troppo lungo', () => {

        const longText = 'a'.repeat( DATING_MAX_MESSAGE_LENGTH + 1 );

        expect( validateDatingContent( longText ) ).toContain( 'troppo lungo' );

    } );

    it( 'blocca gli insulti dalla blacklist (case-insensitive)', () => {

        expect( validateDatingContent( 'sei un IDIOTA' ) ).toBe( 'Messaggio bloccato dalla moderazione' );
        expect( validateDatingContent( 'che stronzo' ) ).toBe( 'Messaggio bloccato dalla moderazione' );

    } );

    it( 'blocca i link per ridurre spam/phishing', () => {

        expect( validateDatingContent( 'scrivimi su http://spam.example' ) ).toContain( 'link' );
        expect( validateDatingContent( 'guarda www.esempio.it' ) ).toContain( 'link' );
        expect( validateDatingContent( 'vai su esempio.com' ) ).toContain( 'link' );

    } );

    it( 'non scambia un orario per un link', () => {

        expect( validateDatingContent( 'ci vediamo alle 21.30' ) ).toBeNull();

    } );

} );
