// Verifica end-to-end "live" del flusso DATING contro un deploy reale:
//   2 stanze (2 tavoli) → entrambe attivano il dating (online) → disponibilità
//   reciproca → messaggio A→B → risposta B→A (broadcast realtime su entrambi)
//   → B si mette offline → A lo vede tra i non disponibili → B torna online.
//
// Uso:
//   SITE_URL=https://sottobicchiere.vercel.app \
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_KEY=<publishable-key> \
//   node scripts/e2e-live-dating.mjs
//
// Richiede: Anonymous sign-ins abilitati sul progetto Supabase.

import { createClient } from '@supabase/supabase-js';

const SITE_URL = process.env.SITE_URL ?? 'https://sottobicchiere.vercel.app'
    , SUPABASE_URL = process.env.SUPABASE_URL
    , SUPABASE_KEY = process.env.SUPABASE_KEY;

if( ! SUPABASE_URL || ! SUPABASE_KEY ) throw new Error( 'Servono SUPABASE_URL e SUPABASE_KEY.' );

const projectReference = new URL( SUPABASE_URL ).hostname.split( '.' )[ 0 ]
    , sleep = ms => new Promise( resolve => setTimeout( resolve, ms ) );

/**
 * Registra l'esito di uno step (e interrompe sul primo fallimento).
 * @param name
 * @param ok
 * @param detail
 */
function step( name, ok, detail = '' ) {

    console.info( `${ ok ? '✅' : '❌' } ${ name }${ detail ? ` — ${ detail }` : '' }` );

    if( ! ok ) throw new Error( `Step fallito: ${ name }` );

}

/**
 * Cookie di sessione nel formato di @supabase/ssr (base64url, con chunking).
 * @param session
 */
function sessionCookies( session ) {

    const raw = `base64-${ Buffer.from( JSON.stringify( session ) ).toString( 'base64url' ) }`
        , name = `sb-${ projectReference }-auth-token`
        , MAX = 3180;

    if( raw.length <= MAX ) return `${ name }=${ raw }`;

    const chunks = [];

    for( let index = 0; index * MAX < raw.length; index ++ ) chunks.push( `${ name }.${ index }=${ raw.slice( index * MAX, ( index + 1 ) * MAX ) }` );

    return chunks.join( '; ' );

}

/**
 * Crea un "tavolo" completo: utente anonimo, stanza ad-hoc, join come host.
 * @param label
 */
async function createTable( label ) {

    const supabase = createClient( SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } } )
        , { data, error } = await supabase.auth.signInAnonymously();

    step( `${ label }: accesso anonimo`, ! error && !! data?.session, error?.message ?? '' );

    // EXTRA_COOKIE: es. _vercel_jwt per testare una preview Vercel protetta.
    const cookie = [ sessionCookies( data.session ), process.env.EXTRA_COOKIE ].filter( Boolean ).join( '; ' )

        /**
         * @param path
         * @param options
         */
        , api = async( path, options = {} ) => {

            const response = await fetch( `${ SITE_URL }${ path }`, {
                    ... options,
                    headers: {
                        'Content-Type': 'application/json',
                        Cookie: cookie,
                        ... options.headers,
                    },
                } )
                , body = await response.json().catch( () => null );

            return {
                status: response.status,
                body,
            };

        }

        , created = await api( '/api/rooms', {
            method: 'POST',
            body: JSON.stringify( { name: `Tavolo ${ label }` } ),
        } );

    step( `${ label }: crea stanza`, created.status === 200, `code=${ created.body?.shortCode }` );

    const base = `/api/${ created.body.venueSlug }/table/${ created.body.qrToken }`
        , joined = await api( `${ base }/join`, {
            method: 'POST',
            body: JSON.stringify( {
                nickname: `${ label }Bot`,
                createSession: true,
            } ),
        } );

    step( `${ label }: join`, joined.status === 200, '' );

    return {
        api,
        base,
        label,
        playerId: joined.body.playerId,
        sessionId: joined.body.tableSessionId,
        supabase,
    };

}

/**
 * Sottoscrive il channel privato del tavolo e raccoglie gli eventi broadcast.
 * @param table
 */
async function subscribeTable( table ) {

    await table.supabase.realtime.setAuth();

    const received = []
        , channel = table.supabase
            .channel( `table:${ table.sessionId }`, { config: { private: true } } )
            .on( 'broadcast', { event: '*' }, payload => received.push( payload ) )

        , statusValue = await new Promise( resolve => {

            const timer = setTimeout( () => resolve( 'TIMED_OUT' ), 15_000 );

            channel.subscribe( s => {

                if( s === 'SUBSCRIBED' || s === 'CHANNEL_ERROR' || s === 'CLOSED' ) {

                    clearTimeout( timer );
                    resolve( s );

                }

            } );

        } );

    step( `${ table.label }: subscribe realtime tavolo`, statusValue === 'SUBSCRIBED', statusValue );

    return received;

}

