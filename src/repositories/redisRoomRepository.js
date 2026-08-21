import { getRedisClient } from '../config/redis.js';
import { ROOM_STATUS } from '../config/constants.js';

const ROOM_TTL = parseInt(process.env.ROOM_TTL_SECONDS || '900', 10);
const ROOM_PREFIX = 'matrix:room:';
const LOBBY_INDEX_KEY = 'matrix:lobby:rooms';

function getRoomKey(roomCode) {
  return `${ROOM_PREFIX}${roomCode}`;
}

async function createRoom(room) {
  const client = getRedisClient();
  const key = getRoomKey(room.roomCode);

  const result = await client.set(key, JSON.stringify(room), {
    NX: true,
    EX: ROOM_TTL
  });

  return result === 'OK';
}

async function getRoom(roomCode) {
  const client = getRedisClient();
  const key = getRoomKey(roomCode);

  const data = await client.get(key);
  if (!data) return null;

  try {
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error parsing room ${roomCode} from Redis:`, err);
    return null;
  }
}

async function saveRoom(room) {
  const client = getRedisClient();
  const key = getRoomKey(room.roomCode);

  await client.set(key, JSON.stringify(room), {
    EX: ROOM_TTL
  });
}

async function saveRoomWithoutTouch(room) {
  const client = getRedisClient();
  const key = getRoomKey(room.roomCode);

  await client.set(key, JSON.stringify(room), {
    KEEPTTL: true
  });
}

async function deleteRoom(roomCode) {
  const client = getRedisClient();
  const key = getRoomKey(roomCode);

  await client.del(key);
  await removeOpenRoom(roomCode);
}

async function addOpenRoom(roomCode, createdAt) {
  const client = getRedisClient();
  await client.zAdd(LOBBY_INDEX_KEY, [{ score: createdAt, value: roomCode }]);
}

async function removeOpenRoom(roomCode) {
  const client = getRedisClient();
  await client.zRem(LOBBY_INDEX_KEY, roomCode);
}

async function listOpenRooms(limit = 100) {
  const client = getRedisClient();

  const roomCodes = await client.zRange(LOBBY_INDEX_KEY, 0, limit - 1, {
    REV: true
  });

  if (roomCodes.length === 0) return [];

  const keys = roomCodes.map(getRoomKey);
  const dataList = await client.mGet(keys);

  const rooms = [];
  const deadRoomCodes = [];

  for (let i = 0; i < dataList.length; i++) {
    const data = dataList[i];
    const roomCode = roomCodes[i];

    if (!data) {
      deadRoomCodes.push(roomCode);
      continue;
    }

    try {
      const room = JSON.parse(data);
      const activeCount = (room.players || []).filter((p) => !p.abandoned).length;
      const onlineCount = (room.players || []).filter((p) => p.connected && !p.abandoned).length;

      // Clean up orphaned rooms that have no active players or dead lobbies
      if (activeCount === 0 || (room.status === ROOM_STATUS.LOBBY && onlineCount === 0)) {
        deadRoomCodes.push(roomCode);
        continue;
      }

      rooms.push(room);
    } catch (err) {
      deadRoomCodes.push(roomCode);
    }
  }

  if (deadRoomCodes.length > 0) {
    client.zRem(LOBBY_INDEX_KEY, deadRoomCodes).catch(console.error);
    const deadKeys = deadRoomCodes.map(getRoomKey);
    client.del(deadKeys).catch(console.error);
  }

  return rooms;
}

async function cleanupStaleRoomsOnStartup() {
  const client = getRedisClient();
  const roomCodes = await client.zRange(LOBBY_INDEX_KEY, 0, -1);
  if (roomCodes.length === 0) return;

  const keys = roomCodes.map(getRoomKey);
  const dataList = await client.mGet(keys);
  const deadRoomCodes = [];

  for (let i = 0; i < dataList.length; i++) {
    const data = dataList[i];
    const roomCode = roomCodes[i];

    if (!data) {
      deadRoomCodes.push(roomCode);
      continue;
    }

    try {
      const room = JSON.parse(data);
      let modified = false;

      if (room.players && room.players.length > 0) {
        room.players.forEach((p) => {
          if (p.connected) {
            p.connected = false;
            modified = true;
          }
        });
      }

      // If in LOBBY or has no players, clear it on startup
      if (room.status === ROOM_STATUS.LOBBY || !room.players || room.players.length === 0) {
        deadRoomCodes.push(roomCode);
      } else {
        if (room.status === ROOM_STATUS.PLAYING) {
          room.status = ROOM_STATUS.PAUSED;
          if (room.turnEndsAt) {
            room.remainingTurnMs = Math.max(0, room.turnEndsAt - Date.now());
            room.turnEndsAt = null;
          }
          modified = true;
        }
        if (modified) {
          await client.set(getRoomKey(roomCode), JSON.stringify(room), { KEEPTTL: true });
        }
        // Remove from active public lobby since 0 players are currently connected after restart
        deadRoomCodes.push(roomCode);
      }
    } catch {
      deadRoomCodes.push(roomCode);
    }
  }

  if (deadRoomCodes.length > 0) {
    await client.zRem(LOBBY_INDEX_KEY, deadRoomCodes);
  }
}

export {
  createRoom,
  getRoom,
  saveRoom,
  saveRoomWithoutTouch,
  deleteRoom,
  addOpenRoom,
  removeOpenRoom,
  listOpenRooms,
  cleanupStaleRoomsOnStartup
};
