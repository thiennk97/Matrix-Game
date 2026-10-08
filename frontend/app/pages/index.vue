<template>
  <div class="game-portal-view">
    <!-- Portal Hero Header -->
    <div class="portal-hero">
      <div class="portal-badge">
        <span class="pulse-light"></span> ARCADE & STRATEGY PLATFORM
      </div>
      <h1 class="portal-title">CHỌN TRÒ CHƠI BẮT ĐẦU</h1>
      <p class="portal-subtitle">
        Chọn một trò chơi bên dưới để vào sảnh chờ, xem danh sách phòng hoặc tạo phòng thi đấu
      </p>
    </div>

    <!-- 3 Game Selection Cards -->
    <div class="portal-games-grid">
      <!-- Game 1: Matrix Battle -->
      <NuxtLink to="/matrix" class="portal-game-card matrix-card">
        <div class="card-glow-bg matrix-glow"></div>
        <div class="card-header-row">
          <div class="game-badge matrix-badge">CHIẾN THUẬT REALTIME</div>
          <span class="player-capacity">1–8 Người</span>
        </div>

        <div class="card-visual-center">
          <div class="visual-icon-box matrix-box">
          <svg class="matrix-icon" viewBox="0 0 52 52" aria-hidden="true">
            <rect x="4" y="4" width="12" height="12" rx="3" fill="#00e5ff" opacity="1" />
            <rect x="19" y="4" width="12" height="12" rx="3" fill="#ff00ff" opacity="0.55" />
            <rect x="34" y="4" width="12" height="12" rx="3" fill="#ffee00" opacity="0.9" />
            <rect x="4" y="19" width="12" height="12" rx="3" fill="#ffee00" opacity="0.6" />
            <rect x="19" y="19" width="12" height="12" rx="3" fill="#00e5ff" opacity="1" />
            <rect x="34" y="19" width="12" height="12" rx="3" fill="#ff3c00" opacity="0.85" />
            <rect x="4" y="34" width="12" height="12" rx="3" fill="#ff3c00" opacity="0.9" />
            <rect x="19" y="34" width="12" height="12" rx="3" fill="#ffee00" opacity="0.7" />
            <rect x="34" y="34" width="12" height="12" rx="3" fill="#00e5ff" opacity="0.55" />
          </svg>
        </div>
          <h2 class="game-title">MATRIX BATTLE</h2>
          <p class="game-summary">
            Đấu trí xếp số theo hàng, cột và đường chéo trên bàn cờ 9x9. Tính điểm combo liên hoàn, phòng chơi Redis hỗ trợ kết nối lại không mất ván.
          </p>
        </div>

        <div class="card-tags-list">
          <span class="portal-tag">9x9 Matrix</span>
          <span class="portal-tag">Xếp số đối kháng</span>
          <span class="portal-tag">Bảng xếp hạng</span>
        </div>

        <div class="card-footer-action">
          <span class="enter-btn-text matrix-btn-text">
            VÀO SẢNH MATRIX <LucideArrowRight class="icon" />
          </span>
        </div>
      </NuxtLink>

      <!-- Game 2: Battle City 1990 -->
      <NuxtLink to="/tank" class="portal-game-card tank-card">
        <div class="card-glow-bg tank-glow"></div>
        <div class="card-header-row">
          <div class="game-badge tank-badge">ĐỐI KHÁNG 2 ĐỘI</div>
          <span class="player-capacity">1–4 Người</span>
        </div>

        <div class="card-visual-center">
          <div class="visual-icon-box tank-box">
            <div class="tank-duel" aria-hidden="true">
              <TankIcon team="blue" :size="36" class="duel-tank blue" />
              <span class="duel-spark"></span>
              <TankIcon team="red" :size="36" class="duel-tank red" />
            </div>
          </div>
          <h2 class="game-title">BATTLE CITY 1990</h2>
          <p class="game-summary">
            Huyền thoại xe tăng máy bấm đầu đĩa DVD nay nâng cấp thành đối kháng 2 đội (Đội Xanh vs Đội Đỏ). Bảo vệ đại bàng nhà mình và bắn nổ đại bàng đối phương!
          </p>
        </div>

        <div class="card-tags-list">
          <span class="portal-tag">PvP 2 Đội</span>
          <span class="portal-tag">Bảo vệ 2 Đại Bàng</span>
          <span class="portal-tag">NES 8-bit Audio</span>
        </div>

        <div class="card-footer-action">
          <span class="enter-btn-text tank-btn-text">
            VÀO SẢNH BẮN TANK <LucideArrowRight class="icon" />
          </span>
        </div>
      </NuxtLink>

      <!-- Game 3: Cờ Caro Online -->
      <NuxtLink to="/caro" class="portal-game-card caro-card">
        <div class="card-glow-bg caro-glow"></div>
        <div class="card-header-row">
          <div class="game-badge caro-badge">1 VS 1 ĐỈNH CAO</div>
          <span class="player-capacity">1–2 Người</span>
        </div>

        <div class="card-visual-center">
          <div class="visual-icon-box caro-box">
            <svg class="caro-icon" viewBox="0 0 52 52" aria-hidden="true">
              <g stroke="#34d399" stroke-opacity="0.45" stroke-width="1.4" stroke-linecap="round">
                <line x1="8" y1="14" x2="44" y2="14" />
                <line x1="8" y1="26" x2="44" y2="26" />
                <line x1="8" y1="38" x2="44" y2="38" />
                <line x1="14" y1="8" x2="14" y2="44" />
                <line x1="26" y1="8" x2="26" y2="44" />
                <line x1="38" y1="8" x2="38" y2="44" />
              </g>
              <circle cx="14" cy="14" r="5" fill="#f8fafc" />
              <circle cx="26" cy="26" r="5" fill="#f8fafc" />
              <circle cx="38" cy="38" r="5" fill="#f8fafc" />
              <circle cx="26" cy="14" r="5" fill="#0b1120" stroke="#34d399" stroke-width="1.6" />
              <circle cx="38" cy="26" r="5" fill="#0b1120" stroke="#34d399" stroke-width="1.6" />
              <circle cx="14" cy="38" r="5" fill="#0b1120" stroke="#34d399" stroke-width="1.6" />
              <line x1="11" y1="11" x2="41" y2="41" stroke="#34d399" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="1 4" />
            </svg>
          </div>
          <h2 class="game-title">CỜ CARO ONLINE</h2>
          <p class="game-summary">
            Đấu trí Gomoku 5 quân liên tiếp thời gian thực. Đồ họa hiệu ứng Neon/Zen obsidian, hỗ trợ luật chặn 2 đầu kinh điển và phòng đấu online 2 người!
          </p>
        </div>

        <div class="card-tags-list">
          <span class="portal-tag">15x15 Caro</span>
          <span class="portal-tag">Luật Chặn 2 Đầu</span>
          <span class="portal-tag">Đấu Online & Bot AI</span>
        </div>

        <div class="card-footer-action">
          <span class="enter-btn-text caro-btn-text">
            VÀO SẢNH CỜ CARO <LucideArrowRight class="icon" />
          </span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { LucideArrowRight } from '@lucide/vue'
