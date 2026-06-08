import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import type { ServiceClient } from '../../server/utils/supabase';

import { requireHostSession, requirePlayerForTable } from '../../server/utils/request';

vi.mock( '#supabase/server', () => ( { serverSupabaseUser: vi.fn( () => Promise.resolve( { sub: 'user-1' } ) ) } ) );

beforeAll( () => {

    vi.stubGlobal( 'createError', ( options: { statusCode?: number; statusMessage?: string; message?: string } ) =>
        Object.assign( new Error( options.message ), options ) );

} );

afterAll( () => {

    vi.unstubAllGlobals();

} );

/**
 *
 * @param player
 * @param session
 * @returns {ServiceClient} client Supabase stub.
 */
function makeClient(
    player: { id: string; table_session_id: string; is_host: boolean; user_id: string } | null,
    session: { id: string; host_player_id: string | null; session_mode: string; dating_enabled: boolean; table_id: string } | null
): ServiceClient {

    return {
        from( table: string ) {

            return {
                select() {

                    return {
                        eq() {

                            return this;

                        },
                        gt() {

                            return this;

                        },
                        maybeSingle() {

                            return Promise.resolve( table === 'player_sessions'
                                ? { data: player }
                                : { data: session } );

                        },
                    };

                },
            };

        },
    } as unknown as ServiceClient;

}

describe( 'requireHostSession', () => {

    it( 'nega accesso se la sessione non appartiene al tavolo richiesto', async() => {

        const client = makeClient(
            {
                id: 'player-1',
                table_session_id: 'session-1',
                is_host: true,
                user_id: 'user-1',
            },
            {
                id: 'session-1',
                host_player_id: 'player-1',
                session_mode: 'board',
                dating_enabled: false,
                table_id: 'table-other',
            }
        );

        await expect( requireHostSession( {} as never, client, 'player-1', 'table-expected' ) )
            .rejects
            .toMatchObject( {
                statusCode: 403,
                statusMessage: 'PLAYER_TABLE_MISMATCH',
            } );

    } );

    it( 'consente quando il tavolo coincide e host_player_id è nullo ma player è host', async() => {

        const client = makeClient(
            {
                id: 'player-1',
                table_session_id: 'session-1',
                is_host: true,
                user_id: 'user-1',
            },
            {
                id: 'session-1',
                host_player_id: null,
                session_mode: 'board',
                dating_enabled: false,
                table_id: 'table-expected',
            }
        );

        await expect( requireHostSession( {} as never, client, 'player-1', 'table-expected' ) )
            .resolves
            .toMatchObject( {
                hostPlayerId: 'player-1',
                session: { id: 'session-1' },
            } );

    } );

} );

describe( 'requirePlayerForTable', () => {

    it( 'nega accesso se il player appartiene a una sessione di un altro tavolo', async() => {

        const client = makeClient(
            {
                id: 'player-1',
                table_session_id: 'session-1',
                is_host: false,
                user_id: 'user-1',
            },
            null
        );

        await expect( requirePlayerForTable( {} as never, client, 'player-1', 'table-expected' ) )
            .rejects
            .toMatchObject( {
                statusCode: 403,
                statusMessage: 'PLAYER_TABLE_MISMATCH',
            } );

    } );

    it( 'consente accesso se player e route appartengono allo stesso tavolo', async() => {

        const client = makeClient(
            {
                id: 'player-1',
                table_session_id: 'session-1',
                is_host: false,
                user_id: 'user-1',
            },
            {
                id: 'session-1',
                host_player_id: null,
                session_mode: 'board',
                dating_enabled: false,
                table_id: 'table-expected',
            }
        );

        await expect( requirePlayerForTable( {} as never, client, 'player-1', 'table-expected' ) )
            .resolves
            .toMatchObject( {
                player: { id: 'player-1' },
                session: { id: 'session-1' },
            } );

    } );

} );
