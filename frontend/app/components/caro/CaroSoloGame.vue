<template>
  <div class="caro-solo-wrapper">
    <!-- Solo HUD Bar -->
    <div class="solo-top-hud">
      <!-- Player Panel (X ĐỎ) -->
      <div class="solo-player-card card-player" :class="{ 'active-turn': currentTurn === 'X' }">
        <div class="hud-symbol">✕</div>
        <div class="hud-details">
          <span class="hud-title">BẠN (QUÂN X ĐỎ)</span>
          <span class="hud-score">Thắng: <b>{{ playerWins }}</b></span>
        </div>
      </div>

      <!-- Difficulty & Status Center -->
      <div class="solo-center-hud">
        <div class="difficulty-picker">
          <button
            v-for="d in difficultyOptions"
            :key="d.key"
            class="diff-btn"
            :class="{ active: difficulty === d.key }"
            @click="setDifficulty(d.key)"
          >
            {{ d.label }}
          </button>
        </div>

        <div class="turn-status-text" :class="currentTurn === 'X' ? 'player-turn' : 'ai-turn'">
          {{ isGameOver ? 'VÁN CỜ KẾT THÚC' : (currentTurn === 'X' ? 'LƯỢT ĐÁNH CỦA BẠN' : 'MÁY ĐANG TÍNH NƯỚC...') }}
        </div>
      </div>

      <!-- AI Bot Panel (O XANH) -->
      <div class="solo-player-card card-ai" :class="{ 'active-turn': currentTurn === 'O' }">
        <div class="hud-details text-right">
          <span class="hud-title">BOT AI (QUÂN O XANH)</span>
          <span class="hud-score">Thắng: <b>{{ aiWins }}</b></span>
        </div>
        <div class="hud-symbol">◯</div>
      </div>
    </div>

    <!-- Board Area -->
    <div class="solo-board-area">
      <CaroBoard
        :board="board"
        :board-size="15"
        :current-turn="currentTurn"
        :can-interact="currentTurn === 'X' && !isGameOver && !isAiThinking"
        :last-move="lastMove"
        :winning-line="winningLine"
        @place="handlePlayerMove"
      />
    </div>

    <!-- Bottom Actions -->
    <div class="solo-bottom-actions">
      <button class="btn btn-secondary sound-btn" @click="toggleSound" :title="soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'">
        <LucideVolume2 v-if="soundEnabled" class="icon" />
        <LucideVolumeX v-else class="icon text-muted" />
      </button>

      <button
        class="btn btn-secondary undo-btn"
        :disabled="moveHistory.length < 2 || isAiThinking || isGameOver"
        @click="handleUndo"
      >
        <LucideUndo2 class="icon" /> ĐI LẠI (HOÀN TÁC)
      </button>

      <button class="btn btn-primary new-game-btn" @click="resetGame">
        <LucideRotateCcw class="icon" /> CHƠI VÁN MỚI
      </button>
    </div>

    <!-- Victory Popup Modal (Matrix Style) -->
    <CaroVictoryModal
      v-if="isGameOver && showVictoryPopup"
      :winner="soloWinner"
      win-reason="five_in_a_row"
      :players="soloPlayers"
      my-symbol="X"
      @close="showVictoryPopup = false"
      @rematch="resetGame"
      @leave="resetGame"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  LucideVolume2,
  LucideVolumeX,
  LucideUndo2,
  LucideRotateCcw
} from '@lucide/vue'
import CaroBoard from './CaroBoard.vue'
import CaroVictoryModal from './CaroVictoryModal.vue'
import type { CaroSymbol } from '~/types/caro'
import { checkWinLocal, findBestAIMove, type AIDifficulty } from '~/utils/caro/caroAI'
import { useCaroSound } from '~/composables/useCaroSound'

const {
  soundEnabled,
  toggleSound,
  playPlaceStone,
  playTurnPing,
  playWin,
  playLose
} = useCaroSound()

const BOARD_SIZE = 15

function createEmptyBoard() {
  const b: (CaroSymbol | null)[][] = []
  for (let r = 0; r < BOARD_SIZE; r++) {
    b.push(new Array(BOARD_SIZE).fill(null))
  }
  return b
}

const board = ref<(CaroSymbol | null)[][]>(createEmptyBoard())
const currentTurn = ref<CaroSymbol>('X')
const difficulty = ref<AIDifficulty>('medium')
const isAiThinking = ref(false)
const isGameOver = ref(false)
const showVictoryPopup = ref(true)
const soloWinner = ref<CaroSymbol | 'DRAW' | null>(null)
const winningLine = ref<{ row: number; col: number }[]>([])
const lastMove = ref<{ row: number; col: number; symbol: CaroSymbol } | null>(null)
const moveHistory = ref<{ row: number; col: number; symbol: CaroSymbol }[]>([])

const playerWins = ref(0)
const aiWins = ref(0)

const soloPlayers = computed(() => [
  { id: 'player', name: 'Bạn', symbol: 'X' as CaroSymbol, wins: playerWins.value, isMe: true },
  { id: 'ai', name: 'Bot AI', symbol: 'O' as CaroSymbol, wins: aiWins.value, isMe: false }
])

const difficultyOptions: { key: AIDifficulty; label: string }[] = [
  { key: 'easy', label: 'Dễ' },
  { key: 'medium', label: 'Vừa' },
  { key: 'hard', label: 'Khó 🔥' }
]

function setDifficulty(d: AIDifficulty) {
  difficulty.value = d
}

