const { TOTAL_SLOTS, VERTICAL_SLOTS } = require('./constants');
const { calculateScoreForBoard } = require('./gameLogic');

const rooms = {};

function getPublicRoomState(room) {
  let currentPiece = room.turn < room.sharedPieceDeck.length ? room.sharedPieceDeck[room.turn] : [7, 8, 9];
  return {
    roomCode: room.roomCode,
    players: room.players.map(p => ({
      socketId: p.socketId,
      name: p.name,
      ready: p.ready,
      connected: !!p.socketId,
      board: p.board,
      score: p.score,
      hasPlacedThisRound: p.hasPlacedThisRound,
      matchedLines: p.matchedLines
    })),
    turn: room.turn,
    currentPiece: currentPiece,
    timeLeft: room.timeLeft,
    turnTimeLimit: room.turnTimeLimit,
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

  room.timeLeft = room.turnTimeLimit;
  // Reset hasPlacedThisRound for all players
  room.players.forEach(p => {
    p.hasPlacedThisRound = false;
  });

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

  // Auto place for all players who haven't placed this round
  room.players.forEach(player => {
    if (!player.hasPlacedThisRound) {
      let availableIndices = [];
      for (let i = 0; i < 27; i++) {
        let coords = VERTICAL_SLOTS[i];
        let isEmpty = coords.every(c => player.board[c.r][c.c] === null);
        if (isEmpty) availableIndices.push(i);
      }
      if (availableIndices.length > 0) {
        let randomIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        let coords = VERTICAL_SLOTS[randomIdx];
        coords.forEach((coord, idx) => {
          player.board[coord.r][coord.c] = pieceValues[idx];
        });
        let res = calculateScoreForBoard(player.board);
        player.score = res.totalScore;
        player.matchedLines = res.matchLines;
      }
    }
  });

  // Reset for next turn
  room.players.forEach(p => {
    p.hasPlacedThisRound = false;
  });
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
