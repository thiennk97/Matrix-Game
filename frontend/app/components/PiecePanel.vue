<template>
  <div class="piece-panel">
    <div class="current-piece-vertical">
      <template v-if="currentPiece && currentPiece.length && !hasPlaced">
        <div 
          v-for="(val, idx) in currentPiece" 
          :key="idx"
          class="piece-box"
          :class="'num-' + val"
          :style="{ background: playerColorStr }"
        >
          {{ val }}
        </div>
      </template>
      <template v-else-if="hasPlaced" />
      <div v-else class="piece-box piece-box-empty" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '~/stores/game'
import { getPlayerColor } from '~/config/constants'
import type { Player } from '~/types'

const store = useGameStore()

const currentPiece = computed(() => {
  if (!store.localRoomState) return null
  return store.localRoomState.currentPiece || null
})

const myPlayer = computed(() => {
  if (!store.localRoomState?.players) return null
  if (store.isSpectating) {
    const focusId = store.spectateFocusedPlayerId
    if (focusId) {
      return store.localRoomState.players.find(
        (p: Player) => p.id === focusId,
      ) || store.localRoomState.players[0] || null
    }
    return store.localRoomState.players[0] || null
  }
  return store.localRoomState.players.find(
    (p: Player) => p.id === store.myPlayerId,
  ) || null
})

const hasPlaced = computed(() => !!myPlayer.value?.hasPlacedThisRound)

const playerColorStr = computed(() => {
  const idx = store.isSpectating
    ? (myPlayer.value?.seatIndex ?? 0)
    : store.myPlayerIndex
  return getPlayerColor(idx)
})
</script>

<style scoped>

.piece-panel {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  width: 50px;
  min-width: 50px;
  flex-shrink: 0;
}

.current-piece-vertical {
  display: flex;
  flex-direction: column;
  gap: 0;
  justify-content: center;
  align-items: center;
}

.piece-box {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.8rem;
  font-weight: 600;
  color: #1a1a1a;
}

@media (max-width: 1180px) {

  .piece-panel {
    align-self: stretch;
    flex: 0 0 50px;
    flex-direction: column;
    justify-content: flex-start;
    max-width: 50px;
    min-width: 50px;
    width: 50px;
  }
}

@media (max-width: 480px) {

  .piece-box {
    height: 44px;
    width: 44px;
  }

  .piece-panel {
    flex-basis: 44px;
    max-width: 44px;
    min-width: 44px;
    width: 44px;
  }
}
</style>
