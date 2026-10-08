<template>
  <div ref="containerRef" class="pvp-game" :style="{ height: containerHeight }">
    <!-- Compact match HUD -->
    <div class="hud">
      <div class="hud-team blue" :class="{ down: !eagleAlive.blue }">
        <component :is="eagleAlive.blue ? LucideShieldCheck : LucideShieldOff" class="hud-shield" />
        <span class="hud-team-name">ĐỘI XANH</span>
      </div>

      <div class="hud-center">
        <span class="chip chip-code">{{ currentTankRoom?.roomCode }}</span>
        <div class="hud-score" title="Tỉ số liên đấu">
          <span class="num blue">{{ currentTankRoom?.teamScores?.blue ?? 0 }}</span>
          <span class="sep">:</span>
          <span class="num red">{{ currentTankRoom?.teamScores?.red ?? 0 }}</span>
        </div>
        <span class="chip chip-map"><LucideMap class="icon" />{{ mapName }}</span>
      </div>

      <div class="hud-team red" :class="{ down: !eagleAlive.red }">
        <span class="hud-team-name">ĐỘI ĐỎ</span>
        <component :is="eagleAlive.red ? LucideShieldCheck : LucideShieldOff" class="hud-shield" />
      </div>

      <button class="hud-btn" :title="isFullscreen ? 'Thu nhỏ (F)' : 'Toàn màn hình (F)'" @click="toggleFullscreen">
        <LucideMinimize v-if="isFullscreen" class="icon" />
        <LucideMaximize v-else class="icon" />
      </button>
    </div>

    <div class="stage">
      <div ref="slotRef" class="board-slot">
        <div class="board" :style="{ width: `${boardSize}px`, height: `${boardSize}px` }">
          <canvas ref="canvasRef" class="game-canvas" />

          <div v-if="countdown > 0" class="overlay-center">
            <div class="countdown-num">{{ countdown }}</div>
            <div class="countdown-hint">Chuẩn bị chiến đấu</div>
          </div>

          <Transition name="toast">
            <div v-if="toast" class="toast" :class="toast.tone">
              <component :is="toast.icon" class="icon" />
              <span>{{ toast.text }}</span>
            </div>
          </Transition>

          <div v-if="isEliminated && !finished" class="badge-spectator">
            <LucideEye class="icon" /> ĐANG QUAN SÁT
          </div>
          <div v-else-if="isRespawning && !finished" class="badge-spectator respawn">
            <LucideRefreshCw class="icon" /> ĐANG HỒI SINH
          </div>

          <div v-if="finished && resultDismissed" class="result-bar">
            <span class="result-bar-text" :class="winner">
              <LucideTrophy class="icon" />
              {{ winner === 'blue' ? 'Đội Xanh thắng' : 'Đội Đỏ thắng' }}
            </span>
            <button class="tm-btn primary slim" @click="handleRematch">ĐẤU LẠI</button>
            <button class="tm-btn slim" @click="resultDismissed = false">KẾT QUẢ</button>
          </div>
        </div>
      </div>

      <aside class="roster">
        <div class="roster-title">CHIẾN BINH</div>
        <div class="roster-list">
          <div
            v-for="p in rosterRows"
            :key="p.id"
            class="roster-item"
            :class="[p.team, { me: p.id === myPlayerId, out: p.lives <= 0 }]"
          >
            <TankIcon :team="p.team" :size="34" />
            <div class="roster-info">
              <span class="roster-name">
                {{ p.name }}
                <span v-if="p.id === myPlayerId" class="me-tag">BẠN</span>
                <LucideWifiOff v-if="!p.online" class="icon offline" title="Mất kết nối" />
              </span>
              <div class="roster-meta">
                <span class="roster-hearts">
                  <LucideHeart v-for="h in MAX_LIVES" :key="h" class="heart" :class="{ lost: h > p.lives }" />
                </span>
                <span class="stat" title="Hạ gục"><LucideCrosshair class="icon" />{{ p.kills }}</span>
                <span class="stat" title="Bị hạ"><LucideSkull class="icon" />{{ p.deaths }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="roster-hint">
          <span><kbd>WASD</kbd> di chuyển</span>
          <span><kbd>Space</kbd> bắn</span>
        </div>
      </aside>
    </div>

    <!-- Touch controls -->
    <div v-if="showTouchControls" class="touch-controls">
      <div class="dpad">
        <button class="dpad-btn up" @pointerdown.prevent="touchDir(0)" @pointerup.prevent="touchDirEnd(0)" @pointerleave="touchDirEnd(0)" @pointercancel="touchDirEnd(0)"><LucideArrowUp class="icon" /></button>
        <button class="dpad-btn left" @pointerdown.prevent="touchDir(3)" @pointerup.prevent="touchDirEnd(3)" @pointerleave="touchDirEnd(3)" @pointercancel="touchDirEnd(3)"><LucideArrowLeft class="icon" /></button>
        <button class="dpad-btn right" @pointerdown.prevent="touchDir(1)" @pointerup.prevent="touchDirEnd(1)" @pointerleave="touchDirEnd(1)" @pointercancel="touchDirEnd(1)"><LucideArrowRight class="icon" /></button>
        <button class="dpad-btn down" @pointerdown.prevent="touchDir(2)" @pointerup.prevent="touchDirEnd(2)" @pointerleave="touchDirEnd(2)" @pointercancel="touchDirEnd(2)"><LucideArrowDown class="icon" /></button>
      </div>
      <button
        class="fire-btn"
        @pointerdown.prevent="touchFire(true)"
        @pointerup.prevent="touchFire(false)"
        @pointerleave="touchFire(false)"
        @pointercancel="touchFire(false)"
      >
        <LucideCrosshair class="icon" />
      </button>
    </div>

    <!-- Match result -->
    <TankModal
      v-if="finished && !resultDismissed"
      :title="winner === 'blue' ? 'ĐỘI XANH CHIẾN THẮNG' : 'ĐỘI ĐỎ CHIẾN THẮNG'"
      :subtitle="gameOverReasonText"
      :tone="winner === 'blue' ? 'blue' : 'red'"
      @close="resultDismissed = true"
    >
      <template #icon><LucideTrophy /></template>

      <div class="series-banner">
        <span class="series-label">TỈ SỐ LIÊN ĐẤU</span>
        <div class="series-score">
          <span class="num blue">{{ currentTankRoom?.teamScores?.blue ?? 0 }}</span>
          <span class="sep">-</span>
          <span class="num red">{{ currentTankRoom?.teamScores?.red ?? 0 }}</span>
        </div>
      </div>

      <div class="stats-table">
        <div class="stats-head">
          <span>Người chơi</span><span>Mạng</span><span>K</span><span>D</span>
        </div>
        <div v-for="p in rosterRows" :key="p.id" class="stats-row" :class="p.team">
          <span class="stats-name"><TankIcon :team="p.team" :size="20" />{{ p.name }}</span>
          <span class="stats-hearts">
            <LucideHeart v-for="h in MAX_LIVES" :key="h" class="heart" :class="{ lost: h > p.lives }" />
          </span>
          <span>{{ p.kills }}</span>
          <span>{{ p.deaths }}</span>
        </div>
      </div>

      <template #actions>
        <button class="tm-btn primary" @click="handleRematch"><LucideSwords />ĐẤU LẠI</button>
        <button class="tm-btn" @click="resultDismissed = true"><LucideEye />XEM SÂN ĐẤU</button>
        <button class="tm-btn danger" @click="handleLeave"><LucideLogOut />RỜI PHÒNG</button>
      </template>
    </TankModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, shallowRef, onMounted, onUnmounted, type Component } from 'vue'
