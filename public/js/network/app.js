var socket = io();
const lobbyModalEl = document.getElementById('lobby-modal');

// --- SOCKET LISTENERS ---
socket.on('connect', () => {
  log('🟢 Đã kết nối thành công tới Server Node.js!', 'server');
  showToast('🟢 Kết nối thành công tới Đấu Trường Ponos, nơi bạn tỏa sáng!');
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

let currentTurn = -1;

socket.on('room_state_update', (state) => {
  // Prevent accidental clicks for 0.5s when a new turn starts
  if (state && state.turn !== currentTurn) {
    currentTurn = state.turn;
    window.isClickBlocked = true;
    setTimeout(() => {
      window.isClickBlocked = false;
    }, 500);
  }

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
  // Update UI to reflect the final board state (e.g. auto-placed pieces on last turn)
  localRoomState = state;
  updateUI(state);
  render(state);

  // Sort players by score descending
  let sorted = state.players.slice().sort((a, b) => b.score - a.score);
  let maxScore = sorted[0] ? sorted[0].score : 1;
  
  let winnerMsg = `🏆 ${sorted[0].name} LÀM BỐ!`;
  if (sorted.length > 1 && sorted[0].score === sorted[1].score) {
    winnerMsg = '🤝 HÒA TỶ SỐ!';
  }

  document.getElementById('modal-winner').textContent = winnerMsg;
  
  let rankColors = ['#fcd34d', '#c0c0c0', '#cd7f32', '#a8a29e', '#a8a29e', '#a8a29e', '#a8a29e', '#a8a29e'];
  let rankLabels = ['🥇 1', '🥈 2', '🥉 3', '4', '5', '6', '7', '8'];
  let rankBg = [
    'rgba(252,211,77,0.12)', 'rgba(192,192,192,0.10)', 'rgba(205,127,50,0.10)',
    'rgba(168,162,158,0.06)', 'rgba(168,162,158,0.06)', 'rgba(168,162,158,0.06)',
    'rgba(168,162,158,0.06)', 'rgba(168,162,158,0.06)'
  ];
  
  let scoresHtml = sorted.map((p, i) => {
    let barWidth = maxScore > 0 ? Math.max(8, Math.round((p.score / maxScore) * 100)) : 8;
    return `
      <div class="rank-card" style="border-color:${rankColors[i]};background:${rankBg[i]};">
        <div class="rank-badge" style="color:${rankColors[i]};">${rankLabels[i]}</div>
        <div class="rank-name">${p.name}</div>
        <div class="rank-score" style="color:${rankColors[i]};">${p.score}</div>
        <div class="rank-bar-bg"><div class="rank-bar-fill" style="width:${barWidth}%;background:${rankColors[i]};"></div></div>
      </div>`;
  }).join('');
  
  document.getElementById('modal-scores').innerHTML = scoresHtml;
  document.getElementById('victory-modal').classList.add('active');
});

// --- UI BUTTON EVENTS ---

document.getElementById('btn-join-room').addEventListener('click', () => {
  let nameInput = document.getElementById('player-name-input');
  let roomCodeInput = document.getElementById('room-code-input');
  let name = (nameInput ? nameInput.value : '').trim();
  let code = (roomCodeInput ? roomCodeInput.value : '').trim().toUpperCase() || 'GLOBAL';

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

document.getElementById('btn-leave-room').addEventListener('click', () => {
  if (currentRoomCode) {
    socket.emit('leave_room', { roomCode: currentRoomCode });
    currentRoomCode = '';
  }
  document.getElementById('lobby-setup-view').style.display = 'flex';
  document.getElementById('lobby-room-view').style.display = 'none';
  hasJoinedRoom = false;
  showToast('🟢 Chọn tên & nhập mã phòng mới để vào phòng!');
});

let btnOpenLobby = document.getElementById('btn-open-lobby-modal');
if (btnOpenLobby) {
  btnOpenLobby.addEventListener('click', () => {
    lobbyModalEl.style.display = 'flex';
    if (hasJoinedRoom) {
      document.getElementById('lobby-setup-view').style.display = 'none';
      document.getElementById('lobby-room-view').style.display = 'flex';
    } else {
      document.getElementById('lobby-setup-view').style.display = 'flex';
      document.getElementById('lobby-room-view').style.display = 'none';
    }
  });
}

document.getElementById('btn-modal-restart').addEventListener('click', () => {
  document.getElementById('victory-modal').classList.remove('active');
  lobbyModalEl.style.display = 'flex';
});

document.getElementById('btn-close-victory').addEventListener('click', () => {
  document.getElementById('victory-modal').classList.remove('active');
});

// INIT GRID UI AT STARTUP
createGridUI();

// --- CHAT LOGIC ---
const chatInput = document.getElementById('chat-input');
const btnSendChat = document.getElementById('btn-send-chat');
// chatMessagesEl is declared in hud.js
const chatHeader = document.getElementById('chat-header');
const chatWidget = document.getElementById('chat-widget');

chatHeader.addEventListener('click', () => {
  chatWidget.classList.toggle('collapsed');
  document.getElementById('chat-toggle-icon').textContent = chatWidget.classList.contains('collapsed') ? '▲' : '▼';
});

function sendChatMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  socket.emit('chat_message', text);
  chatInput.value = '';
}

btnSendChat.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendChatMessage();
});

socket.on('chat_message', ({ sender, msg, id }) => {
  if (!chatMessagesEl) return;
  let item = document.createElement('div');
  let isMe = id === socket.id;
  item.className = `chat-msg ${isMe ? 'me' : 'other'}`;
  
  if (!isMe) {
    let author = document.createElement('div');
    author.className = 'chat-msg-author';
    author.textContent = sender;
    item.appendChild(author);
  }
  
  let content = document.createElement('div');
  content.textContent = msg;
  item.appendChild(content);
  
  chatMessagesEl.appendChild(item);
  
  while (chatMessagesEl.children.length > 50) {
    chatMessagesEl.removeChild(chatMessagesEl.firstChild);
  }
  
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
});
