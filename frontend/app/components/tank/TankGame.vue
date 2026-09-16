<template>
  <div class="battle-city-container" ref="containerRef" :class="{ 'is-fullscreen': isFullscreen }">
    <div class="arcade-cabinet">
      <!-- Arcade Header -->
      <div class="cabinet-header">
        <div class="title-badge">
          <span class="retro-dot red"></span>
          <span class="retro-dot yellow"></span>
          <span class="retro-dot green"></span>
          <span class="arcade-title">BATTLE CITY 1990</span>
        </div>
        <div class="cabinet-controls">
          <button class="icon-btn" :class="{ muted: !soundEnabled }" @click="toggleSound" title="Bật/Tắt Âm Thanh">
            <LucideVolume2 v-if="soundEnabled" class="icon" />
            <LucideVolumeX v-else class="icon" />
          </button>
          <button class="icon-btn" @click="toggleFullscreen" :title="isFullscreen ? 'Thu nhỏ (Esc)' : 'Toàn màn hình (F)'">
            <LucideMinimize v-if="isFullscreen" class="icon" />
            <LucideMaximize v-else class="icon" />
          </button>
          <button class="icon-btn" @click="togglePause" title="Tạm Dừng (P/Enter)">
            <LucidePause v-if="!isPaused" class="icon" />
            <LucidePlay v-else class="icon" />
          </button>
          <button class="icon-btn restart-btn" @click="restartGame" title="Chơi Lại">
            <LucideRotateCcw class="icon" />
          </button>
        </div>
      </div>

      <!-- Main Game Area: Screen + Retro Sidebar -->
      <div class="screen-frame">
        <div class="canvas-wrapper">
          <canvas 
            ref="canvasRef" 
            :width="CANVAS_WIDTH" 
            :height="CANVAS_HEIGHT" 
            class="game-canvas"
          ></canvas>

          <!-- Overlay Overlays: Game Over / Victory / Pause -->
          <div v-if="gameState === 'gameover'" class="canvas-overlay game-over-overlay">
            <div class="overlay-box">
              <h2 class="retro-glitch">GAME OVER</h2>
              <p class="final-score">ĐIỂM SỐ: {{ score }}</p>
              <button class="btn btn-arcade" @click="restartGame">CHƠI LẠI</button>
            </div>
          </div>

          <div v-if="gameState === 'victory'" class="canvas-overlay victory-overlay">
            <div class="overlay-box">
              <h2 class="victory-title">CHIẾN THẮNG!</h2>
              <p>HOÀN THÀNH MÀN {{ stage }}</p>
              <p class="final-score">ĐIỂM: {{ score }}</p>
              <button class="btn btn-arcade" @click="nextStage">MÀN TIẾP THEO</button>
            </div>
          </div>

          <div v-if="isPaused && gameState === 'playing'" class="canvas-overlay pause-overlay">
            <div class="overlay-box">
              <h2>TẠM DỪNG</h2>
              <p>Nhấn Enter hoặc nút Play để tiếp tục</p>
            </div>
          </div>

          <!-- Stage Intro Banner -->
          <div v-if="stageIntroVisible" class="canvas-overlay stage-intro-overlay">
            <div class="stage-curtain top"></div>
            <div class="stage-banner-text">
              <h3>STAGE {{ stage }}</h3>
            </div>
            <div class="stage-curtain bottom"></div>
          </div>
        </div>

        <!-- Classic NES Side Panel -->
        <div class="retro-side-panel">
          <div class="panel-section enemy-counter">
            <div class="panel-label">ENEMY</div>
            <div class="enemy-icon-grid">
              <span 
                v-for="i in 20" 
                :key="i" 
                class="enemy-icon" 
                :class="{ dead: i > enemiesRemaining }"
              >
                👾
              </span>
            </div>
          </div>

          <div class="panel-section player-stats">
            <div class="stat-row">
              <span class="stat-label">I P</span>
              <span class="stat-val lives-val">⚔️ × {{ lives }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">PTS</span>
              <span class="stat-val score-val">{{ score }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">STAR</span>
              <span class="stat-val star-val">⭐ × {{ playerUpgrade }}</span>
            </div>
          </div>

          <div class="panel-section stage-indicator">
            <div class="flag-icon">🚩</div>
            <div class="stage-num">{{ stage }}</div>
          </div>
        </div>
      </div>

      <!-- Controls Guide & Virtual D-Pad for Mobile -->
      <div class="cabinet-footer">
        <div class="desktop-hints">
          <span>🎮 <b>Di chuyển:</b> Mũi tên / WASD</span>
          <span>💥 <b>Bắn:</b> Phím Space / J</span>
          <span>⏸️ <b>Dừng:</b> Enter</span>
        </div>

        <!-- Virtual Touch Controls for Mobile -->
        <div class="mobile-dpad-container">
          <div class="dpad">
            <button 
              class="dpad-btn dpad-up" 
              @touchstart.prevent="startMove(0)" 
              @touchend.prevent="stopMove(0)"
              @mousedown.prevent="startMove(0)"
              @mouseup.prevent="stopMove(0)"
            >▲</button>
            <button 
              class="dpad-btn dpad-left" 
              @touchstart.prevent="startMove(3)" 
              @touchend.prevent="stopMove(3)"
              @mousedown.prevent="startMove(3)"
              @mouseup.prevent="stopMove(3)"
            >◀</button>
            <div class="dpad-center"></div>
            <button 
              class="dpad-btn dpad-right" 
              @touchstart.prevent="startMove(1)" 
              @touchend.prevent="stopMove(1)"
              @mousedown.prevent="startMove(1)"
              @mouseup.prevent="stopMove(1)"
            >▶</button>
            <button 
              class="dpad-btn dpad-down" 
              @touchstart.prevent="startMove(2)" 
              @touchend.prevent="stopMove(2)"
              @mousedown.prevent="startMove(2)"
              @mouseup.prevent="stopMove(2)"
            >▼</button>
          </div>

          <div class="mobile-action-buttons">
            <button 
              class="action-btn fire-btn" 
              @touchstart.prevent="triggerShoot" 
              @mousedown.prevent="triggerShoot"
            >
              FIRE
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { 
  LucideVolume2, 
  LucideVolumeX, 
  LucidePause, 
  LucidePlay, 
  LucideRotateCcw,
  LucideMaximize,
  LucideMinimize
} from '@lucide/vue'
import { tankAudio } from '~/utils/tank/tankAudio'
import { 
  TILE_EMPTY, 
  TILE_BRICK, 
  TILE_STEEL, 
  TILE_WATER, 
  TILE_TREES, 
  TILE_BASE, 
  MAP_SIZE, 
  BASE_WALL_COORDS, 
  loadStageMap 
} from '~/utils/tank/tankMaps'
import type { Direction, EnemyType, Bullet, Tank, Particle, PowerUp } from '~/types/tank'

// Canvas & Grid Constants
const TILE_SIZE = 16
const CANVAS_WIDTH = MAP_SIZE * TILE_SIZE // 416 px
const CANVAS_HEIGHT = MAP_SIZE * TILE_SIZE // 416 px
const TANK_SIZE = 28

// State Refs
const canvasRef = ref<HTMLCanvasElement | null>(null)
const soundEnabled = ref(true)
const isPaused = ref(false)
const isFullscreen = ref(false)
const gameState = ref<'playing' | 'gameover' | 'victory'>('playing')
const score = ref(0)
const lives = ref(3)
const stage = ref(1)
const enemiesRemaining = ref(20)
const playerUpgrade = ref(0)
const stageIntroVisible = ref(false)

// Game Loop State
let ctx: CanvasRenderingContext2D | null = null
let animationFrameId: number = 0
let lastTime = 0

// Map grid 26x26
let map: number[][] = []
let baseDestroyed = false
let shovelTimer = 0
let freezeTimer = 0

// Entities
let player: Tank = createPlayerTank()
let enemies: Tank[] = []
let bullets: Bullet[] = []
let particles: Particle[] = []
let powerUps: PowerUp[] = []
let spawnPortals: { x: number; y: number; time: number; type: EnemyType; isRed: boolean }[] = []

let nextBulletId = 1
let totalEnemiesSpawned = 0
const MAX_ENEMIES_ON_FIELD = 4

// Keys State
const keysPressed: Record<string, boolean> = {}

function createPlayerTank(): Tank {
  return {
    id: 0,
    x: 8 * TILE_SIZE,
    y: 24 * TILE_SIZE,
    dir: 0,
    speed: 1.8,
    isPlayer: true,
    hp: 1,
    shootCooldown: 0,
    invulnerableTime: 90 // 1.5s protection shield (90 frames @ 60fps)
  }
}

// --- Fullscreen Controller ---
const containerRef = ref<HTMLElement | null>(null)

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    const el = containerRef.value || document.documentElement
    el.requestFullscreen().then(() => {
      isFullscreen.value = true
    }).catch(err => {
      console.warn('Fullscreen error:', err)
      document.documentElement.requestFullscreen().catch(() => {})
    })
  } else {
    document.exitFullscreen().then(() => {
      isFullscreen.value = false
    }).catch(err => {
      console.warn('Exit fullscreen error:', err)
    })
  }
}

