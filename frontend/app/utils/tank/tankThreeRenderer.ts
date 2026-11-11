import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

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
} from './tankMaps'
import type { Team } from '~/types/tank'
import {
  createBrickTextures,
  createSteelTextures,
  createGroundTextures,
  createWaterNormalTexture,
  createTrackTexture,
  createGrassTexture,
  createHazardTexture
} from './tankTextures'

export interface RenderTank3D {
  id: string
  x: number
  y: number
  dir: number
  team: Team
  name: string
  shield: boolean
  alive?: boolean
}

export interface RenderBullet3D {
  x: number
  y: number
  dir: number
  team: Team
  m?: boolean
}

export interface RenderDrop3D {
  id: number
  x: number
  y: number
  type: string
}

export interface RenderExplosion3D {
  x: number
  y: number
  life: number
  maxLife: number
  shockwaveRadius: number
  maxShockwaveRadius: number
}

export type ImpactKind = 'brick' | 'steel' | 'shield' | 'clash' | 'fort' | 'big' | 'bullet' | 'missile_explosion' | 'pickup'

interface TankMeshEntry {
  group: THREE.Group
  hull: THREE.Mesh
  turret: THREE.Group
  barrel: THREE.Group
  leftTrackMat: THREE.MeshStandardMaterial
  rightTrackMat: THREE.MeshStandardMaterial
  trackTex: THREE.CanvasTexture
  muzzleFlash: THREE.Mesh
  shield: THREE.Mesh
  shieldMat: THREE.MeshStandardMaterial
  headlightL: THREE.Mesh
  headlightR: THREE.Mesh
  nameSprite: THREE.Sprite
  missilePod: THREE.Group
  prevMissiles: number
  tankName: string
  isMe: boolean
  team: Team
  currentRotY: number
  recoil: number
  prevX: number
  prevY: number
}

const HALF_WORLD = WORLD_SIZE / 2
const CAM_BASE_Y = 460
const CAM_BASE_Z = 260
const CAM_LOOK_Z = 8
const BASE_FOV = 44

// Map 2D direction (0: Up/-Y, 1: Right/+X, 2: Down/+Y, 3: Left/-X) to 3D Y-rotation
function dirToAngle(dir: number): number {
  switch (dir) {
    case 0: return 0 // Facing -Z (North)
    case 1: return -Math.PI / 2 // Facing +X (East)
    case 2: return Math.PI // Facing +Z (South)
    case 3: return Math.PI / 2 // Facing -X (West)
    default: return 0
  }
}

export class TankThreeRenderer {
  private canvas: HTMLCanvasElement
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private mapGroup: THREE.Group
  private eagleGroup: THREE.Group
  private tanksGroup: THREE.Group
  private bulletsGroup: THREE.Group
  private dropsGroup: THREE.Group
  private fxGroup: THREE.Group

  private tankMeshes: Map<string, TankMeshEntry> = new Map()
  private dropMeshes: Map<number, THREE.Group> = new Map()
  private bulletMeshes: THREE.Group[] = []
  private bulletLight?: THREE.PointLight
  private impactLight?: THREE.PointLight
  private impactLightLife = 0

  private explosionPuffs: {
    mesh: THREE.Mesh
    vx: number
    vy: number
    vz: number
    life: number
    maxLife: number
    hasGravity: boolean
    shrinkRate: number
  }[] = []
  private shockwaves: { mesh: THREE.Mesh; life: number; maxLife: number; maxScale: number }[] = []
  private fireballs: { mesh: THREE.Mesh; life: number; maxLife: number; maxScale: number }[] = []
  private spawnedExplosions = new WeakSet<object>()
  private prevBullets: { x: number; y: number; dir: number; team: Team }[] = []
  private recentImpacts: { x: number; y: number; time: number }[] = []

  // Shared Procedural Textures
  private waterNormalTex: THREE.CanvasTexture
  private sharedTrackTex: THREE.CanvasTexture

  // Shared Geometries & Materials
  private geoBoxTile: THREE.BufferGeometry
  private geoBrickPart: THREE.BufferGeometry
  private geoWater: THREE.PlaneGeometry
  private geoTreePad: THREE.CylinderGeometry
  private geoTreeCanopy: THREE.IcosahedronGeometry
  private geoTreeTop: THREE.IcosahedronGeometry
  private geoTreeSide: THREE.IcosahedronGeometry
  private geoFbBig: THREE.SphereGeometry
  private geoFbSmall: THREE.SphereGeometry
  private geoShellBig: THREE.SphereGeometry
  private geoShellSmall: THREE.SphereGeometry
  private geoRingBig: THREE.RingGeometry
  private geoRingSmall: THREE.RingGeometry
  private geoSparkBox: THREE.BoxGeometry
  private geoSparkDodec: THREE.DodecahedronGeometry
  private geoSmoke: THREE.IcosahedronGeometry

  private matGround: THREE.MeshStandardMaterial
  private matBrick: THREE.MeshStandardMaterial
  private matSteel: THREE.MeshStandardMaterial
  private matWater: THREE.MeshStandardMaterial
  private matTrees: THREE.MeshStandardMaterial
  private matTreesHighlight: THREE.MeshStandardMaterial
  private matFortBlue: THREE.MeshStandardMaterial
  private matFortRed: THREE.MeshStandardMaterial
  private matEagleBlue: THREE.MeshStandardMaterial
  private matEagleRed: THREE.MeshStandardMaterial
  private matEagleBroken: THREE.MeshStandardMaterial

  private tileMeshes = new Map<string, THREE.Object3D>()
  private lastEagleBlue: boolean | null = null
  private lastEagleRed: boolean | null = null
  private lastMapHash = ''
  private isDisposed = false
  private animClock = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas

