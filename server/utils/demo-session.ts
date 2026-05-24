export const DEMO_TABLE_SESSION_ID = '00000000-0000-4000-8000-000000000001';

// In-memory state for the demo session — persists across reconnects within the
// same server process lifetime (sufficient for a stateless demo).
interface DemoPersistedState {
    selectedGame: string | null;
    gameMode: string | null;
    lockedAt: string | null;
    hostPlayerId: string | null;
    sessionMode: 'board' | 'dating' | 'preserata';
}

const _demoState: DemoPersistedState = {
    selectedGame: null,
    gameMode: null,
    lockedAt: null,
    hostPlayerId: null,
    sessionMode: 'board',
};

export function getDemoPersistedState(): Readonly<DemoPersistedState> {
    return _demoState;
}

export function setDemoGameSelected( selectedGame: string, gameMode: string | null, hostPlayerId: string, lockedAt: string ): void {
    _demoState.selectedGame = selectedGame;
    _demoState.gameMode = gameMode;
    _demoState.hostPlayerId = hostPlayerId;
    _demoState.lockedAt = lockedAt;
}

export function setDemoSessionMode( mode: 'board' | 'dating' | 'preserata' ): void {
    _demoState.sessionMode = mode;
}
