import { TILE_FORT_BLUE, TILE_SIZE, TANK_SIZE, WORLD_SIZE } from '~/utils/tank/tankMaps'
import type { Team } from '~/types/tank'

// Canvas drawing helpers for the Battle City arena. Pure functions: no game state lives here.

export interface RenderTank {
  x: number
  y: number
  dir: number
  team: Team
  name: string
  shield: boolean
}

export interface RenderBullet {
  x: number
  y: number
  dir: number
  team: Team
}

export interface FireballPuff {
  dx: number
  dy: number
  radius: number
  maxRadius: number
  color: string
}

export interface TankExplosion {
  x: number
  y: number
  life: number
  maxLife: number
  shockwaveRadius: number
  maxShockwaveRadius: number
  puffs: FireballPuff[]
}

const BULLET_TRAVEL: Record<number, [number, number]> = { 0: [0, -1], 1: [1, 0], 2: [0, 1], 3: [-1, 0] }

export function drawBullet(c: CanvasRenderingContext2D, b: RenderBullet) {
  const isBlue = b.team === 'blue'
  const glowColor = isBlue ? '#38bdf8' : '#ef4444'
  const tailColor = isBlue ? 'rgba(56, 189, 248, 0.4)' : 'rgba(239, 68, 68, 0.4)'
  const [dx, dy] = BULLET_TRAVEL[b.dir] ?? [0, 0]

  c.fillStyle = tailColor
  c.beginPath()
  c.arc(b.x + 3 - dx * 3.4, b.y + 3 - dy * 3.4, 2.4, 0, Math.PI * 2)
  c.fill()

  c.fillStyle = glowColor
  c.beginPath()
  c.arc(b.x + 3, b.y + 3, 3.8, 0, Math.PI * 2)
  c.fill()

  c.fillStyle = '#ffffff'
  c.beginPath()
  c.arc(b.x + 3, b.y + 3, 2, 0, Math.PI * 2)
  c.fill()
}

