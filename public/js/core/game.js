var pieceDisplayEl = document.getElementById('current-piece-display');

var UNHOVER_DELAY_MS = 50;
var lastHoveredR = -1;
var lastHoveredC = -1;
var hoverTimeout = null;
var preferredAutoPlaceTurn = -1;
var preferredAutoPlaceSlotIdx = null;
var spectateFocusedPlayerId = null;

function getSlotIndexForCell(r, c) {
  return c * 3 + Math.floor(r / 3);
}

function findPlayerById(players) {
  if (!myPlayerId) return null;
  return players.find((p) => p.id === myPlayerId) || null;
}

function getMyPlayer(state) {
  if (!state || !state.players) return null;
  return findPlayerById(state.players);
}

function getFocusedSpectatePlayer(state) {
  if (!state || !state.players || state.players.length === 0) return null;
  return state.players.find((p) => p.id === spectateFocusedPlayerId) || state.players[0];
}

function resolveDisplayPlayer(state) {
  return isSpectating ? getFocusedSpectatePlayer(state) : getMyPlayer(state);
}

function handleFocusPlayer(playerId) {
  if (!isSpectating || !playerId || playerId === spectateFocusedPlayerId) return;
  spectateFocusedPlayerId = playerId;
  if (localRoomState) refreshLocalRoomView(localRoomState);
}

function isSlotEmptyOnBoard(board, coords) {
  return coords.every((coord) => board[coord.r][coord.c] === null);
}

function clearHoverTimeout() {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout);
    hoverTimeout = null;
  }
}

function setHoveredCell(r, c) {
  lastHoveredR = r;
  lastHoveredC = c;
}

function handleCellHoverIn(r, c) {
  clearHoverTimeout();

  var oldSlotIdx =
    lastHoveredC >= 0 && lastHoveredR >= 0 ? getSlotIndexForCell(lastHoveredR, lastHoveredC) : -1;
  var newSlotIdx = getSlotIndexForCell(r, c);

  var shouldRerender = oldSlotIdx !== newSlotIdx || lastHoveredR === -1;
  setHoveredCell(r, c);
  if (shouldRerender) render(localRoomState);
}

function handleCellHoverOut() {
  clearHoverTimeout();
  hoverTimeout = setTimeout(() => {
    setHoveredCell(-1, -1);
    render(localRoomState);
  }, UNHOVER_DELAY_MS);
}

function handleMatrixPointerLeave() {
  clearHoverTimeout();
  setHoveredCell(-1, -1);
  render(localRoomState);
}

function handleCellHover(r, c, isHover) {
  if (!localRoomState || localRoomState.status !== 'PLAYING') return;

  var myPlayer = getMyPlayer(localRoomState);
  if (!myPlayer) return;

  if (isHover) {
    handleCellHoverIn(r, c);
  } else {
    handleCellHoverOut();
  }
}

function handleCellClick(r, c) {
  try {
    if (window.isClickBlocked) return;

    if (!localRoomState || localRoomState.status !== 'PLAYING') {
      return;
    }

    var myPlayer = getMyPlayer(localRoomState);
    if (!myPlayer) {
      return;
    }

    if (myPlayer.hasPlacedThisRound) {
      return;
    }

    var myBoard = myPlayer.board;
    if (!myBoard) {
      return;
    }

    var slotIdx = getSlotIndexForCell(r, c);
    var coords = VERTICAL_SLOTS[slotIdx];
    if (!coords) {
      return;
    }

    if (!isSlotEmptyOnBoard(myBoard, coords)) {
      log('Vị trí này trên bàn của bạn đã bị ô khác chiếm!', 'server', 'triangle-alert');
      return;
    }

    var roomCodeToSend = currentRoomCode || (localRoomState ? localRoomState.roomCode : '');
    if (!roomCodeToSend) {
      return;
    }

    socket.emit('make_move', {
      roomCode: roomCodeToSend,
      slotIdx: slotIdx,
      turn: localRoomState.turn
    });
  } catch (err) {
    alert('Lỗi khi click: ' + err.message);
    console.error(err);
  }
}

