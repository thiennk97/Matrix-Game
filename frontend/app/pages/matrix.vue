<template>
  <div class="matrix-page-container">
    <!-- Top Nav Bar -->
    <div class="matrix-nav-bar">
      <NuxtLink to="/" class="btn btn-secondary back-btn">
        <LucideArrowLeft class="icon" /> QUAY LẠI CHỌN GAME
      </NuxtLink>

      <div class="game-switch-pills">
        <span class="pill-item active">
          <LucideGrid3x3 class="icon" /> MATRIX BATTLE
        </span>
        <NuxtLink to="/tank" class="pill-item">
          <LucideShield class="icon" /> BATTLE CITY 1990
        </NuxtLink>
      </div>
    </div>

    <!-- Matrix Room Lobby Section -->
    <div class="index-header">
      <div class="header-titles">
        <h2>SẢNH CHỜ MATRIX BATTLE</h2>
        <p class="header-desc">Xếp số đối kháng thời gian thực (1–8 người chơi)</p>
      </div>
      <button class="btn btn-primary create-room-btn" @click="showCreateRoom">
        <LucidePlus class="icon" /> TẠO PHÒNG MỚI
      </button>
    </div>

    <div class="public-rooms-grid">
      <PublicRoomCard 
        v-for="room in store.publicRooms" 
        :key="room.roomCode" 
        :room="room" 
        @join="showJoinRoom(room.roomCode)" 
        @spectate="spectateRoom(room.roomCode)"
      />
      <div v-if="!store.publicRooms.length" class="empty-state grid-full-width">
        <LucideDoorOpen class="icon" />
        <p>Chưa có phòng nào đang chờ. Hãy bấm "TẠO PHÒNG MỚI" để lập phòng đầu tiên!</p>
      </div>
    </div>

    <NameModal 
      v-if="showNameModal || joiningRoomCode" 
      :is-create="!joiningRoomCode"
      @close="closeNameModal" 
      @submit="handleNameSubmit" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '~/stores/game'
import { useSocket } from '~/composables/useSocket'
import { 
  LucidePlus, 
  LucideDoorOpen, 
  LucideArrowLeft, 
  LucideGrid3x3, 
  LucideShield 
} from '@lucide/vue'

const store = useGameStore()
const { emitAck, applyRoomState } = useSocket()
const router = useRouter()
const route = useRoute()

const showNameModal = ref(false)
const joiningRoomCode = ref('')

onMounted(async () => {
  const roomParam = route.query.room
  if (typeof roomParam === 'string' && roomParam.trim()) {
    joiningRoomCode.value = roomParam.trim().toUpperCase()
    router.replace({ query: {} })
  }

  // Refresh room list
  const res = await emitAck('list_rooms', {})
  if (res.ok) {
    store.publicRooms = res.data.rooms
  }
})

const showCreateRoom = () => {
  joiningRoomCode.value = ''
  showNameModal.value = true
}

const showJoinRoom = (code: string) => {
  joiningRoomCode.value = code
  showNameModal.value = false
}

const closeNameModal = () => {
  showNameModal.value = false
  joiningRoomCode.value = ''
}

const handleNameSubmit = async (name: string, isCreate: boolean) => {
  const event = isCreate ? 'create_room' : 'join_room'
  const payload = isCreate
    ? { playerName: name }
    : { roomCode: joiningRoomCode.value, playerName: name }

  const res = await emitAck(event, payload)
  if (res.ok && res.data) {
    store.myPlayerIndex = res.data.playerIndex
    store.myPlayerId = res.data.playerId
    store.currentRoomCode = res.data.roomCode
    store.hasJoinedRoom = true
    store.isSpectating = false
    applyRoomState(res.data.state)
    localStorage.setItem('matrix-game-session', JSON.stringify({
      roomCode: res.data.roomCode,
      playerId: res.data.playerId
    }))
    await router.push(`/room/${res.data.roomCode}`)
  } else {
    alert(res.error?.message || 'Có lỗi xảy ra')
  }
}

const spectateRoom = async (code: string) => {
  const res = await emitAck('spectate_room', { roomCode: code })
  if (res.ok) {
    store.myPlayerIndex = -1
    store.myPlayerId = null
    store.currentRoomCode = code
    store.hasJoinedRoom = true
    store.isSpectating = true
    applyRoomState(res.data.state)
    store.spectateFocusedPlayerId = res.data.state.players[0]?.id ?? null
    localStorage.setItem('matrix-game-session', JSON.stringify({
      roomCode: code,
      playerId: null,
      isSpectating: true
    }))
    await router.push(`/preview/${code}`)
  } else {
    alert(res.error?.message)
  }
}
</script>

<style scoped>
.matrix-page-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: calc(100vh - 80px);
  width: 100%;
  padding: 0 var(--space-4) var(--space-6);
}

.matrix-nav-bar {
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

.index-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-4) var(--space-2) var(--space-5);
  width: 100%;
}

.header-titles h2 {
  font-family: 'Orbitron', sans-serif;
  color: var(--matchbox-gold);
  font-size: 1.5rem;
  margin: 0;
}

.header-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.create-room-btn {
  flex-shrink: 0;
  font-family: 'Orbitron', sans-serif;
  font-weight: 800;
  font-size: 0.85rem;
}

.public-rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-4);
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  text-align: center;
  color: var(--text-muted);
  padding: var(--space-6);
  background: var(--card-bg-soft);
  border-radius: var(--radius-md);
  border: 1px dashed var(--border);
}

.empty-state p {
  font-size: 0.95rem;
}

.empty-state .icon {
  width: 40px;
  height: 40px;
  color: var(--text-faint);
}

.grid-full-width {
  grid-column: 1 / -1;
}

@media (max-width: 768px) {
  .matrix-nav-bar {
    flex-direction: column;
    gap: var(--space-3);
    align-items: stretch;
  }
  .game-switch-pills {
    justify-content: center;
  }
  .index-header {
    flex-direction: column;
    gap: var(--space-3);
    align-items: flex-start;
  }
}
</style>
