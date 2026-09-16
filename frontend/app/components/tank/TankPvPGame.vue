<template>
  <div class="pvp-game-container" ref="containerRef" :class="{ 'is-fullscreen': isFullscreen }">
    <!-- Match HUD Top: Both Team Eagles & Scores -->
    <div class="pvp-top-hud">
      <!-- Blue Team Status -->
      <div class="team-hud-block blue-hud" :class="{ dead: !blueEagleAlive }">
        <div class="hud-crest">🛡️</div>
        <div class="hud-meta">
          <div class="hud-team-title-row">
            <span class="hud-team-name">ĐỘI XANH</span>
            <span class="team-series-badge blue-badge" title="Số ván thắng của Đội Xanh">
              🏆 {{ currentTankRoom?.teamScores?.blue ?? 0 }}
            </span>
          </div>
          <span class="hud-status-tag">{{ blueEagleAlive ? 'ĐẠI BÀNG: BÌNH YÊN' : 'ĐẠI BÀNG: BỊ TIÊU DIỆT' }}</span>
        </div>
      </div>

      <div class="hud-center-score">
        <div class="hud-badge-row">
          <span class="room-code-tag">{{ currentTankRoom?.roomCode }}</span>
          <span class="map-name-tag">🗺️ {{ currentMapName }}</span>
        </div>
        <div class="series-scoreboard-box" title="Tổng tỉ số liên đấu nhiều ván giữa 2 đội">
          <span class="series-num blue-score">{{ currentTankRoom?.teamScores?.blue ?? 0 }}</span>
          <span class="series-vs">:</span>
          <span class="series-num red-score">{{ currentTankRoom?.teamScores?.red ?? 0 }}</span>
        </div>
        <div class="series-caption">TỈ SỐ LIÊN ĐẤU</div>
      </div>

      <!-- Red Team Status -->
      <div class="team-hud-block red-hud" :class="{ dead: !redEagleAlive }">
        <div class="hud-meta text-right">
          <div class="hud-team-title-row justify-end">
            <span class="team-series-badge red-badge" title="Số ván thắng của Đội Đỏ">
              🏆 {{ currentTankRoom?.teamScores?.red ?? 0 }}
            </span>
            <span class="hud-team-name">ĐỘI ĐỎ</span>
          </div>
          <span class="hud-status-tag">{{ redEagleAlive ? 'ĐẠI BÀNG: BÌNH YÊN' : 'ĐẠI BÀNG: BỊ TIÊU DIỆT' }}</span>
        </div>
        <div class="hud-crest">🛡️</div>
      </div>

      <!-- Fullscreen Toggle Button -->
      <button 
        class="btn-fullscreen-toggle" 
        @click="toggleFullscreen" 
        :title="isFullscreen ? 'Thu nhỏ (Esc)' : 'Toàn màn hình (F)'"
      >
        <LucideMinimize v-if="isFullscreen" class="icon" />
        <LucideMaximize v-else class="icon" />
        <span class="fs-label">{{ isFullscreen ? 'THU NHỎ' : 'TOÀN MÀN HÌNH' }}</span>
      </button>
    </div>

    <!-- Canvas Frame -->
    <div class="screen-frame">
      <div class="canvas-wrapper">
        <canvas 
          ref="canvasRef" 
          :width="CANVAS_WIDTH * 2" 
          :height="CANVAS_HEIGHT * 2" 
          class="game-canvas"
        ></canvas>

        <!-- Spectator Overlay when 0 lives -->
        <div v-if="isEliminated && !winner" class="canvas-overlay spectator-overlay">
          <div class="overlay-box spectator-box">
            <h3 class="spectator-title">💀 BẠN ĐÃ HẾT 3 MẠNG</h3>
            <p>Đang ở chế độ quan sát đồng đội thi đấu...</p>
          </div>
        </div>

        <!-- Game Over / Victory Overlay -->
        <div v-if="winner" class="canvas-overlay victory-overlay">
          <div class="overlay-box" :class="winner === 'blue' ? 'blue-win' : 'red-win'">
            <h2 class="winner-title">
              {{ winner === 'blue' ? '🏆 ĐỘI XANH CHIẾN THẮNG!' : '🏆 ĐỘI ĐỎ CHIẾN THẮNG!' }}
            </h2>
            <p class="winner-desc">
              {{ gameOverReasonText }}
            </p>

            <!-- Series Score in Victory Modal -->
            <div class="series-victory-banner">
              <span class="series-victory-title">TỔNG TỈ SỐ LIÊN ĐẤU</span>
              <div class="series-victory-score">
                <span class="team-blue-text">ĐỘI XANH: <b>{{ currentTankRoom?.teamScores?.blue ?? 0 }}</b></span>
                <span class="series-victory-dash">-</span>
                <span class="team-red-text"><b>{{ currentTankRoom?.teamScores?.red ?? 0 }}</b> :ĐỘI ĐỎ</span>
              </div>
            </div>

            <div class="match-stats-table">
              <div 
                v-for="p in currentTankRoom?.players" 
                :key="p.id" 
                class="stat-row-item"
                :class="p.team === 'blue' ? 'team-blue-text' : 'team-red-text'"
              >
                <span>{{ p.name }} ({{ p.team === 'blue' ? 'Đội Xanh' : 'Đội Đỏ' }})</span>
                <span>❤️ {{ p.lives ?? 0 }} | K: {{ p.kills }} | D: {{ p.deaths }}</span>
              </div>
            </div>

            <div class="action-buttons-row">
              <button class="btn btn-arcade" @click="handleRematch">
                ĐẤU LẠI VÁN MỚI
              </button>
              <button class="btn btn-secondary" @click="handleBackToLobby">
                VỀ PHÒNG CHỜ
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Live Player Roster Sidebar -->
      <div class="pvp-sidebar">
        <div class="sidebar-title">CHIẾN BINH</div>

        <div class="roster-list">
          <div 
            v-for="p in currentTankRoom?.players" 
            :key="p.id" 
            class="roster-item"
            :class="p.team === 'blue' ? 'roster-blue' : 'roster-red'"
          >
            <div class="roster-avatar">
              {{ getTankIcon(p) }}
            </div>
            <div class="roster-info">
              <span class="roster-name">
                {{ p.name }}
                <small v-if="p.id === myPlayerId">(Bạn)</small>
              </span>
              <div class="roster-lives">
                <span 
                  v-for="h in 3" 
                  :key="h" 
                  class="heart-dot"
                >
                  {{ h <= (p.lives ?? 3) ? '❤️' : '🖤' }}
                </span>
              </div>
              <span class="roster-kd">K: {{ p.kills }} | D: {{ p.deaths }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Controls / Hints Footer -->
    <div class="cabinet-footer">
      <div class="desktop-hints">
        <span>🎮 <b>Di chuyển:</b> Mũi tên / WASD</span>
        <span>💥 <b>Bắn:</b> Space / J</span>
        <span>🛡️ <b>Bảo vệ:</b> Đại bàng nhà mình</span>
        <span>🎯 <b>Tiêu diệt:</b> Đại bàng đối phương</span>
      </div>

      <!-- Virtual D-Pad for Mobile -->
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
            @touchstart.prevent="fireBullet" 
            @mousedown.prevent="fireBullet"
          >
            FIRE
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { LucideMaximize, LucideMinimize } from '@lucide/vue'
import { useTankSocket } from '~/composables/useTankSocket'
import { tankAudio } from '~/utils/tank/tankAudio'
import { 
  TILE_EMPTY, 
  TILE_BRICK, 
  TILE_STEEL, 
  TILE_WATER, 
  TILE_TREES, 
  TILE_BASE_BLUE, 
  TILE_BASE_RED, 
  TILE_FORT_BLUE,
  TILE_FORT_RED,
  MAP_SIZE, 
  PVP_SPAWN_POINTS, 
  getPvPStageMap,
  PVP_MAP_NAMES
} from '~/utils/tank/tankMaps'
import type { Direction, Bullet, Tank, Particle, Team, TankPlayer } from '~/types/tank'

const { 
  currentTankRoom, 
  myPlayerId, 
  initTankListeners, 
  sendMove, 
  sendRespawn,
  sendShoot, 
  sendTileHit, 
  sendEagleHit, 
  sendKill, 
  rematch, 
  leaveRoom 
} = useTankSocket()

// Fullscreen State & Controller
const isFullscreen = ref(false)
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

// Constants
const TILE_SIZE = 16
const CANVAS_WIDTH = MAP_SIZE * TILE_SIZE // 416 px
const CANVAS_HEIGHT = MAP_SIZE * TILE_SIZE // 416 px
const TANK_SIZE = 28

// Canvas & Game State
const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let animationFrameId: number = 0
let lastTime = 0

// Map & Fortress Wall Health Map (4 hits per fortress tile)
let map: number[][] = []
const wallHp = new Map<string, number>()
const blueEagleAlive = ref(true)
const redEagleAlive = ref(true)
const winner = ref<Team | null>(null)
const gameOverReason = ref<'eagle' | 'lives' | null>(null)

const currentMapName = computed(() => {
  const mapIdx = currentTankRoom.value?.mapIndex ?? 0
  const safeIdx = ((Math.floor(mapIdx) % PVP_MAP_NAMES.length) + PVP_MAP_NAMES.length) % PVP_MAP_NAMES.length
  return PVP_MAP_NAMES[safeIdx] || 'Chiến Tuyến Cổ Điển'
})

const myPlayer = computed(() => {
  return currentTankRoom.value?.players.find(p => p.id === myPlayerId.value)
})

const isEliminated = computed(() => {
  return (myPlayer.value?.lives ?? 3) <= 0
})

const gameOverReasonText = computed(() => {
  const loserTeamName = winner.value === 'blue' ? 'Đội Đỏ' : 'Đội Xanh'
  if (gameOverReason.value === 'lives') {
    return `Toàn bộ chiến xa của ${loserTeamName} đã bị tiêu diệt hết 3 mạng!`
  }
  return `Đại bàng căn cứ của ${loserTeamName} đã bị bắn sập!`
})

// Entities
let myTank: Tank = createLocalTank()
const remoteTanks = new Map<string, Tank>()
let bullets: Bullet[] = []
let particles: Particle[] = []
let nextBulletId = 1
const keysPressed: Record<string, boolean> = {}

// Cinematic Explosions & Screen Shake
interface FireballPuff {
  dx: number
  dy: number
  radius: number
  maxRadius: number
  color: string
}

interface TankExplosion {
  x: number
  y: number
  life: number
  maxLife: number
  shockwaveRadius: number
  maxShockwaveRadius: number
  puffs: FireballPuff[]
}

const explosions: TankExplosion[] = []
let screenShake = 0

function getSpawnForPlayer(playerId: string): { x: number; y: number; dir: Direction } {
  const p = currentTankRoom.value?.players.find(pl => pl.id === playerId)
  const team: Team = p?.team || 'blue'
  const teamPlayers = currentTankRoom.value?.players.filter(tp => tp.team === team) || []
  const idx = Math.max(0, teamPlayers.findIndex(tp => tp.id === playerId))
  const sp = PVP_SPAWN_POINTS[team][idx] || PVP_SPAWN_POINTS[team][0]
  return { x: sp.x, y: sp.y, dir: sp.dir as Direction }
}

function createLocalTank(): Tank {
  const me = currentTankRoom.value?.players.find(p => p.id === myPlayerId.value)
  const spawn = getSpawnForPlayer(myPlayerId.value || '')

  return {
    id: myPlayerId.value || 'local',
    name: me?.name || 'Player',
    x: spawn.x,
    y: spawn.y,
    dir: spawn.dir,
    speed: 2.0,
    isPlayer: true,
    team: me?.team || 'blue',
    hp: 1,
    shootCooldown: 0,
    invulnerableTime: 0,
    invulnerableUntil: Date.now() + 1500 // 1.5s shield on match start
  }
}

function getTankIcon(player: TankPlayer) {
  if (player.team === 'blue') {
    return player.seat % 2 === 0 ? '🟡' : '🔷'
  }
  return player.seat % 2 === 0 ? '🔴' : '🟣'
}

function initMapAndFortress(mapIdx: number) {
  map = getPvPStageMap(mapIdx)
  wallHp.clear()
  for (let r = 0; r < MAP_SIZE; r++) {
    for (let c = 0; c < MAP_SIZE; c++) {
      if (map[r][c] === TILE_FORT_BLUE || map[r][c] === TILE_FORT_RED) {
        wallHp.set(`${r}_${c}`, 5) // Exactly 5 hits to break! (Shot #6 destroys eagle)
      }
    }
  }
}

// Lifecycle
onMounted(() => {
  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d')
  }

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)

  // Load Map & Eagles from room's random mapIndex
  const mapIdx = currentTankRoom.value?.mapIndex ?? 0
  initMapAndFortress(mapIdx)
  blueEagleAlive.value = true
  redEagleAlive.value = true
  winner.value = null
  gameOverReason.value = null

  // Spawn Local Tank
  myTank = createLocalTank()

  // Initialize Remote Tanks from Room
  remoteTanks.clear()
  currentTankRoom.value?.players.forEach(p => {
    if (p.id !== myPlayerId.value) {
      const sp = getSpawnForPlayer(p.id)
      remoteTanks.set(p.id, {
        id: p.id,
        name: p.name,
        x: sp.x,
        y: sp.y,
        dir: sp.dir,
        speed: 2.0,
        isPlayer: true,
        team: p.team,
        hp: 1,
        shootCooldown: 0,
        invulnerableTime: 0,
        invulnerableUntil: Date.now() + 1500 // 1.5s shield on match start
      })
    }
  })

  // Register Socket Listeners for Real-time PvP
  initTankListeners({
    onRemoteMove: ({ socketId, x, y, dir }) => {
      for (const t of remoteTanks.values()) {
        const playerObj = currentTankRoom.value?.players.find(p => p.id === t.id)
        if (playerObj?.socketId === socketId || t.id === socketId) {
          t.x = x
          t.y = y
          t.dir = dir as Direction
          break
        }
      }
    },
    onRemoteRespawn: ({ playerId, x, y, dir }: any) => {
      if (playerId !== myPlayerId.value) {
        const remote = remoteTanks.get(playerId)
        if (remote) {
          remote.x = x
          remote.y = y
          remote.dir = dir as Direction
          remote.invulnerableUntil = Date.now() + 1500
        }
      }
    },
    onRemoteShoot: ({ x, y, dir, power, ownerId, ownerTeam }) => {
      tankAudio.shoot()
      let vx = 0
      let vy = 0
      const bSpeed = 4.2
      if (dir === 0) vy = -bSpeed
      else if (dir === 1) vx = bSpeed
      else if (dir === 2) vy = bSpeed
      else if (dir === 3) vx = -bSpeed

      bullets.push({
        id: nextBulletId++,
        x,
        y,
        vx,
        vy,
        dir: dir as Direction,
        owner: 'player',
        ownerId,
        ownerTeam,
        power
      })
    },
    onRemoteTile: ({ row, col, newType, hp }: any) => {
      if (row >= 0 && row < MAP_SIZE && col >= 0 && col < MAP_SIZE) {
        map[row][col] = newType
        const key = `${row}_${col}`
        if (hp !== undefined) {
          if (hp <= 0 || newType === TILE_EMPTY) {
            wallHp.delete(key)
          } else {
            wallHp.set(key, hp)
          }
        }
        if (newType === TILE_EMPTY) {
          tankAudio.explodeSmall()
          spawnSparks(col * TILE_SIZE + 8, row * TILE_SIZE + 8, '#f97316', 10)
        } else {
          tankAudio.hitSteel()
          spawnSparks(col * TILE_SIZE + 8, row * TILE_SIZE + 8, '#94a3b8', 6)
        }
      }
    },
    onRemoteKill: ({ victimId, killerId, victimLives, room }: any) => {
      if (room) currentTankRoom.value = room
      const victim = victimId === myTank.id ? myTank : remoteTanks.get(victimId)
      if (victim && victim.x >= 0 && victim.y >= 0) {
        spawnExplosion(victim.x + TANK_SIZE / 2, victim.y + TANK_SIZE / 2, true)
      }
      if (victimId === myTank.id) {
        // Local tank died -> ALWAYS reset back to base spawn point with 1.5s shield!
        const me = room?.players?.find((p: any) => p.id === myPlayerId.value)
        const livesLeft = victimLives !== undefined ? victimLives : (me?.lives ?? 0)
        if (livesLeft <= 0) {
          myTank.x = -999
          myTank.y = -999
          sendMove(-999, -999, 0)
        } else {
          const sp = getSpawnForPlayer(myTank.id as string)
          myTank.x = sp.x
          myTank.y = sp.y
          myTank.dir = sp.dir
          myTank.invulnerableUntil = Date.now() + 1500
          myTank.invulnerableTime = 0
          sendRespawn(myTank.x, myTank.y, myTank.dir)
          sendMove(myTank.x, myTank.y, myTank.dir)
        }
      } else {
        const remote = remoteTanks.get(victimId)
        if (remote) {
          const livesLeft = victimLives !== undefined ? victimLives : (room?.players?.find((p: any) => p.id === victimId)?.lives ?? 0)
          if (livesLeft <= 0) {
            remote.x = -999
            remote.y = -999
            remoteTanks.delete(victimId)
          } else {
            // Immediate respawn back to base spawn point with 1.5s shield!
            const sp = getSpawnForPlayer(victimId)
            remote.x = sp.x
            remote.y = sp.y
            remote.dir = sp.dir
            remote.invulnerableUntil = Date.now() + 1500
          }
        }
      }
    },
    onGameOver: ({ winner: winTeam, reason, destroyedTeam, room }: any) => {
      if (room) currentTankRoom.value = room
      winner.value = winTeam
      gameOverReason.value = reason || 'eagle'
      if (destroyedTeam === 'blue') {
        blueEagleAlive.value = false
        spawnExplosion(13 * TILE_SIZE, 25 * TILE_SIZE, true)
      }
      if (destroyedTeam === 'red') {
        redEagleAlive.value = false
        spawnExplosion(13 * TILE_SIZE, 1 * TILE_SIZE, true)
      }
      tankAudio.gameOver()
    }
  })

  const onFsChange = () => {
    isFullscreen.value = !!document.fullscreenElement
  }
  document.addEventListener('fullscreenchange', onFsChange)

  lastTime = performance.now()
  animationFrameId = requestAnimationFrame(gameLoop)
})

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  document.removeEventListener('fullscreenchange', onFsChange)
})

