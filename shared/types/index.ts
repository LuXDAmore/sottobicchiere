import type { PlayerColor } from '../utils/colors';

export interface PlayerInfo {
    id: string;
    nickname: string;
    color: PlayerColor;
    groupId: string | null;
    joinedAt: string;
}

export interface TableInfo {
    tableSessionId: string;
    tableNumber: number;
    venueName: string;
    venueSlug: string;
}

export interface JoinResponse extends TableInfo {
    playerId: string;
    playerColor: PlayerColor;
    playerNickname: string;
    groupId: string | null;
    expiresAt: string;
    qrToken: string;
    isHost: boolean;
}

export interface TableSessionMeta {
    id: string;
    status: 'active' | 'expired';
    hostPlayerId: string | null;
    hostNickname: string | null;
    expiresAt: string;
    remainingSeconds: number;
}

export interface ActiveSessionSummary {
    sessionId: string;
    playerCount: number;
    hasActiveGame: boolean;
    selectedGame: string | null;
    hostNickname: string | null;
    startedAt: string;
}

export interface SessionsResponse {
    sessions: ActiveSessionSummary[];
}