import {
  LucideMaximize,
  LucideMinimize,
  LucideShieldCheck,
  LucideShieldOff,
  LucideMap,
  LucideEye,
  LucideRefreshCw,
  LucideHeart,
  LucideTrophy,
  LucideSwords,
  LucideLogOut,
  LucideWifiOff,
  LucideSkull,
  LucideArrowUp,
  LucideArrowDown,
  LucideArrowLeft,
  LucideArrowRight,
  LucideCrosshair
} from '@lucide/vue'
import { useTankSocket } from '~/composables/useTankSocket'
import { tankAudio } from '~/utils/tank/tankAudio'
import {
  TILE_EMPTY,
  TILE_BRICK,
  TILE_STEEL,
  TILE_WATER,
  TILE_TREES,
  TILE_FORT_BLUE,
  TILE_FORT_RED,
  MAP_SIZE,
  TILE_SIZE,
  WORLD_SIZE,
  FORT_MAX_HP
} from '~/utils/tank/tankMaps'
import {
  stepMovement,
  stepProxyBullet,
  muzzlePosition,
  FIRE_COOLDOWN_STEPS,
  FIRE_BUFFER_STEPS,
  MAX_BULLETS_PER_TANK,
  type PredictedPose,
  type ProxyBullet
} from '~/utils/tank/tankPrediction'
import {
  drawBrick,
  drawSteel,
  drawWater,
  drawTrees,
  drawFortressWall,
  drawEagle,
  drawPvPTank,
  drawBullet,
  drawExplosions,
  type TankExplosion,
  type RenderTank,
  type RenderBullet
} from '~/utils/tank/tankRenderer'
import type {
  SnapEvent,
  SnapTank,
  TankFullState,
  TankGameOver,
  TankSnapshot,
  Team
} from '~/types/tank'

const MAX_LIVES = 3
const TICK_MS = 1000 / 60
const BULLET_STEP = 4.2 // px per server tick (matches the engine)
const BULLET_DIRS: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]]
const MIN_INTERP_DELAY_TICKS = 3 // render slightly behind the newest snapshot (50ms) to stay smooth
const MAX_INTERP_DELAY_TICKS = 9 // upper bound when the network is jittery
const INTERP_DELAY_TICKS = MIN_INTERP_DELAY_TICKS // initial value; the live one is interpDelay
const TELEPORT_DISTANCE = 40

const {
  currentTankRoom,
  myPlayerId,
  setMatchHandlers,
  clearMatchHandlers,
  takePendingFullState,
  sendCommand,
  rematch,
  leaveRoom
} = useTankSocket()

// ---- Layout (fit the viewport, never scroll) -----------------------------

const containerRef = ref<HTMLElement | null>(null)
const slotRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerHeight = ref('auto')
const boardSize = ref(416)
const isFullscreen = ref(false)
const showTouchControls = ref(false)

let resizeObserver: ResizeObserver | null = null
let ctx: CanvasRenderingContext2D | null = null
let canvasScale = 1

function fitToViewport() {
  const el = containerRef.value
  if (!el) return
  const top = el.getBoundingClientRect().top
  const bottomGap = isFullscreen.value ? 0 : 12
  containerHeight.value = `${Math.max(320, Math.floor(window.innerHeight - Math.max(0, top) - bottomGap))}px`
  showTouchControls.value = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700
}

function fitBoard() {
  const slot = slotRef.value
  if (!slot) return
  const size = Math.floor(Math.min(slot.clientWidth, slot.clientHeight))
  if (size > 0 && size !== boardSize.value) boardSize.value = size
  resizeCanvas()
}

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = Math.min(window.devicePixelRatio || 1, 3)
  const px = Math.max(1, Math.round(boardSize.value * dpr))
  if (canvas.width !== px) {
    canvas.width = px
    canvas.height = px
  }
  canvasScale = px / WORLD_SIZE
}

function onWindowResize() {
  fitToViewport()
  requestAnimationFrame(fitBoard)
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    ;(containerRef.value || document.documentElement).requestFullscreen?.().catch(() => {})
  } else {
    document.exitFullscreen?.().catch(() => {})
  }
}

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
  fitToViewport()
  requestAnimationFrame(fitBoard)
}

// ---- Match state (all of it comes from the server) -----------------------