function onFsChange() {
  isFullscreen.value = !!document.fullscreenElement
}

// Input
function handleKeyDown(e: KeyboardEvent) {
  if (e.code === 'KeyF' && !e.ctrlKey && !e.metaKey) {
    toggleFullscreen()
    return
  }
  if (winner.value || isEliminated.value) return
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault()
  }
  keysPressed[e.code] = true

  if (e.code === 'Space' || e.code === 'KeyJ') {
    fireBullet()
  }
}

function handleKeyUp(e: KeyboardEvent) {
  delete keysPressed[e.code]
}

const startMove = (dir: Direction) => {
  if (winner.value || isEliminated.value) return
  myTank.dir = dir
  keysPressed[`touch_${dir}`] = true
}

const stopMove = (dir: Direction) => {
  delete keysPressed[`touch_${dir}`]
}

// Shooting
function fireBullet() {
  if (winner.value || isEliminated.value || myTank.shootCooldown > 0 || myTank.x < 0) return

  const currentActiveBullets = bullets.filter(b => b.ownerId === myTank.id).length
  if (currentActiveBullets >= 2) return

  tankAudio.shoot()
  const bSpeed = 4.2
  let bx = myTank.x + TANK_SIZE / 2 - 3
  let by = myTank.y + TANK_SIZE / 2 - 3
  let vx = 0
  let vy = 0

  if (myTank.dir === 0) { by = myTank.y - 6; vy = -bSpeed }
  else if (myTank.dir === 1) { bx = myTank.x + TANK_SIZE; vx = bSpeed }
  else if (myTank.dir === 2) { by = myTank.y + TANK_SIZE; vy = bSpeed }
  else if (myTank.dir === 3) { bx = myTank.x - 6; vx = -bSpeed }

  bullets.push({
    id: nextBulletId++,
    x: bx,
    y: by,
    vx,
    vy,
    dir: myTank.dir,
    owner: 'player',
    ownerId: myTank.id as string,
    ownerTeam: myTank.team,
    power: 1
  })

  sendShoot(bx, by, myTank.dir, 1, myTank.id as string, myTank.team!)
  myTank.shootCooldown = 15
}

