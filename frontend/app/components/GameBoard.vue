<template>
  <div id="pixi-board-container" ref="containerRef" class="pixi-board-container"/>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useGameStore } from '~/stores/game'
import { usePixiBoard } from '~/composables/usePixiBoard'

const store = useGameStore()
const containerRef = ref<HTMLDivElement | null>(null)
const { initBoard, destroyBoard, renderBoard }
  = usePixiBoard(containerRef)

onMounted(() => initBoard())
onBeforeUnmount(() => destroyBoard())

watch(
  () => store.localRoomState?.stateVersion,
  renderBoard,
)
watch(
  () => store.spectateFocusedPlayerId,
  renderBoard,
)
</script>

<style scoped>

.pixi-board-container {
  width: 100%;
  max-width: 467px;
  aspect-ratio: 1 / 1;
  position: relative;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.pixi-board-container canvas {
  display: block;
  height: 100% !important;
  width: 100% !important;
}

@media (max-width: 1180px) {

  .pixi-board-container {
    width: 100%;
    max-width: 467px;
    height: auto;
    aspect-ratio: 1 / 1;
  }
}
</style>