function renderPieceDisplayMessage(message) {
  pieceDisplayEl.style.background = 'transparent';
  var box = document.createElement('div');
  box.className = 'piece-box-empty';
  box.textContent = message;
  pieceDisplayEl.appendChild(box);
}

function renderPieceDisplay(state) {
  pieceDisplayEl.innerHTML = '';

  if (!state.isGameStarted) {
    renderPieceDisplayMessage('Chưa bắt đầu ván mới...');
    return;
  }

  if (state.isGameOver) {
    pieceDisplayEl.style.background = 'transparent';
    return;
  }

  var displayPlayer = resolveDisplayPlayer(state);
  if (displayPlayer && displayPlayer.hasPlacedThisRound) {
    pieceDisplayEl.style.background = 'transparent';
    return;
  }

  var colorIndex = isSpectating
    ? displayPlayer
      ? displayPlayer.seatIndex
      : -1
    : myPlayerIndex;
  var myColorStr =
    typeof PLAYER_COLORS !== 'undefined' && colorIndex >= 0
      ? PLAYER_COLORS[colorIndex] || '#fbbf24'
      : '#fbbf24';
  pieceDisplayEl.style.background = myColorStr;

  state.currentPiece.forEach((num) => {
    var box = document.createElement('div');
    box.className = `piece-box num-${num}`;
    box.textContent = num;
    pieceDisplayEl.appendChild(box);
  });
}

function rgbValuesToHex(rgb) {
  return (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
}

var LAST_PLACED_DARKEN_FACTOR = 0.75;

function getMyDisplayColors(colorIndex) {
  var idx = typeof colorIndex === 'number' ? colorIndex : myPlayerIndex;
  var defaultColors = {
    colorHex: 0xfacc15,
    lastPlacedColorHex: 0xfacc15,
    hoverHex: 0xfef08a,
    textColor: '#854d0e'
  };
  if (typeof PLAYER_COLORS === 'undefined' || idx < 0) return defaultColors;

  var myColor = PLAYER_COLORS[idx];
  if (!myColor) return defaultColors;

  var rawColorHex = rgbValuesToHex(colorToRgbValues(myColor));
  var lastPlacedColorHex = darkenColorHex(rawColorHex, LAST_PLACED_DARKEN_FACTOR);
  return {
    colorHex: rawColorHex,
    lastPlacedColorHex: lastPlacedColorHex,
    hoverHex: rawColorHex,
    textColor: '#1a1a1a'
  };
}

function buildCellColorGrid(myBoard, colorHex, lastPlacedColorHex, lastPlacedCoords) {
  var cellColor = Array(9)
    .fill(null)
    .map(() => Array(9).fill(null));
  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      if (myBoard && myBoard[r] && myBoard[r][c] !== null) {
        cellColor[r][c] = colorHex;
      }
    }
  }
  (lastPlacedCoords || []).forEach((coord) => {
    if (cellColor[coord.r][coord.c] !== null) cellColor[coord.r][coord.c] = lastPlacedColorHex;
  });
  return cellColor;
}

function getHoverSlotInfo(state, myBoard, myHasPlaced) {
  var isHovering =
    state.status === 'PLAYING' &&
    !myHasPlaced &&
    Array.isArray(state.currentPiece) &&
    state.currentPiece.length === 3 &&
    lastHoveredR >= 0 &&
    lastHoveredC >= 0;
  if (!isHovering) return null;

  var slotIdx = getSlotIndexForCell(lastHoveredR, lastHoveredC);
  var coords = VERTICAL_SLOTS[slotIdx];
  if (!coords) return null;

  var isValid = coords.every((coord) => myBoard[coord.r] && myBoard[coord.r][coord.c] === null);
  return { slotIdx: slotIdx, coords: coords, isValid: isValid };
}

function syncPreferredAutoPlaceSlot(state, hoverInfo, myHasPlaced) {
  if (!state || state.status !== 'PLAYING' || myHasPlaced) return;

  var slotIdx = hoverInfo && hoverInfo.isValid ? hoverInfo.slotIdx : null;
  if (preferredAutoPlaceTurn === state.turn && preferredAutoPlaceSlotIdx === slotIdx) return;

  preferredAutoPlaceTurn = state.turn;
  preferredAutoPlaceSlotIdx = slotIdx;
  socket.emit('set_preferred_slot', { turn: state.turn, slotIdx: slotIdx });
}

