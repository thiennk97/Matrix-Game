// PixiJS Globals
var pixiApp;
var pixiGridContainer;
var pixiCells = [];
var pixiMatchGraphics;

function getCellPos(r, c) {
  const CELL_W = 50;
  const GAP = 1.5;
  const BLOCK_GAP = 0.5;
  const PADDING = 2;

  let blockRow = Math.floor(r / 3);
  let blockCol = Math.floor(c / 3);
  
  let x = PADDING + c * (CELL_W + GAP) + blockCol * BLOCK_GAP;
  let y = PADDING + r * (CELL_W + GAP) + blockRow * BLOCK_GAP;
  
  let gapX = (c % 3 === 2) ? (GAP + BLOCK_GAP) : GAP;
  let gapY = (r % 3 === 2) ? (GAP + BLOCK_GAP) : GAP;

  return { x, y, width: CELL_W, gapX, gapY };
}

function createGridUI() {
  if (pixiApp) return;

  pixiApp = new PIXI.Application({
    width: 467,
    height: 467,
    backgroundColor: 0xFFFFFF,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  let container = document.getElementById('pixi-board-container');
  container.innerHTML = '';
  container.appendChild(pixiApp.view);
  
  container.style.width = '467px';
  container.style.height = '467px';

  // Background wrapper for the grid
  let gridBg = new PIXI.Graphics();
  gridBg.beginFill(0x1a1a1a);
  gridBg.drawRect(0, 0, 467, 467);
  gridBg.endFill();
  pixiApp.stage.addChild(gridBg);

  pixiGridContainer = new PIXI.Container();
  pixiApp.stage.addChild(pixiGridContainer);

  pixiCells = [];

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      let pos = getCellPos(r, c);

      let cellGroup = new PIXI.Container();
      cellGroup.x = pos.x;
      cellGroup.y = pos.y;
      cellGroup.interactive = true;
      cellGroup.cursor = 'pointer';
      
      cellGroup.hitArea = new PIXI.Rectangle(-4, -4, pos.width + 8, pos.width + 8);

      let bg = new PIXI.Graphics();
      bg.beginFill(0xFFFFFF);
      bg.drawRect(0, 0, pos.width, pos.width);
      bg.endFill();
      cellGroup.addChild(bg);
      
      let gapCoverV = null;
      if (r < 8) {
        gapCoverV = new PIXI.Graphics();
        gapCoverV.beginFill(0xFFFFFF);
        gapCoverV.drawRect(0, pos.width, pos.width, pos.gapY);
        gapCoverV.endFill();
        gapCoverV.visible = false;
        cellGroup.addChild(gapCoverV);
      }

      let gapCoverH = null;
      if (c < 8) {
        gapCoverH = new PIXI.Graphics();
        gapCoverH.beginFill(0xFFFFFF);
        gapCoverH.drawRect(pos.width, 0, pos.gapX, pos.width);
        gapCoverH.endFill();
        gapCoverH.visible = false;
        cellGroup.addChild(gapCoverH);
      }

      let gapCoverCross = null;
      if (r < 8 && c < 8) {
        gapCoverCross = new PIXI.Graphics();
        gapCoverCross.beginFill(0xFFFFFF);
        gapCoverCross.drawRect(pos.width, pos.width, pos.gapX, pos.gapY);
        gapCoverCross.endFill();
        gapCoverCross.visible = false;
        cellGroup.addChild(gapCoverCross);
      }

      let text = new PIXI.Text('', {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 28,
        fontWeight: '600',
        fill: '#1a1a1a'
      });
      text.anchor.set(0.5);
      text.x = pos.width / 2;
      text.y = pos.width / 2;
      cellGroup.addChild(text);

      cellGroup.on('pointerover', () => handleCellHover(r, c, true));
      cellGroup.on('pointerout', () => handleCellHover(r, c, false));
      cellGroup.on('pointerdown', () => handleCellClick(r, c));

      pixiGridContainer.addChild(cellGroup);
      pixiCells.push({ bg, text, gapCoverV, gapCoverH, gapCoverCross });
    }
  }

  // Create smooth hover overlay
  pixiHoverOverlay = new PIXI.Container();
  pixiHoverOverlay.visible = false;
  pixiHoverOverlay.alpha = 0;
  
  let hoverBg = new PIXI.Graphics();
  pixiHoverOverlay.addChild(hoverBg);
  
  pixiHoverOverlay.texts = [];
  for(let i = 0; i < 3; i++) {
    let t = new PIXI.Text('', {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 28,
        fontWeight: '600',
        fill: '#854d0e' // Dark gold text to match previous style
    });
    t.anchor.set(0.5);
    t.alpha = 0.8;
    pixiHoverOverlay.addChild(t);
    pixiHoverOverlay.texts.push(t);
  }
  
  pixiGridContainer.addChild(pixiHoverOverlay);

  pixiHoverOverlay.targetX = 0;
  pixiHoverOverlay.targetY = 0;
  pixiHoverOverlay.targetAlpha = 0;

  pixiApp.ticker.add((delta) => {
    if (pixiHoverOverlay) {
      if (pixiHoverOverlay.alpha < 0.01 && pixiHoverOverlay.targetAlpha === 0) {
        pixiHoverOverlay.visible = false;
      } else {
        pixiHoverOverlay.visible = true;
      }
      
      pixiHoverOverlay.alpha += (pixiHoverOverlay.targetAlpha - pixiHoverOverlay.alpha) * 0.2 * delta;
      pixiHoverOverlay.x += (pixiHoverOverlay.targetX - pixiHoverOverlay.x) * 0.4 * delta;
      pixiHoverOverlay.y += (pixiHoverOverlay.targetY - pixiHoverOverlay.y) * 0.4 * delta;
    }
  });

  pixiMatchGraphics = new PIXI.Graphics();
  pixiApp.stage.addChild(pixiMatchGraphics);
}

function renderSVGMatchLines(matchedLinesDetail) {
  if (!pixiMatchGraphics) return;
  pixiMatchGraphics.clear();
  if (!matchedLinesDetail || !matchedLinesDetail.length) return;
  pixiMatchGraphics.lineStyle(1.5, 0x000000, 1);

  matchedLinesDetail.forEach(lineInfo => {
    let pos1 = getCellPos(lineInfo.start.r, lineInfo.start.c);
    let pos2 = getCellPos(lineInfo.end.r, lineInfo.end.c);

    let dr = Math.sign(lineInfo.end.r - lineInfo.start.r);
    let dc = Math.sign(lineInfo.end.c - lineInfo.start.c);

    let x1 = pos1.x + pos1.width / 2 - dc * (pos1.width / 2);
    let y1 = pos1.y + pos1.width / 2 - dr * (pos1.width / 2);
    let x2 = pos2.x + pos2.width / 2 + dc * (pos2.width / 2);
    let y2 = pos2.y + pos2.width / 2 + dr * (pos2.width / 2);

    pixiMatchGraphics.moveTo(x1, y1);
    pixiMatchGraphics.lineTo(x2, y2);
  });
}
