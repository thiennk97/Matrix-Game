import { ref } from 'vue'
import { io, type Socket } from 'socket.io-client'
import type { TankRoomState, TankRoomSummary, Team } from '~/types/tank'

let socket: Socket | null = null

const currentTankRoom = ref<TankRoomState | null>(null)
const myPlayerId = ref<string | null>(null)
const openTankRooms = ref<TankRoomSummary[]>([])

export function useTankSocket() {
  function getSocket(): Socket {
    if (!socket) {
      socket = io()
    }
    setupBaseListeners(socket)
    return socket
  }

  function setupBaseListeners(s: Socket) {
    if ((s as any)._hasTankBase) return
    (s as any)._hasTankBase = true

    s.on('tank_lobby_update', ({ rooms }) => {
      openTankRooms.value = rooms
    })

    s.on('tank_room_updated', ({ room }) => {
      currentTankRoom.value = room
    })

    s.on('tank_game_started', ({ room }) => {
      currentTankRoom.value = room
    })

    s.on('tank_kicked', ({ message }: { message?: string }) => {
      currentTankRoom.value = null
      myPlayerId.value = null
      alert(message || 'Bạn đã bị chủ phòng kích khỏi phòng.')
    })
  }

  function emitAck<T = any>(event: string, payload: any): Promise<{ ok: boolean; data?: T; error?: { message: string } }> {
    return new Promise((resolve) => {
      const s = getSocket()
      s.emit(event, payload, (res: { ok: boolean; data?: T; error?: { message: string } }) => {
        resolve(res)
      })
    })
  }

  function initTankListeners(handlers?: {
    onRemoteMove?: (data: { socketId: string; x: number; y: number; dir: number }) => void
    onRemoteRespawn?: (data: { playerId: string; x: number; y: number; dir: number }) => void
    onRemoteShoot?: (data: { x: number; y: number; dir: number; power: number; ownerId: string; ownerTeam: Team }) => void
    onRemoteTile?: (data: { row: number; col: number; newType: number; hp?: number }) => void
    onRemoteKill?: (data: { victimId: string; killerId: string; victimLives?: number; room: TankRoomState }) => void
    onGameOver?: (data: { winner: Team; reason?: 'eagle' | 'lives'; destroyedTeam?: Team; room: TankRoomState }) => void
  }) {
    const s = getSocket()

    s.off('tank_remote_move')
    s.off('tank_remote_respawn')
    s.off('tank_remote_shoot')
    s.off('tank_remote_tile')
    s.off('tank_remote_kill')
    s.off('tank_game_over')

    s.on('tank_remote_move', (data) => {
      handlers?.onRemoteMove?.(data)
    })

    s.on('tank_remote_respawn', (data) => {
      handlers?.onRemoteRespawn?.(data)
    })

    s.on('tank_remote_shoot', (data) => {
      handlers?.onRemoteShoot?.(data)
    })

    s.on('tank_remote_tile', (data) => {
      handlers?.onRemoteTile?.(data)
    })

    s.on('tank_remote_kill', (data) => {
      if (data.room) currentTankRoom.value = data.room
      handlers?.onRemoteKill?.(data)
    })

    s.on('tank_game_over', (data) => {
      if (data.room) currentTankRoom.value = data.room
      handlers?.onGameOver?.(data)
    })
  }

  async function listRooms() {
    const res = await emitAck<{ rooms: TankRoomSummary[] }>('tank_list_rooms', {})
    if (res.ok && res.data) {
      openTankRooms.value = res.data.rooms
    }
  }

  async function createRoom(playerName: string) {
    const res = await emitAck<{ roomCode: string; playerId: string; room: TankRoomState }>('tank_create_room', { playerName })
    if (res.ok && res.data) {
      currentTankRoom.value = res.data.room
      myPlayerId.value = res.data.playerId
      localStorage.setItem('tank_player_name', playerName)
    }
    return res
  }

  async function joinRoom(roomCode: string, playerName: string) {
    const res = await emitAck<{ roomCode: string; playerId: string; room: TankRoomState }>('tank_join_room', { roomCode, playerName })
    if (res.ok && res.data) {
      currentTankRoom.value = res.data.room
      myPlayerId.value = res.data.playerId
      localStorage.setItem('tank_player_name', playerName)
    }
    return res
  }

  async function switchTeam(team: Team) {
    if (!currentTankRoom.value) return
    const res = await emitAck<{ room: TankRoomState }>('tank_switch_team', {
      roomCode: currentTankRoom.value.roomCode,
      team
    })
    if (res.ok && res.data) {
      currentTankRoom.value = res.data.room
    }
    return res
  }

  async function toggleReady() {
    if (!currentTankRoom.value) return
    const res = await emitAck<{ room: TankRoomState }>('tank_toggle_ready', {
      roomCode: currentTankRoom.value.roomCode
    })
    if (res.ok && res.data) {
      currentTankRoom.value = res.data.room
    }
    return res
  }

  async function startGame() {
    if (!currentTankRoom.value) return
    return await emitAck<{ room: TankRoomState }>('tank_start_game', {
      roomCode: currentTankRoom.value.roomCode
    })
  }

  async function leaveRoom() {
    await emitAck('tank_leave_room', {})
    currentTankRoom.value = null
    myPlayerId.value = null
    await listRooms()
  }

  function sendMove(x: number, y: number, dir: number) {
    if (!currentTankRoom.value) return
    getSocket().emit('tank_sync_move', {
      roomCode: currentTankRoom.value.roomCode,
      x,
      y,
      dir
    })
  }

  function sendRespawn(x: number, y: number, dir: number) {
    if (!currentTankRoom.value) return
    getSocket().emit('tank_sync_respawn', {
      roomCode: currentTankRoom.value.roomCode,
      playerId: myPlayerId.value,
      x,
      y,
      dir
    })
  }

  function sendShoot(x: number, y: number, dir: number, power: number, ownerId: string, ownerTeam: Team) {
    if (!currentTankRoom.value) return
    getSocket().emit('tank_sync_shoot', {
      roomCode: currentTankRoom.value.roomCode,
      x,
      y,
      dir,
      power,
      ownerId,
      ownerTeam
    })
  }

  function sendTileHit(row: number, col: number, newType: number, hp?: number) {
    if (!currentTankRoom.value) return
    getSocket().emit('tank_sync_tile', {
      roomCode: currentTankRoom.value.roomCode,
      row,
      col,
      newType,
      hp
    })
  }

  function sendEagleHit(destroyedTeam: Team) {
    if (!currentTankRoom.value) return
    getSocket().emit('tank_sync_eagle', {
      roomCode: currentTankRoom.value.roomCode,
      destroyedTeam
    })
  }

  function sendKill(victimId: string, killerId: string) {
    if (!currentTankRoom.value) return
    getSocket().emit('tank_sync_kill', {
      roomCode: currentTankRoom.value.roomCode,
      victimId,
      killerId
    })
  }

  async function rematch() {
    if (!currentTankRoom.value) return
    return await emitAck<{ room: TankRoomState }>('tank_rematch', {
      roomCode: currentTankRoom.value.roomCode
    })
  }

  async function kickPlayer(targetPlayerId: string) {
    if (!currentTankRoom.value) return
    return await emitAck<{ room: TankRoomState }>('tank_kick_player', {
      roomCode: currentTankRoom.value.roomCode,
      targetPlayerId
    })
  }

  return {
    socket: getSocket(),
    currentTankRoom,
    myPlayerId,
    openTankRooms,
    initTankListeners,
    listRooms,
    createRoom,
    joinRoom,
    switchTeam,
    toggleReady,
    startGame,
    leaveRoom,
    kickPlayer,
    sendMove,
    sendRespawn,
    sendShoot,
    sendTileHit,
    sendEagleHit,
    sendKill,
    rematch
  }
}
