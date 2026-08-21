import * as PIXI from 'pixi.js'
import { useGameStore } from '~/stores/game'
import { useSocket } from '~/composables/useSocket'
import type { Player } from '~/types'
import {
  VERTICAL_SLOTS,
  getSlotIndexForCell,
  getMyDisplayColors,
  darkenColorHex,
  lerpColorHex,
} from '~/config/constants'
import { isPlayingStatus } from '~/utils/roomStatus'

interface CellData {
  cellGroup: PIXI.Container
  visual: PIXI.Container
  bg: PIXI.Graphics
  text: PIXI.Text
  gapCoverV: PIXI.Graphics | null
  gapCoverH: PIXI.Graphics | null
  gapCoverCross: PIXI.Graphics | null
}

interface HoverOverlay extends PIXI.Container {
  texts: PIXI.Text[]
  targetX: number
  targetY: number
  targetAlpha: number
  lastSlotKey: string | null
  hoverWidth: number
  hoverHeight: number
  pointerX: number
  pointerY: number
  hasPointerPosition: boolean
}

const CELL_SIZE = 50
const CELL_GAP = 1.5
const BLOCK_GAP = 0.5
const BOARD_PADDING = 2
const BOARD_SIZE = 467
const HOVER_OVERLAY_BLEED = 2.5

function getCellPos(r: number, c: number) {
  const blockRow = Math.floor(r / 3)
  const blockCol = Math.floor(c / 3)
  const x = BOARD_PADDING + c * (CELL_SIZE + CELL_GAP) + blockCol * BLOCK_GAP
  const y = BOARD_PADDING + r * (CELL_SIZE + CELL_GAP) + blockRow * BLOCK_GAP
  const gapX = c % 3 === 2 ? CELL_GAP + BLOCK_GAP : CELL_GAP
  const gapY = r % 3 === 2 ? CELL_GAP + BLOCK_GAP : CELL_GAP
  return { x, y, width: CELL_SIZE, gapX, gapY }
}

function createGapCover(
  x: number, y: number, w: number, h: number,
) {
  const cover = new PIXI.Graphics()
  cover.beginFill(0xffffff)
  cover.drawRect(x, y, w, h)
  cover.endFill()
  cover.visible = false
  return cover
}

function createCellText() {
  const text = new PIXI.Text('', {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 28,
    fontWeight: '600',
    fill: '#1a1a1a',
  })
  text.anchor.set(0.5)
  return text
}

function easeOutBackOvershoot(t: number) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