const onFsChange = () => {
  isFullscreen.value = !!document.fullscreenElement
}

// --- Audio & Controls Helpers ---
const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value
  tankAudio.enabled = soundEnabled.value
}

const togglePause = () => {
  isPaused.value = !isPaused.value
}

const startMove = (dir: Direction) => {
  if (gameState.value !== 'playing') return
  player.dir = dir
  keysPressed[`touch_${dir}`] = true
}

const stopMove = (dir: Direction) => {
  delete keysPressed[`touch_${dir}`]
}

const triggerShoot = () => {
  if (gameState.value !== 'playing' || isPaused.value) return
  firePlayerBullet()
}

// --- Lifecycle ---
onMounted(() => {
  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d')
  }
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  document.addEventListener('fullscreenchange', onFsChange)

  initStage(1)
  lastTime = performance.now()
  animationFrameId = requestAnimationFrame(gameLoop)
})

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  document.removeEventListener('fullscreenchange', onFsChange)
})

// --- Initialization ---
function initStage(s: number) {
  stage.value = s
  map = loadStageMap(s)
  baseDestroyed = false
  shovelTimer = 0
  freezeTimer = 0
  enemiesRemaining.value = 20
  totalEnemiesSpawned = 0

  player = createPlayerTank()
  enemies = []
  bullets = []
  particles = []
  powerUps = []
  spawnPortals = []
  gameState.value = 'playing'

  stageIntroVisible.value = true
  tankAudio.stageStart()
  setTimeout(() => {
    stageIntroVisible.value = false
  }, 1200)
}

