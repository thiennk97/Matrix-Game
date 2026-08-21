<template>
  <div class="app-view">
    <div class="index-header">
      <h2>Danh Sách Phòng</h2>
      <button class="btn btn-primary" @click="showCreateRoom">
        <LucidePlus class="icon" /> TẠO PHÒNG
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
        <p>Chưa có phòng nào</p>
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
import { LucidePlus, LucideDoorOpen } from '@lucide/vue'

const store = useGameStore()
const { emitAck, applyRoomState } = useSocket()
const router = useRouter()
const route = useRoute()

const showNameModal = ref(false)
const joiningRoomCode = ref('')

onMounted(() => {
  const roomParam = route.query.room
  if (typeof roomParam === 'string' && roomParam.trim()) {
    joiningRoomCode.value = roomParam.trim().toUpperCase()
    router.replace({ query: {} })
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

.index-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-5);
  width: 100%;
}

.index-header h2 {
  font-family: 'Orbitron', sans-serif;
  color: var(--matchbox-gold);
  margin: 0;
}

.index-header .btn {
  flex-shrink: 0;
}

.public-rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-3);
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 0 var(--space-5) var(--space-5);
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

@media (max-width: 1180px) {

  .public-rooms-grid {
    grid-template-columns: 1fr;
    padding: 0 var(--space-3) var(--space-4);
  }
}

@media (min-width: 769px) and (max-width: 1180px) {
  .public-rooms-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    padding: 0 var(--space-5) var(--space-5);
  }
}

@media (max-width: 480px) {

  .index-header {
    gap: var(--space-2);
    padding: var(--space-4) var(--space-3);
  }

  .index-header h2 {
    font-size: 1.1rem;
  }

  .index-header .btn {
    font-size: 0.78rem;
    padding: 0.6rem 0.85rem;
  }
}
</style>
