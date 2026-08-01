import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerSocketHandlers } from './src/network/socketHandler.js';
import { connectRedis, disconnectRedis } from './src/config/redis.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;

function logStartupBanner(port) {
  console.log(`\n==================================================`);
  console.log(`🚀 PONOS MATRIX BATTLE STARTED`);
  console.log(`📡 URL: http://localhost:${port}`);
  console.log(`==================================================\n`);
}

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server);
registerSocketHandlers(io);

async function startServer() {
  try {
    await connectRedis();
    server.listen(PORT, () => logStartupBanner(PORT));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

async function gracefulShutdown() {
  console.log('\nShutting down gracefully...');
  io.close();
  await new Promise((resolve) => server.close(resolve));
  await disconnectRedis();
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

startServer();
