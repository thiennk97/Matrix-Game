<template>
  <div class="game-portal-view">
    <!-- Portal Hero Header -->
    <div class="portal-hero">
      <div class="portal-badge">
        <span class="pulse-light"></span> ARCADE & STRATEGY PLATFORM
      </div>
      <h1 class="portal-title">CHỌN TRÒ CHƠI BẮT ĐẦU</h1>
      <p class="portal-subtitle">
        Chọn một trò chơi bên dưới để vào sảnh chờ, xem danh sách phòng hoặc tạo phòng mới
      </p>
    </div>

    <!-- 2 Game Selection Cards -->
    <div class="portal-games-grid">
      <!-- Game 1: Matrix Battle -->
      <NuxtLink to="/matrix" class="portal-game-card matrix-card">
        <div class="card-glow-bg matrix-glow"></div>
        <div class="card-header-row">
          <div class="game-badge matrix-badge">CHIẾN THUẬT REALTIME</div>
          <span class="player-capacity">1–8 Người</span>
        </div>

        <div class="card-visual-center">
          <div class="visual-icon-box matrix-box">🔢</div>
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
          <div class="game-badge tank-badge">ĐỐI KHÁNG 2 ĐỘI & SOLO</div>
          <span class="player-capacity">1–4 Người</span>
        </div>

        <div class="card-visual-center">
          <div class="visual-icon-box tank-box">🛡️</div>
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
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;
  padding: var(--space-4) var(--space-5) var(--space-6);
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
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.5;
}

.portal-games-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-5);
  width: 100%;
}

.portal-game-card {
  position: relative;
  background: var(--card-bg);
  border: 2px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
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

.portal-game-card:hover .visual-icon-box {
  transform: scale(1.1);
}

.game-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.5rem;
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