let map: number[][] = []
const wallHp = new Map<string, number>()
const mapName = ref('')
const eagleAlive = ref({ blue: true, red: true })
const countdown = ref(0)
const finished = ref(false)
const resultDismissed = ref(false)
const winner = ref<Team>('blue')
const gameOverReason = ref<'eagle' | 'lives'>('eagle')
const hudTanks = shallowRef<SnapTank[]>([])

const rosterRows = computed(() => {
  const live = new Map(hudTanks.value.map((t) => [t.id, t]))
  return (currentTankRoom.value?.players ?? []).map((p) => {
    const t = live.get(p.id)
    return {
      id: p.id,
      name: p.name,
      team: p.team,
      lives: t?.lives ?? p.lives,
      kills: t?.kills ?? p.kills,
      deaths: t?.deaths ?? p.deaths,
      online: t?.online ?? p.connected
    }
  })
})

const myRow = computed(() => rosterRows.value.find((p) => p.id === myPlayerId.value))
const myLiveTank = computed(() => hudTanks.value.find((t) => t.id === myPlayerId.value))
const isEliminated = computed(() => !!myRow.value && myRow.value.lives <= 0 && hudTanks.value.length > 0)
const isRespawning = computed(() => !!myLiveTank.value && !myLiveTank.value.alive && (myRow.value?.lives ?? 0) > 0)

const gameOverReasonText = computed(() => {
  const loser = winner.value === 'blue' ? 'Đội Đỏ' : 'Đội Xanh'
  return gameOverReason.value === 'lives'
    ? `Toàn bộ chiến xa của ${loser} đã hết mạng.`
    : `Đại bàng của ${loser} đã bị phá hủy.`
})

// Snapshot interpolation timeline (in server ticks)
let snaps: TankSnapshot[] = []
let renderTick = 0
let lastAppliedTick = -1
let newestTick = 0
let pendingResult: TankGameOver | null = null
let clockOffset: number | null = null
let jitterMs = 0 // how late packets arrive compared with the fastest recent ones
let interpDelay = INTERP_DELAY_TICKS // adapts to jitterMs so a late packet never starves the buffer
let newestSnap: TankSnapshot | null = null

// ---- Local tank prediction ----------------------------------------------------
// Every 60Hz step we send a numbered movement command and apply it locally right away. When a
// snapshot arrives we restart from the server's position and replay the commands it has not
// applied yet. Both sides run the same rules, so the result matches and nothing visibly jumps.
interface PendingCommand {
  n: number
  dir: number
}
const pred: PredictedPose & { px: number; py: number; alive: boolean } = {
  x: 0, y: 0, px: 0, py: 0, dir: 0, alive: false
}
let pending: PendingCommand[] = []
let cmdSeq = 0
let stepAcc = 0
let errX = 0 // small visual offset that fades out after a correction
let errY = 0
let predCooldown = 0
let predFireQueued = 0
let proxies: ProxyBullet[] = []

function loadFullState(state: TankFullState) {
  map = state.map.map((row) => [...row])
  wallHp.clear()
  for (const [k, v] of Object.entries(state.wallHp)) wallHp.set(k, v)
  mapName.value = state.mapName
  eagleAlive.value = { ...state.eagles }
  finished.value = false
  resultDismissed.value = false
  pendingResult = null
  explosions.length = 0
  particles.length = 0
  snaps = []
  newestSnap = null
  pred.alive = false
  pending = []
  proxies = []
  predCooldown = 0
  predFireQueued = 0
  errX = errY = 0
  // After a refresh the server still remembers our old command numbers and drops anything not newer.
  const mine = state.snapshot.tanks.find((t) => t.id === myPlayerId.value)
  cmdSeq = Math.max(cmdSeq, mine?.ack ?? 0)
  lastAppliedTick = state.snapshot.tick - 1
  pushSnapshot(state.snapshot)
  renderTick = state.snapshot.tick - INTERP_DELAY_TICKS
  eliminatedNotified = false
}

function pushSnapshot(snapshot: TankSnapshot) {
  if (snaps.length && snapshot.tick <= snaps[snaps.length - 1]!.tick) return
  snaps.push(snapshot)
  newestTick = snapshot.tick
  newestSnap = snapshot
  reconcile(snapshot)

  // sample = local arrival time minus server time. Lower means a faster packet, so follow
  // improvements quickly and drift upward slowly; that keeps the estimate close to true latency.
  const sample = performance.now() - snapshot.tick * TICK_MS
  if (clockOffset === null || Math.abs(sample - clockOffset) > 1000) clockOffset = sample
  else clockOffset += (sample - clockOffset) * (sample < clockOffset ? 0.5 : 0.02)
  if (clockOffset !== null) {
    const late = Math.max(0, sample - clockOffset)
    // Fast attack, slow release: spikes widen the buffer at once, calm periods shrink it gradually.
    jitterMs += (late - jitterMs) * (late > jitterMs ? 0.3 : 0.01)
  }
  if (snaps.length === 1) renderTick = snapshot.tick - INTERP_DELAY_TICKS
  // Background tab: keep the queue bounded while still applying persistent state changes.
  while (snaps.length > 90) {
    const old = snaps.shift()!
    applyEvents(old, true)
    lastAppliedTick = Math.max(lastAppliedTick, old.tick)
  }
}

function onGameOver(data: TankGameOver) {
  pendingResult = data
  pushSnapshot(data.snapshot)
}

// ---- Event effects --------------------------------------------------------

const particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }[] = []
const explosions: TankExplosion[] = []
let screenShake = 0

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

