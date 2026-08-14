<template>
  <div 
    class="match-item" 
    :class="{ 'active': player.id === store.myPlayerId, 'leader': rank === 0 }"
  >
    <div class="match-item-left">
      <span class="rank-num">
        <LucideCrown v-if="rank === 0" class="icon rank-crown" />
        <span v-else>#{{ rank + 1 }}</span>
      </span>
      <span class="rank-name-text" :style="{ color: playerColor }">{{ player.name }}</span>
    </div>
    <div class="match-score">
      <span class="match-score-value">{{ player.score }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LucideCrown } from '@lucide/vue'
import { useGameStore } from '~/stores/game'
import { getPlayerColor } from '~/config/constants'
import type { Player } from '~/types'

const props = defineProps<{
  player: Player
  rank: number
}>()

const store = useGameStore()
const playerColor = computed(() => getPlayerColor(props.player.seatIndex))
</script>

<style scoped>

.match-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  border-left: 3px solid transparent;
  border-radius: var(--radius-sm);
  padding: 0.55rem 0.8rem;
  font-size: 0.95rem;
  min-height: 48px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
}

.match-item.active {
  border-color: var(--border-strong);
  border-left-color: var(--matchbox-orange);
  background: rgba(249, 115, 22, 0.1);
  box-shadow: 0 0 14px rgba(249, 115, 22, 0.12);
  color: #fff;
}

.match-score-value {
  font-size: 1.08rem;
  font-weight: 800;
}

.match-item-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.rank-name-text {
  font-weight: 700;
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-num {
  font-family: 'Fira Code', monospace;
  align-items: center;
  display: inline-flex;
  font-size: 1rem;
  gap: 5px;
  min-width: 32px;
  color: var(--text-faint);
  flex-shrink: 0;
}

.match-item.active .rank-num {
  color: var(--matchbox-orange);
}

.match-item.leader {
  background: linear-gradient(100deg, rgba(252, 211, 77, 0.16), rgba(249, 115, 22, 0.06));
  border-color: rgba(252, 211, 77, 0.6);
  box-shadow: 0 0 18px rgba(252, 211, 77, 0.1);
}

.match-item.leader .rank-num {
  color: var(--matchbox-gold) !important;
}

.rank-crown {
  color: var(--matchbox-gold);
  filter: drop-shadow(0 0 5px rgba(252, 211, 77, 0.7));
  height: 1.15em;
  width: 1.15em;
  animation: leaderCrownGlow 1.8s ease-in-out infinite;
}

@keyframes leaderCrownGlow {
  0%,
  100% {
    opacity: 0.75;
    transform: translateY(0) scale(1);
  }
  50% {
    opacity: 1;
    transform: translateY(-2px) scale(1.12);
  }
}
</style>
