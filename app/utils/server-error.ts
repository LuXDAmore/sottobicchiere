// Risoluzione localizzata degli errori del server (audit M3). Ogni `createError`
// lato server porta uno `statusMessage` = codice stabile (es. 'NOT_HOST'); il
// client lo mappa a una stringa i18n per CONVENZIONE: `error.codes.<CODE>`.
//
// Pattern unico per tutta l'API, senza toccare i singoli endpoint:
//   1. se esiste una traduzione per quel codice → usala (localizzata IT/EN);
//   2. altrimenti ripiega sul `message` del server (italiano, sempre presente);
//   3. infine su un fallback generico.
// Così i codici nuovi funzionano già (fallback al messaggio server) e si
// localizzano aggiungendo solo la chiave i18n.

interface FetchLikeError {
    data?: { message?: string; statusMessage?: string };
    statusMessage?: string;
}

interface Translator {
    t: ( key: string ) => string;
    te: ( key: string ) => boolean;
}

/**
 * Estrae il codice d'errore stabile (statusMessage) da un errore di $fetch.
 * @param exception - errore catturato.
 */
export function serverErrorCode( exception: unknown ): string | null {

    const error = exception as FetchLikeError;

    return error?.data?.statusMessage ?? error?.statusMessage ?? null;

}

/**
 * Messaggio d'errore localizzato per l'utente, con fallback al messaggio del
 * server e poi a una chiave generica.
 * @param exception - errore catturato (tipicamente di $fetch).
 * @param translator - funzioni i18n `t` e `te` (translation-exists).
 * @param fallbackKey - chiave i18n usata quando non c'è né codice mappato né messaggio server.
 */
export function serverErrorMessage( exception: unknown, translator: Translator, fallbackKey = 'error.generic' ): string {

    const code = serverErrorCode( exception );

    if( code ) {

        const key = `error.codes.${ code }`;

        if( translator.te( key ) ) return translator.t( key );

    }

    const error = exception as FetchLikeError;

    return error?.data?.message ?? translator.t( fallbackKey );

}