// Collision helper
function canMoveTo(x: number, y: number): boolean {
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
      if (
        tile === TILE_BRICK || 
        tile === TILE_STEEL || 
        tile === TILE_WATER || 
        tile === TILE_BASE_BLUE || 
        tile === TILE_BASE_RED ||
        tile === TILE_FORT_BLUE ||
        tile === TILE_FORT_RED
      ) {
        return false
      }
    }
  }

  return true
}

// Updates
function updateLocalTank() {
  if (isEliminated.value || winner.value || myTank.x < 0) return

  if (myTank.shootCooldown > 0) myTank.shootCooldown--

  let dx = 0
  let dy = 0

  if (keysPressed['ArrowUp'] || keysPressed['KeyW'] || keysPressed['touch_0']) {
    myTank.dir = 0
    dy = -myTank.speed
  } else if (keysPressed['ArrowDown'] || keysPressed['KeyS'] || keysPressed['touch_2']) {
    myTank.dir = 2
    dy = myTank.speed
  } else if (keysPressed['ArrowLeft'] || keysPressed['KeyA'] || keysPressed['touch_3']) {
    myTank.dir = 3
    dx = -myTank.speed
  } else if (keysPressed['ArrowRight'] || keysPressed['KeyD'] || keysPressed['touch_1']) {
    myTank.dir = 1
    dx = myTank.speed
  }

  if (dx !== 0 || dy !== 0) {
    // Axis snapping
    if (dy !== 0) {
      const snapX = Math.round(myTank.x / (TILE_SIZE / 2)) * (TILE_SIZE / 2)
      if (Math.abs(myTank.x - snapX) < 4) myTank.x = snapX
    }
    if (dx !== 0) {
      const snapY = Math.round(myTank.y / (TILE_SIZE / 2)) * (TILE_SIZE / 2)
      if (Math.abs(myTank.y - snapY) < 4) myTank.y = snapY
    }

    if (canMoveTo(myTank.x + dx, myTank.y + dy)) {
      myTank.x += dx
      myTank.y += dy
      sendMove(myTank.x, myTank.y, myTank.dir)
    }
  }
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i]
    b.x += b.vx
    b.y += b.vy

    // Out of bounds check
    if (b.x < 0 || b.x > CANVAS_WIDTH || b.y < 0 || b.y > CANVAS_HEIGHT) {
      bullets.splice(i, 1)
      continue
    }

    const bBox = { x: b.x, y: b.y, w: 6, h: 6 }

    // 1. Bullet vs Bullet Collision (Head-on opposing bullets cancel both out!)
    let bulletCancelled = false
    for (let j = i - 1; j >= 0; j--) {
      const otherB = bullets[j]
      if (b.ownerTeam !== otherB.ownerTeam) {
        const otherBox = { x: otherB.x, y: otherB.y, w: 6, h: 6 }
        if (checkAABB(bBox, otherBox)) {
          const midX = (b.x + otherB.x) / 2 + 3
          const midY = (b.y + otherB.y) / 2 + 3
          spawnSparks(midX, midY, '#fcd34d', 12)
          tankAudio.explodeSmall()
          bullets.splice(i, 1)
          bullets.splice(j, 1)
          bulletCancelled = true
          break
        }
      }
    }
    if (bulletCancelled) continue

    // 2. Bullet vs Map Tile
    const col = Math.floor((b.x + 3) / TILE_SIZE)
    const row = Math.floor((b.y + 3) / TILE_SIZE)

    if (row >= 0 && row < MAP_SIZE && col >= 0 && col < MAP_SIZE) {
      const tile = map[row][col]

      if (tile === TILE_BRICK) {
        map[row][col] = TILE_EMPTY
        tankAudio.explodeSmall()
        spawnSparks(col * TILE_SIZE + 8, row * TILE_SIZE + 8, '#f97316', 8)
        bullets.splice(i, 1)
        sendTileHit(row, col, TILE_EMPTY)
        continue
      } else if (tile === TILE_STEEL) {
        tankAudio.hitSteel()
        spawnSparks(b.x + 3, b.y + 3, '#fcd34d', 6)
        bullets.splice(i, 1)
        continue
      } else if (tile === TILE_FORT_BLUE || tile === TILE_FORT_RED) {
        // Eagle fortress wall: takes exactly 5 hits to break! (Shot #6 hits eagle)
        bullets.splice(i, 1)
        const key = `${row}_${col}`
        const currentHp = wallHp.get(key) ?? 5
        const nextHp = currentHp - 1

        if (nextHp <= 0) {
          // Breached and shattered on 5th hit!
          map[row][col] = TILE_EMPTY
          wallHp.delete(key)
          tankAudio.explodeSmall()
          spawnExplosion(col * TILE_SIZE + 8, row * TILE_SIZE + 8, false)
          sendTileHit(row, col, TILE_EMPTY, 0)
        } else {
          // Damaged (takes another hit)
          wallHp.set(key, nextHp)
          tankAudio.hitSteel()
          const sparkCol = tile === TILE_FORT_BLUE ? '#38bdf8' : '#ef4444'
          spawnSparks(b.x + 3, b.y + 3, sparkCol, 8)
          sendTileHit(row, col, tile, nextHp)
        }
        continue
      } else if (tile === TILE_BASE_BLUE) {
        // Blue Eagle Hit! Friendly fire check: only enemy bullets destroy it
        bullets.splice(i, 1)
        if (b.ownerTeam === 'red' && blueEagleAlive.value) {
          blueEagleAlive.value = false
          map[24][12] = TILE_EMPTY; map[24][13] = TILE_EMPTY;
          map[25][12] = TILE_EMPTY; map[25][13] = TILE_EMPTY;
          spawnExplosion(13 * TILE_SIZE, 25 * TILE_SIZE, true)
          sendEagleHit('blue')
        }
        continue
      } else if (tile === TILE_BASE_RED) {
        // Red Eagle Hit! Friendly fire check: only enemy bullets destroy it
        bullets.splice(i, 1)
        if (b.ownerTeam === 'blue' && redEagleAlive.value) {
          redEagleAlive.value = false
          map[0][12] = TILE_EMPTY; map[0][13] = TILE_EMPTY;
          map[1][12] = TILE_EMPTY; map[1][13] = TILE_EMPTY;
          spawnExplosion(13 * TILE_SIZE, 1 * TILE_SIZE, true)
          sendEagleHit('red')
        }
        continue
      }
    }

    // 3. Bullet vs Local Player (myTank)
    // When hit: bullet MUST disappear immediately and explode with the tank
    if (!isEliminated.value && myTank.x >= 0 && b.ownerTeam !== myTank.team) {
      if (checkAABB(bBox, { x: myTank.x, y: myTank.y, w: TANK_SIZE, h: TANK_SIZE })) {
        bullets.splice(i, 1) // Bullet disappears immediately!

        const isShield = (myTank.invulnerableUntil && Date.now() < myTank.invulnerableUntil) || myTank.invulnerableTime > 0
        if (isShield) {
          tankAudio.hitSteel()
          spawnSparks(b.x + 3, b.y + 3, '#38bdf8', 10)
        } else {
          // Bullet explodes together with local tank
          handleLocalDeath(b.ownerId || 'enemy')
        }
        continue
      }
    }

    // 4. Bullet vs Remote Players (remoteTanks)
    // When hit: bullet MUST disappear immediately and NOT pass through!
    let hitRemote = false
    for (const rt of remoteTanks.values()) {
      if (rt.x >= 0 && rt.y >= 0 && b.ownerTeam !== rt.team) {
        if (checkAABB(bBox, { x: rt.x, y: rt.y, w: TANK_SIZE, h: TANK_SIZE })) {
          bullets.splice(i, 1) // Bullet disappears immediately!
          hitRemote = true

          const isShield = (rt.invulnerableUntil && Date.now() < rt.invulnerableUntil) || rt.invulnerableTime > 0
          if (isShield) {
            tankAudio.hitSteel()
            spawnSparks(b.x + 3, b.y + 3, '#38bdf8', 10)
          } else {
            // Give remote tank 1.5s shield and immediately reposition to its spawn point!
            rt.invulnerableUntil = Date.now() + 1500
            const sp = getSpawnForPlayer(rt.id as string)
            rt.x = sp.x
            rt.y = sp.y
            rt.dir = sp.dir
            spawnExplosion(rt.x + TANK_SIZE / 2, rt.y + TANK_SIZE / 2, true)
            // If local player fired this bullet, notify server immediately of the kill
            if (b.ownerId === myPlayerId.value) {
              sendKill(rt.id as string, myPlayerId.value)
            }
          }
          break
        }
      }
    }
    if (hitRemote) continue
  }
}

