<template>
  <div class="app-view">
    <div class="room-session-actions">
      <slot name="actions" />
    </div>

    <div class="main-layout">
      <aside class="panel-section leaderboard-panel">
        <div class="panel-title">
          <span><LucideTrophy class="icon" /> Bảng Xếp Hạng</span>
        </div>
        <TransitionGroup tag="div" name="rank" class="match-list">
          <LeaderboardItem
            v-for="(player, idx) in sortedPlayers"
            :key="player.id"
            :player="player"
            :rank="idx"
          />
        </TransitionGroup>
      </aside>

      <div class="game-area">
        <div class="panel-section board-card">
          <div class="board-main">
            <LobbyView v-if="isLobby" />

            <div v-if="isPaused" class="game-pause-overlay">
              <h2><LucidePauseCircle class="icon" /> TRẬN ĐẤU BỊ TẠM DỪNG</h2>
              <p>Đang chờ người chơi kết nối lại...</p>
            </div>

            <div class="hud-slot">
              <HudPanel v-if="isPlaying" />
            </div>

            <GameBoard />
            <PiecePanel v-if="showPiecePanel" />
          </div>
        </div>
      </div>

      <ChatWidget />
    </div>

    <OpponentsPanel v-if="!isLobby" />

    <VictoryModal v-if="store.showVictoryModal" :players="victoryPlayers" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '~/stores/game'
import { useRoomStatus } from '~/composables/useRoomStatus'
import { LucideTrophy, LucidePauseCircle } from '@lucide/vue'
import type { Player } from '~/types'

const props = defineProps<{
  sortedPlayers: Player[]
  showPiecePanel?: boolean
}>()

const store = useGameStore()
const { isLobby, isPlaying, isPaused } = useRoomStatus()

const victoryPlayers = computed(() => {
  const source = store.frozenResults ?? props.sortedPlayers
  return [...source].sort(
    (a, b) => (b.score || 0) - (a.score || 0) || (a.seatIndex || 0) - (b.seatIndex || 0)
  )
})
</script>

<style scoped>

.app-view {
  gap: 0;
}

.main-layout {
  display: grid;
  grid-template-columns: 350px minmax(0, 1fr) 350px;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  max-width: 1650px;
  margin: 0 auto;
  width: 100%;
  flex: 1;
  align-items: stretch;
}

.game-area {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}

.leaderboard-panel {
  min-width: 0;
}

.leaderboard-panel .match-list {
  flex: 1;
  gap: var(--space-2);
  position: relative;
}

.rank-move {
  transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}

.rank-enter-active,
.rank-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.rank-enter-from,
.rank-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.rank-leave-active {
  position: absolute;
  width: 100%;
}

.leaderboard-panel .panel-title {
  font-size: 1rem;
  padding-bottom: var(--space-3);
}

.panel-section.board-card {
  flex-direction: row;
  align-items: stretch;
  justify-content: center;
  gap: var(--space-5);
  padding: var(--space-5);
}

.board-main {
  display: grid;
  grid-template-columns: minmax(0, 467px) auto;
  column-gap: 24px;
  row-gap: var(--space-5);
  justify-content: center;
  position: relative;
  width: 100%;
}

.hud-slot {
  grid-column: 1;
  min-height: 28px;
  width: 100%;
}

.pixi-board-container {
  grid-column: 1;
}

.piece-panel {
  grid-column: 2;
  align-self: start;
}

.panel-section {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  box-shadow: var(--shadow-card);
}

.room-session-actions {
  align-items: center;
  display: flex;
  justify-content: flex-end;
  margin: var(--space-3) var(--space-5) 0;
  gap: var(--space-2);
}

.game-pause-overlay h2 {
  color: var(--matchbox-red);
  font-family: 'Orbitron', sans-serif;
}

.game-pause-overlay p {
  color: var(--text-muted);
}

@media (max-width: 1180px) {

  .room-session-actions {
    margin: var(--space-3) 0.5rem 0;
    min-width: 0;
  }

  .main-layout {
    grid-template-columns: 1fr;
    padding: 0.5rem;
    gap: 0.5rem;
    min-width: 0;
  }

  .game-area {
    order: 1;
    width: 100%;
  }

  .leaderboard-panel {
    order: 2;
    width: 100%;
  }

  .board-main {
    column-gap: var(--space-3);
    min-width: 0;
  }

  .pixi-board-container {
    min-width: 0;
  }

  .leaderboard-panel .match-list {
    max-height: none;
  }

  .panel-section.board-card {
    flex-direction: column;
    align-items: center;
    padding: 0.75rem;
    min-width: 0;
    overflow: hidden;
    width: 100%;
  }
}

@media (max-width: 480px) {

  .room-session-actions {
    flex-wrap: wrap;
  }

  .main-layout {
    padding: var(--space-2);
  }

  .panel-section {
    padding: var(--space-3);
  }

  .panel-section.board-card {
    padding: var(--space-2);
  }

  .board-main {
    gap: var(--space-3);
  }
}
</style>
