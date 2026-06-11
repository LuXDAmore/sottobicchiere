// Verifica end-to-end "live" del flusso MVP contro un deploy reale:
//   2 utenti anonimi → crea stanza → join via short code (link condivisibile)
//   → realtime (presence + broadcast da DB) → seleziona gioco → partita thumbs
//   → voti → reveal.
//
// Uso:
//   SITE_URL=https://sottobicchiere.vercel.app \
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_KEY=<publishable-key> \
//   node scripts/e2e-live-game.mjs
//
// Richiede: Anonymous sign-ins abilitati sul progetto Supabase.

import { createClient } from '@supabase/supabase-js';

const SITE_URL = process.env.SITE_URL ?? 'https://sottobicchiere.vercel.app'
    , SUPABASE_URL = process.env.SUPABASE_URL
    , SUPABASE_KEY = process.env.SUPABASE_KEY;

if( ! SUPABASE_URL || ! SUPABASE_KEY ) throw new Error( 'Servono SUPABASE_URL e SUPABASE_KEY.' );

const projectReference = new URL( SUPABASE_URL ).hostname.split( '.' )[ 0 ]
    , results = [];

/**
 * Registra l'esito di uno step (e interrompe sul primo fallimento).
 * @param name
 * @param ok
 * @param detail
 */
function step( name, ok, detail = '' ) {

    results.push( {
        name,
        ok,
        detail,
    } );
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
 * Crea un "browser" anonimo: client supabase + fetch verso l'app con i cookie di sessione.
 * @param label
 */
async function createAnonUser( label ) {

    const supabase = createClient( SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } } )
        , { data, error } = await supabase.auth.signInAnonymously();

    step( `${ label }: accesso anonimo Supabase`, ! error && !! data?.session, error?.message ?? `user ${ data?.user?.id?.slice( 0, 8 ) }…` );

    const cookie = sessionCookies( data.session )

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

        };

    return {
        api,
        label,
        supabase,
        userId: data.user.id,
    };

}

/**
 * Sottoscrive il channel privato del tavolo e raccoglie i broadcast ricevuti.
 * @param user
 * @param tableSessionId
 */
async function subscribeTable( user, tableSessionId ) {

    await user.supabase.realtime.setAuth();

    const received = []
        , channel = user.supabase
            .channel( `table:${ tableSessionId }`, { config: { private: true } } )
            .on( 'broadcast', { event: '*' }, payload => received.push( payload.event ) )

        , statusValue = await new Promise( resolve => {

            const timer = setTimeout( () => resolve( 'TIMED_OUT' ), 15_000 );

            channel.subscribe( s => {

                if( s === 'SUBSCRIBED' || s === 'CHANNEL_ERROR' || s === 'CLOSED' ) {

                    clearTimeout( timer );
                    resolve( s );

                }

            } );

        } );

    step( `${ user.label }: subscribe realtime "table:…" (private)`, statusValue === 'SUBSCRIBED', statusValue );

    return {
        channel,
        received,
    };

}

const sleep = ms => new Promise( resolve => setTimeout( resolve, ms ) )

    // ── Flusso ────────────────────────────────────────────────────────────────────

    , host = await createAnonUser( 'Host' )
    , guest = await createAnonUser( 'Guest' )

    // 1. L'host crea la stanza (tavolo dinamico).
    , created = await host.api( '/api/rooms', {
        method: 'POST',
        body: JSON.stringify( { name: 'Verifica live' } ),
    } );

step( 'Host: crea stanza POST /api/rooms', created.status === 200 && !! created.body?.shortCode, `status ${ created.status } code=${ created.body?.shortCode } link=${ SITE_URL }${ created.body?.joinPath ?? '' }` );

const { venueSlug, qrToken, shortCode } = created.body
    , base = `/api/${ venueSlug }/table/${ qrToken }`

    // 2. Il guest risolve il codice breve (equivalente del link/QR condiviso).
    , resolved = await guest.api( `/api/rooms/resolve?code=${ shortCode }` );