let lastDeathAt = 0

function handleLocalDeath(killerId: string) {
  const now = Date.now()
  // Guard against duplicate deaths from multiple rapid bullets (only 1 life lost!)
  if (now - lastDeathAt < 1500) return
  lastDeathAt = now

  // Immediate 1.5s invulnerability so any other bullet in flight hits the shield
  myTank.invulnerableUntil = now + 1500
  myTank.invulnerableTime = 0

  spawnExplosion(myTank.x + TANK_SIZE / 2, myTank.y + TANK_SIZE / 2, true)
  sendKill(myTank.id as string, killerId)

  const me = currentTankRoom.value?.players.find(p => p.id === myPlayerId.value)
  const remainingLives = (me?.lives !== undefined) ? me.lives - 1 : 2

  if (remainingLives <= 0) {
    // 0 lives left: eliminate player from active combat
    myTank.x = -999
    myTank.y = -999
    sendMove(-999, -999, 0)
  } else {
    // Instant respawn beside eagle!
    const spawn = getSpawnForPlayer(myPlayerId.value || '')
    myTank.x = spawn.x
    myTank.y = spawn.y
    myTank.dir = spawn.dir
    sendRespawn(myTank.x, myTank.y, myTank.dir)
    sendMove(myTank.x, myTank.y, myTank.dir)
  }
}

function checkAABB(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function spawnSparks(x: number, y: number, color: string, count: number) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const spd = Math.random() * 3.5 + 1.2
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 0,
      maxLife: Math.floor(Math.random() * 16 + 10),
      color,
      size: Math.random() * 3 + 2
    })
  }
}

