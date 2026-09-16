import * as caroService from '../services/caroRoomService.js';

export function registerCaroSocketHandlers(io, socket) {
  function reply(ack, payload) {
    if (typeof ack === 'function') ack(payload);
  }

  function replyError(ack, message, code = 'REQUEST_FAILED') {
    reply(ack, { ok: false, error: { code, message } });
  }

  function broadcastCaroLobby() {
    io.emit('caro_lobby_update', { rooms: caroService.listOpenCaroRooms() });
  }

  // 1. List rooms
  socket.on('caro_list_rooms', (_, ack) => {
    reply(ack, { ok: true, data: { rooms: caroService.listOpenCaroRooms() } });
  });

  // 2. Create room
  socket.on('caro_create_room', ({ playerName, options = {} }, ack) => {
    if (!playerName || typeof playerName !== 'string' || !playerName.trim()) {
      return replyError(ack, 'Tên người chơi không được để trống.');
    }

    caroService.leaveCaroRoom(socket.id);

    const { room, playerId, player } = caroService.createCaroRoom(playerName, socket.id, options);
    socket.join(`caro_${room.roomCode}`);

    reply(ack, {
      ok: true,
      data: {
        roomCode: room.roomCode,
        playerId,
        player,
        room
      }
    });

    broadcastCaroLobby();
  });

  // 3. Join room
  socket.on('caro_join_room', ({ roomCode, playerName }, ack) => {
    if (!playerName || typeof playerName !== 'string' || !playerName.trim()) {
      return replyError(ack, 'Tên người chơi không được để trống.');
    }
    if (!roomCode || typeof roomCode !== 'string') {
      return replyError(ack, 'Mã phòng không hợp lệ.');
    }

    caroService.leaveCaroRoom(socket.id);

    const res = caroService.joinCaroRoom(roomCode, playerName, socket.id);
    if (res.error) {
      return replyError(ack, res.message, res.error);
    }

    socket.join(`caro_${res.room.roomCode}`);
    reply(ack, {
      ok: true,
      data: {
        roomCode: res.room.roomCode,
        playerId: res.playerId,
        player: res.player,
        isSpectator: res.isSpectator,
        room: res.room
      }
    });

    io.to(`caro_${res.room.roomCode}`).emit('caro_room_updated', { room: res.room });
    broadcastCaroLobby();
  });

  // 4. Toggle ready
  socket.on('caro_toggle_ready', ({ roomCode }, ack) => {
    const res = caroService.toggleCaroReady(roomCode, socket.id);
    if (res.error) return replyError(ack, res.message, res.error);

    reply(ack, { ok: true, data: { room: res.room } });
    io.to(`caro_${res.room.roomCode}`).emit('caro_room_updated', { room: res.room });
  });

  // 5. Switch symbol (X <-> O)
  socket.on('caro_switch_symbol', ({ roomCode }, ack) => {
    const res = caroService.switchCaroSymbol(roomCode, socket.id);
    if (res.error) return replyError(ack, res.message, res.error);

    reply(ack, { ok: true, data: { room: res.room } });
    io.to(`caro_${res.room.roomCode}`).emit('caro_room_updated', { room: res.room });
  });

  // 6. Start game
  socket.on('caro_start_game', ({ roomCode }, ack) => {
    const onTimeout = (room, timedOutSymbol, winnerSymbol) => {
      io.to(`caro_${room.roomCode}`).emit('caro_game_over', {
        room,
        winner: winnerSymbol,
        winReason: 'timeout',
        timedOutSymbol
      });
      broadcastCaroLobby();
    };

    const res = caroService.startCaroGame(roomCode, socket.id, onTimeout);
    if (res.error) return replyError(ack, res.message, res.error);

    reply(ack, { ok: true, data: { room: res.room } });
    io.to(`caro_${res.room.roomCode}`).emit('caro_game_started', { room: res.room });
    broadcastCaroLobby();
  });

  // 7. Place stone
  socket.on('caro_place_stone', ({ roomCode, row, col }, ack) => {
    const onTimeout = (room, timedOutSymbol, winnerSymbol) => {
      io.to(`caro_${room.roomCode}`).emit('caro_game_over', {
        room,
        winner: winnerSymbol,
        winReason: 'timeout',
        timedOutSymbol
      });
      broadcastCaroLobby();
    };

    const res = caroService.placeStone(roomCode, socket.id, row, col, onTimeout);
    if (res.error) return replyError(ack, res.message, res.error);

    reply(ack, { ok: true, data: { room: res.room } });

    // Emit move to all players in the room
    io.to(`caro_${res.room.roomCode}`).emit('caro_stone_placed', {
      room: res.room,
      lastMove: res.room.lastMove
    });

    if (res.isGameOver) {
      io.to(`caro_${res.room.roomCode}`).emit('caro_game_over', {
        room: res.room,
        winner: res.winner,
        winningLine: res.winningLine,
        winReason: res.room.winReason
      });
      broadcastCaroLobby();
    }
  });

  // 8. Surrender
  socket.on('caro_surrender', ({ roomCode }, ack) => {
    const res = caroService.surrenderGame(roomCode, socket.id);
    if (res.error) return replyError(ack, res.message, res.error);

    reply(ack, { ok: true });
    io.to(`caro_${res.room.roomCode}`).emit('caro_game_over', {
      room: res.room,
      winner: res.room.winner,
      winReason: 'surrender',
      surrenderedPlayer: res.surrenderingPlayer?.name
    });
    broadcastCaroLobby();
  });

  // 9. Offer draw
  socket.on('caro_offer_draw', ({ roomCode }, ack) => {
    const res = caroService.offerDraw(roomCode, socket.id);
    if (res.error) return replyError(ack, res.message, res.error);

    reply(ack, { ok: true });
    io.to(`caro_${res.room.roomCode}`).emit('caro_draw_offered', {
      drawOffer: res.drawOffer,
      room: res.room
    });
  });

  // 10. Respond draw
  socket.on('caro_respond_draw', ({ roomCode, accept }, ack) => {
    const res = caroService.respondDraw(roomCode, socket.id, accept);
    if (res.error) return replyError(ack, res.message, res.error);

    reply(ack, { ok: true });
    if (res.drawAccepted) {
      io.to(`caro_${res.room.roomCode}`).emit('caro_game_over', {
        room: res.room,
        winner: 'DRAW',
        winReason: 'agreement'
      });
      broadcastCaroLobby();
    } else {
      io.to(`caro_${res.room.roomCode}`).emit('caro_draw_declined', { room: res.room });
    }
  });

  // 11. Rematch
  socket.on('caro_rematch', ({ roomCode }, ack) => {
    const room = caroService.resetCaroRematch(roomCode);
    if (!room) return replyError(ack, 'Không tìm thấy phòng.');

    reply(ack, { ok: true, data: { room } });
    io.to(`caro_${room.roomCode}`).emit('caro_rematch_started', { room });
    broadcastCaroLobby();
  });

  // 12. Chat message
  socket.on('caro_chat', ({ roomCode, message }) => {
    if (!message || typeof message !== 'string') return;
    const cleanMsg = message.trim().slice(0, 100);
    if (!cleanMsg) return;

    const room = caroService.getCaroRoom(roomCode);
    if (!room) return;

    const sender =
      room.players.find((p) => p.socketId === socket.id) ||
      room.spectators.find((s) => s.socketId === socket.id);

    if (sender) {
      io.to(`caro_${roomCode}`).emit('caro_chat_received', {
        senderName: sender.name,
        senderId: sender.id,
        symbol: sender.symbol || null,
        message: cleanMsg,
        timestamp: Date.now()
      });
    }
  });

  // 13. Floating Emoji
  socket.on('caro_send_emoji', ({ roomCode, emoji }) => {
    if (!emoji || typeof emoji !== 'string') return;
    const room = caroService.getCaroRoom(roomCode);
    if (!room) return;

    const sender =
      room.players.find((p) => p.socketId === socket.id) ||
      room.spectators.find((s) => s.socketId === socket.id);

    io.to(`caro_${roomCode}`).emit('caro_emoji_received', {
      senderName: sender?.name || 'Ai đó',
      emoji: emoji.slice(0, 8),
      id: Math.random().toString(36).slice(2)
    });
  });

  // 14. Leave room
  socket.on('caro_leave_room', (_, ack) => {
    const result = caroService.leaveCaroRoom(socket.id);
    reply(ack, { ok: true });

    if (result) {
      socket.leave(`caro_${result.roomCode}`);
      if (result.roomDeleted) {
        // Room empty & deleted
      } else {
        io.to(`caro_${result.roomCode}`).emit('caro_room_updated', { room: result.room });
      }
      broadcastCaroLobby();
    }
  });
}

export function handleCaroDisconnect(io, socket) {
  const result = caroService.leaveCaroRoom(socket.id);
  if (result) {
    if (!result.roomDeleted) {
      io.to(`caro_${result.roomCode}`).emit('caro_room_updated', { room: result.room });
    }
    io.emit('caro_lobby_update', { rooms: caroService.listOpenCaroRooms() });
  }
}