function restartGame() {
  score.value = 0
  lives.value = 3
  playerUpgrade.value = 0
  initStage(1)
}

function nextStage() {
  initStage(stage.value + 1)
}

// --- Input Handling ---
function handleKeyDown(e: KeyboardEvent) {
  if (e.code === 'KeyF' && !e.ctrlKey && !e.metaKey) {
    toggleFullscreen()
    return
  }

  if (e.repeat) return

  if (e.code === 'KeyP' || e.code === 'Enter') {
    togglePause()
    return
  }

  if (gameState.value !== 'playing') return

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault()
  }

  keysPressed[e.code] = true

  if (e.code === 'Space' || e.code === 'KeyJ') {
    firePlayerBullet()
  }
}

function handleKeyUp(e: KeyboardEvent) {
  delete keysPressed[e.code]
}

function firePlayerBullet() {
  if (player.shootCooldown > 0) return

  const maxBullets = playerUpgrade.value >= 2 ? 2 : 1
  const currentBullets = bullets.filter(b => b.owner === 'player').length
  if (currentBullets >= maxBullets) return

  tankAudio.shoot()
  const bSpeed = playerUpgrade.value >= 1 ? 4.8 : 3.6
  const power = playerUpgrade.value >= 3 ? 3 : 1

  let bx = player.x + TANK_SIZE / 2 - 3
  let by = player.y + TANK_SIZE / 2 - 3
  let vx = 0
  let vy = 0

  if (player.dir === 0) { by = player.y - 6; vy = -bSpeed }
  else if (player.dir === 1) { bx = player.x + TANK_SIZE; vx = bSpeed }
  else if (player.dir === 2) { by = player.y + TANK_SIZE; vy = bSpeed }
  else if (player.dir === 3) { bx = player.x - 6; vx = -bSpeed }

  bullets.push({
    id: nextBulletId++,
    x: bx,
    y: by,
    vx,
    vy,
    dir: player.dir,
    owner: 'player',
    power
  })

  player.shootCooldown = 14
}

// --- Spawning Logic ---
const SPAWN_POINTS = [
  { x: 0 * TILE_SIZE, y: 0 },
  { x: 12 * TILE_SIZE, y: 0 },
  { x: 24 * TILE_SIZE, y: 0 }
]

function updateSpawning() {
  if (freezeTimer > 0) return
  if (totalEnemiesSpawned < 20 && enemies.length + spawnPortals.length < MAX_ENEMIES_ON_FIELD) {
    if (Math.random() < 0.02) {
      const sp = SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)]
      const types: EnemyType[] = ['basic', 'fast', 'power', 'armor']
      const type = types[Math.floor(Math.random() * types.length)]
      const isRed = Math.random() < 0.25

      spawnPortals.push({
        x: sp.x,
        y: sp.y,
        time: 90,
        type,
        isRed
      })
      totalEnemiesSpawned++
    }
  }

  for (let i = spawnPortals.length - 1; i >= 0; i--) {
    const portal = spawnPortals[i]
    portal.time--
    if (portal.time <= 0) {
      let hp = 1
      let speed = 1.2
      if (portal.type === 'fast') speed = 2.0
      if (portal.type === 'armor') hp = 4

      enemies.push({
        id: nextBulletId++,
        x: portal.x,
        y: portal.y,
        dir: 2, // Head downwards
        speed,
        isPlayer: false,
        hp,
        type: portal.type,
        isRed: portal.isRed,
        shootCooldown: 30,
        invulnerableTime: 0
      })
      spawnPortals.splice(i, 1)
    }
  }
}

// --- Collision Detection & Snapping ---
function canMoveTo(x: number, y: number, isPlayer: boolean): boolean {
  if (x < 0 || x + TANK_SIZE > CANVAS_WIDTH || y < 0 || y + TANK_SIZE > CANVAS_HEIGHT) {
    return false
  }

  const startCol = Math.floor(x / TILE_SIZE)
  const endCol = Math.floor((x + TANK_SIZE - 1) / TILE_SIZE)
  const startRow = Math.floor(y / TILE_SIZE)
  const endRow = Math.floor((y + TANK_SIZE - 1) / TILE_SIZE)

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      if (r < 0 || r >= MAP_SIZE || c < 0 || c >= MAP_SIZE) return false
      const tile = map[r][c]
      if (tile === TILE_BRICK || tile === TILE_STEEL || tile === TILE_WATER || tile === TILE_BASE) {
        return false
      }
    }
  }

  // Check collision with other tanks
  const targetBox = { x, y, w: TANK_SIZE, h: TANK_SIZE }
  const otherTanks = isPlayer ? enemies : [player, ...enemies.filter(e => e.x !== x || e.y !== y)]

  for (const t of otherTanks) {
    if (checkAABB(targetBox, { x: t.x, y: t.y, w: TANK_SIZE, h: TANK_SIZE })) {
      return false
    }
  }

  return true
}

