<template>
  <div class="caro-pvp-wrapper">
    <!-- Floating Emojis Layer -->
    <div class="floating-emojis-container">
      <div
        v-for="e in floatingEmojis"
        :key="e.id"
        class="floating-emoji"
      >
        <span class="emoji-icon">{{ e.emoji }}</span>
        <span class="emoji-sender">{{ e.senderName }}</span>
      </div>
    </div>

    <!-- Match Status & Players Top Bar -->
    <div class="pvp-top-bar">
      <!-- Player X Panel (X ĐỎ) -->
      <div
        class="player-hud-card hud-x"
        :class="{ 'active-turn': currentCaroRoom?.currentTurn === 'X', 'is-me': playerX?.id === myPlayerId }"
      >
        <div class="hud-symbol">✕</div>
        <div class="hud-info">
          <div class="hud-name">
            {{ playerX?.name || 'Player X' }}
            <span v-if="playerX?.id === myPlayerId" class="badge-me">BẠN</span>
          </div>
          <div class="hud-score">Thắng: <b>{{ playerX?.wins || 0 }}</b></div>
        </div>
      </div>

      <!-- Center Timer & Turn Indicator -->
      <div class="center-turn-hud">
        <div class="timer-radial-box" :class="{ warning: (currentCaroRoom?.timeRemaining || 0) <= 5 }">
          <span class="timer-num">{{ currentCaroRoom?.timeRemaining ?? 0 }}</span>
          <span class="timer-sec">giây</span>
        </div>

        <div class="turn-announcement" :class="isMyTurn ? 'my-turn-text' : 'opponent-turn-text'">
          <span v-if="isMyTurn" class="pulse-icon">●</span>
          {{ isMyTurn ? 'LƯỢT ĐÁNH CỦA BẠN' : 'ĐỐI THỦ ĐANG SUY NGHĨ...' }}
        </div>
      </div>

      <!-- Player O Panel (O XANH) -->
      <div
        class="player-hud-card hud-o"
        :class="{ 'active-turn': currentCaroRoom?.currentTurn === 'O', 'is-me': playerO?.id === myPlayerId }"
      >
        <div class="hud-info text-right">
          <div class="hud-name">
            {{ playerO?.name || 'Player O' }}
            <span v-if="playerO?.id === myPlayerId" class="badge-me">BẠN</span>
          </div>
          <div class="hud-score">Thắng: <b>{{ playerO?.wins || 0 }}</b></div>
        </div>
        <div class="hud-symbol">◯</div>
      </div>
    </div>

    <!-- Board Area -->
    <div class="pvp-board-area">
      <CaroBoard
        v-if="currentCaroRoom"
        :board="currentCaroRoom.board"
        :board-size="currentCaroRoom.boardSize"
        :current-turn="currentCaroRoom.currentTurn"
        :can-interact="isMyTurn && currentCaroRoom.status === 'PLAYING'"
        :last-move="currentCaroRoom.lastMove"
        :winning-line="currentCaroRoom.winningLine"
        @place="handleBoardClick"
      />
    </div>

    <!-- Bottom Controls & Emotes Bar -->
    <div class="pvp-bottom-bar">
      <div class="in-game-actions">
        <button class="btn btn-secondary sound-btn" @click="toggleSound" :title="soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'">
          <LucideVolume2 v-if="soundEnabled" class="icon" />
          <LucideVolumeX v-else class="icon text-muted" />
        </button>

        <button
          v-if="currentCaroRoom?.status === 'PLAYING' && !isSpectator"
          class="btn btn-secondary draw-btn"
          @click="offerDraw"
          title="Xin đối thủ cầu hòa ván này"
        >
          <LucideHandshake class="icon" /> CẦU HÒA
        </button>

        <button
          v-if="currentCaroRoom?.status === 'PLAYING' && !isSpectator"
          class="btn btn-danger-soft surrender-btn"
          @click="surrender"
          title="Chấp nhận thua ván này"
        >
          <LucideFlag class="icon" /> ĐẦU HÀNG
        </button>

        <button class="btn btn-secondary exit-btn" @click="confirmLeave">
          <LucideLogOut class="icon" /> THOÁT
        </button>
      </div>

      <!-- Quick In-Game Emote Reactions -->
      <div class="in-game-emotes">
        <button
          v-for="emote in pvpEmotes"
          :key="emote"
          class="pvp-emote-btn"
          @click="sendEmote(emote)"
        >
          {{ emote }}
        </button>
      </div>
    </div>

    <!-- Draw Offer Modal (Received from opponent) -->
    <div v-if="hasPendingDrawOffer" class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-header">
          <h3>LỜI MỜI CẦU HÒA</h3>
        </div>
        <div class="modal-body text-center">
          <p>
            Đối thủ <b>{{ currentCaroRoom?.drawOffer?.fromPlayerName }}</b> vừa đề nghị chia điểm cầu hòa.
          </p>
          <p class="text-muted">Bạn có đồng ý kết thúc ván cờ với kết quả hòa không?</p>
        </div>
        <div class="modal-footer justify-center">
          <button class="btn btn-secondary" @click="respondDraw(false)">
            TỪ CHỐI
          </button>
          <button class="btn btn-primary" @click="respondDraw(true)">
            ĐỒNG Ý HÒA
          </button>
        </div>
      </div>
    </div>

    <!-- Victory Popup Modal (Matrix Style) -->
    <CaroVictoryModal
      v-if="currentCaroRoom?.status === 'FINISHED' && showVictoryPopup"
      :winner="currentCaroRoom.winner"
      :win-reason="currentCaroRoom.winReason"
      :players="victoryPlayers"
      :my-symbol="myPlayer?.symbol || null"
      @close="showVictoryPopup = false"
      @rematch="requestRematch"
      @leave="leaveRoom"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  LucideVolume2,
  LucideVolumeX,
  LucideFlag,
  LucideHandshake,
  LucideLogOut
} from '@lucide/vue'
import CaroBoard from './CaroBoard.vue'
import CaroVictoryModal from './CaroVictoryModal.vue'
import { useCaroSocket } from '~/composables/useCaroSocket'
import { useCaroSound } from '~/composables/useCaroSound'

