// Shared tile ids and world dimensions. Map layouts live on the server (src/core/tankMaps.js)
// and arrive with the match state, so every player renders the identical battlefield.

export const TILE_EMPTY = 0
export const TILE_BRICK = 1
export const TILE_STEEL = 2
export const TILE_WATER = 3
export const TILE_TREES = 4
export const TILE_BASE_BLUE = 5 // Blue eagle (south)
export const TILE_BASE_RED = 6 // Red eagle (north)
export const TILE_FORT_BLUE = 7 // Blue fortified wall (5 hits)
export const TILE_FORT_RED = 8 // Red fortified wall (5 hits)

export const MAP_SIZE = 26
export const TILE_SIZE = 16
export const WORLD_SIZE = MAP_SIZE * TILE_SIZE
export const TANK_SIZE = 28
export const BULLET_SIZE = 6
export const FORT_MAX_HP = 12