function spawnExplosion(x: number, y: number, isBig = true) {
  tankAudio.boom()
  screenShake = isBig ? 14 : 7

  const puffs: FireballPuff[] = []
  const puffCount = isBig ? 12 : 6
  const colors = ['#ffffff', '#fef08a', '#f97316', '#ef4444', '#991b1b', '#334155']

  for (let i = 0; i < puffCount; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = Math.random() * (isBig ? 16 : 8)
    puffs.push({
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      radius: Math.random() * 3 + 2,
      maxRadius: Math.random() * (isBig ? 16 : 9) + 8,
      color: colors[Math.floor(Math.random() * colors.length)]
    })
  }

  explosions.push({
    x,
    y,
    life: 0,
    maxLife: isBig ? 28 : 18,
    shockwaveRadius: 2,
    maxShockwaveRadius: isBig ? 36 : 20,
    puffs
  })

  // Spawn intense debris sparks
  spawnSparks(x, y, '#f97316', isBig ? 28 : 14)
  spawnSparks(x, y, '#fef08a', isBig ? 18 : 8)
}

function updateExplosions() {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const ex = explosions[i]
    ex.life++
    ex.shockwaveRadius += (ex.maxShockwaveRadius - ex.shockwaveRadius) * 0.18

    // Expand puffs
    for (const p of ex.puffs) {
      p.radius += (p.maxRadius - p.radius) * 0.14
    }

    if (ex.life >= ex.maxLife) {
      explosions.splice(i, 1)
    }
  }

  // Decay screen shake
  if (screenShake > 0) {
    screenShake = Math.max(0, screenShake * 0.88 - 0.2)
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

// Game Loop
function gameLoop(time: number) {
  animationFrameId = requestAnimationFrame(gameLoop)
  updateLocalTank()
  updateBullets()
  updateParticles()
  updateExplosions()
  render()
}

// Rendering
function render() {
  if (!ctx) return

  ctx.save()

  // Apply Screen Shake
  if (screenShake > 0.1) {
    const ox = (Math.random() - 0.5) * screenShake * 2
    const oy = (Math.random() - 0.5) * screenShake * 2
    ctx.translate(ox, oy)
  }

  // 2x HiDPI scale (canvas physical buffer is 832x832, logical map is 416x416)
  ctx.scale(2, 2)

  // Tactical dark battlefield grid background
  ctx.fillStyle = '#050b14'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
  ctx.lineWidth = 0.5
  for (let x = 0; x <= CANVAS_WIDTH; x += TILE_SIZE) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke()
  }
  for (let y = 0; y <= CANVAS_HEIGHT; y += TILE_SIZE) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke()
  }

  // 1. Draw Map Tiles
  for (let r = 0; r < MAP_SIZE; r++) {
    for (let c = 0; c < MAP_SIZE; c++) {
      const tile = map[r][c]
      const tx = c * TILE_SIZE
      const ty = r * TILE_SIZE

      if (tile === TILE_BRICK) drawBrick(ctx, tx, ty)
      else if (tile === TILE_STEEL) drawSteel(ctx, tx, ty)
      else if (tile === TILE_WATER) drawWater(ctx, tx, ty)
      else if (tile === TILE_FORT_BLUE || tile === TILE_FORT_RED) {
        const hp = wallHp.get(`${r}_${c}`) ?? 5
        drawFortressWall(ctx, tx, ty, tile, hp)
      }
    }
  }

  // Draw Base Eagles
  drawBlueEagle(ctx)
  drawRedEagle(ctx)

  // 2. Draw Remote Tanks
  for (const rt of remoteTanks.values()) {
    if (rt.x >= 0 && rt.y >= 0) {
      drawPvPTank(ctx, rt)
    }
  }

  // Draw Local Player Tank
  if (!isEliminated.value && myTank.x >= 0) {
    drawPvPTank(ctx, myTank, true)
  }

  // 3. Draw Trees on TOP so tanks hide beneath canopy
  for (let r = 0; r < MAP_SIZE; r++) {
    for (let c = 0; c < MAP_SIZE; c++) {
      if (map[r][c] === TILE_TREES) {
        drawTrees(ctx, c * TILE_SIZE, r * TILE_SIZE)
      }
    }
  }

  // 4. Draw Bullets (Glowing energy projectile)
  for (const b of bullets) {
    drawBullet(ctx, b)
  }

  // 5. Draw Particles
  for (const p of particles) {
    ctx.fillStyle = p.color
    ctx.fillRect(p.x, p.y, p.size, p.size)
  }

  // 6. Draw Cinematic Explosions
  drawExplosions(ctx)

  ctx.restore()
}

function drawBullet(c: CanvasRenderingContext2D, b: Bullet) {
  const isBlue = b.ownerTeam === 'blue'
  const glowColor = isBlue ? '#38bdf8' : '#ef4444'
  const tailColor = isBlue ? 'rgba(56, 189, 248, 0.4)' : 'rgba(239, 68, 68, 0.4)'

  // Trail
  c.fillStyle = tailColor
  c.beginPath()
  c.arc(b.x + 3 - b.vx * 0.8, b.y + 3 - b.vy * 0.8, 2.4, 0, Math.PI * 2)
  c.fill()

  // Outer glow
  c.fillStyle = glowColor
  c.beginPath()
  c.arc(b.x + 3, b.y + 3, 3.8, 0, Math.PI * 2)
  c.fill()

  // Inner hot core
  c.fillStyle = '#ffffff'
  c.beginPath()
  c.arc(b.x + 3, b.y + 3, 2, 0, Math.PI * 2)
  c.fill()
}

function drawExplosions(c: CanvasRenderingContext2D) {
  for (const ex of explosions) {
    const progress = ex.life / ex.maxLife
    const alpha = Math.max(0, 1 - progress)

    // 1. Shockwave ring
    c.save()
    c.beginPath()
    c.arc(ex.x, ex.y, ex.shockwaveRadius, 0, Math.PI * 2)
    c.strokeStyle = `rgba(254, 240, 138, ${alpha * 0.85})`
    c.lineWidth = Math.max(1, 3.5 * (1 - progress))
    c.stroke()
    c.restore()

    // 2. Fireball puffs
    for (const p of ex.puffs) {
      c.save()
      c.globalAlpha = alpha
      c.fillStyle = p.color
      c.beginPath()
      c.arc(ex.x + p.dx, ex.y + p.dy, p.radius, 0, Math.PI * 2)
      c.fill()
      c.restore()
    }
  }
}