function spawnExplosion(x: number, y: number, isBig: boolean) {
  tankAudio.boom()
  screenShake = Math.max(screenShake, isBig ? 10 : 5)

  const puffs = []
  const colors = ['#ffffff', '#fef08a', '#f97316', '#ef4444', '#991b1b', '#334155']
  for (let i = 0; i < (isBig ? 12 : 6); i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = Math.random() * (isBig ? 16 : 8)
    puffs.push({
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      radius: Math.random() * 3 + 2,
      maxRadius: Math.random() * (isBig ? 16 : 9) + 8,
      color: colors[Math.floor(Math.random() * colors.length)]!
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
  spawnSparks(x, y, '#f97316', isBig ? 28 : 14)
  spawnSparks(x, y, '#fef08a', isBig ? 18 : 8)
}

function applyEvents(snap: TankSnapshot, silent: boolean) {
  for (const ev of snap.events as SnapEvent[]) {
    switch (ev.type) {
      case 'tile':
        if (map[ev.r]) map[ev.r]![ev.c] = ev.tile
        if (ev.tile === TILE_FORT_BLUE || ev.tile === TILE_FORT_RED) wallHp.set(`${ev.r}_${ev.c}`, ev.hp)
        else wallHp.delete(`${ev.r}_${ev.c}`)
        break
      case 'eagle':
        eagleAlive.value = { ...eagleAlive.value, [ev.team]: false }
        break
      default:
        if (!silent) playEffect(ev)
    }
  }
}

function playEffect(ev: SnapEvent) {
  switch (ev.type) {
    case 'shoot':
      // Our own shots already played their sound the instant we fired.
      if (ev.ownerId !== myPlayerId.value) tankAudio.shoot()
      break
    case 'brick':
      tankAudio.explodeSmall()
      spawnSparks(ev.x, ev.y, '#f97316', 8)
      break
    case 'steel':
      tankAudio.hitSteel()
      spawnSparks(ev.x, ev.y, '#fcd34d', 6)
      break
    case 'shield':
      tankAudio.hitSteel()
      spawnSparks(ev.x, ev.y, '#38bdf8', 10)
      break
    case 'clash':
      tankAudio.explodeSmall()
      spawnSparks(ev.x, ev.y, '#fcd34d', 12)
      break
    case 'fort_hit':
      tankAudio.hitSteel()
      spawnSparks(ev.x, ev.y, ev.team === 'blue' ? '#38bdf8' : '#ef4444', 8)
      break
    case 'explosion':
      spawnExplosion(ev.x, ev.y, ev.big)
      break
    case 'respawn':
      if (ev.id === myPlayerId.value) tankAudio.powerup()
      break
  }
}

// ---- Toast ------------------------------------------------------------------

const toast = ref<{ text: string; tone: 'danger' | 'info'; icon: Component } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null
let eliminatedNotified = false

function showToast(text: string, tone: 'danger' | 'info', icon: Component, ms = 3500) {
  toast.value = { text, tone, icon }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = null
  }, ms)
}

// ---- Input ---------------------------------------------------------------------

const KEY_DIRS: Record<string, number> = {
  ArrowUp: 0,
  KeyW: 0,
  ArrowRight: 1,
  KeyD: 1,
  ArrowDown: 2,
  KeyS: 2,
  ArrowLeft: 3,
  KeyA: 3
}
const heldDirs: number[] = []
const FIRE_KEYS = new Set(['Space', 'KeyJ'])
const heldFireKeys = new Set<string>()
let touchFireHeld = false
let fireSeq = 0
let lastSentSeq = 0

function pushDir(dir: number) {
  const idx = heldDirs.indexOf(dir)
  if (idx >= 0) heldDirs.splice(idx, 1)
  heldDirs.push(dir)
}

function releaseDir(dir: number) {
  const idx = heldDirs.indexOf(dir)
  if (idx >= 0) heldDirs.splice(idx, 1)
}

// The newest pressed direction wins, which feels natural when changing direction mid-move.
// Input is sampled by localStep() at 60Hz and sent as numbered commands; here we only notice a
// fresh press so a quick tap is remembered until the cannon is ready.
function flushInput() {
  if (fireSeq !== lastSentSeq) {
    lastSentSeq = fireSeq
    predFireQueued = FIRE_BUFFER_STEPS
  }
}

function fireHeld() {
  return heldFireKeys.size > 0 || touchFireHeld
}

function clearInput() {
  heldDirs.length = 0
  heldFireKeys.clear()
  touchFireHeld = false
  flushInput()
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.code === 'KeyF' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    toggleFullscreen()
    return
  }
  const target = e.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
  if (finished.value) return

  const dir = KEY_DIRS[e.code]
  if (dir !== undefined) {
    e.preventDefault()
    if (!e.repeat) pushDir(dir)
    flushInput()
  } else if (FIRE_KEYS.has(e.code)) {
    e.preventDefault()
    if (!e.repeat && !heldFireKeys.has(e.code)) fireSeq++
    heldFireKeys.add(e.code)
    flushInput()
  }
}

function handleKeyUp(e: KeyboardEvent) {
  const dir = KEY_DIRS[e.code]
  if (dir !== undefined) {
    releaseDir(dir)
    flushInput()
  } else if (FIRE_KEYS.has(e.code)) {
    heldFireKeys.delete(e.code)
    flushInput()
  }
}

function touchDir(dir: number) {
  pushDir(dir)
  flushInput()
}
function touchDirEnd(dir: number) {
  releaseDir(dir)
  flushInput()
}
function touchFire(on: boolean) {
  if (on && !touchFireHeld) fireSeq++
  touchFireHeld = on
  flushInput()
}

// ---- Frame loop ---------------------------------------------------------------

let rafId = 0
let lastFrameTime = 0

function frame(time: number) {
  rafId = requestAnimationFrame(frame)
  const dtMs = lastFrameTime ? Math.min(time - lastFrameTime, 250) : 16.7
  lastFrameTime = time
  const dtTicks = dtMs / (1000 / 60)

  stepAcc = Math.min(stepAcc + dtMs, 100)
  while (stepAcc >= TICK_MS) {
    stepAcc -= TICK_MS
    localStep()
  }

  advanceTimeline(time)
  stepCosmetics(dtTicks)
  render()
}

// The render clock is derived from the local clock and a smoothed estimate of the server clock,
// so it advances at a perfectly steady rate no matter when individual snapshots arrive.
function currentDir() {
  return heldDirs.length ? heldDirs[heldDirs.length - 1]! : -1
}

