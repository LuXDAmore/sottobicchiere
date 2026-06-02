import type { PlayerColor } from '../utils/colors';

export interface PlayerInfo {
    id: string;
    nickname: string;
    color: PlayerColor;
    groupId: string | null;
    areaId: string | null;
    joinedAt: string;
}

// Aree di gioco (zone) dentro una sessione.
export interface AreaMember {
    id: string;
    nickname: string;
    color: string;
    groupId: string | null;
    areaId: string | null;
}

export interface AreaWithMembers {
    id: string;
    name: string;
    color: string;
    ordinal: number;
    members: AreaMember[];
}

export interface AreasResponse {
    areas: AreaWithMembers[];
    unassigned: AreaMember[];
}

export interface AreaCreatedResponse {
    id: string;
    name: string;
    color: string;
    ordinal: number;
}

// Squadra (group) di una sessione — usata per la classifica per squadra nei giochi.
export interface GroupInfo {
    id: string;
    name: string;
    color: string;
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
    hasActiveGame: boolean;
    selectedGame: string | null;
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

// Stanza dinamica creata al volo (venue ad-hoc + tavolo generato).
export interface RoomCreatedResponse {
    venueSlug: string;
    qrToken: string;
    shortCode: string;
    joinPath: string;
}

export interface ResolvedRoomResponse {
    venueSlug: string;
    qrToken: string;
}
