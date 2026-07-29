const { io } = require("socket.io-client");
const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Connected to server! ID:", socket.id);
  socket.emit("join_room", { roomCode: "MB-9999", playerName: "Thien" });
});

socket.on("error_message", (msg) => {
  console.log("SERVER ERROR TOAST:", msg);
});

socket.on("assigned_role", (data) => {
  console.log("Assigned role:", data);
  socket.emit("toggle_ready", { roomCode: "MB-9999" });
});

socket.on("room_state_update", (state) => {
  console.log(`Room State: P1 Ready=${state.p1Ready}, P2 Ready=${state.p2Ready}`);
  if (state.p1Ready && !state.isGameStarted) {
    console.log("Starting game...");
    socket.emit("start_game", { roomCode: "MB-9999" });
  }
});

socket.on("game_started", () => {
  console.log("Game started! Emitting make_move slot 0...");
  socket.emit("make_move", { roomCode: "MB-9999", slotIdx: 0 });
  
  setTimeout(() => {
    console.log("Emitting make_move slot 0 again to see if it rejects...");
    socket.emit("make_move", { roomCode: "MB-9999", slotIdx: 0 });
  }, 500);
});

setTimeout(() => {
  console.log("Timeout, exiting.");
  process.exit(0);
}, 2000);
