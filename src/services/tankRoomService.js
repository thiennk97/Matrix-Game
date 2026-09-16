import crypto from 'crypto';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS = 4;
const MAX_PER_TEAM = 2;

// In-memory store for real-time tank rooms (can be backed by Redis if needed)
const tankRooms = new Map();

function generateTankRoomCode() {
  let code = 'TK';
  for (let i = 0; i < 4; i++) {
    code += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return code;
}

export function listOpenTankRooms() {
  const openRooms = [];
  for (const room of tankRooms.values()) {
    if (room.status === 'LOBBY') {
      openRooms.push({
        roomCode: room.roomCode,
        hostName: room.players.find(p => p.id === room.hostPlayerId)?.name || 'Host',
        playerCount: room.players.length,
        maxPlayers: MAX_PLAYERS,
        blueCount: room.players.filter(p => p.team === 'blue').length,
        redCount: room.players.filter(p => p.team === 'red').length,
        createdAt: room.createdAt
      });
    }
  }
  return openRooms.sort((a, b) => b.createdAt - a.createdAt);
}

export function getTankRoom(roomCode) {
  if (!roomCode) return null;
  return tankRooms.get(roomCode.toUpperCase().trim()) || null;
}

export function createTankRoom(playerName, socketId) {
  let roomCode;
  for (let i = 0; i < 10; i++) {
    const candidate = generateTankRoomCode();
    if (!tankRooms.has(candidate)) {
      roomCode = candidate;
      break;
    }
  }

  if (!roomCode) {
    roomCode = 'TK' + Date.now().toString(36).toUpperCase().slice(-4);
  }

  const hostPlayerId = crypto.randomUUID();
  const hostPlayer = {
    id: hostPlayerId,
    socketId,
    name: playerName.trim(),
    team: 'blue', // Host starts in Team Blue
    seat: 0,
    ready: true, // Host is ready by default
    connected: true,
    lives: 3,
    kills: 0,
    deaths: 0
  };

  const room = {
    roomCode,
    hostPlayerId,
    status: 'LOBBY',
    players: [hostPlayer],
    eagles: {
      blue: { alive: true },
      red: { alive: true }
    },
    winner: null,
    teamScores: { blue: 0, red: 0 },
    mapIndex: 0,
    destroyedTiles: [],
    createdAt: Date.now()
  };

  tankRooms.set(roomCode, room);
  return { room, playerId: hostPlayerId, player: hostPlayer };
}

export function joinTankRoom(roomCode, playerName, socketId) {
  roomCode = roomCode.toUpperCase().trim();
  const room = tankRooms.get(roomCode);

  if (!room) {
    return { error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại hoặc đã bị hủy.' };
  }
  if (room.status !== 'LOBBY') {
    return { error: 'GAME_ALREADY_STARTED', message: 'Trận đấu đang diễn ra.' };
  }
  if (room.players.length >= MAX_PLAYERS) {
    return { error: 'ROOM_FULL', message: 'Phòng đã đủ 4 người chơi.' };
  }

  // Assign team with fewer players
  const blueCount = room.players.filter(p => p.team === 'blue').length;
  const redCount = room.players.filter(p => p.team === 'red').length;
  const team = blueCount <= redCount ? 'blue' : 'red';

  const playerId = crypto.randomUUID();
  const player = {
    id: playerId,
    socketId,
    name: playerName.trim(),
    team,
    seat: room.players.length,
    ready: false,
    connected: true,
    lives: 3,
    kills: 0,
    deaths: 0
  };

  room.players.push(player);
  return { room, playerId, player };
}

export function switchTankTeam(roomCode, socketId, targetTeam) {
  const room = getTankRoom(roomCode);
  if (!room || room.status !== 'LOBBY') return { error: 'INVALID_STATE', message: 'Không thể đổi đội lúc này.' };

  const player = room.players.find(p => p.socketId === socketId);
  if (!player) return { error: 'PLAYER_NOT_FOUND', message: 'Không tìm thấy người chơi.' };

  if (player.team === targetTeam) return { room }; // Already in this team

  const targetCount = room.players.filter(p => p.team === targetTeam).length;
  if (targetCount >= MAX_PER_TEAM) {
    return { error: 'TEAM_FULL', message: `Đội ${targetTeam === 'blue' ? 'Xanh' : 'Đỏ'} đã đủ 2 người.` };
  }

  player.team = targetTeam;
  player.ready = player.id === room.hostPlayerId; // Keep host ready, others unready
  return { room, player };
}

export function toggleTankReady(roomCode, socketId) {
  const room = getTankRoom(roomCode);
  if (!room || room.status !== 'LOBBY') return { error: 'INVALID_STATE', message: 'Phòng không ở trạng thái chờ.' };

  const player = room.players.find(p => p.socketId === socketId);
  if (!player) return { error: 'PLAYER_NOT_FOUND', message: 'Không tìm thấy người chơi.' };

  if (player.id === room.hostPlayerId) return { room }; // Host is always ready

  player.ready = !player.ready;
  return { room, player };
}

export function startTankGame(roomCode, socketId) {
  const room = getTankRoom(roomCode);
  if (!room) return { error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' };

  if (room.status !== 'LOBBY') {
    return { error: 'INVALID_STATE', message: 'Trận đấu đã bắt đầu.' };
  }

  const hostPlayer = room.players.find(p => p.id === room.hostPlayerId);
  if (!hostPlayer || hostPlayer.socketId !== socketId) {
    return { error: 'NOT_HOST', message: 'Chỉ chủ phòng mới có quyền bắt đầu trận đấu.' };
  }

  const bluePlayers = room.players.filter(p => p.team === 'blue');
  const redPlayers = room.players.filter(p => p.team === 'red');

  if (room.players.length > 1 && (bluePlayers.length === 0 || redPlayers.length === 0)) {
    return { error: 'TEAMS_EMPTY', message: 'Cần có người ở cả 2 đội (Đội Xanh & Đội Đỏ) để đối kháng.' };
  }

  // Check all non-hosts ready
  const unready = room.players.some(p => p.id !== room.hostPlayerId && !p.ready);
  if (unready) {
    return { error: 'NOT_ALL_READY', message: 'Tất cả thành viên phải bấm Sẵn Sàng trước khi bắt đầu.' };
  }

  room.status = 'PLAYING';
  room.winner = null;
  room.destroyedTiles = [];
  room.mapIndex = Math.floor(Math.random() * 12);
  room.eagles = {
    blue: { alive: true },
    red: { alive: true }
  };
  room.players.forEach(p => {
    p.lives = 3;
    p.kills = 0;
    p.deaths = 0;
  });

  return { room };
}

export function kickTankPlayer(roomCode, hostSocketId, targetPlayerId) {
  const room = getTankRoom(roomCode);
  if (!room) return { error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' };
  if (room.status !== 'LOBBY') {
    return { error: 'INVALID_STATE', message: 'Không thể kích người chơi khi trận đấu đang diễn ra.' };
  }

  const host = room.players.find(p => p.id === room.hostPlayerId);
  if (!host || host.socketId !== hostSocketId) {
    return { error: 'NOT_HOST', message: 'Chỉ chủ phòng mới có quyền kích người chơi.' };
  }

  if (targetPlayerId === room.hostPlayerId) {
    return { error: 'CANNOT_KICK_HOST', message: 'Không thể kích chủ phòng.' };
  }

  const pIdx = room.players.findIndex(p => p.id === targetPlayerId);
  if (pIdx === -1) {
    return { error: 'PLAYER_NOT_FOUND', message: 'Không tìm thấy người chơi cần kích.' };
  }

  const kickedPlayer = room.players[pIdx];
  room.players.splice(pIdx, 1);
  return { room, kickedPlayer };
}

export function leaveTankRoom(socketId) {
  for (const [roomCode, room] of tankRooms.entries()) {
    const pIdx = room.players.findIndex(p => p.socketId === socketId);
    if (pIdx !== -1) {
      const removedPlayer = room.players[pIdx];
      room.players.splice(pIdx, 1);

      if (room.players.length === 0) {
        tankRooms.delete(roomCode);
        return { roomCode, roomDeleted: true };
      }

      // Reassign host if host left
      if (removedPlayer.id === room.hostPlayerId) {
        room.hostPlayerId = room.players[0].id;
        room.players[0].ready = true;
      }

      return { roomCode, room, removedPlayer };
    }
  }
  return null;
}

export function resetTankRematch(roomCode) {
  const room = getTankRoom(roomCode);
  if (!room) return null;

  room.status = 'LOBBY';
  room.winner = null;
  if (!room.teamScores) {
    room.teamScores = { blue: 0, red: 0 };
  }
  room.destroyedTiles = [];
  room.mapIndex = Math.floor(Math.random() * 12);
  room.eagles = {
    blue: { alive: true },
    red: { alive: true }
  };
  room.players.forEach(p => {
    p.lives = 3;
    p.kills = 0;
    p.deaths = 0;
    p.ready = p.id === room.hostPlayerId;
  });

  return room;
}
