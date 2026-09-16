<template>
  <div class="caro-page-container">
    <!-- Top Nav Bar with 3-Game Switcher -->
    <div class="caro-nav-bar">
      <NuxtLink to="/" class="btn btn-secondary back-btn">
        <LucideArrowLeft class="icon" /> QUAY LẠI TRANG CHỦ
      </NuxtLink>

      <div class="game-switch-pills">
        <NuxtLink to="/matrix" class="pill-item">
          <LucideGrid3x3 class="icon" /> MATRIX BATTLE
        </NuxtLink>
        <NuxtLink to="/tank" class="pill-item">
          <LucideShield class="icon" /> BATTLE CITY 1990
        </NuxtLink>
        <span class="pill-item active">
          <LucideSwords class="icon" /> CỜ CARO ONLINE
        </span>
      </div>
    </div>

    <!-- Mode Selector Tabs: PvP Online vs Solo AI -->
    <div class="caro-mode-tabs">
      <button
        class="mode-tab-btn"
        :class="{ active: activeMode === 'pvp' }"
        @click="activeMode = 'pvp'"
      >
        <LucideSwords class="icon" /> ĐỐI KHÁNG ONLINE (2 NGƯỜI)
        <span class="hot-badge">PVP</span>
      </button>

      <button
        class="mode-tab-btn"
        :class="{ active: activeMode === 'solo' }"
        @click="activeMode = 'solo'"
      >
        <LucideBot class="icon" /> TẬP LUYỆN (SOLO VS BOT AI)
      </button>
    </div>

    <!-- MODE 1: SOLO VS BOT AI -->
    <template v-if="activeMode === 'solo'">
      <div class="caro-hero-header">
        <h1>CHẾ ĐỘ TẬP LUYỆN</h1>
        <p class="subtitle">Đấu trí với Bot AI thông minh, hỗ trợ hoàn tác nước đi và 3 cấp độ khó</p>
      </div>
      <CaroSoloGame />
    </template>

    <!-- MODE 2: 2-PLAYER ONLINE PVP -->
    <template v-else>
      <!-- If in-game playing or finished, show PvP Game Screen -->
      <CaroPvPGame v-if="currentCaroRoom && currentCaroRoom.status !== 'LOBBY'" />

      <!-- Otherwise show Lobby / Waiting Room -->
      <CaroLobby v-else />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  LucideArrowLeft,
  LucideGrid3x3,
  LucideShield,
  LucideSwords,
  LucideBot
} from '@lucide/vue'
import CaroLobby from '~/components/caro/CaroLobby.vue'
import CaroPvPGame from '~/components/caro/CaroPvPGame.vue'
import CaroSoloGame from '~/components/caro/CaroSoloGame.vue'
import { useCaroSocket } from '~/composables/useCaroSocket'

const { currentCaroRoom } = useCaroSocket()
const activeMode = ref<'pvp' | 'solo'>('pvp')
</script>

<style scoped>
.caro-page-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: calc(100vh - 80px);
  width: 100%;
  padding: 0 var(--space-4) var(--space-6);
}

.caro-nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1040px;
  width: 100%;
  padding: var(--space-4) 0;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.back-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  text-decoration: none;
  font-size: 0.85rem;
}

.game-switch-pills {
  display: flex;
  background: var(--card-bg-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 4px;
  gap: 4px;
  flex-wrap: wrap;
}

.pill-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-family: 'Orbitron', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  text-decoration: none;
  color: var(--text-muted);
  transition: all 0.2s;
}

.pill-item:hover:not(.active) {
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.05);
}

.pill-item.active {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.4);
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.2);
}

/* Mode Tabs */
.caro-mode-tabs {
  display: flex;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 5px;
  gap: 6px;
  margin-bottom: var(--space-5);
  box-shadow: var(--shadow-card);
}

.mode-tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: var(--radius-md);
  border: none;
  background: none;
  color: var(--text-muted);
  font-family: 'Orbitron', sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.25s;
}

.mode-tab-btn.active {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.4);
  box-shadow: 0 0 14px rgba(56, 189, 248, 0.2);
}

.hot-badge {
  font-size: 0.65rem;
  background: #ef4444;
  color: #fff;
  padding: 1px 6px;
  border-radius: 999px;
  font-weight: 900;
}

.caro-hero-header {
  text-align: center;
  margin-bottom: var(--space-4);
}

.caro-hero-header h1 {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.6rem;
  font-weight: 900;
  color: var(--matchbox-gold);
  margin-bottom: 4px;
}

.caro-hero-header .subtitle {
  font-size: 0.88rem;
  color: var(--text-muted);
}
</style>
