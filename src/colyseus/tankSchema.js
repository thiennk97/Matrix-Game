import { schema, t } from '@colyseus/schema';

export const TankPlayerSchema = schema({
  id: t.string(),
  name: t.string(),
  team: t.string(), // 'blue' | 'red'
  seat: t.int8(),
  ready: t.boolean(),
  connected: t.boolean(),
  lives: t.int8(),
  kills: t.int16(),
  deaths: t.int16()
});

export const TankEntitySchema = schema({
  id: t.string(),
  x: t.float32(),
  y: t.float32(),
  dir: t.int8(),
  alive: t.boolean(),
  ack: t.int32(),
  shield: t.boolean(),
  lives: t.int8(),
  kills: t.int16(),
  deaths: t.int16(),
  online: t.boolean()
});

export const BulletEntitySchema = schema({
  id: t.int32(),
  x: t.float32(),
  y: t.float32(),
  dir: t.int8(),
  team: t.string(),
  o: t.string(), // owner player id
  c: t.int32()   // cmd sequence number
});

export const TankRoomStateSchema = schema({
  roomCode: t.string(),
  hostPlayerId: t.string(),
  status: t.string(), // 'LOBBY' | 'PLAYING' | 'FINISHED'
  mapIndex: t.int8(),
  mapName: t.string(),
  tick: t.int32(),
  countdown: t.int8(),
  blueEagleAlive: t.boolean(),
  redEagleAlive: t.boolean(),
  winner: t.string(), // 'blue' | 'red' | ''
  gameOverReason: t.string(), // 'eagle' | 'lives' | ''
  blueScore: t.int16(),
  redScore: t.int16(),
  createdAt: t.float64(),
  players: t.map(TankPlayerSchema),
  tanks: t.map(TankEntitySchema),
  bullets: t.map(BulletEntitySchema),
  wallHp: t.map('int8')
});
