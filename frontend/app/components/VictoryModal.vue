<template>
  <div id="victory-modal" class="modal-overlay active">
    <div class="modal-card victory-modal-card">
      <button class="modal-close-btn" @click="closeVictory">
        <LucideX class="icon" />
      </button>
      <div class="modal-title">
        <LucideTrophy class="icon" />
        <span class="modal-title-text">{{ winnerText }}</span>
      </div>
      <div class="modal-scores">
        <div 
          v-for="(p, i) in players" 
          :key="p.id"
          class="rank-card"
          :class="`rank-card-${getTier(i)}`"
          :style="`--rank-index:${i}`"
        >
          <div class="rank-badge">
            <LucideTrophy v-if="i === 0" class="icon rank-medal" :class="`medal-${getTier(i)}`" />
            <LucideMedal v-else class="icon rank-medal" :class="`medal-${getTier(i)}`" />
            <span>#{{ i + 1 }}</span>
          </div>
          <div class="rank-name">{{ p.name }}</div>
          <div class="rank-score"><strong>{{ p.score }}</strong><span>PTS</span></div>
        </div>
      </div>
      <div class="modal-buttons">
        <button class="btn btn-muted" @click="leaveRoom">
          <LucideLogOut class="icon" /> {{ store.isSpectating ? 'Ngừng xem' : 'Thoát Phòng' }}
        </button>
        <button v-if="!store.isSpectating" class="btn btn-primary" @click="restartGame">
          <LucideRotateCcw class="icon" /> Đấu Ván Mới
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '~/stores/game'
import { useSocket } from '~/composables/useSocket'
import { useLobbyNav } from '~/composables/useLobbyNav'
import { LucideX, LucideTrophy, LucideMedal, LucideLogOut, LucideRotateCcw } from '@lucide/vue'
import type { Player } from '~/types'

const props = defineProps<{
  players: Player[]
}>()

const store = useGameStore()
const { emitAck, clearResultSnapshot } = useSocket()
const { leaveAndGoToIndex } = useLobbyNav()

const MEDAL_TIERS = ['gold', 'silver', 'bronze']
const getTier = (rank: number) => MEDAL_TIERS[rank] || 'standard'

const MAX_WINNER_NAME_LEN = 16

const winnerText = computed(() => {
  if (props.players.length > 1 && props.players[0]?.score === props.players[1]?.score) {
    return 'HÒA TỶ SỐ!'
  }
  const name = props.players[0]?.name || ''
  const shortName = name.length > MAX_WINNER_NAME_LEN
    ? `${name.slice(0, MAX_WINNER_NAME_LEN)}…`
    : name
  return `${shortName} CHIẾN THẮNG!`
})

const closeVictory = () => {
  store.showVictoryModal = false
}

const leaveRoom = async () => {
  if (store.isSpectating) {
    await emitAck('stop_spectating', { roomCode: store.currentRoomCode })
    await leaveAndGoToIndex()
    return
  }

  if (!store.myPlayerId) return
  const res = await emitAck('leave_room', { roomCode: store.currentRoomCode, playerId: store.myPlayerId })
  if (res?.ok) {
    await leaveAndGoToIndex()
  } else {
    alert(res?.error?.message)
  }
}

const restartGame = async () => {
  const res = await emitAck('restart_game', {})
  if (!res?.ok) {
    alert(res?.error?.message)
    return
  }
  clearResultSnapshot(store.currentRoomCode)
  store.frozenResults = null
  store.showVictoryModal = false
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-overlay.active {
  display: flex;
}

.modal-card {
  background: var(--card-bg);
  border: 1.5px solid var(--border-strong);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  text-align: center;
  max-width: 520px;
  width: 100%;
  box-shadow: 0 0 60px rgba(249, 115, 22, 0.3);
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  align-items: center;
}

.modal-close-btn {
  position: absolute;
  top: 12px;
  right: 14px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  line-height: 1;
  padding: 6px;
  border-radius: 6px;
  font-size: 1.5rem;
  transition: all 0.2s ease;
}

.modal-card .modal-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: var(--space-4);
  width: 100%;
}