function obstaclesFrom(snap: TankSnapshot) {
  return snap.tanks.filter((t) => t.id !== myPlayerId.value && t.alive)
}

// One local 60Hz step: send the command, then apply it to the predicted pose.
function localStep() {
  const snap = newestSnap
  if (!snap || !map.length || finished.value) return
  const dir = currentDir()
  const n = ++cmdSeq
  stepProxies(snap)

  if (!pred.alive || snap.countdown > 0) {
    sendCommand(n, dir, false)
    pred.px = pred.x
    pred.py = pred.y
    predFireQueued = 0
    return
  }

  // Same order as the server: cool down, fire from the current pose, then move.
  if (predCooldown > 0) predCooldown--
  if (predFireQueued > 0) predFireQueued--
  let fire = false
  if ((fireHeld() || predFireQueued > 0) && predCooldown === 0 && proxies.length < MAX_BULLETS_PER_TANK) {
    fire = true
    predCooldown = FIRE_COOLDOWN_STEPS
    predFireQueued = 0
    const m = muzzlePosition(pred)
    proxies.push({ n, x: m.x, y: m.y, px: m.x, py: m.y, dir: pred.dir })
    tankAudio.shoot()
  }
  sendCommand(n, dir, fire)

  pending.push({ n, dir })
  if (pending.length > 120) pending.shift()
  pred.px = pred.x
  pred.py = pred.y
  stepMovement(pred, dir, map, obstaclesFrom(snap))
  errX *= 0.82
  errY *= 0.82
}

// Own bullets are drawn from local proxies that appear the instant we fire. Each lives until the
// server's bullet with the same command number is gone (it hit something) or was never created.
function stepProxies(snap: TankSnapshot) {
  const me = snap.tanks.find((t) => t.id === myPlayerId.value)
  const live = new Set(snap.bullets.filter((b) => b.o === myPlayerId.value).map((b) => b.c))
  for (let i = proxies.length - 1; i >= 0; i--) {
    const p = proxies[i]!
    const serverDone = !!me && me.ack >= p.n && !live.has(p.n)
    if (serverDone || !stepProxyBullet(p, map)) proxies.splice(i, 1)
  }
}

// New authoritative state: rebuild the prediction from it plus the still-unacknowledged commands.
function reconcile(snap: TankSnapshot) {
  const me = snap.tanks.find((t) => t.id === myPlayerId.value)
  if (!me) return
  if (!me.alive || snap.countdown > 0) {
    pred.alive = me.alive
    pred.x = pred.px = me.x
    pred.y = pred.py = me.y
    pred.dir = me.dir
    pending = []
    errX = errY = 0
    return
  }
  if (!pred.alive) {
    pred.alive = true
    pred.x = pred.px = me.x
    pred.y = pred.py = me.y
    pred.dir = me.dir
    pending = []
    errX = errY = 0
    return
  }

  pending = pending.filter((c) => c.n > me.ack)
  const base: PredictedPose = { x: me.x, y: me.y, dir: me.dir }
  const others = obstaclesFrom(snap)
  for (const c of pending) stepMovement(base, c.dir, map, others)

  const dx = base.x - pred.x
  const dy = base.y - pred.y
  if (dx === 0 && dy === 0) return
  if (Math.hypot(dx, dy) > 60) {
    // Far off (respawn, heavy collision): snap instead of sliding across the board.
    errX = errY = 0
  } else {
    // Keep what is on screen steady and let the correction fade in over a few steps.
    errX -= dx
    errY -= dy
  }
  pred.x = base.x
  pred.y = base.y
  pred.px += dx
  pred.py += dy
  pred.dir = base.dir
}

function advanceTimeline(nowMs: number) {
  if (!snaps.length || clockOffset === null) return
  const wanted = Math.min(
    MAX_INTERP_DELAY_TICKS,
    Math.max(MIN_INTERP_DELAY_TICKS, MIN_INTERP_DELAY_TICKS + (jitterMs * 1.5) / TICK_MS)
  )
  // Move the delay slowly so the timeline never visibly speeds up or slows down.
  interpDelay += Math.max(-0.01, Math.min(0.05, wanted - interpDelay))
  renderTick = Math.min((nowMs - clockOffset) / TICK_MS - interpDelay, newestTick)

  for (const s of snaps) {
    if (s.tick > lastAppliedTick && s.tick <= renderTick) {
      applyEvents(s, s.tick < renderTick - 30)
      lastAppliedTick = s.tick
      countdown.value = s.countdown
    }
  }

  // Keep exactly one snapshot at or behind renderTick as the interpolation start.
  while (snaps.length > 1 && snaps[1]!.tick <= renderTick) snaps.shift()

  const current = snaps[0]!
  updateHud(current)

  if (pendingResult && renderTick >= pendingResult.snapshot.tick) {
    const r = pendingResult
    pendingResult = null
    winner.value = r.winner
    gameOverReason.value = r.reason
    finished.value = true
    countdown.value = 0
    clearInput()
    tankAudio.gameOver()
  }
}

let hudSignature = ''
function updateHud(s: TankSnapshot) {
  const sig = s.tanks.map((t) => `${t.id}:${t.lives}:${t.kills}:${t.deaths}:${t.alive ? 1 : 0}:${t.online ? 1 : 0}`).join('|')
  if (sig === hudSignature) return
  hudSignature = sig
  hudTanks.value = s.tanks

  const me = s.tanks.find((t) => t.id === myPlayerId.value)
  if (me && me.lives <= 0 && !eliminatedNotified && !finished.value) {
    eliminatedNotified = true
    heldDirs.length = 0
    flushInput()
    showToast('Bạn đã hết mạng — tiếp tục xem đồng đội thi đấu', 'danger', LucideSkull)
  }
}

interface RenderState {
  tanks: (RenderTank & { id: string; alive: boolean })[]
  bullets: RenderBullet[]
}

