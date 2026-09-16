import { ref, computed } from 'vue'
import { io, type Socket } from 'socket.io-client'
import type {
  CaroRoomState,
  CaroRoomSummary,
  CaroChatMessage,
  CaroSymbol
} from '~/types/caro'

let socket: Socket | null = null

const currentCaroRoom = ref<CaroRoomState | null>(null)
const myPlayerId = ref<string | null>(null)
const openCaroRooms = ref<CaroRoomSummary[]>([])
const chatMessages = ref<CaroChatMessage[]>([])
const floatingEmojis = ref<{ id: string; emoji: string; senderName: string }[]>([])

export function useCaroSocket() {
  function getSocket(): Socket {
    if (!socket) {
      socket = io()
    }
    setupBaseListeners(socket)
    return socket
  }

  function setupBaseListeners(s: Socket) {
    if ((s as any)._hasCaroBase) return
    ;(s as any)._hasCaroBase = true

    s.on('caro_lobby_update', ({ rooms }: { rooms: CaroRoomSummary[] }) => {
      openCaroRooms.value = rooms
    })

    s.on('caro_room_updated', ({ room }: { room: CaroRoomState }) => {
      currentCaroRoom.value = room
    })

    s.on('caro_game_started', ({ room }: { room: CaroRoomState }) => {
      currentCaroRoom.value = room
    })

    s.on('caro_stone_placed', ({ room }: { room: CaroRoomState }) => {
      currentCaroRoom.value = room
    })

    s.on('caro_game_over', ({ room }: { room: CaroRoomState }) => {
      currentCaroRoom.value = room
    })

    s.on('caro_rematch_started', ({ room }: { room: CaroRoomState }) => {
      currentCaroRoom.value = room
    })

    s.on('caro_chat_received', (msg: CaroChatMessage) => {
      chatMessages.value.push(msg)
      if (chatMessages.value.length > 50) {
        chatMessages.value.shift()
      }
    })

    s.on('caro_emoji_received', (data: { id: string; emoji: string; senderName: string }) => {
      floatingEmojis.value.push(data)
      setTimeout(() => {
        const idx = floatingEmojis.value.findIndex((e) => e.id === data.id)
        if (idx !== -1) floatingEmojis.value.splice(idx, 1)
      }, 2500)
    })
  }

  function emitAck<T = any>(
    event: string,
    payload?: any
  ): Promise<{ ok: boolean; data?: T; error?: { message: string } }> {
    return new Promise((resolve) => {
      const s = getSocket()
      s.emit(event, payload, (res: { ok: boolean; data?: T; error?: { message: string } }) => {
        resolve(res)
      })
    })
  }

  async function fetchRooms() {
    const res = await emitAck<{ rooms: CaroRoomSummary[] }>('caro_list_rooms')
    if (res.ok && res.data) {
      openCaroRooms.value = res.data.rooms
    }
  }

  async function createRoom(
    playerName: string,
    options: { roomName?: string; boardSize?: number; turnTimeLimit?: number; rule?: string } = {}
  ) {
    const res = await emitAck<{
      roomCode: string
      playerId: string
      room: CaroRoomState
    }>('caro_create_room', { playerName, options })

    if (res.ok && res.data) {
      currentCaroRoom.value = res.data.room
      myPlayerId.value = res.data.playerId
      chatMessages.value = []
      return { ok: true, room: res.data.room }
    }
    return { ok: false, message: res.error?.message || 'Không thể tạo phòng' }
  }

  async function joinRoom(roomCode: string, playerName: string) {
    const res = await emitAck<{
      roomCode: string
      playerId: string
      room: CaroRoomState
    }>('caro_join_room', { roomCode, playerName })

    if (res.ok && res.data) {
      currentCaroRoom.value = res.data.room
      myPlayerId.value = res.data.playerId
      chatMessages.value = []
      return { ok: true, room: res.data.room }
    }
    return { ok: false, message: res.error?.message || 'Không thể vào phòng' }
  }

  async function toggleReady() {
    if (!currentCaroRoom.value) return
    await emitAck('caro_toggle_ready', { roomCode: currentCaroRoom.value.roomCode })
  }

  async function switchSymbol() {
    if (!currentCaroRoom.value) return
    await emitAck('caro_switch_symbol', { roomCode: currentCaroRoom.value.roomCode })
  }

  async function startGame() {
    if (!currentCaroRoom.value) return
    const res = await emitAck('caro_start_game', { roomCode: currentCaroRoom.value.roomCode })
    if (!res.ok) {
      alert(res.error?.message || 'Không thể bắt đầu trận đấu')
    }
  }

  async function placeStone(row: number, col: number) {
    if (!currentCaroRoom.value) return
    const res = await emitAck('caro_place_stone', {
      roomCode: currentCaroRoom.value.roomCode,
      row,
      col
    })
    return res
  }

  async function surrender() {
    if (!currentCaroRoom.value) return
    if (!confirm('Bạn có chắc chắn muốn đầu hàng ván này?')) return
    await emitAck('caro_surrender', { roomCode: currentCaroRoom.value.roomCode })
  }

  async function offerDraw() {
    if (!currentCaroRoom.value) return
    await emitAck('caro_offer_draw', { roomCode: currentCaroRoom.value.roomCode })
  }

  async function respondDraw(accept: boolean) {
    if (!currentCaroRoom.value) return
    await emitAck('caro_respond_draw', { roomCode: currentCaroRoom.value.roomCode, accept })
  }

  async function requestRematch() {
    if (!currentCaroRoom.value) return
    await emitAck('caro_rematch', { roomCode: currentCaroRoom.value.roomCode })
  }

  function sendChat(message: string) {
    if (!currentCaroRoom.value || !message.trim()) return
    const s = getSocket()
    s.emit('caro_chat', { roomCode: currentCaroRoom.value.roomCode, message: message.trim() })
  }

  function sendEmoji(emoji: string) {
    if (!currentCaroRoom.value) return
    const s = getSocket()
    s.emit('caro_send_emoji', { roomCode: currentCaroRoom.value.roomCode, emoji })
  }

  async function leaveRoom() {
    if (!currentCaroRoom.value) return
    await emitAck('caro_leave_room')
    currentCaroRoom.value = null
    myPlayerId.value = null
    chatMessages.value = []
    fetchRooms()
  }

  const myPlayer = computed(() => {
    if (!currentCaroRoom.value || !myPlayerId.value) return null
    return (
      currentCaroRoom.value.players.find((p) => p.id === myPlayerId.value) ||
      currentCaroRoom.value.spectators.find((s) => s.id === myPlayerId.value) ||
      null
    )
  })

  const opponentPlayer = computed(() => {
    if (!currentCaroRoom.value || !myPlayerId.value) return null
    return currentCaroRoom.value.players.find((p) => p.id !== myPlayerId.value) || null
  })

  const isMyTurn = computed(() => {
    if (!currentCaroRoom.value || !myPlayer.value) return false
    return (
      currentCaroRoom.value.status === 'PLAYING' &&
      currentCaroRoom.value.currentTurn === myPlayer.value.symbol
    )
  })

  const isHost = computed(() => {
    if (!currentCaroRoom.value || !myPlayerId.value) return false
    return currentCaroRoom.value.hostPlayerId === myPlayerId.value
  })

  return {
    getSocket,
    currentCaroRoom,
    myPlayerId,
    myPlayer,
    opponentPlayer,
    isMyTurn,
    isHost,
    openCaroRooms,
    chatMessages,
    floatingEmojis,
    fetchRooms,
    createRoom,
    joinRoom,
    toggleReady,
    switchSymbol,
    startGame,
    placeStone,
    surrender,
    offerDraw,
    respondDraw,
    requestRematch,
    sendChat,
    sendEmoji,
    leaveRoom
  }
}
