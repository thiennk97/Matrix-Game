<template>
  <div class="top1-panel-container">
    <!-- Sub-tab switcher -->
    <div class="top1-subtabs">
      <button
        class="subtab-btn"
        :class="{ active: activeSubTab === 'champions' }"
        @click="activeSubTab = 'champions'"
      >
        <LucideAward class="icon" /> Bảng Vàng
      </button>
      <button
        class="subtab-btn"
        :class="{ active: activeSubTab === 'history' }"
        @click="activeSubTab = 'history'"
      >
        <LucideHistory class="icon" /> Lịch Sử
        <span v-if="matchCount > 0" class="subtab-count">{{ matchCount }}</span>
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="matchCount === 0 || !top1Stats.length" class="top1-empty-state">
      <div class="empty-icon-wrap">
        <LucideCrown class="empty-crown-icon" />
      </div>
      <h4 class="empty-title">CHƯA CÓ DỮ LIỆU TOP 1</h4>
      <p class="empty-desc">
        Hoàn thành ván đấu và chọn <b>"Đấu Ván Mới"</b> để bắt đầu ghi danh các cao thủ đạt Top 1 trong phòng này!
      </p>
      <div class="empty-hint">
        <LucideSparkles class="hint-icon" />
        <span>Thống kê sẽ được giữ xuyên suốt các ván đấu trong cùng phòng.</span>
      </div>
    </div>

    <!-- Content when there are records -->
    <div v-else class="top1-content">
      <!-- Summary Bar -->
      <div class="room-stats-summary">
        <div class="summary-item">
          <span class="summary-label">Tổng số ván</span>
          <span class="summary-value highlight-num">{{ matchCount }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Số nhà vô địch</span>
          <span class="summary-value">{{ top1Stats.length }}</span>
        </div>
        <div v-if="leaderName" class="summary-item leader-summary">
          <span class="summary-label">Dẫn đầu phòng</span>
          <span class="summary-value leader-text">👑 {{ leaderName }}</span>
        </div>
      </div>

      <!-- VIEW 1: CHAMPIONS LIST -->
      <div v-if="activeSubTab === 'champions'" class="champions-list">
        <div
          v-for="(stat, idx) in top1Stats"
          :key="stat.id"
          class="champion-card"
          :class="[
            `tier-${getTierClass(idx)}`,
            { 'is-me': stat.id === store.myPlayerId }
          ]"
        >
          <div class="champ-left">
            <div class="champ-medal-box">
              <LucideCrown v-if="idx === 0" class="champ-crown gold-crown" />
              <LucideMedal v-else-if="idx === 1" class="champ-crown silver-crown" />
              <LucideMedal v-else-if="idx === 2" class="champ-crown bronze-crown" />
              <span v-else class="champ-rank-num">#{{ idx + 1 }}</span>
            </div>

            <div class="champ-info">
              <div class="champ-name-row">
                <span class="champ-name" :style="{ color: getPlayerColor(stat.seatIndex) }">
                  {{ stat.name }}
                </span>
                <span v-if="stat.id === store.myPlayerId" class="me-tag">(Bạn)</span>
              </div>
              <div class="champ-meta">
                <span class="meta-score">Điểm cao nhất: <b>{{ stat.highestScore }}</b> pts</span>
                <span class="meta-rate">Tỷ lệ: {{ Math.round((stat.top1Wins / matchCount) * 100) }}%</span>
              </div>
            </div>
          </div>

          <div class="champ-right">
            <div class="champ-wins-badge">
              <span class="wins-count">{{ stat.top1Wins }}</span>
              <span class="wins-label">lần Top 1</span>
            </div>
          </div>
        </div>
      </div>

      <!-- VIEW 2: MATCH HISTORY -->
      <div v-else class="history-list">
        <div
          v-for="entry in matchHistory"
          :key="entry.round"
          class="history-card"
        >
          <div class="history-card-header">
            <span class="round-tag">
              <LucideTrophy class="icon-round" /> Ván {{ entry.round }}
            </span>
            <span class="round-time">{{ formatTime(entry.endedAt) }}</span>
          </div>

          <div class="history-winners">
            <div
              v-for="winner in entry.winners"
              :key="winner.id"
              class="winner-pill"
            >
              <LucideCrown class="winner-crown" />
              <span class="winner-name" :style="{ color: getPlayerColor(winner.seatIndex) }">
                {{ winner.name }}
              </span>
              <span v-if="winner.id === store.myPlayerId" class="winner-me">(Bạn)</span>
              <span class="winner-score">{{ winner.score }} pts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '~/stores/game'
import { getPlayerColor } from '~/config/constants'
import {
  LucideAward,
  LucideHistory,
  LucideCrown,
  LucideMedal,
  LucideSparkles,
  LucideTrophy
} from '@lucide/vue'
import type { Top1Record, MatchHistoryEntry } from '~/types'

const props = withDefaults(
  defineProps<{
    matchCount?: number
    top1Stats?: Top1Record[]
    matchHistory?: MatchHistoryEntry[]
  }>(),
  {
    matchCount: 0,
    top1Stats: () => [],
    matchHistory: () => []
  }
)

const store = useGameStore()
const activeSubTab = ref<'champions' | 'history'>('champions')

const leaderName = computed(() => {
  if (!props.top1Stats.length) return ''
  return props.top1Stats[0].name
})