// ── Flusso ────────────────────────────────────────────────────────────────────

const A = await createTable( 'A' )
    , B = await createTable( 'B' )

    , eventsA = await subscribeTable( A )
    , eventsB = await subscribeTable( B )

    // 1. Entrambi i tavoli si mettono "online" (dating attivo).
    , enableA = await A.api( `${ A.base }/dating/enable`, {
        method: 'POST',
        body: JSON.stringify( { playerId: A.playerId } ),
    } )
    , enableB = await B.api( `${ B.base }/dating/enable`, {
        method: 'POST',
        body: JSON.stringify( { playerId: B.playerId } ),
    } );

step( 'A: dating online', enableA.status === 200 && enableA.body?.enabled === true, '' );
step( 'B: dating online', enableB.status === 200 && enableB.body?.enabled === true, '' );

// 2. A vede B tra i tavoli disponibili.
const roomsA = await A.api( `${ A.base }/dating/rooms?self=${ A.sessionId }` );

step( 'A: B è disponibile in lobby dating', roomsA.status === 200 && roomsA.body.availableTableSessionIds.includes( B.sessionId ), `${ roomsA.body?.availableTableSessionIds?.length ?? 0 } tavoli online` );

// 3. A scrive a B; B deve ricevere il broadcast sul proprio channel.
const messageAB = await A.api( `${ A.base }/dating/message`, {
    method: 'POST',
    body: JSON.stringify( {
        playerId: A.playerId,
        toTableSessionId: B.sessionId,
        body: 'Ciao dal tavolo A! Vi va di unirvi a noi?',
    } ),
} );

step( 'A→B: messaggio inviato', messageAB.status === 200, `status ${ messageAB.status }` );

await sleep( 3000 );

const inboxB = eventsB.filter( p => JSON.stringify( p ).includes( 'Ciao dal tavolo A' ) );

step( 'B: messaggio di A ricevuto via realtime', inboxB.length > 0, `${ eventsB.length } eventi sul channel` );

// 4. B risponde ad A (il cooldown anti-spam è per-mittente: B può scrivere subito).
const messageBA = await B.api( `${ B.base }/dating/message`, {
    method: 'POST',
    body: JSON.stringify( {
        playerId: B.playerId,
        toTableSessionId: A.sessionId,
        body: 'Volentieri! Offrite voi il prossimo giro però.',
    } ),
} );

step( 'B→A: risposta inviata', messageBA.status === 200, `status ${ messageBA.status }` );

await sleep( 3000 );

const inboxA = eventsA.filter( p => JSON.stringify( p ).includes( 'il prossimo giro' ) );

step( 'A: risposta di B ricevuta via realtime', inboxA.length > 0, `${ eventsA.length } eventi sul channel` );

// 5. B si mette "offline": per A diventa non disponibile (ma resta tra le
//    conversazioni esistenti → unavailable).
const disableB = await B.api( `${ B.base }/dating/disable`, {
    method: 'POST',
    body: JSON.stringify( { playerId: B.playerId } ),
} );

step( 'B: dating offline', disableB.status === 200, '' );

const roomsAfterOffline = await A.api( `${ A.base }/dating/rooms?self=${ A.sessionId }` );

step( 'A: B non più disponibile', roomsAfterOffline.status === 200 && ! roomsAfterOffline.body.availableTableSessionIds.includes( B.sessionId ), '' );
step( 'A: B segnalato come conversazione offline', roomsAfterOffline.body.unavailableTableSessionIds.includes( B.sessionId ), '' );

// 6. Messaggio verso un tavolo offline deve essere rifiutato.
const messageToOffline = await A.api( `${ A.base }/dating/message`, {
    method: 'POST',
    body: JSON.stringify( {
        playerId: A.playerId,
        toTableSessionId: B.sessionId,
        body: 'Ci siete ancora?',
    } ),
} );

step( 'A→B offline: rifiutato come previsto', messageToOffline.status >= 400, `status ${ messageToOffline.status }` );

// 7. B torna online: di nuovo disponibile per A.
const reEnableB = await B.api( `${ B.base }/dating/enable`, {
    method: 'POST',
    body: JSON.stringify( { playerId: B.playerId } ),
} );

step( 'B: di nuovo online', reEnableB.status === 200, '' );

const roomsFinal = await A.api( `${ A.base }/dating/rooms?self=${ A.sessionId }` );

step( 'A: B di nuovo disponibile', roomsFinal.status === 200 && roomsFinal.body.availableTableSessionIds.includes( B.sessionId ), '' );

console.info( '\n🎉 Flusso dating verificato: online/offline, messaggi e risposte realtime tra tavoli.' );

// Chiude i socket realtime: senza, il processo resterebbe appeso.
await A.supabase.removeAllChannels();
await B.supabase.removeAllChannels();
