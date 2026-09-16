<template>
  <div class="matrix-caro-board-container" ref="containerRef">
    <!-- Board Outer Frame (Matrix Bevel Style) -->
    <div class="matrix-board-frame">
      <!-- Coordinate Headers (A - O) -->
      <div class="matrix-col-headers">
        <div class="corner-cell"></div>
        <div
          v-for="(colLabel, c) in colLetters"
          :key="'col_head_' + c"
          class="col-header-item"
          :class="{ 'highlight': hoveredCell?.col === c }"
        >
          {{ colLabel }}
        </div>
      </div>

      <!-- Main Board Grid with Row Headers (1 - 15) -->
      <div class="matrix-board-body">
        <div class="matrix-row-headers">
          <div
            v-for="r in boardSize"
            :key="'row_head_' + r"
            class="row-header-item"
            :class="{ 'highlight': hoveredCell?.row === r - 1 }"
          >
            {{ r }}
          </div>
        </div>

        <!-- Grid of Square Cells (Matrix Style: đánh vào trong ô) -->
        <div
          class="matrix-cells-grid"
          :style="{
            '--board-size': boardSize
          }"
        >
          <!-- SVG Strike-Through Line for 5 Winning Stones (Lớp tia laser thanh mảnh nằm sau chữ) -->
          <svg
            v-if="winningLineCoords"
            class="winning-strike-svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <!-- Glowing Laser Aura (Thanh mảnh, không che quân cờ) -->
            <line
              :x1="winningLineCoords.x1"
              :y1="winningLineCoords.y1"
              :x2="winningLineCoords.x2"
              :y2="winningLineCoords.y2"
              class="strike-line-glow"
            />
            <!-- Sharp Central Laser Strike -->
            <line
              :x1="winningLineCoords.x1"
              :y1="winningLineCoords.y1"
              :x2="winningLineCoords.x2"
              :y2="winningLineCoords.y2"
              class="strike-line-main"
            />
          </svg>

          <!-- 15x15 Cells -->
          <template v-for="r in boardSize" :key="'grid_row_' + r">
            <div
              v-for="c in boardSize"
              :key="'cell_' + (r - 1) + '_' + (c - 1)"
              class="matrix-cell"
              :class="{
                'occupied': board[r - 1]?.[c - 1] !== null,
                'is-winning': isWinningCell(r - 1, c - 1),
                'is-last-move': isLastMove(r - 1, c - 1),
                'interactive': canInteract && board[r - 1]?.[c - 1] === null,
                'hover-x': canInteract && currentTurn === 'X' && hoveredCell?.row === r - 1 && hoveredCell?.col === c - 1,
                'hover-o': canInteract && currentTurn === 'O' && hoveredCell?.row === r - 1 && hoveredCell?.col === c - 1
              }"
              @mouseenter="onCellHover(r - 1, c - 1)"
              @mouseleave="onCellLeave"
              @click="onCellClick(r - 1, c - 1)"
            >
              <!-- Placed Symbol: X ĐỎ / O XANH (Hiển thị nổi bật, rõ ràng) -->
              <div
                v-if="board[r - 1]?.[c - 1]"
                class="matrix-symbol-wrapper"
                :class="board[r - 1][c - 1] === 'X' ? 'symbol-x' : 'symbol-o'"
              >
                <span class="symbol-text">{{ board[r - 1][c - 1] }}</span>
              </div>

              <!-- Ghost Preview on Hover -->
              <div
                v-else-if="canInteract && hoveredCell?.row === r - 1 && hoveredCell?.col === c - 1"
                class="matrix-ghost-symbol"
                :class="currentTurn === 'X' ? 'ghost-x' : 'ghost-o'"
              >
                {{ currentTurn }}
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CaroSymbol } from '~/types/caro'

const props = withDefaults(
  defineProps<{
    board: (CaroSymbol | null)[][]
    boardSize?: number
    currentTurn?: CaroSymbol
    canInteract?: boolean
    lastMove?: { row: number; col: number; symbol?: CaroSymbol } | null
    winningLine?: { row: number; col: number }[]
  }>(),
  {
    boardSize: 15,
    currentTurn: 'X',
    canInteract: false,
    lastMove: null,
    winningLine: () => []
  }
)

