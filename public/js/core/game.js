var myPlayerIndex = -1;
var currentRoomCode = '';
var localRoomState = null;
var hasJoinedRoom = false;
var pieceDisplayEl = document.getElementById('current-piece-display');

var lastHoveredR = -1;
var lastHoveredC = -1;
var hoverTimeout = null;

function getMyPlayer(state) {
  if (!state || !state.players || myPlayerIndex < 0 || myPlayerIndex >= state.players.length) return null;
  return state.players[myPlayerIndex];
}

function getMyPlayerBySocket(state) {
  if (!state || !state.players) return null;
  if (myPlayerIndex >= 0 && myPlayerIndex < state.players.length) return state.players[myPlayerIndex];
  // fallback: find by socket id
  if (socket && socket.id) {
    let found = state.players.find(p => p.socketId === socket.id);
    if (found) return found;
  }
  return state.players[0] || null;
}

function handleCellHover(r, c, isHover) {
  if (!localRoomState || !localRoomState.isGameStarted) return;

  let myPlayer = getMyPlayerBySocket(localRoomState);
  if (!myPlayer || myPlayer.hasPlacedThisRound) return;

  if (isHover) {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
    
    let oldSlotIdx = (lastHoveredC >= 0 && lastHoveredR >= 0) ? (lastHoveredC * 3 + Math.floor(lastHoveredR / 3)) : -1;
    let newSlotIdx = c * 3 + Math.floor(r / 3);
    
    if (oldSlotIdx !== newSlotIdx || lastHoveredR === -1) {
      lastHoveredR = r;
      lastHoveredC = c;
      render(localRoomState);
    } else {
      lastHoveredR = r;
      lastHoveredC = c;
    }
  } else {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    // Delay un-hover slightly to prevent flickering when moving between cells
    hoverTimeout = setTimeout(() => {
      lastHoveredR = -1;
      lastHoveredC = -1;
      render(localRoomState);
    }, 50);
  }
}

function handleCellClick(r, c) {
  try {
    if (window.isClickBlocked) return;

    if (!localRoomState || !localRoomState.isGameStarted) {
      showToast('⚠️ Trận đấu chưa bắt đầu!');
      return;
    }

    let myPlayer = getMyPlayerBySocket(localRoomState);
    if (!myPlayer) {
      showToast('⚠️ Lỗi: Không tìm thấy dữ liệu người chơi!');
      return;
    }

    if (myPlayer.hasPlacedThisRound) {
      return;
    }

    let myBoard = myPlayer.board;
    if (!myBoard) {
      showToast('⚠️ Lỗi: Không tìm thấy dữ liệu bàn cờ!');
      return;
    }

    var slotIdx = c * 3 + Math.floor(r / 3);
    var coords = VERTICAL_SLOTS[slotIdx];
    if (!coords) {
      showToast('⚠️ Lỗi: Không tìm thấy toạ độ cho slotIdx: ' + slotIdx);
      return;
    }

    let isSlotEmpty = coords.every(coord => myBoard[coord.r][coord.c] === null);
    if (!isSlotEmpty) {
      log('⚠️ Vị trí này trên bàn của bạn đã bị ô khác chiếm!', 'server');
      showToast('⚠️ Vị trí này đã bị chiếm!');
      return;
    }

    let roomCodeToSend = currentRoomCode || (localRoomState ? localRoomState.roomCode : '');
    if (!roomCodeToSend) {
      showToast('⚠️ Không tìm thấy mã phòng hợp lệ!');
      return;
    }

    socket.emit('make_move', {
      roomCode: roomCodeToSend,
      slotIdx: slotIdx
    });
  } catch (err) {
    alert("Lỗi khi click: " + err.message);
    console.error(err);
  }
}

function renderPieceDisplay(state) {
  pieceDisplayEl.innerHTML = '';
  if (!state.isGameStarted) {
    pieceDisplayEl.innerHTML = `<div style="font-size: 0.8rem; color: #a8a29e; text-align: center;">Chưa bắt đầu ván mới...</div>`;
    return;
  }

  pieceDisplayEl.className = 'current-piece-vertical';

  let myPlayer = getMyPlayerBySocket(state);
  if (myPlayer && myPlayer.hasPlacedThisRound) {
    pieceDisplayEl.style.background = 'transparent';
    return;
  }
  
  pieceDisplayEl.style.background = '#fbbf24';

  state.currentPiece.forEach(num => {
    let box = document.createElement('div');
    box.className = `piece-box num-${num}`;
    box.textContent = num;
    pieceDisplayEl.appendChild(box);
  });
}