var HOVER_OVERLAY_BLEED = 2.5;

function getHoverOverlayGeometry(hoverCoords) {
  var posTop = getCellPos(hoverCoords[0].r, hoverCoords[0].c);
  var posBot = getCellPos(hoverCoords[2].r, hoverCoords[2].c);
  return {
    posTop: posTop,
    width: posTop.width,
    height: posBot.y + posBot.width - posTop.y
  };
}

function positionHoverOverlay(geometry) {
  pixiGridContainer.addChild(pixiHoverOverlay);
  pixiHoverOverlay.pivot.set(geometry.width / 2, geometry.height / 2);
  pixiHoverOverlay.hoverWidth = geometry.width;
  pixiHoverOverlay.hoverHeight = geometry.height;
  if (pixiHoverOverlay.hasPointerPosition) {
    updateHoverPointerTarget();
  } else {
    pixiHoverOverlay.targetX = geometry.posTop.x + geometry.width / 2;
    pixiHoverOverlay.targetY = geometry.posTop.y + geometry.height / 2;
  }
  pixiHoverOverlay.targetAlpha = 1;

  if (pixiHoverOverlay.alpha < 0.05) {
    pixiHoverOverlay.x = pixiHoverOverlay.targetX;
    pixiHoverOverlay.y = pixiHoverOverlay.targetY;
  }
}

function drawHoverOverlayBackground(geometry, isValid, colors) {
  var bleed = HOVER_OVERLAY_BLEED;
  var bg = pixiHoverOverlay.children[0];
  bg.clear();
  bg.beginFill(isValid ? colors.hoverHex : 0xef4444, isValid ? 1 : 0.85);
  bg.drawRect(-bleed, -bleed, geometry.width + bleed * 2, geometry.height + bleed * 2);
  bg.endFill();
}

function drawHoverOverlayTexts(hoverCoords, geometry, isValid, hoverPiece, colors) {
  hoverCoords.forEach((coord, i) => {
    var p = getCellPos(coord.r, coord.c);
    var t = pixiHoverOverlay.texts[i];
    t.style.fill = isValid ? colors.textColor : '#fef2f2';
    t.text = hoverPiece[i];
    t.x = geometry.width / 2;
    t.y = p.y - geometry.posTop.y + p.width / 2;
  });
}

function updateHoverOverlay(hoverInfo, hoverPiece, colors) {
  if (!window.pixiHoverOverlay) return;

  if (!hoverInfo) {
    pixiHoverOverlay.targetAlpha = 0;
    pixiHoverOverlay.lastSlotKey = null;
    return;
  }

  var hoverCoords = hoverInfo.coords;
  var slotKey = hoverCoords[0].r + '_' + hoverCoords[0].c;
  if (pixiHoverOverlay.lastSlotKey !== slotKey) {
    var shouldPulse = pixiHoverOverlay.lastSlotKey === null;
    pixiHoverOverlay.lastSlotKey = slotKey;
    if (shouldPulse) triggerHoverPulse();
  }

  var geometry = getHoverOverlayGeometry(hoverCoords);
  positionHoverOverlay(geometry);
  drawHoverOverlayBackground(geometry, hoverInfo.isValid, colors);
  drawHoverOverlayTexts(hoverCoords, geometry, hoverInfo.isValid, hoverPiece, colors);
}

function updateGapCover(gapCover, shouldShow, colorHex) {
  if (!gapCover) return;
  gapCover.visible = shouldShow;
  if (shouldShow) gapCover.tint = colorHex;
}

