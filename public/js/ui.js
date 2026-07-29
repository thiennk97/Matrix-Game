var pixiBoardContainer = document.getElementById('pixi-board-container');
var pieceDisplayEl = document.getElementById('current-piece-display');
var piecePanelLabelEl = document.getElementById('piece-panel-label');
var timerTextEl = document.getElementById('timer-text-val');
var timerBarFillEl = document.getElementById('timer-bar-fill');
var matchListEl = document.getElementById('match-list-details');
var logBox = document.getElementById('log-box');
var lobbyModalEl = document.getElementById('lobby-modal');
var turnStatusTextEl = document.getElementById('turn-status-text');

var PLAYER_COLORS = ['#f97316', '#38bdf8', '#a78bfa', '#34d399'];
var PLAYER_LABELS = ['P1', 'P2', 'P3', 'P4'];

// PixiJS Globals
var pixiApp;
var pixiGridContainer;
var pixiCells = [];
var pixiMatchGraphics;

function log(msg, type = 'info') {
  let item = document.createElement('div');
  item.className = `log-item ${type}`;
  item.textContent = `[System] ${msg}`;
  logBox.appendChild(item);
  logBox.scrollTop = logBox.scrollHeight;
}

function showToast(msg) {
  const bannerEl = document.getElementById('lobby-status-banner');
  if (bannerEl) bannerEl.innerHTML = msg;
}

function createGridUI() {
  if (pixiApp) return;

  const CELL_W = 52;
  const GAP = 1;
  const PADDING = 4;
  
  pixiBoardContainer.innerHTML = '';

  pixiApp = new PIXI.Application({
    width: 484,
    height: 484,
    backgroundColor: 0x000000,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
  });
  pixiBoardContainer.appendChild(pixiApp.view);

  // Black background wrapper for the grid
  let gridBg = new PIXI.Graphics();
  gridBg.beginFill(0x000000);
  gridBg.drawRect(0, 0, 484, 484);
  gridBg.endFill();
  pixiApp.stage.addChild(gridBg);

  pixiGridContainer = new PIXI.Container();
  pixiGridContainer.x = PADDING;
  pixiGridContainer.y = PADDING;
  pixiApp.stage.addChild(pixiGridContainer);

  pixiCells = [];

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      let cellX = c * (CELL_W + GAP);
      let cellY = r * (CELL_W + GAP);

      let cellGroup = new PIXI.Container();
      cellGroup.x = cellX;
      cellGroup.y = cellY;
      cellGroup.interactive = true;
      cellGroup.cursor = 'pointer';

      let bg = new PIXI.Graphics();
      bg.beginFill(0xFFFFFF);
      bg.drawRect(0, 0, CELL_W, CELL_W);
      bg.endFill();
      cellGroup.addChild(bg);

      let text = new PIXI.Text('', {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 24,
        fontWeight: '700',
        fill: '#000000'
      });
      text.anchor.set(0.5);
      text.x = CELL_W / 2;
      text.y = CELL_W / 2;
      cellGroup.addChild(text);

      cellGroup.on('pointerover', () => handleCellHover(r, c, true));
      cellGroup.on('pointerout', () => handleCellHover(r, c, false));
      cellGroup.on('pointerdown', () => handleCellClick(r, c));

      pixiGridContainer.addChild(cellGroup);
      pixiCells.push({ bg, text });
    }
  }

  pixiMatchGraphics = new PIXI.Graphics();
  pixiApp.stage.addChild(pixiMatchGraphics);
}

function renderSVGMatchLines(matchedLinesDetail) {
  if (!pixiMatchGraphics) return;
  pixiMatchGraphics.clear();
  if (!matchedLinesDetail || !matchedLinesDetail.length) return;

  const CELL_W = 52;
  const GAP = 1;
  const PADDING = 4;

  pixiMatchGraphics.lineStyle(5, 0xf97316, 1);

  matchedLinesDetail.forEach(lineInfo => {
    let x1 = PADDING + lineInfo.start.c * (CELL_W + GAP) + CELL_W / 2;
    let y1 = PADDING + lineInfo.start.r * (CELL_W + GAP) + CELL_W / 2;
    let x2 = PADDING + lineInfo.end.c * (CELL_W + GAP) + CELL_W / 2;
    let y2 = PADDING + lineInfo.end.r * (CELL_W + GAP) + CELL_W / 2;

    pixiMatchGraphics.moveTo(x1, y1);
    pixiMatchGraphics.lineTo(x2, y2);
  });
}

