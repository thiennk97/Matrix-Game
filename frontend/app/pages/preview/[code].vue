<template>
  <GameRoomLayout
    :room-status="roomStatus"
    :sorted-players="sortedPlayers"
  >
    <template #actions>
      <button class="btn btn-sm btn-muted" @click="leaveRoom">
        <LucideLogOut class="icon" /> Ngừng xem
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
import { LucideLogOut } from '@lucide/vue'

const store = useGameStore()
const { emitAck } = useSocket()
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
    && store.isSpectating
  if (!isValidSession && !store.isRestoring) {
    goToIndex()
  }
})

const leaveRoom = async () => {
  await emitAck('stop_spectating', { roomCode: store.currentRoomCode })
  await leaveAndGoToIndex()
}
</script>