function updateBoardCell(pCell, r, c, myBoard, cellColorGrid) {
  var color = cellColorGrid[r][c];
  pCell.bg.tint = color !== null ? color : 0xffffff;

  if (myBoard[r][c] !== null) {
    pCell.text.text = myBoard[r][c];
    pCell.text.style.fill = '#1a1a1a';
  } else {
    pCell.text.text = '';
  }
  pCell.text.alpha = 1;

  var colorDown = r < 8 ? cellColorGrid[r + 1][c] : null;
  updateGapCover(pCell.gapCoverV, color !== null && colorDown !== null, color);

  var colorRight = c < 8 ? cellColorGrid[r][c + 1] : null;
  updateGapCover(pCell.gapCoverH, color !== null && colorRight !== null, color);

  var colorDownRight = r < 8 && c < 8 ? cellColorGrid[r + 1][c + 1] : null;
  var showCross =
    color !== null && colorRight !== null && colorDown !== null && colorDownRight !== null;
  updateGapCover(pCell.gapCoverCross, showCross, color);
}

function updateBoardCells(myBoard, cellColorGrid) {
  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      var pCell = pixiCells[r * 9 + c];
      if (pCell) updateBoardCell(pCell, r, c, myBoard, cellColorGrid);
    }
  }
}

function updateBoardInteractivity(state, myHasPlaced) {
  var isPlaying = state.status === 'PLAYING' && !isSpectating;
  var isLocked = !isPlaying || myHasPlaced;
  pixiGridContainer.interactiveChildren = isPlaying;
  pixiGridContainer.cursor = isLocked ? 'not-allowed' : 'default';
}

var prevMyBoardSnapshot = null;
var prevFocusedPlayerId = null;
var lastPlacedCoords = [];

function resetGameVisualState() {
  clearHoverTimeout();
  setHoveredCell(-1, -1);
  preferredAutoPlaceTurn = -1;
  preferredAutoPlaceSlotIdx = null;
  spectateFocusedPlayerId = null;
  prevFocusedPlayerId = null;
  lastPlacedCoords = [];
  prevMyBoardSnapshot = null;
  if (typeof resetLeaderboardVisualState === 'function') resetLeaderboardVisualState();
  if (window.pixiHoverOverlay) {
    pixiHoverOverlay.targetAlpha = 0;
    pixiHoverOverlay.alpha = 0;
    pixiHoverOverlay.lastSlotKey = null;
    pixiHoverOverlay.hasPointerPosition = false;
  }
}

function triggerNewPlacementBounces(myBoard, lastPlacedColorHex) {
  var newlyPlaced = [];
  if (prevMyBoardSnapshot) {
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        var wasEmpty = prevMyBoardSnapshot[r][c] === null;
        var nowFilled = myBoard[r] && myBoard[r][c] !== null;
        if (wasEmpty && nowFilled) {
          newlyPlaced.push({ r: r, c: c });
          startCellPlacementBounce(r, c, lastPlacedColorHex);
        }
      }
    }
  }
  if (newlyPlaced.length) lastPlacedCoords = newlyPlaced;
  prevMyBoardSnapshot = myBoard.map((row) => row.slice());
}

function renderBoard(state, myPlayer) {
  if (!pixiCells || pixiCells.length !== 81) return;

  if (isSpectating && myPlayer.id !== prevFocusedPlayerId) {
    prevFocusedPlayerId = myPlayer.id;
    prevMyBoardSnapshot = null;
    lastPlacedCoords = [];
  }

  var myBoard = myPlayer.board;
  var myHasPlaced = myPlayer.hasPlacedThisRound;
  var colorIndex = isSpectating ? myPlayer.seatIndex : myPlayerIndex;
  var colors = getMyDisplayColors(colorIndex);

  triggerNewPlacementBounces(myBoard, colors.lastPlacedColorHex);

  var cellColorGrid = buildCellColorGrid(
    myBoard,
    colors.colorHex,
    colors.lastPlacedColorHex,
    lastPlacedCoords
  );

  var hoverInfo = getHoverSlotInfo(state, myBoard, myHasPlaced);
  syncPreferredAutoPlaceSlot(state, hoverInfo, myHasPlaced);
  updateHoverOverlay(hoverInfo, state.currentPiece, colors);

  updateBoardCells(myBoard, cellColorGrid);
  updateBoardInteractivity(state, myHasPlaced);
}

function render(state) {
  if (!state) return;

  renderScoreBreakdown(state);

  var myPlayer = resolveDisplayPlayer(state);
  if (!myPlayer) return;

  renderBoard(state, myPlayer);
  updateMatchLinesTwangState(myPlayer.matchedLines || []);
}
