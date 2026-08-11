var MAX_LOBBY_SLOTS = 8;
var PLAYER_NAME_STORAGE_KEY = 'matrix-game-player-name';
var READY_ICON_SVG =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
var NOT_READY_ICON_SVG =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 15 15"></polyline></svg>';

window.isCreatingRoom = false;
window.currentJoiningRoomCode = '';

function loadStoredPlayerName() {
  try {
    return localStorage.getItem(PLAYER_NAME_STORAGE_KEY) || '';
  } catch (error) {
    return '';
  }
}

function saveStoredPlayerName(playerName) {
  try {
    localStorage.setItem(PLAYER_NAME_STORAGE_KEY, playerName);
  } catch (error) {
    return;
  }
}

function openNameModal(roomCode = '', isCreate = false) {
  window.currentJoiningRoomCode = roomCode;
  window.isCreatingRoom = isCreate;

  const title = isCreate ? 'TẠO PHÒNG MỚI' : 'THAM GIA PHÒNG';
  const desc = isCreate
    ? 'Nhập tên của bạn để tạo phòng mới'
    : `Nhập tên để tham gia phòng ${roomCode}`;

  document.getElementById('name-modal-title').textContent = title;
  document.getElementById('name-modal-desc').textContent = desc;

  const nameInput = document.getElementById('name-modal-input');
  nameInput.value = loadStoredPlayerName();
  nameInput.setCustomValidity('');
  document.getElementById('name-modal').style.display = 'flex';
  setTimeout(() => nameInput.focus(), 50);
}

function buildRoomActionButtonHtml(r) {
  if (r.status === 'LOBBY') {
    return `
      <button class="btn btn-primary btn-sm btn-join-public" data-code="${r.roomCode}">
        <i data-lucide="log-in" style="width:16px;height:16px;vertical-align:-3px"></i> Tham gia
      </button>`;
  }
  return `
      <button class="btn btn-cyan btn-sm btn-spectate-public" data-code="${r.roomCode}">
        <i data-lucide="eye" style="width:16px;height:16px;vertical-align:-3px"></i> Hóng
      </button>`;
}

function renderPublicRooms(rooms) {
  const container = document.getElementById('public-rooms-container');
  if (!container) return;

  if (!rooms || rooms.length === 0) {
    container.innerHTML =
      '<div class="empty-state">Chưa có phòng nào đang mở.</div>';
    return;
  }

  container.innerHTML = rooms
    .map(
      (r) => `
    <div class="public-room-card">
      <div class="room-card-header">
        <span class="room-card-code">#${r.roomCode}</span>
        <span class="room-card-players">${r.playerCount}/${
        r.maxPlayers
      } <i data-lucide="users" style="width:14px;height:14px;vertical-align:-2px"></i></span>
      </div>
      <div class="room-card-host">Host: ${escapeHtml(r.hostName)}</div>
      ${buildRoomActionButtonHtml(r)}
    </div>
  `
    )
    .join('');

  refreshIcons();

  container.querySelectorAll('.btn-join-public').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const code = e.currentTarget.getAttribute('data-code');
      openNameModal(code, false);
    });
  });

  container.querySelectorAll('.btn-spectate-public').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const code = e.currentTarget.getAttribute('data-code');
      handleSpectateRoomClick(code);
    });
  });
}

function findMyPlayerIndex(state) {
  if (!state || !state.players) return -1;
  return state.players.findIndex((p) => p.id === myPlayerId);
}

function buildLobbySlotHtml(player, isHostSlot, slotIndex, canKick) {
  if (!player) {
    return `
      <div class="player-slot-card p${slotIndex + 1}-slot" style="display: none;">
        <div class="slot-player-name"><i data-lucide="user" class="icon"></i> Chờ P${
          slotIndex + 1
        } vào...</div>
        <div class="ready-tag not-ready">—</div>
      </div>
    `;
  }

  let readyHtml = '';
  if (!isHostSlot) {
    const readyClass = player.ready ? 'ready-tag is-ready' : 'ready-tag not-ready';
    const readyIcon = player.ready ? READY_ICON_SVG : NOT_READY_ICON_SVG;
    readyHtml = `<div class="${readyClass}">${readyIcon}</div>`;
  }

  const isMe = player.id === myPlayerId;
  const youTag = isMe ? `<span class="you-tag">(Bạn)</span>` : '';
  const disconnectedTag = !player.connected
    ? `<span class="disconnected-tag" style="color:var(--matchbox-red); font-size:12px; margin-left:8px;">(Mất kết nối)</span>`
    : '';
  const kickHtml = canKick
    ? `<button class="btn-kick-player" data-player-id="${player.id}" title="Kick khỏi phòng"><i data-lucide="user-x" class="icon"></i></button>`
    : '';

  return `
    <div class="player-slot-card p${slotIndex + 1}-slot" style="display: flex;">
      <div class="slot-player-name">
        <i data-lucide="user" class="icon"></i> ${escapeHtml(
          player.name
        )} ${youTag} ${disconnectedTag}
      </div>
      ${readyHtml}
      ${kickHtml}
    </div>
  `;
}