const emit = defineEmits<{
  (e: 'place', coord: { row: number; col: number }): void
}>()

const hoveredCell = ref<{ row: number; col: number } | null>(null)
const containerRef = ref<HTMLElement | null>(null)

const colLetters = computed(() => {
  const letters = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'
  return Array.from({ length: props.boardSize }, (_, i) => letters[i])
})

function isWinningCell(r: number, c: number): boolean {
  if (!props.winningLine || props.winningLine.length === 0) return false
  return props.winningLine.some((pos) => pos.row === r && pos.col === c)
}

function isLastMove(r: number, c: number): boolean {
  if (!props.lastMove) return false
  return props.lastMove.row === r && props.lastMove.col === c
}

function onCellHover(row: number, col: number) {
  if (!props.canInteract) return
  if (props.board[row]?.[col] !== null) {
    hoveredCell.value = null
    return
  }
  hoveredCell.value = { row, col }
}

function onCellLeave() {
  hoveredCell.value = null
}

function onCellClick(row: number, col: number) {
  if (!props.canInteract) return
  if (props.board[row]?.[col] !== null) return
  emit('place', { row, col })
  hoveredCell.value = null
}

// Tính tọa độ phần trăm (0-100) cho vạch kẻ laser qua 5 quân cờ
const winningLineCoords = computed(() => {
  if (!props.winningLine || props.winningLine.length < 2) return null
  const size = props.boardSize
  const start = props.winningLine[0]
  const end = props.winningLine[props.winningLine.length - 1]

  const cellSize = 100 / size
  const x1 = (start.col + 0.5) * cellSize
  const y1 = (start.row + 0.5) * cellSize
  const x2 = (end.col + 0.5) * cellSize
  const y2 = (end.row + 0.5) * cellSize

  // Kéo dài nhẹ 2 đầu thêm 25% chiều rộng ô để vạch kẻ liền mạch
  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.hypot(dx, dy)
  if (dist === 0) return null

  const extend = cellSize * 0.25
  const extX1 = x1 - (dx / dist) * extend
  const extY1 = y1 - (dy / dist) * extend
  const extX2 = x2 + (dx / dist) * extend
  const extY2 = y2 + (dy / dist) * extend

  return {
    x1: extX1,
    y1: extY1,
    x2: extX2,
    y2: extY2
  }
})
</script>

<style scoped>
.matrix-caro-board-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  user-select: none;
  touch-action: manipulation;
  padding: 6px;
}

/* Matrix Bevel Board Outer Frame */
.matrix-board-frame {
  background: #0f172a;
  border: 1.5px solid rgba(148, 163, 184, 0.25);
  border-radius: var(--radius-md);
  padding: 8px;
  box-shadow: 
    0 16px 40px rgba(0, 0, 0, 0.6),
    0 0 20px rgba(56, 189, 248, 0.08);
  display: inline-flex;
  flex-direction: column;
  max-width: 100%;
}

/* Coordinate Headers (A - O) */
.matrix-col-headers {
  display: flex;
  width: 100%;
  margin-bottom: 3px;
}

.corner-cell {
  width: 20px;
  flex-shrink: 0;
}

.col-header-item {
  flex: 1;
  text-align: center;
  font-family: 'Fira Code', monospace;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-faint);
  transition: color 0.15s;
}

.col-header-item.highlight {
  color: var(--matchbox-cyan);
}

.matrix-board-body {
  display: flex;
}

/* Row Headers (1 - 15) */
.matrix-row-headers {
  display: flex;
  flex-direction: column;
  width: 20px;
  flex-shrink: 0;
}

.row-header-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Fira Code', monospace;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-faint);
  transition: color 0.15s;
}

.row-header-item.highlight {
  color: var(--matchbox-cyan);
}

/* Main Cells Grid (Đường kẻ thanh mảnh nhẹ nhàng chuẩn Matrix) */
.matrix-cells-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--board-size), 1fr);
  gap: 1px;
  background: #cbd5e1; /* Đường kẻ thanh mảnh tinh tế, không còn vệt đen đậm */
  border: 1.5px solid #94a3b8;
  border-radius: var(--radius-sm);
  padding: 1px;
  width: min(86vw, 550px);
  height: min(86vw, 550px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}