function checkAABB(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

// --- Update Tanks ---
function updatePlayer() {
  if (player.shootCooldown > 0) player.shootCooldown--
  if (player.invulnerableTime > 0) player.invulnerableTime--

  let dx = 0
  let dy = 0

  if (keysPressed['ArrowUp'] || keysPressed['KeyW'] || keysPressed['touch_0']) {
    player.dir = 0
    dy = -player.speed
  } else if (keysPressed['ArrowDown'] || keysPressed['KeyS'] || keysPressed['touch_2']) {
    player.dir = 2
    dy = player.speed
  } else if (keysPressed['ArrowLeft'] || keysPressed['KeyA'] || keysPressed['touch_3']) {
    player.dir = 3
    dx = -player.speed
  } else if (keysPressed['ArrowRight'] || keysPressed['KeyD'] || keysPressed['touch_1']) {
    player.dir = 1
    dx = player.speed
  }

  if (dx !== 0 || dy !== 0) {
    // Axis snapping for narrow alleyways
    if (dy !== 0) {
      const snapX = Math.round(player.x / (TILE_SIZE / 2)) * (TILE_SIZE / 2)
      if (Math.abs(player.x - snapX) < 4) player.x = snapX
    }
    if (dx !== 0) {
      const snapY = Math.round(player.y / (TILE_SIZE / 2)) * (TILE_SIZE / 2)
      if (Math.abs(player.y - snapY) < 4) player.y = snapY
    }

    if (canMoveTo(player.x + dx, player.y + dy, true)) {
      player.x += dx
      player.y += dy
    }
  }

  // Check PowerUp pickups
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const pu = powerUps[i]
    if (checkAABB({ x: player.x, y: player.y, w: TANK_SIZE, h: TANK_SIZE }, { x: pu.x, y: pu.y, w: 24, h: 24 })) {
      applyPowerUp(pu.type)
      powerUps.splice(i, 1)
      tankAudio.powerup()
      score.value += 500
    }
  }
}

function updateEnemies() {
  if (freezeTimer > 0) {
    freezeTimer--
    return
  }

  for (const enemy of enemies) {
    if (enemy.shootCooldown > 0) enemy.shootCooldown--

    // Random change direction or turn towards base/player
    if (Math.random() < 0.02) {
      if (Math.random() < 0.4) {
        enemy.dir = 2 // Move down towards eagle
      } else {
        enemy.dir = Math.floor(Math.random() * 4) as Direction
      }
    }

    let dx = 0
    let dy = 0
    if (enemy.dir === 0) dy = -enemy.speed
    else if (enemy.dir === 1) dx = enemy.speed
    else if (enemy.dir === 2) dy = enemy.speed
    else if (enemy.dir === 3) dx = -enemy.speed

    if (canMoveTo(enemy.x + dx, enemy.y + dy, false)) {
      enemy.x += dx
      enemy.y += dy
    } else {
      // Hit obstacle, pick another direction
      const options: Direction[] = [0, 1, 2, 3]
      enemy.dir = options[Math.floor(Math.random() * options.length)]
    }

    // Enemy shooting
    if (enemy.shootCooldown <= 0 && Math.random() < 0.04) {
      const bSpeed = enemy.type === 'power' ? 4.5 : 3.0
      let bx = enemy.x + TANK_SIZE / 2 - 3
      let by = enemy.y + TANK_SIZE / 2 - 3
      let vx = 0
      let vy = 0

      if (enemy.dir === 0) { by = enemy.y - 6; vy = -bSpeed }
      else if (enemy.dir === 1) { bx = enemy.x + TANK_SIZE; vx = bSpeed }
      else if (enemy.dir === 2) { by = enemy.y + TANK_SIZE; vy = bSpeed }
      else if (enemy.dir === 3) { bx = enemy.x - 6; vx = -bSpeed }

      bullets.push({
        id: nextBulletId++,
        x: bx,
        y: by,
        vx,
        vy,
        dir: enemy.dir,
        owner: 'enemy',
        power: 1
      })
      enemy.shootCooldown = 45 + Math.floor(Math.random() * 30)
    }
  }
}