export function usePixiBoard(
  containerRef: { value: HTMLDivElement | null },
) {
  const store = useGameStore()
  const { emitAck } = useSocket()

  let pixiApp: PIXI.Application | null = null
  let pixiGridContainer: PIXI.Container
  let pixiCells: CellData[] = []
  let pixiMatchGraphics: PIXI.Graphics
  let hoverOverlay: HoverOverlay | null = null
  let unmounted = false

  let lastHoveredR = -1
  let lastHoveredC = -1
  let hoverTimeout: ReturnType<typeof setTimeout> | null = null
  const UNHOVER_DELAY_MS = 50

  interface PlacementBounce {
    visual: PIXI.Container
    bg: PIXI.Graphics
    gapCovers: PIXI.Graphics[]
    elapsedMs: number
    normalColor: number
    darkColor: number
  }
  const PLACEMENT_BOUNCE_DURATION_MS = 520
  const PLACEMENT_BOUNCE_AMPLITUDE = 0.24
  const PLACEMENT_BOUNCE_CYCLES = 2
  const PLACEMENT_DARKEN_FACTOR = 0.55
  const HOVER_INVALID_DARKEN_FACTOR = 0.8
  let placementBounces: PlacementBounce[] = []

  const HOVER_PULSE_DURATION_MS = 220
  const HOVER_PULSE_AMPLITUDE = 0.12
  let hoverPulseElapsedMs: number | null = null

  interface MatchLineInfo {
    lineId: string | number
    start: { r: number; c: number }
    end: { r: number; c: number }
  }
  const MATCH_LINE_TWANG_DURATION_MS = 320
  const MATCH_LINE_TWANG_AMPLITUDE = 11
  const MATCH_LINE_TWANG_CYCLES = 8
  let currentMatchedLines: MatchLineInfo[] = []
  let matchLineAnimElapsed: Record<string, number> = {}
  let matchLinesNeedRedraw = true

  let prevMyBoardSnapshot: (number | null)[][] | null = null
  let prevFocusedPlayerId: string | null = null

  let preferredAutoPlaceTurn = -1
  let preferredAutoPlaceSlotIdx: number | null = null

  function getMyPlayer(): Player | null {
    if (!store.localRoomState?.players || !store.myPlayerId) return null
    return store.localRoomState.players.find(
      (p: Player) => p.id === store.myPlayerId,
    ) || null
  }

  function resolveDisplayPlayer(): Player | null {
    if (!store.localRoomState?.players) return null
    if (store.isSpectating) {
      const focused = store.spectateFocusedPlayerId
      if (focused) {
        return store.localRoomState.players.find(
          (p: Player) => p.id === focused,
        ) || store.localRoomState.players[0] || null
      }
      return store.localRoomState.players[0] || null
    }
    return getMyPlayer()
  }

  function isSlotEmptyOnBoard(
    board: (number | null)[][],
    coords: { r: number; c: number }[],
  ): boolean {
    return coords.every((coord) => {
      return board[coord.r]?.[coord.c] === null
    })
  }

  function handleCellClick(r: number, c: number) {
    if (store.isSpectating) return
    const roomState = store.localRoomState
    if (!roomState || !isPlayingStatus(roomState.status)) return

    const myPlayer = getMyPlayer()
    if (!myPlayer || myPlayer.hasPlacedThisRound) return

    const myBoard = myPlayer.board
    if (!myBoard) return

    const slotIdx = getSlotIndexForCell(r, c)
    const coords = VERTICAL_SLOTS[slotIdx]
    if (!coords) return

    if (!isSlotEmptyOnBoard(myBoard, coords)) return

    const pieceValues = roomState.currentPiece
    if (!pieceValues) return

    const turn = roomState.turn

    coords.forEach((coord, idx) => {
      myBoard[coord.r]![coord.c] = pieceValues[idx] ?? null
    })
    myPlayer.hasPlacedThisRound = true
    renderBoard()

    emitAck('make_move', { turn, slotIdx }).then((res) => {
      if (res.ok) return
      if (store.localRoomState?.turn !== turn) return
      coords.forEach((coord) => {
        myBoard[coord.r]![coord.c] = null
      })
      myPlayer.hasPlacedThisRound = false
      renderBoard()
    })
  }

  function clearHoverTimeout() {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      hoverTimeout = null
    }
  }

  function handleCellHoverIn(r: number, c: number) {
    clearHoverTimeout()
    const oldSlotIdx = lastHoveredC >= 0 && lastHoveredR >= 0
      ? getSlotIndexForCell(lastHoveredR, lastHoveredC)
      : -1
    const newSlotIdx = getSlotIndexForCell(r, c)
    const shouldRerender = oldSlotIdx !== newSlotIdx || lastHoveredR === -1
    lastHoveredR = r
    lastHoveredC = c
    if (shouldRerender) renderBoard()
  }

  function handleCellHoverOut() {
    clearHoverTimeout()
    hoverTimeout = setTimeout(() => {
      lastHoveredR = -1
      lastHoveredC = -1
      renderBoard()
    }, UNHOVER_DELAY_MS)
  }

  function handleMatrixPointerLeave() {
    clearHoverTimeout()
    lastHoveredR = -1
    lastHoveredC = -1
    renderBoard()
  }

  function handleCellHover(r: number, c: number, isHover: boolean) {
    if (!isPlayingStatus(store.localRoomState?.status)) return
    if (store.isSpectating) return
    const myPlayer = getMyPlayer()
    if (!myPlayer) return
    if (isHover) handleCellHoverIn(r, c)
    else handleCellHoverOut()
  }

  function getHoverSlotInfo(
    myBoard: (number | null)[][],
    myHasPlaced: boolean,
  ) {
    const state = store.localRoomState
    if (!state) return null
    const isHovering = isPlayingStatus(state.status)
      && !myHasPlaced
      && Array.isArray(state.currentPiece)
      && state.currentPiece.length === 3
      && lastHoveredR >= 0 && lastHoveredC >= 0
    if (!isHovering) return null

    const slotIdx = getSlotIndexForCell(lastHoveredR, lastHoveredC)
    const coords = VERTICAL_SLOTS[slotIdx]
    if (!coords) return null

    const isValid = coords.every(
      (coord) => myBoard[coord.r]?.[coord.c] === null,
    )
    return { slotIdx, coords, isValid }
  }

  function syncPreferredAutoPlaceSlot(
    hoverInfo: ReturnType<typeof getHoverSlotInfo>,
    myHasPlaced: boolean,
  ) {
    const state = store.localRoomState
    if (!state || !isPlayingStatus(state.status) || myHasPlaced) return
    const slotIdx = hoverInfo?.isValid ? hoverInfo.slotIdx : null
    if (preferredAutoPlaceTurn === state.turn
      && preferredAutoPlaceSlotIdx === slotIdx) return
    preferredAutoPlaceTurn = state.turn
    preferredAutoPlaceSlotIdx = slotIdx
    emitAck('set_preferred_slot', {
      turn: state.turn, slotIdx,
    })
  }

  function getHoverOverlayGeometry(
    hoverCoords: { r: number; c: number }[],
  ) {
    const posTop = getCellPos(hoverCoords[0]!.r, hoverCoords[0]!.c)
    const posBot = getCellPos(hoverCoords[2]!.r, hoverCoords[2]!.c)
    return {
      posTop,
      width: posTop.width,
      height: posBot.y + posBot.width - posTop.y,
    }
  }

  function updateHoverPointerTarget() {
    if (!hoverOverlay?.hasPointerPosition) return
    if (!hoverOverlay.hoverWidth || !hoverOverlay.hoverHeight) return
    const hw = hoverOverlay.hoverWidth / 2
    const hh = hoverOverlay.hoverHeight / 2
    hoverOverlay.targetX = Math.max(
      hw, Math.min(BOARD_SIZE - hw, hoverOverlay.pointerX),
    )
    hoverOverlay.targetY = Math.max(
      hh, Math.min(BOARD_SIZE - hh, hoverOverlay.pointerY),
    )
  }

  function triggerHoverPulse() {
    hoverPulseElapsedMs = 0
  }

  function updateHoverOverlay(
    hoverInfo: ReturnType<typeof getHoverSlotInfo>,
    colors: ReturnType<typeof getMyDisplayColors>,
  ) {
    if (!hoverOverlay) return
    const state = store.localRoomState
    if (!hoverInfo || !state) {
      hoverOverlay.targetAlpha = 0
      hoverOverlay.lastSlotKey = null
      return
    }

    const hoverCoords = hoverInfo.coords
    const slotKey = `${hoverCoords[0]!.r}_${hoverCoords[0]!.c}`
    if (hoverOverlay.lastSlotKey !== slotKey) {
      const shouldPulse = hoverOverlay.lastSlotKey === null
      hoverOverlay.lastSlotKey = slotKey
      if (shouldPulse) triggerHoverPulse()
    }

    const geometry = getHoverOverlayGeometry(hoverCoords)

    pixiGridContainer.addChild(hoverOverlay)
    hoverOverlay.pivot.set(geometry.width / 2, geometry.height / 2)
    hoverOverlay.hoverWidth = geometry.width
    hoverOverlay.hoverHeight = geometry.height
    if (hoverOverlay.hasPointerPosition) {
      updateHoverPointerTarget()
    } else {
      hoverOverlay.targetX = geometry.posTop.x + geometry.width / 2
      hoverOverlay.targetY = geometry.posTop.y + geometry.height / 2
    }
    hoverOverlay.targetAlpha = 1
    if (hoverOverlay.alpha < 0.05) {
      hoverOverlay.x = hoverOverlay.targetX
      hoverOverlay.y = hoverOverlay.targetY
    }

    const bleed = HOVER_OVERLAY_BLEED
    const bg = hoverOverlay.children[0] as PIXI.Graphics
    bg.clear()
    const bgColor = hoverInfo.isValid
      ? colors.hoverHex
      : darkenColorHex(colors.hoverHex, HOVER_INVALID_DARKEN_FACTOR)
    bg.beginFill(bgColor, 1)
    bg.drawRect(
      -bleed, -bleed,
      geometry.width + bleed * 2, geometry.height + bleed * 2,
    )
    bg.endFill()

    const hoverPiece = state.currentPiece || []
    hoverCoords.forEach((coord, i) => {
      const p = getCellPos(coord.r, coord.c)
      const t = hoverOverlay!.texts[i]
      if (!t) return
      t.style.fill = colors.textColor
      t.text = String(hoverPiece[i] ?? '')
      t.x = geometry.width / 2
      t.y = p.y - geometry.posTop.y + p.width / 2
    })
  }

  function updateGapCover(
    gapCover: PIXI.Graphics | null,
    shouldShow: boolean,
    colorHex: number,
  ) {
    if (!gapCover) return
    gapCover.visible = shouldShow
    if (shouldShow) gapCover.tint = colorHex
  }

  function buildCellColorGrid(
    myBoard: (number | null)[][],
    colorHex: number,
  ): (number | null)[][] {
    const grid: (number | null)[][] = Array(9).fill(null).map(
      () => Array(9).fill(null),
    )
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (myBoard[r]?.[c] !== null && myBoard[r]?.[c] !== undefined) {
          grid[r]![c] = colorHex
        }
      }
    }
    return grid
  }

  function updateBoardCell(
    pCell: CellData, r: number, c: number,
    myBoard: (number | null)[][],
    cellColorGrid: (number | null)[][],
  ) {
    const color = cellColorGrid[r]![c]!
    pCell.bg.tint = color !== null ? color : 0xffffff

    const cellVal = myBoard[r]?.[c]
    if (cellVal !== null && cellVal !== undefined) {
      pCell.text.text = String(cellVal)
      pCell.text.style.fill = '#1a1a1a'
    } else {
      pCell.text.text = ''
    }
    pCell.text.alpha = 1

    const colorDown = r < 8 ? cellColorGrid[r + 1]![c]! : null
    updateGapCover(
      pCell.gapCoverV,
      color !== null && colorDown !== null,
      (color ?? 0xffffff) as number,
    )

    const colorRight = c < 8 ? cellColorGrid[r]![c + 1]! : null
    updateGapCover(
      pCell.gapCoverH,
      color !== null && colorRight !== null,
      (color ?? 0xffffff) as number,
    )

    const colorDR = (r < 8 && c < 8) ? cellColorGrid[r + 1]![c + 1]! : null
    const showCross = color !== null
      && colorRight !== null
      && colorDown !== null
      && colorDR !== null
    updateGapCover(pCell.gapCoverCross, showCross, (color ?? 0xffffff) as number)
  }

  function startCellPlacementBounce(
    r: number, c: number, colorHex: number,
  ) {
    const pCell = pixiCells[r * 9 + c]
    if (!pCell?.cellGroup || !pCell.visual) return
    pixiGridContainer.addChild(pCell.cellGroup)
    placementBounces.push({
      visual: pCell.visual,
      bg: pCell.bg,
      gapCovers: [pCell.gapCoverV, pCell.gapCoverH, pCell.gapCoverCross]
        .filter(Boolean) as PIXI.Graphics[],
      elapsedMs: 0,
      normalColor: colorHex,
      darkColor: darkenColorHex(colorHex, PLACEMENT_DARKEN_FACTOR),
    })
  }

  function applyPlacementTint(anim: PlacementBounce, colorHex: number) {
    anim.bg.tint = colorHex
    anim.gapCovers.forEach((cover) => {
      if (cover.visible) cover.tint = colorHex
    })
  }

  function animatePlacementBounces() {
    if (!placementBounces.length || !pixiApp) return
    for (let i = placementBounces.length - 1; i >= 0; i--) {
      const anim = placementBounces[i]!
      anim.elapsedMs += pixiApp.ticker.deltaMS
      const t = Math.min(1, anim.elapsedMs / PLACEMENT_BOUNCE_DURATION_MS)
      const envelope = Math.pow(1 - t, 1.5)
      const bump = Math.abs(
        Math.sin(t * Math.PI * PLACEMENT_BOUNCE_CYCLES),
      ) * PLACEMENT_BOUNCE_AMPLITUDE * envelope
      anim.visual.scale.set(1 + bump)
      applyPlacementTint(
        anim, lerpColorHex(anim.darkColor, anim.normalColor, t),
      )
      if (t >= 1) {
        anim.visual.scale.set(1)
        applyPlacementTint(anim, anim.normalColor)
        placementBounces.splice(i, 1)
      }
    }
  }

  function updateMatchLinesTwangState(
    matchedLinesDetail: MatchLineInfo[],
  ) {
    const lines = matchedLinesDetail || []
    lines.forEach((line) => {
      if (!(String(line.lineId) in matchLineAnimElapsed)) {
        matchLineAnimElapsed[String(line.lineId)] = 0
      }
    })
    Object.keys(matchLineAnimElapsed).forEach((id) => {
      const stillPresent = lines.some(
        (l) => String(l.lineId) === id,
      )
      if (!stillPresent) delete matchLineAnimElapsed[id]
    })
    currentMatchedLines = lines
    matchLinesNeedRedraw = true
  }

  function getLineEndpoints(lineInfo: MatchLineInfo) {
    const pos1 = getCellPos(lineInfo.start.r, lineInfo.start.c)
    const pos2 = getCellPos(lineInfo.end.r, lineInfo.end.c)
    const dr = Math.sign(lineInfo.end.r - lineInfo.start.r)
    const dc = Math.sign(lineInfo.end.c - lineInfo.start.c)
    return {
      x1: pos1.x + pos1.width / 2 - dc * (pos1.width / 2),
      y1: pos1.y + pos1.width / 2 - dr * (pos1.width / 2),
      x2: pos2.x + pos2.width / 2 + dc * (pos2.width / 2),
      y2: pos2.y + pos2.width / 2 + dr * (pos2.width / 2),
      isHorizontal: dr === 0,
    }
  }

  function getLineTwangWobble(lineId: string | number) {
    const elapsed = matchLineAnimElapsed[String(lineId)]
    if (elapsed === undefined
      || elapsed >= MATCH_LINE_TWANG_DURATION_MS) return 0
    const t = elapsed / MATCH_LINE_TWANG_DURATION_MS
    const decay = Math.pow(1 - t, 1.3)
    return Math.sin(t * Math.PI * MATCH_LINE_TWANG_CYCLES)
      * MATCH_LINE_TWANG_AMPLITUDE * decay
  }

  function drawMatchLinesFrame() {
    if (!pixiMatchGraphics) return
    pixiMatchGraphics.clear()
    if (!currentMatchedLines.length) return
    pixiMatchGraphics.lineStyle(1.5, 0x000000, 1)
    currentMatchedLines.forEach((lineInfo) => {
      const p = getLineEndpoints(lineInfo)
      const wobble = getLineTwangWobble(lineInfo.lineId)
      pixiMatchGraphics.moveTo(p.x1, p.y1)
      if (wobble === 0) {
        pixiMatchGraphics.lineTo(p.x2, p.y2)
        return
      }
      const midX = (p.x1 + p.x2) / 2 + (p.isHorizontal ? 0 : wobble)
      const midY = (p.y1 + p.y2) / 2 + (p.isHorizontal ? wobble : 0)
      pixiMatchGraphics.quadraticCurveTo(midX, midY, p.x2, p.y2)
    })
  }

  function animateMatchLinesTwang() {
    if (!pixiApp) return
    let stillAnimating = false
    Object.keys(matchLineAnimElapsed).forEach((id) => {
      const elapsed = matchLineAnimElapsed[id]
      if (elapsed !== undefined && elapsed < MATCH_LINE_TWANG_DURATION_MS) {
        matchLineAnimElapsed[id] = elapsed + pixiApp!.ticker.deltaMS
        stillAnimating = true
      }
    })
    if (stillAnimating || matchLinesNeedRedraw) {
      drawMatchLinesFrame()
      matchLinesNeedRedraw = false
    }
  }

  function createCellGroup(r: number, c: number): CellData {
    const pos = getCellPos(r, c)
    const cellGroup = new PIXI.Container()
    cellGroup.pivot.set(pos.width / 2, pos.width / 2)
    cellGroup.x = pos.x + pos.width / 2
    cellGroup.y = pos.y + pos.width / 2
    cellGroup.eventMode = 'static'
    cellGroup.cursor = 'pointer'
    cellGroup.hitArea = new PIXI.Rectangle(
      -4, -4, pos.width + 8, pos.width + 8,
    )

    const visual = new PIXI.Container()
    visual.pivot.set(pos.width / 2, pos.width / 2)
    visual.x = pos.width / 2
    visual.y = pos.width / 2

    const bg = new PIXI.Graphics()
    bg.beginFill(0xffffff)
    bg.drawRect(0, 0, pos.width, pos.width)
    bg.endFill()
    visual.addChild(bg)

    const text = createCellText()
    text.x = pos.width / 2
    text.y = pos.width / 2
    visual.addChild(text)
    cellGroup.addChild(visual)

    const gapCoverV = r < 8
      ? createGapCover(0, pos.width, pos.width, pos.gapY)
      : null
    if (gapCoverV) cellGroup.addChild(gapCoverV)

    const gapCoverH = c < 8
      ? createGapCover(pos.width, 0, pos.gapX, pos.width)
      : null
    if (gapCoverH) cellGroup.addChild(gapCoverH)

    const gapCoverCross = (r < 8 && c < 8)
      ? createGapCover(pos.width, pos.width, pos.gapX, pos.gapY)
      : null
    if (gapCoverCross) cellGroup.addChild(gapCoverCross)

    cellGroup.on('pointerover', () => handleCellHover(r, c, true))
    cellGroup.on('pointerout', () => handleCellHover(r, c, false))
    cellGroup.on('pointerdown', () => handleCellClick(r, c))

    return {
      cellGroup, visual, bg, text,
      gapCoverV, gapCoverH, gapCoverCross,
    }
  }

  function setupHoverOverlay(): HoverOverlay {
    const overlay = new PIXI.Container() as HoverOverlay
    overlay.eventMode = 'none'
    overlay.visible = false
    overlay.alpha = 0
    overlay.scale.set(1)
    overlay.texts = []
    overlay.targetX = 0
    overlay.targetY = 0
    overlay.targetAlpha = 0
    overlay.lastSlotKey = null
    overlay.hoverWidth = 0
    overlay.hoverHeight = 0
    overlay.pointerX = 0
    overlay.pointerY = 0
    overlay.hasPointerPosition = false

    const hoverBg = new PIXI.Graphics()
    overlay.addChild(hoverBg)

    for (let i = 0; i < 3; i++) {
      const t = new PIXI.Text('', {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 28,
        fontWeight: '600',
        fill: '#854d0e',
      })
      t.anchor.set(0.5)
      overlay.addChild(t)
      overlay.texts.push(t)
    }

    return overlay
  }

  function attachPointerTracking(canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointermove', (e: PointerEvent) => {
      if (!hoverOverlay || !pixiApp) return
      const rect = canvas.getBoundingClientRect()
      hoverOverlay.pointerX = (
        (e.clientX - rect.left) / rect.width
      ) * BOARD_SIZE
      hoverOverlay.pointerY = (
        (e.clientY - rect.top) / rect.height
      ) * BOARD_SIZE
      hoverOverlay.hasPointerPosition = true
      updateHoverPointerTarget()
    }, { passive: true })
    canvas.addEventListener('pointerleave', () => {
      handleMatrixPointerLeave()
      if (!hoverOverlay) return
      hoverOverlay.hasPointerPosition = false
      hoverOverlay.targetAlpha = 0
    }, { passive: true })
  }

  function setupTicker() {
    if (!pixiApp) return
    pixiApp.ticker.add((dt: number) => {
      if (hoverOverlay) {
        const fadedOut = hoverOverlay.alpha < 0.01
          && hoverOverlay.targetAlpha === 0
        hoverOverlay.visible = !fadedOut

        const alphaEase = 1 - Math.pow(0.65, dt)
        const moveEase = 1 - Math.pow(0.28, dt)

        if (hoverOverlay.targetAlpha === 1) {
          hoverOverlay.alpha = 1
        } else {
          hoverOverlay.alpha += (
            hoverOverlay.targetAlpha - hoverOverlay.alpha
          ) * alphaEase
        }

        hoverOverlay.x += (
          hoverOverlay.targetX - hoverOverlay.x
        ) * moveEase
        hoverOverlay.y += (
          hoverOverlay.targetY - hoverOverlay.y
        ) * moveEase

        if (hoverPulseElapsedMs !== null && pixiApp) {
          hoverPulseElapsedMs += pixiApp.ticker.deltaMS
          const t = Math.min(
            1, hoverPulseElapsedMs / HOVER_PULSE_DURATION_MS,
          )
          const eased = easeOutBackOvershoot(t)
          hoverOverlay.scale.set(
            1 + (eased - 1) * HOVER_PULSE_AMPLITUDE,
          )
          if (t >= 1) {
            hoverOverlay.scale.set(1)
            hoverPulseElapsedMs = null
          }
        }
      }

      animatePlacementBounces()

      animateMatchLinesTwang()
    })
  }

  async function initBoard() {
    if (!containerRef.value) return
    unmounted = false

    if (typeof document !== 'undefined' && document.fonts) {
      try {
        await Promise.all([
          document.fonts.load("600 28px 'Plus Jakarta Sans'"),
          document.fonts.load("700 28px 'Plus Jakarta Sans'"),
        ])
        await document.fonts.ready
      } catch {
      }
    }
    if (unmounted || !containerRef.value) return

    pixiApp = new PIXI.Application({
      width: BOARD_SIZE,
      height: BOARD_SIZE,
      backgroundColor: 0xffffff,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })

    const canvas = pixiApp.view as HTMLCanvasElement
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    containerRef.value.appendChild(canvas)

    const gridBg = new PIXI.Graphics()
    gridBg.beginFill(0x1a1a1a)
    gridBg.drawRect(0, 0, BOARD_SIZE, BOARD_SIZE)
    gridBg.endFill()
    pixiApp.stage.addChild(gridBg)

    pixiGridContainer = new PIXI.Container()
    pixiApp.stage.addChild(pixiGridContainer)

    pixiCells = []
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = createCellGroup(r, c)
        pixiGridContainer.addChild(cell.cellGroup)
        pixiCells.push(cell)
      }
    }

    hoverOverlay = setupHoverOverlay()
    pixiGridContainer.addChild(hoverOverlay)

    attachPointerTracking(canvas)
    setupTicker()

    pixiMatchGraphics = new PIXI.Graphics()
    pixiApp.stage.addChild(pixiMatchGraphics)

    renderBoard()
  }

  function destroyBoard() {
    unmounted = true
    if (pixiApp) {
      pixiApp.destroy(true, { children: true })
      pixiApp = null
    }
    hoverOverlay = null
    pixiCells = []
    placementBounces = []
    prevMyBoardSnapshot = null
    currentMatchedLines = []
    matchLineAnimElapsed = {}
  }

  function resetGameVisualState() {
    clearHoverTimeout()
    lastHoveredR = -1
    lastHoveredC = -1
    preferredAutoPlaceTurn = -1
    preferredAutoPlaceSlotIdx = null
    prevFocusedPlayerId = null
    prevMyBoardSnapshot = null
    if (hoverOverlay) {
      hoverOverlay.targetAlpha = 0
      hoverOverlay.alpha = 0
      hoverOverlay.lastSlotKey = null
      hoverOverlay.hasPointerPosition = false
    }
  }

  function renderBoard() {
    if (!store.localRoomState || !pixiCells.length) return

    const myPlayer = resolveDisplayPlayer()
    if (!myPlayer?.board) return

    if (store.isSpectating && myPlayer.id !== prevFocusedPlayerId) {
      prevFocusedPlayerId = myPlayer.id
      prevMyBoardSnapshot = null
    }

    const myBoard = myPlayer.board
    const myHasPlaced = !!myPlayer.hasPlacedThisRound
    const colorIndex = store.isSpectating
      ? (myPlayer.seatIndex ?? 0)
      : store.myPlayerIndex
    const colors = getMyDisplayColors(colorIndex)

    if (prevMyBoardSnapshot) {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const prevRow = prevMyBoardSnapshot[r]
          const wasEmpty = !prevRow || prevRow[c] === null
          const curRow = myBoard[r]
          const nowFilled = curRow != null
            && curRow[c] !== null && curRow[c] !== undefined
          if (wasEmpty && nowFilled) {
            startCellPlacementBounce(r, c, colors.colorHex)
          }
        }
      }
    }
    prevMyBoardSnapshot = myBoard.map((row) => [...row])

    const cellColorGrid = buildCellColorGrid(myBoard, colors.colorHex)

    const hoverInfo = store.isSpectating
      ? null
      : getHoverSlotInfo(myBoard, myHasPlaced)
    if (!store.isSpectating) {
      syncPreferredAutoPlaceSlot(hoverInfo, myHasPlaced)
    }
    updateHoverOverlay(hoverInfo, colors)

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const pCell = pixiCells[r * 9 + c]
        if (pCell) updateBoardCell(pCell, r, c, myBoard, cellColorGrid)
      }
    }

    const isPlaying = isPlayingStatus(store.localRoomState.status)
      && !store.isSpectating
    const isLocked = !isPlaying || myHasPlaced
    pixiGridContainer.interactiveChildren = isPlaying
    pixiGridContainer.cursor = isLocked ? 'not-allowed' : 'default'

    updateMatchLinesTwangState(myPlayer.matchedLines || [])
  }

  return { initBoard, destroyBoard, renderBoard, resetGameVisualState }
}
