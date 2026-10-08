<template>
  <div class="tank-page" :class="{ 'in-game': inGame }">
    <div v-if="!inGame" class="tank-nav-bar">
      <NuxtLink to="/" class="btn btn-secondary back-btn">
        <LucideArrowLeft class="icon" /> QUAY LẠI CHỌN GAME
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

    <div v-if="booting || isResuming" class="resuming">
      <LucideLoader2 class="icon spin" /> Đang khôi phục phòng của bạn...
    </div>
    <TankPvPGame v-else-if="inGame" />
    <TankLobby v-else />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { LucideArrowLeft, LucideGrid3x3, LucideShield, LucideSwords, LucideLoader2 } from '@lucide/vue'
import TankLobby from '~/components/tank/TankLobby.vue'
import TankPvPGame from '~/components/tank/TankPvPGame.vue'
import { useTankSocket } from '~/composables/useTankSocket'

const { currentTankRoom, isResuming, hasStoredSession, resumeSession, leaveRoom } = useTankSocket()

// Avoid flashing the lobby while a saved session is being restored.
const booting = ref(!currentTankRoom.value && hasStoredSession())

// FINISHED keeps the arena on screen so players can review the result before leaving.
const inGame = computed(() => !!currentTankRoom.value && currentTankRoom.value.status !== 'LOBBY')

onMounted(async () => {
  // Refreshing the tab (or coming back to it) re-attaches to the room/match we were in.
  try {
    if (!currentTankRoom.value) await resumeSession()
  } finally {
    booting.value = false
  }
})

onBeforeUnmount(() => {
  // Walking away from a waiting room frees the seat; an in-progress match stays resumable.
  if (currentTankRoom.value?.status === 'LOBBY') void leaveRoom()
})
</script>

<style scoped>
.tank-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: calc(100vh - 80px);
  width: 100%;
  padding: 0 var(--space-4) var(--space-6);
}

/* In a match the arena owns the viewport: no page padding, no scrolling. */
.tank-page.in-game {
  min-height: 0;
  padding: var(--space-2) 0 0;
  overflow: hidden;
}

.tank-nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
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
  background: var(--matchbox-cyan);
  color: #000;
  font-weight: 800;
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.4);
}

.resuming {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: var(--space-6);
  color: var(--text-muted);
  font-size: 0.9rem;
}

.spin {
  animation: tank-spin 1s linear infinite;
}

@keyframes tank-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .tank-nav-bar {
    flex-direction: column;
    gap: var(--space-3);
    align-items: stretch;
  }

  .game-switch-pills {
    justify-content: center;
  }
}
</style>
