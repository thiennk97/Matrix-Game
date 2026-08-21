<template>
  <div class="board-timer-bar">
    <span class="timer-value">{{ displayTime.toFixed(1) }}s</span>
    <div class="timer-bar-container">
      <div 
        class="timer-bar-fill" 
        :class="{ 'warning': displayTime < 3 }"
        :style="{ transform: `scaleX(${progressRatio})` }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useGameStore } from '~/stores/game'
import { isPlayingStatus } from '~/utils/roomStatus'

const store = useGameStore()
const displayTime = ref(store.timeLeft)

const maxTime = computed(() => {
  return store.localRoomState?.turnTimeLimit 
    ? store.localRoomState.turnTimeLimit 
    : 8
})

const progressRatio = computed(() => {
  return Math.max(0, Math.min(1, displayTime.value / maxTime.value))
})

let rafId: number | null = null
let baseTimeLeft = store.timeLeft
let baseTimestamp = typeof performance !== 'undefined' ? performance.now() : Date.now()

const syncBaseTimer = (time: number) => {
  baseTimeLeft = time
  baseTimestamp = typeof performance !== 'undefined' ? performance.now() : Date.now()
}

const updateTimer = () => {
  if (store.localRoomState && isPlayingStatus(store.localRoomState.status)) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const elapsedSec = (now - baseTimestamp) / 1000
    displayTime.value = Math.max(0, baseTimeLeft - elapsedSec)
  } else {
    displayTime.value = store.timeLeft
  }
  rafId = requestAnimationFrame(updateTimer)
}

onMounted(() => {
  syncBaseTimer(store.timeLeft)
  rafId = requestAnimationFrame(updateTimer)
})

onBeforeUnmount(() => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
})

watch(() => store.timeLeft, (newVal) => {
  syncBaseTimer(newVal)
  if (!isPlayingStatus(store.localRoomState?.status)) {
    displayTime.value = newVal
  }
})

watch(() => store.localRoomState?.turn, () => {
  syncBaseTimer(store.timeLeft)
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
  min-width: 48px;
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
  transform-origin: left center;
  will-change: transform;
  background: linear-gradient(90deg, var(--matchbox-orange), var(--matchbox-gold));
  transition: background-color 0.3s ease;
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
    min-width: 40px;
  }
}
</style>
