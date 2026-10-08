import * as tankService from '../services/tankRoomService.js';
import {
  stepGame,
  drainEvents,
  buildSnapshot,
  buildFullState,
  setInput,
  enqueueCommand,
  clearInput,
  TICK_RATE
} from '../core/tankEngine.js';

const TICK_MS = 1000 / TICK_RATE;
const SNAPSHOT_EVERY_TICKS = 1; // broadcast every tick (60Hz): smoother motion, snapshots are tiny
const LOOP_INTERVAL_MS = 4;
const MAX_CATCHUP_MS = 100;

const roomChannel = (roomCode) => `tank_${roomCode}`;

let loopStarted = false;

function broadcastLobby(io) {
  io.emit('tank_lobby_update', { rooms: tankService.listTankRooms() });
}

function emitRoomUpdate(io, room) {
  io.to(roomChannel(room.roomCode)).emit('tank_room_updated', { room: tankService.publicRoom(room) });
}

function finishMatch(io, room) {
  const result = tankService.finishTankGame(room);
  if (!result) return;
  const game = room.game;
  const snapshot = buildSnapshot(game, room, drainEvents(game));
  io.to(roomChannel(room.roomCode)).emit('tank_game_over', {
    winner: result.winner,
    reason: result.reason,
    destroyedTeam: result.destroyedTeam,
    snapshot,
    room: tankService.publicRoom(room)
  });
  room.game = null;
  room.loop = null;
  broadcastLobby(io);
}

function tickRoom(io, room, now) {
  const game = room.game;
  if (!game || room.status !== 'PLAYING') return;

  // Freeze the simulation while nobody is connected; it resumes when someone returns.
  if (!room.players.some((p) => p.connected)) {
    room.loop = null;
    return;
  }
  if (!room.loop) room.loop = { last: now, acc: 0 };

  room.loop.acc += Math.min(now - room.loop.last, MAX_CATCHUP_MS);
  room.loop.last = now;

  while (room.loop.acc >= TICK_MS) {
    room.loop.acc -= TICK_MS;
    const result = stepGame(game, room);
    if (game.tick % SNAPSHOT_EVERY_TICKS === 0 || result) {
      const snapshot = buildSnapshot(game, room, drainEvents(game));
      io.to(roomChannel(room.roomCode)).emit('tank_snapshot', snapshot);
    }
    if (result) {
      finishMatch(io, room);
      return;
    }
  }
}

function startLoop(io) {
  if (loopStarted) return;
  loopStarted = true;
  const timer = setInterval(() => {
    const now = performance.now();
    for (const room of tankService.listPlayingRooms()) {
      try {
        tickRoom(io, room, now);
      } catch (err) {
        console.error(`Tank room ${room.roomCode} tick failed:`, err);
      }
    }
  }, LOOP_INTERVAL_MS);
  timer.unref?.();
}

function sendFullState(socket, room) {
  if (room.status === 'PLAYING' && room.game) {
    socket.emit('tank_state_full', buildFullState(room.game, room));
  }
}

function handleRoomLeft(io, res) {
  if (!res) return;
  if (!res.roomDeleted && res.room) {
    emitRoomUpdate(io, res.room);
    // A forfeit may have decided the match; the loop picks it up on the next tick.
  }
  broadcastLobby(io);
}

