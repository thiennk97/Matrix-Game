import { Room } from 'colyseus';
import {
  TankRoomStateSchema,
  TankPlayerSchema,
  TankEntitySchema,
  BulletEntitySchema
} from './tankSchema.js';
import {
  createGame,
  stepGame,
  drainEvents,
  buildSnapshot,
  buildFullState,
  enqueueCommand,
  setInput,
  clearInput,
  MAX_LIVES
} from '../core/tankEngine.js';
import { PVP_MAP_NAMES } from '../core/tankMaps.js';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS = 4;
const MAX_PER_TEAM = 2;

function generateTankRoomCode() {
  let code = 'TK';
  for (let i = 0; i < 4; i++) {
    code += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return code;
}

function pickMapIndex() {
  return Math.floor(Math.random() * PVP_MAP_NAMES.length);
}

export class TankColyseusRoom extends Room {
  maxClients = MAX_PLAYERS;

  onCreate(options = {}) {
    const state = new TankRoomStateSchema();
    state.roomCode = options.roomCode || generateTankRoomCode();
    state.status = 'LOBBY';
    state.mapIndex = pickMapIndex();
    state.mapName = PVP_MAP_NAMES[state.mapIndex] || PVP_MAP_NAMES[0];
    state.blueEagleAlive = true;
    state.redEagleAlive = true;
    state.blueScore = 0;
    state.redScore = 0;
    state.createdAt = Date.now();

    this.setState(state);
    this.game = null;
    this.sessionToPlayerId = new Map(); // sessionId -> playerId
    this.playerIdToClient = new Map(); // playerId -> client

    // 60Hz delta updates: schema diff is compact (<50 bytes), eliminating Socket.IO delay
    this.setPatchRate(1000 / 60);
    this.setSimulationInterval(() => this.tick(), 1000 / 60);

    this.updateRoomMetadata();
    this.registerMessages();
  }

  updateRoomMetadata() {
    let hostName = '';
    let blueCount = 0;
    let redCount = 0;
    this.state.players.forEach((p) => {
      if (p.id === this.state.hostPlayerId) hostName = p.name;
      if (p.team === 'blue') blueCount++;
      if (p.team === 'red') redCount++;
    });

    this.setMetadata({
      roomCode: this.state.roomCode,
      hostName,
      playerCount: this.state.players.size,
      maxPlayers: MAX_PLAYERS,
      blueCount,
      redCount,
      status: this.state.status,
      joinable: this.state.status === 'LOBBY' && this.state.players.size < MAX_PLAYERS,
      createdAt: this.state.createdAt
    });
  }

  get roomData() {
    // Adapter matching the interface expected by tankEngine (stepGame)
    const players = [];
    this.state.players.forEach((p) => {
      players.push({
        id: p.id,
        name: p.name,
        team: p.team,
        seat: p.seat,
        ready: p.ready,
        connected: p.connected,
        lives: p.lives,
        kills: p.kills,
        deaths: p.deaths
      });
    });
    return {
      roomCode: this.state.roomCode,
      players,
      teamScores: { blue: this.state.blueScore, red: this.state.redScore }
    };
  }

  registerMessages() {
    this.onMessage('switch_team', (client, { team } = {}) => {
      const playerId = this.sessionToPlayerId.get(client.sessionId);
      const player = this.state.players.get(playerId);
      if (!player || this.state.status !== 'LOBBY') return;
      if (team !== 'blue' && team !== 'red') return;
      if (player.team === team) return;

      let count = 0;
      this.state.players.forEach((p) => {
        if (p.team === team) count++;
      });
      if (count >= MAX_PER_TEAM) {
        client.send('error', { message: 'Đội này đã đủ thành viên.' });
        return;
      }
      player.team = team;
      player.ready = player.id === this.state.hostPlayerId;
      this.updateRoomMetadata();
    });

    this.onMessage('toggle_ready', (client) => {
      const playerId = this.sessionToPlayerId.get(client.sessionId);
      const player = this.state.players.get(playerId);
      if (!player || this.state.status !== 'LOBBY') return;
      if (player.id === this.state.hostPlayerId) return;
      player.ready = !player.ready;
    });

    this.onMessage('start_game', (client) => {
      const playerId = this.sessionToPlayerId.get(client.sessionId);
      if (playerId !== this.state.hostPlayerId || this.state.status !== 'LOBBY') return;

      let blue = 0;
      let red = 0;
      let allReady = true;
      this.state.players.forEach((p) => {
        if (p.team === 'blue') blue++;
        if (p.team === 'red') red++;
        if (p.id !== this.state.hostPlayerId && !p.ready) allReady = false;
      });

      if (this.state.players.size > 1 && (blue === 0 || red === 0)) {
        client.send('error', { message: 'Cần có người ở cả 2 đội (Xanh & Đỏ) để đối kháng.' });
        return;
      }
      if (!allReady) {
        client.send('error', { message: 'Tất cả thành viên phải bấm Sẵn Sàng trước khi bắt đầu.' });
        return;
      }

      this.startGame();
    });

    this.onMessage('cmd', (client, cmd) => {
      const playerId = this.sessionToPlayerId.get(client.sessionId);
      if (!playerId || this.state.status !== 'PLAYING' || !this.game) return;
      enqueueCommand(this.game, playerId, cmd?.n, cmd?.dir, cmd?.f);
    });

    this.onMessage('input', (client, input) => {
      const playerId = this.sessionToPlayerId.get(client.sessionId);
      if (!playerId || this.state.status !== 'PLAYING' || !this.game) return;
      setInput(this.game, playerId, input);
    });

    this.onMessage('rematch', (client) => {
      if (this.state.status === 'PLAYING') return;
      this.resetRematch();
    });

    this.onMessage('kick_player', (client, { targetPlayerId } = {}) => {
      const hostId = this.sessionToPlayerId.get(client.sessionId);
      if (hostId !== this.state.hostPlayerId || this.state.status !== 'LOBBY') return;
      if (!targetPlayerId || targetPlayerId === hostId) return;

      const targetClient = this.playerIdToClient.get(targetPlayerId);
      if (targetClient) {
        targetClient.send('kicked', { message: 'Bạn đã bị chủ phòng mời ra khỏi phòng.' });
        targetClient.leave();
      }
    });
  }

  startGame() {
    this.state.status = 'PLAYING';
    this.state.winner = '';
    this.state.gameOverReason = '';
    this.state.mapIndex = pickMapIndex();
    this.state.mapName = PVP_MAP_NAMES[this.state.mapIndex] || PVP_MAP_NAMES[0];
    this.state.blueEagleAlive = true;
    this.state.redEagleAlive = true;

    // Reset stats
    this.state.players.forEach((p) => {
      p.lives = MAX_LIVES;
      p.kills = 0;
      p.deaths = 0;
    });

    this.game = createGame(this.roomData, this.state.mapIndex);

    // Initial state setup
    this.state.tanks.clear();
    this.state.bullets.clear();
    this.state.wallHp.clear();

    for (const [pos, hp] of this.game.wallHp.entries()) {
      this.state.wallHp.set(pos, hp);
    }

    for (const tank of this.game.tanks.values()) {
      const te = new TankEntitySchema();
      te.id = tank.id;
      te.x = tank.x;
      te.y = tank.y;
      te.dir = tank.dir;
      te.alive = tank.alive;
      te.ack = tank.ack;
      te.shield = this.game.tick < tank.shieldUntil;
      te.lives = MAX_LIVES;
      te.kills = 0;
      te.deaths = 0;
      te.online = true;
      this.state.tanks.set(tank.id, te);
    }

    const fullState = buildFullState(this.game, this.roomData);
    this.broadcast('full_state', fullState);
    this.updateRoomMetadata();
  }

  resetRematch() {
    this.state.status = 'LOBBY';
    this.state.winner = '';
    this.state.gameOverReason = '';
    this.state.mapIndex = pickMapIndex();
    this.state.mapName = PVP_MAP_NAMES[this.state.mapIndex] || PVP_MAP_NAMES[0];
    this.game = null;
    this.state.tanks.clear();
    this.state.bullets.clear();

    this.state.players.forEach((p) => {
      p.lives = MAX_LIVES;
      p.kills = 0;
      p.deaths = 0;
      p.ready = p.id === this.state.hostPlayerId;
    });

    this.updateRoomMetadata();
  }

  onJoin(client, options = {}) {
    let playerId = options.playerId;
    const playerName = String(options.playerName || 'Chiến binh').trim().slice(0, 24);

    // Check if player reconnecting to their seat
    let player = playerId ? this.state.players.get(playerId) : null;
    if (player) {
      player.connected = true;
      this.sessionToPlayerId.set(client.sessionId, playerId);
      this.playerIdToClient.set(playerId, client);
      if (this.state.status === 'PLAYING' && this.game) {
        client.send('full_state', buildFullState(this.game, this.roomData));
      }
      this.updateRoomMetadata();
      return;
    }

    // New player
    playerId = playerId || client.sessionId;
    let blueCount = 0;
    let redCount = 0;
    this.state.players.forEach((p) => {
      if (p.team === 'blue') blueCount++;
      if (p.team === 'red') redCount++;
    });

    const team = blueCount <= redCount ? 'blue' : 'red';
    const seat = this.state.players.size;
    const isHost = this.state.players.size === 0 || !this.state.hostPlayerId;

    if (isHost) {
      this.state.hostPlayerId = playerId;
    }

    player = new TankPlayerSchema();
    player.id = playerId;
    player.name = playerName;
    player.team = team;
    player.seat = seat;
    player.ready = isHost;
    player.connected = true;
    player.lives = MAX_LIVES;
    player.kills = 0;
    player.deaths = 0;

    this.state.players.set(playerId, player);
    this.sessionToPlayerId.set(client.sessionId, playerId);
    this.playerIdToClient.set(playerId, client);

    this.updateRoomMetadata();
    client.send('session_info', { playerId, roomCode: this.state.roomCode });
  }

  async onLeave(client, consented) {
    const playerId = this.sessionToPlayerId.get(client.sessionId);
    if (!playerId) return;

    const player = this.state.players.get(playerId);
    if (!player) return;

    if (this.state.status === 'LOBBY') {
      this.state.players.delete(playerId);
      this.sessionToPlayerId.delete(client.sessionId);
      this.playerIdToClient.delete(playerId);

      if (this.state.players.size === 0) {
        return; // Room will automatically dispose
      }

      if (playerId === this.state.hostPlayerId) {
        const nextHost = this.state.players.values().next().value;
        if (nextHost) {
          this.state.hostPlayerId = nextHost.id;
          nextHost.ready = true;
        }
      }
      this.updateRoomMetadata();
    } else {
      // In-game disconnect
      player.connected = false;
      this.sessionToPlayerId.delete(client.sessionId);
      this.playerIdToClient.delete(playerId);

      const te = this.state.tanks.get(playerId);
      if (te) te.online = false;

      // Allow 60 seconds grace period to reconnect
      try {
        if (!consented) {
          const reconnectedClient = await this.allowReconnection(client, 60);
          this.sessionToPlayerId.set(reconnectedClient.sessionId, playerId);
          this.playerIdToClient.set(playerId, reconnectedClient);
          player.connected = true;
          if (te) te.online = true;
          reconnectedClient.send('session_info', { playerId, roomCode: this.state.roomCode });
          if (this.game) {
            reconnectedClient.send('full_state', buildFullState(this.game, this.roomData));
          }
        } else {
          // Explicitly left: forfeit seat
          if (this.game) clearInput(this.game, playerId);
        }
      } catch {
        // Reconnect timed out: mark forfeit
        if (this.game) clearInput(this.game, playerId);
      }
      this.updateRoomMetadata();
    }
  }

  tick() {
    if (this.state.status !== 'PLAYING' || !this.game) return;

    const result = stepGame(this.game, this.roomData);
    this.state.tick = this.game.tick;
    this.state.countdown = Math.max(0, Math.ceil((this.game.startTick - this.game.tick) / 60));
    this.state.blueEagleAlive = this.game.eagles.blue;
    this.state.redEagleAlive = this.game.eagles.red;

    // Sync active tanks
    for (const tank of this.game.tanks.values()) {
      let te = this.state.tanks.get(tank.id);
      if (!te) {
        te = new TankEntitySchema();
        te.id = tank.id;
        this.state.tanks.set(tank.id, te);
      }
      te.x = tank.x;
      te.y = tank.y;
      te.dir = tank.dir;
      te.alive = tank.alive;
      te.ack = tank.ack;
      te.shield = this.game.tick < tank.shieldUntil;

      const p = this.state.players.get(tank.id);
      if (p) {
        te.lives = p.lives;
        te.kills = p.kills;
        te.deaths = p.deaths;
        te.online = p.connected;
      }
    }

    // Sync bullets
    const liveBulletIds = new Set();
    for (const b of this.game.bullets) {
      const idStr = String(b.id);
      liveBulletIds.add(idStr);
      let be = this.state.bullets.get(idStr);
      if (!be) {
        be = new BulletEntitySchema();
        be.id = b.id;
        this.state.bullets.set(idStr, be);
      }
      be.x = Math.round(b.x * 10) / 10;
      be.y = Math.round(b.y * 10) / 10;
      be.dir = b.dir;
      be.team = b.team;
      be.o = b.ownerId;
      be.c = b.cmd;
    }
    // Remove dead bullets
    for (const key of this.state.bullets.keys()) {
      if (!liveBulletIds.has(key)) {
        this.state.bullets.delete(key);
      }
    }

    // Sync tile / wall HP changes
    for (const [coord, hp] of this.game.wallHp.entries()) {
      if (this.state.wallHp.get(coord) !== hp) {
        this.state.wallHp.set(coord, hp);
      }
    }

    // Drain transient events and broadcast to players (shoot sounds, explosions, sparks)
    const events = drainEvents(this.game);
    if (events.length > 0) {
      this.broadcast('tank_events', events);
    }

    if (result) {
      this.state.status = 'FINISHED';
      this.state.winner = result.winner;
      this.state.gameOverReason = result.reason;
      if (result.winner === 'blue') this.state.blueScore++;
      else if (result.winner === 'red') this.state.redScore++;

      const snapshot = buildSnapshot(this.game, this.roomData, drainEvents(this.game));

      this.broadcast('tank_game_over', {
        winner: result.winner,
        reason: result.reason,
        destroyedTeam: result.destroyedTeam,
        snapshot,
        room: this.roomData
      });
      this.updateRoomMetadata();
    }
  }

  onDispose() {
    this.sessionToPlayerId.clear();
    this.playerIdToClient.clear();
    this.game = null;
  }
}
