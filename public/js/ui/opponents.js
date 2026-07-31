function renderOpponentBoards(state) {
  let container = document.getElementById('opponents-boards-container');
  let section = document.getElementById('opponents-section');
  if (!container || !section) return;

  if (!state || !state.players || state.players.length <= 1 || !state.isGameStarted) {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';

  let opIdx = 0;
  let bgColors = [
    'rgba(251, 191, 36, 0.15)',
    'rgba(248, 113, 113, 0.15)',
    'rgba(45, 212, 191, 0.15)',
    'rgba(56, 189, 248, 0.15)'
  ];
  let borderColors = [
    'rgba(251, 191, 36, 0.3)',
    'rgba(248, 113, 113, 0.3)',
    'rgba(45, 212, 191, 0.3)',
    'rgba(56, 189, 248, 0.3)'
  ];
  let solidColors = [
    'rgb(251, 191, 36)',
    'rgb(248, 113, 113)',
    'rgb(45, 212, 191)',
    'rgb(56, 189, 248)'
  ];

  let currentActiveSockets = new Set();

  state.players.forEach((p, idx) => {
    if (idx === myPlayerIndex) return; // skip self
    if (!p.socketId) return; // skip empty slots

    currentActiveSockets.add(p.socketId);

    let cardId = 'opponent-board-' + p.socketId;
    let card = document.getElementById(cardId);
    
    let themeIdx = opIdx % 4;
    let themeColor = solidColors[themeIdx];

    if (!card) {
      card = document.createElement('div');
      card.className = 'opponent-board-card';
      card.id = cardId;
      card.style.background = bgColors[themeIdx];
      card.style.borderColor = borderColors[themeIdx];

      let nameEl = document.createElement('div');
      nameEl.className = 'ob-name';
      nameEl.style.color = themeColor;
      card.appendChild(nameEl);

      let scoreEl = document.createElement('div');
      scoreEl.className = 'ob-score';
      scoreEl.style.color = themeColor;
      card.appendChild(scoreEl);

      let miniGrid = document.createElement('div');
      miniGrid.className = 'mini-grid-9x9';
      
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          let cell = document.createElement('div');
          cell.className = 'mini-cell';
          cell.id = `cell-${p.socketId}-${r}-${c}`;
          miniGrid.appendChild(cell);
        }
      }
      
      let svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svgLayer.setAttribute('width', '100%');
      svgLayer.setAttribute('height', '100%');
      svgLayer.style.position = 'absolute';
      svgLayer.style.top = '0';
      svgLayer.style.left = '0';
      svgLayer.style.pointerEvents = 'none';
      svgLayer.className = 'ob-svg-layer';
      miniGrid.appendChild(svgLayer);

      card.appendChild(miniGrid);
      container.appendChild(card);
    }

    // UPDATE
    let nameEl = card.querySelector('.ob-name');
    if (nameEl) nameEl.textContent = p.name || `P${idx + 1}`;
    
    let scoreEl = card.querySelector('.ob-score');
    if (scoreEl) scoreEl.textContent = p.score || 0;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        let cell = document.getElementById(`cell-${p.socketId}-${r}-${c}`);
        if (cell) {
          let val = (p.board && p.board[r]) ? p.board[r][c] : null;
          if (val !== null) {
            if (cell.textContent != val) cell.textContent = val;
            cell.style.background = themeColor;
            cell.style.color = '#000';
          } else {
            if (cell.textContent != "") cell.textContent = '';
            cell.style.background = '#fff';
            cell.style.color = '#000';
          }
        }
      }
    }

    // UPDATE SVG LINES
    let svgLayer = card.querySelector('.ob-svg-layer');
    if (svgLayer) {
      svgLayer.innerHTML = ''; // clear old lines efficiently
      if (p.matchedLines && p.matchedLines.length > 0) {
        p.matchedLines.forEach(line => {
          let dc = Math.sign(line.end.c - line.start.c);
          let dr = Math.sign(line.end.r - line.start.r);
          
          let startX = 1 + line.start.c * 16 + 7.5 - dc * 7.5;
          let startY = 1 + line.start.r * 16 + 7.5 - dr * 7.5;
          let endX = 1 + line.end.c * 16 + 7.5 + dc * 7.5;
          let endY = 1 + line.end.r * 16 + 7.5 + dr * 7.5;

          let svgLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
          svgLine.setAttribute('x1', startX);
          svgLine.setAttribute('y1', startY);
          svgLine.setAttribute('x2', endX);
          svgLine.setAttribute('y2', endY);
          svgLine.setAttribute('stroke', '#000');
          svgLine.setAttribute('stroke-width', '1.5');
          svgLayer.appendChild(svgLine);
        });
      }
    }

    opIdx++;
  });

  // Remove disconnected/stale boards
  Array.from(container.children).forEach(card => {
    let sId = card.id.replace('opponent-board-', '');
    if (!currentActiveSockets.has(sId)) {
      card.remove();
    }
  });
}
