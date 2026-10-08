import crypto from 'crypto';
import * as repo from '../repositories/redisTankRepository.js';
import { createGame, MAX_LIVES } from '../core/tankEngine.js';
import { PVP_MAP_NAMES } from '../core/tankMaps.js';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS = 4;
const MAX_PER_TEAM = 2;
const MAX_NAME_LENGTH = 24;

// How long a dropped player keeps their seat before being removed.
const LOBBY_GRACE_MS = 60 * 1000;
const MATCH_GRACE_MS = 90 * 1000;

// In-memory runtime store. Room metadata is mirrored to Redis so rooms survive restarts;
// the live match simulation (room.game) is memory-only.
const tankRooms = new Map();
const socketIndex = new Map(); // socketId -> { roomCode, playerId }
const graceTimers = new Map(); // `${roomCode}:${playerId}` -> Timeout

let expiryListener = null;

export function setExpiryListener(fn) {
  expiryListener = fn;
}

function generateTankRoomCode() {
  let code = 'TK';
  for (let i = 0; i < 4; i++) {
    code += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return code;
}

function sanitizeName(name) {
  return String(name || '').trim().slice(0, MAX_NAME_LENGTH);
}

function pickMapIndex() {
  return Math.floor(Math.random() * PVP_MAP_NAMES.length);
}

function newPlayer(id, socketId, name, team, seat, ready) {
  return {
    id,
    socketId,
    name,
    team,
    seat,
    ready,
    connected: true,
    abandoned: false,
    lives: MAX_LIVES,
    kills: 0,
    deaths: 0
  };
}

function resetPlayerStats(room) {
  room.players.forEach((p) => {
    p.lives = MAX_LIVES;
    p.kills = 0;
    p.deaths = 0;
  });
}

// ---- Serialization -------------------------------------------------------

export function publicRoom(room) {
  return {
    roomCode: room.roomCode,
    hostPlayerId: room.hostPlayerId,
    status: room.status,
    mapIndex: room.mapIndex,
    mapName: PVP_MAP_NAMES[room.mapIndex] || PVP_MAP_NAMES[0],
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team,
      seat: p.seat,
      ready: p.ready,
      connected: p.connected,
      kills: p.kills,
      deaths: p.deaths,
      lives: p.lives
    })),
    eagles: room.game
      ? { blue: { alive: room.game.eagles.blue }, red: { alive: room.game.eagles.red } }
      : { blue: { alive: true }, red: { alive: true } },
    winner: room.winner,
    gameOverReason: room.gameOverReason || null,
    teamScores: room.teamScores,
    createdAt: room.createdAt
  };
}

function persistableRoom(room) {
  return {
    roomCode: room.roomCode,
    hostPlayerId: room.hostPlayerId,
    status: room.status,
    mapIndex: room.mapIndex,
    winner: room.winner,
    gameOverReason: room.gameOverReason || null,
    teamScores: room.teamScores,
    createdAt: room.createdAt,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team,
      seat: p.seat,
      ready: p.ready,
      abandoned: p.abandoned,
      lives: p.lives,
      kills: p.kills,
      deaths: p.deaths
    }))
  };
}

export function persistRoom(room) {
  repo.saveTankRoom(persistableRoom(room)).catch((err) => console.error('Persist tank room failed:', err.message));
}

function dropPersisted(roomCode) {
  repo.deleteTankRoom(roomCode).catch((err) => console.error('Delete tank room failed:', err.message));
}

// ---- Lookup --------------------------------------------------------------

export function getTankRoom(roomCode) {
  if (!roomCode) return null;
  return tankRooms.get(String(roomCode).toUpperCase().trim()) || null;
}

export function getSession(socketId) {
  const s = socketIndex.get(socketId);
  if (!s) return null;
  const room = tankRooms.get(s.roomCode);
  const player = room?.players.find((p) => p.id === s.playerId);
  if (!room || !player) return null;
  return { room, player };
}

export function listPlayingRooms() {
  return [...tankRooms.values()].filter((r) => r.status === 'PLAYING' && r.game);
}

export function listTankRooms() {
  const rooms = [];
  for (const room of tankRooms.values()) {
    if (room.status === 'PLAYING' || room.status === 'FINISHED') continue;
    if (!room.players.some((p) => p.connected)) continue;
    rooms.push({
      roomCode: room.roomCode,
      hostName: room.players.find((p) => p.id === room.hostPlayerId)?.name || 'Host',
      playerCount: room.players.length,
      maxPlayers: MAX_PLAYERS,
      blueCount: room.players.filter((p) => p.team === 'blue').length,
      redCount: room.players.filter((p) => p.team === 'red').length,
      status: room.status,
      joinable: room.status === 'LOBBY' && room.players.length < MAX_PLAYERS,
      createdAt: room.createdAt
    });
  }
  return rooms.sort((a, b) => b.createdAt - a.createdAt);
}

