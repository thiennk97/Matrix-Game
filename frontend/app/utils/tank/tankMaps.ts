// Battle City (Tank 1990) Map Definitions (26x26 sub-tiles)
// 0: Empty, 1: Brick, 2: Steel, 3: Water, 4: Trees, 5: Blue Base, 6: Red Base

export const TILE_EMPTY = 0
export const TILE_BRICK = 1
export const TILE_STEEL = 2
export const TILE_WATER = 3
export const TILE_TREES = 4
export const TILE_BASE = 5       // Standard / Blue Base (South)
export const TILE_BASE_BLUE = 5  // Blue Eagle (South)
export const TILE_BASE_RED = 6   // Red Eagle (North)
export const TILE_FORT_BLUE = 7  // Blue Fortified Wall (5 hits to break, 6th hit destroys eagle)
export const TILE_FORT_RED = 8   // Red Fortified Wall (5 hits to break, 6th hit destroys eagle)

export const MAP_SIZE = 26 // 26 x 26

// Standard / Blue Eagle Base Coordinates (South: y = 24..25, x = 12..13)
export const BASE_WALL_COORDS = [
  { x: 11, y: 23 }, { x: 12, y: 23 }, { x: 13, y: 23 }, { x: 14, y: 23 },
  { x: 11, y: 24 }, { x: 14, y: 24 },
  { x: 11, y: 25 }, { x: 14, y: 25 }
]

// Red Eagle Base Coordinates (North: y = 0..1, x = 12..13)
export const BASE_RED_WALL_COORDS = [
  { x: 11, y: 2 }, { x: 12, y: 2 }, { x: 13, y: 2 }, { x: 14, y: 2 },
  { x: 11, y: 0 }, { x: 14, y: 0 },
  { x: 11, y: 1 }, { x: 14, y: 1 }
]

export const PVP_SPAWN_POINTS = {
  blue: [
    { x: 8 * 16, y: 24 * 16, dir: 0 },
    { x: 16 * 16, y: 24 * 16, dir: 0 }
  ],
  red: [
    { x: 8 * 16, y: 1 * 16, dir: 2 },
    { x: 16 * 16, y: 1 * 16, dir: 2 }
  ]
}

function createEmptyMap(): number[][] {
  const map: number[][] = []
  for (let y = 0; y < MAP_SIZE; y++) {
    map.push(new Array(MAP_SIZE).fill(TILE_EMPTY))
  }
  return map
}

function fillRect(map: number[][], x: number, y: number, w: number, h: number, type: number) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const ny = y + dy
      const nx = x + dx
      if (ny >= 0 && ny < MAP_SIZE && nx >= 0 && nx < MAP_SIZE) {
        map[ny][nx] = type
      }
    }
  }
}

// Helper to fill rectangular areas with North-South vertical symmetry (100% fair for Red and Blue)
function fillRectSymNS(map: number[][], x: number, y: number, w: number, h: number, type: number) {
  fillRect(map, x, y, w, h, type)
  const mirrorY = MAP_SIZE - y - h
  if (mirrorY !== y) {
    fillRect(map, x, mirrorY, w, h, type)
  }
}

function placeEagleAndFortress(map: number[][], isPvP = false) {
  map[24][12] = TILE_BASE_BLUE
  map[24][13] = TILE_BASE_BLUE
  map[25][12] = TILE_BASE_BLUE
  map[25][13] = TILE_BASE_BLUE

  const wallType = isPvP ? TILE_FORT_BLUE : TILE_BRICK
  BASE_WALL_COORDS.forEach(({ x, y }) => {
    map[y][x] = wallType
  })
}

function placeRedEagleAndFortress(map: number[][]) {
  map[0][12] = TILE_BASE_RED
  map[0][13] = TILE_BASE_RED
  map[1][12] = TILE_BASE_RED
  map[1][13] = TILE_BASE_RED

  BASE_RED_WALL_COORDS.forEach(({ x, y }) => {
    map[y][x] = TILE_FORT_RED
  })
}

function initPvPBaseBases(map: number[][]) {
  placeEagleAndFortress(map, true)
  placeRedEagleAndFortress(map)
}

