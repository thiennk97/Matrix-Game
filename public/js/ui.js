var gridEl = document.getElementById('grid9x9');
var svgEl = document.getElementById('svgMatchLines');
var pieceDisplayEl = document.getElementById('current-piece-display');
var piecePanelLabelEl = document.getElementById('piece-panel-label');
var timerTextEl = document.getElementById('timer-text-val');
var timerBarFillEl = document.getElementById('timer-bar-fill');
var myLiveScoreEl = document.getElementById('my-live-score');
var opLiveScoreEl = document.getElementById('op-live-score');
var matchListEl = document.getElementById('match-list-details');
var logBox = document.getElementById('log-box');
var lobbyModalEl = document.getElementById('lobby-modal');
var turnStatusTextEl = document.getElementById('turn-status-text');

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
  gridEl.innerHTML = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      let cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;

      cell.addEventListener('mouseenter', () => handleCellHover(r, c, true));
      cell.addEventListener('mouseleave', () => handleCellHover(r, c, false));
      cell.addEventListener('click', () => handleCellClick(r, c));

      gridEl.appendChild(cell);
    }
  }
}

function renderSVGMatchLines(matchedLinesDetail) {
  svgEl.innerHTML = '';
  if (!matchedLinesDetail || !matchedLinesDetail.length) return;

  const CELL_W = 52;
  const GAP = 5;
  const PADDING = 12;

  matchedLinesDetail.forEach(lineInfo => {
    let x1 = PADDING + lineInfo.start.c * (CELL_W + GAP) + CELL_W / 2;
    let y1 = PADDING + lineInfo.start.r * (CELL_W + GAP) + CELL_W / 2;
    let x2 = PADDING + lineInfo.end.c * (CELL_W + GAP) + CELL_W / 2;
    let y2 = PADDING + lineInfo.end.r * (CELL_W + GAP) + CELL_W / 2;

    let svgLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    svgLine.setAttribute('x1', x1);
    svgLine.setAttribute('y1', y1);
    svgLine.setAttribute('x2', x2);
    svgLine.setAttribute('y2', y2);
    svgLine.setAttribute('class', 'strike-line');
    svgEl.appendChild(svgLine);
  });
}

function renderMiniOpponentBoard(state) {
  let opMiniEl = document.getElementById('op-mini-board');
  if (!opMiniEl) return;
  opMiniEl.innerHTML = '';

  let role = getEffectiveRole(state);
  let opBoard = role === 1 ? state.p2Board : state.p1Board;
  if (!opBoard) return;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      let val = opBoard[r][c];
      let miniCell = document.createElement('div');
      miniCell.className = 'mini-cell';
      if (val !== null) {
        miniCell.classList.add(`num-${val}`);
        miniCell.textContent = val;
      }
      opMiniEl.appendChild(miniCell);
    }
  }
}