// --- Update Bullets ---
function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i]
    b.x += b.vx
    b.y += b.vy

    // Out of bounds
    if (b.x < 0 || b.x > CANVAS_WIDTH || b.y < 0 || b.y > CANVAS_HEIGHT) {
      bullets.splice(i, 1)
      continue
    }

    // Bullet-to-bullet collision
    let bulletCancelled = false
    for (let j = bullets.length - 1; j >= 0; j--) {
      if (i !== j && bullets[j] && b.owner !== bullets[j].owner) {
        const other = bullets[j]
        if (Math.abs(b.x - other.x) < 8 && Math.abs(b.y - other.y) < 8) {
          spawnSparks(b.x, b.y, '#f59e0b', 6)
          bullets.splice(Math.max(i, j), 1)
          bullets.splice(Math.min(i, j), 1)
          bulletCancelled = true
          break
        }
      }
    }
    if (bulletCancelled) continue

    // Bullet vs Map Tiles
    const col = Math.floor(b.x / TILE_SIZE)
    const row = Math.floor(b.y / TILE_SIZE)

    if (row >= 0 && row < MAP_SIZE && col >= 0 && col < MAP_SIZE) {
      const tile = map[row][col]

      if (tile === TILE_BRICK) {
        map[row][col] = TILE_EMPTY
        tankAudio.explodeSmall()
        spawnSparks(b.x, b.y, '#f97316', 8)
        bullets.splice(i, 1)
        continue
      } else if (tile === TILE_STEEL) {
        if (b.power >= 3) {
          map[row][col] = TILE_EMPTY
          tankAudio.explodeLarge()
          spawnSparks(b.x, b.y, '#94a3b8', 12)
        } else {
          tankAudio.hitSteel()
          spawnSparks(b.x, b.y, '#fcd34d', 5)
        }
        bullets.splice(i, 1)
        continue
      } else if (tile === TILE_BASE) {
        // Base destroyed!
        map[24][12] = TILE_EMPTY
        map[24][13] = TILE_EMPTY
        map[25][12] = TILE_EMPTY
        map[25][13] = TILE_EMPTY
        baseDestroyed = true
        tankAudio.explodeLarge()
        spawnSparks(12 * TILE_SIZE, 24 * TILE_SIZE, '#ef4444', 30)
        bullets.splice(i, 1)
        handleGameOver()
        return
      }
    }

    // Bullet vs Tanks
    const bBox = { x: b.x, y: b.y, w: 6, h: 6 }

    if (b.owner === 'player') {
      for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
        const enemy = enemies[eIdx]
        if (checkAABB(bBox, { x: enemy.x, y: enemy.y, w: TANK_SIZE, h: TANK_SIZE })) {
          enemy.hp--
          spawnSparks(b.x, b.y, '#ef4444', 6)
          bullets.splice(i, 1)

          if (enemy.hp <= 0) {
            tankAudio.explodeLarge()
            spawnSparks(enemy.x + 14, enemy.y + 14, '#f59e0b', 24)

            // Spawn powerup if red tank
            if (enemy.isRed) {
              spawnRandomPowerUp(enemy.x, enemy.y)
            }

            const pts = enemy.type === 'armor' ? 400 : (enemy.type === 'power' ? 300 : (enemy.type === 'fast' ? 200 : 100))
            score.value += pts

            enemies.splice(eIdx, 1)
            enemiesRemaining.value--

            // Check stage clear
            if (enemiesRemaining.value <= 0 && enemies.length === 0) {
              gameState.value = 'victory'
              tankAudio.stageStart()
            }
          } else {
            tankAudio.hitSteel()
          }
          break
        }
      }
    } else {
      // Enemy bullet vs Player
      if (checkAABB(bBox, { x: player.x, y: player.y, w: TANK_SIZE, h: TANK_SIZE })) {
        bullets.splice(i, 1)
        if (player.invulnerableTime <= 0) {
          tankAudio.explodeLarge()
          spawnSparks(player.x + 14, player.y + 14, '#ef4444', 28)
          lives.value--
          playerUpgrade.value = 0
          if (lives.value <= 0) {
            handleGameOver()
            return
          } else {
            player = createPlayerTank()
          }
        }
      }
    }
  }
}

// --- Power-ups & Shovel Wall ---
function spawnRandomPowerUp(x: number, y: number) {
  const types: PowerUp['type'][] = ['star', 'bomb', 'clock', 'shovel', 'shield', 'tank']
  const type = types[Math.floor(Math.random() * types.length)]
  powerUps.push({
    x: Math.max(16, Math.min(CANVAS_WIDTH - 32, x)),
    y: Math.max(16, Math.min(CANVAS_HEIGHT - 32, y)),
    type,
    duration: 600
  })
}

function applyPowerUp(type: PowerUp['type']) {
  if (type === 'star') {
    playerUpgrade.value = Math.min(3, playerUpgrade.value + 1)
  } else if (type === 'bomb') {
    for (const enemy of enemies) {
      spawnSparks(enemy.x + 14, enemy.y + 14, '#f59e0b', 20)
      score.value += 100
      enemiesRemaining.value--
    }
    enemies = []
    tankAudio.explodeLarge()
    if (enemiesRemaining.value <= 0) {
      gameState.value = 'victory'
    }
  } else if (type === 'clock') {
    freezeTimer = 400 // ~7 seconds
  } else if (type === 'shovel') {
    shovelTimer = 600 // ~10 seconds
    BASE_WALL_COORDS.forEach(({ x, y }) => {
      map[y][x] = TILE_STEEL
    })
  } else if (type === 'shield') {
    player.invulnerableTime = 600
  } else if (type === 'tank') {
    lives.value++
  }
}

function updateShovelTimer() {
  if (shovelTimer > 0) {
    shovelTimer--
    if (shovelTimer === 0) {
      BASE_WALL_COORDS.forEach(({ x, y }) => {
        map[y][x] = TILE_BRICK
      })
    }
  }
}

function handleGameOver() {
  gameState.value = 'gameover'
  tankAudio.gameOver()
}

// --- Particle Effects ---
function spawnSparks(x: number, y: number, color: string, count: number) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const spd = Math.random() * 3 + 1
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 0,
      maxLife: Math.floor(Math.random() * 15 + 10),
      color,
      size: Math.random() * 3 + 2
    })
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.x += p.vx
    p.y += p.vy
    p.life++
    if (p.life >= p.maxLife) {
      particles.splice(i, 1)
    }
  }
}

// --- Main Game Loop ---
function gameLoop(time: number) {
  animationFrameId = requestAnimationFrame(gameLoop)
  const dt = time - lastTime
  lastTime = time

  if (!isPaused.value && gameState.value === 'playing') {
    updateSpawning()
    updatePlayer()
    updateEnemies()
    updateBullets()
    updateShovelTimer()
    updateParticles()
  }

  render()
}

