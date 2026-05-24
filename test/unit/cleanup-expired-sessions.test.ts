import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    deleteExpiredSessions,
    getCleanupLastRun,
    resetCleanupLastRun,
    setCleanupLastRun,
} from '../../server/utils/cleanup-expired-sessions';

function stubDbDelete( deletedRows: Array<{ id: string }> ) {

    const chain = {
        returning: vi.fn().mockResolvedValue( deletedRows ),
        where: vi.fn(),
    };

    chain.where.mockReturnValue( chain );

    const deleteFn = vi.fn().mockReturnValue( chain );

    vi.stubGlobal( 'db', { delete: deleteFn } );

    return { chain, deleteFn };

}

describe( 'cleanup expired sessions', () => {

    beforeEach( () => {

        vi.unstubAllGlobals();
        resetCleanupLastRun();

    } );

    it( 'deleteExpiredSessions ritorna il numero di sessioni cancellate', async () => {

        const { chain, deleteFn } = stubDbDelete( [ { id: 'a' }, { id: 'b' }, { id: 'c' } ] );

        const deleted = await deleteExpiredSessions( new Date( '2026-05-24T06:00:00.000Z' ) );

        expect( deleted ).toBe( 3 );
        expect( deleteFn ).toHaveBeenCalledTimes( 1 );
        expect( chain.where ).toHaveBeenCalledTimes( 1 );
        expect( chain.returning ).toHaveBeenCalledTimes( 1 );

    } );

    it( 'salva e legge lo stato dell\'ultima esecuzione cleanup', () => {

        const payload = {
            deleted: 7,
            durationMs: 125,
            executedAt: '2026-05-24T06:00:00.000Z',
        };

        setCleanupLastRun( payload );

        expect( getCleanupLastRun() ).toEqual( payload );

    } );

    it( 'resetCleanupLastRun azzera lo stato dell\'ultima esecuzione', () => {

        setCleanupLastRun( {
            deleted: 2,
            durationMs: 50,
            executedAt: '2026-05-24T06:00:00.000Z',
        } );

        resetCleanupLastRun();

        expect( getCleanupLastRun() ).toBeNull();

    } );

} );
