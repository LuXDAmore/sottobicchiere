import type { DatingInboxMessage } from '../../shared/types/ws';

const bannedWords = [ 'idiota', 'stupido', 'stronzo' ];
const maxMessageLength = 240;
const sendCooldownMs = 2_500;
const perSessionWindowMs = 12_000;
const perSessionMax = 6;
const perRoomWindowMs = 10_000;
const perRoomMax = 12;

const availableTables = new Set<string>();
const roomPairs = new Map<string, Set<string>>();
const playerSendTimes = new Map<string, number[]>();
const roomSendTimes = new Map<string, number[]>();
const playerCooldown = new Map<string, number>();

function pairKey( left: string, right: string ): string {
    return [ left, right ].sort().join( '::' );
}

function prune( times: number[], windowMs: number, now: number ): number[] {
    return times.filter( t => now - t <= windowMs );
}

export function setTableAvailability( tableSessionId: string, available: boolean ): void {
    if( available ) availableTables.add( tableSessionId );
    else availableTables.delete( tableSessionId );
}

export function getRoomStatus( selfTableSessionId: string ): { available: string[]; unavailable: string[] } {
    const available = [ ... availableTables ].filter( id => id !== selfTableSessionId );
    const paired = roomPairs.get( selfTableSessionId ) ?? new Set<string>();
    const unavailable = [ ... paired ].filter( id => id !== selfTableSessionId );

    return { available, unavailable };
}

export function isTableAvailable( tableSessionId: string ): boolean {
    return availableTables.has( tableSessionId );
}

export function validateDatingMessage( body: string, now: number, playerSessionId: string, sourceTableSessionId: string, targetTableSessionId: string ): string | null {
    const text = body.trim().toLowerCase();

    if( ! text ) return 'Messaggio vuoto';
    if( text.length > maxMessageLength ) return `Messaggio troppo lungo (max ${ maxMessageLength })`;
    if( bannedWords.some( word => text.includes( word ) ) ) return 'Messaggio bloccato dalla moderazione';

    const nextAllowedAt = playerCooldown.get( playerSessionId ) ?? 0;

    if( now < nextAllowedAt ) return 'Attendi prima di inviare un altro messaggio';

    const sessionTimes = prune( playerSendTimes.get( playerSessionId ) ?? [], perSessionWindowMs, now );

    if( sessionTimes.length >= perSessionMax ) return 'Rate limit sessione raggiunto';

    const roomKey = pairKey( sourceTableSessionId, targetTableSessionId )
        , roomTimes = prune( roomSendTimes.get( roomKey ) ?? [], perRoomWindowMs, now );

    if( roomTimes.length >= perRoomMax ) return 'Rate limit tavolo raggiunto';

    sessionTimes.push( now );
    roomTimes.push( now );
    playerSendTimes.set( playerSessionId, sessionTimes );
    roomSendTimes.set( roomKey, roomTimes );
    playerCooldown.set( playerSessionId, now + sendCooldownMs );

    return null;
}

export function mapDatingRoom( leftTableSessionId: string, rightTableSessionId: string ): void {
    const left = roomPairs.get( leftTableSessionId ) ?? new Set<string>();
    const right = roomPairs.get( rightTableSessionId ) ?? new Set<string>();

    left.add( rightTableSessionId );
    right.add( leftTableSessionId );

    roomPairs.set( leftTableSessionId, left );
    roomPairs.set( rightTableSessionId, right );
}

export function removeTableFromDatingRoom( tableSessionId: string ): void {
    availableTables.delete( tableSessionId );

    const pairedTables = roomPairs.get( tableSessionId ) ?? new Set<string>();

    for( const pairedTableSessionId of pairedTables ) {
        const pairs = roomPairs.get( pairedTableSessionId );
        if( !pairs ) continue;

        pairs.delete( tableSessionId );

        if( pairs.size === 0 ) roomPairs.delete( pairedTableSessionId );
        else roomPairs.set( pairedTableSessionId, pairs );
    }

    roomPairs.delete( tableSessionId );
}

export function createDatingInboxMessage( fromTableSessionId: string, toTableSessionId: string, body: string ): DatingInboxMessage {
    return {
        body: body.trim(),
        createdAt: new Date().toISOString(),
        fromTableSessionId,
        id: crypto.randomUUID(),
        toTableSessionId,
    };
}
