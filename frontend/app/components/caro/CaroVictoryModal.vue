<template>
  <div class="modal-overlay active">
    <div class="modal-card victory-modal-card">
      <button class="modal-close-btn" @click="emit('close')">
        <LucideX class="icon" />
      </button>

      <!-- Trophy & Winner Title -->
      <div class="modal-title">
        <LucideTrophy class="icon" />
        <span class="modal-title-text">{{ winnerTitle }}</span>
      </div>

      <div class="victory-reason-tag">
        {{ reasonText }}
      </div>

      <!-- Rank & Score Cards (Matrix Victory Style) -->
      <div class="modal-scores">
        <div
          v-for="(p, i) in rankedPlayers"
          :key="p.id"
          class="rank-card"
          :class="`rank-card-${getTier(i)}`"
          :style="`--rank-index:${i}`"
        >
          <div class="rank-badge">
            <LucideTrophy v-if="i === 0 && winner !== 'DRAW'" class="icon rank-medal medal-gold" />
            <LucideMedal v-else class="icon rank-medal" :class="`medal-${getTier(i)}`" />
            <span>#{{ i + 1 }}</span>
          </div>

          <div class="rank-avatar" :class="p.symbol === 'X' ? 'symbol-x-avatar' : 'symbol-o-avatar'">
            {{ p.symbol }}
          </div>

          <div class="rank-name">
            {{ p.name }}
            <span v-if="p.isMe" class="badge-me-inline">(Bạn)</span>
          </div>

          <div class="rank-score">
            <strong>{{ p.wins }}</strong>
            <span>VÁN THẮNG</span>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="modal-buttons">
        <button class="btn btn-muted" @click="emit('leave')">
          <LucideLogOut class="icon" /> Thoát Phòng
        </button>
        <button class="btn btn-primary" @click="emit('rematch')">
          <LucideRotateCcw class="icon" /> Đấu Ván Mới
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LucideX, LucideTrophy, LucideMedal, LucideLogOut, LucideRotateCcw } from '@lucide/vue'
import type { CaroSymbol } from '~/types/caro'

interface PlayerScore {
  id: string
  name: string
  symbol: CaroSymbol
  wins: number
  isMe?: boolean
}

const props = defineProps<{
  winner: CaroSymbol | 'DRAW' | null
  winReason?: string | null
  players: PlayerScore[]
  mySymbol?: CaroSymbol | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'rematch'): void
  (e: 'leave'): void
}>()

const MEDAL_TIERS = ['gold', 'silver', 'bronze']
const getTier = (rank: number) => (props.winner === 'DRAW' ? 'silver' : MEDAL_TIERS[rank] || 'standard')

const winnerTitle = computed(() => {
  if (props.winner === 'DRAW') {
    return 'HÒA CỜ!'
  }
  const winningPlayer = props.players.find((p) => p.symbol === props.winner)
  if (!winningPlayer) return 'KẾT THÚC TRẬN ĐẤU'

  if (props.mySymbol && winningPlayer.symbol === props.mySymbol) {
    return 'BẠN ĐÃ CHIẾN THẮNG!'
  }
  return `${winningPlayer.name} CHIẾN THẮNG!`
})

const reasonText = computed(() => {
  if (props.winReason === 'five_in_a_row') {
    return 'Đạt thành công 5 quân cờ liên tiếp!'
  } else if (props.winReason === 'timeout') {
    return 'Đối thủ đã hết thời gian lượt đánh.'
  } else if (props.winReason === 'surrender') {
    return 'Đối thủ đã chấp nhận đầu hàng.'
  } else if (props.winReason === 'agreement') {
    return 'Hai bên đã đồng ý hòa ván cờ.'
  } else if (props.winReason === 'opponent_left') {
    return 'Đối thủ đã thoát khỏi phòng chơi.'
  } else if (props.winReason === 'board_full') {
    return 'Bàn cờ đã đầy không còn ô trống.'
  }
  return 'Ván cờ kết thúc.'
})

const rankedPlayers = computed(() => {
  const list = [...props.players]
  if (props.winner && props.winner !== 'DRAW') {
    list.sort((a, b) => (a.symbol === props.winner ? -1 : 1))
  }
  return list
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 6, 12, 0.88);
  backdrop-filter: blur(14px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.victory-modal-card {
  background: rgba(15, 23, 42, 0.96);
  border: 1.5px solid rgba(245, 158, 11, 0.5);
  box-shadow: 
    0 25px 60px rgba(0, 0, 0, 0.8),
    0 0 40px rgba(245, 158, 11, 0.2);
  border-radius: var(--radius-lg);
  padding: var(--space-5) var(--space-6);
  max-width: 480px;
  width: 100%;
  position: relative;
  text-align: center;
  animation: modalEnter 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalEnter {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.modal-close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.modal-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--matchbox-gold);
  font-family: 'Orbitron', sans-serif;
  font-size: 1.5rem;
  font-weight: 900;
  margin-bottom: 6px;
  text-shadow: 0 0 20px rgba(252, 211, 77, 0.4);
}

.victory-reason-tag {
  display: inline-block;
  font-size: 0.82rem;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.05);
  padding: 3px 12px;
  border-radius: 999px;
  margin-bottom: var(--space-4);
}

.modal-scores {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: var(--space-5);
}

.rank-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 16px;
  transition: all 0.2s;
}

.rank-card-gold {
  border-color: rgba(252, 211, 77, 0.5);
  background: rgba(252, 211, 77, 0.08);
  box-shadow: 0 0 16px rgba(252, 211, 77, 0.1);
}

.rank-card-silver {
  border-color: rgba(148, 163, 184, 0.4);
  background: rgba(148, 163, 184, 0.05);
}

.rank-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.85rem;
  font-weight: 800;
  width: 48px;
}

.medal-gold {
  color: #fcd34d;
}

.medal-silver {
  color: #94a3b8;
}

.rank-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  font-size: 1.2rem;
}

.symbol-x-avatar {
  background: rgba(220, 38, 38, 0.15);
  color: #dc2626;
  border: 1.5px solid #dc2626;
}

.symbol-o-avatar {
  background: rgba(2, 132, 199, 0.15);
  color: #0284c7;
  border: 1.5px solid #0284c7;
}

.rank-name {
  flex: 1;
  text-align: left;
  font-weight: 800;
  font-size: 0.95rem;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 6px;
}

.badge-me-inline {
  font-size: 0.75rem;
  color: var(--matchbox-cyan);
  font-weight: normal;
}

.rank-score {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-family: 'Orbitron', sans-serif;
}

.rank-score strong {
  font-size: 1.15rem;
  color: var(--matchbox-gold);
}

.rank-score span {
  font-size: 0.6rem;
  color: var(--text-faint);
  letter-spacing: 0.5px;
}

.modal-buttons {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
}

.btn-muted {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0.75rem 1.4rem;
}

.btn-muted:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}
</style>
