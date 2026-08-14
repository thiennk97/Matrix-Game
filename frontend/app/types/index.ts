export type RoomStatus = 'LOBBY' | 'PLAYING' | 'PAUSED' | 'FINISHED'

export interface Player {
  id: string
  name: string
  score: number
  seatIndex: number
  ready: boolean
  connected: boolean
  abandoned?: boolean
  board: (number | null)[][]
  matchedLines?: any[]
  hasPlacedThisRound?: boolean
  currentPiece?: number[]
  hoverType?: 'horizontal' | 'vertical'
}

export interface RoomState {
  roomCode: string
  status: RoomStatus
  stateVersion: number
  turn: number
  players: Player[]
  hostPlayerId: string
  currentPiece: number[] | null
  timeLeft: number
  turnTimeLimit: number
}

export interface ChatMessage {
  playerId: string
  sender: string
  msg: string
  timestamp: number
}

export interface PublicRoom {
  roomCode: string
  hostName: string
  maxPlayers: number
  status: Extract<RoomStatus, 'LOBBY' | 'PLAYING'>
  playerCount: number
}