// ----------------------------------------------------------------------
// SOLO STAGES (Classic Campaign)
// ----------------------------------------------------------------------
function getStage1(): number[][] {
  const map = createEmptyMap()

  fillRect(map, 2, 2, 2, 8, TILE_BRICK)
  fillRect(map, 6, 2, 2, 8, TILE_BRICK)
  fillRect(map, 10, 2, 2, 6, TILE_BRICK)
  fillRect(map, 14, 2, 2, 6, TILE_BRICK)
  fillRect(map, 18, 2, 2, 8, TILE_BRICK)
  fillRect(map, 22, 2, 2, 8, TILE_BRICK)

  fillRect(map, 12, 12, 2, 2, TILE_STEEL)

  fillRect(map, 2, 12, 2, 2, TILE_BRICK)
  fillRect(map, 6, 12, 2, 4, TILE_BRICK)
  fillRect(map, 18, 12, 2, 4, TILE_BRICK)
  fillRect(map, 22, 12, 2, 2, TILE_BRICK)

  fillRect(map, 2, 16, 2, 6, TILE_BRICK)
  fillRect(map, 6, 18, 2, 4, TILE_BRICK)
  fillRect(map, 10, 14, 2, 6, TILE_BRICK)
  fillRect(map, 14, 14, 2, 6, TILE_BRICK)
  fillRect(map, 18, 18, 2, 4, TILE_BRICK)
  fillRect(map, 22, 16, 2, 6, TILE_BRICK)

  fillRect(map, 0, 14, 2, 2, TILE_STEEL)
  fillRect(map, 24, 14, 2, 2, TILE_STEEL)

  placeEagleAndFortress(map)
  return map
}

function getStage2(): number[][] {
  const map = createEmptyMap()

  fillRect(map, 2, 2, 4, 4, TILE_TREES)
  fillRect(map, 20, 2, 4, 4, TILE_TREES)
  fillRect(map, 10, 8, 6, 4, TILE_TREES)

  fillRect(map, 0, 13, 10, 2, TILE_WATER)
  fillRect(map, 16, 13, 10, 2, TILE_WATER)

  fillRect(map, 4, 8, 4, 3, TILE_BRICK)
  fillRect(map, 18, 8, 4, 3, TILE_BRICK)
  fillRect(map, 2, 17, 4, 5, TILE_BRICK)
  fillRect(map, 20, 17, 4, 5, TILE_BRICK)
  fillRect(map, 8, 17, 2, 4, TILE_STEEL)
  fillRect(map, 16, 17, 2, 4, TILE_STEEL)

  placeEagleAndFortress(map)
  return map
}

function getStage3(): number[][] {
  const map = createEmptyMap()

  fillRect(map, 2, 2, 22, 2, TILE_BRICK)
  fillRect(map, 2, 6, 2, 12, TILE_BRICK)
  fillRect(map, 22, 6, 2, 12, TILE_BRICK)
  fillRect(map, 6, 6, 14, 2, TILE_STEEL)

  fillRect(map, 6, 10, 6, 2, TILE_BRICK)
  fillRect(map, 14, 10, 6, 2, TILE_BRICK)

  fillRect(map, 6, 14, 2, 6, TILE_WATER)
  fillRect(map, 18, 14, 2, 6, TILE_WATER)
  fillRect(map, 10, 14, 6, 4, TILE_TREES)

  placeEagleAndFortress(map)
  return map
}

export function loadStageMap(stage: number): number[][] {
  const s = ((stage - 1) % 3) + 1
  if (s === 1) return getStage1()
  if (s === 2) return getStage2()
  return getStage3()
}

// ----------------------------------------------------------------------
// 12 BALANCED 2-TEAM PVP MAPS (26x26, Perfectly Symmetrical)
// ----------------------------------------------------------------------

export const PVP_MAP_NAMES = [
  'Pháo Đài Cổ',
  'Rừng Rậm Phục Kích',
  'Mê Cung Thép',
  'Độc Đạo Qua Sông',            // 1 duy nhất lối qua sông, đá chặn giữa
  'Lưỡng Cầu Huyết Chiến',        // 2 lối qua sông, đá chặn giữa
  'Đại Địa Đạo - Vạn Gạch',      // Biển gạch phải đục hết mới sang, đá chặn giữa
  'Bàn Cờ Chiến Thuật',
  'Song Đảo Sinh Tử',
  'Đấu Trường Đẫm Máu',
  'Ngã Ba Lửa',
  'Chiến Hào Song Song',
  'Trọng Trấn Bất Khả Xâm Phạm'
]

