export type Direction = 0 | 1 | 2 | 3 // 0: UP, 1: RIGHT, 2: DOWN, 3: LEFT
export type EnemyType = 'basic' | 'fast' | 'power' | 'armor'
export type PowerUpType = 'star' | 'bomb' | 'clock' | 'shovel' | 'shield' | 'tank'
export type Team = 'blue' | 'red'

export interface Bullet {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  dir: Direction
  owner: 'player' | 'enemy'
  ownerId?: string
  ownerTeam?: Team
  power: number
}

export interface Tank {
  id: number | string
  x: number
  y: number
  dir: Direction
  speed: number
  isPlayer: boolean
  hp: number
  team?: Team
  type?: EnemyType
  isRed?: boolean
  shootCooldown: number
  invulnerableTime: number
  invulnerableUntil?: number
  frozenTime?: number
  name?: string
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export interface PowerUp {
  x: number
  y: number
  type: PowerUpType
  duration: number
}

export interface TankPlayer {
  id: string
  socketId?: string
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
  createdAt: number
}

export interface TankRoomState {
  roomCode: string
  hostPlayerId: string
  status: 'LOBBY' | 'PLAYING' | 'FINISHED'
  mapIndex?: number
  players: TankPlayer[]
  eagles: {
    blue: { alive: boolean }
    red: { alive: boolean }
  }
  winner: Team | null
  destroyedTiles?: { r: number; c: number }[]
  createdAt: number
}
