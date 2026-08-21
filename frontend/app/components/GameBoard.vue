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

let cellSizeObserver: ResizeObserver | null = null

onMounted(() => {
  initBoard()

  // The next-piece panel renders its cells as plain DOM boxes rather than
  // canvas, so it needs its own size — but the board's on-screen cell size
  // isn't fixed: the canvas stretches via CSS to whatever width its
  // container ends up at (467px down to whatever fits on a phone). Publish
  // the board's actual rendered cell size as a CSS var so any DOM element
  // (like the piece panel) can match it exactly at any viewport width,
  // instead of guessing a fixed px value per breakpoint.
  cellSizeObserver = new ResizeObserver((entries) => {
    const width = entries[0]?.contentRect.width
    if (width) {
      document.documentElement.style.setProperty('--board-cell-size', `${width / 9}px`)
    }
  })
  if (containerRef.value) cellSizeObserver.observe(containerRef.value)
})

onBeforeUnmount(() => {
  destroyBoard()
  cellSizeObserver?.disconnect()
  cellSizeObserver = null
})

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

@media (max-width: 1180px) {

  .pixi-board-container {
    width: 100%;
    max-width: 467px;
    height: auto;
    aspect-ratio: 1 / 1;
  }
}
</style>