// --- Canvas Rendering ---
function render() {
  if (!ctx) return

  // Background
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  // 1. Draw Map Tiles (except Trees, rendered later on top)
  for (let r = 0; r < MAP_SIZE; r++) {
    for (let c = 0; c < MAP_SIZE; c++) {
      const tile = map[r][c]
      const tx = c * TILE_SIZE
      const ty = r * TILE_SIZE

      if (tile === TILE_BRICK) {
        drawBrick(ctx, tx, ty)
      } else if (tile === TILE_STEEL) {
        drawSteel(ctx, tx, ty)
      } else if (tile === TILE_WATER) {
        drawWater(ctx, tx, ty)
      }
    }
  }

  // Draw Base (Eagle)
  drawBaseEagle(ctx)

  // 2. Draw Spawn Portals
  for (const portal of spawnPortals) {
    ctx.strokeStyle = '#38bdf8'
    ctx.lineWidth = 2
    ctx.save()
    ctx.translate(portal.x + 14, portal.y + 14)
    ctx.rotate((portal.time * 0.15) % (Math.PI * 2))
    ctx.strokeRect(-10, -10, 20, 20)
    ctx.restore()
  }

  // 3. Draw PowerUps
  for (const pu of powerUps) {
    drawPowerUp(ctx, pu)
  }

  // 4. Draw Tanks
  // Enemies
  for (const enemy of enemies) {
    drawTank(ctx, enemy)
  }

  // Player
  if (gameState.value === 'playing') {
    drawTank(ctx, player)
  }

  // 5. Draw Trees / Grass on TOP so tanks hide underneath
  for (let r = 0; r < MAP_SIZE; r++) {
    for (let c = 0; c < MAP_SIZE; c++) {
      if (map[r][c] === TILE_TREES) {
        drawTrees(ctx, c * TILE_SIZE, r * TILE_SIZE)
      }
    }
  }

  // 6. Draw Bullets
  for (const b of bullets) {
    ctx.fillStyle = b.owner === 'player' ? '#fcd34d' : '#f87171'
    ctx.beginPath()
    ctx.arc(b.x + 3, b.y + 3, 3, 0, Math.PI * 2)
    ctx.fill()
  }

  // 7. Draw Particles
  for (const p of particles) {
    ctx.fillStyle = p.color
    ctx.fillRect(p.x, p.y, p.size, p.size)
  }
}

// --- Procedural Sprite Painters ---
function drawBrick(c: CanvasRenderingContext2D, x: number, y: number) {
  c.fillStyle = '#b45309'
  c.fillRect(x, y, TILE_SIZE, TILE_SIZE)
  c.fillStyle = '#d97706'
  c.fillRect(x + 1, y + 1, 6, 6)
  c.fillRect(x + 9, y + 1, 6, 6)
  c.fillRect(x + 1, y + 9, 6, 6)
  c.fillRect(x + 9, y + 9, 6, 6)
  c.fillStyle = '#78350f'
  c.fillRect(x, y + 7, TILE_SIZE, 1)
  c.fillRect(x + 7, y, 1, 7)
  c.fillRect(x + 7, y + 8, 1, 8)
}

function drawSteel(c: CanvasRenderingContext2D, x: number, y: number) {
  c.fillStyle = '#94a3b8'
  c.fillRect(x, y, TILE_SIZE, TILE_SIZE)
  c.fillStyle = '#cbd5e1'
  c.fillRect(x + 2, y + 2, 5, 5)
  c.fillRect(x + 9, y + 2, 5, 5)
  c.fillRect(x + 2, y + 9, 5, 5)
  c.fillRect(x + 9, y + 9, 5, 5)
  c.fillStyle = '#475569'
  c.fillRect(x, y, TILE_SIZE, 1)
  c.fillRect(x, y, 1, TILE_SIZE)
}

function drawWater(c: CanvasRenderingContext2D, x: number, y: number) {
  c.fillStyle = '#0284c7'
  c.fillRect(x, y, TILE_SIZE, TILE_SIZE)
  c.fillStyle = '#38bdf8'
  const offset = (Date.now() / 300) % 8
  c.fillRect(x + (offset % 12), y + 4, 4, 2)
  c.fillRect(x + ((offset + 6) % 12), y + 11, 4, 2)
}

function drawTrees(c: CanvasRenderingContext2D, x: number, y: number) {
  c.fillStyle = '#15803d'
  c.fillRect(x, y, TILE_SIZE, TILE_SIZE)
  c.fillStyle = '#22c55e'
  c.fillRect(x + 1, y + 1, 6, 6)
  c.fillRect(x + 9, y + 7, 6, 6)
}

function drawBaseEagle(c: CanvasRenderingContext2D) {
  const bx = 12 * TILE_SIZE
  const by = 24 * TILE_SIZE
  const bw = 2 * TILE_SIZE
  const bh = 2 * TILE_SIZE

  if (baseDestroyed) {
    c.fillStyle = '#334155'
    c.fillRect(bx, by, bw, bh)
    c.fillStyle = '#94a3b8'
    c.font = '20px sans-serif'
    c.fillText('🏳️', bx + 4, by + 24)
    return
  }

  // Golden Phoenix Crest
  c.fillStyle = '#1e293b'
  c.fillRect(bx, by, bw, bh)
  c.fillStyle = '#f59e0b'
  // Wings
  c.beginPath()
  c.moveTo(bx + 16, by + 4)
  c.lineTo(bx + 4, by + 16)
  c.lineTo(bx + 16, by + 28)
  c.lineTo(bx + 28, by + 16)
  c.closePath()
  c.fill()

  c.fillStyle = '#fef08a'
  c.beginPath()
  c.arc(bx + 16, by + 16, 6, 0, Math.PI * 2)
  c.fill()
}

