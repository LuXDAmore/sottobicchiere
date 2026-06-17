import { consola } from 'consola';

// Logging strutturato degli errori server (audit M5). Nitro non registra di default
// il contesto delle eccezioni delle route: questo hook logga metodo/path/status dei
// 5xx, così i 500 non spariscono nei log grezzi di Vercel. Primo livello di
// osservabilità senza dipendenze nuove (consola è già nello stack Nuxt e — a
// differenza di console.* — non viene rimosso da nuxt-security `removeLoggers`).
// NON sostituisce un error tracker (Sentry/simili): vedi roadmap.
export default defineNitroPlugin( nitroApp => {

    nitroApp.hooks.hook( 'error', ( error, context ) => {

        const status = ( error as { statusCode?: number } ).statusCode ?? 500;

        // I 4xx sono errori "attesi" (validazione/permessi/non trovato): non sono
        // anomalie del server, evitiamo di sporcare i log.
        if( status < 500 ) return;

        const event = context.event
            , method = event?.method ?? '?'
            , path = event?.path ?? '?';

        consola.error( `[api-error] ${ method } ${ path } → ${ status }`, error );

    } );

} );