// Map 0: Pháo Đài Cổ (Classic Fortress & Center Steel Bastion)
function getPvPMap0(): number[][] {
  const map = createEmptyMap()
  initPvPBaseBases(map)

  fillRectSymNS(map, 4, 4, 4, 3, TILE_BRICK)
  fillRectSymNS(map, 18, 4, 4, 3, TILE_BRICK)
  fillRectSymNS(map, 0, 12, 2, 2, TILE_STEEL)
  fillRectSymNS(map, 24, 12, 2, 2, TILE_STEEL)

  // Mid river with flank bridge openings
  fillRect(map, 2, 12, 5, 2, TILE_WATER)
  fillRect(map, 19, 12, 5, 2, TILE_WATER)

  // Center cover with SOLID STEEL BLOCK blocking base-to-base sniper fire
  fillRect(map, 9, 11, 8, 4, TILE_TREES)
  fillRect(map, 11, 11, 4, 4, TILE_STEEL) // Khối đá chặn đứng tầm bắn đại bàng

  // Flank corridors
  fillRectSymNS(map, 4, 8, 2, 4, TILE_BRICK)
  fillRectSymNS(map, 20, 8, 2, 4, TILE_BRICK)

  return map
}

// Map 1: Rừng Rậm Phục Kích (Heavy trees in center, steel corners, ambush corridors)
function getPvPMap1(): number[][] {
  const map = createEmptyMap()
  initPvPBaseBases(map)

  // Dense mid jungle
  fillRect(map, 4, 10, 18, 6, TILE_TREES)
  // Clear side crossroads in the forest
  fillRect(map, 6, 10, 3, 6, TILE_EMPTY)
  fillRect(map, 17, 10, 3, 6, TILE_EMPTY)

  // CENTER SOLID STEEL BLOCK - Cannot shoot through from base to base!
  fillRect(map, 11, 11, 4, 4, TILE_STEEL)

  // Outer steel guard towers
  fillRectSymNS(map, 1, 6, 2, 2, TILE_STEEL)
  fillRectSymNS(map, 23, 6, 2, 2, TILE_STEEL)

  // Symmetrical defensive wings
  fillRectSymNS(map, 3, 5, 4, 2, TILE_BRICK)
  fillRectSymNS(map, 19, 5, 4, 2, TILE_BRICK)
  fillRectSymNS(map, 6, 8, 2, 2, TILE_BRICK)
  fillRectSymNS(map, 18, 8, 2, 2, TILE_BRICK)

  return map
}

// Map 2: Mê Cung Thép (Steel pillars, labyrinth brick corridors)
function getPvPMap2(): number[][] {
  const map = createEmptyMap()
  initPvPBaseBases(map)

  // Steel anchor pillars
  fillRectSymNS(map, 5, 6, 2, 2, TILE_STEEL)
  fillRectSymNS(map, 19, 6, 2, 2, TILE_STEEL)

  // Center solid steel block
  fillRect(map, 11, 11, 4, 4, TILE_STEEL)

  // Winding brick maze walls
  fillRectSymNS(map, 2, 4, 2, 6, TILE_BRICK)
  fillRectSymNS(map, 22, 4, 2, 6, TILE_BRICK)
  fillRectSymNS(map, 5, 9, 6, 2, TILE_BRICK)
  fillRectSymNS(map, 15, 9, 6, 2, TILE_BRICK)

  // Center side ponds
  fillRect(map, 0, 11, 2, 4, TILE_WATER)
  fillRect(map, 24, 11, 2, 4, TILE_WATER)

  // Bushes for sneaking
  fillRectSymNS(map, 2, 11, 2, 4, TILE_TREES)
  fillRectSymNS(map, 22, 11, 2, 4, TILE_TREES)
  fillRect(map, 7, 12, 4, 2, TILE_TREES)
  fillRect(map, 15, 12, 4, 2, TILE_TREES)

  return map
}

