// Verifica end-to-end "live" dei flussi di gestione tavolo/partita contro un
// deploy reale (pensata per le preview dei PR):
//   crea stanza → join singolo → start rifiutato (min giocatori) → secondo join
//   → select/start → vincolo host su end → fine partita (sblocco selezione)
//   → ri-selezione → leave guest (conteggi veritieri) → leave host (sessione
//   svuotata = scaduta subito) → guardie anti-impersonificazione.
//
// Uso:
//   SITE_URL=https://<preview>.vercel.app \
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_KEY=<publishable-key> \
//   node scripts/e2e-live-flows.mjs
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

        };

    return {
        api,
        label,
        supabase,
        userId: data.user.id,
    };

}

const host = await createAnonUser( 'Host' )
    , guest = await createAnonUser( 'Guest' )

    // ── 1. Setup: stanza + sessione ──────────────────────────────────────────────
    , created = await host.api( '/api/rooms', {
        method: 'POST',
        body: JSON.stringify( { name: 'Verifica flussi' } ),
    } );

step( 'Host: crea stanza POST /api/rooms', created.status === 200 && !! created.body?.shortCode, `status ${ created.status }` );

const { venueSlug, qrToken, shortCode } = created.body
    , base = `/api/${ venueSlug }/table/${ qrToken }`

    // L'info tavolo espone lo short code (serve all'invito da qualunque membro).
    , info = await host.api( base );

step( 'GET info tavolo espone shortCode', info.status === 200 && info.body?.shortCode === shortCode, `status ${ info.status } code=${ info.body?.shortCode }` );

const hostJoin = await host.api( `${ base }/join`, {
    method: 'POST',
    body: JSON.stringify( {
        nickname: 'HostBot',
        createSession: true,
    } ),
} );

step( 'Host: join tavolo (crea sessione)', hostJoin.status === 200 && !! hostJoin.body?.playerId, `status ${ hostJoin.status }` );

const tableSessionId = hostJoin.body.tableSessionId
    , hostPlayerId = hostJoin.body.playerId

    // ── 2. Vincolo min giocatori: da soli non si parte ───────────────────────────
    , selectedAlone = await host.api( `${ base }/game/select`, {
        method: 'POST',
        body: JSON.stringify( {
            playerId: hostPlayerId,
            selectedGame: 'thumbs',
        } ),
    } );

step( 'Host: seleziona "thumbs" da solo (consentito)', selectedAlone.status === 200, `status ${ selectedAlone.status }` );

const startAlone = await host.api( `${ base }/game/start`, {
    method: 'POST',
    body: JSON.stringify( {
        playerId: hostPlayerId,
        totalRounds: 2,
    } ),
} );

step( 'Start da solo rifiutato (NOT_ENOUGH_PLAYERS)', startAlone.status === 422, `status ${ startAlone.status } ${ startAlone.body?.statusMessage ?? '' }` );

// ── 3. Fine partita: sblocca la selezione ────────────────────────────────────
const endAlone = await host.api( `${ base }/game/end`, {
    method: 'POST',
    body: JSON.stringify( { playerId: hostPlayerId } ),
} );

step( 'Host: termina/sblocca la selezione', endAlone.status === 200, `status ${ endAlone.status }` );

const currentAfterEnd = await host.api( `${ base }/game/current?session=${ tableSessionId }` );

step( 'Selezione sbloccata (selectedGame/lockedAt null)', currentAfterEnd.status === 200 && currentAfterEnd.body?.selectedGame === null && currentAfterEnd.body?.lockedAt === null, `status ${ currentAfterEnd.status } selected=${ currentAfterEnd.body?.selectedGame }` );

// ── 4. Partita vera in 2 + guardie host ──────────────────────────────────────
const guestJoin = await guest.api( `${ base }/join`, {
    method: 'POST',
    body: JSON.stringify( {
        nickname: 'GuestBot',
        sessionId: tableSessionId,
    } ),
} );

step( 'Guest: join stessa sessione', guestJoin.status === 200 && !! guestJoin.body?.playerId, `status ${ guestJoin.status }` );

