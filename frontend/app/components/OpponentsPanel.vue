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
        <div class="mini-grid-9x9">
          <template v-for="(row, r) in p.board" :key="`r-${r}`">
            <div 
              v-for="(cell, c) in row" 
              :key="`c-${r}-${c}`"
              class="mini-cell"
              :style="{ background: cell ? PLAYER_COLORS[p.seatIndex] : '#fff' }"
            >{{ cell !== null && cell !== undefined ? cell : '' }}</div>
          </template>
          <svg class="ob-svg-layer" width="100%" height="100%">
            <line 
              v-for="line in p.matchedLines" 
              :key="line.lineId"
              v-bind="getLineCoords(line)" 
              stroke="#000" 
              stroke-width="1.5" 
            />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '~/stores/game'
import { LucideEye } from '@lucide/vue'
import type { Player } from '~/types'
import { PLAYER_COLORS } from '~/config/constants'

const store = useGameStore()

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

const getLineCoords = (line: any) => {
  const dc = Math.sign(line.end.c - line.start.c)
  const dr = Math.sign(line.end.r - line.start.r)
  const half = 7.5
  const startX = 1 + line.start.c * 16 + half
  const startY = 1 + line.start.r * 16 + half
  const endX = 1 + line.end.c * 16 + half
  const endY = 1 + line.end.r * 16 + half
  return {
    x1: startX - dc * half,
    y1: startY - dr * half,
    x2: endX + dc * half,
    y2: endY + dr * half
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

.mini-grid-9x9 {
  display: grid;
  grid-template-columns: repeat(9, 15px);
  grid-template-rows: repeat(9, 15px);
  gap: 1px;
  background: #000;
  padding: 1px;
  border-radius: 2px;
  border: 1px solid #000;
  position: relative;
}

.ob-svg-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.mini-cell {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.5rem;
  font-weight: 800;
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: #000;
}

@media (max-width: 1180px) {

  .opponents-boards-container {
    justify-content: center;
  }
}
</style>
