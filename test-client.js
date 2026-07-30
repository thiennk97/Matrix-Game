const io = require('socket.io-client');
const socket = io('http://localhost:4000');

socket.on('connect', () => {
  console.log('Connected! Emitting join_room...');
  socket.emit('join_room', { roomCode: 'GLOBAL', playerName: 'Tester' });
});

socket.on('assigned_role', (data) => {
  console.log('assigned_role:', data);
});

socket.on('room_state_update', (state) => {
  console.log('room_state_update received.');
  process.exit(0);
});

socket.on('error_message', (msg) => {
  console.error('ERROR MESSAGE FROM SERVER:', msg);
  process.exit(1);
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});
