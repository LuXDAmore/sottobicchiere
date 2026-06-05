// Codici e token per le stanze dinamiche (tavoli creati al volo).
// Codice condiviso client/server, senza dipendenze: usa solo Web Crypto
// (disponibile sia in Node 22+ che nel browser).

// Alfabeto senza caratteri ambigui (niente I, L, O, 0, 1): più facile da leggere
// e digitare da un QR/foglietto. 31 simboli → 31^6 ≈ 887M combinazioni per i codici.
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const ROOM_CODE_LENGTH = 6;

// Alfabeto per slug/token interni (URL-safe, minuscolo): non mostrato all'utente.
const TOKEN_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 *
 * @param alphabet
 * @param length
 */
function randomString( alphabet: string, length: number ): string {

    const size = alphabet.length
        // Soglia per il rejection sampling: scartiamo i byte oltre il più grande
        // multiplo di `size` ≤ 256, così `byte % size` resta uniforme (niente modulo
        // bias). I codici/token restano indovinabili solo a forza bruta.
        , max = Math.floor( 256 / size ) * size
        , buffer = new Uint8Array( 1 );

    let out = '';

    while( out.length < length ) {

        globalThis.crypto.getRandomValues( buffer );

        const byte = buffer[ 0 ]!;

        if( byte < max ) out += alphabet[ byte % size ];

    }

    return out;

}

/**
 * Genera un codice stanza leggibile (default 6 caratteri, alfabeto non ambiguo).
 * @param length - lunghezza del codice.
 */
export function generateRoomCode( length: number = ROOM_CODE_LENGTH ): string {

    return randomString( ROOM_CODE_ALPHABET, length );

}

/**
 * Genera un token URL-safe e non indovinabile (slug venue, qr_token tavolo).
 * @param length - lunghezza del token.
 */
export function generateToken( length = 12 ): string {

    return randomString( TOKEN_ALPHABET, length );

}

/**
 * Normalizza un codice digitato dall'utente: maiuscolo e solo caratteri validi
 * (spazi, trattini e simboli estranei vengono rimossi).
 * @param input - testo grezzo inserito dall'utente.
 */
export function normalizeRoomCode( input: string ): string {

    return [ ... input.toUpperCase() ]
        .filter( c => ROOM_CODE_ALPHABET.includes( c ) )
        .join( '' );

}

/**
 * Verifica che un codice (già normalizzato) sia formalmente valido.
 * @param code - codice normalizzato.
 */
export function isValidRoomCode( code: string ): boolean {

    return code.length === ROOM_CODE_LENGTH
        && [ ... code ].every( c => ROOM_CODE_ALPHABET.includes( c ) );

}
