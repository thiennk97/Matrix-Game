<template>
  <div class="tank-page-container">
    <div class="tank-nav-bar">
      <NuxtLink to="/" class="btn btn-secondary back-btn">
        <LucideArrowLeft class="icon" /> QUAY LẠI TRANG CHỦ
      </NuxtLink>

      <div class="game-switch-pills">
        <NuxtLink to="/matrix" class="pill-item">
          <LucideGrid3x3 class="icon" /> MATRIX BATTLE
        </NuxtLink>
        <span class="pill-item active">
          <LucideShield class="icon" /> BATTLE CITY 1990
        </span>
        <NuxtLink to="/caro" class="pill-item">
          <LucideSwords class="icon" /> CỜ CARO ONLINE
        </NuxtLink>
      </div>
    </div>

    <!-- Mode Selector: Solo Bot vs 2-Team Online PvP -->
    <div class="tank-mode-tabs">
      <button 
        class="mode-tab-btn" 
        :class="{ active: activeMode === 'pvp' }"
        @click="activeMode = 'pvp'"
      >
        <LucideSwords class="icon" /> ĐỐI KHÁNG 2 ĐỘI (ONLINE 4P)
        <span class="hot-badge">PVP</span>
      </button>

      <button 
        class="mode-tab-btn" 
        :class="{ active: activeMode === 'solo' }"
        @click="activeMode = 'solo'"
      >
        <LucideBot class="icon" /> TẬP LUYỆN (SOLO VS BOT)
      </button>
    </div>

    <!-- MODE 1: SOLO VS BOTS -->
    <template v-if="activeMode === 'solo'">
      <div class="tank-hero-header">
        <h1>CHẾ ĐỘ TẬP LUYỆN</h1>
        <p class="subtitle">Bắn xe tăng diệt 20 bot AI và bảo vệ đại bàng kinh điển</p>
      </div>
      <TankGame />
    </template>

    <!-- MODE 2: 2-TEAM ONLINE PVP -->
    <template v-else>
      <!-- If in-game playing or finished, show Canvas Engine -->
      <TankPvPGame v-if="currentTankRoom && currentTankRoom.status !== 'LOBBY'" />

      <!-- Otherwise show Lobby / Waiting Room -->
      <TankLobby v-else />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { LucideArrowLeft, LucideGrid3x3, LucideShield, LucideSwords, LucideBot } from '@lucide/vue'
import TankGame from '~/components/tank/TankGame.vue'
import TankLobby from '~/components/tank/TankLobby.vue'
import TankPvPGame from '~/components/tank/TankPvPGame.vue'
import { useTankSocket } from '~/composables/useTankSocket'

const { currentTankRoom } = useTankSocket()
const activeMode = ref<'pvp' | 'solo'>('pvp')
</script>

<style scoped>
.tank-page-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: calc(100vh - 80px);
  width: 100%;
  padding: 0 var(--space-4) var(--space-6);
}

.tank-nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 960px;
  width: 100%;
  padding: var(--space-4) 0;
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
  background: var(--matchbox-orange);
  color: white;
  box-shadow: 0 0 12px rgba(249, 115, 22, 0.4);
}

.tank-mode-tabs {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  background: var(--card-bg);
  border: 1px solid var(--border);
  padding: 6px;
  border-radius: var(--radius-md);
}

.mode-tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-muted);
  font-family: 'Orbitron', sans-serif;
  font-weight: 800;
  font-size: 0.82rem;
  padding: 8px 18px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.mode-tab-btn:hover:not(.active) {
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.04);
}

.mode-tab-btn.active {
  background: var(--matchbox-orange);
  color: white;
  box-shadow: 0 0 16px rgba(249, 115, 22, 0.35);
}

.hot-badge {
  background: #ef4444;
  color: white;
  font-size: 0.65rem;
  padding: 1px 6px;
  border-radius: 999px;
}

.tank-hero-header {
  text-align: center;
  margin-bottom: var(--space-4);
}

.tank-hero-header h1 {
  font-family: 'Orbitron', sans-serif;
  color: var(--matchbox-gold);
  font-size: 1.6rem;
  letter-spacing: 2px;
  margin-bottom: 4px;
}

.tank-hero-header .subtitle {
  color: var(--text-muted);
  font-size: 0.85rem;
}

@media (max-width: 600px) {
  .tank-nav-bar {
    flex-direction: column;
    gap: var(--space-3);
    align-items: stretch;
  }
  
  .tank-mode-tabs {
    flex-direction: column;
    width: 100%;
  }

  .mode-tab-btn {
    justify-content: center;
  }
}

:fullscreen .tank-nav-bar,
:fullscreen .tank-mode-tabs,
:fullscreen .tank-hero-header {
  display: none !important;
}

:fullscreen {
  overflow: hidden !important;
}
</style>
