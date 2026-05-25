// Tipi messaggi WebSocket condivisi client ↔ server

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

// ── Client → Server ─────────────────────────────────────────────────────────

export type ClientMessage =
    { type: 'ping' } |
    { type: 'dating:enable' } |
    { type: 'dating:disable' } |
    { type: 'dating:message:send'; body: string; toTableSessionId: string } |
    { type: 'game:next' } |
    { type: 'game:start'; totalRounds?: number } |
    { type: 'game:vote'; vote: 'down' | 'up' } |
    { type: 'session:mode:set'; mode: SessionMode };

// ── Server → Client ─────────────────────────────────────────────────────────

export type ServerMessage =
    { type: 'ping' } |
    { type: 'dating:message:new'; message: DatingInboxMessage } |
    { type: 'dating:room:status'; availableTableSessionIds: string[]; unavailableTableSessionIds: string[] } |
    { type: 'dating:status'; enabled: boolean } |
    { type: 'error'; message: string } |
    { type: 'game:finished'; scores: Record<string, number> } |
    { type: 'game:question'; question: { it: string; en: string }; roundIndex: number; totalRounds: number; hostPlayerId: string } |
    { type: 'game:reveal'; votes: Record<string, 'down' | 'up'>; scores: Record<string, number> } |
    { type: 'game:vote-ack'; votedCount: number; totalCount: number } |
    { type: 'game:selected'; selectedGame: string; gameMode: string | null; hostPlayerId: string } |
    { type: 'game:locked'; lockedAt: string } |
    { type: 'player:joined'; player: WsPlayer } |
    { type: 'player:left'; playerId: string } |
    { type: 'players:sync'; players: WsPlayer[] } |
    { type: 'session:mode:sync'; mode: SessionMode };
