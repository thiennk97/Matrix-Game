import {
  TILE_EMPTY,
  TILE_BRICK,
  TILE_STEEL,
  TILE_WATER,
  TILE_BASE_BLUE,
  TILE_BASE_RED,
  TILE_FORT_BLUE,
  TILE_FORT_RED,
  MAP_SIZE,
  PVP_SPAWN_POINTS,
  PVP_MAP_NAMES,
  getPvPStageMap
} from './tankMaps.js';

// Server-authoritative Battle City PvP simulation.
// One fixed 60Hz tick is the single source of truth for movement, bullets, hits,
// lives and respawns, so every client renders exactly the same match.

export const TICK_RATE = 60;
export const TILE_SIZE = 16;
export const TANK_SIZE = 28;
export const BULLET_SIZE = 6;
export const MAX_LIVES = 3;

const WORLD_SIZE = MAP_SIZE * TILE_SIZE;
const TANK_SPEED = 2;
const BULLET_SPEED = 4.2;
const FIRE_COOLDOWN_TICKS = 14;
const MAX_BULLETS_PER_TANK = 12; // only a safety net: the cooldown sets the fire rhythm
const FIRE_BUFFER_TICKS = 12; // a tap during cooldown still fires as soon as the cannon is ready
const FORT_HP = 12; // + 1 shot on the eagle = 13 shots to blow it up
const COUNTDOWN_TICKS = 3 * TICK_RATE;
const RESPAWN_DELAY_TICKS = 1 * TICK_RATE;
const SHIELD_TICKS = 2 * TICK_RATE;
const START_SHIELD_TICKS = 2 * TICK_RATE;
const SNAP_GRID = TILE_SIZE / 2;
const SNAP_TOLERANCE = 4;

const DIR_VECTORS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 }
];

const BLOCKING_TILES = new Set([
  TILE_BRICK,
  TILE_STEEL,
  TILE_WATER,
  TILE_BASE_BLUE,
  TILE_BASE_RED,
  TILE_FORT_BLUE,
  TILE_FORT_RED
]);

const EAGLE_TILES = {
  blue: [[24, 12], [24, 13], [25, 12], [25, 13]],
  red: [[0, 12], [0, 13], [1, 12], [1, 13]]
};

function round1(n) {
  return Math.round(n * 10) / 10;
}

function overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function createGame(room, mapIndex) {
  const map = getPvPStageMap(mapIndex);
  const wallHp = new Map();
  const brickTiles = [];

  for (let r = 0; r < MAP_SIZE; r++) {
    for (let c = 0; c < MAP_SIZE; c++) {
      if (map[r][c] === TILE_FORT_BLUE || map[r][c] === TILE_FORT_RED) {
        wallHp.set(`${r}_${c}`, FORT_HP);
      } else if (map[r][c] === TILE_BRICK) {
        brickTiles.push(`${r}_${c}`);
      }
    }
  }

  // Pre-select exactly 2 random brick tiles on the map to hold missiles (or 0 if map has no bricks)
  const missileBricks = new Set();
  if (brickTiles.length > 0) {
    for (let i = brickTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = brickTiles[i];
      brickTiles[i] = brickTiles[j];
      brickTiles[j] = temp;
    }
    const targetCount = Math.min(2, brickTiles.length);
    for (let i = 0; i < targetCount; i++) {
      missileBricks.add(brickTiles[i]);
    }
  }

  const game = {
    tick: 0,
    startTick: COUNTDOWN_TICKS,
    map,
    wallHp,
    mapIndex,
    mapName: PVP_MAP_NAMES[mapIndex] || PVP_MAP_NAMES[0],
    tanks: new Map(),
    bullets: [],
    nextBulletId: 1,
    drops: [],
    nextDropId: 1,
    missileBricks,
    events: [],
    eagles: { blue: true, red: true },
    result: null
  };

  const perTeamIndex = { blue: 0, red: 0 };
  for (const player of room.players) {
    const spawnList = PVP_SPAWN_POINTS[player.team];
    const spawn = spawnList[perTeamIndex[player.team]++ % spawnList.length];
    game.tanks.set(player.id, {
      id: player.id,
      team: player.team,
      spawn,
      x: spawn.x,
      y: spawn.y,
      dir: spawn.dir,
      alive: true,
      shieldUntil: COUNTDOWN_TICKS + START_SHIELD_TICKS,
      respawnAt: 0,
      cooldown: 0,
      missiles: 0,
      input: { dir: -1, fire: false },
      cmdQueue: [],
      cmdCredit: 1,
      ack: 0,
      fireSeq: 0,
      fireQueued: 0
    });
  }

  return game;
}

