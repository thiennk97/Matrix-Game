var timerTextEl = document.getElementById('timer-text-val');
var timerBarFillEl = document.getElementById('timer-bar-fill');
var matchListEl = document.getElementById('match-list-details');
var chatMessagesEl = document.getElementById('chat-messages');

function log(msg, type = 'info') {
  if (!chatMessagesEl) return;
  let item = document.createElement('div');
  item.className = `chat-msg system ${type}`;
  item.textContent = `[System] ${msg}`;
  chatMessagesEl.appendChild(item);
  
  while (chatMessagesEl.children.length > 50) {
    chatMessagesEl.removeChild(chatMessagesEl.firstChild);
  }
  
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function renderScoreBreakdown(state) {
  if (!state || !state.players) return;

  matchListEl.innerHTML = '';
  
  let rankedPlayers = [...state.players].sort((a, b) => (b.score || 0) - (a.score || 0));

  if (rankedPlayers.length === 0) {
    matchListEl.innerHTML = `<div style="font-size: 0.78rem; color: #78716c; text-align: center; padding: 0.8rem;">Chưa có dữ liệu...</div>`;
    return;
  }

  rankedPlayers.forEach((p, index) => {
    let row = document.createElement('div');
    row.className = 'match-item active';
    let isMe = socket && p.socketId === socket.id;
    if (isMe) {
      row.style.background = 'rgba(251, 191, 36, 0.1)';
      row.style.borderColor = 'rgba(251, 191, 36, 0.3)';
    } else {
      row.style.cursor = 'pointer';
      row.onclick = () => {
        if (p.socketId) {
          let target = document.getElementById('opponent-board-' + p.socketId);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.style.boxShadow = '0 0 20px var(--matchbox-cyan)';
            setTimeout(() => target.style.boxShadow = '', 2000);
          }
        }
      };
    }
    
    row.innerHTML = `
      <div>
        <strong style="color: ${isMe ? '#fbbf24' : '#e2e8f0'};">Hạng ${index + 1}: ${p.name || 'Unknown'}</strong>
      </div>
      <div class="match-tag" style="background: ${isMe ? '#fbbf24' : 'rgba(255,255,255,0.1)'}; color: ${isMe ? '#000' : '#fff'};">${p.score || 0} PTS</div>
    `;
    matchListEl.appendChild(row);
  });
}

function updateTimerUI(timeLeft) {
  let maxTime = (localRoomState && localRoomState.turnTimeLimit) ? localRoomState.turnTimeLimit : 8.0;
  let percent = Math.max(0, (timeLeft / maxTime) * 100);
  timerBarFillEl.style.width = `${percent}%`;
  timerTextEl.textContent = `${timeLeft.toFixed(1)}s`;

  if (timeLeft <= 3.0) {
    timerBarFillEl.classList.add('warning');
    timerTextEl.style.color = 'var(--matchbox-red)';
  } else {
    timerBarFillEl.classList.remove('warning');
    timerTextEl.style.color = 'var(--matchbox-gold)';
  }
}

function updateUI(state) {
  if (!state || !state.players) return;

  // Status bar
  let statusPlayersEl = document.getElementById('status-players-row');
  if (statusPlayersEl) {
    statusPlayersEl.innerHTML = '';
    let sorted = state.players.map((p, idx) => ({ ...p, originalIdx: idx }));
    sorted.sort((a, b) => b.score - a.score);
    sorted.forEach((p, rank) => {
      let color = PLAYER_COLORS[p.originalIdx] || '#a8a29e';
      let isMe = (p.originalIdx === myPlayerIndex);
      let card = document.createElement('div');
      card.className = 'status-player-card' + (isMe ? ' is-me' : '');
      card.innerHTML = `
        <div class="status-player-name" style="color: ${color};">${isMe ? '⭐ ' : ''}${p.name}</div>
        <div class="status-player-score" style="color: ${color};">${p.score}</div>
      `;
      statusPlayersEl.appendChild(card);
    });
  }
  let myPlayer = getMyPlayerBySocket(state);

  let boardNameEl = document.getElementById('board-player-name');
  if (boardNameEl && myPlayer) {
    boardNameEl.textContent = myPlayer.name;
  }

  let sidebarRoomEl = document.getElementById('sidebar-room-info');
  if (sidebarRoomEl) sidebarRoomEl.textContent = `📍 Phòng: ${state.roomCode}`;
  
  let roleText = myPlayerIndex >= 0 ? `Player ${myPlayerIndex + 1}${myPlayerIndex === 0 ? ' (Host)' : ''}` : 'Chưa vào phòng';
  let sidebarRoleEl = document.getElementById('sidebar-role-info');
  if (sidebarRoleEl) sidebarRoleEl.textContent = `👤 Vai trò: ${roleText}`;

  // Call lobby and opponents updates
  updateLobbyUI(state);
  renderOpponentBoards(state);
}
