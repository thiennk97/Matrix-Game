import crypto from 'crypto';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS = 2;

// In-memory store for active Caro rooms
const caroRooms = new Map();
// Active turn timers per roomCode
const caroTimers = new Map();

function generateCaroRoomCode() {
  let code = 'CR';
  for (let i = 0; i < 4; i++) {
    code += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return code;
}

export function listOpenCaroRooms() {
  const openRooms = [];
  for (const room of caroRooms.values()) {
    if (room.status === 'LOBBY' || room.status === 'PLAYING') {
      const host = room.players.find((p) => p.id === room.hostPlayerId);
      openRooms.push({
        roomCode: room.roomCode,
        roomName: room.roomName || `Phòng của ${host?.name || 'Chủ phòng'}`,
        hostName: host?.name || 'Host',
        playerCount: room.players.length,
        maxPlayers: MAX_PLAYERS,
        spectatorCount: room.spectators.length,
        boardSize: room.boardSize,
        turnTimeLimit: room.turnTimeLimit,
        rule: room.rule,
        status: room.status,
        createdAt: room.createdAt
      });
    }
  }
  return openRooms.sort((a, b) => b.createdAt - a.createdAt);
}

export function getCaroRoom(roomCode) {
  if (!roomCode) return null;
  return caroRooms.get(roomCode.toUpperCase().trim()) || null;
}

function createEmptyBoard(size) {
  const board = [];
  for (let r = 0; r < size; r++) {
    board.push(new Array(size).fill(null));
  }
  return board;
}

export function createCaroRoom(playerName, socketId, options = {}) {
  let roomCode;
  for (let i = 0; i < 10; i++) {
    const candidate = generateCaroRoomCode();
    if (!caroRooms.has(candidate)) {
      roomCode = candidate;
      break;
    }
  }
  if (!roomCode) {
    roomCode = 'CR' + Date.now().toString(36).toUpperCase().slice(-4);
  }

  const hostPlayerId = crypto.randomUUID();
  const hostPlayer = {
    id: hostPlayerId,
    socketId,
    name: playerName.trim().slice(0, 20),
    symbol: 'X', // Host starts as X (goes first)
    ready: true,
    wins: 0,
    connected: true
  };

  const boardSize = options.boardSize === 19 ? 19 : 15;
  const turnTimeLimit = [15, 30, 45, 60].includes(Number(options.turnTimeLimit))
    ? Number(options.turnTimeLimit)
    : 30; // default 30s
  const rule = options.rule === 'caro_vn' ? 'caro_vn' : 'standard'; // 'standard' (5 in a row) or 'caro_vn' (block 2 ends not win)

  const room = {
    roomCode,
    roomName: options.roomName?.trim().slice(0, 30) || `Phòng của ${hostPlayer.name}`,
    hostPlayerId,
    status: 'LOBBY',
    players: [hostPlayer],
    spectators: [],
    boardSize,
    turnTimeLimit,
    rule,
    board: createEmptyBoard(boardSize),
    currentTurn: 'X',
    timeRemaining: turnTimeLimit,
    turnStartTime: null,
    history: [],
    lastMove: null,
    winner: null,
    winningLine: [],
    winReason: null,
    drawOffer: null,
    createdAt: Date.now()
  };

  caroRooms.set(roomCode, room);
  return { room, playerId: hostPlayerId, player: hostPlayer };
}

export function joinCaroRoom(roomCode, playerName, socketId) {
  roomCode = roomCode.toUpperCase().trim();
  const room = caroRooms.get(roomCode);

  if (!room) {
    return { error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại hoặc đã giải tán.' };
  }

  // If room is already full with 2 players, join as spectator
  if (room.players.length >= MAX_PLAYERS) {
    const spectatorId = crypto.randomUUID();
    const spectator = {
      id: spectatorId,
      socketId,
      name: playerName.trim().slice(0, 20),
      isSpectator: true
    };
    room.spectators.push(spectator);
    return { room, playerId: spectatorId, player: spectator, isSpectator: true };
  }

  // Join as Player 2 (O)
  const existingSymbol = room.players[0].symbol;
  const newSymbol = existingSymbol === 'X' ? 'O' : 'X';
  const playerId = crypto.randomUUID();
  const newPlayer = {
    id: playerId,
    socketId,
    name: playerName.trim().slice(0, 20),
    symbol: newSymbol,
    ready: false,
    wins: 0,
    connected: true
  };

  room.players.push(newPlayer);
  return { room, playerId, player: newPlayer, isSpectator: false };
}

export function toggleCaroReady(roomCode, socketId) {
  const room = getCaroRoom(roomCode);
  if (!room) return { error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' };
  if (room.status !== 'LOBBY') {
    return { error: 'INVALID_STATE', message: 'Trận đấu đang diễn ra.' };
  }

  const player = room.players.find((p) => p.socketId === socketId);
  if (!player) return { error: 'NOT_IN_ROOM', message: 'Bạn không ở trong phòng này.' };

  // Host is always ready; guests toggle ready
  if (player.id !== room.hostPlayerId) {
    player.ready = !player.ready;
  }
  return { room };
}

export function switchCaroSymbol(roomCode, socketId) {
  const room = getCaroRoom(roomCode);
  if (!room) return { error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' };
  if (room.status !== 'LOBBY') {
    return { error: 'INVALID_STATE', message: 'Chỉ có thể đổi cờ khi ở sảnh chờ.' };
  }

  if (room.players.length !== 2) {
    // If alone, just flip
    const player = room.players.find((p) => p.socketId === socketId);
    if (player) {
      player.symbol = player.symbol === 'X' ? 'O' : 'X';
      return { room };
    }
    return { error: 'NOT_IN_ROOM', message: 'Không tìm thấy người chơi.' };
  }

  // Swap symbols between the two players
  const p1 = room.players[0];
  const p2 = room.players[1];
  const temp = p1.symbol;
  p1.symbol = p2.symbol;
  p2.symbol = temp;
  p1.ready = p1.id === room.hostPlayerId;
  p2.ready = false;

  return { room };
}

export function startCaroGame(roomCode, socketId, onTimeoutCallback) {
  const room = getCaroRoom(roomCode);
  if (!room) return { error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' };
  if (room.status !== 'LOBBY') {
    return { error: 'ALREADY_STARTED', message: 'Trận đấu đã bắt đầu.' };
  }

  const host = room.players.find((p) => p.id === room.hostPlayerId);
  if (!host || host.socketId !== socketId) {
    return { error: 'NOT_HOST', message: 'Chỉ chủ phòng mới có quyền bắt đầu trận đấu.' };
  }

  if (room.players.length < 2) {
    return { error: 'NOT_ENOUGH_PLAYERS', message: 'Cần đủ 2 người chơi để bắt đầu đấu online.' };
  }

  const guest = room.players.find((p) => p.id !== room.hostPlayerId);
  if (!guest?.ready) {
    return { error: 'NOT_READY', message: 'Đối thủ chưa bấm sẵn sàng!' };
  }

  room.status = 'PLAYING';
  room.board = createEmptyBoard(room.boardSize);
  room.currentTurn = 'X'; // X always moves first
  room.history = [];
  room.lastMove = null;
  room.winner = null;
  room.winningLine = [];
  room.winReason = null;
  room.drawOffer = null;
  room.timeRemaining = room.turnTimeLimit;
  room.turnStartTime = Date.now();

  startTurnTimer(roomCode, onTimeoutCallback);
  return { room };
}

export function placeStone(roomCode, socketId, row, col, onTimeoutCallback) {
  const room = getCaroRoom(roomCode);
  if (!room) return { error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' };
  if (room.status !== 'PLAYING') {
    return { error: 'GAME_NOT_PLAYING', message: 'Trận đấu chưa bắt đầu hoặc đã kết thúc.' };
  }

  const player = room.players.find((p) => p.socketId === socketId);
  if (!player) {
    return { error: 'NOT_A_PLAYER', message: 'Chỉ người chơi trong phòng mới có thể đánh cờ.' };
  }

  if (player.symbol !== room.currentTurn) {
    return { error: 'NOT_YOUR_TURN', message: 'Chưa đến lượt của bạn!' };
  }

  row = Number(row);
  col = Number(col);

  if (row < 0 || row >= room.boardSize || col < 0 || col >= room.boardSize) {
    return { error: 'OUT_OF_BOUNDS', message: 'Vị trí cờ nằm ngoài bàn cờ.' };
  }

  if (room.board[row][col] !== null) {
    return { error: 'CELL_OCCUPIED', message: 'Ô này đã có quân cờ!' };
  }

  // Place stone
  room.board[row][col] = player.symbol;
  const move = {
    step: room.history.length + 1,
    row,
    col,
    symbol: player.symbol,
    playerName: player.name,
    timestamp: Date.now()
  };
  room.history.push(move);
  room.lastMove = move;
  room.drawOffer = null; // any move cancels pending draw offer

  // Check win
  const winResult = checkCaroWin(room.board, row, col, player.symbol, room.rule);
  if (winResult.win) {
    clearTurnTimer(roomCode);
    room.status = 'FINISHED';
    room.winner = player.symbol;
    room.winningLine = winResult.winningLine;
    room.winReason = 'five_in_a_row';
    player.wins += 1;
    return { room, isGameOver: true, winner: player.symbol, winningLine: winResult.winningLine };
  }

  // Check board full (draw)
  if (room.history.length >= room.boardSize * room.boardSize) {
    clearTurnTimer(roomCode);
    room.status = 'FINISHED';
    room.winner = 'DRAW';
    room.winReason = 'board_full';
    return { room, isGameOver: true, winner: 'DRAW' };
  }

  // Switch turn
  room.currentTurn = room.currentTurn === 'X' ? 'O' : 'X';
  room.timeRemaining = room.turnTimeLimit;
  room.turnStartTime = Date.now();

  startTurnTimer(roomCode, onTimeoutCallback);
  return { room, isGameOver: false };
}

export function checkCaroWin(board, row, col, symbol, rule = 'standard') {
  const size = board.length;
  const directions = [
    { dr: 0, dc: 1 },  // Horizontal
    { dr: 1, dc: 0 },  // Vertical
    { dr: 1, dc: 1 },  // Diagonal down-right \
    { dr: 1, dc: -1 }  // Diagonal up-right /
  ];

  for (const { dr, dc } of directions) {
    const line = [{ row, col }];

    // Forward direction
    let fCount = 0;
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === symbol) {
      line.push({ row: r, col: c });
      fCount++;
      r += dr;
      c += dc;
    }
    const end1Row = r;
    const end1Col = c;

    // Backward direction
    let bCount = 0;
    r = row - dr;
    c = col - dc;
    while (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === symbol) {
      line.unshift({ row: r, col: c });
      bCount++;
      r -= dr;
      c -= dc;
    }
    const end2Row = r;
    const end2Col = c;

    const totalConsecutive = 1 + fCount + bCount;

    if (rule === 'standard') {
      if (totalConsecutive >= 5) {
        return { win: true, winningLine: line.slice(0, 5) };
      }
    } else if (rule === 'caro_vn') {
      // Vietnamese Caro Rule: 5 in a row, but if BOTH ends are blocked by opponent, it is NOT a win.
      if (totalConsecutive >= 5) {
        const opponent = symbol === 'X' ? 'O' : 'X';

        const isBlockedEnd1 =
          end1Row >= 0 && end1Row < size && end1Col >= 0 && end1Col < size && board[end1Row][end1Col] === opponent;
        const isBlockedEnd2 =
          end2Row >= 0 && end2Row < size && end2Col >= 0 && end2Col < size && board[end2Row][end2Col] === opponent;

        // If blocked by opponent at both ends -> continue game
        if (isBlockedEnd1 && isBlockedEnd2) {
          continue;
        }

        return { win: true, winningLine: line.slice(0, 5) };
      }
    }
  }

  return { win: false, winningLine: [] };
}

export function surrenderGame(roomCode, socketId) {
  const room = getCaroRoom(roomCode);
  if (!room || room.status !== 'PLAYING') {
    return { error: 'INVALID_STATE', message: 'Trận đấu không đang diễn ra.' };
  }

  const surrenderingPlayer = room.players.find((p) => p.socketId === socketId);
  if (!surrenderingPlayer) {
    return { error: 'NOT_A_PLAYER', message: 'Bạn không phải là người chơi trong phòng.' };
  }

  const winningPlayer = room.players.find((p) => p.id !== surrenderingPlayer.id);
  clearTurnTimer(roomCode);

  room.status = 'FINISHED';
  room.winner = winningPlayer ? winningPlayer.symbol : null;
  room.winReason = 'surrender';
  if (winningPlayer) winningPlayer.wins += 1;

  return { room, surrenderingPlayer, winningPlayer };
}

export function offerDraw(roomCode, socketId) {
  const room = getCaroRoom(roomCode);
  if (!room || room.status !== 'PLAYING') {
    return { error: 'INVALID_STATE', message: 'Trận đấu không đang diễn ra.' };
  }

  const player = room.players.find((p) => p.socketId === socketId);
  if (!player) return { error: 'NOT_A_PLAYER', message: 'Bạn không phải người chơi.' };

  room.drawOffer = { fromPlayerId: player.id, fromPlayerName: player.name };
  return { room, drawOffer: room.drawOffer };
}

export function respondDraw(roomCode, socketId, accept) {
  const room = getCaroRoom(roomCode);
  if (!room || room.status !== 'PLAYING' || !room.drawOffer) {
    return { error: 'NO_DRAW_OFFER', message: 'Không có lời mời cầu hòa nào đang chờ.' };
  }

  const player = room.players.find((p) => p.socketId === socketId);
  if (!player || player.id === room.drawOffer.fromPlayerId) {
    return { error: 'INVALID_ACTION', message: 'Bạn không thể tự chấp nhận lời cầu hòa của mình.' };
  }

  if (accept) {
    clearTurnTimer(roomCode);
    room.status = 'FINISHED';
    room.winner = 'DRAW';
    room.winReason = 'agreement';
    room.drawOffer = null;
    return { room, drawAccepted: true };
  } else {
    room.drawOffer = null;
    return { room, drawAccepted: false };
  }
}

export function resetCaroRematch(roomCode) {
  const room = getCaroRoom(roomCode);
  if (!room) return null;

  clearTurnTimer(roomCode);
  room.status = 'LOBBY';
  room.board = createEmptyBoard(room.boardSize);
  room.currentTurn = 'X';
  room.history = [];
  room.lastMove = null;
  room.winner = null;
  room.winningLine = [];
  room.winReason = null;
  room.drawOffer = null;
  room.timeRemaining = room.turnTimeLimit;

  // Alternate who plays X in the next game for fairness!
  if (room.players.length === 2) {
    const p1 = room.players[0];
    const p2 = room.players[1];
    const temp = p1.symbol;
    p1.symbol = p2.symbol;
    p2.symbol = temp;
  }

  room.players.forEach((p) => {
    p.ready = p.id === room.hostPlayerId;
  });

  return room;
}

export function leaveCaroRoom(socketId) {
  for (const [roomCode, room] of caroRooms.entries()) {
    // Check spectators
    const specIdx = room.spectators.findIndex((s) => s.socketId === socketId);
    if (specIdx !== -1) {
      room.spectators.splice(specIdx, 1);
      return { roomCode, room, isSpectator: true };
    }

    // Check players
    const pIdx = room.players.findIndex((p) => p.socketId === socketId);
    if (pIdx !== -1) {
      const removedPlayer = room.players[pIdx];
      room.players.splice(pIdx, 1);

      clearTurnTimer(roomCode);

      if (room.players.length === 0) {
        caroRooms.delete(roomCode);
        return { roomCode, roomDeleted: true };
      }

      // If playing and a player leaves, other player wins by default
      if (room.status === 'PLAYING') {
        const remaining = room.players[0];
        room.status = 'FINISHED';
        room.winner = remaining.symbol;
        room.winReason = 'opponent_left';
        remaining.wins += 1;
      }

      // Reassign host if host left
      if (removedPlayer.id === room.hostPlayerId && room.players.length > 0) {
        room.hostPlayerId = room.players[0].id;
        room.players[0].ready = true;
      }

      return { roomCode, room, removedPlayer };
    }
  }
  return null;
}

function startTurnTimer(roomCode, onTimeoutCallback) {
  clearTurnTimer(roomCode);
  const room = getCaroRoom(roomCode);
  if (!room || room.turnTimeLimit <= 0) return;

  const timer = setInterval(() => {
    const r = getCaroRoom(roomCode);
    if (!r || r.status !== 'PLAYING') {
      clearTurnTimer(roomCode);
      return;
    }

    r.timeRemaining -= 1;

    if (r.timeRemaining <= 0) {
      clearTurnTimer(roomCode);
      // Current turn player timed out -> opponent wins
      const timedOutSymbol = r.currentTurn;
      const winnerSymbol = timedOutSymbol === 'X' ? 'O' : 'X';
      const winnerPlayer = r.players.find((p) => p.symbol === winnerSymbol);

      r.status = 'FINISHED';
      r.winner = winnerSymbol;
      r.winReason = 'timeout';
      if (winnerPlayer) winnerPlayer.wins += 1;

      if (typeof onTimeoutCallback === 'function') {
        onTimeoutCallback(r, timedOutSymbol, winnerSymbol);
      }
    }
  }, 1000);

  caroTimers.set(roomCode, timer);
}

function clearTurnTimer(roomCode) {
  if (caroTimers.has(roomCode)) {
    clearInterval(caroTimers.get(roomCode));
    caroTimers.delete(roomCode);
  }
}
