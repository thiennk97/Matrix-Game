var socket = io();

// --- SOCKET LISTENERS ---
socket.on('connect', () => {
  log('🟢 Đã kết nối thành công tới Server Node.js!', 'server');
  showToast('🟢 Đã kết nối thành công tới Server WebSocket!');
});

socket.on('assigned_role', ({ playerIndex, roomCode }) => {
  myPlayerIndex = playerIndex;
  currentRoomCode = roomCode;
  hasJoinedRoom = true;

  document.getElementById('lobby-setup-view').style.display = 'none';
  document.getElementById('lobby-room-view').style.display = 'flex';

  let roleName = playerIndex === 0 ? `Player 1 (Host)` : `Player ${playerIndex + 1}`;
  log(`👤 Bạn là ${roleName} trong phòng [${roomCode}]`, 'server');
  showToast(`🟢 Bạn đã vào phòng <strong>${roomCode}</strong><br>Vai trò: ${roleName}`);

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
  showToast(msg.replace(/\n/g, '<br>'));
  log(msg, 'server');
});

socket.on('game_over', (state) => {
  // Sort players by score descending
  let sorted = state.players.slice().sort((a, b) => b.score - a.score);
  let maxScore = sorted[0] ? sorted[0].score : 1;
  
  let winnerMsg = `🏆 ${sorted[0].name} THẮNG!`;
  if (sorted.length > 1 && sorted[0].score === sorted[1].score) {
    winnerMsg = '🤝 HÒA TỶ SỐ!';
  }

  document.getElementById('modal-winner').textContent = winnerMsg;
  
  let rankColors = ['#fcd34d', '#c0c0c0', '#cd7f32', '#a8a29e'];
  let rankLabels = ['🥇 HẠNG 1', '🥈 HẠNG 2', '🥉 HẠNG 3', '▪️ HẠNG 4'];
  let rankBg = ['rgba(252,211,77,0.12)', 'rgba(192,192,192,0.10)', 'rgba(205,127,50,0.10)', 'rgba(168,162,158,0.06)'];
  
  let scoresHtml = sorted.map((p, i) => {
    let barWidth = maxScore > 0 ? Math.max(8, Math.round((p.score / maxScore) * 100)) : 8;
    return `
      <div class="rank-card" style="border-color:${rankColors[i]};background:${rankBg[i]};">
        <div class="rank-badge" style="color:${rankColors[i]};">${rankLabels[i]}</div>
        <div class="rank-name">${p.name}</div>
        <div class="rank-score" style="color:${rankColors[i]};">${p.score} PTS</div>
        <div class="rank-bar-bg"><div class="rank-bar-fill" style="width:${barWidth}%;background:${rankColors[i]};"></div></div>
      </div>`;
  }).join('');
  
  document.getElementById('modal-scores').innerHTML = scoresHtml;
  document.getElementById('victory-modal').classList.add('active');
});

// --- UI BUTTON EVENTS ---
document.getElementById('btn-random-code').addEventListener('click', () => {
  document.getElementById('room-code-input').value = 'MB-' + Math.floor(1000 + Math.random() * 9000);
});

document.getElementById('btn-join-room').addEventListener('click', () => {
  let codeInput = document.getElementById('room-code-input');
  let nameInput = document.getElementById('player-name-input');
  let name = (nameInput.value || '').trim();
  let code = (codeInput.value || 'MB-8888').trim().toUpperCase();

  // Validate: tên bắt buộc
  if (!name || name.length === 0) {
    showToast('⚠️ Bạn phải nhập <strong>TÊN</strong> trước khi vào phòng!');
    nameInput.focus();
    nameInput.style.borderColor = 'var(--matchbox-red)';
    nameInput.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.4)';
    setTimeout(() => {
      nameInput.style.borderColor = '';
      nameInput.style.boxShadow = '';
    }, 2000);
    return;
  }

  codeInput.value = code;
  currentRoomCode = code;

  if (!socket.connected) {
    showToast('⚠️ Đang kết nối tới Server Node.js...<br>Vui lòng thử lại sau 2 giây.');
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
  let timerSelect = document.getElementById('timer-select');
  let turnTimeLimit = timerSelect ? Number(timerSelect.value) : 8;
  socket.emit('start_game', { roomCode: currentRoomCode, turnTimeLimit: turnTimeLimit });
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