const guestPlayerId = guestJoin.body.playerId

    , reSelected = await host.api( `${ base }/game/select`, {
        method: 'POST',
        body: JSON.stringify( {
            playerId: hostPlayerId,
            selectedGame: 'thumbs',
        } ),
    } );

step( 'Host: ri-seleziona dopo lo sblocco', reSelected.status === 200, `status ${ reSelected.status }` );

const started = await host.api( `${ base }/game/start`, {
    method: 'POST',
    body: JSON.stringify( {
        playerId: hostPlayerId,
        totalRounds: 2,
    } ),
} );

step( 'Host: avvia partita in 2', started.status === 200, `status ${ started.status }` );

// Un non-host NON può terminare la partita.
const endByGuest = await guest.api( `${ base }/game/end`, {
    method: 'POST',
    body: JSON.stringify( { playerId: guestPlayerId } ),
} );

step( 'Guest: end rifiutato (NOT_HOST)', endByGuest.status === 403, `status ${ endByGuest.status }` );

// Impersonificazione: il guest non può usare il playerId dell'host.
const endImpersonated = await guest.api( `${ base }/game/end`, {
    method: 'POST',
    body: JSON.stringify( { playerId: hostPlayerId } ),
} );

step( 'Guest: end impersonando l\'host rifiutato', endImpersonated.status === 403, `status ${ endImpersonated.status }` );

const endMidGame = await host.api( `${ base }/game/end`, {
    method: 'POST',
    body: JSON.stringify( { playerId: hostPlayerId } ),
} );

step( 'Host: termina la partita in corso', endMidGame.status === 200, `status ${ endMidGame.status }` );

const stateAfterEnd = await host.api( `${ base }/game/state?session=${ tableSessionId }` );

step( 'Partita marcata finished', stateAfterEnd.status === 200 && ( stateAfterEnd.body === null || stateAfterEnd.body?.phase === 'finished' ), `phase=${ stateAfterEnd.body?.phase ?? 'null' }` );

// ── 5. Leave: conteggi veritieri e sessione svuotata ─────────────────────────
const leaveImpersonated = await guest.api( `${ base }/leave`, {
    method: 'POST',
    body: JSON.stringify( { playerId: hostPlayerId } ),
} );

step( 'Guest: leave impersonando l\'host rifiutato', leaveImpersonated.status === 403, `status ${ leaveImpersonated.status }` );

const guestLeave = await guest.api( `${ base }/leave`, {
    method: 'POST',
    body: JSON.stringify( { playerId: guestPlayerId } ),
} );

step( 'Guest: leave', guestLeave.status === 200, `status ${ guestLeave.status }` );

const guestLeaveAgain = await guest.api( `${ base }/leave`, {
    method: 'POST',
    body: JSON.stringify( { playerId: guestPlayerId } ),
} );

step( 'Guest: secondo leave rifiutato (riga rimossa)', guestLeaveAgain.status === 403, `status ${ guestLeaveAgain.status }` );

const sessionsAfterGuestLeave = await host.api( `${ base }/sessions` )
    , sessionRow = sessionsAfterGuestLeave.body?.sessions?.find( s => s.sessionId === tableSessionId );

step( 'Conteggio sessione aggiornato (1 giocatore)', sessionsAfterGuestLeave.status === 200 && sessionRow?.playerCount === 1, `players=${ sessionRow?.playerCount }` );

const hostLeave = await host.api( `${ base }/leave`, {
    method: 'POST',
    body: JSON.stringify( { playerId: hostPlayerId } ),
} );

step( 'Host: leave (ultimo giocatore)', hostLeave.status === 200, `status ${ hostLeave.status }` );

const sessionsAfterAll = await host.api( `${ base }/sessions` )
    , stillThere = sessionsAfterAll.body?.sessions?.some( s => s.sessionId === tableSessionId );

step( 'Sessione vuota scaduta (non più elencata)', sessionsAfterAll.status === 200 && ! stillThere, `sessions=${ sessionsAfterAll.body?.sessions?.length }` );

console.info( `\n${ results.filter( r => r.ok ).length }/${ results.length } step passati.` );