export function registerTankSocketHandlers(io, socket) {
  tankService.setExpiryListener((res) => handleRoomLeft(io, res));
  startLoop(io);

  const reply = (ack, payload) => {
    if (typeof ack === 'function') ack(payload);
  };
  const replyError = (ack, message, code = 'REQUEST_FAILED') => reply(ack, { ok: false, error: { code, message } });

  function validName(playerName) {
    return typeof playerName === 'string' && playerName.trim().length > 0;
  }

  function leaveCurrent() {
    const res = tankService.leaveTankRoom(socket.id);
    if (res) {
      socket.leave(roomChannel(res.roomCode));
      handleRoomLeft(io, res);
    }
  }

  socket.on('tank_list_rooms', (_, ack) => {
    reply(ack, { ok: true, data: { rooms: tankService.listTankRooms() } });
  });

  socket.on('tank_create_room', ({ playerName } = {}, ack) => {
    if (!validName(playerName)) return replyError(ack, 'Tên người chơi không được để trống.');
    leaveCurrent();

    const created = tankService.createTankRoom(playerName, socket.id);
    if (created.error) return replyError(ack, created.message, created.error);

    const { room, playerId } = created;
    socket.join(roomChannel(room.roomCode));
    reply(ack, { ok: true, data: { roomCode: room.roomCode, playerId, room: tankService.publicRoom(room) } });
    broadcastLobby(io);
  });

  socket.on('tank_join_room', ({ roomCode, playerName } = {}, ack) => {
    if (!validName(playerName)) return replyError(ack, 'Tên người chơi không được để trống.');
    if (!roomCode || typeof roomCode !== 'string') return replyError(ack, 'Mã phòng không hợp lệ.');
    leaveCurrent();

    const res = tankService.joinTankRoom(roomCode, playerName, socket.id);
    if (res.error) return replyError(ack, res.message, res.error);

    socket.join(roomChannel(res.room.roomCode));
    reply(ack, {
      ok: true,
      data: { roomCode: res.room.roomCode, playerId: res.playerId, room: tankService.publicRoom(res.room) }
    });
    emitRoomUpdate(io, res.room);
    broadcastLobby(io);
  });

  // Page refresh / reconnect: re-attach to the existing seat and replay the live match state.
  socket.on('tank_resume_room', ({ roomCode, playerId } = {}, ack) => {
    if (!roomCode || !playerId) return replyError(ack, 'Phiên không hợp lệ.', 'INVALID_SESSION');
    const res = tankService.resumeTankRoom(roomCode, playerId, socket.id);
    if (res.error) return replyError(ack, res.message, res.error);

    socket.join(roomChannel(res.room.roomCode));
    reply(ack, {
      ok: true,
      data: { roomCode: res.room.roomCode, playerId, room: tankService.publicRoom(res.room) }
    });
    emitRoomUpdate(io, res.room);
    sendFullState(socket, res.room);
    broadcastLobby(io);
  });

  socket.on('tank_switch_team', ({ team } = {}, ack) => {
    const res = tankService.switchTankTeam(socket.id, team);
    if (res.error) return replyError(ack, res.message, res.error);
    reply(ack, { ok: true, data: { room: tankService.publicRoom(res.room) } });
    emitRoomUpdate(io, res.room);
    broadcastLobby(io);
  });

  socket.on('tank_toggle_ready', (_, ack) => {
    const res = tankService.toggleTankReady(socket.id);
    if (res.error) return replyError(ack, res.message, res.error);
    reply(ack, { ok: true, data: { room: tankService.publicRoom(res.room) } });
    emitRoomUpdate(io, res.room);
  });

  socket.on('tank_start_game', (_, ack) => {
    const res = tankService.startTankGame(socket.id);
    if (res.error) return replyError(ack, res.message, res.error);

    const { room } = res;
    reply(ack, { ok: true, data: { room: tankService.publicRoom(room) } });
    io.to(roomChannel(room.roomCode)).emit('tank_game_started', {
      room: tankService.publicRoom(room),
      state: buildFullState(room.game, room)
    });
    broadcastLobby(io);
  });

  socket.on('tank_leave_room', (_, ack) => {
    leaveCurrent();
    reply(ack, { ok: true });
  });

  socket.on('tank_kick_player', ({ targetPlayerId } = {}, ack) => {
    const res = tankService.kickTankPlayer(socket.id, targetPlayerId);
    if (res.error) return replyError(ack, res.message, res.error);

    reply(ack, { ok: true, data: { room: tankService.publicRoom(res.room) } });
    emitRoomUpdate(io, res.room);

    const kickedSocket = res.kickedPlayer?.socketId ? io.sockets.sockets.get(res.kickedPlayer.socketId) : null;
    if (kickedSocket) {
      kickedSocket.leave(roomChannel(res.room.roomCode));
      kickedSocket.emit('tank_kicked', { message: 'Bạn đã bị chủ phòng mời ra khỏi phòng.' });
    }
    broadcastLobby(io);
  });

  // Input only: the client reports which direction is held and whether fire is held.
  // Positions, bullets, hits and lives are all decided on the server.
  socket.on('tank_input', (input) => {
    const session = tankService.getSession(socket.id);
    if (!session || session.room.status !== 'PLAYING' || !session.room.game) return;
    setInput(session.room.game, session.player.id, input);
  });

  // One numbered movement command per client step (60Hz); see enqueueCommand in the engine.
  socket.on('tank_cmd', (cmd) => {
    const session = tankService.getSession(socket.id);
    if (!session || session.room.status !== 'PLAYING' || !session.room.game) return;
    enqueueCommand(session.room.game, session.player.id, cmd?.n, cmd?.dir, cmd?.f);
  });

  socket.on('tank_rematch', (_, ack) => {
    const room = tankService.resetTankRematch(socket.id);
    if (!room) return replyError(ack, 'Không thể đấu lại.');
    reply(ack, { ok: true, data: { room: tankService.publicRoom(room) } });
    emitRoomUpdate(io, room);
    broadcastLobby(io);
  });
}

export function handleTankDisconnect(io, socket) {
  const session = tankService.getSession(socket.id);
  if (session?.room.game) clearInput(session.room.game, session.player.id);

  const res = tankService.disconnectTankPlayer(socket.id);
  if (res) {
    socket.leave(roomChannel(res.roomCode));
    emitRoomUpdate(io, res.room);
    broadcastLobby(io);
  }
}
