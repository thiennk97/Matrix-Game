import * as THREE from 'three'

// Deterministic fast PRNG (Mulberry32)
function createRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Generates a Tangent-Space Normal Map texture from a grayscale height canvas
 * using a Sobel filter.
 */
function heightCanvasToNormalTexture(
  heightCanvas: HTMLCanvasElement,
  strength = 3.2,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const w = heightCanvas.width
  const h = heightCanvas.height
  const ctx = heightCanvas.getContext('2d')!
  const src = ctx.getImageData(0, 0, w, h).data

  const outCanvas = document.createElement('canvas')
  outCanvas.width = w
  outCanvas.height = h
  const outCtx = outCanvas.getContext('2d')!
  const outImg = outCtx.createImageData(w, h)
  const dst = outImg.data

  const sample = (x: number, y: number) => {
    const wx = ((x % w) + w) % w
    const wy = ((y % h) + h) % h
    return src[(wy * w + wx) * 4]! / 255
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = sample(x - 1, y - 1)
      const t = sample(x, y - 1)
      const tr = sample(x + 1, y - 1)
      const l = sample(x - 1, y)
      const r = sample(x + 1, y)
      const bl = sample(x - 1, y + 1)
      const b = sample(x, y + 1)
      const br = sample(x + 1, y + 1)

      const dX = tr + 2 * r + br - (tl + 2 * l + bl)
      const dY = bl + 2 * b + br - (tl + 2 * t + tr)

      let nx = -dX * strength
      let ny = -dY * strength
      let nz = 1.0
      const invLen = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz)
      nx *= invLen
      ny *= invLen
      nz *= invLen

      const idx = (y * w + x) * 4
      dst[idx] = Math.round((nx * 0.5 + 0.5) * 255)
      dst[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255)
      dst[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255)
      dst[idx + 3] = 255
    }
  }

  outCtx.putImageData(outImg, 0, 0)
  const tex = new THREE.CanvasTexture(outCanvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeatX, repeatY)
  tex.needsUpdate = true
  return tex
}

export interface PbrTextureSet {
  map: THREE.CanvasTexture
  normalMap: THREE.CanvasTexture
  roughnessMap?: THREE.CanvasTexture
}

/**
 * 1. VIBRANT BRICK WALL PBR TEXTURE SET
 * Bright warm terracotta & clay masonry with light sandstone mortar grooves.
 */
export function createBrickTextures(): PbrTextureSet {
  const size = 256
  const diffCanvas = document.createElement('canvas')
  diffCanvas.width = size
  diffCanvas.height = size
  const dCtx = diffCanvas.getContext('2d')!

  const hCanvas = document.createElement('canvas')
  hCanvas.width = size
  hCanvas.height = size
  const hCtx = hCanvas.getContext('2d')!

  const rng = createRng(104729)

  // Bright warm sandstone mortar base so brick joints are clearly visible
  dCtx.fillStyle = '#c8bfb5'
  dCtx.fillRect(0, 0, size, size)
  hCtx.fillStyle = '#282828'
  hCtx.fillRect(0, 0, size, size)

  // Mortar grain
  for (let i = 0; i < 1200; i++) {
    const x = rng() * size
    const y = rng() * size
    const v = Math.floor(175 + rng() * 35)
    dCtx.fillStyle = `rgb(${v},${v - 5},${v - 12})`
    dCtx.fillRect(x, y, 2, 2)
  }

  const rows = 4
  const cols = 2
  const rowH = size / rows
  const colW = size / cols
  const mortar = 6

  // Vibrant terracotta / orange-red clay palettes
  const palettes = [
    [235, 92, 44],
    [222, 76, 38],
    [244, 112, 54],
    [210, 68, 34],
    [238, 102, 52]
  ]

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (colW * 0.5)
    for (let c = -1; c <= cols; c++) {
      const bx = c * colW + offset + mortar * 0.5
      const by = r * rowH + mortar * 0.5
      const bw = colW - mortar
      const bh = rowH - mortar

      const pal = palettes[Math.floor(rng() * palettes.length)]!
      const shade = 0.94 + rng() * 0.14
      const cr = Math.min(255, Math.round(pal[0]! * shade))
      const cg = Math.min(255, Math.round(pal[1]! * shade))
      const cb = Math.min(255, Math.round(pal[2]! * shade))

      // Vibrant brick gradient
      const grad = dCtx.createLinearGradient(bx, by, bx, by + bh)
      grad.addColorStop(0, `rgb(${Math.min(255, cr + 25)}, ${Math.min(255, cg + 25)}, ${Math.min(255, cb + 18)})`)
      grad.addColorStop(0.2, `rgb(${cr}, ${cg}, ${cb})`)
      grad.addColorStop(0.85, `rgb(${Math.max(0, cr - 12)}, ${Math.max(0, cg - 10)}, ${Math.max(0, cb - 6)})`)
      grad.addColorStop(1, `rgb(${Math.max(0, cr - 28)}, ${Math.max(0, cg - 18)}, ${Math.max(0, cb - 12)})`)

      dCtx.fillStyle = grad
      dCtx.beginPath()
      dCtx.roundRect(bx, by, bw, bh, 4)
      dCtx.fill()

      // Warm sunlit top highlight bevel
      dCtx.strokeStyle = 'rgba(255, 235, 200, 0.45)'
      dCtx.lineWidth = 2
      dCtx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2)

      // Height map brick plateau
      const hVal = Math.floor(210 + rng() * 40)
      hCtx.fillStyle = `rgb(${hVal},${hVal},${hVal})`
      hCtx.beginPath()
      hCtx.roundRect(bx + 1, by + 1, bw - 2, bh - 2, 4)
      hCtx.fill()

      // Subtle clay texture specks
      for (let p = 0; p < 55; p++) {
        const px = bx + 3 + rng() * (bw - 6)
        const py = by + 3 + rng() * (bh - 6)
        const pr = 1 + rng() * 2.5
        const dark = rng() > 0.45
        dCtx.fillStyle = dark ? 'rgba(120, 35, 12, 0.22)' : 'rgba(255, 220, 180, 0.25)'
        dCtx.beginPath()
        dCtx.arc(px, py, pr, 0, Math.PI * 2)
        dCtx.fill()
      }
    }
  }

  const map = new THREE.CanvasTexture(diffCanvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = THREE.RepeatWrapping
  map.wrapT = THREE.RepeatWrapping
  map.needsUpdate = true

  const normalMap = heightCanvasToNormalTexture(hCanvas, 3.5)

  return { map, normalMap }
}

