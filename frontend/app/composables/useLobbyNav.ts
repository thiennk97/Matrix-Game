import { useRouter } from 'vue-router'
import { useGameStore } from '~/stores/game'
import { useSocket } from '~/composables/useSocket'

export function useLobbyNav() {
  const store = useGameStore()
  const router = useRouter()
  const { emitAck, resetSession, clearResultSnapshot } = useSocket()

  const refreshRoomList = async () => {
    const res = await emitAck('list_rooms', {})
    if (res?.ok) store.publicRooms = res.data.rooms
  }

  const goToIndex = async () => {
    router.push('/')
    await refreshRoomList()
  }

  const leaveAndGoToIndex = async () => {
    if (store.currentRoomCode) clearResultSnapshot(store.currentRoomCode)
    resetSession()
    localStorage.removeItem('matrix-game-session')
    await goToIndex()
  }

  return { goToIndex, leaveAndGoToIndex, refreshRoomList }
}
