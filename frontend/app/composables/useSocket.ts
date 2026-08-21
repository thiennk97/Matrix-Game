import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'
import { useGameStore } from '~/stores/game'
import { navigateTo } from '#app'
import type { RoomState, ChatMessage } from '~/types'
import { isFinishedStatus } from '~/utils/roomStatus'

interface AckResponse {
  ok: boolean
  data?: any
  error?: { message: string }
}

const VICTORY_MODAL_DELAY_MS = 500
const TURN_LOCK_DURATION_MS = 500
const RESULT_SNAPSHOT_PREFIX = 'matrix-game-result:'

let socket: Socket | null = null
let victoryModalTimer: ReturnType<typeof setTimeout> | null = null
let turnLockTimer: ReturnType<typeof setTimeout> | null = null

function saveResultSnapshot(roomCode: string, players: RoomState['players']) {
  try {
    localStorage.setItem(RESULT_SNAPSHOT_PREFIX + roomCode, JSON.stringify(players))
  } catch {
  }
}

function loadResultSnapshot(roomCode: string): RoomState['players'] | null {
  try {
    const raw = localStorage.getItem(RESULT_SNAPSHOT_PREFIX + roomCode)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function clearResultSnapshot(roomCode: string) {
  localStorage.removeItem(RESULT_SNAPSHOT_PREFIX + roomCode)
}

function resetSession() {
  if (victoryModalTimer) {
    clearTimeout(victoryModalTimer)
    victoryModalTimer = null
  }
  if (turnLockTimer) {
    clearTimeout(turnLockTimer)
    turnLockTimer = null
  }
  useGameStore().resetState()
}

function applyRoomState(state: RoomState) {
  const store = useGameStore()
  if (!state) return

  const current = store.localRoomState
  if (current && state.stateVersion < current.stateVersion) return

  // Preserve optimistic move if incoming server state is from the same turn but hasn't registered our move yet
  if (current && state.turn === current.turn && store.myPlayerId && !store.isSpectating) {
    const currentMyPlayer = current.players?.find((p) => p.id === store.myPlayerId)
    const incomingMyPlayer = state.players?.find((p) => p.id === store.myPlayerId)
    if (currentMyPlayer?.hasPlacedThisRound && incomingMyPlayer && !incomingMyPlayer.hasPlacedThisRound) {
      incomingMyPlayer.hasPlacedThisRound = true
      incomingMyPlayer.board = currentMyPlayer.board
      incomingMyPlayer.score = currentMyPlayer.score
      incomingMyPlayer.matchedLines = currentMyPlayer.matchedLines
    }
  }

  const isFirstState = !current
  const wasFinished = isFinishedStatus(current?.status)
  const nowFinished = isFinishedStatus(state.status)

  if (state.turn !== store.currentTurn) {
    if (isPlayingStatus(state.status) && store.currentTurn !== -1) {
      store.isTurnLocked = true
      if (turnLockTimer) clearTimeout(turnLockTimer)
      turnLockTimer = setTimeout(() => {
        store.isTurnLocked = false
        turnLockTimer = null
      }, TURN_LOCK_DURATION_MS)
    } else {
      store.isTurnLocked = false
      if (turnLockTimer) {
        clearTimeout(turnLockTimer)
        turnLockTimer = null
      }
    }
    store.currentTurn = state.turn
  } else if (!isPlayingStatus(state.status)) {
    store.isTurnLocked = false
    if (turnLockTimer) {
      clearTimeout(turnLockTimer)
      turnLockTimer = null
    }
  }
  store.localRoomState = state
  store.timeLeft = state.timeLeft
  store.turnEndsAt = state.turnEndsAt || null

  if (nowFinished && !wasFinished) {
    if (victoryModalTimer) clearTimeout(victoryModalTimer)
    store.frozenResults = state.players
    saveResultSnapshot(state.roomCode, state.players)
    if (isFirstState) {
      store.showVictoryModal = true
    } else {
      victoryModalTimer = setTimeout(() => {
        if (isFinishedStatus(store.localRoomState?.status)) {
          store.showVictoryModal = true
        }
      }, VICTORY_MODAL_DELAY_MS)
    }
  }
}

export const useSocket = () => {
  const store = useGameStore()

  if (!socket) {
    socket = io({ autoConnect: false })

    socket.on('connect', () => {
    })

    socket.on('room_state_update', applyRoomState)

    socket.on('timer_tick', ({ timeLeft, turnEndsAt }: { timeLeft: number; turnEndsAt?: number | null }) => {
      store.timeLeft = timeLeft
      if (turnEndsAt !== undefined) {
        store.turnEndsAt = turnEndsAt
      }
    })

    socket.on('chat_message', (msg: ChatMessage) => {
      store.chatMessages.push(msg)
      if (store.chatMessages.length > 50) {
        store.chatMessages.shift()
      }

      const num = parseInt(msg.msg.trim(), 10)
      if (!isNaN(num) && num >= 1 && num <= 40) {
        const audio = new Audio(`/audio/taunts/${num}.ogg`)
        audio.play().catch(() => {})
      }
    })

    socket.on('lobby_rooms_update', ({ rooms }: { rooms: typeof store.publicRooms }) => {
      store.publicRooms = rooms
    })

    socket.on('kicked_from_room', () => {
      resetSession()
      navigateTo('/')
      socket?.emit('list_rooms', {}, (res: AckResponse) => {
        if (res.ok && res.data) {
          store.publicRooms = res.data.rooms as typeof store.publicRooms
        }
      })
    })
  }

  const connect = () => {
    if (!socket?.connected) {
      socket?.connect()
    }
  }

  const emit = (event: string, payload: unknown = {}) => {
    socket?.emit(event, payload)
  }

  const emitAck = (event: string, payload: unknown = {}): Promise<AckResponse> => {
    return new Promise((resolve) => {
      socket?.emit(event, payload, (res: AckResponse) => resolve(res))
    })
  }

  return {
    socket,
    connect,
    emit,
    emitAck,
    applyRoomState,
    resetSession,
    loadResultSnapshot,
    clearResultSnapshot
  }
}