// Fire state comes from the held-button input; movement comes from numbered commands (see enqueueCommand).
export function setInput(game, playerId, input) {
  const tank = game.tanks.get(playerId);
  if (!tank) return;
  tank.input = { dir: -1, fire: Boolean(input?.fire) };
  // Every key press bumps fireSeq on the client, so taps shorter than one tick are never lost.
  const seq = Number.isInteger(input?.fireSeq) ? input.fireSeq : tank.fireSeq;
  if (seq !== tank.fireSeq) {
    tank.fireSeq = seq;
    tank.fireQueued = FIRE_BUFFER_TICKS;
  }
}

export function clearInput(game, playerId) {
  const tank = game.tanks.get(playerId);
  if (!tank) return;
  tank.input = { dir: -1, fire: false };
  tank.cmdQueue.length = 0;
}

const MAX_QUEUED_COMMANDS = 24;
const MAX_COMMAND_CREDIT = 6;

// Movement commands: the client numbers one command per 60Hz step and the server applies them
// in order. The snapshot echoes the last applied number (ack) so the client can replay anything
// newer on top of the authoritative position, which keeps prediction exact.
export function enqueueCommand(game, playerId, n, dir, fire, missile) {
  const tank = game.tanks.get(playerId);
  if (!tank || !Number.isInteger(n)) return;
  const last = tank.cmdQueue.length ? tank.cmdQueue[tank.cmdQueue.length - 1].n : tank.ack;
  if (n <= last) return;
  tank.cmdQueue.push({
    n,
    dir: Number.isInteger(dir) && dir >= 0 && dir <= 3 ? dir : -1,
    fire: Boolean(fire),
    missile: Boolean(missile)
  });
  if (tank.cmdQueue.length > MAX_QUEUED_COMMANDS) tank.cmdQueue.shift();
}

// Take the commands this tank may run on this tick. Credit lets a late burst catch up, but the
// long-run average is one command per tick so nobody can move faster than 60 steps per second.
function takeCommands(tank) {
  tank.cmdCredit = Math.min(MAX_COMMAND_CREDIT, tank.cmdCredit + 1);
  const taken = [];
  while (tank.cmdQueue.length && tank.cmdCredit >= 1) {
    tank.cmdCredit -= 1;
    const cmd = tank.cmdQueue.shift();
    tank.ack = cmd.n;
    taken.push(cmd);
  }
  return taken;
}

// Commands that arrive while a tank cannot act (countdown, dead) are acknowledged but ignored.
function discardCommands(tank) {
  if (tank.cmdQueue.length) tank.ack = tank.cmdQueue[tank.cmdQueue.length - 1].n;
  tank.cmdQueue.length = 0;
  tank.cmdCredit = 1;
}

function isStaticBlocked(game, x, y) {
  if (x < 0 || y < 0 || x + TANK_SIZE > WORLD_SIZE || y + TANK_SIZE > WORLD_SIZE) return true;
  const startCol = Math.floor(x / TILE_SIZE);
  const endCol = Math.floor((x + TANK_SIZE - 1) / TILE_SIZE);
  const startRow = Math.floor(y / TILE_SIZE);
  const endRow = Math.floor((y + TANK_SIZE - 1) / TILE_SIZE);
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      if (BLOCKING_TILES.has(game.map[r][c])) return true;
    }
  }
  return false;
}

function isTankBlocked(game, self, x, y) {
  for (const other of game.tanks.values()) {
    if (other === self || !other.alive) continue;
    if (overlaps(x, y, TANK_SIZE, TANK_SIZE, other.x, other.y, TANK_SIZE, TANK_SIZE)) return true;
  }
  return false;
}

