import { ref } from 'vue'
import { io, type Socket } from 'socket.io-client'
import type {
  TankRoomState,
  TankRoomSummary,
  TankSnapshot,
  TankFullState,
  TankGameOver,
  Team
} from '~/types/tank'

const SESSION_KEY = 'tank-game-session'
const NAME_KEY = 'tank_player_name'

interface TankSession {
  roomCode: string
  playerId: string
}

let socket: Socket | null = null

const currentTankRoom = ref<TankRoomState | null>(null)
const myPlayerId = ref<string | null>(null)
const openTankRooms = ref<TankRoomSummary[]>([])
const isResuming = ref(false)
const notice = ref<string | null>(null)

// Match listeners are owned by the game component; the socket-level handlers below forward to them.
interface MatchHandlers {
  onFullState?: (state: TankFullState) => void
  onSnapshot?: (snapshot: TankSnapshot) => void
  onGameOver?: (data: TankGameOver) => void
}
let matchHandlers: MatchHandlers = {}
let pendingFullState: TankFullState | null = null

function readSession(): TankSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed?.roomCode && parsed?.playerId ? parsed : null
  } catch {
    return null
  }
}

function saveSession(roomCode: string, playerId: string) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode, playerId }))
  } catch {
    // storage unavailable: resume simply won't work after refresh
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

function resetLocalRoom() {
  currentTankRoom.value = null
  myPlayerId.value = null
  clearSession()
}

export function useTankSocket() {
  function getSocket(): Socket {
    if (!socket) {
      // Skip the HTTP long-polling handshake: go straight to WebSocket (falls back if blocked).
      socket = io({ transports: ['websocket', 'polling'] })
    }
    setupBaseListeners(socket)
    return socket
  }

  function setupBaseListeners(s: Socket) {
    if ((s as any)._hasTankBase) return
    ;(s as any)._hasTankBase = true

    s.on('tank_lobby_update', ({ rooms }) => {
      openTankRooms.value = rooms
    })

    s.on('tank_room_updated', ({ room }) => {
      if (currentTankRoom.value && room.roomCode === currentTankRoom.value.roomCode) {
        currentTankRoom.value = room
      }
    })

    s.on('tank_game_started', ({ room, state }: { room: TankRoomState; state: TankFullState }) => {
      currentTankRoom.value = room
      // The game component may not be mounted yet; it pulls the initial state from here on mount.
      pendingFullState = state
      matchHandlers.onFullState?.(state)
    })

    s.on('tank_state_full', (state: TankFullState) => {
      pendingFullState = state
      matchHandlers.onFullState?.(state)
    })

    s.on('tank_snapshot', (snapshot: TankSnapshot) => {
      matchHandlers.onSnapshot?.(snapshot)
    })

    s.on('tank_game_over', (data: TankGameOver) => {
      if (data.room) currentTankRoom.value = data.room
      matchHandlers.onGameOver?.(data)
    })

    s.on('tank_kicked', ({ message }: { message?: string }) => {
      resetLocalRoom()
      notice.value = message || 'Bạn đã bị chủ phòng mời ra khỏi phòng.'
    })

    // After a network drop the server assigns a new socket id: re-attach to our seat.
    s.on('connect', () => {
      if (!(s as any)._tankConnectedOnce) {
        ;(s as any)._tankConnectedOnce = true
        return
      }
      void resumeSession()
    })
  }

  function takePendingFullState() {
    const state = pendingFullState
    pendingFullState = null
    return state
  }

  function emitAck<T = any>(
    event: string,
    payload: any
  ): Promise<{ ok: boolean; data?: T; error?: { code?: string; message: string } }> {
    return new Promise((resolve) => {
      const s = getSocket()
      s.emit(event, payload, (res: { ok: boolean; data?: T; error?: { code?: string; message: string } }) => {
        resolve(res)
      })
    })
  }

  function setMatchHandlers(handlers: MatchHandlers) {
    getSocket()
    matchHandlers = handlers
  }

  function clearMatchHandlers() {
    matchHandlers = {}
  }

  function applyRoomResult(res: { ok: boolean; data?: any }, playerName?: string) {
    if (res.ok && res.data) {
      currentTankRoom.value = res.data.room
      myPlayerId.value = res.data.playerId
      saveSession(res.data.roomCode, res.data.playerId)
      if (playerName) {
        try {
          localStorage.setItem(NAME_KEY, playerName)
        } catch {
          // ignore
        }
      }
    }
  }

  // Restore the room/match we were in before a refresh or reconnect.
  async function resumeSession(): Promise<boolean> {
    const session = readSession()
    if (!session) return false
    isResuming.value = true
    try {
      const res = await emitAck('tank_resume_room', session)
      if (res.ok && res.data) {
        currentTankRoom.value = res.data.room
        myPlayerId.value = res.data.playerId
        return true
      }
      resetLocalRoom()
      return false
    } finally {
      isResuming.value = false
    }
  }

  async function listRooms() {
    const res = await emitAck<{ rooms: TankRoomSummary[] }>('tank_list_rooms', {})
    if (res.ok && res.data) {
      openTankRooms.value = res.data.rooms
    }
  }

  async function createRoom(playerName: string) {
    const res = await emitAck('tank_create_room', { playerName })
    applyRoomResult(res, playerName)
    return res
  }

  async function joinRoom(roomCode: string, playerName: string) {
    const res = await emitAck('tank_join_room', { roomCode, playerName })
    applyRoomResult(res, playerName)
    return res
  }

  async function switchTeam(team: Team) {
    return await emitAck<{ room: TankRoomState }>('tank_switch_team', { team })
  }

  async function toggleReady() {
    return await emitAck<{ room: TankRoomState }>('tank_toggle_ready', {})
  }

  async function startGame() {
    return await emitAck<{ room: TankRoomState }>('tank_start_game', {})
  }

  async function leaveRoom() {
    await emitAck('tank_leave_room', {})
    resetLocalRoom()
    await listRooms()
  }

  async function kickPlayer(targetPlayerId: string) {
    return await emitAck<{ room: TankRoomState }>('tank_kick_player', { targetPlayerId })
  }

  async function rematch() {
    return await emitAck<{ room: TankRoomState }>('tank_rematch', {})
  }

  function sendInput(dir: number, fire: boolean, fireSeq: number) {
    getSocket().emit('tank_input', { dir, fire, fireSeq })
  }

  function sendCommand(n: number, dir: number, fire: boolean) {
    getSocket().emit('tank_cmd', { n, dir, f: fire ? 1 : 0 })
  }

  return {
    socket: getSocket(),
    currentTankRoom,
    myPlayerId,
    openTankRooms,
    isResuming,
    notice,
    hasStoredSession: () => readSession() !== null,
    setMatchHandlers,
    clearMatchHandlers,
    takePendingFullState,
    resumeSession,
    listRooms,
    createRoom,
    joinRoom,
    switchTeam,
    toggleReady,
    startGame,
    leaveRoom,
    kickPlayer,
    sendInput,
    sendCommand,
    rematch
  }
}

