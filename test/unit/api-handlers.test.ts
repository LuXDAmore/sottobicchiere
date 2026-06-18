// Test d'integrazione degli event handler API (audit M6). Esercitano i branch di
// autorizzazione e validazione degli endpoint critici, montando l'handler reale con:
//  • #supabase/server mockato (service role + utente anonimo),
//  • i global h3 (defineEventHandler/readBody/getRouterParam/getQuery/createError)
//    stubbati,
//  • un client Supabase finto e "scriptabile" (risposte in coda per tabella).
// Stesso spirito dei test in request.test.ts, ma a livello di handler completo.

import {
    afterAll,
    afterEach,
    beforeAll,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import type { ServiceClient } from '../../server/utils/supabase';

// Holder hoistati: il factory di vi.mock gira al primo import del modulo, quindi
// non può catturare `let` definiti dopo. vi.hoisted ci dà contenitori mutabili.
const context = vi.hoisted( () => ( {
    client: null as unknown as ServiceClient,
    user: null as { sub?: string; id?: string } | null,
    body: {} as Record<string, unknown>,
    params: {} as Record<string, string>,
} ) );

vi.mock( '#supabase/server', () => ( {
    serverSupabaseServiceRole: () => context.client,
    serverSupabaseUser: () => Promise.resolve( context.user ),
} ) );

interface QueryResult { data?: unknown; error?: unknown; count?: number }

// Client finto: ad ogni from(table) restituisce un builder chainable; i terminali
// (maybeSingle/single/await) consumano in ordine le risposte preconfigurate per
// quella tabella. Copre i percorsi degli handler testati (nessuna insert/update
// reale: i test si fermano ai branch di rifiuto).
/**
 *
 * @param script
 */
function makeClient( script: Record<string, QueryResult[]> ): ServiceClient {

    const cursors: Record<string, number> = {}

        , nextResult = ( table: string ): QueryResult => {

            const queue = script[ table ] ?? []
                , index = cursors[ table ] ?? 0;

            cursors[ table ] = index + 1;

            return queue[ index ] ?? { data: null };

        }

        , builder = ( table: string ) => {

            const chain: Record<string, unknown> = {}
                , passthrough = [
                    'select',
                    'eq',
                    'gt',
                    'gte',
                    'lt',
                    'lte',
                    'order',
                    'limit',
                    'is',
                    'in',
                    'insert',
                    'update',
                    'upsert',
                    'delete',
                ];

            for( const method of passthrough ) chain[ method ] = () => chain;

            chain.maybeSingle = () => Promise.resolve( nextResult( table ) );
            chain.single = () => Promise.resolve( nextResult( table ) );
            // Thenable: copre le query awaitate senza maybeSingle (es. liste).
            chain.then = ( onFulfilled: ( value: QueryResult ) => unknown, onRejected?: ( reason: unknown ) => unknown ) =>
                Promise.resolve( nextResult( table ) ).then( onFulfilled, onRejected );

            return chain;

        };

    return { from: ( table: string ) => builder( table ) } as unknown as ServiceClient;

}

// Riga tavolo risolta da resolveTableRow (join venues!inner).
/**
 *
 */
function resolvedTable() {

    return {
        data: {
            id: 'table-1',
            table_number: 1,
            short_code: null,
            venues: {
                name: 'Demo',
                slug: 'demo',
                kind: 'venue',
            },
        },
    };

}

beforeAll( () => {

    vi.stubGlobal( 'defineEventHandler', ( function_: unknown ) => function_ );
    vi.stubGlobal( 'readBody', () => Promise.resolve( context.body ) );
    vi.stubGlobal( 'getRouterParam', ( _event: unknown, key: string ) => context.params[ key ] );
    vi.stubGlobal( 'getQuery', () => ( {} ) );
    vi.stubGlobal( 'createError', ( options: { statusCode?: number; statusMessage?: string; message?: string } ) =>
        Object.assign( new Error( options.message ), options ) );

} );

afterEach( () => {

    context.client = null as unknown as ServiceClient;
    context.user = null;
    context.body = {};
    context.params = {};

} );

afterAll( () => {

    vi.unstubAllGlobals();

} );

const event = {} as never

    // Setup comune: utente anonimo + parametri di route validi.
    , baseSetup = () => {

        context.user = { sub: 'user-1' };
        context.params = {
            venue: 'demo',
            token: 'demo-001',
        };

    }

    , player = ( overrides: Record<string, unknown> = {} ) => ( {
        data: {
            id: 'player-1',
            table_session_id: 'session-1',
            user_id: 'user-1',
            is_host: false,
            ... overrides,
        },
    } );

describe( 'POST game/vote', () => {

    it( 'rifiuta un payload non valido con 422', async() => {

        baseSetup();
        context.body = {
            playerId: 'not-a-uuid',
            vote: 'sideways',
        };

        const handler = ( await import( '../../server/api/[venue]/table/[token]/game/vote.post' ) ).default as ( e: never ) => Promise<unknown>;

        await expect( handler( event ) ).rejects.toMatchObject( { statusCode: 422 } );

    } );

    it( 'risponde 409 se non c\'è una votazione attiva', async() => {

        baseSetup();
        context.body = {
            playerId: '11111111-1111-4111-8111-111111111111',
            vote: 'up',
        };
        context.client = makeClient( {
            tables: [ resolvedTable() ],
            player_sessions: [ player( { id: '11111111-1111-4111-8111-111111111111' } ) ],
            table_sessions: [
                {
                    data: {
                        id: 'session-1',
                        table_id: 'table-1',
                    },
                },
            ],
            // getActiveGameLite → nessuna partita.
            games: [{ data: null }],
        } );

        const handler = ( await import( '../../server/api/[venue]/table/[token]/game/vote.post' ) ).default as ( e: never ) => Promise<unknown>;

        await expect( handler( event ) ).rejects.toMatchObject( {
            statusCode: 409,
            statusMessage: 'NO_ACTIVE_VOTE',
        } );

    } );

} );

describe( 'POST game/select', () => {

    const validHostPayload = { playerId: '11111111-1111-4111-8111-111111111111' };

    it( 'rifiuta la selezione di un gioco solo (si avvia localmente)', async() => {

        baseSetup();
        context.body = {
            ... validHostPayload,
            selectedGame: 'reflex',
        };

        const handler = ( await import( '../../server/api/[venue]/table/[token]/game/select.post' ) ).default as ( e: never ) => Promise<unknown>;

        await expect( handler( event ) ).rejects.toMatchObject( {
            statusCode: 422,
            statusMessage: 'SOLO_GAME_NOT_SELECTABLE',
        } );

    } );

    it( 'risponde 409 se la sessione è già bloccata su un gioco', async() => {

        baseSetup();
        context.body = {
            ... validHostPayload,
            selectedGame: 'thumbs',
        };
        context.client = makeClient( {
            tables: [ resolvedTable() ],
            player_sessions: [
                player( {
                    id: validHostPayload.playerId,
                    is_host: true,
                } ),
            ],
            table_sessions: [
                {
                    data: {
                        id: 'session-1',
                        host_player_id: validHostPayload.playerId,
                        locked_at: '2026-06-17T10:00:00Z',
                    },
                },
            ],
        } );

        const handler = ( await import( '../../server/api/[venue]/table/[token]/game/select.post' ) ).default as ( e: never ) => Promise<unknown>;

        await expect( handler( event ) ).rejects.toMatchObject( {
            statusCode: 409,
            statusMessage: 'GAME_ALREADY_LOCKED',
        } );

    } );

    it( 'risponde 403 se chi seleziona non è l\'host', async() => {

        baseSetup();
        context.body = {
            ... validHostPayload,
            selectedGame: 'thumbs',
        };
        context.client = makeClient( {
            tables: [ resolvedTable() ],
            player_sessions: [
                player( {
                    id: validHostPayload.playerId,
                    is_host: false,
                } ),
            ],
            table_sessions: [
                {
                    data: {
                        id: 'session-1',
                        host_player_id: 'another-player',
                        locked_at: null,
                    },
                },
            ],
        } );

        const handler = ( await import( '../../server/api/[venue]/table/[token]/game/select.post' ) ).default as ( e: never ) => Promise<unknown>;

        await expect( handler( event ) ).rejects.toMatchObject( {
            statusCode: 403,
            statusMessage: 'NOT_HOST',
        } );

    } );

} );

describe( 'POST game/turn/advance', () => {

    it( 'risponde 403 se non è il turno di chi richiede (e non è host)', async() => {

        baseSetup();
        context.body = {
            playerId: '11111111-1111-4111-8111-111111111111',
            action: 'next',
        };
        context.client = makeClient( {
            tables: [ resolvedTable() ],
            player_sessions: [
                player( {
                    id: '11111111-1111-4111-8111-111111111111',
                    is_host: false,
                } ),
            ],
            table_sessions: [
                {
                    data: {
                        id: 'session-1',
                        host_player_id: 'another-player',
                    },
                },
            ],
            // Gioco a turni attivo, ma il turno è di un altro giocatore.
            games: [
                {
                    data: {
                        id: 'game-1',
                        phase: 'turn',
                        kind: 'categorie',
                        questions: [],
                        round_index: 0,
                        scores: {},
                        total_count: 1,
                        host_player_id: 'another-player',
                        turn_state: {
                            order: [ 'someone-else' ],
                            turnIndex: 0,
                            deckIndex: 0,
                        },
                    },
                },
            ],
        } );

        const handler = ( await import( '../../server/api/[venue]/table/[token]/game/turn/advance.post' ) ).default as ( e: never ) => Promise<unknown>;

        await expect( handler( event ) ).rejects.toMatchObject( {
            statusCode: 403,
            statusMessage: 'NOT_YOUR_TURN',
        } );

    } );

} );

describe( 'POST dating/message', () => {

    const validPlayerId = '11111111-1111-4111-8111-111111111111'
        , ownSession = '33333333-3333-4333-8333-333333333333'
        , otherSession = '22222222-2222-4222-8222-222222222222';

    it( 'rifiuta un messaggio verso il proprio stesso tavolo con 400', async() => {

        baseSetup();
        context.body = {
            playerId: validPlayerId,
            toTableSessionId: ownSession,
            body: 'ciao',
        };
        context.client = makeClient( {
            tables: [ resolvedTable() ],
            player_sessions: [
                player( {
                    id: validPlayerId,
                    table_session_id: ownSession,
                } ),
            ],
            table_sessions: [
                {
                    data: {
                        id: ownSession,
                        table_id: 'table-1',
                    },
                },
            ],
        } );

        const handler = ( await import( '../../server/api/[venue]/table/[token]/dating/message.post' ) ).default as ( e: never ) => Promise<unknown>;

        await expect( handler( event ) ).rejects.toMatchObject( {
            statusCode: 400,
            statusMessage: 'INVALID_TARGET',
        } );

    } );

    it( 'rifiuta contenuti bloccati dalla moderazione con 422', async() => {

        baseSetup();
        context.body = {
            playerId: validPlayerId,
            toTableSessionId: otherSession,
            body: 'sei un idiota',
        };
        context.client = makeClient( {
            tables: [ resolvedTable() ],
            player_sessions: [ player( { id: validPlayerId } ) ],
            table_sessions: [
                {
                    data: {
                        id: 'session-1',
                        table_id: 'table-1',
                    },
                },
            ],
        } );

        const handler = ( await import( '../../server/api/[venue]/table/[token]/dating/message.post' ) ).default as ( e: never ) => Promise<unknown>;

        await expect( handler( event ) ).rejects.toMatchObject( {
            statusCode: 422,
            statusMessage: 'MESSAGE_REJECTED',
        } );

    } );

} );
