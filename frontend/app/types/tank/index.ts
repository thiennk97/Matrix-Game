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

export interface TankRoomSummary {
  roomCode: string
  hostName: string
  playerCount: number
  maxPlayers: number
  blueCount: number
  redCount: number
  status: 'LOBBY' | 'PLAYING' | 'FINISHED'
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
  eagles: {
    blue: { alive: boolean }
    red: { alive: boolean }
  }
  winner: Team | null
  gameOverReason: 'eagle' | 'lives' | null
  teamScores: { blue: number; red: number }
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
}

export type SnapEvent =
  | { type: 'shoot'; team: Team; ownerId: string }
  | { type: 'tile'; r: number; c: number; tile: number; hp: number }
  | { type: 'brick'; x: number; y: number }
  | { type: 'steel'; x: number; y: number }
  | { type: 'shield'; x: number; y: number }
  | { type: 'clash'; x: number; y: number }
  | { type: 'fort_hit'; x: number; y: number; team: Team }
  | { type: 'explosion'; x: number; y: number; big: boolean; victimId?: string; killerId?: string | null }
  | { type: 'eagle'; team: Team }
  | { type: 'respawn'; id: string }

export interface TankSnapshot {
  tick: number
  countdown: number
  tanks: SnapTank[]
  bullets: SnapBullet[]
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
}