function renderMiniOpponentBoards(state) {
  let container = document.getElementById('opponents-boards-container');
  if (!container) return;
  container.innerHTML = '';

  if (!state || !state.players || !state.isGameStarted) {
    container.innerHTML = '<div style="font-size: 0.78rem; color: #78716c; text-align: center; padding: 0.5rem;">Chưa bắt đầu trận đấu...</div>';
    return;
  }

  state.players.forEach((p, idx) => {
    if (idx === myPlayerIndex) return; // skip self

    let color = PLAYER_COLORS[idx] || '#a8a29e';
    let card = document.createElement('div');
    card.className = 'opponent-board-card';
    card.style.borderColor = color;

    // Name
    let nameEl = document.createElement('div');
    nameEl.className = 'ob-name';
    nameEl.style.color = color;
    nameEl.textContent = p.name;
    card.appendChild(nameEl);

    // Score
    let scoreEl = document.createElement('div');
    scoreEl.className = 'ob-score';
    scoreEl.style.color = color;
    scoreEl.textContent = p.score + ' PTS';
    card.appendChild(scoreEl);

    // Mini grid
    let miniGrid = document.createElement('div');
    miniGrid.className = 'mini-grid-9x9';
    if (p.board) {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          let val = p.board[r][c];
          let miniCell = document.createElement('div');
          miniCell.className = 'mini-cell';
          if (val !== null) {
            miniCell.classList.add('num-' + val);
            miniCell.textContent = val;
          }
          miniGrid.appendChild(miniCell);
        }
      }
    }
    card.appendChild(miniGrid);

    container.appendChild(card);
  });

  if (container.children.length === 0) {
    container.innerHTML = '<div style="font-size: 0.78rem; color: #78716c; text-align: center; padding: 0.5rem;">Chỉ có bạn trong phòng</div>';
  }
}