function canOccupy(game, tank, x, y) {
  return !isStaticBlocked(game, x, y) && !isTankBlocked(game, tank, x, y);
}

function isShielded(game, tank) {
  return game.tick < tank.shieldUntil;
}

function pushEvent(game, event) {
  game.events.push(event);
}

function fireBullet(game, tank, cmdN) {
  let owned = 0;
  for (const b of game.bullets) if (b.ownerId === tank.id) owned++;
  if (owned >= MAX_BULLETS_PER_TANK) return false;

  const half = TANK_SIZE / 2 - BULLET_SIZE / 2;
  let bx = tank.x + half;
  let by = tank.y + half;
  if (tank.dir === 0) by = tank.y - BULLET_SIZE;
  else if (tank.dir === 1) bx = tank.x + TANK_SIZE;
  else if (tank.dir === 2) by = tank.y + TANK_SIZE;
  else bx = tank.x - BULLET_SIZE;

  const v = DIR_VECTORS[tank.dir];
  game.bullets.push({
    id: game.nextBulletId++,
    x: bx,
    y: by,
    vx: v.dx * BULLET_SPEED,
    vy: v.dy * BULLET_SPEED,
    dir: tank.dir,
    ownerId: tank.id,
    team: tank.team,
    cmd: cmdN
  });
  tank.cooldown = FIRE_COOLDOWN_TICKS;
  pushEvent(game, { type: 'shoot', team: tank.team, ownerId: tank.id });
  return true;
}

const MISSILE_SIZE = 10;
const MISSILE_SPEED = BULLET_SPEED * 1.15;

function fireMissile(game, tank, cmdN) {
  if (!tank.missiles || tank.missiles <= 0) return false;
  tank.missiles--;

  const half = TANK_SIZE / 2 - MISSILE_SIZE / 2;
  let bx = tank.x + half;
  let by = tank.y + half;
  if (tank.dir === 0) by = tank.y - MISSILE_SIZE;
  else if (tank.dir === 1) bx = tank.x + TANK_SIZE;
  else if (tank.dir === 2) by = tank.y + TANK_SIZE;
  else bx = tank.x - MISSILE_SIZE;

  const v = DIR_VECTORS[tank.dir];
  game.bullets.push({
    id: game.nextBulletId++,
    x: bx,
    y: by,
    vx: v.dx * MISSILE_SPEED,
    vy: v.dy * MISSILE_SPEED,
    dir: tank.dir,
    ownerId: tank.id,
    team: tank.team,
    cmd: cmdN,
    isMissile: true,
    size: MISSILE_SIZE
  });
  tank.cooldown = FIRE_COOLDOWN_TICKS;
  pushEvent(game, { type: 'fire_missile', team: tank.team, ownerId: tank.id, x: bx + 5, y: by + 5 });
  return true;
}

// Each command is one 60Hz step of that player's tank: cool the cannon, fire if asked (from the
// tank's current pose), then move. The client mirrors this order exactly for prediction.
function moveTank(game, tank) {
  for (const cmd of takeCommands(tank)) {
    if (tank.cooldown > 0) tank.cooldown--;
    if (cmd.missile && (tank.missiles || 0) > 0) {
      fireMissile(game, tank, cmd.n);
    } else if (cmd.fire && tank.cooldown === 0) {
      fireBullet(game, tank, cmd.n);
    }
    applyMove(game, tank, cmd.dir);
  }
}