function handlePlayerMove(coord: { row: number; col: number }) {
  if (currentTurn.value !== 'X' || isGameOver.value || isAiThinking.value) return
  if (board.value[coord.row][coord.col] !== null) return

  // Place player stone
  board.value[coord.row][coord.col] = 'X'
  const move = { row: coord.row, col: coord.col, symbol: 'X' as CaroSymbol }
  lastMove.value = move
  moveHistory.value.push(move)
  playPlaceStone()

  // Check player win
  const winCheck = checkWinLocal(board.value, coord.row, coord.col, 'X', 'caro_vn')
  if (winCheck.win) {
    isGameOver.value = true
    showVictoryPopup.value = true
    soloWinner.value = 'X'
    winningLine.value = winCheck.winningLine
    playerWins.value++
    playWin()
    return
  }

  // Check draw
  if (moveHistory.value.length >= BOARD_SIZE * BOARD_SIZE) {
    isGameOver.value = true
    showVictoryPopup.value = true
    soloWinner.value = 'DRAW'
    playLose()
    return
  }

  // Trigger AI move
  currentTurn.value = 'O'
  isAiThinking.value = true

  setTimeout(() => {
    runAIMove()
  }, 350)
}

function runAIMove() {
  if (isGameOver.value) return

  const aiMove = findBestAIMove(board.value, 'O', difficulty.value)
  board.value[aiMove.row][aiMove.col] = 'O'
  const move = { row: aiMove.row, col: aiMove.col, symbol: 'O' as CaroSymbol }
  lastMove.value = move
  moveHistory.value.push(move)
  playPlaceStone()

  const winCheck = checkWinLocal(board.value, aiMove.row, aiMove.col, 'O', 'caro_vn')
  if (winCheck.win) {
    isGameOver.value = true
    showVictoryPopup.value = true
    soloWinner.value = 'O'
    winningLine.value = winCheck.winningLine
    aiWins.value++
    playLose()
    isAiThinking.value = false
    return
  }

  if (moveHistory.value.length >= BOARD_SIZE * BOARD_SIZE) {
    isGameOver.value = true
    showVictoryPopup.value = true
    soloWinner.value = 'DRAW'
    playLose()
    isAiThinking.value = false
    return
  }

  currentTurn.value = 'X'
  isAiThinking.value = false
  playTurnPing()
}

function handleUndo() {
  if (moveHistory.value.length < 2 || isAiThinking.value || isGameOver.value) return

  const aiMove = moveHistory.value.pop()
  if (aiMove) {
    board.value[aiMove.row][aiMove.col] = null
  }

  const pMove = moveHistory.value.pop()
  if (pMove) {
    board.value[pMove.row][pMove.col] = null
  }

  lastMove.value = moveHistory.value.length > 0 ? moveHistory.value[moveHistory.value.length - 1] : null
  currentTurn.value = 'X'
}

function resetGame() {
  board.value = createEmptyBoard()
  currentTurn.value = 'X'
  isGameOver.value = false
  showVictoryPopup.value = true
  soloWinner.value = null
  winningLine.value = []
  lastMove.value = null
  moveHistory.value = []
  isAiThinking.value = false
}
</script>

<style scoped>
.caro-solo-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

/* Solo Top HUD */
.solo-top-hud {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  margin-bottom: var(--space-3);
}

.solo-player-card {
  background: var(--card-bg);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  padding: 8px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.3s;
}

/* X ĐỎ */
.card-player {
  border-color: rgba(220, 38, 38, 0.35);
}

.card-player.active-turn {
  border-color: #dc2626;
  box-shadow: 0 0 16px rgba(220, 38, 38, 0.4);
}

.card-player .hud-symbol {
  color: #dc2626;
  text-shadow: 0 0 8px rgba(220, 38, 38, 0.4);
}

/* O XANH */
.card-ai {
  border-color: rgba(2, 132, 199, 0.35);
}

.card-ai.active-turn {
  border-color: #0284c7;
  box-shadow: 0 0 16px rgba(2, 132, 199, 0.4);
}

.card-ai .hud-symbol {
  color: #0284c7;
  text-shadow: 0 0 8px rgba(2, 132, 199, 0.4);
}

.hud-symbol {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.6rem;
  font-weight: 900;
}

.hud-details {
  display: flex;
  flex-direction: column;
}

.text-right {
  text-align: right;
  margin-left: auto;
}

.hud-title {
  font-weight: 800;
  font-size: 0.85rem;
  color: var(--text-main);
}

.hud-score {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.hud-score b {
  color: var(--matchbox-gold);
}

/* Center HUD */
.solo-center-hud {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.difficulty-picker {
  display: flex;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 3px;
  gap: 3px;
}

.diff-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-family: 'Orbitron', sans-serif;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.diff-btn.active {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
  font-weight: 800;
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.4);
}

.turn-status-text {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 1px;
}

.player-turn {
  color: #38bdf8;
  text-shadow: 0 0 8px rgba(56, 189, 248, 0.5);
}

.ai-turn {
  color: #0284c7;
}

/* Board */
.solo-board-area {
  display: flex;
  justify-content: center;
  margin-bottom: var(--space-4);
  width: 100%;
}

/* Bottom Actions */
.solo-bottom-actions {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.undo-btn {
  font-size: 0.8rem;
}

.new-game-btn {
  font-size: 0.8rem;
}

@media (max-width: 650px) {
  .solo-top-hud {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .solo-center-hud {
    grid-column: 1 / -1;
    order: -1;
    margin-bottom: 4px;
  }
}
</style>
