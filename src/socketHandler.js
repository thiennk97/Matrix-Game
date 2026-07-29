const { VERTICAL_SLOTS } = require('./constants');
const { createNewRoomState, generateFairPieceDeck, calculateScoreForBoard } = require('./gameLogic');
const { rooms, getPublicRoomState, startServerTurnTimer } = require('./roomManager');

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`🟢 Client connected: ${socket.id}`);

    socket.on('join_room', ({ roomCode, playerName }) => {
      if (!roomCode) return;
      roomCode = String(roomCode).trim().toUpperCase();
      socket.join(roomCode);

      if (!rooms[roomCode]) {
        rooms[roomCode] = createNewRoomState(roomCode);
      }

      const room = rooms[roomCode];
      const activeSockets = io.sockets.adapter.rooms.get(roomCode);

      let p1Alive = activeSockets && room.p1SocketId && activeSockets.has(room.p1SocketId);
      let p2Alive = activeSockets && room.p2SocketId && activeSockets.has(room.p2SocketId);

      let playerRole = 1;
      if (room.p1SocketId === socket.id || !p1Alive) {
        room.p1SocketId = socket.id;
        if (playerName) room.p1Name = playerName;
        playerRole = 1;
      } else if (room.p2SocketId === socket.id || !p2Alive) {
        room.p2SocketId = socket.id;
        if (playerName) room.p2Name = playerName;
        playerRole = 2;
      } else {
        socket.emit('error_message', `⚠️ Phòng [${roomCode}] đã đủ 2 người chơi (${room.p1Name} & ${room.p2Name})! Vui lòng tạo hoặc nhập mã phòng khác.`);
        return;
      }

      socket.emit('assigned_role', { role: playerRole, roomCode: roomCode });
      io.to(roomCode).emit('room_state_update', getPublicRoomState(room));
      console.log(`👥 Socket ${socket.id} joined room [${roomCode}] as Player ${playerRole}`);
    });

    socket.on('toggle_ready', ({ roomCode }) => {
      if (!roomCode) return;
      roomCode = String(roomCode).trim().toUpperCase();
      const room = rooms[roomCode];
      if (!room) return;

      if (socket.id === room.p1SocketId) {
        room.p1Ready = !room.p1Ready;
      } else if (socket.id === room.p2SocketId) {
        room.p2Ready = !room.p2Ready;
      }

      io.to(roomCode).emit('room_state_update', getPublicRoomState(room));
      console.log(`⚡ Socket ${socket.id} toggled ready state in room [${roomCode}]`);
    });

    socket.on('start_game', ({ roomCode }) => {
      if (!roomCode) return;
      roomCode = String(roomCode).trim().toUpperCase();
      const room = rooms[roomCode];
      if (!room) return;

      if (socket.id !== room.p1SocketId) {
        socket.emit('error_message', '❌ Chỉ Host (Player 1) mới có quyền Bắt đầu trận đấu!');
        return;
      }

      room.isGameStarted = true;
      room.p1Board = Array(9).fill(null).map(() => Array(9).fill(null));
      room.p2Board = Array(9).fill(null).map(() => Array(9).fill(null));
      room.turn = 0;
      room.p1Score = 0;
      room.p2Score = 0;
      room.p1HasPlacedThisRound = false;
      room.p2HasPlacedThisRound = false;
      room.p1MatchedLines = [];
      room.p2MatchedLines = [];
      room.sharedPieceDeck = generateFairPieceDeck();
      room.isGameOver = false;

      io.to(roomCode).emit('game_started');
      startServerTurnTimer(io, roomCode);
      console.log(`🚀 Game started in Room [${roomCode}]`);
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

      let playerRole = 0;
      if (socket.id === room.p1SocketId) playerRole = 1;
      else if (socket.id === room.p2SocketId) playerRole = 2;

      if (playerRole === 0) {
        socket.emit('error_message', '⚠️ Socket của bạn chưa được gán vai trò trong phòng!');
        console.log(`⚠️ Socket ${socket.id} attempted move in [${roomCode}] but has role 0`);
        return;
      }

      let hasPlaced = playerRole === 1 ? room.p1HasPlacedThisRound : room.p2HasPlacedThisRound;
      if (hasPlaced) {
        socket.emit('error_message', '⚠️ Bạn đã đặt quân ở vòng này rồi!');
        return;
      }

      if (slotIdx === undefined || slotIdx === null || isNaN(slotIdx) || slotIdx < 0 || slotIdx >= 27) {
        console.log(`[DEBUG] Invalid slotIdx: ${slotIdx}`);
        socket.emit('error_message', `⚠️ Lỗi Server: slotIdx không hợp lệ (${slotIdx})!`);
        return;
      }

      let targetBoard = playerRole === 1 ? room.p1Board : room.p2Board;
      let coords = VERTICAL_SLOTS[slotIdx];
      let isSlotEmpty = coords.every(coord => targetBoard[coord.r][coord.c] === null);
      if (!isSlotEmpty) {
        socket.emit('error_message', '⚠️ Vị trí này đã có ô khác chiếm!');
        return;
      }

      let pieceValues = room.sharedPieceDeck[room.turn];

      coords.forEach((coord, idx) => {
        targetBoard[coord.r][coord.c] = pieceValues[idx];
      });

      if (playerRole === 1) {
        room.p1HasPlacedThisRound = true;
        let res = calculateScoreForBoard(room.p1Board);
        room.p1Score = res.totalScore;
        room.p1MatchedLines = res.matchLines;
      } else {
        room.p2HasPlacedThisRound = true;
        let res = calculateScoreForBoard(room.p2Board);
        room.p2Score = res.totalScore;
        room.p2MatchedLines = res.matchLines;
      }

      io.to(roomCode).emit('room_state_update', getPublicRoomState(room));
      console.log(`🎯 Player ${playerRole} placed piece (slot #${slotIdx}) on their board in Room [${roomCode}]`);
    });

    socket.on('disconnect', () => {
      console.log(`🔴 Client disconnected: ${socket.id}`);
      for (const roomCode in rooms) {
        const room = rooms[roomCode];
        let updated = false;
        if (room.p1SocketId === socket.id) {
          room.p1SocketId = null;
          room.p1Ready = false;
          updated = true;
        }
        if (room.p2SocketId === socket.id) {
          room.p2SocketId = null;
          room.p2Ready = false;
          updated = true;
        }
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
