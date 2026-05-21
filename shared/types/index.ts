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
}
