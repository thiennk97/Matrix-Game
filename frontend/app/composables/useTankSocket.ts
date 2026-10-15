import { ref } from 'vue'
import { Client, type Room } from '@colyseus/sdk'
import type {
  TankRoomState,
  TankRoomSummary,
  TankSnapshot,
  TankFullState,
  TankGameOver,
  SnapTank,
  SnapBullet,
  SnapEvent,
  Direction,
  Team
} from '~/types/tank'

const SESSION_KEY = 'tank-game-session'
const NAME_KEY = 'tank_player_name'

interface TankSession {
  roomCode: string
  playerId: string
}

let colyseusClient: Client | null = null
let currentRoom: Room | null = null

const currentTankRoom = ref<TankRoomState | null>(null)
const myPlayerId = ref<string | null>(null)
const openTankRooms = ref<TankRoomSummary[]>([])
const isResuming = ref(false)
const notice = ref<string | null>(null)

interface MatchHandlers {
  onFullState?: (state: TankFullState) => void
  onSnapshot?: (snapshot: TankSnapshot) => void
  onGameOver?: (data: TankGameOver) => void
}
let matchHandlers: MatchHandlers = {}
let pendingFullState: TankFullState | null = null
let bufferedEvents: SnapEvent[] = []

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
    // storage unavailable
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
  if (currentRoom) {
    try {
      currentRoom.leave()
    } catch {
      // ignore
    }
    currentRoom = null
  }
}

function getClient(): Client {
  if (!colyseusClient) {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const endpoint = `${protocol}//${window.location.host}`
      colyseusClient = new Client(endpoint)
    } else {
      colyseusClient = new Client('ws://localhost:4000')
    }
  }
  return colyseusClient
}

function mapStateToRoom(state: any): TankRoomState {
  const players: any[] = []
  if (state.players) {
    const pValues = typeof state.players.values === 'function'
      ? Array.from(state.players.values())
      : Object.values(state.players)

    for (const p of pValues as any[]) {
      players.push({
        id: p.id,
        name: p.name,
        team: p.team as Team,
        seat: p.seat,
        ready: Boolean(p.ready),
        connected: Boolean(p.connected),
        kills: p.kills ?? 0,
        deaths: p.deaths ?? 0,
        lives: p.lives ?? 3
      })
    }
  }

  return {
    roomCode: state.roomCode || '',
    hostPlayerId: state.hostPlayerId || '',
    status: state.status || 'LOBBY',
    mapIndex: state.mapIndex ?? 0,
    mapName: state.mapName || 'Stage 1',
    players,
    eagles: {
      blue: { alive: state.blueEagleAlive ?? true },
      red: { alive: state.redEagleAlive ?? true }
    },
    winner: (state.winner as Team) || null,
    gameOverReason: (state.gameOverReason as 'eagle' | 'lives') || null,
    teamScores: { blue: state.blueScore ?? 0, red: state.redScore ?? 0 },
    createdAt: state.createdAt ?? Date.now()
  }
}

function buildSnapshotFromState(state: any): TankSnapshot {
  const tanks: SnapTank[] = []
  if (state.tanks) {
    const tValues = typeof state.tanks.values === 'function'
      ? Array.from(state.tanks.values())
      : Object.values(state.tanks)

    for (const t of tValues as any[]) {
      tanks.push({
        id: t.id,
        x: t.x,
        y: t.y,
        dir: (t.dir ?? 0) as Direction,
        alive: Boolean(t.alive),
        ack: t.ack ?? 0,
        shield: Boolean(t.shield),
        lives: t.lives ?? 3,
        kills: t.kills ?? 0,
        deaths: t.deaths ?? 0,
        online: Boolean(t.online)
      })
    }
  }

  const bullets: SnapBullet[] = []
  if (state.bullets) {
    const bValues = typeof state.bullets.values === 'function'
      ? Array.from(state.bullets.values())
      : Object.values(state.bullets)

    for (const b of bValues as any[]) {
      bullets.push({
        id: b.id,
        x: b.x,
        y: b.y,
        dir: (b.dir ?? 0) as Direction,
        team: (b.team || 'blue') as Team,
        o: b.o || '',
        c: b.c ?? 0
      })
    }
  }

  const events = bufferedEvents
  bufferedEvents = []

  return {
    tick: state.tick ?? 0,
    countdown: state.countdown ?? 0,
    tanks,
    bullets,
    events
  }
}

