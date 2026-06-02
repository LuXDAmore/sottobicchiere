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

    const bytes = new Uint8Array( length );

    globalThis.crypto.getRandomValues( bytes );

    let out = '';

    for( let index = 0; index < length; index ++ ) out += alphabet[ bytes[ index ]! % alphabet.length ];

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
