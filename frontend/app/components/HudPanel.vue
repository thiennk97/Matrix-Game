<template>
  <div class="board-timer-bar">
    <span class="timer-value">{{ store.timeLeft.toFixed(1) }}s</span>
    <div class="timer-bar-container">
      <div 
        class="timer-bar-fill" 
        :class="{ 'warning': store.timeLeft < 3 }"
        :style="{ width: timerWidth + '%' }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '~/stores/game'

const store = useGameStore()

const maxTime = computed(() => {
  return store.localRoomState?.turnTimeLimit 
    ? store.localRoomState.turnTimeLimit
    : 8
})

const timerWidth = computed(() => {
  return Math.max(0, Math.min(100, (store.timeLeft / maxTime.value) * 100))
})
</script>

<style scoped>

.board-timer-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
}

.timer-value {
  color: var(--matchbox-orange);
  font-size: 1.2rem;
  font-weight: 900;
  text-align: center;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.timer-bar-container {
  position: relative;
  flex: 1;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
}

.timer-bar-fill {
  height: 6px;
  width: 100%;
  background: linear-gradient(90deg, var(--matchbox-orange), var(--matchbox-gold));
  transition: width 0.1s linear, background-color 0.3s ease;
}

.timer-bar-fill.warning {
  background: var(--matchbox-red) !important;
  box-shadow: 0 0 10px var(--matchbox-red);
}

@media (max-width: 480px) {

  .board-timer-bar {
    gap: var(--space-2);
  }

  .timer-value {
    font-size: 1rem;
  }
}
</style>
