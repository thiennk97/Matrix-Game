import { VERTICAL_SLOTS, ROOM_STATUS } from '../config/constants.js';
import {
  generateFairPieceDeck,
  calculateScoreIncremental,
  createEmptyBoard
} from '../core/gameLogic.js';
import * as roomService from '../services/roomService.js';
import {
  emitRoomState,
  startServerTurnTimer,
  finishCurrentTurn,
  loadRoomToMemory,
  removeRoomFromMemory,
  getRoomFromMemory,
  buildRoomStatePayload,
  pauseRoom,
  resumeRoomTimer,
  setAutoPlacePreference,
  broadcastLobbyRooms
} from '../state/roomManager.js';

const MAX_CHAT_LENGTH = 100;
const MAX_PLAYER_NAME_LENGTH = 24;
const ALLOWED_TURN_TIMES = [5, 8, 10, 15];

const socketToPlayerMap = new Map();

function reply(ack, payload) {
  if (typeof ack === 'function') ack(payload);
}

function replyError(ack, message, code = 'REQUEST_FAILED') {
  reply(ack, { ok: false, error: { code, message } });
}

function resolveTurnTimeLimit(turnTimeLimit) {
  const parsed = Number(turnTimeLimit);
  return ALLOWED_TURN_TIMES.includes(parsed) ? parsed : 8;
}

function requirePlayerName(playerName) {
  if (typeof playerName !== 'string') {
    const error = new Error('Tên người chơi là bắt buộc.');
    error.code = 'INVALID_PLAYER_NAME';
    throw error;
  }

  const normalizedName = playerName.trim();
  if (!normalizedName || normalizedName.length > MAX_PLAYER_NAME_LENGTH) {
    const error = new Error(`Tên người chơi phải có từ 1 đến ${MAX_PLAYER_NAME_LENGTH} ký tự.`);
    error.code = 'INVALID_PLAYER_NAME';
    throw error;
  }

  return normalizedName;
}

function isValidSlotIndex(slotIdx) {
  return Number.isInteger(slotIdx) && slotIdx >= 0 && slotIdx < VERTICAL_SLOTS.length;
}

function isSlotEmptyForPlayer(player, coords) {
  return coords.every((coord) => player.board[coord.r][coord.c] === null);
}

function placePieceOnBoard(player, coords, pieceValues) {
  coords.forEach((coord, idx) => {
    player.board[coord.r][coord.c] = pieceValues[idx];
  });
}

function applyMoveScore(player, coords) {
  const { totalScore, matchLines } = calculateScoreIncremental(
    player.board,
    coords,
    player.matchedLines
  );
  player.score = totalScore;
  player.matchedLines = matchLines;
}

