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

function createEmptyMap() {
  const map = []
  for (let y = 0; y < MAP_SIZE; y++) {
    map.push(new Array(MAP_SIZE).fill(TILE_EMPTY))
  }
  return map
}

function fillRect(map, x, y, w, h, type) {
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
function fillRectSymNS(map, x, y, w, h, type) {
  fillRect(map, x, y, w, h, type)
  const mirrorY = MAP_SIZE - y - h
  if (mirrorY !== y) {
    fillRect(map, x, mirrorY, w, h, type)
  }
}

function placeEagleAndFortress(map, isPvP = false) {
  map[24][12] = TILE_BASE_BLUE
  map[24][13] = TILE_BASE_BLUE
  map[25][12] = TILE_BASE_BLUE
  map[25][13] = TILE_BASE_BLUE

  const wallType = isPvP ? TILE_FORT_BLUE : TILE_BRICK
  BASE_WALL_COORDS.forEach(({ x, y }) => {
    map[y][x] = wallType
  })
}

function placeRedEagleAndFortress(map) {
  map[0][12] = TILE_BASE_RED
  map[0][13] = TILE_BASE_RED
  map[1][12] = TILE_BASE_RED
  map[1][13] = TILE_BASE_RED

  BASE_RED_WALL_COORDS.forEach(({ x, y }) => {
    map[y][x] = TILE_FORT_RED
  })
}

function initPvPBaseBases(map) {
  placeEagleAndFortress(map, true)
  placeRedEagleAndFortress(map)
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
  'Trọng Trấn Bất Khả Xâm Phạm',
  'Kim Cương Lửa',
  'Ba Cầu Vượt Sông',
  'Mê Cung Xoắn Ốc',
  'Rừng Ma Ám',
  'Hành Lang Tử Thần',
  'Thập Tự Chiến',
  'Tam Giác Quỷ',
  'Hồ Trung Tâm',
  'Quần Đảo Thép',
  'Bão Gạch',
  'Cổng Địa Ngục',
  'Ma Trận Cột',
  'Sa Mạc Lửa',
  'Dòng Sông Zigzag',
  'Pháo Đài Kép',
  'Vòng Xoáy Tử Thần',
  'Đảo Hoang Hỗn Loạn',
  'Hang Ổ Quái Vật'
]

// Map 0: Pháo Đài Cổ (Classic Fortress & Center Steel Bastion)
function getPvPMap0() {
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
function getPvPMap1() {
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
function getPvPMap2() {
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
function getPvPMap3() {
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
function getPvPMap4() {
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
function getPvPMap5() {
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
function getPvPMap6() {
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
function getPvPMap7() {
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
function getPvPMap8() {
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
function getPvPMap9() {
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
function getPvPMap10() {
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
function getPvPMap11() {
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

// ----------------------------------------------------------------------
// MAPS 12-29: designed on the top half only, then mirrored so both teams are equal.
// ----------------------------------------------------------------------

// Fill a rect and its east-west mirror image.
function fillEW(map, x, y, w, h, type) {
  fillRect(map, x, y, w, h, type)
  fillRect(map, MAP_SIZE - x - w, y, w, h, type)
}

// 'ns': south half mirrors the north half. 'rot': south half is the north half rotated 180 degrees.
// Either way, Blue and Red face exactly the same battlefield.
function finishMirrored(map, mode = 'ns') {
  for (let r = 0; r < MAP_SIZE / 2; r++) {
    for (let c = 0; c < MAP_SIZE; c++) {
      if (mode === 'rot') map[MAP_SIZE - 1 - r][MAP_SIZE - 1 - c] = map[r][c]
      else map[MAP_SIZE - 1 - r][c] = map[r][c]
    }
  }
  // Keep both spawn lanes and the area in front of each base open.
  fillRect(map, 5, 0, 16, 3, TILE_EMPTY)
  fillRect(map, 5, 23, 16, 3, TILE_EMPTY)
  fillRect(map, 7, 3, 4, 2, TILE_EMPTY)
  fillRect(map, 15, 3, 4, 2, TILE_EMPTY)
  fillRect(map, 7, 21, 4, 2, TILE_EMPTY)
  fillRect(map, 15, 21, 4, 2, TILE_EMPTY)
  initPvPBaseBases(map)
  return map
}

// Deterministic PRNG so the "chaos" map is identical on every server start.
function seededRandom(seed) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

// 12: Kim Cương Lửa - a brick diamond with a steel heart and a jungle inside
function getPvPMap12() {
  const map = createEmptyMap()
  for (let k = 0; k <= 7; k++) {
    const r = 5 + k
    fillRect(map, 12 - k, r, 2, 1, TILE_BRICK)
    fillRect(map, 12 + k, r, 2, 1, TILE_BRICK)
    if (k >= 3) fillRect(map, 14 - k, r, 2 * k - 2, 1, TILE_TREES)
  }
  fillRect(map, 11, 11, 4, 2, TILE_STEEL)
  fillEW(map, 1, 6, 3, 3, TILE_STEEL)
  fillEW(map, 4, 3, 2, 2, TILE_BRICK)
  return finishMirrored(map)
}

// 13: Ba Cầu Vượt Sông - one wide river, three guarded bridges
function getPvPMap13() {
  const map = createEmptyMap()
  fillRect(map, 0, 11, 26, 2, TILE_WATER)
  fillRect(map, 2, 11, 2, 2, TILE_EMPTY)
  fillRect(map, 12, 11, 2, 2, TILE_EMPTY)
  fillRect(map, 22, 11, 2, 2, TILE_EMPTY)
  fillRect(map, 4, 11, 2, 2, TILE_STEEL)
  fillRect(map, 20, 11, 2, 2, TILE_STEEL)
  fillRect(map, 10, 11, 2, 2, TILE_STEEL)
  fillRect(map, 14, 11, 2, 2, TILE_STEEL)
  fillRect(map, 2, 10, 2, 1, TILE_BRICK)
  fillRect(map, 12, 10, 2, 1, TILE_BRICK)
  fillRect(map, 22, 10, 2, 1, TILE_BRICK)
  fillEW(map, 5, 7, 4, 2, TILE_BRICK)
  fillEW(map, 1, 7, 2, 2, TILE_TREES)
  fillEW(map, 8, 5, 3, 2, TILE_TREES)
  fillRect(map, 11, 6, 4, 2, TILE_STEEL)
  return finishMirrored(map)
}

// 14: Mê Cung Xoắn Ốc - nested rings whose doors alternate between the flanks and the centre
function getPvPMap14() {
  const map = createEmptyMap()
  fillRect(map, 3, 5, 20, 1, TILE_BRICK)
  fillRect(map, 3, 5, 1, 8, TILE_BRICK)
  fillRect(map, 22, 5, 1, 8, TILE_BRICK)
  fillEW(map, 4, 5, 2, 1, TILE_EMPTY)
  fillRect(map, 6, 8, 14, 1, TILE_BRICK)
  fillRect(map, 6, 8, 1, 5, TILE_BRICK)
  fillRect(map, 19, 8, 1, 5, TILE_BRICK)
  fillRect(map, 12, 8, 2, 1, TILE_EMPTY)
  fillRect(map, 6, 12, 1, 1, TILE_EMPTY)
  fillRect(map, 19, 12, 1, 1, TILE_EMPTY)
  fillRect(map, 9, 10, 8, 3, TILE_STEEL)
  fillRect(map, 10, 11, 6, 2, TILE_TREES)
  fillEW(map, 1, 9, 2, 2, TILE_STEEL)
  return finishMirrored(map)
}

// 15: Rừng Ma Ám - dense jungle broken by steel pillars and lone bricks
function getPvPMap15() {
  const map = createEmptyMap()
  fillRect(map, 2, 5, 22, 8, TILE_TREES)
  fillEW(map, 4, 6, 2, 2, TILE_STEEL)
  fillEW(map, 8, 8, 2, 2, TILE_STEEL)
  fillEW(map, 11, 5, 1, 2, TILE_BRICK)
  fillEW(map, 6, 11, 2, 1, TILE_BRICK)
  fillEW(map, 2, 10, 2, 2, TILE_BRICK)
  fillRect(map, 12, 10, 2, 2, TILE_STEEL)
  fillEW(map, 9, 12, 2, 1, TILE_WATER)
  return finishMirrored(map)
}

// 16: Hành Lang Tử Thần - three lanes split by steel walls, the centre lane is plugged with bricks
function getPvPMap16() {
  const map = createEmptyMap()
  fillRect(map, 6, 5, 2, 8, TILE_STEEL)
  fillRect(map, 18, 5, 2, 8, TILE_STEEL)
  fillRect(map, 10, 8, 6, 2, TILE_BRICK)
  fillRect(map, 10, 11, 6, 2, TILE_BRICK)
  fillEW(map, 1, 8, 4, 2, TILE_TREES)
  fillEW(map, 0, 11, 6, 2, TILE_BRICK)
  fillRect(map, 12, 6, 2, 1, TILE_STEEL)
  return finishMirrored(map)
}

// 17: Thập Tự Chiến - a brick cross cuts the field into four quarters with ponds
function getPvPMap17() {
  const map = createEmptyMap()
  fillRect(map, 0, 12, 26, 1, TILE_BRICK)
  fillRect(map, 12, 4, 2, 9, TILE_BRICK)
  fillRect(map, 10, 11, 6, 2, TILE_STEEL)
  fillEW(map, 3, 6, 4, 4, TILE_WATER)
  fillEW(map, 1, 10, 2, 2, TILE_TREES)
  fillEW(map, 8, 6, 2, 3, TILE_TREES)
  fillEW(map, 6, 11, 2, 1, TILE_STEEL)
  return finishMirrored(map)
}

// 18: Tam Giác Quỷ - staircase wings funnel everyone towards a jungle in the middle
function getPvPMap18() {
  const map = createEmptyMap()
  for (let k = 0; k <= 7; k++) {
    fillRect(map, 2 + k, 5 + k, 2, 1, TILE_BRICK)
    fillRect(map, 22 - k, 5 + k, 2, 1, TILE_BRICK)
  }
  fillRect(map, 10, 5, 6, 5, TILE_TREES)
  fillRect(map, 11, 11, 4, 2, TILE_STEEL)
  fillEW(map, 4, 11, 2, 2, TILE_STEEL)
  return finishMirrored(map)
}

// 19: Hồ Trung Tâm - a lake with a single land bridge down the middle
function getPvPMap19() {
  const map = createEmptyMap()
  fillRect(map, 8, 8, 10, 1, TILE_WATER)
  fillRect(map, 5, 9, 16, 4, TILE_WATER)
  fillRect(map, 12, 8, 2, 5, TILE_EMPTY)
  fillRect(map, 11, 9, 1, 3, TILE_STEEL)
  fillRect(map, 14, 9, 1, 3, TILE_STEEL)
  fillRect(map, 12, 10, 2, 1, TILE_BRICK)
  fillEW(map, 3, 5, 4, 2, TILE_BRICK)
  fillEW(map, 1, 9, 3, 3, TILE_TREES)
  return finishMirrored(map)
}

// 20: Quần Đảo Thép - the middle is open water; only the flanks are land, steel islands dot the lake
function getPvPMap20() {
  const map = createEmptyMap()
  fillRect(map, 0, 6, 26, 7, TILE_WATER)
  fillRect(map, 3, 6, 2, 7, TILE_EMPTY)
  fillRect(map, 21, 6, 2, 7, TILE_EMPTY)
  fillRect(map, 9, 8, 2, 2, TILE_STEEL)
  fillRect(map, 15, 8, 2, 2, TILE_STEEL)
  fillRect(map, 12, 11, 2, 2, TILE_STEEL)
  fillRect(map, 6, 11, 2, 2, TILE_TREES)
  fillRect(map, 18, 11, 2, 2, TILE_TREES)
  fillEW(map, 5, 8, 1, 2, TILE_BRICK)
  return finishMirrored(map)
}

// 21: Bão Gạch - a checkerboard of 2x2 brick blocks around an open highway
function getPvPMap21() {
  const map = createEmptyMap()
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 2; j++) {
      if ((i + j) % 2 === 0) fillRect(map, 2 + i * 4, 5 + j * 4, 2, 2, TILE_BRICK)
    }
  }
  fillEW(map, 4, 9, 2, 2, TILE_STEEL)
  fillRect(map, 12, 5, 2, 2, TILE_STEEL)
  fillEW(map, 1, 12, 3, 1, TILE_TREES)
  fillRect(map, 10, 12, 6, 1, TILE_TREES)
  return finishMirrored(map)
}

// 22: Cổng Địa Ngục - a steel curtain with narrow gates and a brick plug in the middle
function getPvPMap22() {
  const map = createEmptyMap()
  fillRect(map, 0, 7, 26, 2, TILE_STEEL)
  fillEW(map, 5, 7, 2, 2, TILE_EMPTY)
  fillRect(map, 12, 7, 2, 2, TILE_BRICK)
  fillEW(map, 2, 10, 8, 2, TILE_BRICK)
  fillRect(map, 12, 10, 2, 3, TILE_WATER)
  fillEW(map, 10, 10, 2, 2, TILE_TREES)
  fillEW(map, 0, 5, 2, 2, TILE_BRICK)
  return finishMirrored(map)
}

// 23: Ma Trận Cột - a grid of steel pillars with brick fillers
function getPvPMap23() {
  const map = createEmptyMap()
  for (let x = 2; x <= 20; x += 6) {
    for (let y = 5; y <= 11; y += 6) fillRect(map, x, y, 2, 2, TILE_STEEL)
  }
  for (let x = 5; x <= 17; x += 6) {
    fillRect(map, x, 6, 2, 1, TILE_BRICK)
    fillRect(map, x, 9, 2, 1, TILE_BRICK)
  }
  fillRect(map, 8, 8, 2, 2, TILE_TREES)
  fillRect(map, 16, 8, 2, 2, TILE_TREES)
  fillRect(map, 12, 8, 2, 2, TILE_WATER)
  return finishMirrored(map)
}

// 24: Sa Mạc Lửa - almost open ground: a few bunkers and bushes, snipers welcome
function getPvPMap24() {
  const map = createEmptyMap()
  fillEW(map, 3, 6, 3, 2, TILE_STEEL)
  fillEW(map, 8, 9, 2, 2, TILE_BRICK)
  fillRect(map, 12, 11, 2, 2, TILE_STEEL)
  fillEW(map, 1, 11, 2, 2, TILE_TREES)
  fillEW(map, 6, 4, 2, 1, TILE_TREES)
  fillRect(map, 11, 7, 4, 1, TILE_BRICK)
  return finishMirrored(map)
}

// 25: Dòng Sông Zigzag - a staircase river with a bridge at every bend
function getPvPMap25() {
  const map = createEmptyMap()
  fillRect(map, 0, 5, 8, 2, TILE_WATER)
  fillRect(map, 6, 7, 6, 2, TILE_WATER)
  fillRect(map, 10, 9, 6, 2, TILE_WATER)
  fillRect(map, 14, 11, 6, 2, TILE_WATER)
  fillRect(map, 18, 9, 2, 2, TILE_WATER)
  fillRect(map, 20, 7, 6, 2, TILE_WATER)
  fillRect(map, 4, 5, 2, 2, TILE_EMPTY)
  fillRect(map, 8, 7, 2, 2, TILE_EMPTY)
  fillRect(map, 12, 9, 2, 2, TILE_EMPTY)
  fillRect(map, 16, 11, 2, 2, TILE_EMPTY)
  fillRect(map, 22, 7, 2, 2, TILE_EMPTY)
  fillRect(map, 8, 5, 2, 2, TILE_STEEL)
  fillRect(map, 16, 5, 2, 2, TILE_BRICK)
  fillRect(map, 20, 11, 2, 2, TILE_TREES)
  fillRect(map, 2, 9, 4, 2, TILE_TREES)
  return finishMirrored(map)
}

// 26: Pháo Đài Kép - a second brick keep in front of each base, with a steel gate and decoy jungle
function getPvPMap26() {
  const map = createEmptyMap()
  fillRect(map, 7, 5, 12, 1, TILE_BRICK)
  fillEW(map, 7, 5, 1, 4, TILE_BRICK)
  fillRect(map, 11, 5, 4, 1, TILE_EMPTY)
  fillRect(map, 12, 5, 2, 1, TILE_STEEL)
  fillRect(map, 9, 6, 8, 2, TILE_TREES)
  fillEW(map, 2, 7, 3, 3, TILE_STEEL)
  fillEW(map, 1, 11, 4, 2, TILE_BRICK)
  fillRect(map, 10, 10, 6, 3, TILE_WATER)
  fillRect(map, 12, 10, 2, 2, TILE_STEEL)
  return finishMirrored(map)
}

// 27: Vòng Xoáy Tử Thần - a steel pinwheel; the two halves are rotations of each other
function getPvPMap27() {
  const map = createEmptyMap()
  fillRect(map, 4, 5, 8, 2, TILE_STEEL)
  fillRect(map, 4, 5, 2, 6, TILE_STEEL)
  fillRect(map, 14, 9, 8, 2, TILE_STEEL)
  fillRect(map, 20, 5, 2, 6, TILE_BRICK)
  fillRect(map, 8, 9, 4, 2, TILE_BRICK)
  fillRect(map, 10, 12, 6, 1, TILE_WATER)
  fillRect(map, 14, 6, 4, 2, TILE_TREES)
  fillRect(map, 1, 9, 3, 3, TILE_TREES)
  return finishMirrored(map, 'rot')
}

// 28: Đảo Hoang Hỗn Loạn - a seeded scatter of everything; connectivity is guaranteed by the check below
function getPvPMap28() {
  const map = createEmptyMap()
  const rand = seededRandom(20241028)
  const palette = [TILE_BRICK, TILE_BRICK, TILE_BRICK, TILE_STEEL, TILE_TREES, TILE_TREES, TILE_WATER]
  for (let i = 0; i < 26; i++) {
    const w = 1 + Math.floor(rand() * 3)
    const h = 1 + Math.floor(rand() * 3)
    const x = Math.floor(rand() * (MAP_SIZE - w))
    const y = 5 + Math.floor(rand() * (8 - h))
    fillRect(map, x, y, w, h, palette[Math.floor(rand() * palette.length)])
  }
  return finishMirrored(map, 'rot')
}

// 29: Hang Ổ Quái Vật - a steel stronghold in the middle with four brick doors and a hidden jungle core
function getPvPMap29() {
  const map = createEmptyMap()
  fillRect(map, 7, 8, 12, 2, TILE_STEEL)
  fillRect(map, 7, 8, 2, 5, TILE_STEEL)
  fillRect(map, 17, 8, 2, 5, TILE_STEEL)
  fillRect(map, 12, 8, 2, 2, TILE_BRICK)
  fillRect(map, 7, 11, 2, 2, TILE_BRICK)
  fillRect(map, 17, 11, 2, 2, TILE_BRICK)
  fillRect(map, 9, 10, 8, 3, TILE_TREES)
  fillEW(map, 1, 6, 4, 2, TILE_WATER)
  fillEW(map, 1, 10, 3, 3, TILE_BRICK)
  fillEW(map, 4, 4, 2, 2, TILE_BRICK)
  return finishMirrored(map)
}

const PVP_MAP_BUILDERS = [
  getPvPMap0, getPvPMap1, getPvPMap2, getPvPMap3, getPvPMap4, getPvPMap5,
  getPvPMap6, getPvPMap7, getPvPMap8, getPvPMap9, getPvPMap10, getPvPMap11,
  getPvPMap12, getPvPMap13, getPvPMap14, getPvPMap15, getPvPMap16, getPvPMap17,
  getPvPMap18, getPvPMap19, getPvPMap20, getPvPMap21, getPvPMap22, getPvPMap23,
  getPvPMap24, getPvPMap25, getPvPMap26, getPvPMap27, getPvPMap28, getPvPMap29
]

// Export selector for all maps
export function getPvPStageMap(mapIndex = 0) {
  const count = PVP_MAP_BUILDERS.length
  const idx = ((Math.floor(mapIndex) % count) + count) % count
  return PVP_MAP_BUILDERS[idx]()
}