// ---- Grace timers --------------------------------------------------------

function timerKey(roomCode, playerId) {
  return `${roomCode}:${playerId}`;
}

function clearGrace(roomCode, playerId) {
  const key = timerKey(roomCode, playerId);
  const t = graceTimers.get(key);
  if (t) {
    clearTimeout(t);
    graceTimers.delete(key);
  }
}

function scheduleGrace(room, player, ms) {
  clearGrace(room.roomCode, player.id);
  const timer = setTimeout(() => {
    graceTimers.delete(timerKey(room.roomCode, player.id));
    const result = expirePlayer(room.roomCode, player.id);
    if (result && expiryListener) expiryListener(result);
  }, ms);
  timer.unref?.();
  graceTimers.set(timerKey(room.roomCode, player.id), timer);
}

// ---- Seat / host helpers -------------------------------------------------

function reassignHost(room) {
  const next = room.players.find((p) => p.connected && !p.abandoned) || room.players.find((p) => !p.abandoned);
  if (next) {
    room.hostPlayerId = next.id;
    next.ready = true;
  }
}

function destroyRoom(room) {
  for (const p of room.players) clearGrace(room.roomCode, p.id);
  tankRooms.delete(room.roomCode);
  dropPersisted(room.roomCode);
}

function removePlayerFromLobby(room, playerId) {
  const idx = room.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return null;
  const [removed] = room.players.splice(idx, 1);
  clearGrace(room.roomCode, playerId);
  room.players.forEach((p, i) => {
    p.seat = i;
  });
  if (room.players.length === 0) {
    destroyRoom(room);
    return { roomCode: room.roomCode, roomDeleted: true, removedPlayer: removed };
  }
  if (removed.id === room.hostPlayerId) reassignHost(room);
  persistRoom(room);
  return { roomCode: room.roomCode, room, removedPlayer: removed };
}

// A player quitting mid-match forfeits their remaining lives; their seat stays so stats remain visible.
function forfeitPlayer(room, player) {
  player.abandoned = true;
  player.connected = false;
  player.socketId = null;
  player.lives = 0;
  player.ready = false;
  const tank = room.game?.tanks.get(player.id);
  if (tank) {
    tank.alive = false;
    tank.input = { dir: -1, fire: false };
  }
  if (room.game && !room.game.result && !room.players.some((p) => p.team === player.team && p.lives > 0)) {
    room.game.result = {
      winner: player.team === 'blue' ? 'red' : 'blue',
      reason: 'lives',
      destroyedTeam: player.team
    };
  }
  if (player.id === room.hostPlayerId) reassignHost(room);
}

function detachSocket(socketId) {
  socketIndex.delete(socketId);
}

// ---- Room lifecycle ------------------------------------------------------

export function createTankRoom(playerName, socketId) {
  let roomCode = null;
  for (let i = 0; i < 20; i++) {
    const candidate = generateTankRoomCode();
    if (!tankRooms.has(candidate)) {
      roomCode = candidate;
      break;
    }
  }
  if (!roomCode) return { error: 'ROOM_CODE_FAILED', message: 'Không thể tạo mã phòng mới. Vui lòng thử lại.' };

  const hostPlayerId = crypto.randomUUID();
  const host = newPlayer(hostPlayerId, socketId, sanitizeName(playerName), 'blue', 0, true);
  const room = {
    roomCode,
    hostPlayerId,
    status: 'LOBBY',
    players: [host],
    winner: null,
    gameOverReason: null,
    teamScores: { blue: 0, red: 0 },
    mapIndex: pickMapIndex(),
    game: null,
    createdAt: Date.now()
  };

  tankRooms.set(roomCode, room);
  socketIndex.set(socketId, { roomCode, playerId: hostPlayerId });
  persistRoom(room);
  return { room, playerId: hostPlayerId, player: host };
}