// 5-Hit Eagle Fortress Wall with visual crack stages
function drawFortressWall(c: CanvasRenderingContext2D, x: number, y: number, type: number, hp: number) {
  const isBlue = type === TILE_FORT_BLUE
  const baseColor = isBlue ? '#1e3a8a' : '#881337'
  const plateColor = isBlue ? '#172554' : '#4c0519'
  const accentColor = isBlue ? '#38bdf8' : '#ef4444'
  const lightGlow = isBlue ? '#93c5fd' : '#fca5a5'

  // Outer border & base plate
  c.fillStyle = baseColor
  c.fillRect(x, y, TILE_SIZE, TILE_SIZE)

  // Inner beveled armor plate
  c.fillStyle = plateColor
  c.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2)

  // 4 Corner heavy titanium rivets
  c.fillStyle = '#94a3b8'
  c.fillRect(x + 2, y + 2, 2, 2)
  c.fillRect(x + TILE_SIZE - 4, y + 2, 2, 2)
  c.fillRect(x + 2, y + TILE_SIZE - 4, 2, 2)
  c.fillRect(x + TILE_SIZE - 4, y + TILE_SIZE - 4, 2, 2)

  // Central energy shield core/conduit
  c.fillStyle = accentColor
  c.fillRect(x + 5, y + 5, 6, 6)
  c.fillStyle = lightGlow
  c.fillRect(x + 6, y + 6, 4, 4)

  // Cross reinforcement struts
  c.fillStyle = isBlue ? 'rgba(56, 189, 248, 0.4)' : 'rgba(239, 68, 68, 0.4)'
  c.fillRect(x + 7, y + 1, 2, 4)
  c.fillRect(x + 7, y + 11, 2, 4)
  c.fillRect(x + 1, y + 7, 4, 2)
  c.fillRect(x + 11, y + 7, 4, 2)

  // Progressive damage / crack stages:
  // hp = 5: pristine armor plate
  // hp <= 4: hairline corner stress fracture
  if (hp <= 4) {
    c.strokeStyle = '#000000'
    c.lineWidth = 1.0
    c.beginPath()
    c.moveTo(x + 2, y + 3)
    c.lineTo(x + 5, y + 6)
    c.stroke()
  }

  // hp <= 3: diagonal crack reaching core
  if (hp <= 3) {
    c.strokeStyle = '#000000'
    c.lineWidth = 1.2
    c.beginPath()
    c.moveTo(x + 2, y + 3)
    c.lineTo(x + 6, y + 7)
    c.lineTo(x + 5, y + 10)
    c.stroke()

    c.strokeStyle = '#ffffff'
    c.lineWidth = 0.6
    c.beginPath()
    c.moveTo(x + 2, y + 3)
    c.lineTo(x + 6, y + 7)
    c.stroke()
  }

  // hp <= 2: deep jagged fracture across plate + scorch mark
  if (hp <= 2) {
    c.strokeStyle = '#000000'
    c.lineWidth = 1.4
    c.beginPath()
    c.moveTo(x + 14, y + 13)
    c.lineTo(x + 10, y + 9)
    c.lineTo(x + 11, y + 5)
    c.lineTo(x + 8, y + 3)
    c.stroke()

    c.fillStyle = 'rgba(0, 0, 0, 0.35)'
    c.fillRect(x + 2, y + 2, 7, 7)
  }

  // hp <= 1: critical molten breach fissure (sparking, about to shatter!)
  if (hp <= 1) {
    c.strokeStyle = '#fbbf24'
    c.lineWidth = 1.6
    c.beginPath()
    c.moveTo(x + 1, y + 8)
    c.lineTo(x + 7, y + 8)
    c.lineTo(x + 9, y + 14)
    c.stroke()

    c.fillStyle = 'rgba(0, 0, 0, 0.55)'
    c.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2)

    c.fillStyle = '#ef4444'
    c.fillRect(x + 4, y + 7, 2, 2)
    c.fillRect(x + 10, y + 9, 2, 2)
  }
}

// 3D Embossed Bricks
function drawBrick(c: CanvasRenderingContext2D, x: number, y: number) {
  c.fillStyle = '#9a3412'
  c.fillRect(x, y, TILE_SIZE, TILE_SIZE)

  // Brick rows with mortar
  c.fillStyle = '#c2410c'
  c.fillRect(x + 1, y + 1, 6, 6)
  c.fillRect(x + 9, y + 1, 6, 6)
  c.fillRect(x + 1, y + 9, 6, 6)
  c.fillRect(x + 9, y + 9, 6, 6)

  // Brick highlight
  c.fillStyle = '#ea580c'
  c.fillRect(x + 1, y + 1, 5, 2)
  c.fillRect(x + 9, y + 1, 5, 2)
  c.fillRect(x + 1, y + 9, 5, 2)
  c.fillRect(x + 9, y + 9, 5, 2)

  // Mortar lines
  c.fillStyle = '#431407'
  c.fillRect(x, y + 7, TILE_SIZE, 2)
  c.fillRect(x + 7, y, 2, 8)
  c.fillRect(x + 7, y + 8, 2, 8)
}

// Brushed Titanium Steel
function drawSteel(c: CanvasRenderingContext2D, x: number, y: number) {
  c.fillStyle = '#475569'
  c.fillRect(x, y, TILE_SIZE, TILE_SIZE)

  c.fillStyle = '#64748b'
  c.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2)

  // Diagonal sheen
  c.fillStyle = '#94a3b8'
  c.fillRect(x + 3, y + 3, 5, 5)
  c.fillRect(x + 8, y + 8, 5, 5)

  // Corner rivets
  c.fillStyle = '#cbd5e1'
  c.fillRect(x + 2, y + 2, 2, 2)
  c.fillRect(x + 12, y + 2, 2, 2)
  c.fillRect(x + 2, y + 12, 2, 2)
  c.fillRect(x + 12, y + 12, 2, 2)
}

// Animated Shimmering Water
function drawWater(c: CanvasRenderingContext2D, x: number, y: number) {
  c.fillStyle = '#0369a1'
  c.fillRect(x, y, TILE_SIZE, TILE_SIZE)

  const offset = Math.floor((Date.now() / 250) % 4)
  c.fillStyle = '#38bdf8'
  c.fillRect(x + 2 + offset, y + 3, 5, 2)
  c.fillRect(x + 8 - offset, y + 9, 5, 2)

  c.fillStyle = '#0284c7'
  c.fillRect(x + 4, y + 6, 6, 2)
}

// Lush Foliage Canopy
function drawTrees(c: CanvasRenderingContext2D, x: number, y: number) {
  c.fillStyle = '#14532d'
  c.fillRect(x, y, TILE_SIZE, TILE_SIZE)

  c.fillStyle = '#16a34a'
  c.beginPath(); c.arc(x + 5, y + 5, 4, 0, Math.PI * 2); c.fill()
  c.beginPath(); c.arc(x + 11, y + 6, 4, 0, Math.PI * 2); c.fill()
  c.beginPath(); c.arc(x + 6, y + 11, 4, 0, Math.PI * 2); c.fill()
  c.beginPath(); c.arc(x + 11, y + 11, 4, 0, Math.PI * 2); c.fill()

  c.fillStyle = '#4ade80'
  c.beginPath(); c.arc(x + 8, y + 8, 3, 0, Math.PI * 2); c.fill()
}