function applyMove(game, tank, dir) {
  if (dir >= 0) {
    tank.dir = dir;
    const v = DIR_VECTORS[dir];

    // Corner assist: slide onto the 8px grid, but only if the snapped spot is actually free.
    if (v.dy !== 0) {
      const snapX = Math.round(tank.x / SNAP_GRID) * SNAP_GRID;
      if (snapX !== tank.x && Math.abs(tank.x - snapX) < SNAP_TOLERANCE && canOccupy(game, tank, snapX, tank.y)) {
        tank.x = snapX;
      }
    } else {
      const snapY = Math.round(tank.y / SNAP_GRID) * SNAP_GRID;
      if (snapY !== tank.y && Math.abs(tank.y - snapY) < SNAP_TOLERANCE && canOccupy(game, tank, tank.x, snapY)) {
        tank.y = snapY;
      }
    }

    const nx = tank.x + v.dx * TANK_SPEED;
    const ny = tank.y + v.dy * TANK_SPEED;
    if (canOccupy(game, tank, nx, ny)) {
      tank.x = nx;
      tank.y = ny;
    }
  }

  // Check if tank stepped onto a drop item (missile pickup)
  for (let i = game.drops.length - 1; i >= 0; i--) {
    const drop = game.drops[i];
    if (overlaps(tank.x, tank.y, TANK_SIZE, TANK_SIZE, drop.x, drop.y, TILE_SIZE, TILE_SIZE)) {
      if (drop.type === 'missile') {
        tank.missiles = (tank.missiles || 0) + 1;
        pushEvent(game, {
          type: 'pickup',
          item: 'missile',
          id: tank.id,
          ownerId: tank.id,
          team: tank.team,
          x: drop.x + 8,
          y: drop.y + 8
        });
      }
      game.drops.splice(i, 1);
    }
  }
}

function setTile(game, row, col, tile, hp) {
  game.map[row][col] = tile;
  const key = `${row}_${col}`;
  if (tile === TILE_FORT_BLUE || tile === TILE_FORT_RED) game.wallHp.set(key, hp);
  else game.wallHp.delete(key);
  pushEvent(game, { type: 'tile', r: row, c: col, tile, hp: hp ?? 0 });
}

function destroyEagle(game, team) {
  if (!game.eagles[team]) return;
  game.eagles[team] = false;
  for (const [r, c] of EAGLE_TILES[team]) game.map[r][c] = TILE_EMPTY;
  pushEvent(game, { type: 'eagle', team });
  if (!game.result) game.result = { winner: team === 'blue' ? 'red' : 'blue', reason: 'eagle', destroyedTeam: team };
}

function killTank(game, room, victim, killerId) {
  const player = room.players.find((p) => p.id === victim.id);
  const killer = room.players.find((p) => p.id === killerId);
  if (!player) return;

  victim.alive = false;
  victim.input = { dir: -1, fire: false };
  player.deaths++;
  player.lives = Math.max(0, player.lives - 1);
  if (killer) killer.kills++;

  pushEvent(game, {
    type: 'explosion',
    x: round1(victim.x + TANK_SIZE / 2),
    y: round1(victim.y + TANK_SIZE / 2),
    big: true,
    victimId: victim.id,
    killerId: killerId || null
  });

  if (player.lives > 0) {
    victim.respawnAt = game.tick + RESPAWN_DELAY_TICKS;
    return;
  }

  const teamAlive = room.players.some((p) => p.team === victim.team && p.lives > 0);
  if (!teamAlive && !game.result) {
    game.result = { winner: victim.team === 'blue' ? 'red' : 'blue', reason: 'lives', destroyedTeam: victim.team };
  }
}

function findRespawnSpot(game, tank) {
  const { x: sx, y: sy } = tank.spawn;
  if (canOccupy(game, tank, sx, sy)) return { x: sx, y: sy };
  const candidates = [];
  for (let dy = -96; dy <= 96; dy += SNAP_GRID) {
    for (let dx = -96; dx <= 96; dx += SNAP_GRID) {
      candidates.push({ x: sx + dx, y: sy + dy, d: Math.hypot(dx, dy) });
    }
  }
  candidates.sort((a, b) => a.d - b.d);
  return candidates.find((c) => canOccupy(game, tank, c.x, c.y)) || null;
}

function updateRespawns(game, room) {
  for (const tank of game.tanks.values()) {
    if (tank.alive || game.tick < tank.respawnAt) continue;
    const player = room.players.find((p) => p.id === tank.id);
    if (!player || player.lives <= 0) continue;
    // If an enemy or teammate is parked on the spawn pad, respawn at the nearest free spot instead of waiting forever.
    const spot = findRespawnSpot(game, tank);
    if (!spot) continue;
    tank.x = spot.x;
    tank.y = spot.y;
    tank.dir = tank.spawn.dir;
    tank.alive = true;
    tank.cooldown = 0;
    tank.shieldUntil = game.tick + SHIELD_TICKS;
    pushEvent(game, { type: 'respawn', id: tank.id });
  }
}

