// Tipi di dominio realtime condivisi client ↔ server.
// Il trasporto è gestito da Supabase Realtime (broadcast da DB + presence):
// non esistono più union di messaggi WebSocket, i client mappano le righe DB.

import type { PlayerColor } from '../utils/colors';

export interface WsPlayer {
    id: string;
    nickname: string;
    color: PlayerColor;
}

export type SessionMode = 'board' | 'dating' | 'preserata';

export interface DatingInboxMessage {
    id: string;
    fromTableSessionId: string;
    toTableSessionId: string;
    body: string;
    createdAt: string;
}

export type GamePhase = 'finished' | 'reveal' | 'voting';
export type VoteChoice = 'down' | 'up';

export interface LobbyGameSelection {
    selectedGame: string | null;
    gameMode: string | null;
    lockedAt: string | null;
    hostPlayerId: string | null;
}

export interface ThumbsClientState {
    phase: GamePhase;
    roundIndex: number;
    totalRounds: number;
    question: { it: string; en: string };
    votedCount: number;
    totalCount: number;
    myVote: VoteChoice | null;
    votes: Record<string, VoteChoice> | null;
    scores: Record<string, number>;
    hostPlayerId: string;
}

// ── Giochi a turni (categorie, dares) ────────────────────────────────────────
// Stato client mappato dalla riga `games` quando il gioco è a turni: ognuno gioca
// dal proprio dispositivo, agisce solo quando è il suo turno, vede cosa fanno gli
// altri. La fonte autoritativa resta Postgres (broadcast da trigger).
export interface TurnBasedClientState {
    kind: string;
    // Ordine di turno (snapshot all'avvio) e puntatori.
    order: string[];
    turnIndex: number;
    deckIndex: number;
    // Giocatore di turno, derivato da order[turnIndex % order.length].
    currentPlayerId: string | null;
    // Prompt corrente: categoria { it, en } per categorie, carta per dares.
    prompt: unknown;
    hostPlayerId: string;
}

export interface DatingRoomStatus {
    availableTableSessionIds: string[];
    unavailableTableSessionIds: string[];
}