const getTierClass = (index: number) => {
  if (index === 0) return 'gold'
  if (index === 1) return 'silver'
  if (index === 2) return 'bronze'
  return 'standard'
}

const formatTime = (timestamp: number) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}
</script>

<style scoped>
.top1-panel-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
}

.top1-subtabs {
  display: flex;
  background: rgba(0, 0, 0, 0.25);
  padding: 3px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  gap: 4px;
}

.subtab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: transparent;
  border: none;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.subtab-btn:hover {
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.05);
}

.subtab-btn.active {
  background: rgba(249, 115, 22, 0.15);
  color: #fff;
  border: 1px solid rgba(249, 115, 22, 0.4);
  box-shadow: 0 0 10px rgba(249, 115, 22, 0.15);
}

.subtab-count {
  background: var(--matchbox-orange);
  color: #fff;
  font-size: 0.7rem;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 800;
}

/* Empty State */
.top1-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-4) var(--space-3);
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  gap: var(--space-2);
}

.empty-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(252, 211, 77, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.empty-crown-icon {
  width: 26px;
  height: 26px;
  color: var(--matchbox-gold);
  opacity: 0.7;
}

.empty-title {
  font-size: 0.88rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: var(--text-main);
}

.empty-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.45;
  margin: 0;
}

.empty-desc b {
  color: var(--matchbox-orange);
}

.empty-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 6px 10px;
  background: rgba(56, 189, 248, 0.08);
  border-radius: 6px;
  font-size: 0.72rem;
  color: var(--matchbox-cyan);
  line-height: 1.35;
}

.hint-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

/* Content */
.top1-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* Summary Bar */
.room-stats-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  gap: var(--space-2);
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.summary-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  color: var(--text-faint);
  font-weight: 700;
  letter-spacing: 0.03em;
}

.summary-value {
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--text-main);
}

.summary-value.highlight-num {
  color: var(--matchbox-orange);
  font-family: 'Fira Code', monospace;
}

.leader-summary {
  text-align: right;
  min-width: 0;
}

.leader-text {
  color: var(--matchbox-gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

/* Champions List */
.champions-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.champion-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  transition: all 0.25s ease;
  gap: var(--space-2);
}

.champion-card.is-me {
  border-color: rgba(249, 115, 22, 0.5);
  background: rgba(249, 115, 22, 0.08);
  box-shadow: 0 0 12px rgba(249, 115, 22, 0.12);
}

.champion-card.tier-gold {
  border-color: rgba(252, 211, 77, 0.5);
  background: linear-gradient(135deg, rgba(252, 211, 77, 0.12), rgba(249, 115, 22, 0.05));
  box-shadow: 0 0 14px rgba(252, 211, 77, 0.1);
}

.champion-card.tier-silver {
  border-color: rgba(226, 232, 240, 0.35);
  background: linear-gradient(135deg, rgba(226, 232, 240, 0.08), rgba(148, 163, 184, 0.04));
}

.champion-card.tier-bronze {
  border-color: rgba(217, 119, 6, 0.35);
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.08), rgba(180, 83, 9, 0.03));
}

.champ-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.champ-medal-box {
  width: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.champ-crown {
  width: 20px;
  height: 20px;
}

.champ-crown.gold-crown {
  color: var(--matchbox-gold);
  filter: drop-shadow(0 0 4px rgba(252, 211, 77, 0.7));
}

.champ-crown.silver-crown {
  color: #cbd5e1;
}

.champ-crown.bronze-crown {
  color: #d97706;
}

.champ-rank-num {
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-faint);
}

.champ-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.champ-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.champ-name {
  font-weight: 700;
  font-size: 0.94rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.me-tag {
  font-size: 0.7rem;
  color: var(--matchbox-orange);
  font-weight: 800;
  flex-shrink: 0;
}

.champ-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.72rem;
  color: var(--text-muted);
}

.meta-score b {
  color: var(--matchbox-gold);
}

.champ-right {
  flex-shrink: 0;
  text-align: right;
}

.champ-wins-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.3);
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
}

.wins-count {
  font-size: 1.15rem;
  font-weight: 900;
  color: var(--matchbox-gold);
  font-family: 'Fira Code', monospace;
  line-height: 1;
}

.wins-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  color: var(--text-faint);
  font-weight: 700;
  letter-spacing: 0.02em;
}

/* History List */
.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-height: 380px;
  overflow-y: auto;
  padding-right: 2px;
}

.history-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
}

.history-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.round-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--matchbox-orange);
  text-transform: uppercase;
}

.icon-round {
  width: 13px;
  height: 13px;
}

.round-time {
  font-size: 0.7rem;
  color: var(--text-faint);
  font-family: 'Fira Code', monospace;
}

.history-winners {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.winner-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(252, 211, 77, 0.1);
  border: 1px solid rgba(252, 211, 77, 0.3);
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 0.8rem;
}

.winner-crown {
  width: 14px;
  height: 14px;
  color: var(--matchbox-gold);
}

.winner-name {
  font-weight: 700;
}

.winner-me {
  font-size: 0.7rem;
  color: var(--matchbox-orange);
  font-weight: 800;
}

.winner-score {
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: var(--matchbox-gold);
  font-weight: 800;
  margin-left: 2px;
}
</style>
