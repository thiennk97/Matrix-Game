<template>
  <div class="panel-section wide-section" v-if="opponents.length > 0">
    <div class="panel-title">
      <span><LucideEye class="icon" /> Bàn Đối Thủ</span>
    </div>
    <div class="opponents-boards-container">
      <div 
        v-for="p in opponents" 
        :key="p.id"
        class="opponent-board-card"
        :style="{
          borderColor: store.isSpectating && p.id === store.spectateFocusedPlayerId 
            ? 'var(--matchbox-orange)' 
            : 'var(--border)'
        }"
        @click="focusOpponent(p.id)"
      >
        <div class="ob-info">
          <div
            class="ob-name"
            :style="{ color: !p.connected ? 'var(--text-muted)' : 'var(--text-main)' }"
          >
            {{ p.name }} {{ !p.connected ? '(Ngắt kết nối)' : '' }}
          </div>
          <div class="ob-score">{{ p.score }}</div>
        </div>
        <OpponentMiniBoard 
          :player="p" 
          :turn="currentTurn"
          :status="store.localRoomState?.status"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '~/stores/game'
import { LucideEye } from '@lucide/vue'
import type { Player } from '~/types'
import OpponentMiniBoard from './OpponentMiniBoard.vue'

const store = useGameStore()

const currentTurn = computed(() => store.localRoomState?.turn ?? 0)

const opponents = computed(() => {
  if (!store.localRoomState?.players) return []
  return store.localRoomState.players.filter((p: Player) => 
    store.isSpectating ? true : p.id !== store.myPlayerId
  ).sort((a: Player, b: Player) => a.seatIndex - b.seatIndex)
})

const focusOpponent = (id: string) => {
  if (store.isSpectating) {
    store.spectateFocusedPlayerId = id
  }
}
</script>

<style scoped>

.opponents-boards-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: var(--space-3);
}

.opponent-board-card {
  background: var(--card-bg-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-2);
  width: 173px;
  cursor: pointer;
}

.ob-score {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--text-faint);
  flex-shrink: 0;
  white-space: nowrap;
}

.opponent-board-card .ob-info {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  min-width: 0;
}

.opponent-board-card .ob-name {
  flex: 1;
  min-width: 0;
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}

@media (max-width: 1180px) {

  .opponents-boards-container {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .opponents-boards-container {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2);
  }

  .opponent-board-card {
    width: 100%;
    padding: var(--space-2);
    align-items: center;
  }

  .opponent-board-card .ob-info {
    width: 100%;
  }

  .ob-name {
    font-size: 0.78rem;
  }

  .ob-score {
    font-size: 0.78rem;
  }
}
</style>
