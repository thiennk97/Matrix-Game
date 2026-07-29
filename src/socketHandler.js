const { VERTICAL_SLOTS } = require('./constants');
const { createNewRoomState, createPlayerState, MAX_PLAYERS, generateFairPieceDeck, calculateScoreForBoard } = require('./gameLogic');
const { rooms, getPublicRoomState, startServerTurnTimer } = require('./roomManager');

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
      const activeSockets = io.sockets.adapter.rooms.get(roomCode);

      // Check if this socket already has a slot
      let existingIdx = room.players.findIndex(p => p.socketId === socket.id);
      if (existingIdx >= 0) {
        // Already in room, just update name if provided
        if (playerName) room.players[existingIdx].name = playerName;
        socket.emit('assigned_role', { playerIndex: existingIdx, roomCode: roomCode });
        io.to(roomCode).emit('room_state_update', getPublicRoomState(room));
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
      io.to(roomCode).emit('room_state_update', getPublicRoomState(room));
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

      io.to(roomCode).emit('room_state_update', getPublicRoomState(room));
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
      let res = calculateScoreForBoard(player.board);
      player.score = res.totalScore;
      player.matchedLines = res.matchLines;

      io.to(roomCode).emit('room_state_update', getPublicRoomState(room));
      console.log(`🎯 Player ${playerIndex + 1} placed piece (slot #${slotIdx}) in Room [${roomCode}]`);
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
          io.to(roomCode).emit('room_state_update', getPublicRoomState(room));
        }
      }
    });
  });
}

module.exports = {
  registerSocketHandlers
};
