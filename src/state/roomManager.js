import { TOTAL_SLOTS, VERTICAL_SLOTS, ROOM_STATUS } from '../config/constants.js';
import { calculateScoreIncremental } from '../core/gameLogic.js';
import { saveRoom, listAllRoomSummaries } from '../services/roomService.js';

const rooms = new Map();

const roomRuntimes = new Map();
const TURN_TRANSITION_DELAY_MS = 500;

function getPublicPlayers(room) {
  return room.players.map((p) => ({
    id: p.id,
    name: p.name,
    seatIndex: p.seatIndex,
    ready: p.ready,
    connected: p.connected,
    score: p.score,
    hasPlacedThisRound: p.hasPlacedThisRound,
    board: p.board,
    matchedLines: p.matchedLines
  }));
}

function getBaseState(room) {
  const hasCurrentPiece =
    room.status === ROOM_STATUS.PLAYING &&
    room.turn >= 0 &&
    room.turn < room.sharedPieceDeck.length;

  return {
    roomCode: room.roomCode,
    status: room.status,
    hostPlayerId: room.hostPlayerId,
    turn: room.turn,
    currentPiece: hasCurrentPiece ? room.sharedPieceDeck[room.turn] : null,
    timeLeft: calculateTimeLeft(room),
    turnTimeLimit: room.turnTimeLimit,
    stateVersion: room.stateVersion
  };
}

function calculateTimeLeft(room) {
  if (room.status === ROOM_STATUS.PAUSED) {
    return (room.remainingTurnMs || 0) / 1000;
  }
  if (room.status !== ROOM_STATUS.PLAYING) return 0;
  if (room.turnEndsAt) {
    return Math.max(0, (room.turnEndsAt - Date.now()) / 1000);
  }
  return 0;
}

export function buildRoomStatePayload(room) {
  return {
    ...getBaseState(room),
    players: getPublicPlayers(room)
  };
}

function emitRoomState(io, room) {
  io.to(room.roomCode).emit('room_state_update', buildRoomStatePayload(room));
}

export async function broadcastLobbyRooms(io) {
  io.to('public_lobby').emit('lobby_rooms_update', {
    rooms: await listAllRoomSummaries()
  });
}

function resetTurnPlacementState(room) {
  room.players.forEach((p) => {
    p.hasPlacedThisRound = false;
  });
  getOrCreateRuntime(room.roomCode).preferredSlots.clear();
}

function getOrCreateRuntime(roomCode) {
  let runtime = roomRuntimes.get(roomCode);
  if (!runtime) {
    runtime = {
      timerInterval: null,
      transitionTimeout: null,
      isTransitioning: false,
      preferredSlots: new Map()
    };
    roomRuntimes.set(roomCode, runtime);
  }
  return runtime;
}

function stopTurnInterval(roomCode) {
  const runtime = roomRuntimes.get(roomCode);
  if (runtime && runtime.timerInterval) {
    clearInterval(runtime.timerInterval);
    runtime.timerInterval = null;
  }
}

function stopTimer(roomCode) {
  const runtime = roomRuntimes.get(roomCode);
  stopTurnInterval(roomCode);
  if (runtime && runtime.transitionTimeout) {
    clearTimeout(runtime.transitionTimeout);
    runtime.transitionTimeout = null;
  }
  if (runtime) runtime.isTransitioning = false;
}

export async function pauseRoom(io, roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  if (room.status === ROOM_STATUS.PAUSED) {
    stopTimer(roomCode);
    emitRoomState(io, room);
    return;
  }
  if (room.status !== ROOM_STATUS.PLAYING) return;

  stopTimer(roomCode);
  room.remainingTurnMs = Math.max(0, (room.turnEndsAt || 0) - Date.now());
  room.turnEndsAt = null;
  room.status = ROOM_STATUS.PAUSED;
  room.stateVersion++;

  await saveRoom(room);
  emitRoomState(io, room);
}

export async function resumeRoomTimer(io, roomCode) {
  const room = rooms.get(roomCode);
  if (!room || room.status !== ROOM_STATUS.PAUSED) return;

  const remaining = Math.max(500, room.remainingTurnMs || room.turnTimeLimit * 1000);
  room.turnEndsAt = Date.now() + remaining;
  room.remainingTurnMs = null;
  room.status = ROOM_STATUS.PLAYING;
  room.stateVersion++;

  await saveRoom(room);
  emitRoomState(io, room);

  const runtime = getOrCreateRuntime(roomCode);
  runtime.timerInterval = setInterval(() => tickTurnTimer(io, roomCode), 100);
}

export async function startServerTurnTimer(io, roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  stopTimer(roomCode);

  room.turnEndsAt = Date.now() + room.turnTimeLimit * 1000;
  room.remainingTurnMs = null;
  room.status = ROOM_STATUS.PLAYING;
  room.stateVersion++;

  resetTurnPlacementState(room);
  await saveRoom(room);
  emitRoomState(io, room);

  const runtime = getOrCreateRuntime(roomCode);
  runtime.timerInterval = setInterval(() => tickTurnTimer(io, roomCode), 100);
}