function attachRoomListeners(room: Room) {
  currentRoom = room

  room.onMessage('session_info', ({ playerId, roomCode }: { playerId: string; roomCode: string }) => {
    myPlayerId.value = playerId
    saveSession(roomCode, playerId)
  })

  room.onMessage('full_state', (state: TankFullState) => {
    pendingFullState = state
    matchHandlers.onFullState?.(state)
  })

  room.onMessage('tank_events', (events: SnapEvent[]) => {
    bufferedEvents.push(...events)
  })

  room.onMessage('tank_game_over', (data: TankGameOver) => {
    if (currentTankRoom.value) {
      currentTankRoom.value.status = 'FINISHED'
      currentTankRoom.value.winner = data.winner
      currentTankRoom.value.gameOverReason = data.reason
    }
    matchHandlers.onGameOver?.(data)
  })

  room.onMessage('kicked', ({ message }: { message?: string }) => {
    resetLocalRoom()
    notice.value = message || 'Bạn đã bị chủ phòng mời ra khỏi phòng.'
  })

  room.onMessage('error', ({ message }: { message?: string }) => {
    if (message) notice.value = message
  })

  // Binary schema state change handler (60Hz)
  room.onStateChange((state: any) => {
    currentTankRoom.value = mapStateToRoom(state)

    if (state.status === 'PLAYING') {
      const snap = buildSnapshotFromState(state)
      matchHandlers.onSnapshot?.(snap)
    }
  })

  room.onLeave((code) => {
    if (code !== 1000) {
      // Unclean disconnect: attempt resume
      void resumeSession()
    }
  })
}

export function useTankSocket() {
  function setMatchHandlers(handlers: MatchHandlers) {
    matchHandlers = handlers
  }

  function clearMatchHandlers() {
    matchHandlers = {}
  }

  function takePendingFullState() {
    const s = pendingFullState
    pendingFullState = null
    return s
  }

  async function listRooms() {
    try {
      const res = await fetch('/api/tank/rooms')
      const json = await res.json()
      if (json.ok && Array.isArray(json.rooms)) {
        openTankRooms.value = json.rooms
      }
    } catch (err) {
      console.error('Failed to list tank rooms:', err)
    }
  }

  async function createRoom(playerName: string) {
    try {
      const client = getClient()
      const room = await client.create('tank_room', { playerName })
      attachRoomListeners(room)
      try {
        localStorage.setItem(NAME_KEY, playerName)
      } catch {
        // ignore
      }
      return { ok: true, data: { roomCode: room.state?.roomCode || '', room: currentTankRoom.value } }
    } catch (err: any) {
      return { ok: false, error: { message: err?.message || 'Không thể tạo phòng.' } }
    }
  }

  async function joinRoom(roomCode: string, playerName: string) {
    try {
      const client = getClient()
      const room = await client.joinOrCreate('tank_room', { roomCode, playerName })
      attachRoomListeners(room)
      try {
        localStorage.setItem(NAME_KEY, playerName)
      } catch {
        // ignore
      }
      return { ok: true, data: { roomCode, room: currentTankRoom.value } }
    } catch (err: any) {
      return { ok: false, error: { message: err?.message || 'Không thể vào phòng.' } }
    }
  }

  async function resumeSession(): Promise<boolean> {
    const session = readSession()
    if (!session) return false
    isResuming.value = true
    try {
      const client = getClient()
      const room = await client.joinOrCreate('tank_room', {
        roomCode: session.roomCode,
        playerId: session.playerId
      })
      attachRoomListeners(room)
      myPlayerId.value = session.playerId
      return true
    } catch {
      resetLocalRoom()
      return false
    } finally {
      isResuming.value = false
    }
  }

  async function switchTeam(team: Team) {
    if (!currentRoom) return { ok: false }
    currentRoom.send('switch_team', { team })
    return { ok: true }
  }

  async function toggleReady() {
    if (!currentRoom) return { ok: false }
    currentRoom.send('toggle_ready')
    return { ok: true }
  }

  async function startGame() {
    if (!currentRoom) return { ok: false }
    currentRoom.send('start_game')
    return { ok: true }
  }

  async function leaveRoom() {
    resetLocalRoom()
    await listRooms()
    return { ok: true }
  }

  async function kickPlayer(targetPlayerId: string) {
    if (!currentRoom) return { ok: false }
    currentRoom.send('kick_player', { targetPlayerId })
    return { ok: true }
  }

  async function rematch() {
    if (!currentRoom) return { ok: false }
    currentRoom.send('rematch')
    return { ok: true }
  }

  function sendInput(dir: number, fire: boolean, fireSeq: number) {
    if (!currentRoom) return
    currentRoom.send('input', { dir, fire, fireSeq })
  }

  function sendCommand(n: number, dir: number, fire: boolean) {
    if (!currentRoom) return
    currentRoom.send('cmd', { n, dir, f: fire ? 1 : 0 })
  }

  return {
    socket: null,
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
