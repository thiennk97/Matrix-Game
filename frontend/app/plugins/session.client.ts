import { defineNuxtPlugin, navigateTo, useRoute } from '#app'
import { useGameStore } from '~/stores/game'
import { useSocket } from '~/composables/useSocket'

export default defineNuxtPlugin((nuxtApp) => {
  const store = useGameStore()
  const { connect, emitAck, applyRoomState, loadResultSnapshot } = useSocket()

  const abandonSession = async () => {
    localStorage.removeItem('matrix-game-session')
    const route = useRoute()
    if (route.path !== '/') navigateTo({ path: '/', query: route.query })
    const roomsRes = await emitAck('list_rooms', {})
    if (roomsRes.ok) {
      store.publicRooms = roomsRes.data.rooms
    }
  }

  nuxtApp.hook('app:mounted', async () => {
    connect()

    try {
      const data = localStorage.getItem('matrix-game-session')
      const session = data ? JSON.parse(data) : null

      if (session?.roomCode && session.isSpectating) {
        const res = await emitAck('spectate_room', { roomCode: session.roomCode })

        if (res.ok) {
          store.myPlayerIndex = -1
          store.myPlayerId = null
          store.currentRoomCode = session.roomCode
          store.hasJoinedRoom = true
          store.isSpectating = true
          applyRoomState(res.data.state)
          store.spectateFocusedPlayerId = res.data.state.players[0]?.id ?? null

          navigateTo(`/preview/${session.roomCode}`)
        } else {
          await abandonSession()
        }
      } else if (session?.roomCode && session.playerId) {
        const res = await emitAck('resume_room', {
          roomCode: session.roomCode,
          playerId: session.playerId
        })

        if (res.ok) {
          const { roomCode, playerId, playerIndex, state } = res.data
          store.myPlayerIndex = playerIndex
          store.myPlayerId = playerId
          store.currentRoomCode = roomCode
          store.hasJoinedRoom = true

          applyRoomState(state)

          const snapshot = loadResultSnapshot(roomCode)
          if (snapshot) {
            store.frozenResults = snapshot
            store.showVictoryModal = true
          }

          navigateTo(`/room/${roomCode}`)
        } else {
          await abandonSession()
        }
      } else {
        await abandonSession()
      }
    } catch {
      localStorage.removeItem('matrix-game-session')
      if (useRoute().path !== '/') navigateTo('/')
    } finally {
      store.isRestoring = false
    }
  })
})