// Blue Base Eagle
function drawBlueEagle(c: CanvasRenderingContext2D) {
  const bx = 12 * TILE_SIZE
  const by = 24 * TILE_SIZE
  const bw = 2 * TILE_SIZE
  const bh = 2 * TILE_SIZE

  if (!blueEagleAlive.value) {
    c.fillStyle = '#1e293b'; c.fillRect(bx, by, bw, bh)
    c.fillStyle = '#0f172a'; c.fillRect(bx + 2, by + 2, bw - 4, bh - 4)
    c.font = '22px sans-serif'; c.textAlign = 'center'
    c.fillText('💀', bx + 16, by + 24)
    return
  }

  // Metallic Pedestal
  c.fillStyle = '#0f172a'; c.fillRect(bx, by, bw, bh)
  c.strokeStyle = '#38bdf8'; c.lineWidth = 1.5; c.strokeRect(bx + 1, by + 1, bw - 2, bh - 2)

  // Glowing Cybernetic Eagle Crest
  c.fillStyle = '#0284c7'
  c.beginPath()
  c.moveTo(bx + 16, by + 4)
  c.lineTo(bx + 4, by + 14)
  c.lineTo(bx + 8, by + 28)
  c.lineTo(bx + 16, by + 22)
  c.lineTo(bx + 24, by + 28)
  c.lineTo(bx + 28, by + 14)
  c.closePath()
  c.fill()

  // Radiant Eagle Core
  c.fillStyle = '#38bdf8'
  c.beginPath(); c.arc(bx + 16, by + 14, 5, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#ffffff'
  c.beginPath(); c.arc(bx + 16, by + 14, 2.5, 0, Math.PI * 2); c.fill()

  // Top Beacon
  c.fillStyle = (Date.now() % 600 < 300) ? '#38bdf8' : '#67e8f9'
  c.fillRect(bx + 14, by + 2, 4, 3)
}

// Red Base Eagle
function drawRedEagle(c: CanvasRenderingContext2D) {
  const bx = 12 * TILE_SIZE
  const by = 0
  const bw = 2 * TILE_SIZE
  const bh = 2 * TILE_SIZE

  if (!redEagleAlive.value) {
    c.fillStyle = '#1e293b'; c.fillRect(bx, by, bw, bh)
    c.fillStyle = '#0f172a'; c.fillRect(bx + 2, by + 2, bw - 4, bh - 4)
    c.font = '22px sans-serif'; c.textAlign = 'center'
    c.fillText('💀', bx + 16, by + 24)
    return
  }

  // Metallic Pedestal
  c.fillStyle = '#0f172a'; c.fillRect(bx, by, bw, bh)
  c.strokeStyle = '#ef4444'; c.lineWidth = 1.5; c.strokeRect(bx + 1, by + 1, bw - 2, bh - 2)

  // Crimson Phoenix / Warlord Eagle Crest
  c.fillStyle = '#b91c1c'
  c.beginPath()
  c.moveTo(bx + 16, by + 28)
  c.lineTo(bx + 4, by + 18)
  c.lineTo(bx + 8, by + 4)
  c.lineTo(bx + 16, by + 10)
  c.lineTo(bx + 24, by + 4)
  c.lineTo(bx + 28, by + 18)
  c.closePath()
  c.fill()

  // Radiant Core
  c.fillStyle = '#ef4444'
  c.beginPath(); c.arc(bx + 16, by + 18, 5, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#ffffff'
  c.beginPath(); c.arc(bx + 16, by + 18, 2.5, 0, Math.PI * 2); c.fill()

  // Beacon
  c.fillStyle = (Date.now() % 600 < 300) ? '#ef4444' : '#fca5a5'
  c.fillRect(bx + 14, by + 27, 4, 3)
}

// HD PvP Tank Model
function drawPvPTank(c: CanvasRenderingContext2D, tank: Tank, isLocal = false) {
  c.save()
  c.translate(tank.x + TANK_SIZE / 2, tank.y + TANK_SIZE / 2)

  // Drop shadow
  c.fillStyle = 'rgba(0, 0, 0, 0.4)'
  c.fillRect(-12, -11, 26, 26)

  // Rotate tank to direction
  const angle = (tank.dir * 90 * Math.PI) / 180
  c.rotate(angle)

  // Team Colors
  const isBlue = tank.team === 'blue'
  const primaryColor = isBlue ? '#0284c7' : '#dc2626'
  const highlightColor = isBlue ? '#38bdf8' : '#f87171'
  const darkColor = isBlue ? '#0369a1' : '#991b1b'

  // 1. Treads / Tracks (Left & Right)
  c.fillStyle = '#1e293b'
  c.fillRect(-13, -13, 6, 26)
  c.fillRect(7, -13, 6, 26)

  // Tread Cog Wheels / Bogies
  c.fillStyle = '#475569'
  ;[-8, 0, 8].forEach(offsetY => {
    c.beginPath(); c.arc(-10, offsetY, 2, 0, Math.PI * 2); c.fill()
    c.beginPath(); c.arc(10, offsetY, 2, 0, Math.PI * 2); c.fill()
  })

  // 2. Chassis Hull
  c.fillStyle = darkColor
  c.fillRect(-7, -11, 14, 22)

  c.fillStyle = primaryColor
  c.fillRect(-6, -10, 12, 20)

  // Front Armor Bevel Highlight
  c.fillStyle = highlightColor
  c.fillRect(-5, -10, 10, 3)

  // Rear Engine Ventilation Grille
  c.fillStyle = '#0f172a'
  c.fillRect(-4, 5, 8, 4)

  // 3. Heavy Cannon Barrel & Mantlet
  c.fillStyle = primaryColor
  c.fillRect(-2.5, -17, 5, 11)

  // Muzzle Brake at the tip
  c.fillStyle = highlightColor
  c.fillRect(-3.5, -17, 7, 2.5)

  // Barrel Mantlet Collar
  c.fillStyle = darkColor
  c.fillRect(-4, -8, 8, 3)

  // 4. Armored Turret
  c.fillStyle = primaryColor
  c.beginPath(); c.arc(0, -1, 6.5, 0, Math.PI * 2); c.fill()

  // Turret Highlight
  c.fillStyle = highlightColor
  c.beginPath(); c.arc(-1, -2, 4, 0, Math.PI * 2); c.fill()

  // Commander Hatch
  c.fillStyle = '#0f172a'
  c.beginPath(); c.arc(1.5, 0.5, 2, 0, Math.PI * 2); c.fill()

  // 5. Invulnerability Shield Bubble (3s with pulsating energy)
  const isShield = (tank.invulnerableUntil && Date.now() < tank.invulnerableUntil) || tank.invulnerableTime > 0
  if (isShield) {
    const pulseAlpha = 0.5 + Math.sin(Date.now() / 80) * 0.3
    c.strokeStyle = `rgba(56, 189, 248, ${pulseAlpha})`
    c.lineWidth = 2.5
    c.beginPath(); c.arc(0, 0, 18, 0, Math.PI * 2); c.stroke()

    c.strokeStyle = `rgba(254, 240, 138, ${pulseAlpha * 0.8})`
    c.lineWidth = 1.2
    c.beginPath(); c.arc(0, 0, 20, 0, Math.PI * 2); c.stroke()
  }

  c.restore()

  // 6. Overhead Player Nametag (Always upright)
  c.save()
  c.font = 'bold 9px sans-serif'
  c.textAlign = 'center'

  const tagY = tank.y - 7
  const nameText = isLocal ? `⭐ ${tank.name || 'Bạn'}` : (tank.name || 'Player')
  const tagWidth = Math.max(36, c.measureText(nameText).width + 10)

  // Pill badge
  c.fillStyle = 'rgba(15, 23, 42, 0.85)'
  c.fillRect(tank.x + TANK_SIZE / 2 - tagWidth / 2, tagY - 9, tagWidth, 11)

  c.strokeStyle = isLocal ? '#fcd34d' : (tank.team === 'blue' ? '#38bdf8' : '#ef4444')
  c.lineWidth = 1
  c.strokeRect(tank.x + TANK_SIZE / 2 - tagWidth / 2, tagY - 9, tagWidth, 11)

  c.fillStyle = isLocal ? '#fcd34d' : '#f8fafc'
  c.fillText(nameText, tank.x + TANK_SIZE / 2, tagY)
  c.restore()
}

async function handleRematch() {
  await rematch()
}

async function handleBackToLobby() {
  await leaveRoom()
}
</script>

<style scoped>
.pvp-game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 820px;
  width: 100%;
  margin: 0 auto;
}

/* Fullscreen mode: 100vh, 100vw, NO SCROLL */
:fullscreen,
.pvp-game-container:fullscreen,
.pvp-game-container.is-fullscreen {
  width: 100vw !important;
  height: 100vh !important;
  max-width: 100vw !important;
  max-height: 100vh !important;
  padding: 0 !important;
  margin: 0 !important;
  background: #050811 !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: space-between !important;
  align-items: center !important;
  overflow: hidden !important;
}

:fullscreen .pvp-top-hud,
.pvp-game-container.is-fullscreen .pvp-top-hud {
  padding: 6px 14px !important;
  border-radius: 0 !important;
  flex-shrink: 0 !important;
  border-left: none !important;
  border-right: none !important;
  border-top: none !important;
}

:fullscreen .screen-frame,
.pvp-game-container.is-fullscreen .screen-frame {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  border: none !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
}

:fullscreen .canvas-wrapper,
.pvp-game-container.is-fullscreen .canvas-wrapper {
  width: min(calc(100vh - 96px), calc(100vw - 160px)) !important;
  height: min(calc(100vh - 96px), calc(100vw - 160px)) !important;
  max-width: calc(100vh - 96px) !important;
  max-height: calc(100vh - 96px) !important;
  flex-shrink: 0 !important;
}

:fullscreen .pvp-sidebar,
.pvp-game-container.is-fullscreen .pvp-sidebar {
  height: min(calc(100vh - 96px), calc(100vw - 160px)) !important;
  max-height: min(calc(100vh - 96px), calc(100vw - 160px)) !important;
  padding: 4px 6px !important;
  width: 130px !important;
}

:fullscreen .cabinet-footer,
.pvp-game-container.is-fullscreen .cabinet-footer {
  padding: 4px 12px !important;
  flex-shrink: 0 !important;
  border-radius: 0 !important;
  border-left: none !important;
  border-right: none !important;
  border-bottom: none !important;
}

:fullscreen .desktop-hints,
.pvp-game-container.is-fullscreen .desktop-hints {
  font-size: 0.72rem !important;
  gap: 12px !important;
}

.pvp-top-hud {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  background: #0f172a;
  border: 2px solid #334155;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  padding: var(--space-3) var(--space-4);
}

.team-hud-block {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.team-hud-block.dead {
  opacity: 0.4;
  filter: grayscale(1);
}

.blue-hud .hud-team-name { color: #38bdf8; }
.red-hud .hud-team-name { color: #ef4444; }

.hud-team-name {
  font-family: 'Orbitron', sans-serif;
  font-weight: 800;
  font-size: 0.95rem;
}

.hud-meta {
  display: flex;
  flex-direction: column;
}

.hud-status-tag {
  font-size: 0.65rem;
  color: var(--text-muted);
}

.hud-crest {
  font-size: 1.5rem;
}

.hud-center-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.hud-badge-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.room-code-tag {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.75rem;
  color: var(--matchbox-cyan);
  background: rgba(56, 189, 248, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.map-name-tag {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.72rem;
  color: #fcd34d;
  background: rgba(252, 211, 77, 0.12);
  border: 1px solid rgba(252, 211, 77, 0.3);
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 700;
}

.vs-badge {
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  font-size: 0.85rem;
  color: var(--matchbox-gold);
}

.hud-team-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hud-team-title-row.justify-end {
  justify-content: flex-end;
}

.team-series-badge {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 1px 7px;
  border-radius: 999px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.4);
}

.team-series-badge.blue-badge {
  background: rgba(56, 189, 248, 0.2);
  border: 1px solid #38bdf8;
  color: #38bdf8;
}

.team-series-badge.red-badge {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid #ef4444;
  color: #ef4444;
}

.series-scoreboard-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid #475569;
  border-radius: 6px;
  padding: 2px 10px;
  box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.6);
}

.series-num {
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  font-size: 1.15rem;
}

.series-num.blue-score {
  color: #38bdf8;
  text-shadow: 0 0 8px rgba(56, 189, 248, 0.6);
}

.series-num.red-score {
  color: #ef4444;
  text-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
}

.series-vs {
  font-family: 'Orbitron', sans-serif;
  font-weight: 800;
  font-size: 0.9rem;
  color: var(--matchbox-gold);
}

.series-caption {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.62rem;
  font-weight: 800;
  color: #94a3b8;
  letter-spacing: 0.06em;
}

.btn-fullscreen-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #1e293b;
  border: 1px solid #475569;
  color: #f8fafc;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.72rem;
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-fullscreen-toggle:hover {
  background: #334155;
  border-color: #38bdf8;
  color: #38bdf8;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.3);
}

.btn-fullscreen-toggle .icon {
  width: 14px;
  height: 14px;
}

.series-victory-banner {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid #475569;
  border-radius: 8px;
  padding: 8px 16px;
  margin: 10px 0 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.series-victory-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--matchbox-gold);
  letter-spacing: 0.08em;
}

.series-victory-score {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.95rem;
}

.series-victory-dash {
  color: #64748b;
  font-weight: bold;
}

.screen-frame {
  display: flex;
  background: #000;
  position: relative;
  justify-content: center;
  border-left: 2px solid #334155;
  border-right: 2px solid #334155;
  border-bottom: 2px solid #334155;
  width: 100%;
}

.canvas-wrapper {
  position: relative;
  width: min(624px, calc(100vw - 190px), calc(100vh - 220px));
  height: min(624px, calc(100vw - 190px), calc(100vh - 220px));
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

.pvp-sidebar {
  width: 160px;
  background: #1e293b;
  border-left: 2px solid #334155;
  padding: var(--space-3) var(--space-2);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  flex-shrink: 0;
}

.sidebar-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--matchbox-gold);
  text-align: center;
}

.roster-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.roster-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.3);
  padding: 6px;
  border-radius: var(--radius-sm);
  border-left: 3px solid transparent;
}

