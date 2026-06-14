import { defineStore } from 'pinia';

interface PlayerState {
    playerId: string | null;
    playerColor: PlayerColor | null;
    playerNickname: string | null;
    tableSessionId: string | null;
    tableNumber: number | null;
    venueName: string | null;
    venueSlug: string | null;
    venueKind: 'adhoc' | 'venue' | null;
    qrToken: string | null;
    groupId: string | null;
    expiresAt: string | null;
    isHost: boolean;
}

export const usePlayerStore = defineStore( 'player', {
    state: (): PlayerState => ( {
        expiresAt: null,
        isHost: false,
        groupId: null,
        playerId: null,
        playerColor: null,
        playerNickname: null,
        qrToken: null,
        tableNumber: null,
        tableSessionId: null,
        venueName: null,
        venueSlug: null,
        venueKind: null,
    } ),

    getters: {
        isJoined: state => !! state.playerId && !! state.tableSessionId,
        isExpired: state => {

            if( ! state.expiresAt ) return true;
            return new Date( state.expiresAt ) < new Date();

        },
    },

    actions: {
        join( data: JoinResponse ) {

            this.playerId = data.playerId;
            this.playerColor = data.playerColor;
            this.playerNickname = data.playerNickname;
            this.tableSessionId = data.tableSessionId;
            this.tableNumber = data.tableNumber;
            this.venueName = data.venueName;
            this.venueSlug = data.venueSlug;
            this.venueKind = data.venueKind;
            this.qrToken = data.qrToken;
            this.groupId = data.groupId;
            this.expiresAt = data.expiresAt;
            this.isHost = data.isHost;

        },
        leave() {

            this.$reset();

        },
    },

    persist: true,
} );
