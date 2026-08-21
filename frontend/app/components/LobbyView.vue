<template>
  <div id="room-waiting-overlay" class="room-waiting-overlay">
    <div class="lobby-room-view">
      <div class="lobby-room-header">
        <div class="lobby-room-code">
          <span>MÃ PHÒNG:</span>
          <strong>{{ store.currentRoomCode }}</strong>
          <button
            id="btn-copy-link"
            class="btn btn-sm btn-muted"
            :class="{ 'copy-success': copySuccess }"
            title="Sao chép link mời"
            aria-label="Sao chép link mời"
            @click="copyLink"
          >
            <LucideCheck v-if="copySuccess" class="icon" />
            <LucideLink v-else class="icon" />
          </button>
        </div>
      </div>

      <div class="lobby-players-grid">
        <div 
          v-for="idx in 10"
          :key="idx"
          class="player-slot-card"
          :class="[
            'p' + idx + '-slot', 
            { 'is-empty': !getPlayerAt(idx - 1) }
          ]"
          :style="{ display: getPlayerAt(idx - 1) ? 'flex' : 'none' }"
        >
          <div class="slot-indicator">{{ idx }}</div>
          <div class="slot-content">
            <template v-if="getPlayerAt(idx - 1)">
              <div class="slot-player-name">
                <LucideUser class="icon" />
                {{ getPlayerAt(idx - 1)?.name }}
                <LucideCrown
                  v-if="getPlayerAt(idx - 1)?.id === store.localRoomState?.hostPlayerId"
                  class="icon host-crown-icon"
                  title="Chủ phòng"
                />
                <span v-if="getPlayerAt(idx - 1)?.id === store.myPlayerId" class="you-tag">(Bạn)</span>
                <span v-if="!getPlayerAt(idx - 1)?.connected" class="disconnected-tag">(Mất kết nối)</span>
              </div>
              <div 
                v-if="getPlayerAt(idx - 1)?.id !== store.localRoomState?.hostPlayerId"
                class="ready-tag"
                :class="getPlayerAt(idx - 1)?.ready ? 'is-ready' : 'not-ready'"
              >
                <LucideCheck v-if="getPlayerAt(idx - 1)?.ready" class="icon" />
                <LucideClock v-else class="icon" />
              </div>
              <button 
                v-if="isMyHost && getPlayerAt(idx - 1)?.id !== store.myPlayerId"
                class="btn-kick-player"
                title="Đuổi khỏi phòng"
                @click="kickPlayer(getPlayerAt(idx - 1)!.id)"
              >
                <LucideUserMinus class="icon" />
              </button>
            </template>
          </div>
        </div>
      </div>

      <div v-if="isMyHost" class="timer-select-group">
        <label> <LucideTimer class="icon" /> Thời gian mỗi lượt </label>
        <select v-model="timerLimit">
          <option :value="5">5 giây</option>
          <option :value="8">8 giây</option>
          <option :value="10">10 giây</option>
          <option :value="15">15 giây</option>
        </select>
      </div>

      <div v-if="!store.isSpectating" class="lobby-room-buttons">
        <button v-if="!isMyHost" class="btn btn-green" @click="toggleReady">
          <LucideZap class="icon" /> 
          {{ getPlayerAt(store.myPlayerIndex)?.ready ? 'HỦY SẴN SÀNG' : 'SẴN SÀNG' }}
        </button>
        <button v-if="isMyHost" class="btn btn-primary" @click="startGame">
          <LucideRocket class="icon" /> BẮT ĐẦU GAME
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '~/stores/game'
import { useSocket } from '~/composables/useSocket'
import { LucideLink, LucideCheck, LucideUserMinus, LucideTimer, LucideZap, LucideRocket, LucideUser, LucideClock, LucideCrown } from '@lucide/vue'
import type { Player } from '~/types'

const store = useGameStore()
const { emitAck } = useSocket()
const copySuccess = ref(false)
const timerLimit = ref(8)

const getPlayerAt = (index: number) => {
  if (!store.localRoomState?.players) return null
  return store.localRoomState.players.find((p: Player) => p.seatIndex === index) || null
}

const isMyHost = computed(() => {
  if (!store.localRoomState) return false
  return store.localRoomState.hostPlayerId === store.myPlayerId
})

const copyLink = () => {
  if (!navigator.clipboard?.writeText) return
  const url = new URL('/', window.location.origin)
  url.searchParams.set('room', store.currentRoomCode)
  navigator.clipboard.writeText(url.toString()).then(() => {
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 2000)
  })
}

const kickPlayer = async (id: string) => {
  const res = await emitAck('kick_player', { targetPlayerId: id })
  if (!res.ok) alert(res.error?.message || 'Không thể kick người chơi.')
}

const toggleReady = () => {
  if (!store.currentRoomCode) return
  emitAck('toggle_ready', { roomCode: store.currentRoomCode })
}

const startGame = async () => {
  if (!store.currentRoomCode) return
  const res = await emitAck('start_game', { turnTimeLimit: timerLimit.value })
  if (!res.ok) alert(res.error?.message || 'Lỗi')
}
</script>