</script>

<style scoped>
.game-portal-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 120px);
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: var(--space-4) var(--space-4) var(--space-6);
}

.portal-hero {
  text-align: center;
  margin-bottom: var(--space-6);
}

.portal-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: var(--matchbox-cyan);
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 4px 14px;
  border-radius: 999px;
  margin-bottom: var(--space-3);
}

.pulse-light {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #38bdf8;
  box-shadow: 0 0 8px #38bdf8;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.8); }
}

.portal-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 2.2rem;
  font-weight: 900;
  letter-spacing: 2px;
  color: var(--matchbox-gold);
  margin-bottom: var(--space-2);
  text-shadow: 0 0 30px rgba(252, 211, 77, 0.3);
}

.portal-subtitle {
  color: var(--text-muted);
  font-size: 0.95rem;
  max-width: 680px;
  margin: 0 auto;
  line-height: 1.5;
}

.portal-games-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-5);
  width: 100%;
}

.portal-game-card {
  position: relative;
  background: var(--card-bg);
  border: 2px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-5) var(--space-5) var(--space-6);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.matrix-card:hover {
  transform: translateY(-6px);
  border-color: rgba(56, 189, 248, 0.6);
  box-shadow: 0 16px 40px rgba(56, 189, 248, 0.2);
}

.tank-card:hover {
  transform: translateY(-6px);
  border-color: rgba(249, 115, 22, 0.6);
  box-shadow: 0 16px 40px rgba(249, 115, 22, 0.2);
}

