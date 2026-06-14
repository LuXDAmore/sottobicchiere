import type { DareCard, LocalizedText } from '../../shared/utils/party';

import { CATEGORY_PROMPTS, PARTY_DARES, shuffle } from '../../shared/utils/party';

// Stato dei turni serializzato sulla riga `games` (colonna turn_state).
//  • order      → giocatori in ordine di turno (snapshot all'avvio)
//  • turnIndex  → puntatore al giocatore di turno (si legge mod order.length)
//  • deckIndex  → puntatore nel mazzo `questions` (si legge mod deck.length)
export interface TurnState {
    order: string[];
    turnIndex: number;
    deckIndex: number;
}

// 'next'      → passa al giocatore successivo (per dares pesca anche la carta nuova).
// 'newPrompt' → cambia carta/categoria senza cambiare il turno (es. "nuova categoria").
export type TurnAction = 'newPrompt' | 'next';

/**
 * Mazzo iniziale (mescolato) per un gioco a turni: carte per dares, categorie per
 * categorie. Resta privacy-first: i contenuti puntano a bersagli generici.
 * @param kind - id del gioco a turni.
 */
export function buildTurnDeck( kind: string ): ( DareCard | LocalizedText )[] {

    return kind === 'dares' ? shuffle( PARTY_DARES ) : shuffle( CATEGORY_PROMPTS );

}

/**
 * Stato dei turni all'avvio: ordine mescolato dei giocatori, puntatori a zero.
 * @param playerIds - id dei giocatori della sessione.
 */
export function buildTurnState( playerIds: string[] ): TurnState {

    return {
        order: shuffle( playerIds ),
        turnIndex: 0,
        deckIndex: 0,
    };

}

/**
 * Giocatore di turno, o null se non c'è nessun giocatore nell'ordine.
 * @param state - stato dei turni.
 */
export function currentTurnPlayer( state: TurnState ): string | null {

    if( state.order.length === 0 ) return null;
    return state.order[ state.turnIndex % state.order.length ] ?? null;

}

/**
 * Calcola il nuovo stato dei turni dopo un'azione. Funzione pura: non tocca il DB.
 * @param state - stato corrente.
 * @param kind - id del gioco (decide se 'next' pesca anche una nuova carta).
 * @param action - azione richiesta.
 */
export function advanceTurnState( state: TurnState, kind: string, action: TurnAction ): TurnState {

    if( action === 'newPrompt' ) {

        return {
            ... state,
            deckIndex: state.deckIndex + 1,
        };

    }

    // 'next': turno successivo. dares pesca una carta nuova a ogni turno; categorie
    // mantiene la stessa categoria mentre il telefono "gira" tra i giocatori.
    return {
        ... state,
        turnIndex: state.turnIndex + 1,
        deckIndex: kind === 'dares' ? state.deckIndex + 1 : state.deckIndex,
    };

}

/**
 * Prompt corrente (carta/categoria) dato il mazzo e il puntatore; cicla sul mazzo
 * così non finisce mai durante una serata. Null se il mazzo è vuoto.
 * @param deck - mazzo del gioco (questions).
 * @param deckIndex - puntatore nel mazzo.
 */
export function promptAt<T>( deck: readonly T[], deckIndex: number ): T | null {

    if( deck.length === 0 ) return null;
    return deck[ deckIndex % deck.length ] ?? null;

}