<style scoped>

.lobby-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 6, 12, 0.88);
  backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: var(--space-4);
}

.lobby-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  width: 100%;
  max-width: 540px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 90vh;
  overflow-y: auto;
  backdrop-filter: blur(10px);
}

.lobby-header {
  text-align: center;
}

.lobby-header h2 {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: 0.5px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.lobby-header h2 .icon {
  -webkit-text-fill-color: initial;
  color: var(--matchbox-orange);
  width: 1.4em;
  height: 1.4em;
}

.lobby-room-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: 100%;
}

.lobby-room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: transparent;
  border: none;
  padding: 0;
}

.lobby-room-code {
  align-items: center;
  font-size: 0.75rem;
  color: var(--text-muted);
  display: inline-flex;
}

.lobby-room-code strong {
  font-size: 1.1rem;
  color: var(--matchbox-gold);
  margin-left: 6px;
}

#btn-copy-link {
  height: 26px;
  margin-left: var(--space-2);
  min-width: 26px;
  padding: 0;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
  width: 26px;
}

#btn-copy-link .icon {
  height: 14px;
  width: 14px;
}

#btn-copy-link.copy-success {
  background: rgba(16, 185, 129, 0.18);
  border-color: var(--matchbox-green);
  color: var(--matchbox-green);
  transform: scale(1.06);
}

.lobby-room-actions {
  margin-left: auto;
}

.lobby-room-buttons {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.lobby-room-buttons .btn {
  flex: 1;
  padding: 0.85rem;
}

.lobby-room-buttons #btn-start-game-server {
  flex: 1.2;
  font-size: 0.95rem;
}

.lobby-players-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.player-slot-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.6rem 0.8rem;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  text-align: left;
  position: relative;
  transition: all 0.25s ease;
}

.player-slot-card.p1-slot {
  border-color: var(--p1-color);
}

.player-slot-card.p2-slot {
  border-color: var(--p2-color);
}

.player-slot-card.p3-slot {
  border-color: var(--p3-color);
}

.player-slot-card.p4-slot {
  border-color: var(--p4-color);
}

.player-slot-card.p5-slot {
  border-color: var(--p5-color);
}

.player-slot-card.p6-slot {
  border-color: var(--p6-color);
}

.player-slot-card.p7-slot {
  border-color: var(--p7-color);
}

.player-slot-card.p8-slot {
  border-color: var(--p8-color);
}

.player-slot-card.p9-slot {
  border-color: var(--p9-color);
}

.player-slot-card.p10-slot {
  border-color: var(--p10-color);
}

.slot-player-name {
  font-weight: 600;
  font-size: 0.88rem;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
}

.slot-player-name .icon {
  color: var(--text-faint);
  flex-shrink: 0;
}

.host-crown-icon {
  color: var(--matchbox-gold) !important;
  filter: drop-shadow(0 0 4px rgba(250, 204, 21, 0.6));
  flex-shrink: 0;
}

.slot-content {
  flex: 1;
  min-width: 0;
}

.you-tag {
  color: var(--matchbox-gold);
  font-size: 0.75rem;
  font-weight: 700;
  margin-left: 4px;
}

.disconnected-tag {
  color: var(--matchbox-red);
  font-size: 0.75rem;
  margin-left: 8px;
}

.ready-tag {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  z-index: 2;
  transition: all 0.3s ease;
  font-size: 1rem;
}

.ready-tag.is-ready {
  color: #00ffcc;
  filter: drop-shadow(0 0 8px rgba(0, 255, 204, 0.8));
}

.ready-tag.not-ready {
  color: #ff3366;
  filter: drop-shadow(0 0 8px rgba(255, 51, 102, 0.8));
}

.btn-kick-player {
  position: absolute;
  top: 50%;
  right: 40px;
  transform: translateY(-50%);
  z-index: 2;
  background: transparent;
  border: none;
  color: var(--text-faint);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  transition: color 0.2s ease;
}

.btn-kick-player .icon {
  width: 16px;
  height: 16px;
}

.btn-kick-player:hover {
  color: var(--matchbox-red);
}

.timer-select-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.6rem 0.8rem;
}

.timer-select-group label {
  font-size: 0.95rem;
  color: var(--text-muted);
  font-weight: 700;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.timer-select-group select {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  color: var(--matchbox-gold);
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  outline: none;
  cursor: pointer;
}

.game-pause-overlay,
.room-waiting-overlay {
  position: absolute;
  inset: 0;
  background: rgba(11, 17, 32, 0.85);
  backdrop-filter: blur(12px);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  gap: var(--space-4);
  text-align: center;
}

.room-waiting-overlay {
  align-items: stretch;
  justify-content: flex-start;
  padding: var(--space-4);
}

@media (max-width: 1180px) {

  .lobby-players-grid {
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .player-slot-card {
    padding: 6px;
    gap: 4px;
  }

  .slot-player-name {
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {

  .lobby-players-grid {
    grid-template-columns: 1fr;
  }

  .timer-select-group {
    align-items: stretch;
    flex-direction: column;
  }

  .timer-select-group label {
    white-space: normal;
  }
}
</style>
