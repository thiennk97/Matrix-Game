import { computed } from 'vue'
import { useGameStore } from '~/stores/game'
import { isLobbyStatus, isPlayingStatus, isPausedStatus, isFinishedStatus } from '~/utils/roomStatus'

export function useRoomStatus() {
  const store = useGameStore()
  const status = computed(() => store.localRoomState?.status)

  return {
    status,
    isLobby: computed(() => isLobbyStatus(status.value)),
    isPlaying: computed(() => isPlayingStatus(status.value)),
    isPaused: computed(() => isPausedStatus(status.value)),
    isFinished: computed(() => isFinishedStatus(status.value)),
  }
}
