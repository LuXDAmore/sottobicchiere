import { describe, expect, it } from 'vitest';

import { serverErrorCode, serverErrorMessage } from '../../app/utils/server-error';

// Traduttore finto: conosce solo le chiavi passate in `known`.
/**
 *
 * @param known
 */
function translator( known: Record<string, string> ) {

    return {
        t: ( key: string ) => known[ key ] ?? key,
        te: ( key: string ) => key in known,
    };

}

describe( 'serverErrorCode', () => {

    it( 'preferisce data.statusMessage al statusMessage di primo livello', () => {

        expect( serverErrorCode( {
            data: { statusMessage: 'NOT_HOST' },
            statusMessage: 'Forbidden',
        } ) ).toBe( 'NOT_HOST' );

    } );

    it( 'ripiega sullo statusMessage di primo livello e su null', () => {

        expect( serverErrorCode( { statusMessage: 'Conflict' } ) ).toBe( 'Conflict' );
        expect( serverErrorCode( {} ) ).toBeNull();

    } );

} );

describe( 'serverErrorMessage', () => {

    it( 'usa la traduzione del codice quando esiste', () => {

        const t = translator( { 'error.codes.NOT_HOST': 'Only the host can do this.' } )
            , message = serverErrorMessage( {
                data: {
                    statusMessage: 'NOT_HOST',
                    message: 'Solo l\'host…',
                },
            }, t );

        expect( message ).toBe( 'Only the host can do this.' );

    } );

    it( 'ripiega sul messaggio del server se il codice non è mappato', () => {

        const t = translator( {} )
            , message = serverErrorMessage( {
                data: {
                    statusMessage: 'WEIRD_NEW_CODE',
                    message: 'Messaggio del server',
                },
            }, t );

        expect( message ).toBe( 'Messaggio del server' );

    } );

    it( 'ripiega sulla chiave generica quando non c\'è né codice né messaggio', () => {

        const t = translator( { 'error.generic': 'Errore generico' } )
            , message = serverErrorMessage( {}, t );

        expect( message ).toBe( 'Errore generico' );

    } );

} );
