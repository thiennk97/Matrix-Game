var MINI_CELL_SIZE = 16;
var opponentCardCache = {};

function getOpponentTheme(playerIndex) {
  var solid = getPlayerColor(playerIndex);
  return {
    solid: solid,
    bg: colorWithAlpha(solid, 0.15),
    border: colorWithAlpha(solid, 0.3)
  };
}

function shouldShowOpponents(state) {
  if (!state || !state.players || !state.isGameStarted) return false;
  return isSpectating ? state.players.length > 0 : state.players.length > 1;
}

function createMiniGridCells() {
  var miniGrid = document.createElement('div');
  miniGrid.className = 'mini-grid-9x9';

  var cellEls = [];
  for (var r = 0; r < 9; r++) {
    var rowEls = [];
    for (var c = 0; c < 9; c++) {
      var cell = document.createElement('div');
      cell.className = 'mini-cell';
      miniGrid.appendChild(cell);
      rowEls.push(cell);
    }
    cellEls.push(rowEls);
  }
  return { miniGrid: miniGrid, cellEls: cellEls };
}

function createMatchLinesSvgLayer() {
  var svgLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgLayer.setAttribute('width', '100%');
  svgLayer.setAttribute('height', '100%');
  svgLayer.style.position = 'absolute';
  svgLayer.style.top = '0';
  svgLayer.style.left = '0';
  svgLayer.style.pointerEvents = 'none';
  svgLayer.className = 'ob-svg-layer';
  return svgLayer;
}

function createOpponentCard(playerId, theme) {
  var card = document.createElement('div');
  card.className = 'opponent-board-card';
  card.id = 'opponent-board-' + playerId;
  card.style.background = theme.bg;
  card.style.borderColor = theme.border;

  var grid = createMiniGridCells();
  var svgLayer = createMatchLinesSvgLayer();
  grid.miniGrid.appendChild(svgLayer);
  card.appendChild(grid.miniGrid);

  var infoEl = document.createElement('div');
  infoEl.className = 'ob-info';
  card.appendChild(infoEl);

  var nameEl = document.createElement('div');
  nameEl.className = 'ob-name';
  nameEl.style.color = theme.solid;
  infoEl.appendChild(nameEl);

  return {
    card: card,
    nameEl: nameEl,
    cellEls: grid.cellEls,
    svgLayer: svgLayer,
    lastMatchLinesSignature: null
  };
}

function getOrCreateOpponentCard(container, playerId, theme) {
  var cached = opponentCardCache[playerId];
  if (cached) return cached;

  cached = createOpponentCard(playerId, theme);
  container.appendChild(cached.card);
  opponentCardCache[playerId] = cached;
  return cached;
}

function updateOpponentCardHeader(entry, player) {
  entry.nameEl.textContent = player.name;
}

function updateOpponentCells(cellEls, board, themeColor) {
  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      var cell = cellEls[r][c];
      var val = board && board[r] ? board[r][c] : null;
      if (val !== null) {
        if (cell.textContent != val) cell.textContent = val;
        cell.style.background = themeColor;
      } else {
        if (cell.textContent != '') cell.textContent = '';
        cell.style.background = '#fff';
      }
      cell.style.color = '#000';
    }
  }
}

function getMiniCellCenter(r, c) {
  return {
    x: 1 + c * MINI_CELL_SIZE + MINI_CELL_SIZE / 2,
    y: 1 + r * MINI_CELL_SIZE + MINI_CELL_SIZE / 2
  };
}

function createMatchLineSvgElement(line) {
  var dc = Math.sign(line.end.c - line.start.c);
  var dr = Math.sign(line.end.r - line.start.r);
  var half = MINI_CELL_SIZE / 2;

  var start = getMiniCellCenter(line.start.r, line.start.c);
  var end = getMiniCellCenter(line.end.r, line.end.c);

  var svgLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  svgLine.setAttribute('x1', start.x - dc * half);
  svgLine.setAttribute('y1', start.y - dr * half);
  svgLine.setAttribute('x2', end.x + dc * half);
  svgLine.setAttribute('y2', end.y + dr * half);
  svgLine.setAttribute('stroke', '#000');
  svgLine.setAttribute('stroke-width', '1.5');
  return svgLine;
}

function getMatchLinesSignature(matchedLines) {
  if (!matchedLines || matchedLines.length === 0) return '';
  return matchedLines
    .map((l) => `${l.lineId}:${l.start.r},${l.start.c}-${l.end.r},${l.end.c}`)
    .join('|');
}

function updateOpponentMatchLines(entry, matchedLines) {
  var signature = getMatchLinesSignature(matchedLines);
  if (entry.lastMatchLinesSignature === signature) return;
  entry.lastMatchLinesSignature = signature;

  entry.svgLayer.innerHTML = '';
  (matchedLines || []).forEach((line) => {
    entry.svgLayer.appendChild(createMatchLineSvgElement(line));
  });
}

function removeStaleOpponentCards(activePlayerIds) {
  Object.keys(opponentCardCache).forEach((playerId) => {
    if (activePlayerIds.has(playerId)) return;
    opponentCardCache[playerId].card.remove();
    delete opponentCardCache[playerId];
  });
}

function renderOpponentBoards(state) {
  var container = document.getElementById('opponents-boards-container');
  var section = document.getElementById('opponents-section');
  if (!container || !section) return;

  if (!shouldShowOpponents(state)) {
    section.style.display = 'none';
    return;
  }
  section.style.display = '';

  var activePlayerIds = new Set();

  state.players.forEach((player, idx) => {
    if (idx === myPlayerIndex || !player.id) return;

    activePlayerIds.add(player.id);
    var theme = getOpponentTheme(idx);
    var entry = getOrCreateOpponentCard(container, player.id, theme);

    updateOpponentCardHeader(entry, player);
    updateOpponentCells(entry.cellEls, player.board, theme.solid);
    updateOpponentMatchLines(entry, player.matchedLines);

    if (isSpectating) {
      entry.card.style.cursor = 'pointer';
      var isFocused = player.id === spectateFocusedPlayerId;
      entry.card.style.boxShadow = isFocused ? '0 0 0 3px ' + theme.solid : '';
      entry.card.onclick = () => handleFocusPlayer(player.id);
    } else {
      entry.card.style.cursor = 'default';
      entry.card.style.boxShadow = '';
      entry.card.onclick = null;
    }
  });

  removeStaleOpponentCards(activePlayerIds);
}