/**
 * 2. BRIGHT PLATINUM STEEL ARMOR PBR TEXTURE SET
 * Gleaming brushed silver-steel plate with beveled frame, X-ribs, and chrome corner bolts.
 */
export function createSteelTextures(): PbrTextureSet {
  const size = 256
  const diffCanvas = document.createElement('canvas')
  diffCanvas.width = size
  diffCanvas.height = size
  const dCtx = diffCanvas.getContext('2d')!

  const hCanvas = document.createElement('canvas')
  hCanvas.width = size
  hCanvas.height = size
  const hCtx = hCanvas.getContext('2d')!

  const rng = createRng(99371)

  // Bright silver-platinum metallic gradient
  const baseGrad = dCtx.createLinearGradient(0, 0, size, size)
  baseGrad.addColorStop(0, '#e2e8f0')
  baseGrad.addColorStop(0.5, '#f8fafc')
  baseGrad.addColorStop(1, '#cbd5e1')
  dCtx.fillStyle = baseGrad
  dCtx.fillRect(0, 0, size, size)

  hCtx.fillStyle = '#b8b8b8'
  hCtx.fillRect(0, 0, size, size)

  // Fine brushed sheen lines
  for (let y = 0; y < size; y++) {
    const alpha = (rng() - 0.5) * 0.08
    dCtx.fillStyle = alpha > 0 ? `rgba(255,255,255,${alpha})` : `rgba(71,85,105,${-alpha})`
    dCtx.fillRect(0, y, size, 1)
  }

  // Outer frame bevel
  const pad = 16
  dCtx.strokeStyle = '#64748b'
  dCtx.lineWidth = 6
  dCtx.strokeRect(4, 4, size - 8, size - 8)

  dCtx.fillStyle = '#dbe4ef'
  dCtx.fillRect(pad, pad, size - pad * 2, size - pad * 2)

  hCtx.fillStyle = '#e8e8e8'
  hCtx.fillRect(8, 8, size - 16, size - 16)
  hCtx.fillStyle = '#a0a0a0'
  hCtx.fillRect(pad, pad, size - pad * 2, size - pad * 2)

  // Raised diagonal X-reinforcement ribs
  dCtx.strokeStyle = '#f1f5f9'
  dCtx.lineWidth = 14
  dCtx.beginPath()
  dCtx.moveTo(pad + 18, pad + 18)
  dCtx.lineTo(size - pad - 18, size - pad - 18)
  dCtx.moveTo(size - pad - 18, pad + 18)
  dCtx.lineTo(pad + 18, size - pad - 18)
  dCtx.stroke()

  hCtx.strokeStyle = '#ffffff'
  hCtx.lineWidth = 14
  hCtx.beginPath()
  hCtx.moveTo(pad + 18, pad + 18)
  hCtx.lineTo(size - pad - 18, size - pad - 18)
  hCtx.moveTo(size - pad - 18, pad + 18)
  hCtx.lineTo(pad + 18, size - pad - 18)
  hCtx.stroke()

  // Center octagonal hub
  dCtx.fillStyle = '#94a3b8'
  dCtx.beginPath()
  dCtx.arc(size / 2, size / 2, 26, 0, Math.PI * 2)
  dCtx.fill()
  dCtx.strokeStyle = '#ffffff'
  dCtx.lineWidth = 3
  dCtx.stroke()

  hCtx.fillStyle = '#ffffff'
  hCtx.beginPath()
  hCtx.arc(size / 2, size / 2, 26, 0, Math.PI * 2)
  hCtx.fill()

  // 4 Chrome corner rivets
  const boltCoords = [
    [32, 32],
    [size - 32, 32],
    [32, size - 32],
    [size - 32, size - 32]
  ]
  for (const [bx, by] of boltCoords) {
    dCtx.fillStyle = '#64748b'
    dCtx.beginPath()
    dCtx.arc(bx!, by!, 11, 0, Math.PI * 2)
    dCtx.fill()

    dCtx.fillStyle = '#ffffff'
    dCtx.beginPath()
    dCtx.arc(bx! - 1.5, by! - 1.5, 8, 0, Math.PI * 2)
    dCtx.fill()

    hCtx.fillStyle = '#ffffff'
    hCtx.beginPath()
    hCtx.arc(bx!, by!, 10, 0, Math.PI * 2)
    hCtx.fill()
  }

  const map = new THREE.CanvasTexture(diffCanvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.needsUpdate = true

  const normalMap = heightCanvasToNormalTexture(hCanvas, 3.8)

  return { map, normalMap }
}

/**
 * 3. BRIGHT TACTICAL ARENA STONE FLOOR TEXTURE SET
 * Clean medium-light slate stone tiles with clear tactical grid markings and stone grain.
 */
export function createGroundTextures(): PbrTextureSet {
  const size = 512
  const diffCanvas = document.createElement('canvas')
  diffCanvas.width = size
  diffCanvas.height = size
  const dCtx = diffCanvas.getContext('2d')!

  const hCanvas = document.createElement('canvas')
  hCanvas.width = size
  hCanvas.height = size
  const hCtx = hCanvas.getContext('2d')!

  const rCanvas = document.createElement('canvas')
  rCanvas.width = size
  rCanvas.height = size
  const rCtx = rCanvas.getContext('2d')!

  const rng = createRng(55109)

  // Rich deep slate-navy arena stone floor (high contrast so tanks, walls and trees stand out crisply)
  dCtx.fillStyle = '#18202c'
  dCtx.fillRect(0, 0, size, size)

  hCtx.fillStyle = '#808080'
  hCtx.fillRect(0, 0, size, size)

  rCtx.fillStyle = '#c8c8c8'
  rCtx.fillRect(0, 0, size, size)

  // Subtle checkerboard stone tile variation (4x4 tiles per 512x512 block)
  const step = size / 4
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const isAlt = (r + c) % 2 === 0
      dCtx.fillStyle = isAlt ? '#202a3a' : '#161d28'
      dCtx.fillRect(c * step + 2, r * step + 2, step - 4, step - 4)
    }
  }

  // Stone aggregate grain
  for (let i = 0; i < 6000; i++) {
    const x = rng() * size
    const y = rng() * size
    const sz = 1 + rng() * 2.2
    const bright = rng() > 0.45
    const v = bright ? 55 + Math.floor(rng() * 28) : 25 + Math.floor(rng() * 16)
    dCtx.fillStyle = `rgb(${v}, ${v + 8}, ${v + 18})`
    dCtx.fillRect(x, y, sz, sz)

    const hv = bright ? 150 + Math.floor(rng() * 50) : 90 + Math.floor(rng() * 30)
    hCtx.fillStyle = `rgb(${hv}, ${hv}, ${hv})`
    hCtx.fillRect(x, y, sz, sz)
  }

  // Tile seam grooves
  dCtx.strokeStyle = 'rgba(148, 163, 184, 0.22)'
  dCtx.lineWidth = 2
  hCtx.strokeStyle = '#404040'
  hCtx.lineWidth = 3

  for (let i = 0; i <= 4; i++) {
    const pos = i * step
    dCtx.beginPath()
    dCtx.moveTo(pos, 0)
    dCtx.lineTo(pos, size)
    dCtx.stroke()
    dCtx.beginPath()
    dCtx.moveTo(0, pos)
    dCtx.lineTo(size, pos)
    dCtx.stroke()

    hCtx.beginPath()
    hCtx.moveTo(pos, 0)
    hCtx.lineTo(pos, size)
    hCtx.stroke()
    hCtx.beginPath()
    hCtx.moveTo(0, pos)
    hCtx.lineTo(size, pos)
    hCtx.stroke()
  }

  const repeat = 6.5
  const map = new THREE.CanvasTexture(diffCanvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = THREE.RepeatWrapping
  map.wrapT = THREE.RepeatWrapping
  map.repeat.set(repeat, repeat)
  map.needsUpdate = true

  const normalMap = heightCanvasToNormalTexture(hCanvas, 2.0, repeat, repeat)

  const roughnessMap = new THREE.CanvasTexture(rCanvas)
  roughnessMap.wrapS = THREE.RepeatWrapping
  roughnessMap.wrapT = THREE.RepeatWrapping
  roughnessMap.repeat.set(repeat, repeat)
  roughnessMap.needsUpdate = true

  return { map, normalMap, roughnessMap }
}

