// Tipi messaggi WebSocket condivisi client ↔ server

import type { PlayerColor } from '../utils/colors';

export interface WsPlayer {
    id: string;
    nickname: string;
    color: PlayerColor;
}

// ── Client → Server ─────────────────────────────────────────────────────────

export type ClientMessage =
    { type: 'game:next' } | { type: 'game:start'; totalRounds?: number } | { type: 'game:vote'; vote: 'down' | 'up' };

// ── Server → Client ─────────────────────────────────────────────────────────

export type ServerMessage =
    { type: 'error'; message: string } | { type: 'game:finished'; scores: Record<string, number> } | { type: 'game:question'; question: { it: string; en: string }; roundIndex: number; totalRounds: number; hostPlayerId: string } | { type: 'game:reveal'; votes: Record<string, 'down' | 'up'>; scores: Record<string, number> } | { type: 'game:vote-ack'; votedCount: number; totalCount: number } | { type: 'player:joined'; player: WsPlayer } | { type: 'player:left'; playerId: string } | { type: 'players:sync'; players: WsPlayer[] };