// Map 3: Độc Đạo Qua Sông (Bờ sông rộng CHỈ CÓ 1 LỐI ĐI DUY NHẤT qua cầu, đá chặn kín giữa)
function getPvPMap3(): number[][] {
  const map = createEmptyMap()
  initPvPBaseBases(map)

  // 1. Dòng sông trải dài từ hàng 11 đến hàng 14
  fillRect(map, 0, 11, 26, 4, TILE_WATER)

  // 2. KHỐI ĐÁ KHỔNG LỒ CHẶN KÍN GIỮA (x: 8..17, y: 10..15)
  // Ngăn tuyệt đối không cho đạn xuyên qua dòng sông từ nhà này sang nhà kia!
  fillRect(map, 8, 10, 10, 6, TILE_STEEL)

  // 3. Phía Đông (x: 18..25) có cọc thép ngầm, không thể đi qua
  fillRect(map, 22, 11, 2, 4, TILE_STEEL)
  fillRect(map, 25, 11, 1, 4, TILE_STEEL)

  // 4. DUY NHẤT 1 LỐI ĐI QUA SÔNG (Cầu độc đạo ở x: 3..5, y: 11..14)
  fillRect(map, 3, 11, 3, 4, TILE_EMPTY) // Lối đi duy nhất!
  fillRect(map, 2, 11, 1, 4, TILE_STEEL) // Tháp đá canh gác phía Tây
  fillRect(map, 6, 11, 2, 4, TILE_STEEL) // Tháp đá canh gác phía Đông

  // 5. Cổng gạch chắn 2 đầu cầu (phải bắn mở cổng mới ùa qua được)
  fillRect(map, 3, 10, 3, 1, TILE_BRICK)
  fillRect(map, 3, 15, 3, 1, TILE_BRICK)

  // 6. Địa hình chiến thuật 2 bờ Bắc - Nam
  fillRectSymNS(map, 8, 6, 4, 3, TILE_BRICK)
  fillRectSymNS(map, 18, 6, 6, 3, TILE_BRICK)
  fillRectSymNS(map, 11, 4, 4, 2, TILE_STEEL) // Đá chắn bảo vệ thêm phía trước đại bàng

  return map
}

// Map 4: Lưỡng Cầu Huyết Chiến (Bờ sông chia cắt CHỈ CÓ 2 LỐI ĐI QUA ở 2 cánh, giữa là pháo đài đá)
function getPvPMap4(): number[][] {
  const map = createEmptyMap()
  initPvPBaseBases(map)

  // 1. Dòng sông chia cắt đôi bờ
  fillRect(map, 0, 11, 26, 4, TILE_WATER)

  // 2. PHÁO ĐÀI ĐÁ KHỦNG CHẶN KÍN TOÀN BỘ TRUNG TÂM (x: 8..17, y: 10..15)
  fillRect(map, 8, 10, 10, 6, TILE_STEEL)
  fillRect(map, 10, 9, 6, 8, TILE_STEEL) // Đá vươn rộng chặn hoàn toàn mọi góc bắn

  // 3. LỐI QUA 1: CẦU PHÍA TÂY (x: 3..5, y: 11..14)
  fillRect(map, 3, 11, 3, 4, TILE_EMPTY)
  fillRect(map, 2, 11, 1, 4, TILE_STEEL)
  fillRect(map, 6, 11, 2, 4, TILE_STEEL)

  // 4. LỐI QUA 2: CẦU PHÍA ĐÔNG (x: 20..22, y: 11..14)
  fillRect(map, 20, 11, 3, 4, TILE_EMPTY)
  fillRect(map, 18, 11, 2, 4, TILE_STEEL)
  fillRect(map, 23, 11, 1, 4, TILE_STEEL)

  // 5. Công sự gạch & cây che chắn 2 đầu cầu
  fillRectSymNS(map, 3, 8, 3, 2, TILE_BRICK)
  fillRectSymNS(map, 20, 8, 3, 2, TILE_BRICK)
  fillRectSymNS(map, 11, 5, 4, 2, TILE_STEEL)
  fillRectSymNS(map, 7, 6, 3, 3, TILE_TREES)
  fillRectSymNS(map, 16, 6, 3, 3, TILE_TREES)

  return map
}

