var pixiApp;
var pixiGridContainer;
var pixiCells = [];
var pixiMatchGraphics;
var pixiHoverOverlay;

var CELL_SIZE = 50;
var CELL_GAP = 1.5;
var BLOCK_GAP = 0.5;
var BOARD_PADDING = 2;
var BOARD_SIZE = 467;

function easeOutBackOvershoot(t) {
  var c1 = 1.70158;
  var c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function darkenColorHex(hex, factor) {
  var r = Math.round(((hex >> 16) & 0xff) * factor);
  var g = Math.round(((hex >> 8) & 0xff) * factor);
  var b = Math.round((hex & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}

function lerpColorHex(colorA, colorB, t) {
  var ar = (colorA >> 16) & 0xff,
    ag = (colorA >> 8) & 0xff,
    ab = colorA & 0xff;
  var br = (colorB >> 16) & 0xff,
    bg = (colorB >> 8) & 0xff,
    bb = colorB & 0xff;
  var r = Math.round(ar + (br - ar) * t);
  var g = Math.round(ag + (bg - ag) * t);
  var b = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | b;
}

function getCellPos(r, c) {
  var blockRow = Math.floor(r / 3);
  var blockCol = Math.floor(c / 3);

  var x = BOARD_PADDING + c * (CELL_SIZE + CELL_GAP) + blockCol * BLOCK_GAP;
  var y = BOARD_PADDING + r * (CELL_SIZE + CELL_GAP) + blockRow * BLOCK_GAP;

  var gapX = c % 3 === 2 ? CELL_GAP + BLOCK_GAP : CELL_GAP;
  var gapY = r % 3 === 2 ? CELL_GAP + BLOCK_GAP : CELL_GAP;

  return {
    x: x,
    y: y,
    width: CELL_SIZE,
    gapX: gapX,
    gapY: gapY
  };
}

function createPixiApp() {
  var app = new PIXI.Application({
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    backgroundColor: 0xffffff,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
  });

  var container = document.getElementById('pixi-board-container');
  container.innerHTML = '';
  container.appendChild(app.view);

  return app;
}

function drawGridBackground(app) {
  var gridBg = new PIXI.Graphics();
  gridBg.beginFill(0x1a1a1a);
  gridBg.drawRect(0, 0, BOARD_SIZE, BOARD_SIZE);
  gridBg.endFill();
  app.stage.addChild(gridBg);
}

function createGapCover(x, y, w, h) {
  var cover = new PIXI.Graphics();
  cover.beginFill(0xffffff);
  cover.drawRect(x, y, w, h);
  cover.endFill();
  cover.visible = false;
  return cover;
}

function createCellText() {
  var text = new PIXI.Text('', {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 28,
    fontWeight: '600',
    fill: '#1a1a1a'
  });
  text.anchor.set(0.5);
  return text;
}

function createCellContainer(pos) {
  var cellGroup = new PIXI.Container();
  cellGroup.pivot.set(pos.width / 2, pos.width / 2);
  cellGroup.x = pos.x + pos.width / 2;
  cellGroup.y = pos.y + pos.width / 2;
  cellGroup.interactive = true;
  cellGroup.cursor = 'pointer';
  cellGroup.hitArea = new PIXI.Rectangle(-4, -4, pos.width + 8, pos.width + 8);
  return cellGroup;
}

function createCellVisual(pos) {
  var visual = new PIXI.Container();
  visual.pivot.set(pos.width / 2, pos.width / 2);
  visual.x = pos.width / 2;
  visual.y = pos.width / 2;

  var bg = new PIXI.Graphics();
  bg.beginFill(0xffffff);
  bg.drawRect(0, 0, pos.width, pos.width);
  bg.endFill();
  visual.addChild(bg);

  var text = createCellText();
  text.x = pos.width / 2;
  text.y = pos.width / 2;
  visual.addChild(text);

  return { visual: visual, bg: bg, text: text };
}

function createCellGapCovers(cellGroup, r, c, pos) {
  var gapCoverV = null;
  if (r < 8) {
    gapCoverV = createGapCover(0, pos.width, pos.width, pos.gapY);
    cellGroup.addChild(gapCoverV);
  }

  var gapCoverH = null;
  if (c < 8) {
    gapCoverH = createGapCover(pos.width, 0, pos.gapX, pos.width);
    cellGroup.addChild(gapCoverH);
  }

  var gapCoverCross = null;
  if (r < 8 && c < 8) {
    gapCoverCross = createGapCover(pos.width, pos.width, pos.gapX, pos.gapY);
    cellGroup.addChild(gapCoverCross);
  }

  return { gapCoverV: gapCoverV, gapCoverH: gapCoverH, gapCoverCross: gapCoverCross };
}

function createCellGroup(r, c) {
  var pos = getCellPos(r, c);
  var cellGroup = createCellContainer(pos);

  var visualParts = createCellVisual(pos);
  cellGroup.addChild(visualParts.visual);

  var gapCovers = createCellGapCovers(cellGroup, r, c, pos);

  cellGroup.on('pointerover', function () {
    handleCellHover(r, c, true);
  });
  cellGroup.on('pointerout', function () {
    handleCellHover(r, c, false);
  });
  cellGroup.on('pointerdown', function () {
    handleCellClick(r, c);
  });

  return {
    cellGroup: cellGroup,
    visual: visualParts.visual,
    bg: visualParts.bg,
    text: visualParts.text,
    gapCoverV: gapCovers.gapCoverV,
    gapCoverH: gapCovers.gapCoverH,
    gapCoverCross: gapCovers.gapCoverCross
  };
}

function buildCellGrid() {
  pixiCells = [];
  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      var cell = createCellGroup(r, c);
      pixiGridContainer.addChild(cell.cellGroup);
      pixiCells.push(cell);
    }
  }
}

function createHoverOverlay() {
  var overlay = new PIXI.Container();
  overlay.eventMode = 'none';
  overlay.visible = false;
  overlay.alpha = 0;
  overlay.scale.set(1);

  var hoverBg = new PIXI.Graphics();
  overlay.addChild(hoverBg);

  overlay.texts = [];
  for (var i = 0; i < 3; i++) {
    var t = new PIXI.Text('', {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 28,
      fontWeight: '600',
      fill: '#854d0e'
    });
    t.anchor.set(0.5);
    overlay.addChild(t);
    overlay.texts.push(t);
  }

  overlay.targetX = 0;
  overlay.targetY = 0;
  overlay.targetAlpha = 0;
  overlay.lastSlotKey = null;
  overlay.pointerX = 0;
  overlay.pointerY = 0;
  overlay.hoverWidth = 0;
  overlay.hoverHeight = 0;
  overlay.hasPointerPosition = false;

  return overlay;
}

function updateHoverPointerTarget() {
  if (!pixiHoverOverlay || !pixiHoverOverlay.hasPointerPosition) return;
  if (!pixiHoverOverlay.hoverWidth || !pixiHoverOverlay.hoverHeight) return;

  var halfWidth = pixiHoverOverlay.hoverWidth / 2;
  var halfHeight = pixiHoverOverlay.hoverHeight / 2;
  pixiHoverOverlay.targetX = Math.max(
    halfWidth,
    Math.min(BOARD_SIZE - halfWidth, pixiHoverOverlay.pointerX)
  );
  pixiHoverOverlay.targetY = Math.max(
    halfHeight,
    Math.min(BOARD_SIZE - halfHeight, pixiHoverOverlay.pointerY)
  );
}

function handleBoardPointerMove(event) {
  if (!pixiHoverOverlay) return;
  var rect = pixiApp.view.getBoundingClientRect();
  pixiHoverOverlay.pointerX = ((event.clientX - rect.left) / rect.width) * BOARD_SIZE;
  pixiHoverOverlay.pointerY = ((event.clientY - rect.top) / rect.height) * BOARD_SIZE;
  pixiHoverOverlay.hasPointerPosition = true;
  updateHoverPointerTarget();
}

function handleBoardPointerLeave() {
  if (typeof handleMatrixPointerLeave === 'function') handleMatrixPointerLeave();
  if (!pixiHoverOverlay) return;
  pixiHoverOverlay.hasPointerPosition = false;
  pixiHoverOverlay.targetAlpha = 0;
}

function bindBoardPointerTracking() {
  pixiApp.view.addEventListener('pointermove', handleBoardPointerMove, { passive: true });
  pixiApp.view.addEventListener('pointerleave', handleBoardPointerLeave, { passive: true });
}

var HOVER_PULSE_DURATION_MS = 220;
var HOVER_PULSE_AMPLITUDE = 0.12;
var hoverPulseElapsedMs = null;

function triggerHoverPulse() {
  hoverPulseElapsedMs = 0;
}

function animateHoverOverlay(delta) {
  if (!pixiHoverOverlay) return;

  var isFadedOut = pixiHoverOverlay.alpha < 0.01 && pixiHoverOverlay.targetAlpha === 0;
  pixiHoverOverlay.visible = !isFadedOut;

  var alphaEase = 1 - Math.pow(0.65, delta);
  var moveEase = 1 - Math.pow(0.28, delta);
  if (pixiHoverOverlay.targetAlpha === 1) {
    pixiHoverOverlay.alpha = 1;
  } else {
    pixiHoverOverlay.alpha += (pixiHoverOverlay.targetAlpha - pixiHoverOverlay.alpha) * alphaEase;
  }
  pixiHoverOverlay.x += (pixiHoverOverlay.targetX - pixiHoverOverlay.x) * moveEase;
  pixiHoverOverlay.y += (pixiHoverOverlay.targetY - pixiHoverOverlay.y) * moveEase;

  if (hoverPulseElapsedMs !== null) {
    hoverPulseElapsedMs += pixiApp.ticker.deltaMS;
    var t = Math.min(1, hoverPulseElapsedMs / HOVER_PULSE_DURATION_MS);
    var eased = easeOutBackOvershoot(t);
    pixiHoverOverlay.scale.set(1 + (eased - 1) * HOVER_PULSE_AMPLITUDE);
    if (t >= 1) {
      pixiHoverOverlay.scale.set(1);
      hoverPulseElapsedMs = null;
    }
  }
}

var PLACEMENT_BOUNCE_DURATION_MS = 520;
var PLACEMENT_BOUNCE_AMPLITUDE = 0.24;
var PLACEMENT_BOUNCE_CYCLES = 2;
var PLACEMENT_DARKEN_FACTOR = 0.55;
var placementBounces = [];

function startCellPlacementBounce(r, c, colorHex) {
  var pCell = pixiCells[r * 9 + c];
  if (!pCell || !pCell.cellGroup || !pCell.visual) return;
  pixiGridContainer.addChild(pCell.cellGroup);
  placementBounces.push({
    visual: pCell.visual,
    bg: pCell.bg,
    gapCovers: [pCell.gapCoverV, pCell.gapCoverH, pCell.gapCoverCross].filter(Boolean),
    elapsedMs: 0,
    normalColor: colorHex,
    darkColor:
      typeof colorHex === 'number' ? darkenColorHex(colorHex, PLACEMENT_DARKEN_FACTOR) : null
  });
}

function applyPlacementTint(anim, colorHex) {
  if (!anim.bg || anim.darkColor === null) return;
  anim.bg.tint = colorHex;
  anim.gapCovers.forEach(function (cover) {
    if (cover.visible) cover.tint = colorHex;
  });
}

function animatePlacementBounces() {
  if (!placementBounces.length) return;

  for (var i = placementBounces.length - 1; i >= 0; i--) {
    var anim = placementBounces[i];
    anim.elapsedMs += pixiApp.ticker.deltaMS;
    var t = Math.min(1, anim.elapsedMs / PLACEMENT_BOUNCE_DURATION_MS);
    var envelope = Math.pow(1 - t, 1.5);
    var bump =
      Math.abs(Math.sin(t * Math.PI * PLACEMENT_BOUNCE_CYCLES)) *
      PLACEMENT_BOUNCE_AMPLITUDE *
      envelope;
    anim.visual.scale.set(1 + bump);

    applyPlacementTint(anim, lerpColorHex(anim.darkColor, anim.normalColor, t));

    if (t >= 1) {
      anim.visual.scale.set(1);
      applyPlacementTint(anim, anim.normalColor);
      placementBounces.splice(i, 1);
    }
  }
}

var MATCH_LINE_TWANG_DURATION_MS = 320;
var MATCH_LINE_TWANG_AMPLITUDE = 11;
var MATCH_LINE_TWANG_CYCLES = 8;
var currentMatchedLines = [];
var matchLineAnimElapsed = {};
var matchLinesNeedRedraw = true;

function updateMatchLinesTwangState(matchedLinesDetail) {
  var lines = matchedLinesDetail || [];

  lines.forEach(function (line) {
    if (!(line.lineId in matchLineAnimElapsed)) {
      matchLineAnimElapsed[line.lineId] = 0;
    }
  });

  Object.keys(matchLineAnimElapsed).forEach(function (id) {
    var stillPresent = lines.some(function (l) {
      return String(l.lineId) === id;
    });
    if (!stillPresent) delete matchLineAnimElapsed[id];
  });

  currentMatchedLines = lines;
  matchLinesNeedRedraw = true;
}

function getLineEndpoints(lineInfo) {
  var pos1 = getCellPos(lineInfo.start.r, lineInfo.start.c);
  var pos2 = getCellPos(lineInfo.end.r, lineInfo.end.c);
  var dr = Math.sign(lineInfo.end.r - lineInfo.start.r);
  var dc = Math.sign(lineInfo.end.c - lineInfo.start.c);

  return {
    x1: pos1.x + pos1.width / 2 - dc * (pos1.width / 2),
    y1: pos1.y + pos1.width / 2 - dr * (pos1.width / 2),
    x2: pos2.x + pos2.width / 2 + dc * (pos2.width / 2),
    y2: pos2.y + pos2.width / 2 + dr * (pos2.width / 2),
    isHorizontal: dr === 0
  };
}

function getLineTwangWobble(lineId) {
  var elapsed = matchLineAnimElapsed[lineId];
  if (elapsed === undefined || elapsed >= MATCH_LINE_TWANG_DURATION_MS) return 0;

  var t = elapsed / MATCH_LINE_TWANG_DURATION_MS;
  var decay = Math.pow(1 - t, 1.3);
  return Math.sin(t * Math.PI * MATCH_LINE_TWANG_CYCLES) * MATCH_LINE_TWANG_AMPLITUDE * decay;
}

function drawSingleMatchLine(lineInfo) {
  var p = getLineEndpoints(lineInfo);
  var wobble = getLineTwangWobble(lineInfo.lineId);

  pixiMatchGraphics.moveTo(p.x1, p.y1);
  if (wobble === 0) {
    pixiMatchGraphics.lineTo(p.x2, p.y2);
    return;
  }

  var midX = (p.x1 + p.x2) / 2 + (p.isHorizontal ? 0 : wobble);
  var midY = (p.y1 + p.y2) / 2 + (p.isHorizontal ? wobble : 0);
  pixiMatchGraphics.quadraticCurveTo(midX, midY, p.x2, p.y2);
}

function drawMatchLinesFrame() {
  if (!pixiMatchGraphics) return;
  pixiMatchGraphics.clear();
  if (!currentMatchedLines.length) return;

  pixiMatchGraphics.lineStyle(1.5, 0x000000, 1);
  currentMatchedLines.forEach(drawSingleMatchLine);
}

function animateMatchLinesTwang() {
  var stillAnimating = false;

  Object.keys(matchLineAnimElapsed).forEach(function (id) {
    if (matchLineAnimElapsed[id] < MATCH_LINE_TWANG_DURATION_MS) {
      matchLineAnimElapsed[id] += pixiApp.ticker.deltaMS;
      stillAnimating = true;
    }
  });

  if (stillAnimating || matchLinesNeedRedraw) {
    drawMatchLinesFrame();
    matchLinesNeedRedraw = false;
  }
}

function createGridUI() {
  if (pixiApp) return;

  pixiApp = createPixiApp();
  drawGridBackground(pixiApp);

  pixiGridContainer = new PIXI.Container();
  pixiApp.stage.addChild(pixiGridContainer);

  buildCellGrid();

  pixiHoverOverlay = createHoverOverlay();
  pixiGridContainer.addChild(pixiHoverOverlay);
  bindBoardPointerTracking();
  pixiApp.ticker.add(animateHoverOverlay);
  pixiApp.ticker.add(animatePlacementBounces);
  pixiApp.ticker.add(animateMatchLinesTwang);

  pixiMatchGraphics = new PIXI.Graphics();
  pixiApp.stage.addChild(pixiMatchGraphics);
}
