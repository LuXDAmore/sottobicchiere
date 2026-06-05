import { describe, expect, it } from 'vitest';

import { aggregateTeamScores } from '../../shared/utils/team-scores';

const groups = [
    {
        id: 'blue',
        name: 'Blu',
        color: '#00f',
    },
    {
        id: 'red',
        name: 'Rosso',
        color: '#f00',
    },
];

describe( 'aggregateTeamScores', () => {

    it( 'somma i punteggi per squadra e ordina dalla più alta', () => {

        const result = aggregateTeamScores( {
            groups,
            playerGroups: {
                p1: 'blue',
                p2: 'blue',
                p3: 'red',
            },
            scores: {
                p1: 3,
                p2: 2,
                p3: 4,
            },
        } );

        expect( result.map( t => [
            t.groupId,
            t.score,
            t.memberCount,
        ] ) ).toEqual( [
            [
                'blue',
                5,
                2,
            ],
            [
                'red',
                4,
                1,
            ],
        ] );

    } );

    it( 'ignora i giocatori senza squadra', () => {

        const result = aggregateTeamScores( {
            groups,
            playerGroups: {
                p1: 'blue',
                p2: null,
            },
            scores: {
                p1: 2,
                p2: 99,
            },
        } );

        expect( result.find( t => t.groupId === 'blue' )?.score ).toBe( 2 );
        expect( result.find( t => t.groupId === 'red' )?.score ).toBe( 0 );

    } );

    it( 'tratta i punteggi mancanti come 0', () => {

        const result = aggregateTeamScores( {
            groups,
            playerGroups: { p1: 'blue' },
            scores: {},
        } );

        expect( result.find( t => t.groupId === 'blue' ) ).toMatchObject( {
            score: 0,
            memberCount: 1,
        } );

    } );

    it( 'ignora appartenenze a squadre inesistenti', () => {

        const result = aggregateTeamScores( {
            groups,
            playerGroups: { p1: 'ghost' },
            scores: { p1: 10 },
        } );

        expect( result.every( t => t.score === 0 ) ).toBe( true );

    } );

    it( 'ritorna [] senza squadre', () => {

        expect( aggregateTeamScores( {
            groups: [],
            playerGroups: { p1: 'x' },
            scores: { p1: 1 },
        } ) ).toEqual( [] );

    } );

} );