// Map 5: Đại Địa Đạo - Vạn Gạch (Biển gạch dày đặc phải đục khoét hầm mới sang được, đá chặn giữa)
function getPvPMap5(): number[][] {
  const map = createEmptyMap()
  initPvPBaseBases(map)

  // 1. BIỂN GẠCH DÀY ĐẶC trải từ hàng 8 đến 17 bao phủ toàn bộ map (10 hàng gạch liên tiếp!)
  fillRect(map, 1, 8, 24, 10, TILE_BRICK)

  // 2. KHỐI ĐÁ BẤT TỬ Ở TRUNG TÂM (x: 10..15, y: 10..15)
  // Dù có đục hết gạch cũng không thể đục xuyên qua tâm để bắn đại bàng!
  fillRect(map, 10, 10, 6, 6, TILE_STEEL)

  // 3. Các hầm trú ẩn và trụ đá định hướng luồng đào hầm
  fillRectSymNS(map, 4, 9, 3, 3, TILE_EMPTY)   // Khoang tập kết trái
  fillRectSymNS(map, 19, 9, 3, 3, TILE_EMPTY)  // Khoang tập kết phải
  fillRectSymNS(map, 7, 11, 2, 2, TILE_STEEL)  // Trụ đá định tuyến
  fillRectSymNS(map, 17, 11, 2, 2, TILE_STEEL) // Trụ đá định tuyến

  // 4. Bụi rậm ngụy trang bên trong địa đạo
  fillRect(map, 5, 12, 2, 2, TILE_TREES)
  fillRect(map, 19, 12, 2, 2, TILE_TREES)

  // 5. Cánh phòng thủ căn cứ
  fillRectSymNS(map, 4, 4, 4, 2, TILE_BRICK)
  fillRectSymNS(map, 18, 4, 4, 2, TILE_BRICK)
  fillRectSymNS(map, 11, 4, 4, 2, TILE_STEEL)

  return map
}

// Map 6: Bàn Cờ Chiến Thuật (Checkerboard pattern with center steel bastion)
function getPvPMap6(): number[][] {
  const map = createEmptyMap()
  initPvPBaseBases(map)

  // Alternating blocks
  fillRectSymNS(map, 2, 5, 3, 3, TILE_BRICK)
  fillRectSymNS(map, 7, 5, 3, 3, TILE_TREES)
  fillRectSymNS(map, 16, 5, 3, 3, TILE_TREES)
  fillRectSymNS(map, 21, 5, 3, 3, TILE_BRICK)

  fillRectSymNS(map, 4, 9, 3, 3, TILE_TREES)
  fillRectSymNS(map, 11, 8, 4, 2, TILE_BRICK)
  fillRectSymNS(map, 19, 9, 3, 3, TILE_TREES)

  // Center solid steel block
  fillRect(map, 11, 11, 4, 4, TILE_STEEL)
  fillRect(map, 6, 12, 2, 2, TILE_STEEL)
  fillRect(map, 18, 12, 2, 2, TILE_STEEL)

  // Mid bushes
  fillRect(map, 0, 11, 2, 4, TILE_BRICK)
  fillRect(map, 24, 11, 2, 4, TILE_BRICK)

  return map
}

// Map 7: Song Đảo Sinh Tử (Twin Islands in a mid lake with center steel)
function getPvPMap7(): number[][] {
  const map = createEmptyMap()
  initPvPBaseBases(map)

  // Big lake across rows 10..15
  fillRect(map, 2, 10, 22, 6, TILE_WATER)

  // West Island & East Island
  fillRect(map, 5, 11, 4, 4, TILE_EMPTY)
  fillRect(map, 6, 12, 2, 2, TILE_STEEL)

  fillRect(map, 17, 11, 4, 4, TILE_EMPTY)
  fillRect(map, 18, 12, 2, 2, TILE_STEEL)

  // Center heavy steel bastion blocking straight lake shots
  fillRect(map, 11, 10, 4, 6, TILE_STEEL)

  // Outer coastlines
  fillRect(map, 0, 10, 2, 6, TILE_EMPTY)
  fillRect(map, 24, 10, 2, 6, TILE_EMPTY)

  // North/South approach ramparts
  fillRectSymNS(map, 4, 5, 3, 3, TILE_BRICK)
  fillRectSymNS(map, 19, 5, 3, 3, TILE_BRICK)

  return map
}

// Map 8: Đấu Trường Đẫm Máu (The Colosseum with center steel bunker)
function getPvPMap8(): number[][] {
  const map = createEmptyMap()
  initPvPBaseBases(map)

  // Outer ring of bricks
  fillRectSymNS(map, 2, 4, 22, 2, TILE_BRICK)
  fillRectSymNS(map, 2, 6, 2, 6, TILE_BRICK)
  fillRectSymNS(map, 22, 6, 2, 6, TILE_BRICK)

  // Colosseum corner steel bastions
  fillRectSymNS(map, 6, 8, 2, 2, TILE_STEEL)
  fillRectSymNS(map, 18, 8, 2, 2, TILE_STEEL)

  // Center combat pit with SOLID STEEL BLOCK
  fillRect(map, 9, 10, 8, 6, TILE_TREES)
  fillRect(map, 11, 11, 4, 4, TILE_STEEL)

  return map
}

