try {
  const session = JSON.parse(localStorage.getItem('matrix-game-session'));
  if (session?.roomCode && session?.playerId) {
    document.documentElement.classList.add('restoring-room');
  }
} catch (error) {
  localStorage.removeItem('matrix-game-session');
}