function sampleState(): RenderState {
  const a = snaps[0]
  if (!a) return { tanks: [], bullets: [] }
  const b = snaps.length > 1 ? snaps[1]! : null
  const span = b ? b.tick - a.tick : 0
  const t = b && span > 0 ? Math.min(1, Math.max(0, (renderTick - a.tick) / span)) : 0

  const names = new Map((currentTankRoom.value?.players ?? []).map((p) => [p.id, p]))
  const bTanks = new Map(b?.tanks.map((x) => [x.id, x]))
  const tanks: RenderState['tanks'] = []

  for (const ta of a.tanks) {
    const tb = bTanks.get(ta.id)
    const info = names.get(ta.id)
    let x = ta.x
    let y = ta.y
    let dir = ta.dir
    let alive = ta.alive
    let shield = ta.shield
    if (tb) {
      const sameLife = ta.alive === tb.alive && Math.hypot(tb.x - ta.x, tb.y - ta.y) < TELEPORT_DISTANCE
      if (sameLife) {
        x = ta.x + (tb.x - ta.x) * t
        y = ta.y + (tb.y - ta.y) * t
        dir = t >= 0.5 ? tb.dir : ta.dir
      } else if (t >= 0.5) {
        x = tb.x
        y = tb.y
        dir = tb.dir
        alive = tb.alive
      }
      shield = t >= 0.5 ? tb.shield : ta.shield
    }
    // Our own tank is drawn from the prediction, smoothed between the last two local steps.
    if (ta.id === myPlayerId.value && pred.alive && newestSnap?.tanks.find((t) => t.id === ta.id)?.alive) {
      const a = Math.min(1, Math.max(0, stepAcc / TICK_MS))
      x = pred.px + (pred.x - pred.px) * a + errX
      y = pred.py + (pred.y - pred.py) * a + errY
      dir = pred.dir as typeof dir
      alive = true
      shield = newestSnap.tanks.find((t) => t.id === ta.id)!.shield
    }
    if (!alive) continue
    tanks.push({
      id: ta.id,
      alive,
      x,
      y,
      dir,
      shield,
      team: info?.team ?? 'blue',
      name: info?.name ?? ''
    })
  }

  const bBullets = new Map(b?.bullets.map((x) => [x.id, x]))
  // Our own bullets are drawn from the local proxies instead (see below).
  const bullets: RenderBullet[] = a.bullets.filter((ba) => ba.o !== myPlayerId.value).map((ba) => {
    const bb = bBullets.get(ba.id)
    return bb
      ? { x: ba.x + (bb.x - ba.x) * t, y: ba.y + (bb.y - ba.y) * t, dir: ba.dir, team: ba.team }
      : { x: ba.x, y: ba.y, dir: ba.dir, team: ba.team }
  })
  // Bullets born between the two snapshots are placed where they must have been at this
  // moment (walking their path back from the newer snapshot) so they leave the muzzle smoothly.
  if (b && t > 0) {
    const inA = new Set(a.bullets.map((x) => x.id))
    const back = (t - 1) * span * BULLET_STEP
    for (const bb of b.bullets) {
      if (inA.has(bb.id) || bb.o === myPlayerId.value) continue
      const v = BULLET_DIRS[bb.dir] ?? [0, 0]
      bullets.push({ x: bb.x + v[0] * back, y: bb.y + v[1] * back, dir: bb.dir, team: bb.team })
    }
  }
  const myTeam: Team = names.get(myPlayerId.value ?? '')?.team ?? 'blue'
  const stepAlpha = Math.min(1, Math.max(0, stepAcc / TICK_MS))
  for (const p of proxies) {
    bullets.push({
      x: p.px + (p.x - p.px) * stepAlpha,
      y: p.py + (p.y - p.py) * stepAlpha,
      dir: p.dir,
      team: myTeam
    })
  }
  return { tanks, bullets }
}

function stepCosmetics(dtTicks: number) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]!
    p.x += p.vx * dtTicks
    p.y += p.vy * dtTicks
    p.life += dtTicks
    if (p.life >= p.maxLife) particles.splice(i, 1)
  }
  for (let i = explosions.length - 1; i >= 0; i--) {
    const ex = explosions[i]!
    ex.life += dtTicks
    ex.shockwaveRadius += (ex.maxShockwaveRadius - ex.shockwaveRadius) * 0.18 * dtTicks
    for (const p of ex.puffs) p.radius += (p.maxRadius - p.radius) * 0.14 * dtTicks
    if (ex.life >= ex.maxLife) explosions.splice(i, 1)
  }
  if (screenShake > 0) screenShake = Math.max(0, screenShake * Math.pow(0.88, dtTicks) - 0.2 * dtTicks)
}

// ---- Rendering ---------------------------------------------------------------

function render() {
  if (!ctx || !map.length) return
  resizeCanvas()

  ctx.save()
  if (screenShake > 0.1) {
    ctx.translate((Math.random() - 0.5) * screenShake * canvasScale, (Math.random() - 0.5) * screenShake * canvasScale)
  }
  ctx.scale(canvasScale, canvasScale)

  ctx.fillStyle = '#050b14'
  ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE)

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
  ctx.lineWidth = 0.5
  for (let p = 0; p <= WORLD_SIZE; p += TILE_SIZE) {
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, WORLD_SIZE); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(WORLD_SIZE, p); ctx.stroke()
  }

  for (let r = 0; r < MAP_SIZE; r++) {
    for (let c = 0; c < MAP_SIZE; c++) {
      const tile = map[r]![c]!
      if (tile === TILE_EMPTY) continue
      const tx = c * TILE_SIZE
      const ty = r * TILE_SIZE
      if (tile === TILE_BRICK) drawBrick(ctx, tx, ty)
      else if (tile === TILE_STEEL) drawSteel(ctx, tx, ty)
      else if (tile === TILE_WATER) drawWater(ctx, tx, ty)
      else if (tile === TILE_FORT_BLUE || tile === TILE_FORT_RED) {
        drawFortressWall(ctx, tx, ty, tile, wallHp.get(`${r}_${c}`) ?? FORT_MAX_HP)
      }
    }
  }

  drawEagle(ctx, 'blue', eagleAlive.value.blue)
  drawEagle(ctx, 'red', eagleAlive.value.red)

  const state = sampleState()
  for (const t of state.tanks) drawPvPTank(ctx, t, t.id === myPlayerId.value)

  // Trees on top so tanks hide beneath the canopy
  for (let r = 0; r < MAP_SIZE; r++) {
    for (let c = 0; c < MAP_SIZE; c++) {
      if (map[r]![c] === TILE_TREES) drawTrees(ctx, c * TILE_SIZE, r * TILE_SIZE)
    }
  }

  for (const b of state.bullets) drawBullet(ctx, b)

  for (const p of particles) {
    ctx.fillStyle = p.color
    ctx.fillRect(p.x, p.y, p.size, p.size)
  }
  drawExplosions(ctx, explosions)

  ctx.restore()
}

