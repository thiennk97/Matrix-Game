var pixiBoardContainer = document.getElementById('pixi-board-container');
var pieceDisplayEl = document.getElementById('current-piece-display');
var piecePanelLabelEl = document.getElementById('piece-panel-label');
var timerTextEl = document.getElementById('timer-text-val');
var timerBarFillEl = document.getElementById('timer-bar-fill');
var matchListEl = document.getElementById('match-list-details');
var logBox = document.getElementById('log-box');
var lobbyModalEl = document.getElementById('lobby-modal');
var turnStatusTextEl = document.getElementById('turn-status-text');

var PLAYER_COLORS = ['#f97316', '#38bdf8', '#a78bfa', '#34d399', '#fb7185', '#facc15', '#818cf8', '#2dd4bf'];
var PLAYER_LABELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];

// PixiJS Globals
var pixiApp;
var pixiGridContainer;
var pixiCells = [];
var pixiMatchGraphics;

// Helper function to calculate exact pixel coordinates for a cell (r, c)
function getCellPos(r, c) {
  const CELL_W = 50;
  const GAP = 2;          // 2px gap between normal cells
  const BLOCK_GAP = 2;    // 2px extra gap between 3x3 blocks (total 4px gap)
  const PADDING = 8;      // 8px padding around the board

  let blockRow = Math.floor(r / 3);
  let blockCol = Math.floor(c / 3);
  
  let x = PADDING + c * (CELL_W + GAP) + blockCol * BLOCK_GAP;
  let y = PADDING + r * (CELL_W + GAP) + blockRow * BLOCK_GAP;
  
  return { x, y, width: CELL_W };
}

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

  pixiApp = new PIXI.Application({
    width: 490,
    height: 490,
    backgroundColor: 0x180b03,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  let container = document.getElementById('pixi-board-container');
  container.innerHTML = '';
  container.appendChild(pixiApp.view);

  // Background wrapper for the grid (serves as the grid lines color)
  let gridBg = new PIXI.Graphics();
  gridBg.beginFill(0x334155);
  gridBg.drawRect(0, 0, 490, 490);
  gridBg.endFill();
  pixiApp.stage.addChild(gridBg);

  pixiGridContainer = new PIXI.Container();
  pixiApp.stage.addChild(pixiGridContainer);

  pixiCells = [];

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      let pos = getCellPos(r, c);

      let cellGroup = new PIXI.Container();
      cellGroup.x = pos.x;
      cellGroup.y = pos.y;
      cellGroup.interactive = true;
      cellGroup.cursor = 'pointer';
      
      // Expand hit area to cover the 2px-4px gaps so hovering over grid lines doesn't cause flicker
      cellGroup.hitArea = new PIXI.Rectangle(-4, -4, pos.width + 8, pos.width + 8);

      let bg = new PIXI.Graphics();
      bg.beginFill(0xFFFFFF);
      bg.drawRect(0, 0, pos.width, pos.width);
      bg.endFill();
      cellGroup.addChild(bg);

      let text = new PIXI.Text('', {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 24,
        fontWeight: '600',
        fill: '#1e293b'
      });
      text.anchor.set(0.5);
      text.x = pos.width / 2;
      text.y = pos.width / 2;
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

  pixiMatchGraphics.lineStyle(5, 0xf97316, 1);

  matchedLinesDetail.forEach(lineInfo => {
    let pos1 = getCellPos(lineInfo.start.r, lineInfo.start.c);
    let pos2 = getCellPos(lineInfo.end.r, lineInfo.end.c);

    let x1 = pos1.x + pos1.width / 2;
    let y1 = pos1.y + pos1.width / 2;
    let x2 = pos2.x + pos2.width / 2;
    let y2 = pos2.y + pos2.width / 2;

    pixiMatchGraphics.moveTo(x1, y1);
    pixiMatchGraphics.lineTo(x2, y2);
  });
}



function renderScoreBreakdown(state) {
  if (!state || !state.players) return;

  let myPlayer = getMyPlayerBySocket(state);
  let myMatchedLines = myPlayer ? myPlayer.matchedLines : [];

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

  // Status bar: update all player names and scores, sorted by score descending
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

  // Update all 8 player slots in lobby
  for (let i = 0; i < 8; i++) {
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

  // Dynamic ready & start buttons
  let btnStart = document.getElementById('btn-start-game-server');
  let btnReady = document.getElementById('btn-toggle-ready');
  let myPlayerData = myPlayerIndex >= 0 && myPlayerIndex < state.players.length ? state.players[myPlayerIndex] : null;

  // Host (P1) never needs ready button, but needs timer setting
  let timerSettingGroup = document.getElementById('timer-setting-group');
  if (myPlayerIndex === 0) {
    btnReady.style.display = 'none';
    if (timerSettingGroup) timerSettingGroup.style.display = 'flex';
  } else {
    btnReady.style.display = 'inline-flex';
    if (timerSettingGroup) timerSettingGroup.style.display = 'none';
    if (myPlayerData && myPlayerData.ready) {
      btnReady.textContent = '❌ HỦY SẴN SÀNG';
      btnReady.className = 'btn';
      btnReady.style.background = 'var(--matchbox-red)';
      btnReady.style.color = '#fff';
      btnReady.style.borderColor = 'var(--matchbox-red)';
    } else {
      btnReady.textContent = '⚡ SẴN SÀNG';
      btnReady.className = 'btn btn-green';
      btnReady.style.background = '';
      btnReady.style.color = '';
      btnReady.style.borderColor = '';
    }
  }

  // Check ready: host is always ready, others must toggle
  let nonHostPlayers = state.players.filter((p, idx) => idx !== 0);
  let allReady = state.players.length >= 2 && nonHostPlayers.every(p => p.ready);
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
        let notReady = nonHostPlayers.filter(p => !p.ready).map(p => p.name);
        if (notReady.length > 0) {
          showToast("💡 Chờ sẵn sàng:<br>" + notReady.map(n => `• ${n}`).join('<br>'));
        }
      }
    }
  } else {
    btnStart.style.display = "none";
    if (allReady) {
      showToast("✨ Tất cả đã sẵn sàng!<br>Đang chờ Host bấm Bắt đầu...");
    } else if (myPlayerData && myPlayerData.ready) {
      showToast("✅ Bạn đã sẵn sàng! Đang chờ người chơi khác...");
    } else {
      showToast("💡 Nhấn <strong>⚡ SẴN SÀNG</strong> khi bạn đã chuẩn bị xong!");
    }
  }
}
