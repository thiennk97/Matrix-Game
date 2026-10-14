export type RoomStatus = 'LOBBY' | 'PLAYING' | 'PAUSED' | 'FINISHED'

export interface Player {
  id: string
  name: string
  score: number
  seatIndex: number
  ready: boolean
  connected: boolean
  abandoned?: boolean
  top1Wins?: number
  board: (number | null)[][]
  matchedLines?: any[]
  hasPlacedThisRound?: boolean
  currentPiece?: number[]
  hoverType?: 'horizontal' | 'vertical'
}

export interface Top1Record {
  id: string
  name: string
  seatIndex: number
  top1Wins: number
  highestScore: number
  lastWonRound: number
}

export interface MatchHistoryWinner {
  id: string
  name: string
  seatIndex: number
  score: number
}

export interface MatchHistoryEntry {
  round: number
  endedAt: number
  topScore: number
  winners: MatchHistoryWinner[]
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
  turnEndsAt?: number | null
  turnTimeLimit: number
  matchCount?: number
  top1Stats?: Top1Record[]
  matchHistory?: MatchHistoryEntry[]
}

export interface PublicRoom {
  roomCode: string
  hostName: string
  maxPlayers: number
  status: Extract<RoomStatus, 'LOBBY' | 'PLAYING'>
  playerCount: number
}
