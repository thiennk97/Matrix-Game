var socket = io();

// --- SOCKET LISTENERS ---
socket.on('connect', () => {
  log('🟢 Đã kết nối thành công tới Server Node.js!', 'server');
  showToast('🟢 Đã kết nối thành công tới Server WebSocket!');
});

socket.on('assigned_role', ({ role, roomCode }) => {
  myRole = role;
  currentRoomCode = roomCode;
  hasJoinedRoom = true;

  document.getElementById('lobby-setup-view').style.display = 'none';
  document.getElementById('lobby-room-view').style.display = 'flex';

  let roleName = role === 1 ? "Player 1 (Host)" : "Player 2 (Guest)";
  log(`👤 Bạn là ${roleName} trong phòng [${roomCode}]`, 'server');
  showToast(`🟢 Bạn đã vào phòng <strong>${roomCode}</strong> với vai trò: ${roleName}`);

  if (localRoomState) {
    updateUI(localRoomState);
    renderPieceDisplay(localRoomState);
    render(localRoomState);
  }
});

socket.on('room_state_update', (state) => {
  localRoomState = state;
  updateUI(state);
  renderPieceDisplay(state);
  render(state);
});

socket.on('timer_tick', ({ timeLeft }) => {
  updateTimerUI(timeLeft);
});

socket.on('game_started', () => {
  lobbyModalEl.style.display = 'none';
  log('🚀 SERVER ĐÃ KÍCH HOẠT BẮT ĐẦU TRẬN ĐẤU REALTIME!', 'server');
});

socket.on('error_message', (msg) => {
  showToast(msg);
  log(msg, 'server');
});

socket.on('game_over', (state) => {
  let winnerMsg = '';
  if (state.p1Score > state.p2Score) {
    winnerMsg = `🏆 ${state.p1Name} THẮNG! (MATRIX CHAMPION)`;
  } else if (state.p2Score > state.p1Score) {
    winnerMsg = `🏆 ${state.p2Name} THẮNG! (MATRIX CHAMPION)`;
  } else {
    winnerMsg = '🤝 TRẬN ĐẤU HÒA TỶ SỐ!';
  }

  document.getElementById('modal-winner').textContent = winnerMsg;
  document.getElementById('modal-scores').textContent = 
    `Tỷ số chung cuộc: ${state.p1Name} (${state.p1Score} PTS) - ${state.p2Name} (${state.p2Score} PTS)`;
  document.getElementById('victory-modal').classList.add('active');
});

// --- UI BUTTON EVENTS ---
document.getElementById('btn-random-code').addEventListener('click', () => {
  document.getElementById('room-code-input').value = 'MB-' + Math.floor(1000 + Math.random() * 9000);
});

document.getElementById('btn-join-room').addEventListener('click', () => {
  let codeInput = document.getElementById('room-code-input');
  let nameInput = document.getElementById('player-name-input');
  let code = (codeInput.value || 'MB-8888').trim().toUpperCase();
  let name = (nameInput.value || 'Player').trim();

  codeInput.value = code;
  currentRoomCode = code;

  if (!socket.connected) {
    showToast('⚠️ Đang kết nối tới Server Node.js... Vui lòng thử lại sau 2 giây.');
    log('⚠️ Chưa thể kết nối tới Server Node.js', 'server');
    return;
  }

  showToast(`⏳ Đang tạo / tham gia phòng <strong>${code}</strong>...`);
  socket.emit('join_room', {
    roomCode: code,
    playerName: name
  });
});

document.getElementById('btn-toggle-ready').addEventListener('click', () => {
  if (!currentRoomCode) return;
  socket.emit('toggle_ready', { roomCode: currentRoomCode });
});

document.getElementById('btn-start-game-server').addEventListener('click', () => {
  if (!currentRoomCode) return;
  socket.emit('start_game', { roomCode: currentRoomCode });
});

document.getElementById('btn-copy-code').addEventListener('click', () => {
  if (!currentRoomCode) return;
  navigator.clipboard.writeText(currentRoomCode).then(() => {
    showToast(`📋 Đã sao chép mã <strong>${currentRoomCode}</strong> vào bộ nhớ tạm!`);
  }).catch(() => {
    showToast(`Mã phòng của bạn: <strong>${currentRoomCode}</strong>`);
  });
});

document.getElementById('btn-leave-room').addEventListener('click', () => {
  document.getElementById('lobby-setup-view').style.display = 'flex';
  document.getElementById('lobby-room-view').style.display = 'none';
  hasJoinedRoom = false;
  showToast('🟢 Chọn tên & nhập mã phòng mới để vào phòng!');
});

document.getElementById('btn-open-lobby-modal').addEventListener('click', () => {
  lobbyModalEl.style.display = 'flex';
  if (hasJoinedRoom) {
    document.getElementById('lobby-setup-view').style.display = 'none';
    document.getElementById('lobby-room-view').style.display = 'flex';
  } else {
    document.getElementById('lobby-setup-view').style.display = 'flex';
    document.getElementById('lobby-room-view').style.display = 'none';
  }
});

document.getElementById('btn-modal-restart').addEventListener('click', () => {
  document.getElementById('victory-modal').classList.remove('active');
  lobbyModalEl.style.display = 'flex';
});

// INIT GRID UI AT STARTUP
createGridUI();
