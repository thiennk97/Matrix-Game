const { TOTAL_SLOTS, NUM_MIN, NUM_MAX, TURN_TIME_LIMIT } = require('./constants');

const MAX_PLAYERS = 4;

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
    isGameOver: false
  };
}

function calculateScoreForBoard(board) {
  let matchedCellsMap = new Map();
  let matchLines = [];

  // Rows
  for (let r = 0; r < 9; r++) {
    let matchLen = 1;
    for (let c = 0; c < 9; c++) {
      if (c < 8 && board[r][c] !== null && board[r][c] === board[r][c + 1]) {
        matchLen++;
      } else {
        if (matchLen >= 3) {
          let val = board[r][c];
          let startC = c - matchLen + 1;
          let endC = c;

          for (let k = startC; k <= endC; k++) {
            let key = `${r},${k}`;
            let curr = matchedCellsMap.get(key) || { count: 0, val };
            curr.count++;
            matchedCellsMap.set(key, curr);
          }

          matchLines.push({
            name: `Hàng ${r + 1}`,
            val, len: matchLen, points: val * matchLen,
            start: { r, c: startC },
            end: { r, c: endC }
          });
        }
        matchLen = 1;
      }
    }
  }

  // Columns
  for (let c = 0; c < 9; c++) {
    let matchLen = 1;
    for (let r = 0; r < 9; r++) {
      if (r < 8 && board[r][c] !== null && board[r][c] === board[r + 1][c]) {
        matchLen++;
      } else {
        if (matchLen >= 3) {
          let val = board[r][c];
          let startR = r - matchLen + 1;
          let endR = r;

          for (let k = startR; k <= endR; k++) {
            let key = `${k},${c}`;
            let curr = matchedCellsMap.get(key) || { count: 0, val };
            curr.count++;
            matchedCellsMap.set(key, curr);
          }

          matchLines.push({
            name: `Cột ${c + 1}`,
            val, len: matchLen, points: val * matchLen,
            start: { r: startR, c },
            end: { r: endR, c }
          });
        }
        matchLen = 1;
      }
    }
  }

  // Diagonals Main
  for (let k = 0; k < 9 + 9 - 1; k++) {
    let line = [];
    for (let r = 0; r < 9; r++) {
      let c = k - r;
      if (c >= 0 && c < 9) {
        line.push({ r, c, val: board[r][c] });
      }
    }
    if (line.length >= 3) {
      let matchLen = 1;
      for (let i = 0; i < line.length; i++) {
        if (i < line.length - 1 && line[i].val !== null && line[i].val === line[i + 1].val) {
          matchLen++;
        } else {
          if (matchLen >= 3) {
            let val = line[i].val;
            let startCell = line[i - matchLen + 1];
            let endCell = line[i];

            for (let m = i - matchLen + 1; m <= i; m++) {
              let cell = line[m];
              let key = `${cell.r},${cell.c}`;
              let curr = matchedCellsMap.get(key) || { count: 0, val };
              curr.count++;
              matchedCellsMap.set(key, curr);
            }

            matchLines.push({
              name: `Chéo \\ (${matchLen} ô)`,
              val, len: matchLen, points: val * matchLen,
              start: { r: startCell.r, c: startCell.c },
              end: { r: endCell.r, c: endCell.c }
            });
          }
          matchLen = 1;
        }
      }
    }
  }

  // Diagonals Anti
  for (let k = 0; k < 9 + 9 - 1; k++) {
    let line = [];
    for (let r = 0; r < 9; r++) {
      let c = r - k + 8;
      if (c >= 0 && c < 9) {
        line.push({ r, c, val: board[r][c] });
      }
    }
    if (line.length >= 3) {
      let matchLen = 1;
      for (let i = 0; i < line.length; i++) {
        if (i < line.length - 1 && line[i].val !== null && line[i].val === line[i + 1].val) {
          matchLen++;
        } else {
          if (matchLen >= 3) {
            let val = line[i].val;
            let startCell = line[i - matchLen + 1];
            let endCell = line[i];

            for (let m = i - matchLen + 1; m <= i; m++) {
              let cell = line[m];
              let key = `${cell.r},${cell.c}`;
              let curr = matchedCellsMap.get(key) || { count: 0, val };
              curr.count++;
              matchedCellsMap.set(key, curr);
            }

            matchLines.push({
              name: `Chéo / (${matchLen} ô)`,
              val, len: matchLen, points: val * matchLen,
              start: { r: startCell.r, c: startCell.c },
              end: { r: endCell.r, c: endCell.c }
            });
          }
          matchLen = 1;
        }
      }
    }
  }

  let totalScore = 0;
  matchedCellsMap.forEach((info, key) => {
    totalScore += info.val * info.count;
  });

  return { totalScore, matchLines };
}

module.exports = {
  MAX_PLAYERS,
  randomNum,
  generateFairPieceDeck,
  createNewRoomState,
  createPlayerState,
  calculateScoreForBoard
};