const {
  currentCaroRoom,
  myPlayerId,
  myPlayer,
  isMyTurn,
  floatingEmojis,
  placeStone,
  surrender,
  offerDraw,
  respondDraw,
  requestRematch,
  sendEmoji,
  leaveRoom
} = useCaroSocket()

const {
  soundEnabled,
  toggleSound,
  playPlaceStone,
  playTurnPing,
  playCountdownTick,
  playWin,
  playLose,
  playEmote
} = useCaroSound()

const pvpEmotes = ['🔥', '⚔️', '👏', '😱', '⏰', '😎', '💀', '👍']
const showVictoryPopup = ref(true)

const playerX = computed(() => currentCaroRoom.value?.players.find((p) => p.symbol === 'X'))
const playerO = computed(() => currentCaroRoom.value?.players.find((p) => p.symbol === 'O'))

const isSpectator = computed(() => {
  if (!currentCaroRoom.value || !myPlayerId.value) return true
  return !currentCaroRoom.value.players.some((p) => p.id === myPlayerId.value)
})

const hasPendingDrawOffer = computed(() => {
  if (!currentCaroRoom.value?.drawOffer || !myPlayerId.value) return false
  return currentCaroRoom.value.drawOffer.fromPlayerId !== myPlayerId.value
})

const victoryPlayers = computed(() => {
  if (!currentCaroRoom.value) return []
  return currentCaroRoom.value.players.map((p) => ({
    id: p.id,
    name: p.name,
    symbol: p.symbol,
    wins: p.wins,
    isMe: p.id === myPlayerId.value
  }))
})

// Play sound on stone placed or turn change
watch(
  () => currentCaroRoom.value?.lastMove,
  (newMove, oldMove) => {
    if (newMove && newMove !== oldMove) {
      playPlaceStone()
    }
  }
)

watch(
  () => isMyTurn.value,
  (myTurn) => {
    if (myTurn && currentCaroRoom.value?.status === 'PLAYING') {
      playTurnPing()
    }
  }
)

// Warning tick when timeRemaining is low
watch(
  () => currentCaroRoom.value?.timeRemaining,
  (time) => {
    if (currentCaroRoom.value?.status === 'PLAYING' && time !== undefined && time <= 5 && time > 0) {
      playCountdownTick()
    }
  }
)

// Popup & audio when finished
watch(
  () => currentCaroRoom.value?.status,
  (status) => {
    if (status === 'FINISHED') {
      showVictoryPopup.value = true
      const winner = currentCaroRoom.value?.winner
      if (winner === 'DRAW') {
        playLose()
      } else if (winner === myPlayer.value?.symbol) {
        playWin()
      } else {
        playLose()
      }
    }
  }
)

async function handleBoardClick(coord: { row: number; col: number }) {
  if (!isMyTurn.value) return
  const res = await placeStone(coord.row, coord.col)
  if (!res?.ok && res?.error?.message) {
    console.warn(res.error.message)
  }
}

function sendEmote(emote: string) {
  sendEmoji(emote)
  playEmote()
}

function confirmLeave() {
  if (confirm('Bạn có muốn thoát trận đấu để về sảnh?')) {
    leaveRoom()
  }
}
</script>

