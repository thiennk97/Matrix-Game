import { ROOM_STATUS } from '../config/constants.js';
import { createEmptyBoard, generateFairPieceDeck } from './gameLogic.js';

function resetPlayerForLobby(player, hostPlayerId) {
  return {
    ...player,
    abandoned: false,
    board: createEmptyBoard(),
    hasPlacedThisRound: false,
    matchedLines: [],
    ready: player.id === hostPlayerId,
    score: 0
  };
}

function prepareRoomForRematch(room, playerId, now = Date.now()) {
  const requester = room.players.find((player) => player.id === playerId && !player.abandoned);
  if (!requester) {
    return {
      error: 'PLAYER_NOT_FOUND',
      message: 'Bạn không còn ở trong phòng này.'
    };
  }

  if (room.status === ROOM_STATUS.LOBBY) {
    return { room, playerIndex: requester.seatIndex };
  }
  if (room.status !== ROOM_STATUS.FINISHED) {
    return { error: 'GAME_IN_PROGRESS', message: 'Trận đấu vẫn đang diễn ra.' };
  }

  room.players = room.players.filter((player) => !player.abandoned);
  const currentHost = room.players.find((player) => player.id === room.hostPlayerId);
  if (!currentHost) room.hostPlayerId = requester.id;

  room.players = room.players.map((player) => resetPlayerForLobby(player, room.hostPlayerId));
  room.status = ROOM_STATUS.LOBBY;
  room.sharedPieceDeck = generateFairPieceDeck();
  room.turn = 0;
  room.turnEndsAt = null;
  room.remainingTurnMs = null;
  room.updatedAt = now;
  room.stateVersion++;

  return { room, playerIndex: requester.seatIndex };
}

export { prepareRoomForRematch };
