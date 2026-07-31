function renderOpponentBoards(state) {
  let container = document.getElementById('opponents-boards-container');
  let section = document.getElementById('opponents-section');
  if (!container || !section) return;

  if (!state || !state.players || state.players.length <= 1 || !state.isGameStarted) {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';
  container.innerHTML = '';

  state.players.forEach((p, idx) => {
    if (idx === myPlayerIndex) return; // skip self

    let card = document.createElement('div');
    card.className = 'opponent-board-card';
    if (p.socketId) card.id = 'opponent-board-' + p.socketId;

    let color = PLAYER_COLORS[idx] || '#a8a29e';

    let nameEl = document.createElement('div');
    nameEl.className = 'ob-name';
    nameEl.style.color = color;
    nameEl.textContent = p.name || `P${idx + 1}`;
    card.appendChild(nameEl);

    let scoreEl = document.createElement('div');
    scoreEl.className = 'ob-score';
    scoreEl.style.color = color;
    scoreEl.textContent = p.score || 0;
    card.appendChild(scoreEl);

    // Mini 9x9 grid
    let miniGrid = document.createElement('div');
    miniGrid.className = 'mini-grid-9x9';

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        let cell = document.createElement('div');
        cell.className = 'mini-cell';
        let val = (p.board && p.board[r]) ? p.board[r][c] : null;
        if (val !== null) {
          cell.textContent = val;
          cell.style.background = '#facc15';
        }
        miniGrid.appendChild(cell);
      }
    }

    card.appendChild(miniGrid);
    container.appendChild(card);
  });
}
