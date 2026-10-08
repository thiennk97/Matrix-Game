import {
  TILE_BRICK,
  TILE_STEEL,
  TILE_WATER,
  TILE_BASE_BLUE,
  TILE_BASE_RED,
  TILE_FORT_BLUE,
  TILE_FORT_RED,
  TILE_SIZE,
  WORLD_SIZE,
  TANK_SIZE
} from '~/utils/tank/tankMaps'

// Movement rules for client-side prediction of the local tank. This MUST stay identical to
// applyMove/canOccupy in src/core/tankEngine.js: the client replays unacknowledged commands
// with this code on top of the server's position, so any difference shows up as a correction.

const TANK_SPEED = 2
const SNAP_GRID = TILE_SIZE / 2
const SNAP_TOLERANCE = 4

const DIR_VECTORS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 }
]

const BLOCKING_TILES = new Set([
  TILE_BRICK,
  TILE_STEEL,
  TILE_WATER,
  TILE_BASE_BLUE,
  TILE_BASE_RED,
  TILE_FORT_BLUE,
  TILE_FORT_RED
])

// Cannon rules, mirrored from the engine.
export const FIRE_COOLDOWN_STEPS = 14
export const MAX_BULLETS_PER_TANK = 12
export const FIRE_BUFFER_STEPS = 12 // a tap during cooldown still fires once the cannon is ready
const BULLET_SPEED = 4.2
const BULLET_SIZE = 6

// A bullet the local player just fired. It is drawn immediately and replaced by (paired with)
// the server's bullet carrying the same command number `n`.
export interface ProxyBullet {
  n: number
  x: number
  y: number
  px: number
  py: number
  dir: number
}

export function muzzlePosition(pose: PredictedPose) {
  const half = TANK_SIZE / 2 - BULLET_SIZE / 2
  let x = pose.x + half
  let y = pose.y + half
  if (pose.dir === 0) y = pose.y - BULLET_SIZE
  else if (pose.dir === 1) x = pose.x + TANK_SIZE
  else if (pose.dir === 2) y = pose.y + TANK_SIZE
  else x = pose.x - BULLET_SIZE
  return { x, y }
}

// Advance a proxy one tick; false once it left the board or hit something solid.
// Tank hits are left to the server.
export function stepProxyBullet(b: ProxyBullet, map: number[][]) {
  const v = DIR_VECTORS[b.dir]!
  b.px = b.x
  b.py = b.y
  b.x += v.dx * BULLET_SPEED
  b.y += v.dy * BULLET_SPEED
  if (b.x < 0 || b.y < 0 || b.x + BULLET_SIZE > WORLD_SIZE || b.y + BULLET_SIZE > WORLD_SIZE) return false
  const col = Math.floor((b.x + BULLET_SIZE / 2) / TILE_SIZE)
  const row = Math.floor((b.y + BULLET_SIZE / 2) / TILE_SIZE)
  const tile = map[row]?.[col]
  return !(tile !== undefined && tile !== TILE_WATER && BLOCKING_TILES.has(tile))
}

export interface PredictedPose {
  x: number
  y: number
  dir: number
}

export interface Obstacle {
  x: number
  y: number
}

function overlaps(ax: number, ay: number, bx: number, by: number) {
  return ax < bx + TANK_SIZE && ax + TANK_SIZE > bx && ay < by + TANK_SIZE && ay + TANK_SIZE > by
}

function staticBlocked(map: number[][], x: number, y: number) {
  if (x < 0 || y < 0 || x + TANK_SIZE > WORLD_SIZE || y + TANK_SIZE > WORLD_SIZE) return true
  const c0 = Math.floor(x / TILE_SIZE)
  const c1 = Math.floor((x + TANK_SIZE - 1) / TILE_SIZE)
  const r0 = Math.floor(y / TILE_SIZE)
  const r1 = Math.floor((y + TANK_SIZE - 1) / TILE_SIZE)
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (BLOCKING_TILES.has(map[r]?.[c] ?? TILE_STEEL)) return true
    }
  }
  return false
}

function canOccupy(map: number[][], others: Obstacle[], x: number, y: number) {
  if (staticBlocked(map, x, y)) return false
  for (const o of others) if (overlaps(x, y, o.x, o.y)) return false
  return true
}

// Apply one movement command (one 60Hz step) to a pose.
export function stepMovement(pose: PredictedPose, dir: number, map: number[][], others: Obstacle[]) {
  if (dir < 0) return
  pose.dir = dir
  const v = DIR_VECTORS[dir]!

  if (v.dy !== 0) {
    const snapX = Math.round(pose.x / SNAP_GRID) * SNAP_GRID
    if (snapX !== pose.x && Math.abs(pose.x - snapX) < SNAP_TOLERANCE && canOccupy(map, others, snapX, pose.y)) {
      pose.x = snapX
    }
  } else {
    const snapY = Math.round(pose.y / SNAP_GRID) * SNAP_GRID
    if (snapY !== pose.y && Math.abs(pose.y - snapY) < SNAP_TOLERANCE && canOccupy(map, others, pose.x, snapY)) {
      pose.y = snapY
    }
  }

  const nx = pose.x + v.dx * TANK_SPEED
  const ny = pose.y + v.dy * TANK_SPEED
  if (canOccupy(map, others, nx, ny)) {
    pose.x = nx
    pose.y = ny
  }
}