// ---- Actions ------------------------------------------------------------------

async function handleRematch() {
  await rematch()
}

async function handleLeave() {
  await leaveRoom()
}

// ---- Lifecycle ------------------------------------------------------------------

onMounted(() => {
  ctx = canvasRef.value?.getContext('2d') ?? null

  setMatchHandlers({
    onFullState: loadFullState,
    onSnapshot: pushSnapshot,
    onGameOver
  })

  const pending = takePendingFullState()
  if (pending) loadFullState(pending)
  else if (currentTankRoom.value?.status === 'FINISHED') {
    // Resumed after the match ended: no live state, just show the result.
    winner.value = currentTankRoom.value.winner ?? 'blue'
    gameOverReason.value = currentTankRoom.value.gameOverReason ?? 'eagle'
    eagleAlive.value = {
      blue: currentTankRoom.value.eagles.blue.alive,
      red: currentTankRoom.value.eagles.red.alive
    }
    mapName.value = currentTankRoom.value.mapName
    finished.value = true
  }

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('blur', clearInput)
  window.addEventListener('resize', onWindowResize)
  window.addEventListener('orientationchange', onWindowResize)
  document.addEventListener('fullscreenchange', onFullscreenChange)

  fitToViewport()
  if (slotRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(fitBoard)
    resizeObserver.observe(slotRef.value)
  }
  requestAnimationFrame(fitBoard)

  rafId = requestAnimationFrame(frame)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  clearMatchHandlers()
  clearInput()
  if (toastTimer) clearTimeout(toastTimer)
  resizeObserver?.disconnect()
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  window.removeEventListener('blur', clearInput)
  window.removeEventListener('resize', onWindowResize)
  window.removeEventListener('orientationchange', onWindowResize)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
})
</script>

<style scoped>
.pvp-game {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 8px;
  min-height: 0;
  background: transparent;
}

.pvp-game:fullscreen {
  max-width: none;
  padding: 8px 12px;
  background: #050811;
}

/* HUD */
.hud {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 12px;
  flex-shrink: 0;
}