export function drawExplosions(c: CanvasRenderingContext2D, explosions: TankExplosion[]) {
  for (const ex of explosions) {
    const progress = ex.life / ex.maxLife
    const alpha = Math.max(0, 1 - progress)

    c.save()
    c.beginPath()
    c.arc(ex.x, ex.y, ex.shockwaveRadius, 0, Math.PI * 2)
    c.strokeStyle = `rgba(254, 240, 138, ${alpha * 0.85})`
    c.lineWidth = Math.max(1, 3.5 * (1 - progress))
    c.stroke()
    c.restore()

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

export function drawFortressWall(c: CanvasRenderingContext2D, x: number, y: number, type: number, hp: number) {
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
export function drawBrick(c: CanvasRenderingContext2D, x: number, y: number) {
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
export function drawSteel(c: CanvasRenderingContext2D, x: number, y: number) {
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
export function drawWater(c: CanvasRenderingContext2D, x: number, y: number) {
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
export function drawTrees(c: CanvasRenderingContext2D, x: number, y: number) {
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

function drawRuins(c: CanvasRenderingContext2D, bx: number, by: number, bw: number, bh: number) {
  c.fillStyle = '#1e293b'
  c.fillRect(bx, by, bw, bh)
  c.fillStyle = '#0f172a'
  c.fillRect(bx + 2, by + 2, bw - 4, bh - 4)
  c.strokeStyle = '#64748b'
  c.lineWidth = 2.4
  c.lineCap = 'round'
  c.beginPath()
  c.moveTo(bx + 9, by + 9)
  c.lineTo(bx + bw - 9, by + bh - 9)
  c.moveTo(bx + bw - 9, by + 9)
  c.lineTo(bx + 9, by + bh - 9)
  c.stroke()
  c.lineCap = 'butt'
}

export function drawEagle(c: CanvasRenderingContext2D, team: Team, alive: boolean) {
  const isBlue = team === 'blue'
  const bx = 12 * TILE_SIZE
  const by = isBlue ? 24 * TILE_SIZE : 0
  const bw = 2 * TILE_SIZE
  const bh = 2 * TILE_SIZE

  if (!alive) {
    drawRuins(c, bx, by, bw, bh)
    return
  }

  const stroke = isBlue ? '#38bdf8' : '#ef4444'
  const body = isBlue ? '#0284c7' : '#b91c1c'
  const core = isBlue ? '#38bdf8' : '#ef4444'

  c.fillStyle = '#0f172a'
  c.fillRect(bx, by, bw, bh)
  c.strokeStyle = stroke
  c.lineWidth = 1.5
  c.strokeRect(bx + 1, by + 1, bw - 2, bh - 2)

  c.fillStyle = body
  c.beginPath()
  if (isBlue) {
    c.moveTo(bx + 16, by + 4)
    c.lineTo(bx + 4, by + 14)
    c.lineTo(bx + 8, by + 28)
    c.lineTo(bx + 16, by + 22)
    c.lineTo(bx + 24, by + 28)
    c.lineTo(bx + 28, by + 14)
  } else {
    c.moveTo(bx + 16, by + 28)
    c.lineTo(bx + 4, by + 18)
    c.lineTo(bx + 8, by + 4)
    c.lineTo(bx + 16, by + 10)
    c.lineTo(bx + 24, by + 4)
    c.lineTo(bx + 28, by + 18)
  }
  c.closePath()
  c.fill()

  const coreY = isBlue ? by + 14 : by + 18
  c.fillStyle = core
  c.beginPath()
  c.arc(bx + 16, coreY, 5, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = '#ffffff'
  c.beginPath()
  c.arc(bx + 16, coreY, 2.5, 0, Math.PI * 2)
  c.fill()

  const blink = Date.now() % 600 < 300
  c.fillStyle = isBlue ? (blink ? '#38bdf8' : '#67e8f9') : blink ? '#ef4444' : '#fca5a5'
  c.fillRect(bx + 14, isBlue ? by + 2 : by + 27, 4, 3)
}

function drawStar(c: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  c.beginPath()
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const px = cx + Math.cos(a) * rad
    const py = cy + Math.sin(a) * rad
    if (i === 0) c.moveTo(px, py)
    else c.lineTo(px, py)
  }
  c.closePath()
  c.fill()
}

export function drawPvPTank(c: CanvasRenderingContext2D, tank: RenderTank, isLocal = false) {
  c.save()
  c.translate(tank.x + TANK_SIZE / 2, tank.y + TANK_SIZE / 2)

  c.fillStyle = 'rgba(0, 0, 0, 0.4)'
  c.fillRect(-12, -11, 26, 26)

  c.rotate((tank.dir * 90 * Math.PI) / 180)

  const isBlue = tank.team === 'blue'
  const primaryColor = isBlue ? '#0284c7' : '#dc2626'
  const highlightColor = isBlue ? '#38bdf8' : '#f87171'
  const darkColor = isBlue ? '#0369a1' : '#991b1b'

  c.fillStyle = '#1e293b'
  c.fillRect(-13, -13, 6, 26)
  c.fillRect(7, -13, 6, 26)

  c.fillStyle = '#475569'
  ;[-8, 0, 8].forEach((offsetY) => {
    c.beginPath(); c.arc(-10, offsetY, 2, 0, Math.PI * 2); c.fill()
    c.beginPath(); c.arc(10, offsetY, 2, 0, Math.PI * 2); c.fill()
  })

  c.fillStyle = darkColor
  c.fillRect(-7, -11, 14, 22)
  c.fillStyle = primaryColor
  c.fillRect(-6, -10, 12, 20)
  c.fillStyle = highlightColor
  c.fillRect(-5, -10, 10, 3)
  c.fillStyle = '#0f172a'
  c.fillRect(-4, 5, 8, 4)

  c.fillStyle = primaryColor
  c.fillRect(-2.5, -17, 5, 11)
  c.fillStyle = highlightColor
  c.fillRect(-3.5, -17, 7, 2.5)
  c.fillStyle = darkColor
  c.fillRect(-4, -8, 8, 3)

  c.fillStyle = primaryColor
  c.beginPath(); c.arc(0, -1, 6.5, 0, Math.PI * 2); c.fill()
  c.fillStyle = highlightColor
  c.beginPath(); c.arc(-1, -2, 4, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#0f172a'
  c.beginPath(); c.arc(1.5, 0.5, 2, 0, Math.PI * 2); c.fill()

  if (tank.shield) {
    const pulseAlpha = 0.5 + Math.sin(Date.now() / 80) * 0.3
    c.strokeStyle = `rgba(56, 189, 248, ${pulseAlpha})`
    c.lineWidth = 2.5
    c.beginPath(); c.arc(0, 0, 18, 0, Math.PI * 2); c.stroke()
    c.strokeStyle = `rgba(254, 240, 138, ${pulseAlpha * 0.8})`
    c.lineWidth = 1.2
    c.beginPath(); c.arc(0, 0, 20, 0, Math.PI * 2); c.stroke()
  }

  c.restore()

  // Name tag: treat the tank as a square. Blue defends the south base, so its tag sits on the
  // bottom edge; Red defends the north base, so its tag sits on the top edge. Never rotates.
  c.save()
  c.font = 'bold 7.5px sans-serif'
  c.textAlign = 'left'
  c.textBaseline = 'alphabetic'

  const label = tank.name || 'Player'
  const starW = isLocal ? 6 : 0
  const starGap = isLocal ? 2 : 0
  const textW = c.measureText(label).width
  const contentW = starW + starGap + textW
  const tagWidth = Math.max(24, contentW + 8)
  const tagH = 10
  const gap = 2
  const cx = tank.x + TANK_SIZE / 2
  const edgeY = isBlue ? tank.y + TANK_SIZE + gap + tagH / 2 : tank.y - gap - tagH / 2
  const tagCx = Math.min(Math.max(cx, tagWidth / 2 + 1), WORLD_SIZE - tagWidth / 2 - 1)
  const tagCy = Math.min(Math.max(edgeY, tagH / 2 + 1), WORLD_SIZE - tagH / 2 - 1)

  c.translate(tagCx, tagCy)
  c.fillStyle = 'rgba(15, 23, 42, 0.85)'
  c.fillRect(-tagWidth / 2, -tagH / 2, tagWidth, tagH)
  c.strokeStyle = isLocal ? '#fcd34d' : isBlue ? '#38bdf8' : '#ef4444'
  c.lineWidth = 1
  c.strokeRect(-tagWidth / 2, -tagH / 2, tagWidth, tagH)
  c.fillStyle = isLocal ? '#fcd34d' : '#f8fafc'
  const startX = -contentW / 2
  if (isLocal) drawStar(c, startX + starW / 2, -0.2, 3)
  c.fillText(label, startX + starW + starGap, 2.8)
  c.restore()
}
