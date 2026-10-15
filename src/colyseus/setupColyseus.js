import { Server as ColyseusServer, createNodeMatchmakingMiddleware, matchMaker } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { setTransport } from '@colyseus/core/Transport';
import { TankColyseusRoom } from './TankRoom.js';

let gameServer = null;

export async function setupColyseus(app, httpServer) {
  // 1. Mount Colyseus matchmaking HTTP middleware on Express (avoids handling /socket.io requests)
  app.use((req, res, next) => {
    if (req.url.startsWith('/socket.io')) return next();
    return createNodeMatchmakingMiddleware()(req, res, next);
  });

  // 2. Attach WebSocketTransport to existing HTTP server, filtering out Socket.IO upgrade events
  const transport = new WebSocketTransport({ noServer: true });
  setTransport(transport);
  transport.attachToServer(httpServer, {
    filter: (req) => !req.url.startsWith('/socket.io')
  });

  gameServer = new ColyseusServer({ transport });

  // 3. Define Tank room with matchmaking filtered by roomCode
  gameServer
    .define('tank_room', TankColyseusRoom)
    .filterBy(['roomCode'])
    .enableRealtimeListing();

  await matchMaker.accept();

  // 4. REST endpoint for tank lobby room listing
  app.get('/api/tank/rooms', async (req, res) => {
    try {
      const rooms = await matchMaker.query({ name: 'tank_room' });
      const available = rooms
        .filter((r) => r.metadata && r.metadata.status === 'LOBBY')
        .map((r) => r.metadata);
      res.json({ ok: true, rooms: available });
    } catch (err) {
      console.error('Failed to query tank rooms:', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  console.log('⚡ Colyseus Server initialized successfully on shared HTTP server (tank_room defined).');
  return gameServer;
}