async function advanceIfAllPlaced(io, room, roomCode) {
  const activePlayers = room.players.filter((p) => p.connected && !p.abandoned);
  if (activePlayers.length === 0) return;

  const allPlaced = activePlayers.every((p) => p.hasPlacedThisRound);
  if (!allPlaced) return;

  await finishCurrentTurn(io, roomCode);
}

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`🟢 Client connected: ${socket.id}`);

    socket.on('list_rooms', async (data, ack) => {
      try {
        socket.join('public_lobby');
        reply(ack, {
          ok: true,
          data: { rooms: await roomService.listAllRoomSummaries() }
        });
      } catch (err) {
        replyError(ack, err.message);
      }
    });

    socket.on('create_room', async (payload, ack) => {
      try {
        const normalizedName = requirePlayerName(payload?.playerName);

        const { room, playerId, playerIndex } = await roomService.createRoom(
          normalizedName,
          socket.id
        );
        socket.leave('public_lobby');
        socket.join(room.roomCode);

        socketToPlayerMap.set(socket.id, { roomCode: room.roomCode, playerId });
        loadRoomToMemory(room);

        reply(ack, {
          ok: true,
          data: {
            roomCode: room.roomCode,
            playerId,
            playerIndex,
            state: buildRoomStatePayload(room)
          }
        });

        await broadcastLobbyRooms(io);
      } catch (err) {
        replyError(ack, err.message, err.code);
      }
    });

    socket.on('join_room', async (payload, ack) => {
      try {
        const normalizedName = requirePlayerName(payload?.playerName);

        const res = await roomService.joinRoom(payload.roomCode, normalizedName, socket.id);
        if (res.error) {
          reply(ack, { ok: false, error: res });
          return;
        }

        const { room, playerId, playerIndex } = res;
        socket.leave('public_lobby');
        socket.join(room.roomCode);

        socketToPlayerMap.set(socket.id, { roomCode: room.roomCode, playerId });
        loadRoomToMemory(room);

        reply(ack, {
          ok: true,
          data: {
            roomCode: room.roomCode,
            playerId,
            playerIndex,
            state: buildRoomStatePayload(room)
          }
        });

        emitRoomState(io, room);
        await broadcastLobbyRooms(io);
      } catch (err) {
        replyError(ack, err.message, err.code);
      }
    });

    socket.on('resume_room', async ({ roomCode, playerId }, ack) => {
      try {
        const res = await roomService.resumeRoom(roomCode, playerId, socket.id);
        if (res.error) {
          reply(ack, { ok: false, error: res });
          return;
        }

        const { room, playerIndex } = res;
        socket.leave('public_lobby');
        socket.join(room.roomCode);

        socketToPlayerMap.set(socket.id, { roomCode: room.roomCode, playerId });
        loadRoomToMemory(room);

        if (room.status === ROOM_STATUS.PAUSED) {
          await resumeRoomTimer(io, room.roomCode);
        } else {
          emitRoomState(io, room);
        }

        reply(ack, {
          ok: true,
          data: {
            roomCode: room.roomCode,
            playerId,
            playerIndex,
            state: buildRoomStatePayload(room)
          }
        });
      } catch (err) {
        replyError(ack, err.message);
      }
    });

    socket.on('spectate_room', (payload, ack) => {
      try {
        const roomCode = String(payload?.roomCode || '').trim().toUpperCase();
        const room = getRoomFromMemory(roomCode);

        if (!room || (room.status !== ROOM_STATUS.PLAYING && room.status !== ROOM_STATUS.PAUSED)) {
          replyError(ack, 'Trận đấu không tồn tại hoặc đã kết thúc.', 'ROOM_NOT_ACTIVE');
          return;
        }

        socket.leave('public_lobby');
        socket.join(room.roomCode);

        reply(ack, {
          ok: true,
          data: {
            roomCode: room.roomCode,
            state: buildRoomStatePayload(room)
          }
        });
      } catch (err) {
        replyError(ack, err.message);
      }
    });

    socket.on('stop_spectating', ({ roomCode } = {}, ack) => {
      if (roomCode) socket.leave(String(roomCode).trim().toUpperCase());
      reply(ack, { ok: true });
    });

    socket.on('leave_room', async ({ roomCode, playerId }, ack) => {
      try {
        const session = socketToPlayerMap.get(socket.id);
        if (!session || session.roomCode !== roomCode || session.playerId !== playerId) {
          replyError(ack, 'Invalid session', 'INVALID_SESSION');
          return;
        }

        socket.leave(roomCode);
        socketToPlayerMap.delete(socket.id);
        setAutoPlacePreference(roomCode, playerId, null);

        const room = await roomService.leaveRoom(roomCode, playerId);
        if (!room) {
          removeRoomFromMemory(roomCode);
        } else {
          loadRoomToMemory(room);
          if (room.status === ROOM_STATUS.PAUSED) {
            await pauseRoom(io, room.roomCode);
          } else {
            emitRoomState(io, room);
          }
        }

        reply(ack, { ok: true });
        await broadcastLobbyRooms(io);
      } catch (err) {
        replyError(ack, err.message);
      }
    });

    socket.on('kick_player', async ({ targetPlayerId }, ack) => {
      try {
        const session = socketToPlayerMap.get(socket.id);
        if (!session) {
          replyError(ack, 'Not in a room', 'NOT_IN_ROOM');
          return;
        }

        const result = await roomService.kickPlayer(session.roomCode, session.playerId, targetPlayerId);
        if (result.error) {
          reply(ack, { ok: false, error: result });
          return;
        }

        const { room, kickedSocketId } = result;
        loadRoomToMemory(room);
        setAutoPlacePreference(room.roomCode, targetPlayerId, null);

        if (kickedSocketId) {
          const kickedSocket = io.sockets.sockets.get(kickedSocketId);
          if (kickedSocket) {
            kickedSocket.emit('kicked_from_room');
            kickedSocket.leave(room.roomCode);
            socketToPlayerMap.delete(kickedSocketId);
          }
        }

        emitRoomState(io, room);
        reply(ack, { ok: true });
        await broadcastLobbyRooms(io);
      } catch (err) {
        replyError(ack, err.message);
      }
    });

    socket.on('start_game', async ({ turnTimeLimit }, ack) => {
      try {
        const session = socketToPlayerMap.get(socket.id);
        if (!session) {
          replyError(ack, 'Not in a room', 'NOT_IN_ROOM');
          return;
        }

        const room = getRoomFromMemory(session.roomCode);
        if (!room) {
          replyError(ack, 'Room not found', 'ROOM_NOT_FOUND');
          return;
        }

        if (room.hostPlayerId !== session.playerId) {
          replyError(ack, 'Chỉ Host mới có quyền Bắt đầu trận đấu!', 'NOT_HOST');
          return;
        }
        if (room.status !== ROOM_STATUS.LOBBY) {
          replyError(ack, 'Phòng không ở trạng thái chờ.', 'ROOM_NOT_IN_LOBBY');
          return;
        }

        const activePlayers = room.players.filter((player) => !player.abandoned);
        const nonHostPlayers = activePlayers.filter((player) => player.id !== room.hostPlayerId);
        if (activePlayers.some((player) => !player.connected)) {
          replyError(ack, 'Hãy chờ tất cả người chơi kết nối lại.', 'PLAYER_DISCONNECTED');
          return;
        }
        if (nonHostPlayers.some((player) => !player.ready)) {
          replyError(ack, 'Hãy chờ tất cả thành viên sẵn sàng.', 'PLAYERS_NOT_READY');
          return;
        }

        room.turnTimeLimit = resolveTurnTimeLimit(turnTimeLimit);
        room.status = ROOM_STATUS.PLAYING;
        room.turn = 0;
        room.sharedPieceDeck = generateFairPieceDeck();
        room.players.forEach((p) => {
          p.board = createEmptyBoard();
          p.score = 0;
          p.hasPlacedThisRound = false;
          p.matchedLines = [];
        });

        await roomService.saveRoom(room);

        io.to(room.roomCode).emit('game_started');
        await startServerTurnTimer(io, room.roomCode);

        reply(ack, { ok: true });
        await broadcastLobbyRooms(io);
      } catch (err) {
        replyError(ack, err.message);
      }
    });

    socket.on('make_move', async ({ turn, slotIdx }, ack) => {
      try {
        const session = socketToPlayerMap.get(socket.id);
        if (!session) {
          if (typeof ack === 'function') ack({ ok: false, error: { message: 'Not in a room' } });
          return;
        }

        const room = getRoomFromMemory(session.roomCode);
        if (!room) {
          if (typeof ack === 'function')
            ack({ ok: false, error: { message: 'Room not found in memory' } });
          return;
        }

        if (room.status !== ROOM_STATUS.PLAYING) {
          if (typeof ack === 'function')
            ack({
              ok: false,
              error: {
                message: 'Trận đấu chưa bắt đầu hoặc đã bị pause/kết thúc'
              }
            });
          return;
        }

        if (turn !== room.turn) {
          if (typeof ack === 'function')
            ack({
              ok: false,
              error: {
                code: 'STALE_TURN',
                message: 'Lượt không hợp lệ',
                state: buildRoomStatePayload(room)
              }
            });
          return;
        }

        const player = room.players.find((p) => p.id === session.playerId);
        if (!player) {
          if (typeof ack === 'function')
            ack({ ok: false, error: { message: 'Player không tồn tại' } });
          return;
        }

        if (player.hasPlacedThisRound) {
          if (typeof ack === 'function')
            ack({
              ok: false,
              error: { message: 'Bạn đã đặt quân ở vòng này rồi!' }
            });
          return;
        }

        if (!isValidSlotIndex(slotIdx)) {
          if (typeof ack === 'function')
            ack({
              ok: false,
              error: { message: 'Lỗi Server: slotIdx không hợp lệ!' }
            });
          return;
        }

        const coords = VERTICAL_SLOTS[slotIdx];
        if (!isSlotEmptyForPlayer(player, coords)) {
          if (typeof ack === 'function')
            ack({
              ok: false,
              error: { message: 'Vị trí này đã có ô khác chiếm!' }
            });
          return;
        }

        const pieceValues = room.sharedPieceDeck[room.turn];
        placePieceOnBoard(player, coords, pieceValues);
        player.hasPlacedThisRound = true;
        setAutoPlacePreference(room.roomCode, player.id, null);
        applyMoveScore(player, coords);

        await roomService.saveRoom(room);
        emitRoomState(io, room);

        if (typeof ack === 'function') ack({ ok: true });
        await advanceIfAllPlaced(io, room, room.roomCode);
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, error: { message: err.message } });
      }
    });

    socket.on('set_preferred_slot', (payload = {}) => {
      const { turn, slotIdx } = payload;
      const session = socketToPlayerMap.get(socket.id);
      if (!session) return;

      const room = getRoomFromMemory(session.roomCode);
      if (!room || room.status !== ROOM_STATUS.PLAYING || turn !== room.turn) return;

      const player = room.players.find((p) => p.id === session.playerId);
      if (!player || !player.connected || player.abandoned || player.hasPlacedThisRound) return;

      const coords = isValidSlotIndex(slotIdx) ? VERTICAL_SLOTS[slotIdx] : null;
      const preferredSlotIdx = coords && isSlotEmptyForPlayer(player, coords) ? slotIdx : null;
      setAutoPlacePreference(room.roomCode, player.id, preferredSlotIdx);
    });

    socket.on('restart_game', async (_data, ack) => {
      try {
        const session = socketToPlayerMap.get(socket.id);
        if (!session) {
          replyError(ack, 'Not in a room', 'NOT_IN_ROOM');
          return;
        }

        const result = await roomService.returnToLobby(session.roomCode, session.playerId);
        if (result.error) {
          reply(ack, { ok: false, error: result });
          return;
        }

        const { room, playerIndex } = result;
        loadRoomToMemory(room);
        emitRoomState(io, room);
        reply(ack, {
          ok: true,
          data: {
            roomCode: room.roomCode,
            playerId: session.playerId,
            playerIndex,
            state: buildRoomStatePayload(room)
          }
        });
        await broadcastLobbyRooms(io);
      } catch (err) {
        replyError(ack, err.message);
      }
    });

    socket.on('toggle_ready', async (data, ack) => {
      try {
        const session = socketToPlayerMap.get(socket.id);
        if (!session) {
          replyError(ack, 'Not in a room', 'NOT_IN_ROOM');
          return;
        }

        const room = getRoomFromMemory(session.roomCode);
        if (!room || room.status !== ROOM_STATUS.LOBBY) {
          replyError(ack, 'Phòng không ở trạng thái chờ.', 'ROOM_NOT_IN_LOBBY');
          return;
        }

        const player = room.players.find((p) => p.id === session.playerId);
        if (player && player.id !== room.hostPlayerId) {
          player.ready = !player.ready;
          await roomService.saveRoom(room);
          emitRoomState(io, room);
        }
        reply(ack, { ok: true });
      } catch (err) {
        replyError(ack, err.message);
      }
    });

    socket.on('chat_message', (rawMsg) => {
      if (typeof rawMsg !== 'string') return;
      const msg = rawMsg.trim().slice(0, MAX_CHAT_LENGTH);
      if (!msg) return;

      const session = socketToPlayerMap.get(socket.id);
      if (!session) return;

      const room = getRoomFromMemory(session.roomCode);
      if (!room) return;

      const player = room.players.find((p) => p.id === session.playerId);
      if (player) {
        io.to(room.roomCode).emit('chat_message', {
          sender: player.name,
          msg,
          playerId: player.id
        });
      }
    });

    socket.on('disconnect', async () => {
      console.log(`🔴 Client disconnected: ${socket.id}`);
      const session = socketToPlayerMap.get(socket.id);
      if (session) {
        socketToPlayerMap.delete(socket.id);
        setAutoPlacePreference(session.roomCode, session.playerId, null);
        const room = await roomService.disconnectPlayer(session.roomCode, session.playerId);
        if (room) {
          loadRoomToMemory(room);
          if (room.status === ROOM_STATUS.PAUSED) {
            await pauseRoom(io, room.roomCode);
          } else {
            emitRoomState(io, room);
          }
        } else {
          removeRoomFromMemory(session.roomCode);
        }
        await broadcastLobbyRooms(io);
      }
    });
  });
}