function removeBullet(game, index) {
  game.bullets.splice(index, 1);
}

function breakBrick(game, r, c, ownerId) {
  setTile(game, r, c, TILE_EMPTY);
  pushEvent(game, { type: 'brick', x: c * TILE_SIZE + 8, y: r * TILE_SIZE + 8, ownerId });
  const key = `${r}_${c}`;
  if (game.missileBricks && game.missileBricks.has(key)) {
    game.missileBricks.delete(key);
    game.drops.push({
      id: game.nextDropId++,
      type: 'missile',
      x: c * TILE_SIZE,
      y: r * TILE_SIZE
    });
    pushEvent(game, { type: 'drop_spawn', item: 'missile', x: c * TILE_SIZE + 8, y: r * TILE_SIZE + 8 });
  }
}

function detonateMissile(game, room, b, hitCol, hitRow) {
  const centerCol = Math.max(0, Math.min(MAP_SIZE - 1, hitCol));
  const centerRow = Math.max(0, Math.min(MAP_SIZE - 1, hitRow));
  const centerX = centerCol * TILE_SIZE + 8;
  const centerY = centerRow * TILE_SIZE + 8;

  pushEvent(game, {
    type: 'missile_explosion',
    x: centerX,
    y: centerY,
    radius: 24,
    ownerId: b.ownerId
  });

  // 1. Destroy bricks and fort tiles in 3x3 grid
  for (let r = centerRow - 1; r <= centerRow + 1; r++) {
    for (let c = centerCol - 1; c <= centerCol + 1; c++) {
      if (r < 0 || r >= MAP_SIZE || c < 0 || c >= MAP_SIZE) continue;
      const tile = game.map[r][c];
      if (tile === TILE_BRICK) {
        breakBrick(game, r, c, b.ownerId);
      } else if (tile === TILE_FORT_BLUE || tile === TILE_FORT_RED) {
        const fortTeam = tile === TILE_FORT_BLUE ? 'blue' : 'red';
        if (b.team !== fortTeam) {
          setTile(game, r, c, TILE_EMPTY);
          pushEvent(game, { type: 'explosion', x: c * TILE_SIZE + 8, y: r * TILE_SIZE + 8, big: false });
        }
      } else if (tile === TILE_BASE_BLUE || tile === TILE_BASE_RED) {
        const eagleTeam = tile === TILE_BASE_BLUE ? 'blue' : 'red';
        if (b.team !== eagleTeam) {
          destroyEagle(game, eagleTeam);
          pushEvent(game, {
            type: 'explosion',
            x: 13 * TILE_SIZE,
            y: eagleTeam === 'blue' ? 25 * TILE_SIZE : 1 * TILE_SIZE,
            big: true
          });
        }
      }
    }
  }

  // 2. Blast damage to opponent tanks only in 3x3 area (no self-damage or friendly fire)
  const blastX = (centerCol - 1) * TILE_SIZE;
  const blastY = (centerRow - 1) * TILE_SIZE;
  const blastSize = 3 * TILE_SIZE;
  for (const tank of game.tanks.values()) {
    if (!tank.alive || tank.team === b.team) continue;
    if (overlaps(blastX, blastY, blastSize, blastSize, tank.x, tank.y, TANK_SIZE, TANK_SIZE)) {
      if (isShielded(game, tank)) {
        pushEvent(game, { type: 'shield', x: tank.x + 14, y: tank.y + 14 });
      } else {
        killTank(game, room, tank, b.ownerId);
      }
    }
  }
}