export function joinTankRoom(roomCode, playerName, socketId) {
  const room = getTankRoom(roomCode);
  if (!room) return { error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại hoặc đã bị hủy.' };
  if (room.status !== 'LOBBY') return { error: 'GAME_ALREADY_STARTED', message: 'Trận đấu đang diễn ra.' };
  if (room.players.length >= MAX_PLAYERS) return { error: 'ROOM_FULL', message: 'Phòng đã đủ 4 người chơi.' };

  const blueCount = room.players.filter((p) => p.team === 'blue').length;
  const redCount = room.players.filter((p) => p.team === 'red').length;
  const team = blueCount <= redCount ? 'blue' : 'red';

  const playerId = crypto.randomUUID();
  const player = newPlayer(playerId, socketId, sanitizeName(playerName), team, room.players.length, false);
  room.players.push(player);
  socketIndex.set(socketId, { roomCode: room.roomCode, playerId });
  persistRoom(room);
  return { room, playerId, player };
}

// Re-attach a returning player (page refresh / reconnect) to their existing seat.
export function resumeTankRoom(roomCode, playerId, socketId) {
  const room = getTankRoom(roomCode);
  if (!room) return { error: 'ROOM_EXPIRED', message: 'Phòng đã hết hạn.' };
  const player = room.players.find((p) => p.id === playerId);
  if (!player || player.abandoned) {
    return { error: 'PLAYER_NOT_FOUND', message: 'Bạn không còn trong phòng này.' };
  }

  if (player.socketId && player.socketId !== socketId) detachSocket(player.socketId);
  player.socketId = socketId;
  player.connected = true;
  clearGrace(room.roomCode, player.id);
  socketIndex.set(socketId, { roomCode: room.roomCode, playerId });
  return { room, player };
}

export function switchTankTeam(socketId, targetTeam) {
  const session = getSession(socketId);
  if (!session || session.room.status !== 'LOBBY') {
    return { error: 'INVALID_STATE', message: 'Không thể đổi đội lúc này.' };
  }
  const { room, player } = session;
  if (targetTeam !== 'blue' && targetTeam !== 'red') {
    return { error: 'INVALID_TEAM', message: 'Đội không hợp lệ.' };
  }
  if (player.team === targetTeam) return { room };

  const targetCount = room.players.filter((p) => p.team === targetTeam).length;
  if (targetCount >= MAX_PER_TEAM) {
    return { error: 'TEAM_FULL', message: `Đội ${targetTeam === 'blue' ? 'Xanh' : 'Đỏ'} đã đủ 2 người.` };
  }

  player.team = targetTeam;
  player.ready = player.id === room.hostPlayerId;
  persistRoom(room);
  return { room, player };
}

export function toggleTankReady(socketId) {
  const session = getSession(socketId);
  if (!session || session.room.status !== 'LOBBY') {
    return { error: 'INVALID_STATE', message: 'Phòng không ở trạng thái chờ.' };
  }
  const { room, player } = session;
  if (player.id === room.hostPlayerId) return { room };
  player.ready = !player.ready;
  persistRoom(room);
  return { room, player };
}

export function startTankGame(socketId) {
  const session = getSession(socketId);
  if (!session) return { error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' };
  const { room, player } = session;
  if (room.status !== 'LOBBY') return { error: 'INVALID_STATE', message: 'Trận đấu đã bắt đầu.' };
  if (player.id !== room.hostPlayerId) {
    return { error: 'NOT_HOST', message: 'Chỉ chủ phòng mới có quyền bắt đầu trận đấu.' };
  }

  const blue = room.players.filter((p) => p.team === 'blue').length;
  const red = room.players.filter((p) => p.team === 'red').length;
  if (room.players.length > 1 && (blue === 0 || red === 0)) {
    return { error: 'TEAMS_EMPTY', message: 'Cần có người ở cả 2 đội (Đội Xanh & Đội Đỏ) để đối kháng.' };
  }
  if (room.players.some((p) => !p.connected)) {
    return { error: 'PLAYER_DISCONNECTED', message: 'Hãy chờ tất cả người chơi kết nối lại.' };
  }
  if (room.players.some((p) => p.id !== room.hostPlayerId && !p.ready)) {
    return { error: 'NOT_ALL_READY', message: 'Tất cả thành viên phải bấm Sẵn Sàng trước khi bắt đầu.' };
  }

  room.status = 'PLAYING';
  room.winner = null;
  room.gameOverReason = null;
  room.mapIndex = pickMapIndex();
  resetPlayerStats(room);
  room.game = createGame(room, room.mapIndex);
  room.loop = { last: 0, acc: 0 };
  persistRoom(room);
  return { room };
}

export function finishTankGame(room) {
  const result = room.game?.result;
  if (!result || room.status !== 'PLAYING') return null;
  room.status = 'FINISHED';
  room.winner = result.winner;
  room.gameOverReason = result.reason;
  room.teamScores[result.winner] = (room.teamScores[result.winner] || 0) + 1;
  persistRoom(room);
  return result;
}

export function resetTankRematch(socketId) {
  const session = getSession(socketId);
  if (!session) return null;
  const { room } = session;
  if (room.status === 'PLAYING') return null;
  if (room.status === 'LOBBY') return room; // someone else already reset the room

  // Anyone who forfeited is dropped when the room returns to the lobby.
  room.players = room.players.filter((p) => !p.abandoned);
  room.players.forEach((p, i) => {
    p.seat = i;
  });
  if (!room.players.some((p) => p.id === room.hostPlayerId)) reassignHost(room);

  room.status = 'LOBBY';
  room.winner = null;
  room.gameOverReason = null;
  room.game = null;
  room.mapIndex = pickMapIndex();
  resetPlayerStats(room);
  room.players.forEach((p) => {
    p.ready = p.id === room.hostPlayerId;
  });
  persistRoom(room);
  return room;
}

export function kickTankPlayer(socketId, targetPlayerId) {
  const session = getSession(socketId);
  if (!session) return { error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' };
  const { room, player } = session;
  if (room.status !== 'LOBBY') {
    return { error: 'INVALID_STATE', message: 'Không thể kích người chơi khi trận đấu đang diễn ra.' };
  }
  if (player.id !== room.hostPlayerId) {
    return { error: 'NOT_HOST', message: 'Chỉ chủ phòng mới có quyền kích người chơi.' };
  }
  if (targetPlayerId === room.hostPlayerId) {
    return { error: 'CANNOT_KICK_HOST', message: 'Không thể kích chủ phòng.' };
  }
  const target = room.players.find((p) => p.id === targetPlayerId);
  if (!target) return { error: 'PLAYER_NOT_FOUND', message: 'Không tìm thấy người chơi cần kích.' };

  if (target.socketId) detachSocket(target.socketId);
  removePlayerFromLobby(room, targetPlayerId);
  removePlayerFromLobby(room, targetPlayerId);
  return { room, kickedPlayer: { ...target } };
}

// Explicit leave (button). In a lobby the seat is freed; mid-match it counts as a forfeit.
export function leaveTankRoom(socketId) {
  const session = getSession(socketId);
  detachSocket(socketId);
  if (!session) return null;
  const { room, player } = session;

  if (room.status === 'PLAYING') {
    forfeitPlayer(room, player);
    if (!room.players.some((p) => !p.abandoned)) {
      destroyRoom(room);
      return { roomCode: room.roomCode, roomDeleted: true };
    }
    persistRoom(room);
    return { roomCode: room.roomCode, room, removedPlayer: player };
  }

  return removePlayerFromLobby(room, player.id);
}

// Socket dropped (refresh, network blip). Keep the seat for a grace period.
export function disconnectTankPlayer(socketId) {
  const session = getSession(socketId);
  detachSocket(socketId);
  if (!session) return null;
  const { room, player } = session;
  if (player.socketId !== socketId) return null; // already replaced by a newer connection

  player.connected = false;
  player.socketId = null;
  if (room.game) {
    const tank = room.game.tanks.get(player.id);
    if (tank) tank.input = { dir: -1, fire: false };
  }

  if (!room.players.some((p) => p.connected)) {
    // Nobody online: keep the room around (resumable) until every grace timer runs out.
    room.loop = null;
  }
  scheduleGrace(room, player, room.status === 'PLAYING' ? MATCH_GRACE_MS : LOBBY_GRACE_MS);
  return { roomCode: room.roomCode, room };
}

function expirePlayer(roomCode, playerId) {
  const room = tankRooms.get(roomCode);
  if (!room) return null;
  const player = room.players.find((p) => p.id === playerId);
  if (!player || player.connected) return null;

  if (room.status === 'PLAYING') {
    forfeitPlayer(room, player);
    if (!room.players.some((p) => !p.abandoned)) {
      destroyRoom(room);
      return { roomCode, roomDeleted: true };
    }
    persistRoom(room);
    return { roomCode, room, removedPlayer: player };
  }
  return removePlayerFromLobby(room, playerId);
}

// ---- Startup restore -----------------------------------------------------

export async function restoreTankRooms() {
  try {
    const saved = await repo.loadAllTankRooms();
    for (const data of saved) {
      if (!data?.roomCode || !Array.isArray(data.players) || data.players.length === 0) continue;
      const players = data.players
        .filter((p) => !p.abandoned)
        .map((p) => ({ ...p, socketId: null, connected: false, abandoned: false }));
      if (players.length === 0) continue;

      const room = {
        roomCode: data.roomCode,
        hostPlayerId: players.some((p) => p.id === data.hostPlayerId) ? data.hostPlayerId : players[0].id,
        // A running match cannot be resumed after a restart; return everyone to the room lobby.
        status: 'LOBBY',
        players,
        winner: null,
        gameOverReason: null,
        teamScores: data.teamScores || { blue: 0, red: 0 },
        mapIndex: data.mapIndex ?? pickMapIndex(),
        game: null,
        createdAt: data.createdAt || Date.now()
      };
      resetPlayerStats(room);
      room.players.forEach((p) => {
        p.ready = p.id === room.hostPlayerId;
      });
      tankRooms.set(room.roomCode, room);
      room.players.forEach((p) => scheduleGrace(room, p, LOBBY_GRACE_MS * 2));
    }
    if (saved.length) console.log(`Restored ${tankRooms.size} tank room(s) from Redis`);
  } catch (err) {
    console.error('Restore tank rooms failed:', err.message);
  }
}
