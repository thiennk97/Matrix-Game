export type CaroSymbol = 'X' | 'O'

export type CaroRule = 'standard' | 'caro_vn'

export type CaroRoomStatus = 'LOBBY' | 'PLAYING' | 'FINISHED'

export interface CaroPlayer {
  id: string
  socketId: string
  name: string
  symbol: CaroSymbol
  ready: boolean
  wins: number
  connected: boolean
  isSpectator?: boolean
}

export interface CaroMove {
  step: number
  row: number
  col: number
  symbol: CaroSymbol
  playerName: string
  timestamp: number
}

export interface CaroRoomState {
  roomCode: string
  roomName: string
  hostPlayerId: string
  status: CaroRoomStatus
  players: CaroPlayer[]
  spectators: CaroPlayer[]
  boardSize: number
  turnTimeLimit: number
  rule: CaroRule
  board: (CaroSymbol | null)[][]
  currentTurn: CaroSymbol
  timeRemaining: number
  turnStartTime: number | null
  history: CaroMove[]
  lastMove: CaroMove | null
  winner: CaroSymbol | 'DRAW' | null
  winningLine: { row: number; col: number }[]
  winReason: 'five_in_a_row' | 'surrender' | 'timeout' | 'agreement' | 'board_full' | 'opponent_left' | null
  drawOffer: { fromPlayerId: string; fromPlayerName: string } | null
  createdAt: number
}

export interface CaroRoomSummary {
  roomCode: string
  roomName: string
  hostName: string
  playerCount: number
  maxPlayers: number
  spectatorCount: number
  boardSize: number
  turnTimeLimit: number
  rule: CaroRule
  status: CaroRoomStatus
  createdAt: number
}

export interface CaroChatMessage {
  senderName: string
  senderId: string
  symbol: CaroSymbol | null
  message: string
  timestamp: number
}