function render(state) {
  if (!state) return;

  let myPlayer = getMyPlayerBySocket(state);
  if (!myPlayer) return;

  let myBoard = myPlayer.board;
  let myHasPlaced = myPlayer.hasPlacedThisRound;
  let myMatchedLines = myPlayer.matchedLines;
  let hoverPiece = state.currentPiece;

  if (pixiCells && pixiCells.length === 81) {
    // Compute cell colors
    let cellColor = Array(9).fill(null).map(() => Array(9).fill(null));
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (myBoard && myBoard[r] && myBoard[r][c] !== null) {
          cellColor[r][c] = 0xfacc15;
        }
      }
    }

    // Hover piece smooth transition
    let isHovering = (!state.isGameOver && !myHasPlaced && hoverPiece && lastHoveredR >= 0 && lastHoveredC >= 0);
    let hoverCoords = null;
    
    if (isHovering) {
      let slotIdx = lastHoveredC * 3 + Math.floor(lastHoveredR / 3);
      hoverCoords = VERTICAL_SLOTS[slotIdx];
      if (!hoverCoords || !hoverCoords.every(coord => (myBoard[coord.r] && myBoard[coord.r][coord.c] === null))) {
        isHovering = false;
      }
    }

    if (isHovering && window.pixiHoverOverlay) {
      let posTop = getCellPos(hoverCoords[0].r, hoverCoords[0].c);
      let posBot = getCellPos(hoverCoords[2].r, hoverCoords[2].c);
      
      pixiHoverOverlay.targetX = posTop.x;
      pixiHoverOverlay.targetY = posTop.y;
      pixiHoverOverlay.targetAlpha = 1;
      
      let bgHeight = (posBot.y + posBot.width) - posTop.y;
      let bg = pixiHoverOverlay.children[0];
      bg.clear();
      bg.beginFill(0xfef08a);
      bg.drawRect(0, 0, posTop.width, bgHeight);
      bg.endFill();

      hoverCoords.forEach((coord, i) => {
        let p = getCellPos(coord.r, coord.c);
        let t = pixiHoverOverlay.texts[i];
        t.text = hoverPiece[i];
        t.x = posTop.width / 2;
        t.y = (p.y - posTop.y) + p.width / 2;
      });
      
      if (pixiHoverOverlay.alpha < 0.05) {
        pixiHoverOverlay.x = posTop.x;
        pixiHoverOverlay.y = posTop.y;
      }
    } else if (window.pixiHoverOverlay) {
      pixiHoverOverlay.targetAlpha = 0;
    }

    // Update board
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        let cellIdx = r * 9 + c;
        let pCell = pixiCells[cellIdx];
        if (pCell) {
          let color = cellColor[r][c];

          // Background
          if (color !== null) {
            pCell.bg.tint = color;
          } else {
            pCell.bg.tint = 0xFFFFFF;
          }

          // Text
          if (myBoard[r][c] !== null) {
            pCell.text.text = myBoard[r][c];
            pCell.text.style.fill = '#1a1a1a';
            pCell.text.alpha = 1;
          } else {
            pCell.text.text = '';
            pCell.text.alpha = 1;
          }

          // gapCoverV
          if (pCell.gapCoverV) {
            let colorDown = (r < 8) ? cellColor[r+1][c] : null;
            if (color !== null && colorDown !== null) {
              pCell.gapCoverV.visible = true;
              pCell.gapCoverV.tint = (color === 0xfacc15 || colorDown === 0xfacc15) ? 0xfacc15 : 0xfef08a;
            } else {
              pCell.gapCoverV.visible = false;
            }
          }

          // gapCoverH
          if (pCell.gapCoverH) {
            let colorRight = (c < 8) ? cellColor[r][c+1] : null;
            if (color !== null && colorRight !== null) {
              pCell.gapCoverH.visible = true;
              pCell.gapCoverH.tint = (color === 0xfacc15 || colorRight === 0xfacc15) ? 0xfacc15 : 0xfef08a;
            } else {
              pCell.gapCoverH.visible = false;
            }
          }

          // gapCoverCross
          if (pCell.gapCoverCross) {
            let cRight = (c < 8) ? cellColor[r][c+1] : null;
            let cDown = (r < 8) ? cellColor[r+1][c] : null;
            let cDownRight = (r < 8 && c < 8) ? cellColor[r+1][c+1] : null;
            if (color !== null && cRight !== null && cDown !== null && cDownRight !== null) {
              pCell.gapCoverCross.visible = true;
              pCell.gapCoverCross.tint = 0xfacc15;
            } else {
              pCell.gapCoverCross.visible = false;
            }
          }
        }
      }
    }

  if (!state.isGameStarted || myHasPlaced || state.isGameOver) {
    pixiGridContainer.interactiveChildren = false;
    pixiGridContainer.cursor = 'not-allowed';
  } else {
    pixiGridContainer.interactiveChildren = true;
    pixiGridContainer.cursor = 'default';
  }
  
  // Removed explicit hover text drawing as it is now handled by pixiHoverOverlay

  }

  renderSVGMatchLines(myMatchedLines || []);
  renderScoreBreakdown(state);
}
