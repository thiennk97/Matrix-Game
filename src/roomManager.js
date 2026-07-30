const { TOTAL_SLOTS, VERTICAL_SLOTS } = require('./constants');
const { calculateScoreIncremental } = require('./gameLogic');

const rooms = {};

/**
 * Build lightweight player info (no board/matchedLines) for "other" players.
 */
function getLightweightPlayers(room) {
  return room.players.map(p => ({
    socketId: p.socketId,
    name: p.name,
    ready: p.ready,
    connected: !!p.socketId,
    score: p.score,
    hasPlacedThisRound: p.hasPlacedThisRound
  }));
}

/**
 * Build the shared (non-player-specific) state fields.
 */
function getBaseState(room) {
  return {
    roomCode: room.roomCode,
    turn: room.turn,
    currentPiece: room.turn < room.sharedPieceDeck.length ? room.sharedPieceDeck[room.turn] : [7, 8, 9],
    timeLeft: room.timeLeft,
    turnTimeLimit: room.turnTimeLimit,
    isGameStarted: room.isGameStarted,
    isGameOver: room.isGameOver
  };
}

/**
 * Send personalized state to each player.
 * Each player receives their OWN board + matchedLines,
 * but only lightweight info (name, score, status) for other players.
 * This cuts payload by ~87% for 8-player games.
 */
function emitRoomState(io, room) {
  let basePlayers = getLightweightPlayers(room);
  let baseState = getBaseState(room);

  room.players.forEach((p, idx) => {
    if (!p.socketId) return;

    // Clone basePlayers and inject this player's own board + matchedLines
    let personalPlayers = basePlayers.map((bp, i) => {
      if (i === idx) {
        return { ...bp, board: p.board, matchedLines: p.matchedLines };
      }
      return bp;
    });

    io.to(p.socketId).emit('room_state_update', {
      ...baseState,
      players: personalPlayers
    });
  });
}

/**
 * Full state for a specific player (used for single-socket events like join).
 */
function getStateForPlayer(room, playerIdx) {
  let basePlayers = getLightweightPlayers(room);
  let baseState = getBaseState(room);

  let personalPlayers = basePlayers.map((bp, i) => {
    if (i === playerIdx) {
      let p = room.players[i];
      return { ...bp, board: p.board, matchedLines: p.matchedLines };
    }
    return bp;
  });

  return { ...baseState, players: personalPlayers };
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

  emitRoomState(io, room);

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
        let res = calculateScoreIncremental(player.board, coords, player.matchedLines);
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
    // Game over: send personalized final state
    emitRoomState(io, room);
    io.to(roomCode).emit('game_over', { ...getBaseState(room), players: getLightweightPlayers(room) });
    
    // Explicitly release memory after match
    setTimeout(() => {
      if (rooms[roomCode] && rooms[roomCode].isGameOver) {
        console.log(`🧹 Releasing memory for Room [${roomCode}] after match...`);
        rooms[roomCode].sharedPieceDeck = [];
        rooms[roomCode].players.forEach(p => {
          p.board = [];
          p.matchedLines = [];
        });
      }
    }, 10000);
  }
}

module.exports = {
  rooms,
  emitRoomState,
  getStateForPlayer,
  startServerTurnTimer,
  advanceNextTurnServer
};