/* Individual Cell (Ô vuông sáng bóng chuẩn Matrix) */
.matrix-cell {
  position: relative;
  background: #ffffff;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1 / 1;
  cursor: default;
  transition: background-color 0.12s ease, transform 0.1s ease;
  z-index: 2;
}

.matrix-cell.interactive {
  cursor: pointer;
}

.matrix-cell.interactive:active {
  transform: scale(0.94);
}

.matrix-cell.interactive:hover {
  background: #f8fafc;
}

/* Hover Ghost Indicators */
.matrix-cell.hover-x {
  background: #fee2e2 !important;
  box-shadow: inset 0 0 0 1.5px #fca5a5;
}

.matrix-cell.hover-o {
  background: #e0f2fe !important;
  box-shadow: inset 0 0 0 1.5px #7dd3fc;
}

.matrix-ghost-symbol {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(0.9rem, 2.8vw, 1.5rem);
  font-weight: 900;
  opacity: 0.45;
  line-height: 1;
}

.matrix-ghost-symbol.ghost-x {
  color: #dc2626;
}

.matrix-ghost-symbol.ghost-o {
  color: #0284c7;
}

/* Placed Symbols (X ĐỎ - O XANH) */
.matrix-symbol-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  /* Hiệu ứng đàn hồi nảy nhẹ cực mượt như Matrix */
  animation: matrixDropBounce 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  z-index: 3;
}

@keyframes matrixDropBounce {
  0% { transform: scale(0.25); opacity: 0; }
  60% { transform: scale(1.2); opacity: 1; }
  80% { transform: scale(0.93); }
  100% { transform: scale(1); opacity: 1; }
}

.symbol-text {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 900;
  font-size: clamp(1.05rem, 3.2vw, 1.75rem);
  line-height: 1;
}

/* X ĐỎ (Crimson Red rõ nét) */
.symbol-x .symbol-text {
  color: #dc2626;
  text-shadow: 0 1px 2px rgba(220, 38, 38, 0.25);
}

/* O XANH (Royal Blue rõ nét) */
.symbol-o .symbol-text {
  color: #0284c7;
  text-shadow: 0 1px 2px rgba(2, 132, 199, 0.25);
}

/* Last Move: Viền vàng thanh lịch quanh ô, TUYỆT ĐỐI KHÔNG CÓ CHẤM TRÒN */
.matrix-cell.is-last-move {
  background: #fffbeb !important;
  box-shadow: inset 0 0 0 2px #f59e0b !important;
}

/* Winning 5-in-a-row Cells: Sáng vàng hoàng kim */
.matrix-cell.is-winning {
  background: linear-gradient(135deg, #fef08a 0%, #fde047 100%) !important;
  box-shadow: inset 0 0 0 2px #eab308 !important;
  animation: winCellPulse 1.2s infinite alternate ease-in-out;
}

@keyframes winCellPulse {
  0% { transform: scale(1); }
  100% { transform: scale(1.04); }
}

.matrix-cell.is-winning .symbol-text {
  color: #78350f !important;
}

/* SVG Laser Strike Line: Nét kẻ thanh mảnh (chỉ 0.6 đơn vị), KHÔNG che quân cờ */
.winning-strike-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
}

.strike-line-glow {
  stroke: #f59e0b;
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-dasharray: 120;
  stroke-dashoffset: 120;
  opacity: 0.65;
  filter: drop-shadow(0 0 2px #f59e0b);
  animation: strikeDraw 0.35s ease-out forwards;
}

.strike-line-main {
  stroke: #ffffff;
  stroke-width: 0.6;
  stroke-linecap: round;
  stroke-dasharray: 120;
  stroke-dashoffset: 120;
  filter: drop-shadow(0 0 1px #ffffff);
  animation: strikeDraw 0.35s ease-out forwards;
}

@keyframes strikeDraw {
  0% { stroke-dashoffset: 120; }
  100% { stroke-dashoffset: 0; }
}

@media (max-width: 600px) {
  .matrix-board-frame {
    padding: 4px;
  }
  .corner-cell,
  .matrix-row-headers {
    width: 15px;
  }
  .col-header-item,
  .row-header-item {
    font-size: 0.55rem;
  }
}
</style>
