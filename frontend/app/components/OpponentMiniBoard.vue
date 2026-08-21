<template>
  <canvas ref="canvasRef" class="mini-board-canvas" width="145" height="145" />
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { PLAYER_COLORS } from '~/config/constants'
import type { Player, RoomStatus } from '~/types'

const props = defineProps<{
  player: Player
  turn: number
  status?: RoomStatus
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

// Snapshot of board and matchedLines: only updated when turn advances or status changes
let snapshotBoard: (number | null)[][] | null = null
let snapshotMatchedLines: any[] = []

const updateSnapshotAndDraw = () => {
  if (props.player?.board) {
    snapshotBoard = props.player.board.map((row) => [...row])
  } else {
    snapshotBoard = null
  }
  snapshotMatchedLines = props.player?.matchedLines ? [...props.player.matchedLines] : []
  drawBoard()
}

const drawBoard = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  if (canvas.width !== 145 * dpr || canvas.height !== 145 * dpr) {
    canvas.width = 145 * dpr
    canvas.height = 145 * dpr
  }
  ctx.resetTransform?.()
  ctx.scale(dpr, dpr)

  // Black background for grid gaps and border
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, 145, 145)

  const playerColor = PLAYER_COLORS[props.player.seatIndex] || '#fff'
  const board = snapshotBoard || props.player.board

  ctx.font = "800 8px 'Plus Jakarta Sans', sans-serif"
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const x = 1 + c * 16
      const y = 1 + r * 16
      const cell = board?.[r]?.[c]

      if (cell !== null && cell !== undefined) {
        ctx.fillStyle = playerColor
        ctx.fillRect(x, y, 15, 15)
        ctx.fillStyle = '#000000'
        ctx.fillText(String(cell), x + 7.5, y + 7.5)
      } else {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(x, y, 15, 15)
      }
    }
  }

  // Draw matched lines from snapshot
  const lines = snapshotMatchedLines
  if (lines && lines.length > 0) {
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1.5
    ctx.lineCap = 'round'

    for (const line of lines) {
      const dc = Math.sign(line.end.c - line.start.c)
      const dr = Math.sign(line.end.r - line.start.r)
      const half = 7.5
      const startX = 1 + line.start.c * 16 + half
      const startY = 1 + line.start.r * 16 + half
      const endX = 1 + line.end.c * 16 + half
      const endY = 1 + line.end.r * 16 + half

      const x1 = startX - dc * half
      const y1 = startY - dr * half
      const x2 = endX + dc * half
      const y2 = endY + dr * half

      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }
  }
}

onMounted(() => {
  nextTick(() => updateSnapshotAndDraw())
})

// Watch explicit primitive values so watch never fires during mid-round score/state updates
watch(
  [() => props.turn, () => props.status, () => props.player.id],
  () => nextTick(() => updateSnapshotAndDraw()),
)
</script>

<style scoped>
.mini-board-canvas {
  width: 145px;
  height: 145px;
  max-width: 100%;
  aspect-ratio: 1 / 1;
  display: block;
  border-radius: 2px;
  border: 1px solid #000;
  margin: 0 auto;
}

@media (max-width: 480px) {
  .mini-board-canvas {
    width: 100%;
    max-width: 145px;
    height: auto;
  }
}
</style>