step( 'Guest: risolve short code GET /api/rooms/resolve', resolved.status === 200 && resolved.body?.qrToken === qrToken, `status ${ resolved.status }` );

// 3. Join: host crea la sessione, guest entra nella stessa.
const hostJoin = await host.api( `${ base }/join`, {
    method: 'POST',
    body: JSON.stringify( {
        nickname: 'HostBot',
        createSession: true,
    } ),
} );

step( 'Host: join tavolo (crea sessione)', hostJoin.status === 200 && !! hostJoin.body?.playerId, `status ${ hostJoin.status }` );

const tableSessionId = hostJoin.body.tableSessionId
    , guestJoin = await guest.api( `${ base }/join`, {
        method: 'POST',
        body: JSON.stringify( {
            nickname: 'GuestBot',
            sessionId: tableSessionId,
        } ),
    } );

step( 'Guest: join stessa sessione', guestJoin.status === 200 && !! guestJoin.body?.playerId, `status ${ guestJoin.status }` );

// 4. Realtime: entrambi sottoscrivono il channel privato del tavolo.
const hostRt = await subscribeTable( host, tableSessionId )
    , guestRt = await subscribeTable( guest, tableSessionId )

    // 5. L'host seleziona il gioco e avvia la partita (2 round per brevità).
    , selected = await host.api( `${ base }/game/select`, {
        method: 'POST',
        body: JSON.stringify( {
            playerId: hostJoin.body.playerId,
            selectedGame: 'thumbs',
        } ),
    } );

step( 'Host: seleziona gioco "thumbs"', selected.status === 200, `status ${ selected.status }` );

const started = await host.api( `${ base }/game/start`, {
    method: 'POST',
    body: JSON.stringify( {
        playerId: hostJoin.body.playerId,
        totalRounds: 2,
    } ),
} );

step( 'Host: avvia partita', started.status === 200, `status ${ started.status }` );

// 6. Quorum: l'host annuncia i presenti (come fa la pagina via presence sync).
await host.api( `${ base }/game/presence`, {
    method: 'POST',
    body: JSON.stringify( {
        playerId: hostJoin.body.playerId,
        online: [ hostJoin.body.playerId, guestJoin.body.playerId ],
    } ),
} );

// 7. Entrambi votano: al raggiungimento del quorum il server fa il reveal.
const voteHost = await host.api( `${ base }/game/vote`, {
        method: 'POST',
        body: JSON.stringify( {
            playerId: hostJoin.body.playerId,
            vote: 'up',
        } ),
    } )
    , voteGuest = await guest.api( `${ base }/game/vote`, {
        method: 'POST',
        body: JSON.stringify( {
            playerId: guestJoin.body.playerId,
            vote: 'down',
        } ),
    } );

step( 'Host: vota 👍', voteHost.status === 200, `status ${ voteHost.status }` );
step( 'Guest: vota 👎', voteGuest.status === 200, `status ${ voteGuest.status }` );

// 8. Stato finale: la partita deve essere in reveal con 2 voti.
const finalState = await guest.api( `${ base }/game/state?session=${ tableSessionId }` )
    , phase = finalState.body?.phase;

step( 'Stato partita dopo i voti', finalState.status === 200 && phase === 'reveal', `status ${ finalState.status } phase=${ phase }` );

// 9. I broadcast dal DB devono essere arrivati a entrambi i client.
await sleep( 2000 );
step( 'Realtime: broadcast ricevuti dall\'host', hostRt.received.length > 0, hostRt.received.join( ', ' ) );
step( 'Realtime: broadcast ricevuti dal guest', guestRt.received.length > 0, guestRt.received.join( ', ' ) );

console.info( `\n🎉 Flusso completo verificato: stanza ${ shortCode }, link ${ SITE_URL }${ created.body.joinPath }` );

// Chiude i socket realtime: senza, il processo resterebbe appeso.
await host.supabase.removeAllChannels();
await guest.supabase.removeAllChannels();