.roster-blue { border-left-color: #38bdf8; }
.roster-red { border-left-color: #ef4444; }

.roster-avatar {
  font-size: 1.1rem;
}

.roster-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  gap: 2px;
}

.roster-lives {
  display: flex;
  gap: 2px;
  margin: 1px 0;
}

.heart-dot {
  font-size: 0.75rem;
  line-height: 1;
}

.spectator-box {
  border-color: #ef4444;
  box-shadow: 0 0 25px rgba(239, 68, 68, 0.3);
}

.spectator-title {
  font-family: 'Orbitron', sans-serif;
  color: #ef4444;
  font-size: 1.1rem;
  margin: 0;
}

.roster-name {
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.roster-name small {
  color: var(--matchbox-cyan);
}

.roster-kd {
  font-size: 0.65rem;
  color: var(--text-faint);
  font-family: 'Fira Code', monospace;
}

/* Overlays */
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
  background: #0f172a;
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 340px;
  width: 90%;
}

.blue-win {
  border-color: #38bdf8;
  box-shadow: 0 0 30px rgba(56, 189, 248, 0.4);
}

.red-win {
  border-color: #ef4444;
  box-shadow: 0 0 30px rgba(239, 68, 68, 0.4);
}

.winner-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.3rem;
  margin: 0;
}

.blue-win .winner-title { color: #38bdf8; }
.red-win .winner-title { color: #ef4444; }

.winner-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.match-stats-table {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: rgba(0, 0, 0, 0.4);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-family: 'Fira Code', monospace;
}

.stat-row-item {
  display: flex;
  justify-content: space-between;
}

.team-blue-text { color: #38bdf8; }
.team-red-text { color: #f87171; }

.action-buttons-row {
  display: flex;
  gap: var(--space-2);
  justify-content: center;
  margin-top: var(--space-2);
}

.btn-arcade {
  background: var(--matchbox-orange);
  color: white;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 8px 14px;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.respawn-box {
  border-color: #ef4444;
}

.respawn-box h3 {
  font-family: 'Orbitron', sans-serif;
  color: #ef4444;
  font-size: 1.1rem;
  margin: 0;
}

.countdown-num {
  font-size: 1.4rem;
  color: var(--matchbox-gold);
}

.cabinet-footer {
  background: #1e293b;
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
}

.desktop-hints {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
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
}

@media (max-width: 640px) {
  .screen-frame {
    flex-direction: column;
    align-items: center;
  }
  .canvas-wrapper {
    width: min(94vw, 416px);
    height: min(94vw, 416px);
  }
  .pvp-sidebar {
    width: 100%;
    border-left: none;
    border-top: 2px solid #334155;
    padding: var(--space-2);
  }
  .roster-list {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }
  .desktop-hints {
    display: none;
  }
  .mobile-dpad-container {
    display: flex;
  }
}
</style>
