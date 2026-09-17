import * as tankService from '../services/tankRoomService.js';

export function registerTankSocketHandlers(io, socket) {
  function reply(ack, payload) {
    if (typeof ack === 'function') ack(payload);
  }

  function replyError(ack, message, code = 'REQUEST_FAILED') {
    reply(ack, { ok: false, error: { code, message } });
  }

  function broadcastTankLobby() {
    io.emit('tank_lobby_update', { rooms: tankService.listOpenTankRooms() });
  }

  // 1. List rooms
  socket.on('tank_list_rooms', (_, ack) => {
    reply(ack, { ok: true, data: { rooms: tankService.listOpenTankRooms() } });
  });

  // 2. Create room
  socket.on('tank_create_room', ({ playerName }, ack) => {
    if (!playerName || typeof playerName !== 'string' || !playerName.trim()) {
      return replyError(ack, 'Tên người chơi không được để trống.');
    }

    // Leave any existing tank room first
    tankService.leaveTankRoom(socket.id);

    const { room, playerId, player } = tankService.createTankRoom(playerName, socket.id);
    socket.join(`tank_${room.roomCode}`);

    reply(ack, {
      ok: true,
      data: {
        roomCode: room.roomCode,
        playerId,
        player,
        room
      }
    });

    broadcastTankLobby();
  });

  // 3. Join room
  socket.on('tank_join_room', ({ roomCode, playerName }, ack) => {
    if (!playerName || typeof playerName !== 'string' || !playerName.trim()) {
      return replyError(ack, 'Tên người chơi không được để trống.');
    }
    if (!roomCode || typeof roomCode !== 'string') {
      return replyError(ack, 'Mã phòng không hợp lệ.');
    }

    tankService.leaveTankRoom(socket.id);

    const res = tankService.joinTankRoom(roomCode, playerName, socket.id);
    if (res.error) {
      return replyError(ack, res.message, res.error);
    }

    socket.join(`tank_${res.room.roomCode}`);
    reply(ack, {
      ok: true,
      data: {
        roomCode: res.room.roomCode,
        playerId: res.playerId,
        player: res.player,
        room: res.room
      }
    });

    io.to(`tank_${res.room.roomCode}`).emit('tank_room_updated', { room: res.room });
    broadcastTankLobby();
  });

  // 4. Switch team (blue <-> red)
  socket.on('tank_switch_team', ({ roomCode, team }, ack) => {
    const res = tankService.switchTankTeam(roomCode, socket.id, team);
    if (res.error) return replyError(ack, res.message, res.error);

    reply(ack, { ok: true, data: { room: res.room } });
    io.to(`tank_${res.room.roomCode}`).emit('tank_room_updated', { room: res.room });
    broadcastTankLobby();
  });

  // 5. Toggle ready
  socket.on('tank_toggle_ready', ({ roomCode }, ack) => {
    const res = tankService.toggleTankReady(roomCode, socket.id);
    if (res.error) return replyError(ack, res.message, res.error);

    reply(ack, { ok: true, data: { room: res.room } });
    io.to(`tank_${res.room.roomCode}`).emit('tank_room_updated', { room: res.room });
  });

  // 6. Start game
  socket.on('tank_start_game', ({ roomCode }, ack) => {
    const res = tankService.startTankGame(roomCode, socket.id);
    if (res.error) return replyError(ack, res.message, res.error);

    reply(ack, { ok: true, data: { room: res.room } });
    io.to(`tank_${res.room.roomCode}`).emit('tank_game_started', { room: res.room });
    broadcastTankLobby();
  });

  // 7. Leave room
  socket.on('tank_leave_room', (_, ack) => {
    const res = tankService.leaveTankRoom(socket.id);
    if (res) {
      socket.leave(`tank_${res.roomCode}`);
      if (!res.roomDeleted) {
        io.to(`tank_${res.roomCode}`).emit('tank_room_updated', { room: res.room });
      }
      broadcastTankLobby();
    }
    reply(ack, { ok: true });
  });

  // 8. Kick player (Host only)
  socket.on('tank_kick_player', ({ roomCode, targetPlayerId }, ack) => {
    const res = tankService.kickTankPlayer(roomCode, socket.id, targetPlayerId);
    if (res.error) return replyError(ack, res.message, res.error);

    reply(ack, { ok: true, data: { room: res.room } });
    io.to(`tank_${res.room.roomCode}`).emit('tank_room_updated', { room: res.room });

    if (res.kickedPlayer?.socketId) {
      const kickedSocket = io.sockets.sockets.get(res.kickedPlayer.socketId);
      if (kickedSocket) {
        kickedSocket.leave(`tank_${res.room.roomCode}`);
        kickedSocket.emit('tank_kicked', { message: 'Bạn đã bị chủ phòng kích khỏi phòng.' });
      }
    }
    broadcastTankLobby();
  });

  // --- In-Game Synchronization ---

  // Tank Move Relay
  socket.on('tank_sync_move', ({ roomCode, x, y, dir }) => {
    socket.to(`tank_${roomCode}`).emit('tank_remote_move', {
      socketId: socket.id,
      x,
      y,
      dir
    });
  });

  // Tank Respawn Relay
  socket.on('tank_sync_respawn', ({ roomCode, playerId, x, y, dir }) => {
    socket.to(`tank_${roomCode}`).emit('tank_remote_respawn', {
      playerId,
      x,
      y,
      dir
    });
  });

  // Tank Shoot Relay
  socket.on('tank_sync_shoot', ({ roomCode, x, y, dir, power, ownerId, ownerTeam }) => {
    socket.to(`tank_${roomCode}`).emit('tank_remote_shoot', {
      x,
      y,
      dir,
      power,
      ownerId,
      ownerTeam
    });
  });

  // Tile Hit Relay
  socket.on('tank_sync_tile', ({ roomCode, row, col, newType, hp }) => {
    socket.to(`tank_${roomCode}`).emit('tank_remote_tile', { row, col, newType, hp });
  });

  // Player Killed Relay
  socket.on('tank_sync_kill', ({ roomCode, victimId, killerId }) => {
    const room = tankService.getTankRoom(roomCode);
    if (room && room.status === 'PLAYING') {
      const killer = room.players.find(p => p.id === killerId);
      const victim = room.players.find(p => p.id === victimId);
      if (!victim) return;
      if ((victim.lives ?? 3) <= 0) return;

      // Prevent duplicate kill deductions within 1.5s immunity window
      const now = Date.now();
      if (victim.lastKilledAt && (now - victim.lastKilledAt < 1500)) {
        return;
      }
      victim.lastKilledAt = now;

      if (killer) killer.kills++;
      victim.deaths++;
      victim.lives = Math.max(0, (victim.lives ?? 3) - 1);

      const victimTeam = victim?.team;
      const teamPlayers = room.players.filter(p => p.team === victimTeam);
      const teamRemainingLives = teamPlayers.reduce((sum, p) => sum + (p.lives ?? 0), 0);

      // If whole team has 0 lives left -> Game Over!
      if (victimTeam && teamRemainingLives <= 0) {
        room.status = 'FINISHED';
        room.winner = victimTeam === 'blue' ? 'red' : 'blue';
        if (!room.teamScores) room.teamScores = { blue: 0, red: 0 };
        room.teamScores[room.winner] = (room.teamScores[room.winner] || 0) + 1;
        io.to(`tank_${roomCode}`).emit('tank_game_over', {
          winner: room.winner,
          reason: 'lives',
          eliminatedTeam: victimTeam,
          room
        });
        broadcastTankLobby();
      } else {
        io.to(`tank_${roomCode}`).emit('tank_remote_kill', {
          victimId,
          killerId,
          victimLives: victim ? victim.lives : 0,
          room
        });
      }
    }
  });

  // Eagle Destroyed -> Game Over
  socket.on('tank_sync_eagle', ({ roomCode, destroyedTeam }) => {
    const room = tankService.getTankRoom(roomCode);
    if (room && room.status === 'PLAYING') {
      room.status = 'FINISHED';
      // If blue eagle destroyed -> red wins; if red eagle destroyed -> blue wins
      room.winner = destroyedTeam === 'blue' ? 'red' : 'blue';
      room.eagles[destroyedTeam].alive = false;
      if (!room.teamScores) room.teamScores = { blue: 0, red: 0 };
      room.teamScores[room.winner] = (room.teamScores[room.winner] || 0) + 1;

      io.to(`tank_${roomCode}`).emit('tank_game_over', {
        winner: room.winner,
        reason: 'eagle',
        destroyedTeam,
        room
      });
      broadcastTankLobby();
    }
  });

  // Rematch
  socket.on('tank_rematch', ({ roomCode }, ack) => {
    const room = tankService.resetTankRematch(roomCode);
    if (room) {
      reply(ack, { ok: true, data: { room } });
      io.to(`tank_${roomCode}`).emit('tank_room_updated', { room });
      broadcastTankLobby();
    } else {
      replyError(ack, 'Không thể đấu lại.');
    }
  });
}

export function handleTankDisconnect(io, socket) {
  const res = tankService.leaveTankRoom(socket.id);
  if (res) {
    socket.leave(`tank_${res.roomCode}`);
    if (!res.roomDeleted) {
      io.to(`tank_${res.roomCode}`).emit('tank_room_updated', { room: res.room });
    }
    io.emit('tank_lobby_update', { rooms: tankService.listOpenTankRooms() });
  }
}