.caro-card:hover {
  transform: translateY(-6px);
  border-color: rgba(52, 211, 153, 0.6);
  box-shadow: 0 16px 40px rgba(52, 211, 153, 0.2);
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
  position: relative;
  z-index: 2;
}

.game-badge {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 1px;
  padding: 3px 10px;
  border-radius: 999px;
}

.matrix-badge {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.4);
}

.tank-badge {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.caro-badge {
  background: rgba(52, 211, 153, 0.15);
  color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.4);
}

.player-capacity {
  font-family: 'Fira Code', monospace;
  font-size: 0.8rem;
  color: var(--text-faint);
}

.card-visual-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin: var(--space-2) 0 var(--space-4);
  position: relative;
  z-index: 2;
}

.visual-icon-box {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-md);
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.8rem;
  margin-bottom: var(--space-3);
  transition: transform 0.3s;
}

.matrix-icon {
  width: 3.6rem;
  height: 3.6rem;
  filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.35));
}

.caro-icon {
  width: 3.6rem;
  height: 3.6rem;
  filter: drop-shadow(0 0 6px rgba(52, 211, 153, 0.35));
}

.tank-duel {
  display: flex;
  align-items: center;
  gap: 4px;
  filter: drop-shadow(0 0 6px rgba(249, 115, 22, 0.3));
}

.duel-tank.blue {
  transform: rotate(90deg);
}

.duel-tank.red {
  transform: rotate(-90deg);
}

.duel-spark {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fcd34d;
  box-shadow: 0 0 8px 3px rgba(252, 211, 77, 0.7);
}

.portal-game-card:hover .visual-icon-box {
  transform: scale(1.1);
}

.game-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.4rem;
  font-weight: 900;
  letter-spacing: 1.5px;
  color: var(--text-main);
  margin-bottom: var(--space-2);
}

.game-summary {
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.5;
  min-height: 60px;
}

.card-tags-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-bottom: var(--space-5);
  position: relative;
  z-index: 2;
}

.portal-tag {
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 2px 8px;
  border-radius: 4px;
  color: var(--text-faint);
}

.card-footer-action {
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 2;
}

.enter-btn-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 1px;
  padding: 10px 24px;
  border-radius: var(--radius-sm);
  transition: all 0.25s;
  width: 100%;
  justify-content: center;
}

.matrix-btn-text {
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.4);
  color: #38bdf8;
}

.portal-game-card:hover .matrix-btn-text {
  background: #0284c7;
  color: white;
  box-shadow: 0 0 16px rgba(2, 132, 199, 0.5);
}

.tank-btn-text {
  background: rgba(249, 115, 22, 0.1);
  border: 1px solid rgba(249, 115, 22, 0.4);
  color: var(--matchbox-orange);
}

.portal-game-card:hover .tank-btn-text {
  background: var(--matchbox-orange);
  color: white;
  box-shadow: 0 0 16px rgba(249, 115, 22, 0.5);
}

.caro-btn-text {
  background: rgba(52, 211, 153, 0.1);
  border: 1px solid rgba(52, 211, 153, 0.4);
  color: #34d399;
}

.portal-game-card:hover .caro-btn-text {
  background: #059669;
  color: white;
  box-shadow: 0 0 16px rgba(5, 150, 105, 0.5);
}

@media (max-width: 1024px) {
  .portal-games-grid {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
}

@media (max-width: 820px) {
  .portal-games-grid {
    grid-template-columns: 1fr;
    max-width: 480px;
  }
  .portal-title {
    font-size: 1.7rem;
  }
}
</style>