function updateBullets(game, room) {
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const b = game.bullets[i];
    if (!b) continue;
    b.x += b.vx;
    b.y += b.vy;

    const bSize = b.size || BULLET_SIZE;

    if (b.x < 0 || b.y < 0 || b.x + bSize > WORLD_SIZE || b.y + bSize > WORLD_SIZE) {
      if (b.isMissile) {
        const col = Math.max(0, Math.min(MAP_SIZE - 1, Math.floor((b.x + bSize / 2) / TILE_SIZE)));
        const row = Math.max(0, Math.min(MAP_SIZE - 1, Math.floor((b.y + bSize / 2) / TILE_SIZE)));
        detonateMissile(game, room, b, col, row);
      }
      removeBullet(game, i);
      continue;
    }

    // Opposing bullets interaction:
    // Missile is NOT blocked by normal bullets! Normal bullet is destroyed, missile keeps flying.
    let clashedWith = -1;
    for (let j = game.bullets.length - 1; j >= 0; j--) {
      if (j === i) continue;
      const o = game.bullets[j];
      if (o.team === b.team) continue;
      const oSize = o.size || BULLET_SIZE;
      if (overlaps(b.x, b.y, bSize, bSize, o.x, o.y, oSize, oSize)) {
        if (b.isMissile && !o.isMissile) {
          // Normal bullet destroyed, missile keeps flying!
          pushEvent(game, { type: 'clash', x: round1(o.x + 3), y: round1(o.y + 3) });
          removeBullet(game, j);
          if (j < i) i--;
          continue;
        }
        if (!b.isMissile && o.isMissile) {
          // Normal bullet destroyed
          pushEvent(game, { type: 'clash', x: round1(b.x + 3), y: round1(b.y + 3) });
          removeBullet(game, i);
          clashedWith = j;
          break;
        }
        if (b.isMissile && o.isMissile) {
          // Mid-air head-on missile clash: detonate both in 3x3!
          const col = Math.floor((b.x + o.x) / 2 / TILE_SIZE);
          const row = Math.floor((b.y + o.y) / 2 / TILE_SIZE);
          detonateMissile(game, room, b, col, row);
          detonateMissile(game, room, o, col, row);
          removeBullet(game, Math.max(i, j));
          removeBullet(game, Math.min(i, j));
          clashedWith = j;
          break;
        }
        // Both are normal bullets
        pushEvent(game, {
          type: 'clash',
          x: round1((b.x + o.x) / 2 + BULLET_SIZE / 2),
          y: round1((b.y + o.y) / 2 + BULLET_SIZE / 2)
        });
        removeBullet(game, Math.max(i, j));
        removeBullet(game, Math.min(i, j));
        clashedWith = j;
        break;
      }
    }
    if (clashedWith >= 0) {
      if (clashedWith < i) i--;
      continue;
    }

    const cx = b.x + bSize / 2;
    const cy = b.y + bSize / 2;
    const col = Math.floor(cx / TILE_SIZE);
    const row = Math.floor(cy / TILE_SIZE);
    const tile = game.map[row]?.[col];

    if (tile === TILE_BRICK) {
      if (b.isMissile) {
        detonateMissile(game, room, b, col, row);
      } else {
        breakBrick(game, row, col, b.ownerId);
      }
      removeBullet(game, i);
      continue;
    }

    if (tile === TILE_STEEL) {
      if (b.isMissile) {
        detonateMissile(game, room, b, col, row);
      } else {
        pushEvent(game, { type: 'steel', x: round1(cx), y: round1(cy), ownerId: b.ownerId });
      }
      removeBullet(game, i);
      continue;
    }

    if (tile === TILE_FORT_BLUE || tile === TILE_FORT_RED) {
      const fortTeam = tile === TILE_FORT_BLUE ? 'blue' : 'red';
      if (b.isMissile) {
        detonateMissile(game, room, b, col, row);
        removeBullet(game, i);
        continue;
      }
      removeBullet(game, i);
      if (b.team === fortTeam) {
        pushEvent(game, { type: 'steel', x: round1(cx), y: round1(cy) });
        continue;
      }
      const next = (game.wallHp.get(`${row}_${col}`) ?? FORT_HP) - 1;
      if (next <= 0) {
        setTile(game, row, col, TILE_EMPTY);
        pushEvent(game, { type: 'explosion', x: col * TILE_SIZE + 8, y: row * TILE_SIZE + 8, big: false });
      } else {
        setTile(game, row, col, tile, next);
        pushEvent(game, { type: 'fort_hit', x: round1(cx), y: round1(cy), team: fortTeam });
      }
      continue;
    }

    if (tile === TILE_BASE_BLUE || tile === TILE_BASE_RED) {
      const eagleTeam = tile === TILE_BASE_BLUE ? 'blue' : 'red';
      if (b.isMissile) {
        detonateMissile(game, room, b, col, row);
        removeBullet(game, i);
        continue;
      }
      removeBullet(game, i);
      if (b.team !== eagleTeam) {
        destroyEagle(game, eagleTeam);
        pushEvent(game, {
          type: 'explosion',
          x: 13 * TILE_SIZE,
          y: eagleTeam === 'blue' ? 25 * TILE_SIZE : 1 * TILE_SIZE,
          big: true
        });
      }
      continue;
    }

    // Bullet vs enemy tanks
    let consumed = false;
    for (const tank of game.tanks.values()) {
      if (!tank.alive || tank.team === b.team) continue;
      if (!overlaps(b.x, b.y, bSize, bSize, tank.x, tank.y, TANK_SIZE, TANK_SIZE)) continue;

      if (b.isMissile) {
        const tCol = Math.max(0, Math.min(MAP_SIZE - 1, Math.floor((tank.x + 14) / TILE_SIZE)));
        const tRow = Math.max(0, Math.min(MAP_SIZE - 1, Math.floor((tank.y + 14) / TILE_SIZE)));
        detonateMissile(game, room, b, tCol, tRow);
      } else {
        if (isShielded(game, tank)) {
          pushEvent(game, { type: 'shield', x: round1(cx), y: round1(cy) });
        } else {
          killTank(game, room, tank, b.ownerId);
        }
      }
      removeBullet(game, i);
      consumed = true;
      break;
    }
    if (consumed) continue;
  }
}

