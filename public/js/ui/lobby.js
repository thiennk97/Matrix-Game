function showToast(msg) {
  const bannerEl = document.getElementById('lobby-status-banner');
  if (bannerEl) bannerEl.innerHTML = msg;
}

function updateLobbyUI(state) {
  let myPlayerIndex = state.players.findIndex(p => p.socketId === socket.id);
  let myPlayerData = myPlayerIndex >= 0 && myPlayerIndex < state.players.length ? state.players[myPlayerIndex] : null;

  document.getElementById('current-room-code-text').textContent = state.roomCode;

  for (let i = 0; i < 8; i++) {
    let nameEl = document.getElementById(`lobby-p${i+1}-name`);
    let readyEl = document.getElementById(`lobby-p${i+1}-ready`);
    let cardEl = document.getElementById(`card-p${i+1}-slot`);
    
    if (!nameEl || !readyEl) continue;

    if (i < state.players.length) {
      if (cardEl) cardEl.style.display = 'flex';
      let p = state.players[i];
      nameEl.textContent = '👤 ' + p.name;

      if (i === 0) {
        readyEl.style.display = 'none';
      } else {
        readyEl.style.display = 'inline-block';
        if (p.ready) {
          readyEl.className = 'ready-tag is-ready';
          readyEl.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        } else {
          readyEl.className = 'ready-tag not-ready';
          readyEl.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 15 15"></polyline></svg>';
        }
      }
    } else {
      if (cardEl) cardEl.style.display = 'none';
      nameEl.textContent = `👤 Chờ P${i+1} vào...`;
      readyEl.className = 'ready-tag not-ready';
      readyEl.textContent = '—';
    }
  }

  let btnStart = document.getElementById('btn-start-game-server');
  let btnReady = document.getElementById('btn-toggle-ready');
  
  let timerSettingGroup = document.getElementById('timer-setting-group');
  if (myPlayerIndex === 0) {
    btnReady.style.display = 'none';
    if (timerSettingGroup) timerSettingGroup.style.display = 'flex';
  } else {
    btnReady.style.display = 'inline-flex';
    if (timerSettingGroup) timerSettingGroup.style.display = 'none';
    if (myPlayerData && myPlayerData.ready) {
      btnReady.textContent = '❌ HỦY SẴN SÀNG';
      btnReady.className = 'btn';
      btnReady.style.background = 'var(--matchbox-red)';
      btnReady.style.color = '#fff';
      btnReady.style.borderColor = 'var(--matchbox-red)';
    } else {
      btnReady.textContent = '⚡ SẴN SÀNG';
      btnReady.className = 'btn btn-green';
      btnReady.style.background = '';
      btnReady.style.color = '';
      btnReady.style.borderColor = '';
    }
  }

  let nonHostPlayers = state.players.filter((p, idx) => idx !== 0);
  let allReady = state.players.length >= 2 && nonHostPlayers.every(p => p.ready);
  let allConnected = state.players.every(p => p.connected);

  if (myPlayerIndex === 0) {
    btnStart.style.display = "inline-flex";
    if (allReady && allConnected) {
      btnStart.disabled = false;
      btnStart.style.opacity = "1";
      btnStart.textContent = "🚀 BẮT ĐẦU GAME (HOST)";
      showToast("✨ Tất cả đã sẵn sàng!<br>Host bấm nút bên dưới để Bắt Đầu!");
    } else {
      btnStart.disabled = false;
      btnStart.style.opacity = "0.9";
      btnStart.textContent = "🚀 BẮT ĐẦU GAME";
      if (state.players.length < 2) {
        showToast("⏳ Đang chờ người chơi khác tham gia phòng...<br>📋 Chia sẻ mã phòng để mời bạn bè!");
      } else {
        let notReady = nonHostPlayers.filter(p => !p.ready).map(p => p.name);
        if (notReady.length > 0) {
          showToast("💡 Chờ sẵn sàng: <strong>" + notReady.join(', ') + "</strong>");
        }
      }
    }
  } else {
    btnStart.style.display = "none";
    if (allReady) {
      showToast("✨ Tất cả đã sẵn sàng!<br>Đang chờ Host bấm Bắt đầu...");
    } else if (myPlayerData && myPlayerData.ready) {
      showToast("✅ Bạn đã sẵn sàng! Đang chờ người chơi khác...");
    } else {
      showToast("💡 Nhấn <strong>⚡ SẴN SÀNG</strong> khi bạn đã chuẩn bị xong!");
    }
  }
}