function renderScoreBreakdown(state) {
  if (!state || !state.players) return;

  let myPlayer = getMyPlayerBySocket(state);
  let myScore = myPlayer ? myPlayer.score : 0;
  let myMatchedLines = myPlayer ? myPlayer.matchedLines : [];

  // Render all-players scoreboard
  let scoreGridEl = document.getElementById('all-players-scores');
  if (scoreGridEl) {
    scoreGridEl.innerHTML = '';
    state.players.forEach((p, idx) => {
      let isMe = (idx === myPlayerIndex);
      let color = PLAYER_COLORS[idx] || '#a8a29e';
      let item = document.createElement('div');
      item.className = 'player-score-item' + (isMe ? ' my-score' : '');
      item.innerHTML = `
        <div style="font-size: 0.68rem; color: ${color}; font-weight: 800;">
          ${PLAYER_LABELS[idx]}${isMe ? ' (BẠN)' : ''}
        </div>
        <div class="player-score-val" style="color: ${color};">${p.score}</div>
        <div style="font-size: 0.6rem; color: #78716c;">${p.name}</div>
      `;
      scoreGridEl.appendChild(item);
    });
  }

  // Render match breakdown list
  matchListEl.innerHTML = '';
  if (!myMatchedLines || myMatchedLines.length === 0) {
    matchListEl.innerHTML = `<div style="font-size: 0.78rem; color: #78716c; text-align: center; padding: 0.8rem;">Chưa có đường 3 ô kề nhau...</div>`;
    return;
  }

  myMatchedLines.forEach(item => {
    let row = document.createElement('div');
    row.className = 'match-item active';
    row.innerHTML = `
      <div>
        <strong>${item.name}</strong>
        <div style="font-size: 0.72rem; color: #a8a29e;">Số ${item.val} x ${item.len} ô liên tiếp</div>
      </div>
      <div class="match-tag">+${item.points} PTS</div>
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

  // Status bar: update all player names and scores
  let statusPlayersEl = document.getElementById('status-players-row');
  if (statusPlayersEl) {
    statusPlayersEl.innerHTML = '';
    state.players.forEach((p, idx) => {
      let color = PLAYER_COLORS[idx] || '#a8a29e';
      let isMe = (idx === myPlayerIndex);
      let card = document.createElement('div');
      card.className = 'status-player-card' + (isMe ? ' is-me' : '');
      card.innerHTML = `
        <div class="status-player-name" style="color: ${color};">${p.name}${isMe ? ' ⭐' : ''}</div>
        <div class="status-player-score" style="color: ${color};">${p.score}</div>
      `;
      statusPlayersEl.appendChild(card);
    });
  }

  document.getElementById('turn-val').textContent = `${state.turn + 1} / 27`;

  let myPlayer = getMyPlayerBySocket(state);
  if (myPlayer && myPlayer.hasPlacedThisRound) {
    turnStatusTextEl.textContent = `VÒNG ${state.turn + 1} / 27: ĐÃ ĐẶT QUÂN - CHỜ HẾT THỜI GIAN`;
    turnStatusTextEl.style.color = 'var(--matchbox-gold)';
  } else {
    turnStatusTextEl.textContent = `VÒNG ${state.turn + 1} / 27: ĐẶT QUÂN TRONG 8S!`;
    turnStatusTextEl.style.color = 'var(--matchbox-orange)';
  }

  // Sidebar info
  document.getElementById('sidebar-room-info').textContent = `📍 Phòng: ${state.roomCode}`;
  let roleText = myPlayerIndex >= 0 ? `Player ${myPlayerIndex + 1}${myPlayerIndex === 0 ? ' (Host)' : ''}` : 'Chưa vào phòng';
  document.getElementById('sidebar-role-info').textContent = `👤 Vai trò: ${roleText}`;

  // Update Lobby Room View
  document.getElementById('current-room-code-text').textContent = state.roomCode;

  // Update all 4 player slots in lobby
  for (let i = 0; i < 4; i++) {
    let nameEl = document.getElementById(`lobby-p${i+1}-name`);
    let connEl = document.getElementById(`lobby-p${i+1}-conn`);
    let readyEl = document.getElementById(`lobby-p${i+1}-ready`);
    if (!nameEl || !connEl || !readyEl) continue;

    if (i < state.players.length) {
      let p = state.players[i];
      nameEl.textContent = p.name;

      if (p.connected) {
        connEl.className = 'status-pill online';
        connEl.textContent = '🟢 Trực tuyến';
      } else {
        connEl.className = 'status-pill offline';
        connEl.textContent = '🔴 Ngoại tuyến';
      }

      if (p.ready) {
        readyEl.className = 'ready-tag is-ready';
        readyEl.textContent = '⚡ ĐÃ SẴN SÀNG';
      } else {
        readyEl.className = 'ready-tag not-ready';
        readyEl.textContent = '⏳ CHƯA SẴN SÀNG';
      }
    } else {
      nameEl.textContent = `Chờ P${i+1} vào...`;
      connEl.className = 'status-pill waiting';
      connEl.textContent = '⏳ Chờ người chơi';
      readyEl.className = 'ready-tag not-ready';
      readyEl.textContent = '—';
    }
  }

  // Dynamic start game button for Host
  let btnStart = document.getElementById('btn-start-game-server');
  let allReady = state.players.length >= 2 && state.players.every(p => p.ready);
  let allConnected = state.players.every(p => p.connected);

  if (myPlayerIndex === 0) {
    btnStart.style.display = "inline-flex";
    if (allReady && allConnected) {
      btnStart.disabled = false;
      btnStart.style.opacity = "1";
      btnStart.textContent = "🚀 BẮT ĐẦU GAME (HOST)";
      showToast("✨ Tất cả đã sẵn sàng!<br>Host bấm nút bên dưới để Bắt Đầu!");
    } else {
      btnStart.disabled = false;
      btnStart.style.opacity = "0.9";
      btnStart.textContent = "🚀 BẮT ĐẦU GAME";
      if (state.players.length < 2) {
        showToast("⏳ Đang chờ người chơi khác tham gia phòng...<br>📋 Chia sẻ mã phòng để mời bạn bè!");
      } else {
        let notReady = state.players.filter(p => !p.ready).map(p => p.name);
        if (notReady.length > 0) {
          showToast("💡 Chờ sẵn sàng:<br>" + notReady.map(n => `• ${n}`).join('<br>'));
        }
      }
    }
  } else {
    btnStart.style.display = "none";
    if (allReady) {
      showToast("✨ Tất cả đã sẵn sàng!<br>Đang chờ Host bấm Bắt đầu...");
    } else {
      showToast("💡 Nhấn <strong>⚡ SẴN SÀNG</strong> khi bạn đã chuẩn bị xong!");
    }
  }
}
