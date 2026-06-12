import { describe, expect, it } from 'vitest';

import { buildGameRounds, computeReveal } from '../../server/utils/game-thumbs';

describe( 'buildGameRounds', () => {

    it( 'limita i round al numero di domande disponibili', () => {

        const { questions, totalRounds } = buildGameRounds( 999 );

        expect( totalRounds ).toBe( questions.length );
        expect( totalRounds ).toBeGreaterThan( 0 );

    } );

    it( 'rispetta il numero di round richiesto quando valido', () => {

        const { questions, totalRounds } = buildGameRounds( 3 );

        expect( totalRounds ).toBe( 3 );
        expect( questions ).toHaveLength( 3 );

    } );

    it( 'forza almeno un round', () => {

        expect( buildGameRounds( 0 ).totalRounds ).toBe( 1 );

    } );

    it( 'normalizza input non numerici o non finiti a 1 round', () => {

        expect( buildGameRounds( Number.NaN ).totalRounds ).toBe( 1 );
        expect( buildGameRounds( Number.POSITIVE_INFINITY ).totalRounds ).toBe( 1 );

    } );

    it( 'tronca i decimali per evitare round frazionari', () => {

        expect( buildGameRounds( 3.9 ).totalRounds ).toBe( 3 );
        expect( buildGameRounds( 3.9 ).questions ).toHaveLength( 3 );

    } );

} );

describe( 'computeReveal', () => {

    it( 'assegna 1 punto a chi ha votato con la maggioranza', () => {

        const { scores } = computeReveal(
            {
                a: 'up',
                b: 'up',
                c: 'down',
            },
            {
                a: 0,
                b: 0,
                c: 0,
            }
        );

        expect( scores ).toEqual( {
            a: 1,
            b: 1,
            c: 0,
        } );

    } );

    it( 'non assegna punti in caso di parità', () => {

        const { scores } = computeReveal(
            {
                a: 'up',
                b: 'down',
            },
            {
                a: 2,
                b: 2,
            }
        );

        expect( scores ).toEqual( {
            a: 2,
            b: 2,
        } );

    } );

    it( 'accumula sui punteggi esistenti senza mutarli', () => {

        const current = {
                a: 5,
                b: 1,
            }
            , { scores } = computeReveal( {
                a: 'down',
                b: 'down',
            }, current );

        expect( scores ).toEqual( {
            a: 6,
            b: 2,
        } );
        expect( current ).toEqual( {
            a: 5,
            b: 1,
        } );

    } );

} );
