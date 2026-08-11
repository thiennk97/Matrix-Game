import { getRedisClient } from '../config/redis.js';

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
      rooms.push(JSON.parse(data));
    } catch (err) {
      deadRoomCodes.push(roomCode);
    }
  }

  if (deadRoomCodes.length > 0) {
    client.zRem(LOBBY_INDEX_KEY, deadRoomCodes).catch(console.error);
  }

  return rooms;
}

export {
  createRoom,
  getRoom,
  saveRoom,
  saveRoomWithoutTouch,
  deleteRoom,
  addOpenRoom,
  removeOpenRoom,
  listOpenRooms
};
