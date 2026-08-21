import {
  TOTAL_SLOTS,
  NUM_MIN,
  NUM_MAX,
  TURN_TIME_LIMIT,
  ROOM_STATUS
} from '../config/constants.js';

const MAX_PLAYERS = 10;

function randomNum() {
  return Math.floor(Math.random() * (NUM_MAX - NUM_MIN + 1)) + NUM_MIN;
}

function generateFairPieceDeck() {
  const deck = [];
  for (let i = 0; i < TOTAL_SLOTS; i++) {
    deck.push([randomNum(), randomNum(), randomNum()]);
  }
  return deck;
}

function createEmptyBoard() {
  return Array(9)
    .fill(null)
    .map(() => Array(9).fill(null));
}

function createPlayerState(id, socketId, name, seatIndex) {
  return {
    id,
    socketId,
    name,
    seatIndex,
    connected: true,
    ready: false,
    board: createEmptyBoard(),
    score: 0,
    hasPlacedThisRound: false,
    matchedLines: [],
    joinedAt: Date.now(),
    disconnectedAt: null
  };
}

function createNewRoomState(roomCode, hostPlayerId) {
  const now = Date.now();
  return {
    schemaVersion: 1,
    roomCode,
    status: ROOM_STATUS.LOBBY,
    hostPlayerId,
    players: [],
    sharedPieceDeck: generateFairPieceDeck(),
    turn: 0,
    turnTimeLimit: TURN_TIME_LIMIT,
    turnEndsAt: null,
    remainingTurnMs: null,
    createdAt: now,
    updatedAt: now,
    stateVersion: 1
  };
}

function buildAffectedLineIds(coords) {
  const ids = new Set();
  coords.forEach(({ r, c }) => {
    ids.add(`row-${r}`);
    ids.add(`col-${c}`);
    ids.add(`diagA-${r + c}`);
    ids.add(`diagB-${r - c + 8}`);
  });
  return ids;
}

function findRuns(line, lineId, nameForLength) {
  const matches = [];
  if (line.length < 3) return matches;

  let runLength = 1;
  for (let i = 0; i < line.length; i++) {
    const continuesRun =
      i < line.length - 1 && line[i].val !== null && line[i].val === line[i + 1].val;
    if (continuesRun) {
      runLength++;
      continue;
    }
    if (runLength >= 3) {
      const val = line[i].val;
      const startCell = line[i - runLength + 1];
      const endCell = line[i];
      matches.push({
        lineId,
        name: nameForLength(runLength),
        val,
        len: runLength,
        points: val * runLength,
        start: { r: startCell.r, c: startCell.c },
        end: { r: endCell.r, c: endCell.c }
      });
    }
    runLength = 1;
  }
  return matches;
}

function scanRow(board, r) {
  const line = [];
  for (let c = 0; c < 9; c++) line.push({ r, c, val: board[r][c] });
  return findRuns(line, `row-${r}`, () => `Hàng ${r + 1}`);
}

function scanCol(board, c) {
  const line = [];
  for (let r = 0; r < 9; r++) line.push({ r, c, val: board[r][c] });
  return findRuns(line, `col-${c}`, () => `Cột ${c + 1}`);
}

function scanDiagA(board, k) {
  const line = [];
  for (let r = 0; r < 9; r++) {
    const c = k - r;
    if (c >= 0 && c < 9) line.push({ r, c, val: board[r][c] });
  }
  return findRuns(line, `diagA-${k}`, (len) => `Chéo \\ (${len} ô)`);
}

function scanDiagB(board, k) {
  const line = [];
  for (let r = 0; r < 9; r++) {
    const c = r - k + 8;
    if (c >= 0 && c < 9) line.push({ r, c, val: board[r][c] });
  }
  return findRuns(line, `diagB-${k}`, (len) => `Chéo / (${len} ô)`);
}

function scanLineById(board, lineId) {
  const [type, indexStr] = lineId.split('-');
  const index = parseInt(indexStr, 10);
  if (type === 'row') return scanRow(board, index);
  if (type === 'col') return scanCol(board, index);
  if (type === 'diagA') return scanDiagA(board, index);
  return scanDiagB(board, index);
}

function calculateScoreIncremental(board, placedCoords, existingMatchLines) {
  const affectedIds = buildAffectedLineIds(placedCoords);
  const keptLines = (existingMatchLines || []).filter((ml) => !affectedIds.has(ml.lineId));
  const rescannedLines = [...affectedIds].flatMap((id) => scanLineById(board, id));

  const allLines = [...keptLines, ...rescannedLines];
  const totalScore = allLines.reduce((sum, ml) => sum + ml.points, 0);

  return { totalScore, matchLines: allLines };
}

export {
  MAX_PLAYERS,
  generateFairPieceDeck,
  createNewRoomState,
  createPlayerState,
  createEmptyBoard,
  calculateScoreIncremental
};
