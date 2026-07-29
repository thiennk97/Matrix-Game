const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { registerSocketHandlers } = require('./src/socketHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 4000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Register socket event handlers
registerSocketHandlers(io);

// Start server listening
server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 MATRIX BATTLE REALTIME SERVER ENGINE STARTED`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`⚙️  Node.js In-Memory Multi-Room Engine Ready`);
  console.log(`==================================================\n`);
});
