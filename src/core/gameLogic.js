const { TOTAL_SLOTS, NUM_MIN, NUM_MAX, TURN_TIME_LIMIT } = require('../config/constants');

const MAX_PLAYERS = 8;

function randomNum() {
  return Math.floor(Math.random() * (NUM_MAX - NUM_MIN + 1)) + NUM_MIN;
}

function generateFairPieceDeck() {
  let deck = [];
  for (let i = 0; i < TOTAL_SLOTS; i++) {
    deck.push([randomNum(), randomNum(), randomNum()]);
  }
  return deck;
}

function createPlayerState(socketId, name) {
  return {
    socketId: socketId,
    name: name || 'Player',
    ready: false,
    board: Array(9).fill(null).map(() => Array(9).fill(null)),
    score: 0,
    hasPlacedThisRound: false,
    matchedLines: []
  };
}

function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

function createNewRoomState(roomCode) {
  return {
    roomCode: roomCode,
    players: [],
    sharedPieceDeck: generateFairPieceDeck(),
    turn: 0,
    timeLeft: TURN_TIME_LIMIT,
    turnTimeLimit: TURN_TIME_LIMIT,
    timerInterval: null,
    isGameStarted: false,
    isGameOver: false,
    colorMapping: shuffle([0, 1, 2, 3, 4, 5, 6, 7])
  };
}

// --- Incremental Scoring ---
// Instead of scanning all 52 lines every move, only re-scan
// the ~10 lines (rows/cols/diagonals) that intersect the placed cells.

function getAffectedLineIds(coords) {
  let ids = new Set();
  coords.forEach(({ r, c }) => {
    ids.add(`row-${r}`);
    ids.add(`col-${c}`);
    ids.add(`diagA-${r + c}`);       // k = r + c (anti-diagonal sweep)
    ids.add(`diagB-${r - c + 8}`);   // k = r - c + 8 (main diagonal sweep)
  });
  return ids;
}

function scanRow(board, r) {
  let matches = [];
  let matchLen = 1;
  for (let c = 0; c < 9; c++) {
    if (c < 8 && board[r][c] !== null && board[r][c] === board[r][c + 1]) {
      matchLen++;
    } else {
      if (matchLen >= 3) {
        let val = board[r][c];
        let startC = c - matchLen + 1;
        matches.push({
          lineId: `row-${r}`,
          name: `Hàng ${r + 1}`,
          val, len: matchLen, points: val * matchLen,
          start: { r, c: startC },
          end: { r, c }
        });
      }
      matchLen = 1;
    }
  }
  return matches;
}

function scanCol(board, c) {
  let matches = [];
  let matchLen = 1;
  for (let r = 0; r < 9; r++) {
    if (r < 8 && board[r][c] !== null && board[r][c] === board[r + 1][c]) {
      matchLen++;
    } else {
      if (matchLen >= 3) {
        let val = board[r][c];
        let startR = r - matchLen + 1;
        matches.push({
          lineId: `col-${c}`,
          name: `Cột ${c + 1}`,
          val, len: matchLen, points: val * matchLen,
          start: { r: startR, c },
          end: { r, c }
        });
      }
      matchLen = 1;
    }
  }
  return matches;
}

function scanDiagA(board, k) {
  // k = r + c (labeled "Chéo \\" in game UI)
  let line = [];
  for (let r = 0; r < 9; r++) {
    let c = k - r;
    if (c >= 0 && c < 9) {
      line.push({ r, c, val: board[r][c] });
    }
  }
  return scanDiagLine(line, `diagA-${k}`, '\\');
}

function scanDiagB(board, k) {
  // k = r - c + 8 (labeled "Chéo /" in game UI)
  let line = [];
  for (let r = 0; r < 9; r++) {
    let c = r - k + 8;
    if (c >= 0 && c < 9) {
      line.push({ r, c, val: board[r][c] });
    }
  }
  return scanDiagLine(line, `diagB-${k}`, '/');
}

function scanDiagLine(line, lineId, symbol) {
  let matches = [];
  if (line.length < 3) return matches;

  let matchLen = 1;
  for (let i = 0; i < line.length; i++) {
    if (i < line.length - 1 && line[i].val !== null && line[i].val === line[i + 1].val) {
      matchLen++;
    } else {
      if (matchLen >= 3) {
        let val = line[i].val;
        let startCell = line[i - matchLen + 1];
        let endCell = line[i];
        matches.push({
          lineId,
          name: `Chéo ${symbol} (${matchLen} ô)`,
          val, len: matchLen, points: val * matchLen,
          start: { r: startCell.r, c: startCell.c },
          end: { r: endCell.r, c: endCell.c }
        });
      }
      matchLen = 1;
    }
  }
  return matches;
}

/**
 * Incremental scoring: only re-scan lines affected by the newly placed coords.
 * @param {Array} board - 9x9 board
 * @param {Array} placedCoords - array of {r, c} for the cells just placed
 * @param {Array} existingMatchLines - previous matchLines from player state
 * @returns {{ totalScore: number, matchLines: Array }}
 */
function calculateScoreIncremental(board, placedCoords, existingMatchLines) {
  let affectedIds = getAffectedLineIds(placedCoords);

  // Keep match lines from unaffected rows/cols/diags
  let keptLines = (existingMatchLines || []).filter(ml => !affectedIds.has(ml.lineId));

  // Re-scan only affected lines
  let newLines = [];
  affectedIds.forEach(id => {
    let parts = id.split('-');
    let type = parts[0];
    let idx = parseInt(parts[1]);

    if (type === 'row') {
      newLines.push(...scanRow(board, idx));
    } else if (type === 'col') {
      newLines.push(...scanCol(board, idx));
    } else if (type === 'diagA') {
      newLines.push(...scanDiagA(board, idx));
    } else if (type === 'diagB') {
      newLines.push(...scanDiagB(board, idx));
    }
  });

  let allLines = [...keptLines, ...newLines];
  let totalScore = allLines.reduce((sum, ml) => sum + ml.points, 0);

  return { totalScore, matchLines: allLines };
}

/**
 * Full board scan (kept as fallback/verification).
 */
function calculateScoreForBoard(board) {
  let matchLines = [];
  for (let r = 0; r < 9; r++) matchLines.push(...scanRow(board, r));
  for (let c = 0; c < 9; c++) matchLines.push(...scanCol(board, c));
  for (let k = 0; k < 17; k++) matchLines.push(...scanDiagA(board, k));
  for (let k = 0; k < 17; k++) matchLines.push(...scanDiagB(board, k));

  let totalScore = matchLines.reduce((sum, ml) => sum + ml.points, 0);
  return { totalScore, matchLines };
}

module.exports = {
  MAX_PLAYERS,
  randomNum,
  generateFairPieceDeck,
  createNewRoomState,
  createPlayerState,
  calculateScoreForBoard,
  calculateScoreIncremental
};
