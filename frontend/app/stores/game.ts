import { defineStore } from 'pinia'
import type { PublicRoom, RoomState, ChatMessage } from '~/types'

export const useGameStore = defineStore('game', {
  state: () => ({
    publicRooms: [] as PublicRoom[],
    
    myPlayerIndex: -1,
    myPlayerId: null as string | null,
    currentRoomCode: '',
    hasJoinedRoom: false,
    
    localRoomState: null as RoomState | null,
    timeLeft: 0,
    turnEndsAt: null as number | null,
    chatMessages: [] as ChatMessage[],
    
    isSpectating: false,
    spectateFocusedPlayerId: null as string | null,
    isRestoring: true,
    currentTurn: -1,
    showVictoryModal: false,
    frozenResults: null as RoomState['players'] | null,
  }),
  actions: {
    resetState() {
      this.myPlayerIndex = -1;
      this.myPlayerId = null;
      this.currentRoomCode = '';
      this.hasJoinedRoom = false;
      this.localRoomState = null;
      this.timeLeft = 0;
      this.turnEndsAt = null;
      this.chatMessages = [];
      this.isSpectating = false;
      this.spectateFocusedPlayerId = null;
      this.currentTurn = -1;
      this.showVictoryModal = false;
      this.frozenResults = null;
    }
  }
})
