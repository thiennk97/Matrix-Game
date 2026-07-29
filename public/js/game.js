var myPlayerIndex = -1;
var currentRoomCode = '';
var localRoomState = null;
var hasJoinedRoom = false;

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

  let myBoard = myPlayer.board;
  if (!myBoard) return;

  let slotIdx = c * 3 + Math.floor(r / 3);
  let coords = VERTICAL_SLOTS[slotIdx];
  if (!coords) return;

  let isSlotEmpty = coords.every(coord => myBoard[coord.r][coord.c] === null);
  if (!isSlotEmpty) return;

  let piece = localRoomState.currentPiece;
  coords.forEach((coord, idx) => {
    let cellIdx = coord.r * 9 + coord.c;
    let pCell = pixiCells[cellIdx];
    if (pCell) {
      if (isHover) {
        pCell.bg.tint = 0x0284c7; // hover blue
        if (piece && piece[idx] !== undefined) {
          pCell.text.text = piece[idx];
          pCell.text.style.fill = '#ffffff';
          pCell.text.alpha = 0.6;
        }
      } else {
        pCell.bg.tint = 0xFFFFFF; // white
        pCell.text.text = '';
        pCell.text.style.fill = '#000000';
        pCell.text.alpha = 1;
      }
    }
  });
}

function handleCellClick(r, c) {
  try {
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

  piecePanelLabelEl.textContent = '🍊 MẢNH GHÉP VÒNG (3x1):';
  piecePanelLabelEl.style.color = 'var(--matchbox-orange)';
  pieceDisplayEl.className = 'current-piece-vertical';

  let myPlayer = getMyPlayerBySocket(state);
  if (myPlayer && myPlayer.hasPlacedThisRound) {
    pieceDisplayEl.innerHTML = `<div style="font-size: 0.8rem; color: #a8a29e; text-align: center; font-family: 'Plus Jakarta Sans', sans-serif;">⏳ Đã hạ quân!<br><br>Đang chờ vòng mới...</div>`;
    return;
  }

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

  if (pixiCells && pixiCells.length === 81) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        let idx = r * 9 + c;
        let pCell = pixiCells[idx];
        let val = (myBoard && myBoard[r]) ? myBoard[r][c] : null;

        if (val !== null) {
          pCell.bg.tint = 0x38bdf8; // cyan
          pCell.text.text = val;
          pCell.text.style.fill = '#000000';
          pCell.text.alpha = 1;
        } else {
          pCell.bg.tint = 0xFFFFFF;
          pCell.text.text = '';
          pCell.text.style.fill = '#000000';
          pCell.text.alpha = 1;
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
  }

  renderSVGMatchLines(myMatchedLines || []);
  renderScoreBreakdown(state);
  renderMiniOpponentBoards(state);
}