function renderScoreBreakdown(state) {
  let role = getEffectiveRole(state);
  let myScore = role === 1 ? state.p1Score : state.p2Score;
  let opScore = role === 1 ? state.p2Score : state.p1Score;
  let myMatchedLines = role === 1 ? state.p1MatchedLines : state.p2MatchedLines;

  let labelMyEl = document.getElementById('label-my-score');
  let labelOpEl = document.getElementById('label-op-score');
  if (labelMyEl) labelMyEl.textContent = role === 1 ? 'ĐIỂM P1 (BẠN)' : 'ĐIỂM P2 (BẠN)';
  if (labelOpEl) labelOpEl.textContent = role === 1 ? 'ĐIỂM P2 (ĐỐI THỦ)' : 'ĐIỂM P1 (ĐỐI THỦ)';

  myLiveScoreEl.textContent = `${myScore} PTS`;
  opLiveScoreEl.textContent = `${opScore} PTS`;

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
  let percent = Math.max(0, (timeLeft / 8.0) * 100);
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
  document.getElementById('p1-name').textContent = state.p1Name;
  document.getElementById('p2-name').textContent = state.p2Name;
  document.getElementById('p1-score').textContent = state.p1Score;
  document.getElementById('p2-score').textContent = state.p2Score;
  document.getElementById('turn-val').textContent = `${state.turn + 1} / 27`;

  let role = getEffectiveRole(state);
  let myHasPlaced = role === 1 ? state.p1HasPlacedThisRound : state.p2HasPlacedThisRound;
  if (myHasPlaced) {
    turnStatusTextEl.textContent = `VÒNG ${state.turn + 1} / 27: ĐÃ ĐẶT QUÂN - CHỜ HẾT 10S`;
    turnStatusTextEl.style.color = 'var(--matchbox-gold)';
  } else {
    turnStatusTextEl.textContent = `VÒNG ${state.turn + 1} / 27: ĐẶT QUÂN TRONG 10S!`;
    turnStatusTextEl.style.color = 'var(--matchbox-orange)';
  }

  // Sidebar info
  document.getElementById('sidebar-room-info').textContent = `📍 Phòng: ${state.roomCode}`;
  let roleText = role === 1 ? "Player 1 (Host)" : "Player 2 (Guest)";
  document.getElementById('sidebar-role-info').textContent = `👤 Vai trò: ${roleText}`;

  // Update Lobby Room View
  document.getElementById('current-room-code-text').textContent = state.roomCode;
  
  // P1 slot
  document.getElementById('lobby-p1-name').textContent = state.p1Name;
  let p1ConnEl = document.getElementById('lobby-p1-conn');
  if (state.p1Connected) {
    p1ConnEl.className = 'status-pill online';
    p1ConnEl.textContent = '🟢 Trực tuyến';
  } else {
    p1ConnEl.className = 'status-pill offline';
    p1ConnEl.textContent = '🔴 Ngoại tuyến';
  }

  let p1ReadyEl = document.getElementById('lobby-p1-ready');
  if (state.p1Ready) {
    p1ReadyEl.className = 'ready-tag is-ready';
    p1ReadyEl.textContent = '⚡ ĐÃ SẴN SÀNG';
  } else {
    p1ReadyEl.className = 'ready-tag not-ready';
    p1ReadyEl.textContent = '⏳ CHƯA SẴN SÀNG';
  }

  // P2 slot
  document.getElementById('lobby-p2-name').textContent = state.p2Connected ? state.p2Name : "Chờ P2 vào...";
  let p2ConnEl = document.getElementById('lobby-p2-conn');
  if (state.p2Connected) {
    p2ConnEl.className = 'status-pill online';
    p2ConnEl.textContent = '🟢 Trực tuyến';
  } else {
    p2ConnEl.className = 'status-pill waiting';
    p2ConnEl.textContent = '⏳ Chờ người chơi 2';
  }

  let p2ReadyEl = document.getElementById('lobby-p2-ready');
  if (state.p2Ready) {
    p2ReadyEl.className = 'ready-tag is-ready';
    p2ReadyEl.textContent = '⚡ ĐÃ SẴN SÀNG';
  } else {
    p2ReadyEl.className = 'ready-tag not-ready';
    p2ReadyEl.textContent = '⏳ CHƯA SẴN SÀNG';
  }

  // Dynamic start game button for Host
  let btnStart = document.getElementById('btn-start-game-server');
  if (role === 1) {
    btnStart.style.display = "inline-flex";
    if (state.p1Ready && state.p2Ready && state.p2Connected) {
      btnStart.disabled = false;
      btnStart.style.opacity = "1";
      btnStart.textContent = "🚀 BẮT ĐẦU GAME (HOST)";
      showToast("✨ Cả 2 đã sẵn sàng! Host bấm nút bên dưới để Bắt Đầu!");
    } else {
      btnStart.disabled = false;
      btnStart.style.opacity = "0.9";
      btnStart.textContent = "🚀 BẮT ĐẦU GAME";
      if (!state.p2Connected) {
        showToast("⏳ Đang chờ người chơi 2 tham gia phòng...");
      } else if (!state.p1Ready || !state.p2Ready) {
        showToast("💡 Nhắc cả 2 người chơi bấm <strong>Sẵn sàng</strong> để khởi chạy!");
      }
    }
  } else {
    btnStart.style.display = "none";
    if (state.p1Ready && state.p2Ready) {
      showToast("✨ Đã sẵn sàng! Đang chờ Host bấm Bắt đầu...");
    } else {
      showToast("💡 Nhấn <strong>⚡ SẴN SÀNG</strong> khi bạn đã chuẩn bị xong!");
    }
  }
}