function drawTank(c: CanvasRenderingContext2D, tank: Tank) {
  c.save()
  c.translate(tank.x + TANK_SIZE / 2, tank.y + TANK_SIZE / 2)

  // Rotation based on dir
  // 0: Up (0 deg), 1: Right (90 deg), 2: Down (180 deg), 3: Left (270 deg)
  const angle = (tank.dir * 90 * Math.PI) / 180
  c.rotate(angle)

  // Tank Color Scheme
  let bodyColor = '#eab308' // Player Gold
  let trackColor = '#713f12'

  if (!tank.isPlayer) {
    if (tank.isRed) {
      bodyColor = '#ef4444' // Red Flash
      trackColor = '#7f1d1d'
    } else if (tank.type === 'armor') {
      if (tank.hp >= 4) bodyColor = '#10b981'
      else if (tank.hp === 3) bodyColor = '#eab308'
      else if (tank.hp === 2) bodyColor = '#f97316'
      else bodyColor = '#ef4444'
      trackColor = '#1e293b'
    } else if (tank.type === 'fast') {
      bodyColor = '#38bdf8'
      trackColor = '#0369a1'
    } else if (tank.type === 'power') {
      bodyColor = '#a855f7'
      trackColor = '#581c87'
    } else {
      bodyColor = '#94a3b8'
      trackColor = '#334155'
    }
  }

  // Left & Right Tracks
  c.fillStyle = trackColor
  c.fillRect(-12, -13, 6, 26)
  c.fillRect(6, -13, 6, 26)

  // Main Hull
  c.fillStyle = bodyColor
  c.fillRect(-8, -10, 16, 20)

  // Turret Center
  c.fillStyle = '#f8fafc'
  c.beginPath()
  c.arc(0, 0, 5, 0, Math.PI * 2)
  c.fill()

  // Gun Barrel (pointing Up relative to rotation)
  c.fillStyle = bodyColor
  c.fillRect(-2, -16, 4, 12)

  // Invulnerability Shield Effect
  if (tank.invulnerableTime > 0) {
    c.strokeStyle = (Date.now() % 200 < 100) ? '#38bdf8' : '#ffffff'
    c.lineWidth = 2
    c.beginPath()
    c.arc(0, 0, 18, 0, Math.PI * 2)
    c.stroke()
  }

  c.restore()
}

function drawPowerUp(c: CanvasRenderingContext2D, pu: PowerUp) {
  c.save()
  c.translate(pu.x + 12, pu.y + 12)
  c.fillStyle = '#1e293b'
  c.fillRect(-12, -12, 24, 24)
  c.strokeStyle = '#f59e0b'
  c.lineWidth = 2
  c.strokeRect(-12, -12, 24, 24)

  c.font = '14px sans-serif'
  c.textAlign = 'center'
  c.textBaseline = 'middle'

  let icon = '⭐'
  if (pu.type === 'bomb') icon = '💣'
  if (pu.type === 'clock') icon = '⏱️'
  if (pu.type === 'shovel') icon = '⛏️'
  if (pu.type === 'shield') icon = '🛡️'
  if (pu.type === 'tank') icon = '❤️'

  c.fillText(icon, 0, 2)
  c.restore()
}
</script>

<style scoped>
.battle-city-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: var(--space-4);
}

/* Fullscreen mode: 100vh, 100vw, NO SCROLL */
:fullscreen,
.battle-city-container:fullscreen,
.battle-city-container.is-fullscreen {
  width: 100vw !important;
  height: 100vh !important;
  max-width: 100vw !important;
  max-height: 100vh !important;
  padding: 0 !important;
  margin: 0 !important;
  background: #050811 !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  align-items: center !important;
  overflow: hidden !important;
}

:fullscreen .arcade-cabinet,
.battle-city-container.is-fullscreen .arcade-cabinet {
  height: 100vh !important;
  max-height: 100vh !important;
  width: auto !important;
  max-width: min(100vw, calc((100vh - 84px) + 90px)) !important;
  border-radius: 0 !important;
  border: none !important;
  box-shadow: none !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: space-between !important;
  overflow: hidden !important;
}

:fullscreen .cabinet-header,
.battle-city-container.is-fullscreen .cabinet-header {
  padding: 6px 14px !important;
  flex-shrink: 0 !important;
  border-bottom: 1px solid #334155 !important;
}

:fullscreen .screen-frame,
.battle-city-container.is-fullscreen .screen-frame {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  border-bottom: none !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
}

:fullscreen .canvas-wrapper,
.battle-city-container.is-fullscreen .canvas-wrapper {
  width: min(calc(100vh - 86px), calc(100vw - 110px)) !important;
  height: min(calc(100vh - 86px), calc(100vw - 110px)) !important;
  max-width: calc(100vh - 86px) !important;
  max-height: calc(100vh - 86px) !important;
  flex-shrink: 0 !important;
}

:fullscreen .retro-side-panel,
.battle-city-container.is-fullscreen .retro-side-panel {
  height: min(calc(100vh - 86px), calc(100vw - 110px)) !important;
  max-height: min(calc(100vh - 86px), calc(100vw - 110px)) !important;
  padding: 4px !important;
  width: 56px !important;
}

:fullscreen .cabinet-footer,
.battle-city-container.is-fullscreen .cabinet-footer {
  padding: 4px 12px !important;
  flex-shrink: 0 !important;
  border-top: 1px solid #334155 !important;
}

