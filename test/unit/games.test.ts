import { describe, expect, it } from 'vitest';

import { GAME_DEFINITIONS, getGameDefinition, getGamesByCategory } from '../../shared/utils/games';

describe( 'catalogo giochi', () => {

    it( 'ogni gioco ha id unico e vincoli giocatori coerenti', () => {

        const ids = GAME_DEFINITIONS.map( g => g.id );

        expect( new Set( ids ).size ).toBe( ids.length );

        for( const game of GAME_DEFINITIONS ) {

            expect( game.minPlayers ).toBeGreaterThanOrEqual( 1 );
            if( game.maxPlayers !== undefined ) expect( game.maxPlayers ).toBeGreaterThanOrEqual( game.minPlayers );

        }

    } );

} );

describe( 'getGameDefinition', () => {

    it( 'trova un gioco esistente', () => {

        expect( getGameDefinition( 'thumbs' )?.id ).toBe( 'thumbs' );
        expect( getGameDefinition( 'reflex' )?.category ).toBe( 'solo' );

    } );

} );

describe( 'getGamesByCategory', () => {

    it( '"all" ritorna l\'intero catalogo', () => {

        expect( getGamesByCategory( 'all' ) ).toHaveLength( GAME_DEFINITIONS.length );

    } );

    it( 'board e preserata includono i giochi "both" (universali)', () => {

        const board = getGamesByCategory( 'board' ).map( g => g.id );

        expect( board ).toContain( 'thumbs' ); // both → visibile tra i da tavolo

    } );

    it( '"solo" NON include i giochi "both" né i giochi di gruppo', () => {

        const solo = getGamesByCategory( 'solo' );

        expect( solo.every( g => g.category === 'solo' ) ).toBe( true );
        expect( solo.map( g => g.id ) ).toContain( 'reflex' );
        expect( solo.map( g => g.id ) ).not.toContain( 'thumbs' );

    } );

    it( 'i giochi "solo" non inquinano board/preserata', () => {

        expect( getGamesByCategory( 'board' ).some( g => g.category === 'solo' ) ).toBe( false );
        expect( getGamesByCategory( 'preserata' ).some( g => g.category === 'solo' ) ).toBe( false );

    } );

} );