function renderLobbySlots(state, isViewerHost) {
  const grid = document.getElementById('lobby-players-grid');
  if (!grid) return;

  const playersBySeat = new Map(state.players.map((player) => [player.seatIndex, player]));
  let html = '';
  for (let i = 0; i < MAX_LOBBY_SLOTS; i++) {
    const player = playersBySeat.get(i) || null;
    const isHostSlot = player?.id === state.hostPlayerId;
    const canKick = isViewerHost && player && !isHostSlot;
    html += buildLobbySlotHtml(player, isHostSlot, i, canKick);
  }
  grid.innerHTML = html;
  refreshIcons();
}

function setReadyButtonState(btnReady, isReady) {
  if (isReady) {
    btnReady.innerHTML = iconHtml('x-circle') + ' HỦY SẴN SÀNG';
    btnReady.className = 'btn';
    btnReady.style.background = 'var(--matchbox-red)';
    btnReady.style.color = '#fff';
    btnReady.style.borderColor = 'var(--matchbox-red)';
  } else {
    btnReady.innerHTML = iconHtml('zap') + ' SẴN SÀNG';
    btnReady.className = 'btn btn-green';
    btnReady.style.background = '';
    btnReady.style.color = '';
    btnReady.style.borderColor = '';
  }
}

function updateHostControls(isHost, myPlayerData) {
  const btnReady = document.getElementById('btn-toggle-ready');
  const timerSettingGroup = document.getElementById('timer-setting-group');

  if (isHost) {
    btnReady.style.display = 'none';
    if (timerSettingGroup) timerSettingGroup.style.display = 'flex';
    return;
  }

  btnReady.style.display = 'inline-flex';
  if (timerSettingGroup) timerSettingGroup.style.display = 'none';
  setReadyButtonState(btnReady, !!(myPlayerData && myPlayerData.ready));
}

function updateHostStartButton(allReady, allConnected) {
  const btnStart = document.getElementById('btn-start-game-server');
  btnStart.style.display = 'inline-flex';
  btnStart.disabled = !(allReady && allConnected);
  btnStart.innerHTML = iconHtml('rocket') + ' BẮT ĐẦU GAME';

  const isReady = allReady && allConnected;
  btnStart.style.opacity = isReady ? '1' : '0.9';
  btnStart.style.background = isReady ? 'var(--matchbox-green)' : '';
  btnStart.style.borderColor = isReady ? 'var(--matchbox-green)' : '';
  btnStart.style.color = isReady ? '#000' : '';
}

function updateNonHostStatus() {
  document.getElementById('btn-start-game-server').style.display = 'none';
}

function updateLobbyUI(state) {
  if (!state || state.isGameStarted) return;

  const localPlayerIndex = findMyPlayerIndex(state);
  const myPlayerData = localPlayerIndex >= 0 ? state.players[localPlayerIndex] : null;
  const isHost = myPlayerData?.id === state.hostPlayerId;

  document.getElementById('current-room-code-text').textContent = state.roomCode;

  if (isHost && state.turnTimeLimit) {
    const timerSelect = document.getElementById('timer-select');
    if (timerSelect) timerSelect.value = state.turnTimeLimit;
  }

  renderLobbySlots(state, isHost);
  updateHostControls(isHost, myPlayerData);

  const nonHostPlayers = state.players.filter((player) => player.id !== state.hostPlayerId);
  const allReady = nonHostPlayers.every((player) => player.ready);
  const allConnected = state.players.every((p) => p.connected && !p.abandoned);

  if (isHost) {
    updateHostStartButton(allReady, allConnected);
  } else {
    updateNonHostStatus();
  }
  refreshIcons();
}