// Map 9: Ngã Ba Lửa (Crossroads with center steel block)
function getPvPMap9(): number[][] {
  const map = createEmptyMap()
  initPvPBaseBases(map)

  // 4 Fortified quadrants
  fillRectSymNS(map, 3, 5, 6, 5, TILE_BRICK)
  fillRectSymNS(map, 4, 6, 4, 3, TILE_TREES)

  fillRectSymNS(map, 17, 5, 6, 5, TILE_BRICK)
  fillRectSymNS(map, 18, 6, 4, 3, TILE_TREES)

  // Center intersection steel barricades with full center blockage
  fillRect(map, 10, 10, 2, 2, TILE_STEEL)
  fillRect(map, 14, 10, 2, 2, TILE_STEEL)
  fillRect(map, 10, 14, 2, 2, TILE_STEEL)
  fillRect(map, 14, 14, 2, 2, TILE_STEEL)
  fillRect(map, 11, 11, 4, 4, TILE_STEEL)

  return map
}

// Map 10: Chiến Hào Song Song (Parallel trenches with center steel block)
function getPvPMap10(): number[][] {
  const map = createEmptyMap()
  initPvPBaseBases(map)

  // 4 vertical trench columns with mid gaps
  fillRectSymNS(map, 3, 4, 2, 6, TILE_BRICK)
  fillRectSymNS(map, 9, 4, 2, 6, TILE_BRICK)
  fillRectSymNS(map, 15, 4, 2, 6, TILE_BRICK)
  fillRectSymNS(map, 21, 4, 2, 6, TILE_BRICK)

  // Center crossfire barricades
  fillRect(map, 3, 11, 2, 4, TILE_STEEL)
  fillRect(map, 21, 11, 2, 4, TILE_STEEL)
  fillRect(map, 9, 12, 2, 2, TILE_TREES)
  fillRect(map, 15, 12, 2, 2, TILE_TREES)

  // Center command bunker with SOLID STEEL
  fillRect(map, 10, 10, 6, 6, TILE_BRICK)
  fillRect(map, 11, 11, 4, 4, TILE_STEEL)

  return map
}

// Map 11: Trọng Trấn Bất Khả Xâm Phạm (Multi-layered heavy fortress siege)
function getPvPMap11(): number[][] {
  const map = createEmptyMap()
  initPvPBaseBases(map)

  // Outer defensive rampart
  fillRectSymNS(map, 4, 5, 18, 2, TILE_BRICK)
  fillRectSymNS(map, 11, 5, 4, 2, TILE_EMPTY) // center gate

  // Secondary bunker line
  fillRectSymNS(map, 2, 8, 3, 3, TILE_STEEL)
  fillRectSymNS(map, 21, 8, 3, 3, TILE_STEEL)
  fillRectSymNS(map, 7, 9, 4, 2, TILE_BRICK)
  fillRectSymNS(map, 15, 9, 4, 2, TILE_BRICK)

  // Midline trenches, water & SOLID STEEL CENTER
  fillRect(map, 6, 12, 3, 2, TILE_WATER)
  fillRect(map, 17, 12, 3, 2, TILE_WATER)
  fillRect(map, 9, 10, 8, 6, TILE_TREES)
  fillRect(map, 11, 11, 4, 4, TILE_STEEL)

  return map
}

// Export selector for all 12 maps
export function getPvPStageMap(mapIndex: number = 0): number[][] {
  const idx = ((Math.floor(mapIndex) % 12) + 12) % 12
  switch (idx) {
    case 0: return getPvPMap0()
    case 1: return getPvPMap1()
    case 2: return getPvPMap2()
    case 3: return getPvPMap3()
    case 4: return getPvPMap4()
    case 5: return getPvPMap5()
    case 6: return getPvPMap6()
    case 7: return getPvPMap7()
    case 8: return getPvPMap8()
    case 9: return getPvPMap9()
    case 10: return getPvPMap10()
    case 11: return getPvPMap11()
    default: return getPvPMap0()
  }
}

