import { describe, expect, it } from 'vitest';

import type { TurnState } from '../../server/utils/game-turns';
import {
    advanceTurnState,
    buildTurnState,
    currentTurnPlayer,
    promptAt,
} from '../../server/utils/game-turns';

describe( 'buildTurnState', () => {

    it( 'mescola i giocatori conservandone l\'insieme e azzera i puntatori', () => {

        const ids = [ 'a', 'b', 'c', 'd' ]
            , state = buildTurnState( ids );

        expect( state.turnIndex ).toBe( 0 );
        expect( state.deckIndex ).toBe( 0 );
        expect( new Set( state.order ) ).toEqual( new Set( ids ) );

    } );

} );

describe( 'currentTurnPlayer', () => {

    const base: TurnState = {
        order: [ 'a', 'b', 'c' ],
        turnIndex: 0,
        deckIndex: 0,
    };

    it( 'restituisce il giocatore in posizione turnIndex mod length', () => {

        expect( currentTurnPlayer( base ) ).toBe( 'a' );
        expect( currentTurnPlayer( {
            ... base,
            turnIndex: 1,
        } ) ).toBe( 'b' );
        // Cicla: 3 % 3 = 0 → torna al primo.
        expect( currentTurnPlayer( {
            ... base,
            turnIndex: 3,
        } ) ).toBe( 'a' );

    } );

    it( 'restituisce null senza giocatori', () => {

        expect( currentTurnPlayer( {
            order: [],
            turnIndex: 0,
            deckIndex: 0,
        } ) ).toBeNull();

    } );

} );

describe( 'advanceTurnState', () => {

    const base: TurnState = {
        order: [ 'a', 'b' ],
        turnIndex: 0,
        deckIndex: 0,
    };

    it( 'next su dares: turno e carta avanzano insieme', () => {

        const next = advanceTurnState( base, 'dares', 'next' );

        expect( next.turnIndex ).toBe( 1 );
        expect( next.deckIndex ).toBe( 1 );

    } );

    it( 'next su categorie: avanza il turno ma resta la categoria', () => {

        const next = advanceTurnState( base, 'categorie', 'next' );

        expect( next.turnIndex ).toBe( 1 );
        expect( next.deckIndex ).toBe( 0 );

    } );

    it( 'newPrompt: cambia il mazzo senza cambiare il turno', () => {

        const next = advanceTurnState( {
            ... base,
            turnIndex: 1,
        }, 'categorie', 'newPrompt' );

        expect( next.turnIndex ).toBe( 1 );
        expect( next.deckIndex ).toBe( 1 );

    } );

    it( 'non muta lo stato originale', () => {

        advanceTurnState( base, 'dares', 'next' );
        expect( base.turnIndex ).toBe( 0 );
        expect( base.deckIndex ).toBe( 0 );

    } );

    it( 'next salta i giocatori offline fino al prossimo presente', () => {

        const state: TurnState = {
            order: [ 'a', 'b', 'c', 'd' ],
            turnIndex: 0,
            deckIndex: 0,
        };

        // 'b' e 'c' offline: da turno 'a' si salta a 'd' (turnIndex 3).
        const next = advanceTurnState( state, 'categorie', 'next', [ 'a', 'd' ] );

        expect( next.turnIndex ).toBe( 3 );

    } );

    it( 'next avanza di una posizione se la lista online è vuota o assente', () => {

        const state: TurnState = {
            order: [ 'a', 'b', 'c' ],
            turnIndex: 0,
            deckIndex: 0,
        };

        expect( advanceTurnState( state, 'categorie', 'next', [] ).turnIndex ).toBe( 1 );
        expect( advanceTurnState( state, 'categorie', 'next' ).turnIndex ).toBe( 1 );

    } );

} );

describe( 'promptAt', () => {

    it( 'cicla sul mazzo con il modulo', () => {

        const deck = [ 'x', 'y' ];

        expect( promptAt( deck, 0 ) ).toBe( 'x' );
        expect( promptAt( deck, 1 ) ).toBe( 'y' );
        expect( promptAt( deck, 2 ) ).toBe( 'x' );

    } );

    it( 'restituisce null su mazzo vuoto', () => {

        expect( promptAt( [], 3 ) ).toBeNull();

    } );

} );
