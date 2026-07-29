var myRole = 0;
var currentRoomCode = '';
var localRoomState = null;
var hasJoinedRoom = false;

function getEffectiveRole(state) {
  if (myRole === 1 || myRole === 2) return myRole;
  if (state) {
    if (socket && socket.id && socket.id === state.p1SocketId) return 1;
    if (socket && socket.id && socket.id === state.p2SocketId) return 2;
  }
  return 1;
}

function handleCellHover(r, c, isHover) {
  if (!localRoomState || !localRoomState.isGameStarted) return;

  let role = getEffectiveRole(localRoomState);
  let myHasPlaced = role === 1 ? localRoomState.p1HasPlacedThisRound : localRoomState.p2HasPlacedThisRound;
  if (myHasPlaced) return;

  let myBoard = role === 1 ? localRoomState.p1Board : localRoomState.p2Board;
  if (!myBoard) return;

  let slotIdx = c * 3 + Math.floor(r / 3);
  let coords = VERTICAL_SLOTS[slotIdx];
  if (!coords) return;

  let isSlotEmpty = coords.every(coord => myBoard[coord.r][coord.c] === null);
  if (!isSlotEmpty) return;

  coords.forEach(coord => {
    let cellIdx = coord.r * 9 + coord.c;
    let cellEl = gridEl.children[cellIdx];
    if (cellEl) {
      if (isHover) {
        cellEl.classList.add('vslot-hover');
      } else {
        cellEl.classList.remove('vslot-hover');
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

    let role = getEffectiveRole(localRoomState);
    let myHasPlaced = role === 1 ? localRoomState.p1HasPlacedThisRound : localRoomState.p2HasPlacedThisRound;
    if (myHasPlaced) {
      log('⚠️ Bạn đã hạ quân vòng này rồi, hãy chờ hết 10s sang vòng tiếp theo!', 'server');
      showToast('⏳ Bạn đã hạ quân vòng này rồi! Đang chờ hết 10s...');
      return;
    }

    let myBoard = role === 1 ? localRoomState.p1Board : localRoomState.p2Board;
    if (!myBoard) {
      showToast('⚠️ Lỗi: Không tìm thấy dữ liệu bàn cờ (myBoard là undefined). Role: ' + role);
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

  let role = getEffectiveRole(state);
  let myHasPlaced = role === 1 ? state.p1HasPlacedThisRound : state.p2HasPlacedThisRound;

  if (myHasPlaced) {
    pieceDisplayEl.innerHTML = `<div style="font-size: 0.8rem; color: var(--matchbox-gold); text-align: center;">⏳ Đã hạ quân! Đang chờ hết 10s sang vòng tiếp...</div>`;
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

  let role = getEffectiveRole(state);
  let myBoard = role === 1 ? state.p1Board : state.p2Board;
  let myHasPlaced = role === 1 ? state.p1HasPlacedThisRound : state.p2HasPlacedThisRound;
  let myMatchedLines = role === 1 ? state.p1MatchedLines : state.p2MatchedLines;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      let idx = r * 9 + c;
      let cellEl = gridEl.children[idx];
      let val = (myBoard && myBoard[r]) ? myBoard[r][c] : null;

      cellEl.className = 'cell';

      if (val !== null) {
        cellEl.classList.add('has-num', `num-${val}`);
        cellEl.textContent = val;
      } else {
        cellEl.textContent = '';
      }
    }
  }

  if (myHasPlaced) {
    gridEl.classList.add('locked');
  } else {
    gridEl.classList.remove('locked');
  }

  renderSVGMatchLines(myMatchedLines || []);
  renderScoreBreakdown(state);
  renderMiniOpponentBoard(state);
}
