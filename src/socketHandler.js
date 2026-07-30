const { VERTICAL_SLOTS, TOTAL_SLOTS } = require('./constants');
const { createNewRoomState, createPlayerState, MAX_PLAYERS, generateFairPieceDeck, calculateScoreIncremental } = require('./gameLogic');
const { rooms, emitRoomState, getStateForPlayer, startServerTurnTimer, advanceNextTurnServer } = require('./roomManager');

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`🟢 Client connected: ${socket.id}`);

    socket.on('join_room', ({ roomCode, playerName }) => {
      if (!roomCode) return;

      // Validate: tên bắt buộc
      playerName = (playerName || '').trim();
      if (!playerName) {
        socket.emit('error_message', '⚠️ Bạn phải nhập TÊN trước khi vào phòng!');
        return;
      }

      roomCode = String(roomCode).trim().toUpperCase();
      socket.join(roomCode);

      if (!rooms[roomCode]) {
        rooms[roomCode] = createNewRoomState(roomCode);
      }

      const room = rooms[roomCode];

      // Block joining if game has already started AND is not over yet
      if (room.isGameStarted && !room.isGameOver) {
        let existingIdx = room.players.findIndex(p => p.socketId === socket.id);
        // Only allow rejoin if they are already in the room
        if (existingIdx === -1) {
          socket.emit('error_message', '⚠️ Trận đấu đang diễn ra! Vui lòng chờ đến khi kết thúc.');
          return;
        }
      }

      const activeSockets = io.sockets.adapter.rooms.get(roomCode);

      // Check if this socket already has a slot
      let existingIdx = room.players.findIndex(p => p.socketId === socket.id);
      if (existingIdx >= 0) {
        // Already in room, just update name if provided
        if (playerName) room.players[existingIdx].name = playerName;
        socket.emit('assigned_role', { playerIndex: existingIdx, roomCode: roomCode });
        emitRoomState(io, room);
        console.log(`👥 Socket ${socket.id} rejoined room [${roomCode}] as Player ${existingIdx + 1}`);
        return;
      }

      // Try to take over a disconnected slot first
      let disconnectedIdx = room.players.findIndex(p => {
        return !p.socketId || (activeSockets && !activeSockets.has(p.socketId));
      });

      let playerIndex = -1;
      if (disconnectedIdx >= 0) {
        room.players[disconnectedIdx].socketId = socket.id;
        if (playerName) room.players[disconnectedIdx].name = playerName;
        playerIndex = disconnectedIdx;
      } else if (room.players.length < MAX_PLAYERS) {
        // Add new player
        let defaultName = playerName || `Player ${room.players.length + 1}`;
        let newPlayer = createPlayerState(socket.id, defaultName);
        room.players.push(newPlayer);
        playerIndex = room.players.length - 1;
      } else {
        // Room is full
        let playerNames = room.players.map(p => p.name).join(', ');
        socket.emit('error_message', `⚠️ Phòng [${roomCode}] đã đủ ${MAX_PLAYERS} người chơi!\n(${playerNames})\nVui lòng tạo hoặc nhập mã phòng khác.`);
        return;
      }

      socket.emit('assigned_role', { playerIndex: playerIndex, roomCode: roomCode });
      emitRoomState(io, room);
      console.log(`👥 Socket ${socket.id} joined room [${roomCode}] as Player ${playerIndex + 1}`);
    });

    socket.on('toggle_ready', ({ roomCode }) => {
      if (!roomCode) return;
      roomCode = String(roomCode).trim().toUpperCase();
      const room = rooms[roomCode];
      if (!room) return;

      let player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        player.ready = !player.ready;
      }

      emitRoomState(io, room);
      console.log(`⚡ Socket ${socket.id} toggled ready state in room [${roomCode}]`);
    });

    socket.on('start_game', ({ roomCode, turnTimeLimit }) => {
      if (!roomCode) return;
      roomCode = String(roomCode).trim().toUpperCase();
      const room = rooms[roomCode];
      if (!room) return;

      // Only host (player index 0) can start
      if (room.players.length === 0 || socket.id !== room.players[0].socketId) {
        socket.emit('error_message', '❌ Chỉ Host (Player 1) mới có quyền Bắt đầu trận đấu!');
        return;
      }

      // Set configurable turn time limit (validate allowed values)
      const ALLOWED_TIMES = [5, 8, 10, 15];
      if (turnTimeLimit && ALLOWED_TIMES.includes(Number(turnTimeLimit))) {
        room.turnTimeLimit = Number(turnTimeLimit);
      } else {
        room.turnTimeLimit = 8;
      }

      room.isGameStarted = true;
      room.turn = 0;
      room.sharedPieceDeck = generateFairPieceDeck();
      room.isGameOver = false;

      // Reset all players' boards and scores
      room.players.forEach(p => {
        p.board = Array(9).fill(null).map(() => Array(9).fill(null));
        p.score = 0;
        p.hasPlacedThisRound = false;
        p.matchedLines = [];
      });

      io.to(roomCode).emit('game_started');
      startServerTurnTimer(io, roomCode);
      console.log(`🚀 Game started in Room [${roomCode}] with ${room.players.length} players, timer=${room.turnTimeLimit}s`);
    });

    socket.on('make_move', ({ roomCode, slotIdx }) => {
      console.log(`[DEBUG] Received make_move from ${socket.id}: room=${roomCode}, slotIdx=${slotIdx}`);
      if (!roomCode) {
        socket.emit('error_message', '⚠️ Mã phòng không hợp lệ!');
        return;
      }
      roomCode = String(roomCode).trim().toUpperCase();
      const room = rooms[roomCode];
      if (!room) {
        socket.emit('error_message', `⚠️ Phòng [${roomCode}] không tồn tại trên Server!`);
        return;
      }
      if (!room.isGameStarted) {
        socket.emit('error_message', '⚠️ Trận đấu chưa bắt đầu!');
        return;
      }
      if (room.isGameOver) {
        socket.emit('error_message', '⚠️ Trận đấu đã kết thúc!');
        return;
      }

      let playerIndex = room.players.findIndex(p => p.socketId === socket.id);
      if (playerIndex < 0) {
        socket.emit('error_message', '⚠️ Socket của bạn chưa được gán vai trò trong phòng!');
        console.log(`⚠️ Socket ${socket.id} attempted move in [${roomCode}] but has no player slot`);
        return;
      }

      let player = room.players[playerIndex];

      if (player.hasPlacedThisRound) {
        socket.emit('error_message', '⚠️ Bạn đã đặt quân ở vòng này rồi!');
        return;
      }

      if (slotIdx === undefined || slotIdx === null || isNaN(slotIdx) || slotIdx < 0 || slotIdx >= 27) {
        console.log(`[DEBUG] Invalid slotIdx: ${slotIdx}`);
        socket.emit('error_message', `⚠️ Lỗi Server: slotIdx không hợp lệ (${slotIdx})!`);
        return;
      }

      let coords = VERTICAL_SLOTS[slotIdx];
      let isSlotEmpty = coords.every(coord => player.board[coord.r][coord.c] === null);
      if (!isSlotEmpty) {
        socket.emit('error_message', '⚠️ Vị trí này đã có ô khác chiếm!');
        return;
      }

      let pieceValues = room.sharedPieceDeck[room.turn];

      coords.forEach((coord, idx) => {
        player.board[coord.r][coord.c] = pieceValues[idx];
      });

      player.hasPlacedThisRound = true;
      let res = calculateScoreIncremental(player.board, coords, player.matchedLines);
      player.score = res.totalScore;
      player.matchedLines = res.matchLines;

      emitRoomState(io, room);
      console.log(`🎯 Player ${playerIndex + 1} placed piece (slot #${slotIdx}) in Room [${roomCode}]`);

      // If all players have placed their piece, skip the timer ONLY on the last turn (27/27) to end game immediately
      let allPlaced = room.players.every(p => p.hasPlacedThisRound);
      if (allPlaced && room.turn === TOTAL_SLOTS - 1) {
        if (room.timerInterval) {
          clearInterval(room.timerInterval);
          room.timerInterval = null;
        }
        room.timeLeft = 0;
        advanceNextTurnServer(io, roomCode);
        console.log(`⚡ All players placed pieces on final turn in Room [${roomCode}], ending game immediately.`);
      }
    });

    socket.on('leave_room', ({ roomCode }) => {
      if (!roomCode) return;
      socket.leave(roomCode);
      const room = rooms[roomCode];
      if (room) {
        let updated = false;
        room.players.forEach(p => {
          if (p.socketId === socket.id) {
            p.socketId = null;
            p.ready = false;
            updated = true;
          }
        });
        if (updated) {
          let allDisconnected = room.players.every(p => !p.socketId);
          if (allDisconnected) {
            console.log(`⚠️ All players left Room [${roomCode}], deleting room.`);
            if (room.timerInterval) {
              clearInterval(room.timerInterval);
            }
            delete rooms[roomCode];
          } else {
            emitRoomState(io, room);
          }
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔴 Client disconnected: ${socket.id}`);
      for (const roomCode in rooms) {
        const room = rooms[roomCode];
        let updated = false;
        room.players.forEach(p => {
          if (p.socketId === socket.id) {
            p.socketId = null;
            p.ready = false;
            updated = true;
          }
        });
        if (updated) {
          let allDisconnected = room.players.every(p => !p.socketId);
          if (allDisconnected) {
            console.log(`⚠️ All players disconnected in Room [${roomCode}], deleting room.`);
            if (room.timerInterval) {
              clearInterval(room.timerInterval);
            }
            delete rooms[roomCode];
          } else {
            emitRoomState(io, room);
          }
        }
      }
    });
  });
}

module.exports = {
  registerSocketHandlers
};