/**
 * 4. WATER NORMAL & CAUSTIC TEXTURE
 */
export function createWaterNormalTexture(): THREE.CanvasTexture {
  const size = 256
  const hCanvas = document.createElement('canvas')
  hCanvas.width = size
  hCanvas.height = size
  const hCtx = hCanvas.getContext('2d')!
  const img = hCtx.createImageData(size, size)
  const data = img.data

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2
      const v = (y / size) * Math.PI * 2
      const w1 = Math.sin(u * 3 + v * 2) * 0.35
      const w2 = Math.cos(u * 5 - v * 4) * 0.25
      const w3 = Math.sin(u * 8 + v * 7) * 0.15
      const w4 = Math.cos(u * 2 - v * 6) * 0.25
      const val = Math.floor(((w1 + w2 + w3 + w4) * 0.5 + 0.5) * 255)
      const idx = (y * size + x) * 4
      data[idx] = val
      data[idx + 1] = val
      data[idx + 2] = val
      data[idx + 3] = 255
    }
  }
  hCtx.putImageData(img, 0, 0)
  return heightCanvasToNormalTexture(hCanvas, 3.0, 1, 1)
}

/**
 * 5. CATERPILLAR TRACK TEXTURE (animated UV scrolling)
 */
export function createTrackTexture(): THREE.CanvasTexture {
  const w = 128
  const h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#1e293b'
  ctx.fillRect(0, 0, w, h)

  const treads = 8
  const th = h / treads
  for (let i = 0; i < treads; i++) {
    const y = i * th
    // Metallic tread link plate
    ctx.fillStyle = '#475569'
    ctx.fillRect(6, y + 3, w - 12, th - 6)

    // Raised bright cleat bar
    ctx.fillStyle = '#94a3b8'
    ctx.fillRect(10, y + 6, w - 20, th * 0.42)

    // Pin joints on edges
    ctx.fillStyle = '#cbd5e1'
    ctx.fillRect(2, y + 5, 6, th - 10)
    ctx.fillRect(w - 8, y + 5, 6, th - 10)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  return tex
}

/**
 * 6. LUSH VIBRANT EMERALD-LIME GRASS / FOLIAGE TEXTURE
 */
export function createGrassTexture(): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const rng = createRng(73129)

  // Vibrant emerald base (NOT dark!)
  ctx.fillStyle = '#22c55e'
  ctx.fillRect(0, 0, size, size)

  // Lush sunlit leaf clusters
  for (let i = 0; i < 65; i++) {
    const x = rng() * size
    const y = rng() * size
    const r = 10 + rng() * 24
    const grad = ctx.createRadialGradient(x, y, 2, x, y, r)
    grad.addColorStop(0, rng() > 0.4 ? 'rgba(74, 222, 128, 0.85)' : 'rgba(22, 163, 74, 0.75)')
    grad.addColorStop(1, 'rgba(34, 197, 94, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
  }

  // Bright lime & yellow-green leaf blades
  for (let i = 0; i < 1600; i++) {
    const x = rng() * size
    const y = rng() * size
    const g = 180 + Math.floor(rng() * 70)
    const r = 45 + Math.floor(rng() * 75)
    const b = 50 + Math.floor(rng() * 45)
    ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + (rng() - 0.5) * 6, y - 4 - rng() * 6)
    ctx.stroke()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  return tex
}

/**
 * 7. HAZARD STRIPE CURB TEXTURE
 */
export function createHazardTexture(): THREE.CanvasTexture {
  const w = 256
  const h = 64
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#1e293b'
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = '#fbbf24'
  const step = 32
  for (let x = -h; x < w + h; x += step) {
    ctx.beginPath()
    ctx.moveTo(x, h)
    ctx.lineTo(x + step * 0.5, h)
    ctx.lineTo(x + step * 0.5 + h, 0)
    ctx.lineTo(x + h, 0)
    ctx.closePath()
    ctx.fill()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(14, 1)
  tex.needsUpdate = true
  return tex
}
