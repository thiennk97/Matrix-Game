import { getRedisClient } from '../config/redis.js';

const TANK_ROOM_TTL = parseInt(process.env.TANK_ROOM_TTL_SECONDS || '1800', 10);
const TANK_ROOM_PREFIX = 'tank:room:';

function getKey(roomCode) {
  return `${TANK_ROOM_PREFIX}${roomCode}`;
}

export async function saveTankRoom(snapshot) {
  await getRedisClient().set(getKey(snapshot.roomCode), JSON.stringify(snapshot), {
    EX: TANK_ROOM_TTL
  });
}

export async function deleteTankRoom(roomCode) {
  await getRedisClient().del(getKey(roomCode));
}

export async function loadAllTankRooms() {
  const client = getRedisClient();
  const rooms = [];
  for await (const key of client.scanIterator({ MATCH: `${TANK_ROOM_PREFIX}*`, COUNT: 100 })) {
    const keys = Array.isArray(key) ? key : [key];
    for (const k of keys) {
      const data = await client.get(k);
      if (!data) continue;
      try {
        rooms.push(JSON.parse(data));
      } catch (err) {
        console.error(`Invalid tank room payload at ${k}:`, err);
      }
    }
  }
  return rooms;
}