    // 1. Renderer with bright ACES tone mapping & soft shadows
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    })
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = canvas.clientWidth || WORLD_SIZE
    const height = canvas.clientHeight || WORLD_SIZE
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(width, height, false)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.NeutralToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    // 2. Scene: Deep dark crisp void with NO fog (removes the hazy washed-out milky film)
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a0f18)

    // 3. Camera: Elevated Isometric Tactical Angle (Framed to show 100% of the arena + margins)
    const aspect = width / height
    const fov = aspect < 1.0
      ? 2 * Math.atan(Math.tan((BASE_FOV * Math.PI) / 360) / aspect) * (180 / Math.PI)
      : BASE_FOV
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 10, 2000)
    this.camera.position.set(0, CAM_BASE_Y, CAM_BASE_Z)
    this.camera.lookAt(0, 0, CAM_LOOK_Z)

    // 4. Vibrant Daylight Lighting
    this.setupLighting()

    // 5. Initialize Bright PBR Textures & Materials (Clean PBR with no milky self-glow)
    const groundPbr = createGroundTextures()
    this.matGround = new THREE.MeshStandardMaterial({
      map: groundPbr.map,
      normalMap: groundPbr.normalMap,
      roughnessMap: groundPbr.roughnessMap,
      color: 0xffffff,
      roughness: 0.65,
      metalness: 0.12
    })

    const brickPbr = createBrickTextures()
    this.matBrick = new THREE.MeshStandardMaterial({
      map: brickPbr.map,
      normalMap: brickPbr.normalMap,
      color: 0xffffff,
      roughness: 0.58,
      metalness: 0.04
    })

    const steelPbr = createSteelTextures()
    this.matSteel = new THREE.MeshStandardMaterial({
      map: steelPbr.map,
      normalMap: steelPbr.normalMap,
      color: 0xffffff,
      roughness: 0.22,
      metalness: 0.78
    })

    this.waterNormalTex = createWaterNormalTexture()
    this.matWater = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      normalMap: this.waterNormalTex,
      roughness: 0.08,
      metalness: 0.2,
      emissive: 0x0369a1,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.88
    })

    const grassTex = createGrassTexture()
    this.matTrees = new THREE.MeshStandardMaterial({
      map: grassTex,
      color: 0xffffff,
      roughness: 0.52,
      metalness: 0.0
    })

    this.matTreesHighlight = new THREE.MeshStandardMaterial({
      map: grassTex,
      color: 0xdcfce7,
      roughness: 0.48,
      metalness: 0.0
    })

    this.sharedTrackTex = createTrackTexture()

    this.matFortBlue = new THREE.MeshStandardMaterial({
      map: steelPbr.map,
      normalMap: steelPbr.normalMap,
      color: 0x60a5fa,
      roughness: 0.28,
      metalness: 0.5,
      emissive: 0x2563eb,
      emissiveIntensity: 0.45
    })

    this.matFortRed = new THREE.MeshStandardMaterial({
      map: steelPbr.map,
      normalMap: steelPbr.normalMap,
      color: 0xf87171,
      roughness: 0.28,
      metalness: 0.5,
      emissive: 0xdc2626,
      emissiveIntensity: 0.45
    })

    this.matEagleBlue = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      roughness: 0.15,
      metalness: 0.7,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.95
    })

    this.matEagleRed = new THREE.MeshStandardMaterial({
      color: 0xfca5a5,
      roughness: 0.15,
      metalness: 0.7,
      emissive: 0xef4444,
      emissiveIntensity: 0.95
    })

    this.matEagleBroken = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.85,
      metalness: 0.15
    })

    // 6. Ground Plate & Border Curbs
    this.setupGround()

    // 7. Shared Geometries (Reused across frames to eliminate GC pauses & memory leaks)
    this.geoBoxTile = new RoundedBoxGeometry(TILE_SIZE - 0.2, 12, TILE_SIZE - 0.2, 2, 0.8)
    this.geoBrickPart = new RoundedBoxGeometry(TILE_SIZE - 0.3, 11, TILE_SIZE - 0.3, 2, 0.6)
    this.geoWater = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE)
    this.geoTreePad = new THREE.CylinderGeometry(7.2, 7.6, 1.2, 10)
    this.geoTreeCanopy = new THREE.IcosahedronGeometry(6.8, 1)
    this.geoTreeTop = new THREE.IcosahedronGeometry(5.0, 1)
    this.geoTreeSide = new THREE.IcosahedronGeometry(4.4, 1)
    this.geoFbBig = new THREE.SphereGeometry(4.5, 10, 10)
    this.geoFbSmall = new THREE.SphereGeometry(2.6, 8, 8)
    this.geoShellBig = new THREE.SphereGeometry(6.0, 10, 10)
    this.geoShellSmall = new THREE.SphereGeometry(3.4, 8, 8)
    this.geoRingBig = new THREE.RingGeometry(1.5, 4.8, 16)
    this.geoRingBig.rotateX(-Math.PI / 2)
    this.geoRingSmall = new THREE.RingGeometry(1.5, 3.2, 16)
    this.geoRingSmall.rotateX(-Math.PI / 2)
    this.geoSparkBox = new THREE.BoxGeometry(2.0, 1.6, 2.0)
    this.geoSparkDodec = new THREE.DodecahedronGeometry(1.5)
    this.geoSmoke = new THREE.IcosahedronGeometry(2.4, 1)

    // 8. Groups
    this.mapGroup = new THREE.Group()
    this.eagleGroup = new THREE.Group()
    this.tanksGroup = new THREE.Group()
    this.bulletsGroup = new THREE.Group()
    this.dropsGroup = new THREE.Group()
    this.fxGroup = new THREE.Group()

    this.scene.add(this.mapGroup)
    this.scene.add(this.eagleGroup)
    this.scene.add(this.tanksGroup)
    this.scene.add(this.bulletsGroup)
    this.scene.add(this.dropsGroup)
    this.scene.add(this.fxGroup)

    // Dynamic Lights for bullets & explosions (decay=0 so they brightly illuminate nearby walls)
    this.bulletLight = new THREE.PointLight(0xfef08a, 0, 65, 0)
    this.scene.add(this.bulletLight)

    this.impactLight = new THREE.PointLight(0xffedd5, 0, 110, 0)
    this.scene.add(this.impactLight)
  }

  private setupLighting() {
    // Balanced ambient light: bright enough to see all detail, sharp enough for deep contrast
    const ambient = new THREE.AmbientLight(0xffffff, 0.55)
    this.scene.add(ambient)

    // Soft sky hemisphere light for rich color tones
    const hemi = new THREE.HemisphereLight(0xbae6fd, 0x0f172a, 0.42)
    this.scene.add(hemi)

    // Main Crisp Sun Directional Light (1024 shadow map is 4x lighter on GPU with virtually identical quality)
    const sun = new THREE.DirectionalLight(0xffffff, 1.85)
    sun.position.set(160, 340, 190)
    sun.castShadow = true
    sun.shadow.mapSize.width = 1024
    sun.shadow.mapSize.height = 1024
    sun.shadow.camera.near = 50
    sun.shadow.camera.far = 750
    const d = WORLD_SIZE * 0.75
    sun.shadow.camera.left = -d
    sun.shadow.camera.right = d
    sun.shadow.camera.top = d
    sun.shadow.camera.bottom = -d
    sun.shadow.bias = -0.0002
    this.scene.add(sun)

    // Crisp secondary rim light
    const rim = new THREE.DirectionalLight(0x93c5fd, 0.55)
    rim.position.set(-160, 180, -180)
    this.scene.add(rim)
  }

  private setupGround() {
    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE)
    const ground = new THREE.Mesh(groundGeo, this.matGround)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    // Border curbs with bright yellow/slate hazard stripes
    const hazardTex = createHazardTexture()
    const curbMat = new THREE.MeshStandardMaterial({
      map: hazardTex,
      roughness: 0.45,
      metalness: 0.25,
      emissive: 0x334155,
      emissiveIntensity: 0.15
    })

    const borderThickness = 12
    const borderHeight = 8

    const bTop = new THREE.Mesh(new THREE.BoxGeometry(WORLD_SIZE + borderThickness * 2, borderHeight, borderThickness), curbMat)
    bTop.position.set(0, borderHeight / 2, -HALF_WORLD - borderThickness / 2)
    bTop.castShadow = true
    bTop.receiveShadow = true
    this.scene.add(bTop)

    const bBottom = new THREE.Mesh(new THREE.BoxGeometry(WORLD_SIZE + borderThickness * 2, borderHeight, borderThickness), curbMat)
    bBottom.position.set(0, borderHeight / 2, HALF_WORLD + borderThickness / 2)
    bBottom.castShadow = true
    bBottom.receiveShadow = true
    this.scene.add(bBottom)

    const bLeft = new THREE.Mesh(new THREE.BoxGeometry(borderThickness, borderHeight, WORLD_SIZE), curbMat)
    bLeft.position.set(-HALF_WORLD - borderThickness / 2, borderHeight / 2, 0)
    bLeft.castShadow = true
    bLeft.receiveShadow = true
    this.scene.add(bLeft)

    const bRight = new THREE.Mesh(new THREE.BoxGeometry(borderThickness, borderHeight, WORLD_SIZE), curbMat)
    bRight.position.set(HALF_WORLD + borderThickness / 2, borderHeight / 2, 0)
    bRight.castShadow = true
    bRight.receiveShadow = true
    this.scene.add(bRight)

    // Crisp tactical arena grid
    const grid = new THREE.GridHelper(WORLD_SIZE, MAP_SIZE, 0x64748b, 0x475569)
    grid.position.y = 0.08
    ;(grid.material as THREE.Material).opacity = 0.35
    ;(grid.material as THREE.Material).transparent = true
    this.scene.add(grid)
  }

  /**
   * Incrementally updates static map meshes without rebuilding unchanged tiles.
   * Eliminates 99% of CPU and GPU overhead when bricks break.
   */
  public updateMap(map: number[][], wallHp: Map<string, number>, eagles: { blue: boolean; red: boolean }) {
    for (let r = 0; r < MAP_SIZE; r++) {
      const row = map[r]
      for (let c = 0; c < MAP_SIZE; c++) {
        const key = `${r}_${c}`
        const tile = row?.[c] ?? TILE_EMPTY
        const existing = this.tileMeshes.get(key)

        if (tile === TILE_EMPTY) {
          if (existing) {
            this.mapGroup.remove(existing)
            this.tileMeshes.delete(key)
          }
          continue
        }

        if (existing) continue // already present, no allocation needed

        const worldX = c * TILE_SIZE + TILE_SIZE / 2 - HALF_WORLD
        const worldZ = r * TILE_SIZE + TILE_SIZE / 2 - HALF_WORLD

        let obj: THREE.Object3D | null = null
        if (tile === TILE_BRICK) {
          const mesh = new THREE.Mesh(this.geoBrickPart, this.matBrick)
          mesh.position.set(worldX, 5.5, worldZ)
          mesh.castShadow = true
          mesh.receiveShadow = true
          obj = mesh
        } else if (tile === TILE_STEEL) {
          const mesh = new THREE.Mesh(this.geoBoxTile, this.matSteel)
          mesh.position.set(worldX, 6, worldZ)
          mesh.castShadow = true
          mesh.receiveShadow = true
          obj = mesh
        } else if (tile === TILE_WATER) {
          const mesh = new THREE.Mesh(this.geoWater, this.matWater)
          mesh.rotation.x = -Math.PI / 2
          mesh.position.set(worldX, 0.5, worldZ)
          obj = mesh
        } else if (tile === TILE_TREES) {
          const foliageGroup = new THREE.Group()
          foliageGroup.position.set(worldX, 0, worldZ)

          const pad = new THREE.Mesh(this.geoTreePad, this.matTrees)
          pad.position.y = 0.6
          foliageGroup.add(pad)

          const canopyMain = new THREE.Mesh(this.geoTreeCanopy, this.matTrees)
          canopyMain.position.set(0, 11.5, 0)
          canopyMain.scale.set(1.08, 0.82, 1.08)
          foliageGroup.add(canopyMain)

          const canopyTop = new THREE.Mesh(this.geoTreeTop, this.matTreesHighlight)
          canopyTop.position.set(1.2, 15.0, -1.0)
          foliageGroup.add(canopyTop)

          const canopySide = new THREE.Mesh(this.geoTreeSide, this.matTreesHighlight)
          canopySide.position.set(-2.2, 13.2, 1.8)
          foliageGroup.add(canopySide)

          obj = foliageGroup
        } else if (tile === TILE_FORT_BLUE || tile === TILE_FORT_RED) {
          const isBlue = tile === TILE_FORT_BLUE
          const mesh = new THREE.Mesh(this.geoBoxTile, isBlue ? this.matFortBlue : this.matFortRed)
          mesh.position.set(worldX, 6, worldZ)
          mesh.castShadow = true
          mesh.receiveShadow = true
          obj = mesh
        }

        if (obj) {
          this.mapGroup.add(obj)
          this.tileMeshes.set(key, obj)
        }
      }
    }

    // Rebuild Eagles ONLY when alive state changes (not every frame!)
    if (this.lastEagleBlue !== eagles.blue || this.lastEagleRed !== eagles.red) {
      this.lastEagleBlue = eagles.blue
      this.lastEagleRed = eagles.red
      this.updateEagles(eagles)
    }
  }

  private updateEagles(eagles: { blue: boolean; red: boolean }) {
    while (this.eagleGroup.children.length > 0) {
      const child = this.eagleGroup.children[0]!
      this.eagleGroup.remove(child)
    }

    // Blue Eagle Base (South center)
    const blueX = 12 * TILE_SIZE + TILE_SIZE - HALF_WORLD
    const blueZ = 24 * TILE_SIZE + TILE_SIZE - HALF_WORLD
    this.buildEagleMonument(blueX, blueZ, eagles.blue, true)

    // Red Eagle Base (North center)
    const redX = 12 * TILE_SIZE + TILE_SIZE - HALF_WORLD
    const redZ = 1 * TILE_SIZE + TILE_SIZE - HALF_WORLD
    this.buildEagleMonument(redX, redZ, eagles.red, false)
  }

  private buildEagleMonument(x: number, z: number, alive: boolean, isBlue: boolean) {
    const group = new THREE.Group()
    group.position.set(x, 0, z)
    // Red eagle faces South (Math.PI), Blue eagle faces North/Camera (0)
    group.rotation.y = isBlue ? 0 : Math.PI

    // 1. Heavy Marble Pedestal Base
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.35,
      metalness: 0.6
    })
    const base = new THREE.Mesh(new RoundedBoxGeometry(18, 4, 18, 2, 1), baseMat)
    base.position.y = 2
    base.castShadow = true
    base.receiveShadow = true
    group.add(base)

    // Golden pedestal rim
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.25,
      metalness: 0.85
    })
    const baseRim = new THREE.Mesh(new THREE.BoxGeometry(19, 1.2, 19), rimMat)
    baseRim.position.y = 3.6
    group.add(baseRim)

    if (alive) {
      // Golden/Team Eagle Materials
      const featherMat = new THREE.MeshStandardMaterial({
        color: isBlue ? 0x2563eb : 0xdc2626,
        roughness: 0.3,
        metalness: 0.65,
        emissive: isBlue ? 0x1d4ed8 : 0x991b1b,
        emissiveIntensity: 0.2
      })
      const goldTrimMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        roughness: 0.2,
        metalness: 0.9,
        emissive: 0xd97706,
        emissiveIntensity: 0.25
      })

      const eagle = new THREE.Group()
      eagle.position.y = 4.2

      // Perch & Talons
      const perch = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 14, 10), goldTrimMat)
      perch.rotation.z = Math.PI / 2
      perch.position.set(0, 1.5, 0)
      perch.castShadow = true
      eagle.add(perch)

      // Claws gripping perch
      for (const clawX of [-3, 3]) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3, 4), goldTrimMat)
        claw.rotation.x = Math.PI / 3
        claw.position.set(clawX, 2, 1.2)
        eagle.add(claw)
      }

      // Eagle Muscular Torso & Breast
      const bodyGeo = new THREE.ConeGeometry(4.5, 12, 8)
      const body = new THREE.Mesh(bodyGeo, featherMat)
      body.position.set(0, 7.5, -0.5)
      body.rotation.x = -Math.PI / 18
      body.castShadow = true
      eagle.add(body)

      // Golden Breast Shield / Crest
      const shieldCrest = new THREE.Mesh(new RoundedBoxGeometry(4.8, 5.5, 2.2, 2, 0.4), goldTrimMat)
      shieldCrest.position.set(0, 7.8, 2.2)
      shieldCrest.castShadow = true
      eagle.add(shieldCrest)

      // Spanned Tail Feathers (Resting back and down)
      const tailGeo = new THREE.BoxGeometry(6, 1.2, 8)
      const tail = new THREE.Mesh(tailGeo, goldTrimMat)
      tail.position.set(0, 3.5, -4.5)
      tail.rotation.x = Math.PI / 6
      tail.castShadow = true
      eagle.add(tail)

      // Left Spreading Wing (SWEPT OUT & UP - Iconic Battle City Silhouette!)
      const wingL = new THREE.Group()
      wingL.position.set(-3.5, 8.5, 0)
      wingL.rotation.set(-0.15, 0.25, 0.35)

      // Main inner wing blade
      const innerWingL = new THREE.Mesh(new THREE.BoxGeometry(8, 1.5, 5.5), featherMat)
      innerWingL.position.set(-4, 0, 0)
      innerWingL.castShadow = true
      wingL.add(innerWingL)

      // Outer primary wingtip feathers (stepped blades pointing out and up)
      for (let f = 0; f < 3; f++) {
        const feather = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.0, 2.2), goldTrimMat)
        feather.position.set(-8.5 - f * 1.5, 0.8 + f * 1.4, f * 1.6 - 1.8)
        feather.rotation.z = 0.25 + f * 0.1
        feather.castShadow = true
        wingL.add(feather)
      }
      eagle.add(wingL)

      // Right Spreading Wing (Symmetric mirror)
      const wingR = new THREE.Group()
      wingR.position.set(3.5, 8.5, 0)
      wingR.rotation.set(-0.15, -0.25, -0.35)

      const innerWingR = new THREE.Mesh(new THREE.BoxGeometry(8, 1.5, 5.5), featherMat)
      innerWingR.position.set(4, 0, 0)
      innerWingR.castShadow = true
      wingR.add(innerWingR)

      for (let f = 0; f < 3; f++) {
        const feather = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.0, 2.2), goldTrimMat)
        feather.position.set(8.5 + f * 1.5, 0.8 + f * 1.4, f * 1.6 - 1.8)
        feather.rotation.z = -0.25 - f * 0.1
        feather.castShadow = true
        wingR.add(feather)
      }
      eagle.add(wingR)

      // Eagle Head & Hooked Beak
      const headGroup = new THREE.Group()
      headGroup.position.set(0, 14.2, 0.8)

      // Head skull with feathery crest
      const headMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.4, 4.8), goldTrimMat)
      headMesh.position.set(0, 0, 0)
      headMesh.castShadow = true
      headGroup.add(headMesh)

      // Hooked Hunter Beak (curved forward and down)
      const beak = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.2, 4), goldTrimMat)
      beak.rotation.x = Math.PI / 2.2
      beak.position.set(0, -0.6, 3.2)
      beak.scale.set(0.9, 1.4, 0.8)
      beak.castShadow = true
      headGroup.add(beak)

      // Glowing Hunter Eyes (Left & Right)
      const eyeMat = new THREE.MeshBasicMaterial({ color: isBlue ? 0x38bdf8 : 0xef4444 })
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 6), eyeMat)
      eyeL.position.set(-1.8, 0.5, 1.4)
      headGroup.add(eyeL)

      const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 6), eyeMat)
      eyeR.position.set(1.8, 0.5, 1.4)
      headGroup.add(eyeR)

      eagle.add(headGroup)
      group.add(eagle)
    } else {
      // Shattered Ruined Eagle Monument (Defeated state)
      const rubbleMat = this.matEagleBroken

      // Broken plinth chunks
      for (let i = 0; i < 5; i++) {
        const chunk = new THREE.Mesh(new THREE.BoxGeometry(3 + i, 2.5 + i * 0.4, 3 + i), rubbleMat)
        chunk.position.set((i % 2 === 0 ? 1 : -1) * (2.5 + i * 0.8), 2.2, (i > 2 ? 1 : -1) * (2.5 + i * 0.6))
        chunk.rotation.set(0.25 * i, 0.5 * i, 0.15 * i)
        group.add(chunk)
      }

      // Snapped fallen wing in rubble
      const brokenWing = new THREE.Mesh(new THREE.BoxGeometry(9, 1.2, 4.5), rubbleMat)
      brokenWing.position.set(2, 1.5, 3)
      brokenWing.rotation.set(0.2, 0.4, -0.3)
      group.add(brokenWing)
    }

    this.eagleGroup.add(group)
  }

  /**
   * Builds procedural 3D tank mesh hierarchy.
   */
  private createTankMesh(tank: RenderTank3D, isMe: boolean): TankMeshEntry {
    const isBlue = tank.team === 'blue'
    const teamBaseColor = isBlue ? 0x3b82f6 : 0xef4444
    const teamAccentColor = isBlue ? 0x93c5fd : 0xfca5a5
    const teamEmissive = isBlue ? 0x1d4ed8 : 0xb91c1c

    const group = new THREE.Group()

    // 1. Tank Chassis (Hull)
    const hullMat = new THREE.MeshStandardMaterial({
      color: teamBaseColor,
      roughness: 0.28,
      metalness: 0.45,
      emissive: teamEmissive,
      emissiveIntensity: 0.25
    })
    const hullGeo = new RoundedBoxGeometry(17, 5.5, 21, 2, 1.2)
    const hull = new THREE.Mesh(hullGeo, hullMat)
    hull.position.y = 4.2
    hull.castShadow = true
    hull.receiveShadow = true
    group.add(hull)

    // Glacis sloped front armor plate
    const glacisGeo = new THREE.BoxGeometry(15, 2.5, 6)
    const glacis = new THREE.Mesh(glacisGeo, hullMat)
    glacis.position.set(0, 5.2, -8.5)
    glacis.rotation.x = -Math.PI / 6
    glacis.castShadow = true
    group.add(glacis)

    // 2. Caterpillar Tracks (Left & Right) with separate material for UV scrolling
    const trackTexL = this.sharedTrackTex.clone()
    trackTexL.needsUpdate = true
    const trackTexR = this.sharedTrackTex.clone()
    trackTexR.needsUpdate = true

    const leftTrackMat = new THREE.MeshStandardMaterial({
      map: trackTexL,
      roughness: 0.55,
      metalness: 0.35
    })
    const rightTrackMat = new THREE.MeshStandardMaterial({
      map: trackTexR,
      roughness: 0.55,
      metalness: 0.35
    })

    const trackHousingGeo = new RoundedBoxGeometry(3.6, 5.2, 23, 2, 0.8)
    const leftTrack = new THREE.Mesh(trackHousingGeo, leftTrackMat)
    leftTrack.position.set(-9.2, 3, 0)
    leftTrack.castShadow = true
    group.add(leftTrack)

    const rightTrack = new THREE.Mesh(trackHousingGeo, rightTrackMat)
    rightTrack.position.set(9.2, 3, 0)
    rightTrack.castShadow = true
    group.add(rightTrack)

    // Road wheels inside tracks (4 per side)
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.35, metalness: 0.65 })
    const wheelGeo = new THREE.CylinderGeometry(2.2, 2.2, 1, 12)
    wheelGeo.rotateZ(Math.PI / 2)
    for (const zOffset of [-7.5, -2.5, 2.5, 7.5]) {
      const wL = new THREE.Mesh(wheelGeo, wheelMat)
      wL.position.set(-9.2, 2.8, zOffset)
      group.add(wL)

      const wR = new THREE.Mesh(wheelGeo, wheelMat)
      wR.position.set(9.2, 2.8, zOffset)
      group.add(wR)
    }

    // Headlights (Twin glowing LED lights at front)
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfde047,
      emissiveIntensity: 1.5
    })
    const hlGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.7, 10)
    hlGeo.rotateX(Math.PI / 2)
    const headlightL = new THREE.Mesh(hlGeo, headlightMat)
    headlightL.position.set(-6, 5.5, -10.5)
    group.add(headlightL)

    const headlightR = new THREE.Mesh(hlGeo, headlightMat)
    headlightR.position.set(6, 5.5, -10.5)
    group.add(headlightR)

    // 3. Turret Group (swivels with direction)
    const turret = new THREE.Group()
    turret.position.set(0, 7.2, 0)

    const turretMat = new THREE.MeshStandardMaterial({
      color: teamAccentColor,
      roughness: 0.25,
      metalness: 0.45,
      emissive: teamEmissive,
      emissiveIntensity: 0.2
    })
    const turretGeo = new RoundedBoxGeometry(11, 4.4, 13, 2, 1.0)
    const turretDome = new THREE.Mesh(turretGeo, turretMat)
    turretDome.position.y = 2.2
    turretDome.castShadow = true
    turret.add(turretDome)

    // Commander cupola hatch on top
    const cupolaGeo = new THREE.CylinderGeometry(2.2, 2.4, 1.4, 12)
    const cupola = new THREE.Mesh(cupolaGeo, hullMat)
    cupola.position.set(2.4, 4.8, 1.5)
    cupola.castShadow = true
    turret.add(cupola)

    // Antenna
    const antennaGeo = new THREE.CylinderGeometry(0.12, 0.22, 10, 4)
    const antennaMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.2 })
    const antenna = new THREE.Mesh(antennaGeo, antennaMat)
    antenna.position.set(-3.5, 8.5, 4.5)
    turret.add(antenna)

    // Barrel Assembly
    const barrelGroup = new THREE.Group()
    barrelGroup.position.set(0, 2.2, -5.5)

    // Gun Mantlet
    const mantletGeo = new RoundedBoxGeometry(3.8, 3.2, 3.2, 2, 0.6)
    const mantletMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.65 })
    const mantlet = new THREE.Mesh(mantletGeo, mantletMat)
    mantlet.position.set(0, 0, -1)
    barrelGroup.add(mantlet)

    // Cannon Barrel
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.2,
      metalness: 0.75
    })
    const barrelGeo = new THREE.CylinderGeometry(1.15, 1.35, 14, 12)
    barrelGeo.rotateX(-Math.PI / 2)
    const barrelMesh = new THREE.Mesh(barrelGeo, barrelMat)
    barrelMesh.position.set(0, 0, -8.5)
    barrelMesh.castShadow = true
    barrelGroup.add(barrelMesh)

    // Muzzle Brake
    const muzzleGeo = new THREE.CylinderGeometry(1.8, 1.8, 2.6, 10)
    muzzleGeo.rotateX(-Math.PI / 2)
    const muzzle = new THREE.Mesh(muzzleGeo, mantletMat)
    muzzle.position.set(0, 0, -15.5)
    muzzle.castShadow = true
    barrelGroup.add(muzzle)

    // Muzzle flash point/cone
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    })
    const flashMesh = new THREE.Mesh(new THREE.SphereGeometry(3.8, 10, 10), flashMat)
    flashMesh.position.set(0, 0, -18)
    barrelGroup.add(flashMesh)

    turret.add(barrelGroup)
    group.add(turret)

    // 4. Energy Shield (translucent pulsing bubble with glow)
    const shieldMat = new THREE.MeshStandardMaterial({
      color: isBlue ? 0x38bdf8 : 0xf87171,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.42,
      emissive: isBlue ? 0x0ea5e9 : 0xef4444,
      emissiveIntensity: 0.85
    })
    const shieldGeo = new THREE.SphereGeometry(18, 20, 14)
    const shield = new THREE.Mesh(shieldGeo, shieldMat)
    shield.position.y = 6
    shield.visible = tank.shield
    group.add(shield)

    // 5. Missile Pod on Turret roof (visible when carrying missile)
    const missilePod = new THREE.Group()
    const podBoxMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 })
    const podBox = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 7.5), podBoxMat)
    podBox.position.set(5.6, 3.2, -1)
    missilePod.add(podBox)

    const podRocketMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.2, metalness: 0.6 })
    const podRocketGeo = new THREE.CylinderGeometry(0.75, 0.75, 6.8, 8)
    podRocketGeo.rotateX(-Math.PI / 2)
    const podRocket = new THREE.Mesh(podRocketGeo, podRocketMat)
    podRocket.position.set(5.6, 4.4, -1)
    missilePod.add(podRocket)

    const podConeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 })
    const podConeGeo = new THREE.ConeGeometry(0.8, 2.2, 8)
    podConeGeo.rotateX(-Math.PI / 2)
    const podCone = new THREE.Mesh(podConeGeo, podConeMat)
    podCone.position.set(5.6, 4.4, -5.5)
    missilePod.add(podCone)

    missilePod.visible = Boolean((tank.missiles || 0) > 0)
    turret.add(missilePod)

    // 6. High-Visibility Name Sprite (elevated above shield & antenna)
    const nameSprite = this.createNameSprite(tank.name, isMe, isBlue, tank.missiles || 0)
    nameSprite.position.set(0, 31, 0)
    group.add(nameSprite)

    this.tanksGroup.add(group)

    return {
      group,
      hull,
      turret,
      barrel: barrelGroup,
      leftTrackMat,
      rightTrackMat,
      trackTex: trackTexL,
      muzzleFlash: flashMesh,
      shield,
      shieldMat,
      headlightL,
      headlightR,
      nameSprite,
      missilePod,
      prevMissiles: tank.missiles || 0,
      tankName: tank.name,
      isMe,
      team: tank.team,
      currentRotY: dirToAngle(tank.dir),
      recoil: 0,
      prevX: tank.x,
      prevY: tank.y
    }
  }

  private createNameSprite(name: string, isMe: boolean, isBlue: boolean, missiles = 0): THREE.Sprite {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 128
    const ctx = canvas.getContext('2d')
    const hasMissiles = missiles > 0
    if (ctx) {
      ctx.clearRect(0, 0, 512, 128)

      const x = 12
      const y = 16
      const w = 488
      const h = 96
      const radius = 24

      // 1. Dark semi-translucent backdrop for 100% contrast against bright/dark surfaces
      ctx.fillStyle = hasMissiles ? 'rgba(24, 18, 10, 0.96)' : 'rgba(10, 15, 29, 0.94)'
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, radius)
      ctx.fill()

      // 2. Vibrant team-colored neon accent border (or fiery golden if carrying missile)
      const teamColor = hasMissiles ? '#f59e0b' : isMe ? '#f59e0b' : isBlue ? '#38bdf8' : '#ef4444'
      ctx.strokeStyle = teamColor
      ctx.lineWidth = hasMissiles ? 8 : 6
      ctx.stroke()

      // 3. Team badge pill on the left
      const badgeW = isMe ? 120 : 96
      const badgeH = 58
      const badgeX = x + 18
      const badgeY = y + (h - badgeH) / 2
      ctx.fillStyle = isMe ? '#f59e0b' : isBlue ? '#0284c7' : '#dc2626'
      ctx.beginPath()
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 14)
      ctx.fill()

      ctx.font = '900 28px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(isMe ? '★ BẠN' : isBlue ? 'XANH' : 'ĐỎ', badgeX + badgeW / 2, badgeY + badgeH / 2 + 1)

      // 4. Fiery Rocket Badge on the right if tank carries missile!
      let rightBadgeW = 0
      if (hasMissiles) {
        rightBadgeW = 106
        const rBadgeX = x + w - rightBadgeW - 14
        const rBadgeY = badgeY
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.roundRect(rBadgeX, rBadgeY, rightBadgeW, badgeH, 14)
        ctx.fill()

        ctx.strokeStyle = '#fef08a'
        ctx.lineWidth = 3
        ctx.stroke()

        ctx.font = '900 24px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#ffffff'
        ctx.fillText(missiles > 1 ? `🚀 x${missiles}` : '🚀 TÊN LỬA', rBadgeX + rightBadgeW / 2, rBadgeY + badgeH / 2 + 1)
      }

      // 5. Large crisp player name with dark outline for readability
      const textX = badgeX + badgeW + 16
      const maxTextW = w - (badgeW + rightBadgeW + 48)
      const displayName = name || 'Chiến binh'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 38px system-ui, sans-serif'

      // Heavy dark shadow outline
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 7
      ctx.strokeText(displayName, textX, y + h / 2 + 1, maxTextW)

      // Pure white text
      ctx.fillStyle = '#ffffff'
      ctx.fillText(displayName, textX, y + h / 2 + 1, maxTextW)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = false

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false, // Always float cleanly above shields, antennas and trees
      depthWrite: false
    })
    const sprite = new THREE.Sprite(spriteMat)
    sprite.renderOrder = 999
    sprite.scale.set(44, 11, 1)
    return sprite
  }

  /**
   * Spawns a rich 3D explosion & impact effect at 2D world coordinates (x, y).
   * Called when bullets hit brick, steel, shield, tank, eagle, or border!
   */
  public triggerImpact(x: number, y: number, kind: ImpactKind = 'bullet') {
    if (this.isDisposed) return

    const now = performance.now()
    this.recentImpacts = this.recentImpacts.filter((imp) => now - imp.time < 90)
    // Universal spatial-temporal deduplication to prevent 3-4x duplicate particle explosions
    const duplicate = this.recentImpacts.some((imp) => Math.hypot(imp.x - x, imp.y - y) < 20)
    if (duplicate) return
    this.recentImpacts.push({ x, y, time: now })

    const worldX = x - HALF_WORLD
    const worldZ = y - HALF_WORLD
    const isMissile = kind === 'missile_explosion'
    const isPickup = kind === 'pickup'
    const isBig = kind === 'big' || isMissile
    const isShield = kind === 'shield'
    const isSteel = kind === 'steel'

    const primaryColor = isPickup ? 0xfacc15 : isShield ? 0x38bdf8 : isSteel ? 0xfef08a : 0xf97316
    const coreColor = isPickup ? 0xfef08a : isShield ? 0xe0f2fe : 0xffffff
    const ringColor = isShield ? 0x38bdf8 : (isBig || isMissile) ? 0xef4444 : 0xfacc15

    // 1. Dynamic Impact Point Light Flash
    if (this.impactLight) {
      this.impactLight.color.setHex(primaryColor)
      this.impactLight.position.set(worldX, 14, worldZ)
      this.impactLight.intensity = isMissile ? 14.0 : isBig ? 8.0 : 4.5
      this.impactLightLife = isMissile ? 22 : isBig ? 14 : 8
    }

    // 2. Glowing Fireball Core Sphere (reusing shared geometry)
    const fbGeo = isBig ? this.geoFbBig : this.geoFbSmall
    const fbMat = new THREE.MeshBasicMaterial({
      color: coreColor,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    })
    const fbMesh = new THREE.Mesh(fbGeo, fbMat)
    fbMesh.position.set(worldX, 6, worldZ)
    this.fxGroup.add(fbMesh)
    this.fireballs.push({
      mesh: fbMesh,
      life: 0,
      maxLife: isMissile ? 26 : isBig ? 18 : 11,
      maxScale: isMissile ? 11.0 : isBig ? 5.2 : 3.2
    })

    // Outer orange/cyan plasma shell (reusing shared geometry)
    const shellGeo = isBig ? this.geoShellBig : this.geoShellSmall
    const shellMat = new THREE.MeshBasicMaterial({
      color: primaryColor,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    })
    const shellMesh = new THREE.Mesh(shellGeo, shellMat)
    shellMesh.position.set(worldX, 6, worldZ)
    this.fxGroup.add(shellMesh)
    this.fireballs.push({
      mesh: shellMesh,
      life: 0,
      maxLife: isMissile ? 30 : isBig ? 22 : 14,
      maxScale: isMissile ? 14.0 : isBig ? 6.2 : 3.8
    })

    // 3. Expanding Shockwave Ring on floor (reusing shared geometry)
    const ringGeo = isBig ? this.geoRingBig : this.geoRingSmall
    const ringMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
    const ringMesh = new THREE.Mesh(ringGeo, ringMat)
    ringMesh.position.set(worldX, 1.2, worldZ)
    this.fxGroup.add(ringMesh)
    this.shockwaves.push({
      mesh: ringMesh,
      life: 0,
      maxLife: isMissile ? 30 : isBig ? 22 : 14,
      maxScale: isMissile ? 24.0 : isBig ? 8.5 : 4.5
    })

    // 4. Flying 3D Sparks & Debris Chunks (optimized count & shared geometry)
    const sparkCount = isMissile ? 18 : isBig ? 8 : 4
    for (let k = 0; k < sparkCount; k++) {
      const isBrickChip = kind === 'brick' && k % 2 === 0
      const puffGeo = isBrickChip ? this.geoSparkBox : this.geoSparkDodec

      const sparkColors = isShield
        ? [0x38bdf8, 0x7dd3fc, 0xe0f2fe]
        : isBrickChip
          ? [0xea580c, 0xc2410c, 0xf97316]
          : [0xfef08a, 0xfacc15, 0xf97316, 0xef4444]
      const chosenColor = sparkColors[Math.floor(Math.random() * sparkColors.length)]!

      const puffMat = new THREE.MeshBasicMaterial({
        color: chosenColor,
        transparent: true,
        opacity: 1
      })
      const puff = new THREE.Mesh(puffGeo, puffMat)
      puff.position.set(worldX, 5 + Math.random() * 3, worldZ)
      const angle = Math.random() * Math.PI * 2
      const speed = (isBig ? 2.5 : 1.6) + Math.random() * (isBig ? 4.5 : 3.2)
      this.fxGroup.add(puff)
      this.explosionPuffs.push({
        mesh: puff,
        vx: Math.cos(angle) * speed,
        vy: 2.2 + Math.random() * (isBig ? 5.5 : 3.8),
        vz: Math.sin(angle) * speed,
        life: 0,
        maxLife: isBig ? 24 : 14,
        hasGravity: true,
        shrinkRate: 0.93
      })
    }

    // 5. Rising Volumetric Smoke Puffs (MeshBasicMaterial for ultra-lightweight GPU cost)
    const smokeCount = isBig ? 3 : 1
    for (let s = 0; s < smokeCount; s++) {
      const smokeMat = new THREE.MeshBasicMaterial({
        color: 0x64748b,
        transparent: true,
        opacity: 0.55
      })
      const smoke = new THREE.Mesh(this.geoSmoke, smokeMat)
      smoke.position.set(
        worldX + (Math.random() - 0.5) * 6,
        6 + Math.random() * 4,
        worldZ + (Math.random() - 0.5) * 6
      )
      this.fxGroup.add(smoke)
      this.explosionPuffs.push({
        mesh: smoke,
        vx: (Math.random() - 0.5) * 0.8,
        vy: 0.9 + Math.random() * 1.1,
        vz: (Math.random() - 0.5) * 0.8,
        life: 0,
        maxLife: isBig ? 28 : 16,
        hasGravity: false,
        shrinkRate: 1.03 // expands as smoke rises
      })
    }
  }

  /**
   * Main frame update
   */
  public renderFrame(
    tanks: RenderTank3D[],
    bullets: RenderBullet3D[],
    explosions: RenderExplosion3D[],
    myPlayerId: string,
    screenShake: number,
    drops: RenderDrop3D[] = []
  ) {
    if (this.isDisposed) return
    this.animClock += 0.016

    // 0. Water Surface UV Scroll
    if (this.waterNormalTex) {
      this.waterNormalTex.offset.x = (this.waterNormalTex.offset.x + 0.0012) % 1
      this.waterNormalTex.offset.y = (this.waterNormalTex.offset.y + 0.0009) % 1
    }

    // 1. Camera Shake
    if (screenShake > 0.1) {
      const sx = (Math.random() - 0.5) * screenShake * 1.5
      const sz = (Math.random() - 0.5) * screenShake * 1.5
      this.camera.position.set(sx, CAM_BASE_Y, CAM_BASE_Z + sz)
    } else {
      this.camera.position.set(0, CAM_BASE_Y, CAM_BASE_Z)
    }

    // 2. Update Tanks
    const activeTankIds = new Set<string>()

    for (const t of tanks) {
      activeTankIds.add(t.id)
      let entry = this.tankMeshes.get(t.id)
      if (!entry) {
        entry = this.createTankMesh(t, t.id === myPlayerId)
        this.tankMeshes.set(t.id, entry)
      }

      // Convert 2D coord to 3D center-relative
      const targetX = t.x + 14 - HALF_WORLD
      const targetZ = t.y + 14 - HALF_WORLD

      const moved = Math.abs(t.x - entry.prevX) > 0.1 || Math.abs(t.y - entry.prevY) > 0.1
      if (moved) {
        // Animate caterpillar track UV scroll
        entry.trackTex.offset.y = (entry.trackTex.offset.y + 0.06) % 1
        entry.leftTrackMat.map!.offset.y = entry.trackTex.offset.y
        entry.rightTrackMat.map!.offset.y = entry.trackTex.offset.y
      }

      entry.group.position.x = THREE.MathUtils.lerp(entry.group.position.x || targetX, targetX, 0.4)
      entry.group.position.z = THREE.MathUtils.lerp(entry.group.position.z || targetZ, targetZ, 0.4)

      // Smooth rotate towards current heading
      const desiredAngle = dirToAngle(t.dir)
      let diff = desiredAngle - entry.currentRotY
      while (diff < -Math.PI) diff += Math.PI * 2
      while (diff > Math.PI) diff -= Math.PI * 2
      entry.currentRotY += diff * 0.35
      entry.group.rotation.y = entry.currentRotY

      // Shield pulsing animation
      entry.shield.visible = !!t.shield
      if (t.shield) {
        entry.shield.rotation.y += 0.04
        entry.shieldMat.emissiveIntensity = 0.75 + Math.sin(this.animClock * 8) * 0.3
      }

      // Recoil kickback recovery
      if (entry.recoil > 0) {
        entry.barrel.position.z = -5.5 + entry.recoil
        entry.recoil = Math.max(0, entry.recoil - 0.65)
        ;(entry.muzzleFlash.material as THREE.MeshBasicMaterial).opacity = entry.recoil / 3.5
      } else {
        entry.barrel.position.z = -5.5
        ;(entry.muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 0
      }

      // Check if tank missile count changed -> update 3D missile pod and floating name sprite
      const curMissiles = t.missiles || 0
      if (curMissiles !== entry.prevMissiles) {
        entry.prevMissiles = curMissiles
        entry.missilePod.visible = curMissiles > 0
        const newSprite = this.createNameSprite(entry.tankName, entry.isMe, entry.team === 'blue', curMissiles)
        newSprite.position.copy(entry.nameSprite.position)
        entry.group.remove(entry.nameSprite)
        ;(entry.nameSprite.material as THREE.SpriteMaterial).map?.dispose()
        ;(entry.nameSprite.material as THREE.SpriteMaterial).dispose()
        entry.nameSprite = newSprite
        entry.group.add(newSprite)
      }

      entry.prevX = t.x
      entry.prevY = t.y
    }

    // Cleanup dead/disconnected tanks
    for (const [id, entry] of this.tankMeshes.entries()) {
      if (!activeTankIds.has(id)) {
        this.tanksGroup.remove(entry.group)
        entry.nameSprite.material.map?.dispose()
        entry.nameSprite.material.dispose()
        this.tankMeshes.delete(id)
      }
    }

    // 3. Detect Bullets that just hit/vanished and spawn impact burst automatically
    for (const prev of this.prevBullets) {
      const stillAlive = bullets.some(
        (b) => b.dir === prev.dir && b.team === prev.team && Math.hypot(b.x - prev.x, b.y - prev.y) < 28
      )
      if (!stillAlive) {
        // Step slightly forward along bullet trajectory for exact surface contact point
        const stepX = prev.dir === 1 ? 6 : prev.dir === 3 ? -6 : 0
        const stepY = prev.dir === 2 ? 6 : prev.dir === 0 ? -6 : 0
        this.triggerImpact(prev.x + 3 + stepX, prev.y + 3 + stepY, 'bullet')
      }
    }
    this.prevBullets = bullets.map((b) => ({ x: b.x, y: b.y, dir: b.dir, team: b.team }))

    // 4. Update Bullets (High-visibility glowing plasma tracers with tail halo)
    while (this.bulletMeshes.length < bullets.length) {
      const bGroup = new THREE.Group()

      // Bright white-hot core
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
      const core = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 6.5, 10), coreMat)
      core.rotation.x = Math.PI / 2
      bGroup.add(core)

      // Glowing golden-orange plasma aura
      const auraMat = new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
      })
      const aura = new THREE.Mesh(new THREE.SphereGeometry(2.8, 10, 10), auraMat)
      bGroup.add(aura)

      this.bulletsGroup.add(bGroup)
      this.bulletMeshes.push(bGroup)
    }

    for (let i = 0; i < this.bulletMeshes.length; i++) {
      const bGroup = this.bulletMeshes[i]!
      if (i < bullets.length) {
        const b = bullets[i]!
        bGroup.visible = true
        bGroup.position.set(b.x + 3 - HALF_WORLD, 6, b.y + 3 - HALF_WORLD)
        bGroup.rotation.y = dirToAngle(b.dir)
        if (b.m) {
          bGroup.scale.set(1.7, 1.7, 1.7)
        } else {
          bGroup.scale.set(1.0, 1.0, 1.0)
        }

        // Point light on first bullet for room illumination
        if (i === 0 && this.bulletLight) {
          this.bulletLight.position.copy(bGroup.position)
          this.bulletLight.position.y += 5
          this.bulletLight.intensity = b.m ? 5.5 : 3.2
        }
      } else {
        bGroup.visible = false
      }
    }
    if (bullets.length === 0 && this.bulletLight) {
      this.bulletLight.intensity = 0
    }

    // 4.5 Update Item Drops (Rotating 3D Missiles on glowing launch pads)
    const activeDropIds = new Set<number>()
    const nowMs = performance.now()
    for (const d of drops) {
      activeDropIds.add(d.id)
      let dGroup = this.dropMeshes.get(d.id)
      if (!dGroup) {
        dGroup = new THREE.Group()

        // Glowing platform base
        const baseMat = new THREE.MeshBasicMaterial({
          color: 0xfacc15,
          transparent: true,
          opacity: 0.85
        })
        const base = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 0.7, 16), baseMat)
        base.position.y = 0.35
        dGroup.add(base)

        // Vertical Rocket Body
        const bodyMat = new THREE.MeshStandardMaterial({
          color: 0x334155,
          roughness: 0.3,
          metalness: 0.7
        })
        const body = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 7.0, 12), bodyMat)
        body.position.y = 4.8
        dGroup.add(body)

        // Red warhead nose cone with bright emissive glow
        const noseMat = new THREE.MeshStandardMaterial({
          color: 0xef4444,
          emissive: 0xef4444,
          emissiveIntensity: 0.85,
          roughness: 0.2,
          metalness: 0.4
        })
        const nose = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3.4, 12), noseMat)
        nose.position.y = 9.9
        dGroup.add(nose)

        // Golden band with emissive glow
        const bandMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 })
        const band = new THREE.Mesh(new THREE.CylinderGeometry(1.58, 1.58, 1.2, 12), bandMat)
        band.position.y = 5.0
        dGroup.add(band)

        // 4 Tail fins
        const finMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35 })
        for (let fi = 0; fi < 4; fi++) {
          const fin = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.2, 1.8), finMat)
          fin.rotation.y = (fi * Math.PI) / 2
          fin.position.set(0, 2.5, 0)
          dGroup.add(fin)
        }

        this.dropsGroup.add(dGroup)
        this.dropMeshes.set(d.id, dGroup)
      }

      dGroup.position.set(
        d.x + 8 - HALF_WORLD,
        2.0 + Math.sin(nowMs * 0.004 + d.id) * 1.5,
        d.y + 8 - HALF_WORLD
      )
      dGroup.rotation.y += 0.03
    }

    // Clean up stale drops
    for (const [id, grp] of this.dropMeshes.entries()) {
      if (!activeDropIds.has(id)) {
        this.dropsGroup.remove(grp)
        this.dropMeshes.delete(id)
      }
    }

    // 5. Update Server/Tank Explosions (using WeakSet so float dtTicks never skips an explosion!)
    for (const ex of explosions) {
      if (!this.spawnedExplosions.has(ex)) {
        this.spawnedExplosions.add(ex)
        this.triggerImpact(ex.x, ex.y, ex.maxShockwaveRadius > 25 ? 'big' : 'bullet')
      }
    }

    // Fade impact light
    if (this.impactLight && this.impactLightLife > 0) {
      this.impactLightLife--
      this.impactLight.intensity *= 0.78
      if (this.impactLightLife <= 0) this.impactLight.intensity = 0
    }

    // Update active fireballs
    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const fb = this.fireballs[i]!
      fb.life++
      const progress = fb.life / fb.maxLife
      const s = 1 + progress * (fb.maxScale - 1)
      fb.mesh.scale.set(s, s, s)
      ;(fb.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - progress) * 0.9)

      if (fb.life >= fb.maxLife) {
        this.fxGroup.remove(fb.mesh)
        ;(fb.mesh.material as THREE.Material).dispose()
        this.fireballs.splice(i, 1)
      }
    }

    // Update active shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i]!
      sw.life++
      const progress = sw.life / sw.maxLife
      const s = 1 + progress * sw.maxScale
      sw.mesh.scale.set(s, s, s)
      ;(sw.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - progress)

      if (sw.life >= sw.maxLife) {
        this.fxGroup.remove(sw.mesh)
        ;(sw.mesh.material as THREE.Material).dispose()
        this.shockwaves.splice(i, 1)
      }
    }

    // Update active debris puffs & smoke
    for (let i = this.explosionPuffs.length - 1; i >= 0; i--) {
      const p = this.explosionPuffs[i]!
      p.life++
      p.mesh.position.x += p.vx
      p.mesh.position.y += p.vy
      p.mesh.position.z += p.vz
      p.mesh.rotation.x += 0.12
      p.mesh.rotation.y += 0.15
      if (p.hasGravity) {
        p.vy -= 0.32
      } else {
        const progress = p.life / p.maxLife
        ;(p.mesh.material as THREE.Material).opacity = Math.max(0, (1 - progress) * 0.6)
      }
      p.mesh.scale.multiplyScalar(p.shrinkRate)

      if (p.life >= p.maxLife || p.mesh.position.y < 0) {
        this.fxGroup.remove(p.mesh)
        ;(p.mesh.material as THREE.Material).dispose()
        this.explosionPuffs.splice(i, 1)
      }
    }

    // Render bright 3D Scene directly
    this.renderer.render(this.scene, this.camera)
  }

  public resize(width: number, height: number) {
    if (this.isDisposed || !width || !height) return
    const aspect = width / height
    this.camera.aspect = aspect
    if (aspect < 1.0) {
      this.camera.fov = 2 * Math.atan(Math.tan((BASE_FOV * Math.PI) / 360) / aspect) * (180 / Math.PI)
    } else {
      this.camera.fov = BASE_FOV
    }
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  public triggerRecoil(tankId: string) {
    const entry = this.tankMeshes.get(tankId)
    if (entry) {
      entry.recoil = 3.8
    }
  }

  public dispose() {
    this.isDisposed = true
    for (const [, grp] of this.dropMeshes) {
      this.dropsGroup.remove(grp)
    }
    this.dropMeshes.clear()
    this.renderer.dispose()
    this.geoBoxTile.dispose()
    this.geoBrickPart.dispose()
    this.geoWater.dispose()
    this.geoTreePad.dispose()
    this.geoTreeCanopy.dispose()
    this.geoTreeTop.dispose()
    this.geoTreeSide.dispose()
    this.geoFbBig.dispose()
    this.geoFbSmall.dispose()
    this.geoShellBig.dispose()
    this.geoShellSmall.dispose()
    this.geoRingBig.dispose()
    this.geoRingSmall.dispose()
    this.geoSparkBox.dispose()
    this.geoSparkDodec.dispose()
    this.geoSmoke.dispose()
    this.matGround.dispose()
    this.matBrick.dispose()
    this.matSteel.dispose()
    this.matWater.dispose()
    this.matTrees.dispose()
    this.matTreesHighlight.dispose()
    this.matFortBlue.dispose()
    this.matFortRed.dispose()
    this.matEagleBlue.dispose()
    this.matEagleRed.dispose()
    this.matEagleBroken.dispose()
    this.waterNormalTex.dispose()
    this.sharedTrackTex.dispose()
  }
}