async function tickTurnTimer(io, roomCode) {
  const room = rooms.get(roomCode);
  if (!room) {
    stopTimer(roomCode);
    return;
  }

  const timeLeft = calculateTimeLeft(room);

  if (timeLeft <= 0) {
    await finishCurrentTurn(io, roomCode);
  } else {
    io.to(roomCode).emit('timer_tick', { timeLeft });
  }
}

function findAvailableSlotIndices(player) {
  const indices = [];
  for (let i = 0; i < VERTICAL_SLOTS.length; i++) {
    const coords = VERTICAL_SLOTS[i];
    const isEmpty = coords.every((c) => player.board[c.r][c.c] === null);
    if (isEmpty) indices.push(i);
  }
  return indices;
}

function autoPlaceForPlayer(player, pieceValues, preferredSlotIdx) {
  const availableIndices = findAvailableSlotIndices(player);
  if (availableIndices.length === 0) return;

  const slotIdx = availableIndices.includes(preferredSlotIdx)
    ? preferredSlotIdx
    : availableIndices[Math.floor(Math.random() * availableIndices.length)];
  const coords = VERTICAL_SLOTS[slotIdx];
  coords.forEach((coord, idx) => {
    player.board[coord.r][coord.c] = pieceValues[idx];
  });

  const { totalScore, matchLines } = calculateScoreIncremental(
    player.board,
    coords,
    player.matchedLines
  );
  player.score = totalScore;
  player.matchedLines = matchLines;
}

function autoPlaceMissingMoves(room) {
  const pieceValues = room.sharedPieceDeck[room.turn];
  if (!pieceValues) return;
  const preferredSlots = getOrCreateRuntime(room.roomCode).preferredSlots;
  room.players.forEach((player) => {
    if (!player.hasPlacedThisRound) {
      autoPlaceForPlayer(player, pieceValues, preferredSlots.get(player.id));
      player.hasPlacedThisRound = true;
    }
  });
  preferredSlots.clear();
}

async function endGame(io, roomCode, room) {
  stopTimer(roomCode);
  room.status = ROOM_STATUS.FINISHED;
  room.turnEndsAt = null;
  room.remainingTurnMs = null;
  room.stateVersion++;
  await saveRoom(room);

  emitRoomState(io, room);
  io.to(roomCode).emit('game_over', buildRoomStatePayload(room));

  rooms.delete(roomCode);
  roomRuntimes.delete(roomCode);
  await broadcastLobbyRooms(io);
}

async function advanceNextTurnServer(io, roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  resetTurnPlacementState(room);
  room.turn++;

  if (room.turn < TOTAL_SLOTS) {
    await startServerTurnTimer(io, roomCode);
  } else {
    await endGame(io, roomCode, room);
  }
}

export async function finishCurrentTurn(io, roomCode) {
  const room = rooms.get(roomCode);
  if (!room || room.status !== ROOM_STATUS.PLAYING) return;

  const runtime = getOrCreateRuntime(roomCode);
  if (runtime.isTransitioning) return;

  runtime.isTransitioning = true;
  stopTurnInterval(roomCode);
  try {
    autoPlaceMissingMoves(room);
    room.turnEndsAt = null;
    room.stateVersion++;
    await saveRoom(room);
    emitRoomState(io, room);

    runtime.transitionTimeout = setTimeout(() => {
      runtime.transitionTimeout = null;
      runtime.isTransitioning = false;
      void advanceNextTurnServer(io, roomCode).catch(console.error);
    }, TURN_TRANSITION_DELAY_MS);
  } catch (error) {
    runtime.isTransitioning = false;
    throw error;
  }
}

export function loadRoomToMemory(room) {
  rooms.set(room.roomCode, room);
  if (!roomRuntimes.has(room.roomCode)) {
    roomRuntimes.set(room.roomCode, {
      timerInterval: null,
      transitionTimeout: null,
      isTransitioning: false,
      preferredSlots: new Map()
    });
  }
}

export function removeRoomFromMemory(roomCode) {
  stopTimer(roomCode);
  rooms.delete(roomCode);
  roomRuntimes.delete(roomCode);
}

export function getRoomFromMemory(roomCode) {
  return rooms.get(roomCode);
}

export function setAutoPlacePreference(roomCode, playerId, slotIdx) {
  const runtime = roomRuntimes.get(roomCode);
  if (!runtime) return;

  const preferredSlots = runtime.preferredSlots;
  if (slotIdx === null) {
    preferredSlots.delete(playerId);
  } else {
    preferredSlots.set(playerId, slotIdx);
  }
}

export { emitRoomState };
