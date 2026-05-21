import type { JoinResponse } from '../../shared/types';

import { defineStore } from 'pinia';

interface PlayerState {
    playerId: string | null;
    playerColor: string | null;
    playerNickname: string | null;
    tableSessionId: string | null;
    tableNumber: number | null;
    venueName: string | null;
    venueSlug: string | null;
    groupId: string | null;
    expiresAt: string | null;
}

export const usePlayerStore = defineStore( 'player', {
    state: (): PlayerState => ( {
        expiresAt: null,
        groupId: null,
        playerId: null,
        playerColor: null,
        playerNickname: null,
        tableNumber: null,
        tableSessionId: null,
        venueName: null,
        venueSlug: null,
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
            this.groupId = data.groupId;
            this.expiresAt = data.expiresAt;

        },
        leave() {

            this.$reset();

        },
    },

    persist: true,
} );
