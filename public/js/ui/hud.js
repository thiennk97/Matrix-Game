var timerTextEl = document.getElementById('timer-text-val');
var timerBarFillEl = document.getElementById('timer-bar-fill');
var matchListEl = document.getElementById('match-list-details');
var chatMessagesEl = document.getElementById('chat-messages');

var TIMER_WARNING_THRESHOLD_S = 3.0;
var MAX_LOG_HISTORY = 50;
var previousLeaderboardRanks = new Map();
var previousLeaderboardLeaderId = null;

function trimMessageList(container, maxItems) {
  while (container.children.length > maxItems) {
    container.removeChild(container.firstChild);
  }
}

function log(msg, type = 'info', iconName) {
  if (!chatMessagesEl) return;

  var item = document.createElement('div');
  item.className = `chat-msg system ${type}`;
  item.appendChild(document.createTextNode('[System] '));
  if (iconName) item.appendChild(createIconElement(iconName, 'icon-inline'));
  item.appendChild(document.createTextNode(' ' + msg));
  chatMessagesEl.appendChild(item);

  trimMessageList(chatMessagesEl, MAX_LOG_HISTORY);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  refreshIcons();
}

function scrollToOpponentBoard(playerId) {
  var target = document.getElementById('opponent-board-' + playerId);
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  target.style.boxShadow = '0 0 20px var(--matchbox-cyan)';
  setTimeout(() => (target.style.boxShadow = ''), 2000);
}

function resetLeaderboardVisualState() {
  previousLeaderboardRanks = new Map();
  previousLeaderboardLeaderId = null;
}

function buildScoreRow(player, rank, isMe, rankChange, leaderChanged) {
  var isFocused = isSpectating && player.id === spectateFocusedPlayerId;
  var row = document.createElement('div');
  row.className = 'match-item' + (isMe || isFocused ? ' active' : '');
  row.dataset.playerId = player.id;

  if (rank === 0) row.classList.add('leader');
  if (rankChange !== 0) row.classList.add('rank-changed');
  if (rankChange > 0) row.classList.add('rank-up');
  if (rankChange < 0) row.classList.add('rank-down');
  if (rank === 0 && leaderChanged) row.classList.add('leader-takeover');

  if (!isMe) {
    row.style.cursor = 'pointer';
    row.onclick = () => {
      if (!player.id) return;
      if (isSpectating) {
        handleFocusPlayer(player.id);
      } else {
        scrollToOpponentBoard(player.id);
      }
    };
  }

  var playerColor = getPlayerColor(player.originalIdx);

  var left = document.createElement('div');
  left.className = 'match-item-left';

  var rankNum = document.createElement('span');
  rankNum.className = 'rank-num';
  rankNum.textContent = String(rank + 1).padStart(2, '0');
  if (rank === 0) rankNum.appendChild(createIconElement('crown', 'rank-crown'));
  left.appendChild(rankNum);

  var nameEl = document.createElement('span');
  nameEl.className = 'rank-name-text';
  nameEl.textContent = player.name;
  nameEl.style.color = playerColor;
  left.appendChild(nameEl);

  var scoreEl = document.createElement('div');
  scoreEl.className = 'match-tag';
  scoreEl.style.color = playerColor;

  var scoreValue = document.createElement('span');
  scoreValue.className = 'match-score-value';
  scoreValue.textContent = player.score;
  scoreEl.appendChild(scoreValue);

  var scoreUnit = document.createElement('span');
  scoreUnit.className = 'match-score-unit';
  scoreUnit.textContent = 'PTS';
  scoreEl.appendChild(scoreUnit);

  row.appendChild(left);
  row.appendChild(scoreEl);
  return row;
}

function renderScoreBreakdown(state) {
  if (!state || !state.players) return;

  var previousPositions = new Map();
  matchListEl.querySelectorAll('.match-item[data-player-id]').forEach((row) => {
    previousPositions.set(row.dataset.playerId, row.getBoundingClientRect().top);
  });
  matchListEl.innerHTML = '';

  var rankedPlayers = state.players.map((p, idx) => ({
    ...p,
    originalIdx: p.seatIndex ?? idx
  }));
  rankedPlayers.sort((a, b) => (b.score || 0) - (a.score || 0) || a.originalIdx - b.originalIdx);
  if (rankedPlayers.length === 0) {
    matchListEl.innerHTML = `<div class="match-list-empty">Chưa có dữ liệu...</div>`;
    resetLeaderboardVisualState();
    return;
  }

  var nextRanks = new Map();
  var nextLeaderId = rankedPlayers[0].id;
  var leaderChanged =
    previousLeaderboardLeaderId !== null && previousLeaderboardLeaderId !== nextLeaderId;

  rankedPlayers.forEach((p, index) => {
    var isMe = p.id === myPlayerId;
    var previousRank = previousLeaderboardRanks.get(p.id);
    var rankChange = previousRank === undefined ? 0 : previousRank - index;
    var row = buildScoreRow(p, index, isMe, rankChange, leaderChanged);
    matchListEl.appendChild(row);
    nextRanks.set(p.id, index);

    var previousTop = previousPositions.get(p.id);
    if (previousTop !== undefined && rankChange !== 0 && typeof row.animate === 'function') {
      var offset = previousTop - row.getBoundingClientRect().top;
      row.animate([{ transform: `translateY(${offset}px)` }, { transform: 'translateY(0)' }], {
        duration: 550,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
      });
    }
  });

  previousLeaderboardRanks = nextRanks;
  previousLeaderboardLeaderId = nextLeaderId;
  refreshIcons();
}

function updateTimerUI(timeLeft) {
  var maxTime = localRoomState && localRoomState.turnTimeLimit ? localRoomState.turnTimeLimit : 8.0;
  var percent = Math.max(0, (timeLeft / maxTime) * 100);
  timerBarFillEl.style.width = `${percent}%`;
  timerTextEl.textContent = `${timeLeft.toFixed(1)}s`;

  var isWarning = timeLeft <= TIMER_WARNING_THRESHOLD_S;
  timerBarFillEl.classList.toggle('warning', isWarning);
  timerTextEl.style.color = isWarning ? 'var(--matchbox-red)' : 'var(--matchbox-gold)';
}

function updateUI(state) {
  if (!state || !state.players) return;

  updateLobbyUI(state);
  renderOpponentBoards(state);
}
