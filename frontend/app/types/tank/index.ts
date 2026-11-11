export type Direction = 0 | 1 | 2 | 3 // 0: UP, 1: RIGHT, 2: DOWN, 3: LEFT
export type Team = 'blue' | 'red'

export interface TankPlayer {
  id: string
  name: string
  team: Team
  seat: number
  ready: boolean
  connected: boolean
  kills: number
  deaths: number
  lives: number
}

export interface RoundHistoryEntry {
  round: number
  winner: Team | 'draw'
  blueScore: number
  redScore: number
  targetWins?: number
  totalMatches: number
  finishedAt: number
}

export interface TankRoomSummary {
  roomCode: string
  hostName: string
  playerCount: number
  maxPlayers: number
  blueCount: number
  redCount: number
  status: 'LOBBY' | 'PLAYING' | 'FINISHED'
  matchesPerRound?: number
  currentRound?: number
  joinable: boolean
  createdAt: number
}

export interface TankRoomState {
  roomCode: string
  hostPlayerId: string
  status: 'LOBBY' | 'PLAYING' | 'FINISHED'
  mapIndex: number
  mapName: string
  players: TankPlayer[]
  maxPlayers?: number
  eagles: {
    blue: { alive: boolean }
    red: { alive: boolean }
  }
  winner: Team | null
  gameOverReason: 'eagle' | 'lives' | null
  teamScores: { blue: number; red: number }
  matchesPerRound: number
  currentRound: number
  roundHistory: RoundHistoryEntry[]
  createdAt: number
}

// ---- Server match snapshots ---------------------------------------------

export interface SnapTank {
  id: string
  x: number
  y: number
  dir: Direction
  alive: boolean
  ack: number // last movement command the server applied for this tank
  shield: boolean
  lives: number
  kills: number
  deaths: number
  missiles?: number
  online: boolean
}

export interface SnapBullet {
  id: number
  x: number
  y: number
  dir: Direction
  team: Team
  o: string // owner player id
  c: number // movement command number that fired it (pairs it with the shooter's local proxy)
  m?: boolean // true if rocket missile
}

export interface SnapDrop {
  id: number
  x: number
  y: number
  type: 'missile'
}

export type SnapEvent =
  | { type: 'shoot'; team: Team; ownerId: string }
  | { type: 'tile'; r: number; c: number; tile: number; hp: number }
  | { type: 'brick'; x: number; y: number; ownerId?: string }
  | { type: 'steel'; x: number; y: number; ownerId?: string }
  | { type: 'shield'; x: number; y: number }
  | { type: 'clash'; x: number; y: number }
  | { type: 'fort_hit'; x: number; y: number; team: Team }
  | { type: 'explosion'; x: number; y: number; big: boolean; victimId?: string; killerId?: string | null }
  | { type: 'eagle'; team: Team }
  | { type: 'respawn'; id: string }
  | { type: 'pickup'; item: 'missile'; ownerId: string; team: Team; x: number; y: number }
  | { type: 'drop_spawn'; item: 'missile'; x: number; y: number }
  | { type: 'fire_missile'; team: Team; ownerId: string; x: number; y: number }
  | { type: 'missile_explosion'; x: number; y: number; radius: number; ownerId?: string }

export interface TankSnapshot {
  tick: number
  countdown: number
  tanks: SnapTank[]
  bullets: SnapBullet[]
  drops?: SnapDrop[]
  events: SnapEvent[]
}

export interface TankFullState {
  mapIndex: number
  mapName: string
  map: number[][]
  wallHp: Record<string, number>
  eagles: { blue: boolean; red: boolean }
  snapshot: TankSnapshot
}

export interface TankGameOver {
  winner: Team
  reason: 'eagle' | 'lives'
  destroyedTeam: Team
  snapshot: TankSnapshot
  room: TankRoomState
  completedRound?: RoundHistoryEntry
}
