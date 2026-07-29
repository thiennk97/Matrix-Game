const { TOTAL_SLOTS, TURN_TIME_LIMIT, VERTICAL_SLOTS } = require('./constants');
const { calculateScoreForBoard } = require('./gameLogic');

const rooms = {};

function getPublicRoomState(room) {
  let currentPiece = room.turn < room.sharedPieceDeck.length ? room.sharedPieceDeck[room.turn] : [7, 8, 9];
  return {
    roomCode: room.roomCode,
    p1SocketId: room.p1SocketId,
    p2SocketId: room.p2SocketId,
    p1Name: room.p1Name,
    p2Name: room.p2Name,
    p1Ready: room.p1Ready,
    p2Ready: room.p2Ready,
    p1Connected: !!room.p1SocketId,
    p2Connected: !!room.p2SocketId,
    p1Board: room.p1Board,
    p2Board: room.p2Board,
    p1Score: room.p1Score,
    p2Score: room.p2Score,
    p1HasPlacedThisRound: room.p1HasPlacedThisRound,
    p2HasPlacedThisRound: room.p2HasPlacedThisRound,
    p1MatchedLines: room.p1MatchedLines,
    p2MatchedLines: room.p2MatchedLines,
    turn: room.turn,
    currentPiece: currentPiece,
    timeLeft: room.timeLeft,
    isGameStarted: room.isGameStarted,
    isGameOver: room.isGameOver
  };
}

function startServerTurnTimer(io, roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  if (room.timerInterval) {
    clearInterval(room.timerInterval);
  }

  room.timeLeft = TURN_TIME_LIMIT;
  room.p1HasPlacedThisRound = false;
  room.p2HasPlacedThisRound = false;

  io.to(roomCode).emit('room_state_update', getPublicRoomState(room));

  room.timerInterval = setInterval(() => {
    room.timeLeft -= 0.1;
    if (room.timeLeft <= 0) {
      room.timeLeft = 0;
      clearInterval(room.timerInterval);
      room.timerInterval = null;
      advanceNextTurnServer(io, roomCode);
    } else {
      io.to(roomCode).emit('timer_tick', { timeLeft: room.timeLeft });
    }
  }, 100);
}

function advanceNextTurnServer(io, roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  let pieceValues = room.sharedPieceDeck[room.turn];

  // Auto place for Player 1 if not placed during this round
  if (!room.p1HasPlacedThisRound) {
    let availableIndicesP1 = [];
    for (let i = 0; i < 27; i++) {
      let coords = VERTICAL_SLOTS[i];
      let isEmpty = coords.every(c => room.p1Board[c.r][c.c] === null);
      if (isEmpty) availableIndicesP1.push(i);
    }
    if (availableIndicesP1.length > 0) {
      let randomIdx = availableIndicesP1[Math.floor(Math.random() * availableIndicesP1.length)];
      let coords = VERTICAL_SLOTS[randomIdx];
      coords.forEach((coord, idx) => {
        room.p1Board[coord.r][coord.c] = pieceValues[idx];
      });
      let res1 = calculateScoreForBoard(room.p1Board);
      room.p1Score = res1.totalScore;
      room.p1MatchedLines = res1.matchLines;
    }
  }

  // Auto place for Player 2 if not placed during this round
  if (!room.p2HasPlacedThisRound) {
    let availableIndicesP2 = [];
    for (let i = 0; i < 27; i++) {
      let coords = VERTICAL_SLOTS[i];
      let isEmpty = coords.every(c => room.p2Board[c.r][c.c] === null);
      if (isEmpty) availableIndicesP2.push(i);
    }
    if (availableIndicesP2.length > 0) {
      let randomIdx = availableIndicesP2[Math.floor(Math.random() * availableIndicesP2.length)];
      let coords = VERTICAL_SLOTS[randomIdx];
      coords.forEach((coord, idx) => {
        room.p2Board[coord.r][coord.c] = pieceValues[idx];
      });
      let res2 = calculateScoreForBoard(room.p2Board);
      room.p2Score = res2.totalScore;
      room.p2MatchedLines = res2.matchLines;
    }
  }

  room.p1HasPlacedThisRound = false;
  room.p2HasPlacedThisRound = false;
  room.turn++;

  if (room.turn < TOTAL_SLOTS) {
    startServerTurnTimer(io, roomCode);
  } else {
    room.isGameOver = true;
    io.to(roomCode).emit('game_over', getPublicRoomState(room));
  }
}

module.exports = {
  rooms,
  getPublicRoomState,
  startServerTurnTimer,
  advanceNextTurnServer
};