// Advance the simulation by one tick. Returns the game result once the match is decided.
export function stepGame(game, room) {
  game.tick++;
  if (game.result) return game.result;
  if (game.tick <= game.startTick) {
    for (const tank of game.tanks.values()) discardCommands(tank);
    return null;
  }

  updateRespawns(game, room);

  // Alternate resolution order so neither side always wins a head-on collision.
  const order = [...game.tanks.values()];
  if (game.tick % 2 === 0) order.reverse();
  for (const tank of order) {
    if (tank.alive) moveTank(game, tank);
    else discardCommands(tank);
  }

  updateBullets(game, room);
  return game.result;
}

export function drainEvents(game) {
  const events = game.events;
  game.events = [];
  return events;
}

export function buildSnapshot(game, room, events = []) {
  const tanks = [];
  for (const tank of game.tanks.values()) {
    const player = room.players.find((p) => p.id === tank.id);
    tanks.push({
      id: tank.id,
      x: tank.x,
      y: tank.y,
      dir: tank.dir,
      alive: tank.alive,
      ack: tank.ack,
      shield: isShielded(game, tank),
      lives: player ? player.lives : 0,
      kills: player ? player.kills : 0,
      deaths: player ? player.deaths : 0,
      online: player ? player.connected : false,
      missiles: tank.missiles || 0
    });
  }
  return {
    tick: game.tick,
    countdown: Math.max(0, Math.ceil((game.startTick - game.tick) / TICK_RATE)),
    tanks,
    bullets: game.bullets.map((b) => ({
      id: b.id,
      x: round1(b.x),
      y: round1(b.y),
      dir: b.dir,
      team: b.team,
      o: b.ownerId,
      c: b.cmd,
      m: Boolean(b.isMissile)
    })),
    drops: (game.drops || []).map((d) => ({
      id: d.id,
      x: d.x,
      y: d.y,
      type: d.type
    })),
    events
  };
}

export function buildFullState(game, room) {
  return {
    mapIndex: game.mapIndex,
    mapName: game.mapName,
    map: game.map,
    wallHp: Object.fromEntries(game.wallHp),
    eagles: { ...game.eagles },
    snapshot: buildSnapshot(game, room)
  };
}
