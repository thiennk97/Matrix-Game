var socket = io();
const chatInput = document.getElementById('chat-input');
const btnSendChat = document.getElementById('btn-send-chat');
const chatHeader = document.getElementById('chat-header');
const chatWidget = document.getElementById('chat-widget');

const CLICK_BLOCK_DURATION_MS = 500;
const MEDAL_TIERS = ['gold', 'silver', 'bronze'];
const MAX_CHAT_HISTORY = 50;
const VICTORY_MODAL_DELAY_MS = 2000;

let currentTurn = -1;
let victoryModalTimer = null;
let copyLinkFeedbackTimer = null;
var myPlayerIndex = -1;
var myPlayerId = null;
var currentRoomCode = '';
var localRoomState = null;
var hasJoinedRoom = false;

const APP_VIEW = {
  INDEX: 'INDEX',
  ROOM_WAITING: 'ROOM_WAITING',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  FINISHED: 'FINISHED'
};

function loadSession() {
  try {
    const data = localStorage.getItem('matrix-game-session');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    clearSession();
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem('matrix-game-session', JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem('matrix-game-session');
}

function resetCopyLinkButton() {
  clearTimeout(copyLinkFeedbackTimer);
  copyLinkFeedbackTimer = null;
  const button = document.getElementById('btn-copy-link');
  button.classList.remove('copy-success');
  button.title = 'Sao chép link mời';
  button.innerHTML = iconHtml('link');
  refreshIcons();
}

function showCopyLinkSuccess() {
  clearTimeout(copyLinkFeedbackTimer);
  const button = document.getElementById('btn-copy-link');
  button.classList.add('copy-success');
  button.title = 'Đã sao chép link';
  button.innerHTML = iconHtml('check');
  refreshIcons();
  copyLinkFeedbackTimer = setTimeout(resetCopyLinkButton, 2000);
}

function handleCopyLinkClick() {
  if (!navigator.clipboard?.writeText) return;
  const url = new URL(window.location.href);
  url.searchParams.set('room', currentRoomCode);
  navigator.clipboard
    .writeText(url.toString())
    .then(showCopyLinkSuccess)
    .catch(() => {});
}

function finishRoomRestore() {
  document.documentElement.classList.remove('restoring-room');
}

function resetClientRoomState() {
  clearTimeout(victoryModalTimer);
  victoryModalTimer = null;
  clearSession();
  currentRoomCode = '';
  currentTurn = -1;
  hasJoinedRoom = false;
  localRoomState = null;
  myPlayerId = null;
  myPlayerIndex = -1;
  resetCopyLinkButton();
  document.getElementById('victory-modal').style.display = 'none';
  if (typeof resetGameVisualState === 'function') resetGameVisualState();
}

function renderAppView(view) {
  const viewIndex = document.getElementById('view-index');
  const viewGame = document.getElementById('view-game');
  const roomWaiting = document.getElementById('room-waiting-overlay');
  const gamePause = document.getElementById('game-pause-overlay');
  const boardTimer = document.getElementById('board-timer-bar');
  const piecePanel = document.getElementById('piece-panel');
  const btnStart = document.getElementById('btn-start-game-server');
  const btnRestart = document.getElementById('btn-restart-game');
  const opponentsSection = document.getElementById('opponents-section');

  viewIndex.style.display = 'none';
  viewGame.style.display = 'none';
  roomWaiting.style.display = 'none';
  gamePause.style.display = 'none';
  boardTimer.style.visibility = 'hidden';
  piecePanel.style.visibility = 'hidden';
  btnRestart.style.display = 'none';
  opponentsSection.style.display = 'none';

  if (view === APP_VIEW.INDEX) {
    viewIndex.style.display = 'flex';
  } else {
    viewGame.style.display = 'flex';
    if (view === APP_VIEW.ROOM_WAITING) {
      roomWaiting.style.display = 'flex';
      btnStart.disabled = false;
    } else if (view === APP_VIEW.PLAYING) {
      boardTimer.style.visibility = 'visible';
      piecePanel.style.visibility = 'visible';
      opponentsSection.style.display = 'block';
    } else if (view === APP_VIEW.PAUSED) {
      gamePause.style.display = 'flex';
      opponentsSection.style.display = 'block';
    } else if (view === APP_VIEW.FINISHED) {
      btnRestart.style.display = 'inline-flex';
      opponentsSection.style.display = 'block';
    }
  }
}

function blockClicksTemporarily(durationMs) {
  window.isClickBlocked = true;
  setTimeout(() => {
    window.isClickBlocked = false;
  }, durationMs);
}

function refreshLocalRoomView(state) {
  if (!state) return;
  updateUI(state);
  renderPieceDisplay(state);
  render(state);
}

function fetchAndRenderRooms() {
  socket.emit('list_rooms', {}, (res) => {
    if (res && res.ok) {
      renderPublicRooms(res.data.rooms);
    }
  });
}

function handleConnect() {
  const session = loadSession();
  if (session && session.roomCode && session.playerId) {
    socket.emit(
      'resume_room',
      { roomCode: session.roomCode, playerId: session.playerId },
      (res) => {
        if (res?.ok) {
          handleAssignedRole(res.data);
          handleRoomStateUpdate(res.data.state);
        } else {
          clearSession();
          fetchAndRenderRooms();
          renderAppView(APP_VIEW.INDEX);
        }
        finishRoomRestore();
      }
    );
  } else {
    fetchAndRenderRooms();
    renderAppView(APP_VIEW.INDEX);
    finishRoomRestore();
  }
}

function handleAssignedRole({ roomCode, playerId, playerIndex, state }) {
  myPlayerIndex = playerIndex;
  myPlayerId = playerId;
  currentRoomCode = roomCode;
  hasJoinedRoom = true;

  saveSession({ roomCode, playerId });
  const assignedPlayer = state.players.find((player) => player.id === playerId);
  saveStoredPlayerName(assignedPlayer.name);

  if (state.status === 'LOBBY') {
    renderAppView(APP_VIEW.ROOM_WAITING);
  } else if (state.status === 'PLAYING') {
    renderAppView(APP_VIEW.PLAYING);
  } else if (state.status === 'PAUSED') {
    renderAppView(APP_VIEW.PAUSED);
  } else if (state.status === 'FINISHED') {
    renderAppView(APP_VIEW.FINISHED);
  }

  log(`Bạn đã vào phòng [${roomCode}]`, 'server', 'user');
}

function handleRoomStateUpdate(state) {
  if (!state) return;
  if (localRoomState && state.stateVersion < localRoomState.stateVersion) return;

  state.isGameStarted = state.status !== 'LOBBY';
  state.isGameOver = state.status === 'FINISHED';

  if (state.turn !== currentTurn) {
    currentTurn = state.turn;
    blockClicksTemporarily(CLICK_BLOCK_DURATION_MS);
  }

  const isReconnect = !localRoomState;
  localRoomState = state;
  if (state.status === 'LOBBY') {
    clearTimeout(victoryModalTimer);
    victoryModalTimer = null;
    document.getElementById('victory-modal').style.display = 'none';
    if (typeof resetGameVisualState === 'function') resetGameVisualState();
    renderAppView(APP_VIEW.ROOM_WAITING);
  } else if (state.status === 'PLAYING') renderAppView(APP_VIEW.PLAYING);
  else if (state.status === 'PAUSED') renderAppView(APP_VIEW.PAUSED);
  else if (state.status === 'FINISHED') {
    renderAppView(APP_VIEW.FINISHED);
    if (isReconnect) {
      const sortedPlayers = sortPlayersByScore(state.players);
      showVictoryModal(sortedPlayers);
    }
  }

  refreshLocalRoomView(state);
}

function handleTimerTick({ timeLeft }) {
  updateTimerUI(timeLeft);
}

function handleGameStarted() {
  renderAppView(APP_VIEW.PLAYING);
  log('SERVER ĐÃ KÍCH HOẠT BẮT ĐẦU TRẬN ĐẤU REALTIME!', 'server', 'rocket');
}

function sortPlayersByScore(players) {
  return [...players].sort(
    (a, b) => (b.score || 0) - (a.score || 0) || (a.seatIndex || 0) - (b.seatIndex || 0)
  );
}

function isTieGame(sortedPlayers) {
  return sortedPlayers.length > 1 && sortedPlayers[0].score === sortedPlayers[1].score;
}

function getWinnerMessage(sortedPlayers) {
  return isTieGame(sortedPlayers) ? 'HÒA TỶ SỐ!' : `${sortedPlayers[0].name} CHIẾN THẮNG!`;
}

function buildRankBadgeHtml(rank) {
  const tier = MEDAL_TIERS[rank] || 'standard';
  const iconName = rank === 0 ? 'trophy' : 'medal';
  return `${iconHtml(iconName, `rank-medal medal-${tier}`)}<span>#${rank + 1}</span>`;
}

function buildRankCardHtml(player, rank) {
  const tier = MEDAL_TIERS[rank] || 'standard';
  return `
    <div class="rank-card rank-card-${tier}" style="--rank-index:${rank}">
      <div class="rank-badge">${buildRankBadgeHtml(rank)}</div>
      <div class="rank-name">${escapeHtml(player.name)}</div>
      <div class="rank-score"><strong>${player.score}</strong><span>PTS</span></div>
    </div>`;
}

function renderWinnerTitle(sortedPlayers) {
  const winnerEl = document.getElementById('modal-winner');
  winnerEl.innerHTML = '';
  winnerEl.appendChild(createIconElement(isTieGame(sortedPlayers) ? 'handshake' : 'trophy'));
  winnerEl.appendChild(document.createTextNode(' ' + getWinnerMessage(sortedPlayers)));
}

function showVictoryModal(sortedPlayers) {
  renderWinnerTitle(sortedPlayers);
  document.getElementById('modal-scores').innerHTML = sortedPlayers
    .map((p, i) => buildRankCardHtml(p, i))
    .join('');
  document.getElementById('btn-modal-restart').style.display = 'inline-flex';
  document.getElementById('victory-modal').style.display = 'flex';
  refreshIcons();
}

function handleGameOver(state) {
  handleRoomStateUpdate(state);
  const sortedPlayers = sortPlayersByScore(state.players);
  clearTimeout(victoryModalTimer);
  victoryModalTimer = setTimeout(() => {
    if (localRoomState?.status === 'FINISHED') showVictoryModal(sortedPlayers);
  }, VICTORY_MODAL_DELAY_MS);
}

function handleJoinRoomSubmit(code, isCreate) {
  const nameInput = document.getElementById('name-modal-input');
  const playerName = nameInput.value.trim();
  nameInput.setCustomValidity(playerName ? '' : 'Tên người chơi là bắt buộc.');
  if (!nameInput.reportValidity()) return;

  if (isCreate) {
    socket.emit('create_room', { playerName }, (res) => {
      if (res.ok) {
        document.getElementById('name-modal').style.display = 'none';
        handleAssignedRole(res.data);
        handleRoomStateUpdate(res.data.state);
      } else {
        alert(res.error.message);
      }
    });
  } else {
    socket.emit('join_room', { roomCode: code, playerName }, (res) => {
      if (res.ok) {
        document.getElementById('name-modal').style.display = 'none';
        handleAssignedRole(res.data);
        handleRoomStateUpdate(res.data.state);
      } else {
        alert(res.error.message);
      }
    });
  }
}

function handleToggleReadyClick() {
  if (!currentRoomCode) return;
  socket.emit('toggle_ready', { roomCode: currentRoomCode });
}

function handleStartGameClick() {
  if (!currentRoomCode) return;
  const timerSelect = document.getElementById('timer-select');
  const turnTimeLimit = timerSelect ? Number(timerSelect.value) : 8;
  socket.emit('start_game', { turnTimeLimit }, (res) => {
    if (!res.ok) alert(res.error.message);
  });
}

function handleLeaveRoomClick() {
  if (!currentRoomCode || !myPlayerId) return;

  socket.emit('leave_room', { roomCode: currentRoomCode, playerId: myPlayerId }, (res) => {
    if (!res?.ok) {
      alert(res?.error?.message || 'Không thể thoát phòng.');
      return;
    }

    resetClientRoomState();
    renderAppView(APP_VIEW.INDEX);
    fetchAndRenderRooms();
  });
}

function handleCloseVictoryClick() {
  document.getElementById('victory-modal').style.display = 'none';
}

function setRestartButtonsDisabled(disabled) {
  document.getElementById('btn-restart-game').disabled = disabled;
  document.getElementById('btn-modal-restart').disabled = disabled;
}

function handleRestartGameClick() {
  setRestartButtonsDisabled(true);
  socket.emit('restart_game', {}, (res) => {
    setRestartButtonsDisabled(false);
    if (!res?.ok) {
      alert(res?.error?.message || 'Không thể bắt đầu ván mới.');
      return;
    }

    handleAssignedRole(res.data);
    handleRoomStateUpdate(res.data.state);
    document.getElementById('victory-modal').style.display = 'none';
  });
}

document.getElementById('btn-modal-leave')?.addEventListener('click', () => {
  handleLeaveRoomClick();
  document.getElementById('victory-modal').style.display = 'none';
});

document.getElementById('btn-modal-restart')?.addEventListener('click', handleRestartGameClick);

function sendChatMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  socket.emit('chat_message', text);
  chatInput.value = '';
}

function findPlayerIndexById(playerId) {
  if (!localRoomState || !localRoomState.players) return -1;
  return localRoomState.players.findIndex((p) => p.id === playerId);
}

function buildChatMessageElement(sender, msg, isMe, color) {
  const item = document.createElement('div');
  item.className = `chat-msg ${isMe ? 'me' : 'other'}`;
  item.style.borderLeftColor = color;

  if (!isMe) {
    const author = document.createElement('div');
    author.className = 'chat-msg-author';
    author.style.color = color;
    author.textContent = sender;
    item.appendChild(author);
  }

  const content = document.createElement('div');
  content.textContent = msg;
  item.appendChild(content);

  return item;
}

function trimChatHistory() {
  while (chatMessagesEl.children.length > MAX_CHAT_HISTORY) {
    chatMessagesEl.removeChild(chatMessagesEl.firstChild);
  }
}

function handleChatMessage({ sender, msg, playerId }) {
  if (!chatMessagesEl) return;

  const isMe = playerId === myPlayerId;
  const color = getPlayerColor(findPlayerIndexById(playerId));
  chatMessagesEl.appendChild(buildChatMessageElement(sender, msg, isMe, color));
  trimChatHistory();
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;

  const trimmedMsg = msg.trim();
  const tauntNumber = parseInt(trimmedMsg, 10);

  if (!isNaN(tauntNumber) && tauntNumber >= 1 && tauntNumber <= 40) {
    const audio = new Audio(`/audio/taunts/${tauntNumber}.ogg`);
    audio.play().catch(e => {
      console.log('Taunt audio not found or autoplay blocked:', e);
    });
  }
}

function handleLobbyRoomsUpdate({ rooms }) {
  renderPublicRooms(rooms);
}

function registerSocketListeners() {
  socket.on('connect', handleConnect);
  socket.on('room_state_update', handleRoomStateUpdate);
  socket.on('timer_tick', handleTimerTick);
  socket.on('game_started', handleGameStarted);
  socket.on('game_over', handleGameOver);
  socket.on('chat_message', handleChatMessage);
  socket.on('lobby_rooms_update', handleLobbyRoomsUpdate);
}

function registerUiListeners() {
  document.getElementById('btn-show-create-room').addEventListener('click', () => {
    openNameModal('', true);
  });

  const btnSubmitName = document.getElementById('btn-name-modal-submit');
  const nameInput = document.getElementById('name-modal-input');

  btnSubmitName.addEventListener('click', () => {
    handleJoinRoomSubmit(window.currentJoiningRoomCode, window.isCreatingRoom);
  });

  nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter')
      handleJoinRoomSubmit(window.currentJoiningRoomCode, window.isCreatingRoom);
  });

  document.getElementById('btn-close-name-modal').addEventListener('click', () => {
    document.getElementById('name-modal').style.display = 'none';
  });

  document.getElementById('btn-toggle-ready').addEventListener('click', handleToggleReadyClick);
  document.getElementById('btn-start-game-server').addEventListener('click', handleStartGameClick);
  document.getElementById('btn-restart-game').addEventListener('click', handleRestartGameClick);
  document.getElementById('btn-leave-room').addEventListener('click', handleLeaveRoomClick);
  document.getElementById('btn-close-victory').addEventListener('click', handleCloseVictoryClick);

  document.getElementById('btn-copy-link').addEventListener('click', handleCopyLinkClick);

  document.getElementById('header-logo').addEventListener('click', () => {
    if (!hasJoinedRoom) {
      renderAppView(APP_VIEW.INDEX);
      fetchAndRenderRooms();
    }
  });

  chatHeader.addEventListener('click', () => {
    chatWidget.classList.toggle('collapsed');
  });

  btnSendChat.addEventListener('click', sendChatMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
  });
}

registerSocketListeners();
registerUiListeners();
createGridUI();
refreshIcons();

window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam && !loadSession()) {
    openNameModal(roomParam, false);
    window.history.replaceState({}, document.title, '/');
  }
});