.hud-team {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-family: 'Orbitron', sans-serif;
  font-weight: 800;
  font-size: 0.85rem;
  white-space: nowrap;
  transition: opacity 0.3s, filter 0.3s;
}
.hud-team.blue { color: #38bdf8; }
.hud-team.red { color: #ef4444; justify-content: flex-end; }
.hud-team.down { opacity: 0.45; filter: grayscale(1); }
.hud-shield { width: 22px; height: 22px; }

.hud-center {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 8px;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  white-space: nowrap;
}
.chip-code { color: #38bdf8; background: rgba(56, 189, 248, 0.1); letter-spacing: 0.06em; }
.chip-map { color: #fcd34d; background: rgba(252, 211, 77, 0.1); border: 1px solid rgba(252, 211, 77, 0.25); max-width: 190px; overflow: hidden; text-overflow: ellipsis; }

.hud-score {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 12px;
  background: rgba(2, 6, 23, 0.7);
  border: 1px solid #475569;
  border-radius: 8px;
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  font-size: 1.1rem;
}
.num.blue { color: #38bdf8; }
.num.red { color: #ef4444; }
.sep { color: #fcd34d; }

.hud-btn {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #475569;
  background: #1e293b;
  color: #f1f5f9;
  cursor: pointer;
  transition: all 0.15s;
}
.hud-btn:hover { border-color: #38bdf8; color: #38bdf8; }
.hud-btn .icon { width: 16px; height: 16px; }

/* Stage */
.stage {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  gap: 8px;
}

.board-slot {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.board {
  position: relative;
  background: #000;
  border: 2px solid #334155;
  border-radius: 6px;
  box-shadow: 0 0 24px rgba(0, 0, 0, 0.7);
  overflow: hidden;
  flex-shrink: 0;
}

.game-canvas {
  display: block;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
}

.overlay-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(2, 6, 23, 0.45);
  pointer-events: none;
}
.countdown-num {
  font-family: 'Orbitron', sans-serif;
  font-size: clamp(3rem, 14vmin, 6rem);
  font-weight: 900;
  color: #fcd34d;
  text-shadow: 0 0 30px rgba(252, 211, 77, 0.6);
}
.countdown-hint {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  color: #cbd5e1;
}

.toast {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: calc(100% - 24px);
  padding: 9px 16px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
  color: #fff;
  pointer-events: none;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
}
.toast .icon { width: 16px; height: 16px; }
.toast.danger { background: rgba(185, 28, 28, 0.92); border: 1px solid #f87171; }
.toast.info { background: rgba(3, 105, 161, 0.92); border: 1px solid #38bdf8; }
.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, -10px); }

.badge-spectator {
  position: absolute;
  left: 10px;
  bottom: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 999px;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #fecaca;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(239, 68, 68, 0.6);
  pointer-events: none;
}
.badge-spectator.respawn { color: #bae6fd; border-color: rgba(56, 189, 248, 0.6); }
.badge-spectator .icon { width: 13px; height: 13px; }

.result-bar {
  position: absolute;
  left: 50%;
  top: 12px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px 8px 14px;
  background: rgba(15, 23, 42, 0.94);
  border: 1px solid #475569;
  border-radius: 14px;
  white-space: nowrap;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
}
.result-bar-text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.75rem;
  font-weight: 800;
  margin-right: 4px;
}
.result-bar-text.blue { color: #38bdf8; }
.result-bar-text.red { color: #ef4444; }
.result-bar-text .icon { width: 15px; height: 15px; }
.tm-btn.slim { flex: 0 0 auto; min-height: 34px; padding: 0 14px; font-size: 0.7rem; border-radius: 10px; }

/* Roster */
.roster {
  width: 240px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  background: linear-gradient(180deg, #1e293b, #172033);
  border: 1px solid #334155;
  border-radius: 14px;
  min-height: 0;
  overflow-y: auto;
}
.roster-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #fcd34d;
  padding-bottom: 10px;
  border-bottom: 1px solid #334155;
}
.roster-list { display: flex; flex-direction: column; gap: 10px; }
.roster-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(2, 6, 23, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 12px;
}
.roster-item.blue { box-shadow: inset 3px 0 0 #38bdf8; }
.roster-item.red { box-shadow: inset 3px 0 0 #ef4444; }
.roster-item.me { background: rgba(252, 211, 77, 0.07); border-color: rgba(252, 211, 77, 0.3); }
.roster-item.out { opacity: 0.45; filter: grayscale(0.6); }
.roster-info { display: flex; flex-direction: column; gap: 6px; min-width: 0; flex: 1; }
.roster-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.88rem;
  font-weight: 700;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.me-tag {
  padding: 1px 6px;
  border-radius: 5px;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.56rem;
  font-weight: 800;
  color: #fcd34d;
  border: 1px solid rgba(252, 211, 77, 0.5);
}
.roster-name .offline { width: 13px; height: 13px; color: #f59e0b; flex-shrink: 0; }
.roster-meta { display: flex; align-items: center; gap: 10px; }
.roster-hearts { display: flex; gap: 3px; }
.heart { width: 14px; height: 14px; color: #ef4444; fill: currentColor; }
.heart.lost { color: #475569; fill: none; }
.stat {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #cbd5e1;
}
.stat:first-of-type { margin-left: auto; }
.stat .icon { width: 12px; height: 12px; color: #64748b; }
.roster-hint {
  margin-top: auto;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  padding-top: 10px;
  border-top: 1px solid #334155;
  font-size: 0.68rem;
  color: #64748b;
}
.roster-hint kbd {
  padding: 1px 6px;
  border-radius: 4px;
  background: #0f172a;
  border: 1px solid #334155;
  font-family: 'Fira Code', monospace;
  font-size: 0.64rem;
  color: #cbd5e1;
}

/* Touch controls */
.touch-controls {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px 8px;
}
.dpad {
  display: grid;
  grid-template-columns: repeat(3, 52px);
  grid-template-rows: repeat(2, 52px);
  gap: 4px;
}
.dpad-btn {
  display: grid;
  place-items: center;
  border-radius: 12px;
  border: 1px solid #475569;
  background: #1e293b;
  color: #f1f5f9;
  touch-action: none;
}
.dpad-btn:active { background: #334155; border-color: #38bdf8; }
.dpad-btn .icon { width: 22px; height: 22px; }
.dpad-btn.up { grid-column: 2; grid-row: 1; }
.dpad-btn.left { grid-column: 1; grid-row: 2; }
.dpad-btn.down { grid-column: 2; grid-row: 2; }
.dpad-btn.right { grid-column: 3; grid-row: 2; }
.fire-btn {
  width: 76px;
  height: 76px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 3px solid #b91c1c;
  background: #ef4444;
  color: #fff;
  touch-action: none;
}
.fire-btn:active { background: #dc2626; transform: scale(0.96); }
.fire-btn .icon { width: 32px; height: 32px; }

/* Result modal */
.series-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px;
  background: rgba(2, 6, 23, 0.55);
  border: 1px solid #334155;
  border-radius: 12px;
}
.series-label { font-family: 'Orbitron', sans-serif; font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em; color: #fcd34d; }
.series-score { display: flex; align-items: center; gap: 12px; font-family: 'Orbitron', sans-serif; font-size: 1.6rem; font-weight: 900; }

.stats-table {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: rgba(2, 6, 23, 0.55);
  border: 1px solid #334155;
  border-radius: 12px;
  font-size: 0.82rem;
}
.stats-head, .stats-row {
  display: grid;
  grid-template-columns: 1fr 64px 28px 28px;
  align-items: center;
  gap: 8px;
}
.stats-head { font-size: 0.66rem; color: #64748b; font-family: 'Orbitron', sans-serif; letter-spacing: 0.06em; padding-bottom: 4px; border-bottom: 1px solid #1e293b; }
.stats-head span:not(:first-child), .stats-row span:not(:first-child) { text-align: center; }
.stats-row { padding: 3px 0; font-weight: 600; }
.stats-row.blue .stats-name { color: #7dd3fc; }
.stats-row.red .stats-name { color: #fca5a5; }
.stats-name { display: flex; align-items: center; gap: 8px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stats-hearts { display: flex; justify-content: center; gap: 2px; }
.stats-hearts .heart { width: 11px; height: 11px; }

/* Narrow screens: roster becomes a strip under the board */
@media (max-width: 760px) {
  .hud { grid-template-columns: 1fr auto auto; gap: 8px; padding: 6px 8px; }
  .hud-team.blue, .hud-team.red { display: none; }
  .hud-center { justify-content: flex-start; grid-column: 1; }
  .chip-map { max-width: 120px; }
  .stage { flex-direction: column; }
  .roster { width: 100%; flex-direction: row; align-items: stretch; overflow-x: auto; overflow-y: hidden; padding: 6px; gap: 6px; }
  .roster-title, .roster-hint { display: none; }
  .roster-list { flex-direction: row; gap: 6px; }
  .roster-item { flex: 0 0 auto; padding: 6px 10px; }
}
</style>