.modal-scores {
  display: grid;
  gap: var(--space-2);
  max-height: min(52vh, 520px);
  overflow-y: auto;
  padding: 2px;
  width: 100%;
}

.victory-modal-card {
  gap: var(--space-5);
  max-width: 620px;
}

.modal-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  min-width: 0;
  padding: 0 var(--space-5);
  font-family: 'Orbitron', sans-serif;
  font-size: 1.3rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  animation: victoryTitleIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.modal-title-text {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  background: linear-gradient(135deg, var(--matchbox-gold), var(--matchbox-orange));
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

.modal-title .icon {
  height: 1.3em;
  width: 1.3em;
  color: var(--matchbox-gold);
  filter: drop-shadow(0 0 12px rgba(250, 204, 21, 0.65));
  flex-shrink: 0;
}

@keyframes victoryTitleIn {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 480px) {

  .modal-title {
    font-size: 1rem;
    padding: 0 var(--space-3);
  }
}

.rank-card {
  animation: resultRankEnter 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--rank-index) * 55ms);
  align-items: center;
  background: rgba(255, 255, 255, 0.035);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 86px minmax(0, 1fr) auto;
  min-height: 62px;
  padding: 0.75rem 1rem;
  text-align: left;
}

.rank-card-gold {
  background: linear-gradient(100deg, rgba(250, 204, 21, 0.18), rgba(250, 204, 21, 0.05));
  border-color: rgba(250, 204, 21, 0.75);
  box-shadow: 0 0 24px rgba(250, 204, 21, 0.16);
}

.rank-card-silver {
  background: linear-gradient(100deg, rgba(203, 213, 225, 0.13), rgba(203, 213, 225, 0.03));
  border-color: rgba(203, 213, 225, 0.5);
}

.rank-card-bronze {
  background: linear-gradient(100deg, rgba(217, 119, 6, 0.15), rgba(217, 119, 6, 0.03));
  border-color: rgba(217, 119, 6, 0.55);
}

.rank-badge {
  align-items: center;
  color: var(--text-muted);
  display: inline-flex;
  font-family: 'Orbitron', sans-serif;
  font-size: 1rem;
  font-weight: 900;
  gap: var(--space-2);
  letter-spacing: 0.04em;
}

.rank-medal {
  height: 1.55em;
  width: 1.55em;
}

.medal-gold {
  color: #facc15;
}

.medal-silver {
  color: #cbd5e1;
}

.medal-bronze {
  color: #d97706;
}

.medal-standard {
  color: var(--text-faint);
}

.rank-name {
  color: var(--text-main);
  font-size: 1rem;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-card-gold .rank-name {
  color: var(--matchbox-gold);
  font-size: 1.08rem;
}

.rank-score {
  align-items: baseline;
  color: var(--text-main);
  display: inline-flex;
  font-family: 'Orbitron', sans-serif;
  gap: 6px;
  justify-content: flex-end;
  min-width: 96px;
  text-align: right;
}

.rank-score strong {
  font-size: 1.1rem;
  font-weight: 900;
}

.rank-score span {
  color: var(--text-faint);
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  font-weight: 700;
}

.rank-card-gold .rank-score strong {
  color: var(--matchbox-gold);
  font-size: 1.2rem;
}

@keyframes resultRankEnter {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 1180px) {

  .victory-modal-card {
    gap: var(--space-3);
  }

  .rank-card {
    gap: var(--space-2);
    grid-template-columns: 68px minmax(0, 1fr) auto;
    padding: 0.65rem 0.75rem;
  }

  .rank-score {
    min-width: 0;
  }
}

@media (max-width: 480px) {

  .rank-card {
    grid-template-columns: 58px minmax(0, 1fr) auto;
  }

  .rank-badge,
  .rank-name,
  .rank-score strong {
    font-size: 0.85rem;
  }

  .rank-score span {
    font-size: 0.58rem;
  }
}
</style>