:fullscreen .desktop-hints,
.battle-city-container.is-fullscreen .desktop-hints {
  font-size: 0.72rem !important;
}

.arcade-cabinet {
  background: #0f172a;
  border: 3px solid #334155;
  border-radius: var(--radius-lg);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6), 0 0 30px rgba(56, 189, 248, 0.15);
  display: flex;
  flex-direction: column;
  max-width: 780px;
  width: 100%;
  overflow: hidden;
}

.cabinet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #1e293b;
  padding: var(--space-3) var(--space-4);
  border-bottom: 2px solid #334155;
}

.title-badge {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.retro-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.retro-dot.red { background: #ef4444; }
.retro-dot.yellow { background: #f59e0b; }
.retro-dot.green { background: #10b981; }

.arcade-title {
  font-family: 'Orbitron', sans-serif;
  font-weight: 800;
  font-size: 1.05rem;
  color: #fcd34d;
  letter-spacing: 1px;
}

.cabinet-controls {
  display: flex;
  gap: var(--space-2);
}

.icon-btn {
  background: #334155;
  border: 1px solid #475569;
  border-radius: var(--radius-sm);
  color: #f8fafc;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: #475569;
  transform: scale(1.05);
}

.icon-btn.muted {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.2);
}

.screen-frame {
  display: flex;
  background: #000;
  position: relative;
  justify-content: center;
  border-bottom: 3px solid #334155;
}

.canvas-wrapper {
  position: relative;
  width: min(624px, calc(100vw - 160px), calc(100vh - 220px));
  height: min(624px, calc(100vw - 160px), calc(100vh - 220px));
  aspect-ratio: 1 / 1;
  background: #000;
  flex-shrink: 0;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
}

.game-canvas {
  width: 100%;
  height: 100%;
  display: block;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.canvas-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.overlay-box {
  background: #1e293b;
  border: 2px solid #f97316;
  border-radius: var(--radius-md);
  padding: var(--space-5);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  box-shadow: 0 0 25px rgba(249, 115, 22, 0.4);
}

.overlay-box h2 {
  font-family: 'Orbitron', sans-serif;
  color: #ef4444;
  font-size: 1.8rem;
  margin: 0;
}

.overlay-box h2.victory-title {
  color: #10b981;
}

.final-score {
  font-family: 'Fira Code', monospace;
  font-size: 1.1rem;
  color: #fcd34d;
}

.btn-arcade {
  background: #f97316;
  color: white;
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  padding: 0.6rem 1.4rem;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-arcade:hover {
  background: #ea580c;
  transform: translateY(-2px);
}

.stage-intro-overlay {
  background: #000;
  flex-direction: column;
}

.stage-banner-text h3 {
  font-family: 'Orbitron', sans-serif;
  font-size: 2rem;
  color: #f8fafc;
  letter-spacing: 2px;
}

/* NES Retro Side Panel */
.retro-side-panel {
  width: 72px;
  background: #64748b;
  border-left: 2px solid #334155;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: var(--space-3) 4px;
}

.panel-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.panel-label {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  color: #0f172a;
}

.enemy-icon-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2px;
}

.enemy-icon {
  font-size: 0.75rem;
  transition: opacity 0.2s;
}

.enemy-icon.dead {
  opacity: 0.15;
}

.stat-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 6px;
}

.stat-label {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  color: #0f172a;
}

.stat-val {
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  font-weight: 700;
  color: #f8fafc;
}

.stage-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.flag-icon {
  font-size: 1.2rem;
}

.stage-num {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  font-weight: 800;
  color: #0f172a;
}

/* Cabinet Footer & Controls */
.cabinet-footer {
  background: #1e293b;
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.desktop-hints {
  display: flex;
  justify-content: space-around;
  font-size: 0.8rem;
  color: #cbd5e1;
}

.mobile-dpad-container {
  display: none;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) 0;
}

.dpad {
  display: grid;
  grid-template-columns: repeat(3, 44px);
  grid-template-rows: repeat(3, 44px);
  gap: 2px;
}

.dpad-btn {
  background: #334155;
  border: 1px solid #475569;
  border-radius: var(--radius-sm);
  color: #f8fafc;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: manipulation;
}

.dpad-btn:active {
  background: #f97316;
}

.dpad-up { grid-column: 2; grid-row: 1; }
.dpad-left { grid-column: 1; grid-row: 2; }
.dpad-center { grid-column: 2; grid-row: 2; background: #1e293b; border-radius: 4px; }
.dpad-right { grid-column: 3; grid-row: 2; }
.dpad-down { grid-column: 2; grid-row: 3; }

.action-btn {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: #ef4444;
  border: 3px solid #b91c1c;
  color: white;
  font-family: 'Orbitron', sans-serif;
  font-weight: 800;
  font-size: 0.95rem;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
  touch-action: manipulation;
  cursor: pointer;
}

.action-btn:active {
  transform: scale(0.95);
  background: #dc2626;
}

@media (max-width: 640px) {
  .battle-city-container {
    padding: var(--space-1);
  }
  
  .canvas-wrapper {
    width: min(94vw, 416px);
    height: min(94vw, 416px);
  }

  .retro-side-panel {
    width: 52px;
    padding: var(--space-2) 2px;
  }

  .desktop-hints {
    display: none;
  }

  .mobile-dpad-container {
    display: flex;
  }
}
</style>