<style scoped>
.caro-pvp-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

/* Floating Emojis Layer */
.floating-emojis-container {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 999;
  overflow: hidden;
}

.floating-emoji {
  position: absolute;
  bottom: 20%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: floatUp 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes floatUp {
  0% { opacity: 0; transform: translate(-50%, 0) scale(0.5); }
  20% { opacity: 1; transform: translate(-50%, -40px) scale(1.3); }
  80% { opacity: 0.9; transform: translate(-50%, -180px) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -240px) scale(0.8); }
}

.emoji-icon {
  font-size: 3.5rem;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
}

.emoji-sender {
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
  background: rgba(0, 0, 0, 0.6);
  padding: 2px 8px;
  border-radius: 999px;
  margin-top: 4px;
}

/* Top HUD Bar */
.pvp-top-bar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  margin-bottom: var(--space-3);
}

.player-hud-card {
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
.player-hud-card.hud-x {
  border-color: rgba(220, 38, 38, 0.35);
}

.hud-x.active-turn {
  border-color: #dc2626;
  box-shadow: 0 0 16px rgba(220, 38, 38, 0.4);
}

.hud-x .hud-symbol {
  color: #dc2626;
  text-shadow: 0 0 8px rgba(220, 38, 38, 0.4);
}

/* O XANH */
.player-hud-card.hud-o {
  border-color: rgba(2, 132, 199, 0.35);
}

.hud-o.active-turn {
  border-color: #0284c7;
  box-shadow: 0 0 16px rgba(2, 132, 199, 0.4);
}

.hud-o .hud-symbol {
  color: #0284c7;
  text-shadow: 0 0 8px rgba(2, 132, 199, 0.4);
}

.hud-symbol {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.6rem;
  font-weight: 900;
}

.hud-info {
  display: flex;
  flex-direction: column;
}

.text-right {
  text-align: right;
  margin-left: auto;
}

.hud-name {
  font-weight: 800;
  font-size: 0.95rem;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 6px;
}

.badge-me {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.65rem;
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.4);
  padding: 1px 6px;
  border-radius: 4px;
}

.hud-score {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.hud-score b {
  color: var(--matchbox-gold);
}

/* Center Timer HUD */
.center-turn-hud {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.timer-radial-box {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.9);
  border: 2px solid rgba(56, 189, 248, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 14px rgba(56, 189, 248, 0.2);
  transition: all 0.2s;
}

.timer-radial-box.warning {
  border-color: #ef4444;
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.6);
  animation: timerWarning 0.5s infinite alternate;
}

@keyframes timerWarning {
  0% { transform: scale(1); }
  100% { transform: scale(1.1); }
}

.timer-num {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.15rem;
  font-weight: 900;
  line-height: 1;
  color: var(--text-main);
}

.timer-radial-box.warning .timer-num {
  color: #ef4444;
}

.timer-sec {
  font-size: 0.58rem;
  color: var(--text-faint);
}

.turn-announcement {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 1px;
}

.my-turn-text {
  color: #38bdf8;
  text-shadow: 0 0 8px rgba(56, 189, 248, 0.5);
}

.opponent-turn-text {
  color: var(--text-faint);
}

.pulse-icon {
  animation: pulseDot 1s infinite;
}

@keyframes pulseDot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}

/* Board Area */
.pvp-board-area {
  display: flex;
  justify-content: center;
  margin-bottom: var(--space-4);
  width: 100%;
}

/* Bottom Controls */
.pvp-bottom-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
}

.in-game-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.btn-danger-soft {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #f87171;
  padding: 0.6rem 1rem;
  border-radius: var(--radius-sm);
  font-family: 'Orbitron', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-danger-soft:hover {
  background: rgba(239, 68, 68, 0.25);
  border-color: #ef4444;
}

.in-game-emotes {
  display: flex;
  gap: 8px;
}

.pvp-emote-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 1.3rem;
  cursor: pointer;
  transition: transform 0.15s, background-color 0.15s;
}

.pvp-emote-btn:hover {
  transform: scale(1.25);
  background: rgba(255, 255, 255, 0.15);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-3);
}

.modal-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  max-width: 440px;
  width: 100%;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
  overflow: hidden;
  padding: var(--space-5);
}

.modal-header h3 {
  font-family: 'Orbitron', sans-serif;
  color: var(--matchbox-gold);
}

.modal-body {
  margin: var(--space-3) 0;
}

.modal-footer {
  display: flex;
  gap: var(--space-3);
}

.justify-center {
  justify-content: center;
}

@media (max-width: 650px) {
  .pvp-top-bar {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .center-turn-hud {
    grid-column: 1 / -1;
    order: -1;
    margin-bottom: 4px;
  }
}
</style>
