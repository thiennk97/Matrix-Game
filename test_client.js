const { io } = require("socket.io-client");
const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Connected:", socket.id);
  socket.emit("join_room", { roomCode: "TEST-1", playerName: "P1" });
});

socket.on("assigned_role", (data) => {
  console.log("Assigned Role:", data);
  socket.emit("toggle_ready", { roomCode: "TEST-1" });
});

socket.on("room_state_update", (state) => {
  console.log("Room state:", state.p1Ready, state.p2Ready);
  if (state.p1Ready && !state.isGameStarted) {
    console.log("Starting game...");
    socket.emit("start_game", { roomCode: "TEST-1" });
  }
});

socket.on("game_started", () => {
  console.log("Game started! Making move...");
  socket.emit("make_move", { roomCode: "TEST-1", slotIdx: 0 });
});

socket.on("error_message", (msg) => {
  console.error("Error:", msg);
});

setTimeout(() => {
  socket.disconnect();
  process.exit(0);
}, 2000);
