import crypto from 'crypto';
import * as repo from '../repositories/redisRoomRepository.js';
import { createNewRoomState, createPlayerState, MAX_PLAYERS } from '../core/gameLogic.js';
import { prepareRoomForRematch } from '../core/roomTransitions.js';
import { ROOM_STATUS } from '../config/constants.js';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return code;
}

export async function createRoom(playerName, socketId) {
  let roomCode;
  let roomCreated = false;
  let room;
  const hostPlayerId = crypto.randomUUID();

  for (let i = 0; i < 10; i++) {
    roomCode = generateRoomCode();
    room = createNewRoomState(roomCode, hostPlayerId);

    const hostPlayer = createPlayerState(hostPlayerId, socketId, playerName, 0);
    hostPlayer.ready = true;
    room.players.push(hostPlayer);

    roomCreated = await repo.createRoom(room);
    if (roomCreated) {
      break;
    }
  }

  if (!roomCreated) {
    throw new Error('Không thể tạo mã phòng mới. Vui lòng thử lại.');
  }

  await repo.addOpenRoom(roomCode, room.createdAt);

  return { room, playerId: hostPlayerId, playerIndex: 0 };
}

export async function joinRoom(roomCode, playerName, socketId) {
  roomCode = roomCode.trim().toUpperCase();
  const room = await repo.getRoom(roomCode);

  if (!room) {
    return {
      error: 'ROOM_NOT_FOUND',
      message: 'Phòng không tồn tại hoặc đã hết hạn.'
    };
  }
  if (room.status !== ROOM_STATUS.LOBBY) {
    return { error: 'GAME_ALREADY_STARTED', message: 'Phòng đã bắt đầu chơi.' };
  }
  if (room.players.length >= MAX_PLAYERS) {
    return { error: 'ROOM_FULL', message: 'Phòng đã đầy.' };
  }

  const occupiedSeats = new Set(room.players.map((p) => p.seatIndex));
  let seatIndex = 0;
  while (occupiedSeats.has(seatIndex)) {
    seatIndex++;
  }

  const playerId = crypto.randomUUID();
  const player = createPlayerState(playerId, socketId, playerName, seatIndex);

  room.players.push(player);
  room.updatedAt = Date.now();
  room.stateVersion++;

  await repo.saveRoom(room);

  return { room, playerId, playerIndex: seatIndex };
}

export async function resumeRoom(roomCode, playerId, socketId) {
  const room = await repo.getRoom(roomCode);
  if (!room) {
    return { error: 'ROOM_EXPIRED', message: 'Phòng đã hết hạn.' };
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player) {
    return {
      error: 'PLAYER_NOT_FOUND',
      message: 'Không tìm thấy người chơi trong phòng này.'
    };
  }

  player.socketId = socketId;
  player.connected = true;
  player.disconnectedAt = null;

  room.updatedAt = Date.now();
  room.stateVersion++;

  await repo.saveRoom(room);

  return { room, playerIndex: player.seatIndex };
}

export async function leaveRoom(roomCode, playerId) {
  const room = await repo.getRoom(roomCode);
  if (!room) return null;

  const pIndex = room.players.findIndex((p) => p.id === playerId);
  if (pIndex === -1) return room;

  if (room.status === ROOM_STATUS.LOBBY) {
    room.players.splice(pIndex, 1);
  } else {
    room.players[pIndex].connected = false;
    room.players[pIndex].abandoned = true;
    room.players[pIndex].socketId = null;
  }

  room.updatedAt = Date.now();
  room.stateVersion++;

  if (room.hostPlayerId === playerId) {
    room.hostPlayerId =
      room.status === ROOM_STATUS.LOBBY ? findFirstActivePlayer(room)?.id || null : null;
  }

  const hasOnlinePlayers = room.players.some((p) => p.connected && !p.abandoned);

  if (!hasOnlinePlayers && room.status === ROOM_STATUS.LOBBY) {
    await repo.deleteRoom(roomCode);
    return null;
  } else if (!hasOnlinePlayers && room.status === ROOM_STATUS.PLAYING) {
    room.status = ROOM_STATUS.PAUSED;
    if (room.turnEndsAt) {
      room.remainingTurnMs = Math.max(0, room.turnEndsAt - Date.now());
      room.turnEndsAt = null;
    }
    await repo.saveRoomWithoutTouch(room);
  } else {
    await repo.saveRoom(room);
  }

  return room;
}

export async function disconnectPlayer(roomCode, playerId) {
  const room = await repo.getRoom(roomCode);
  if (!room) return null;

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return room;

  player.connected = false;
  player.socketId = null;
  player.disconnectedAt = Date.now();

  room.updatedAt = Date.now();
  room.stateVersion++;

  const hasOnlinePlayers = room.players.some((p) => p.connected && !p.abandoned);

  if (!hasOnlinePlayers && room.status === ROOM_STATUS.PLAYING) {
    room.status = ROOM_STATUS.PAUSED;
    if (room.turnEndsAt) {
      room.remainingTurnMs = Math.max(0, room.turnEndsAt - Date.now());
      room.turnEndsAt = null;
    }
    await repo.saveRoomWithoutTouch(room);
  } else {
    await repo.saveRoomWithoutTouch(room);
  }

  return room;
}

function findFirstActivePlayer(room) {
  return (
    room.players
      .filter((player) => !player.abandoned)
      .sort((a, b) => a.seatIndex - b.seatIndex)[0] || null
  );
}

export async function returnToLobby(roomCode, playerId) {
  const room = await repo.getRoom(roomCode);
  if (!room) {
    return { error: 'ROOM_EXPIRED', message: 'Phòng đã hết hạn.' };
  }

  const result = prepareRoomForRematch(room, playerId);
  if (result.error) return result;

  await repo.saveRoom(room);
  await repo.addOpenRoom(room.roomCode, room.createdAt);

  return result;
}

export function listOpenRooms() {
  return repo.listOpenRooms();
}

export async function saveRoom(room) {
  await repo.saveRoom(room);
}

export function removeOpenRoom(roomCode) {
  return repo.removeOpenRoom(roomCode);
}
