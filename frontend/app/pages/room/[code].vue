<template>
  <GameRoomLayout
    :room-status="roomStatus"
    :sorted-players="sortedPlayers"
    show-piece-panel
  >
    <template #actions>
      <button v-if="roomStatus === 'FINISHED'" class="btn btn-sm btn-primary" @click="restartGame">
        <LucideRotateCcw class="icon" /> Đấu ván mới
      </button>
      <button class="btn btn-sm btn-muted" @click="leaveRoom">
        <LucideLogOut class="icon" /> Thoát phòng
      </button>
    </template>
  </GameRoomLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useGameStore } from '~/stores/game'
import { useSocket } from '~/composables/useSocket'
import { useLobbyNav } from '~/composables/useLobbyNav'
import { LucideRotateCcw, LucideLogOut } from '@lucide/vue'

const store = useGameStore()
const { emitAck, clearResultSnapshot } = useSocket()
const { goToIndex, leaveAndGoToIndex } = useLobbyNav()
const route = useRoute()

const roomCode = route.params.code as string
const roomStatus = computed(() => store.localRoomState?.status || 'LOBBY')

const sortedPlayers = computed(() => {
  if (!store.localRoomState?.players) return []
  return [...store.localRoomState.players].sort(
    (a, b) => (b.score || 0) - (a.score || 0) || (a.seatIndex || 0) - (b.seatIndex || 0)
  )
})

onMounted(() => {
  const isValidSession = store.hasJoinedRoom
    && store.currentRoomCode === roomCode
    && !store.isSpectating
  if (!isValidSession && !store.isRestoring) {
    goToIndex()
  }
})

const restartGame = async () => {
  const res = await emitAck('restart_game', {})
  if (!res?.ok) {
    alert(res?.error?.message)
    return
  }
  clearResultSnapshot(roomCode)
  store.frozenResults = null
  store.showVictoryModal = false
}

const leaveRoom = async () => {
  if (store.myPlayerId) {
    await emitAck('leave_room', {
      roomCode: store.currentRoomCode,
      playerId: store.myPlayerId
    })
  }
  await leaveAndGoToIndex()
}
</script>
