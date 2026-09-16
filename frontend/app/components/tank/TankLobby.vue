<template>
  <div class="tank-lobby-wrapper">
    <!-- View 1: Room List & Creation (When NOT inside a room) -->
    <div v-if="!currentTankRoom" class="lobby-browser">
      <div class="lobby-header-bar">
        <div class="header-left">
          <h2>PHÒNG ĐỐI KHÁNG ONLINE</h2>
          <p class="subtitle">Trận chiến 2 đội (Đội Xanh vs Đội Đỏ) - Tối đa 4 người chơi</p>
        </div>
        <button class="btn btn-primary create-btn" @click="openCreateModal">
          <LucidePlus class="icon" /> TẠO PHÒNG MỚI
        </button>
      </div>

      <!-- Room Cards Grid -->
      <div class="tank-rooms-grid">
        <div 
          v-for="room in openTankRooms" 
          :key="room.roomCode" 
          class="tank-room-card"
        >
          <div class="room-card-header">
            <span class="room-code-badge">{{ room.roomCode }}</span>
            <span class="host-info">Chủ phòng: <b>{{ room.hostName }}</b></span>
          </div>

          <div class="room-teams-preview">
            <div class="team-preview blue">
              <span class="team-dot blue"></span>
              <span>Đội Xanh: <b>{{ room.blueCount }}/2</b></span>
            </div>
            <span class="vs-divider">VS</span>
            <div class="team-preview red">
              <span class="team-dot red"></span>
              <span>Đội Đỏ: <b>{{ room.redCount }}/2</b></span>
            </div>
          </div>

          <div class="room-card-footer">
            <span class="player-count">
              <LucideUsers class="icon" /> {{ room.playerCount }}/{{ room.maxPlayers }} người
            </span>
            <button class="btn btn-arcade-small" @click="promptJoinRoom(room.roomCode)">
              VÀO PHÒNG
            </button>
          </div>
        </div>

        <div v-if="!openTankRooms.length" class="empty-room-state">
          <LucideShieldAlert class="icon empty-icon" />
          <p>Chưa có phòng đối kháng nào. Hãy bấm "TẠO PHÒNG MỚI" để lập phòng đầu tiên!</p>
        </div>
      </div>
    </div>

    <!-- View 2: Room Waiting Room (Inside Room) -->
    <div v-else-if="currentTankRoom.status === 'LOBBY'" class="room-waiting-room">
      <div class="waiting-header">
        <div class="room-info-left">
          <span class="waiting-label">MÃ PHÒNG:</span>
          <h2 class="waiting-code">{{ currentTankRoom.roomCode }}</h2>
          <button class="copy-btn" @click="copyRoomCode" title="Sao chép mã phòng">
            <LucideCopy v-if="!copied" class="icon" />
            <LucideCheck v-else class="icon text-green" />
          </button>
        </div>
        <button class="btn btn-secondary leave-btn" @click="handleLeaveRoom">
          <LucideLogOut class="icon" /> RỜI PHÒNG
        </button>
      </div>

      <!-- Teams Showcase (Blue vs Red) -->
      <div class="teams-container">
        <!-- Team Blue (South Base) -->
        <div class="team-box team-blue">
          <div class="team-header">
            <div class="team-title-row">
              <span class="team-shield">🛡️</span>
              <h3>ĐỘI XANH</h3>
              <span class="team-pos-tag">Thủ Thành Nam (Đáy)</span>
            </div>
            <button 
              v-if="myPlayer?.team !== 'blue'" 
              class="switch-team-btn blue-btn"
              @click="switchTeam('blue')"
            >
              VÀO ĐỘI XANH
            </button>
          </div>

          <div class="team-slots">
            <div 
              v-for="slot in 2" 
              :key="'blue_' + slot" 
              class="player-slot" 
              :class="{ occupied: getPlayerAtTeam('blue', slot - 1) }"
            >
              <template v-if="getPlayerAtTeam('blue', slot - 1)">
                <div class="player-tank-avatar blue-avatar">
                  {{ slot === 1 ? '🟡' : '🔷' }}
                </div>
                <div class="player-slot-info">
                  <span class="slot-name">
                    {{ getPlayerAtTeam('blue', slot - 1)!.name }}
                    <span v-if="getPlayerAtTeam('blue', slot - 1)!.id === currentTankRoom.hostPlayerId" class="host-badge">HOST</span>
                    <span v-if="getPlayerAtTeam('blue', slot - 1)!.id === myPlayerId" class="you-badge">(Bạn)</span>
                  </span>
                  <span class="ready-tag" :class="{ is_ready: getPlayerAtTeam('blue', slot - 1)!.ready }">
                    {{ getPlayerAtTeam('blue', slot - 1)!.ready ? '✓ Đã sẵn sàng' : 'Chờ sẵn sàng...' }}
                  </span>
                </div>
                <button 
                  v-if="isHost && getPlayerAtTeam('blue', slot - 1)!.id !== myPlayerId" 
                  class="kick-player-btn" 
                  @click.stop="handleKick(getPlayerAtTeam('blue', slot - 1)!.id, getPlayerAtTeam('blue', slot - 1)!.name)"
                  title="Kích người chơi"
                >
                  <LucideUserX class="icon" /> KÍCH
                </button>
              </template>
              <template v-else>
                <div class="empty-slot-text">+ Vị trí trống</div>
              </template>
            </div>
          </div>
        </div>

        <!-- VS Banner in center -->
        <div class="vs-center-col">
          <div class="vs-circle">VS</div>
          <div class="rules-hint">
            <span>⚔️ Mục tiêu:</span>
            <span>Bắn nổ đại bàng đối phương để thắng!</span>
          </div>
        </div>

        <!-- Team Red (North Base) -->
        <div class="team-box team-red">
          <div class="team-header">
            <div class="team-title-row">
              <span class="team-shield">🛡️</span>
              <h3>ĐỘI ĐỎ</h3>
              <span class="team-pos-tag">Thủ Thành Bắc (Đỉnh)</span>
            </div>
            <button 
              v-if="myPlayer?.team !== 'red'" 
              class="switch-team-btn red-btn"
              @click="switchTeam('red')"
            >
              VÀO ĐỘI ĐỎ
            </button>
          </div>

          <div class="team-slots">
            <div 
              v-for="slot in 2" 
              :key="'red_' + slot" 
              class="player-slot" 
              :class="{ occupied: getPlayerAtTeam('red', slot - 1) }"
            >
              <template v-if="getPlayerAtTeam('red', slot - 1)">
                <div class="player-tank-avatar red-avatar">
                  {{ slot === 1 ? '🔴' : '🟣' }}
                </div>
                <div class="player-slot-info">
                  <span class="slot-name">
                    {{ getPlayerAtTeam('red', slot - 1)!.name }}
                    <span v-if="getPlayerAtTeam('red', slot - 1)!.id === currentTankRoom.hostPlayerId" class="host-badge">HOST</span>
                    <span v-if="getPlayerAtTeam('red', slot - 1)!.id === myPlayerId" class="you-badge">(Bạn)</span>
                  </span>
                  <span class="ready-tag" :class="{ is_ready: getPlayerAtTeam('red', slot - 1)!.ready }">
                    {{ getPlayerAtTeam('red', slot - 1)!.ready ? '✓ Đã sẵn sàng' : 'Chờ sẵn sàng...' }}
                  </span>
                </div>
                <button 
                  v-if="isHost && getPlayerAtTeam('red', slot - 1)!.id !== myPlayerId" 
                  class="kick-player-btn" 
                  @click.stop="handleKick(getPlayerAtTeam('red', slot - 1)!.id, getPlayerAtTeam('red', slot - 1)!.name)"
                  title="Kích người chơi"
                >
                  <LucideUserX class="icon" /> KÍCH
                </button>
              </template>
              <template v-else>
                <div class="empty-slot-text">+ Vị trí trống</div>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="waiting-footer">
        <div class="footer-status-text">
          <span>👥 Tổng: {{ currentTankRoom.players.length }}/4 người chơi</span>
        </div>

        <div class="footer-actions">
          <button 
            v-if="!isHost" 
            class="btn ready-btn" 
            :class="{ active: myPlayer?.ready }"
            @click="handleToggleReady"
          >
            {{ myPlayer?.ready ? '✓ ĐÃ SẴN SÀNG' : 'SẴN SÀNG' }}
          </button>

          <div v-if="isHost" class="host-start-wrapper">
            <span v-if="startHint" class="start-hint-msg">{{ startHint }}</span>
            <button 
              class="btn btn-primary start-btn" 
              :disabled="!canStartGame"
              @click="handleStartGame"
            >
              <LucideSwords class="icon" /> BẮT ĐẦU TRẬN ĐẤU
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Enter Name -->
    <div v-if="showModal" class="name-modal-overlay">
      <div class="name-modal-box">
        <h3>{{ isJoinMode ? 'THAM GIA PHÒNG' : 'TẠO PHÒNG MỚI' }}</h3>
        <p>Nhập tên của bạn để hiển thị trên chiến trường:</p>
        <input 
          v-model="inputPlayerName" 
          type="text" 
          placeholder="Tên xe tăng của bạn..." 
          maxlength="20"
          class="name-input"
          @keydown.enter="submitNameModal"
        />
        <div class="modal-buttons">
          <button class="btn btn-secondary" @click="showModal = false">HỦY</button>
          <button class="btn btn-primary" :disabled="!inputPlayerName.trim()" @click="submitNameModal">
            XÁC NHẬN
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { 
  LucidePlus, 
  LucideUsers, 
  LucideCopy, 
  LucideCheck, 
  LucideLogOut, 
  LucideSwords, 
  LucideShieldAlert,
  LucideUserX
} from '@lucide/vue'
import { useTankSocket } from '~/composables/useTankSocket'
import type { Team } from '~/types/tank'

const { 
  currentTankRoom, 
  myPlayerId, 
  openTankRooms, 
  listRooms, 
  createRoom, 
  joinRoom, 
  switchTeam, 
  toggleReady, 
  startGame, 
  leaveRoom,
  kickPlayer
} = useTankSocket()

const showModal = ref(false)
const isJoinMode = ref(false)
const targetRoomCode = ref('')
const inputPlayerName = ref('')
const copied = ref(false)

onMounted(async () => {
  const saved = localStorage.getItem('tank_player_name')
  if (saved) inputPlayerName.value = saved
  await listRooms()
})

const myPlayer = computed(() => {
  if (!currentTankRoom.value || !myPlayerId.value) return null
  return currentTankRoom.value.players.find(p => p.id === myPlayerId.value) || null
})

const isHost = computed(() => {
  return currentTankRoom.value?.hostPlayerId === myPlayerId.value
})

const startHint = computed(() => {
  if (!currentTankRoom.value || !isHost.value) return ''
  const blueCount = currentTankRoom.value.players.filter(p => p.team === 'blue').length
  const redCount = currentTankRoom.value.players.filter(p => p.team === 'red').length
  if (currentTankRoom.value.players.length > 1 && (blueCount === 0 || redCount === 0)) {
    return 'Cần có người ở cả Đội Xanh & Đội Đỏ để đối kháng.'
  }
  const unreadyCount = currentTankRoom.value.players.filter(p => p.id !== currentTankRoom.value!.hostPlayerId && !p.ready).length
  if (unreadyCount > 0) {
    return `Đang chờ ${unreadyCount} người chơi bấm Sẵn Sàng...`
  }
  return ''
})

const canStartGame = computed(() => {
  if (!currentTankRoom.value) return false
  if (currentTankRoom.value.players.length < 1) return false
  const blueCount = currentTankRoom.value.players.filter(p => p.team === 'blue').length
  const redCount = currentTankRoom.value.players.filter(p => p.team === 'red').length
  if (currentTankRoom.value.players.length > 1 && (blueCount === 0 || redCount === 0)) return false
  const allReady = currentTankRoom.value.players.every(p => p.id === currentTankRoom.value!.hostPlayerId || p.ready)
  return allReady
})

async function handleKick(targetId: string, name: string) {
  if (!confirm(`Bạn có chắc muốn kích người chơi "${name}" khỏi phòng?`)) return
  const res = await kickPlayer(targetId)
  if (!res?.ok) {
    alert(res?.error?.message || 'Không thể kích người chơi.')
  }
}

function getPlayerAtTeam(team: Team, index: number) {
  if (!currentTankRoom.value) return null
  const teamPlayers = currentTankRoom.value.players.filter(p => p.team === team)
  return teamPlayers[index] || null
}

function openCreateModal() {
  isJoinMode.value = false
  showModal.value = true
}

function promptJoinRoom(code: string) {
  targetRoomCode.value = code
  isJoinMode.value = true
  showModal.value = true
}

async function submitNameModal() {
  const name = inputPlayerName.value.trim()
  if (!name) return

  if (isJoinMode.value) {
    const res = await joinRoom(targetRoomCode.value, name)
    if (!res.ok) {
      alert(res.error?.message || 'Không thể tham gia phòng.')
      return
    }
  } else {
    const res = await createRoom(name)
    if (!res.ok) {
      alert(res.error?.message || 'Không thể tạo phòng.')
      return
    }
  }
  showModal.value = false
}

async function handleLeaveRoom() {
  await leaveRoom()
}

async function handleToggleReady() {
  await toggleReady()
}

async function handleStartGame() {
  const res = await startGame()
  if (res && !res.ok) {
    alert(res.error?.message || 'Không thể bắt đầu trận đấu.')
  }
}

function copyRoomCode() {
  if (!currentTankRoom.value) return
  navigator.clipboard.writeText(currentTankRoom.value.roomCode)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 1500)
}
</script>

<style scoped>
.tank-lobby-wrapper {
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
}

.lobby-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border);
}

.header-left h2 {
  font-family: 'Orbitron', sans-serif;
  color: var(--matchbox-gold);
  font-size: 1.4rem;
  margin: 0;
}

.header-left .subtitle {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-top: 4px;
}

.tank-rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}

.tank-room-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  transition: all 0.2s;
}

.tank-room-card:hover {
  border-color: rgba(56, 189, 248, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.room-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.room-code-badge {
  font-family: 'Orbitron', sans-serif;
  font-weight: 800;
  font-size: 1rem;
  color: var(--matchbox-cyan);
  background: rgba(56, 189, 248, 0.1);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  letter-spacing: 1px;
}

.host-info {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.host-info b {
  color: var(--text-main);
}

.room-teams-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--card-bg-soft);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
}

.team-preview {
  display: flex;
  align-items: center;
  gap: 6px;
}

.team-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.team-dot.blue { background: #38bdf8; }
.team-dot.red { background: #ef4444; }

.vs-divider {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--text-faint);
}

.room-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--space-2);
  border-top: 1px dashed rgba(255, 255, 255, 0.08);
}

.player-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.btn-arcade-small {
  background: var(--matchbox-orange);
  color: white;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 6px 14px;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-arcade-small:hover {
  background: #ea580c;
  transform: scale(1.05);
}

.empty-room-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-6);
  background: var(--card-bg-soft);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  text-align: center;
  color: var(--text-muted);
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: var(--text-faint);
}

/* Waiting Room Inside */
.room-waiting-room {
  background: var(--card-bg);
  border: 2px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.waiting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
  padding-bottom: var(--space-4);
}

.room-info-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.waiting-label {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.waiting-code {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.8rem;
  color: var(--matchbox-cyan);
  letter-spacing: 2px;
  margin: 0;
}

.copy-btn {
  background: var(--card-bg-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-main);
  transition: all 0.2s;
}

.copy-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.teams-container {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: var(--space-4);
  align-items: stretch;
}

.team-box {
  background: rgba(15, 23, 42, 0.7);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.team-box.team-blue {
  border-color: rgba(56, 189, 248, 0.5);
  box-shadow: 0 0 20px rgba(56, 189, 248, 0.1);
}

.team-box.team-red {
  border-color: rgba(239, 68, 68, 0.5);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.1);
}

.team-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: var(--space-2);
}

.team-title-row {
  display: flex;
  flex-direction: column;
}

.team-title-row h3 {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  margin: 0;
}

.team-blue h3 { color: #38bdf8; }
.team-red h3 { color: #ef4444; }

.team-pos-tag {
  font-size: 0.7rem;
  color: var(--text-faint);
}

.switch-team-btn {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.switch-team-btn.blue-btn {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border-color: rgba(56, 189, 248, 0.4);
}

.switch-team-btn.red-btn {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.4);
}

.team-slots {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.player-slot {
  background: var(--card-bg-soft);
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 60px;
}

.player-slot.occupied {
  border-style: solid;
  border-color: rgba(255, 255, 255, 0.15);
}

.player-tank-avatar {
  font-size: 1.6rem;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  border-radius: var(--radius-sm);
}

.player-slot-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.slot-name {
  font-weight: 700;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 6px;
}

.host-badge {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.65rem;
  background: var(--matchbox-gold);
  color: #000;
  padding: 1px 5px;
  border-radius: 4px;
  font-weight: 800;
}

.you-badge {
  font-size: 0.75rem;
  color: var(--matchbox-cyan);
}

.ready-tag {
  font-size: 0.75rem;
  color: var(--text-faint);
}

.ready-tag.is_ready {
  color: #10b981;
  font-weight: 600;
}

.empty-slot-text {
  color: var(--text-faint);
  font-size: 0.8rem;
  margin: 0 auto;
}

.vs-center-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
}

.vs-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #1e293b;
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  font-size: 1rem;
  color: var(--matchbox-gold);
}

.rules-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: center;
  max-width: 120px;
}

.waiting-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border);
  padding-top: var(--space-4);
}

.footer-status-text {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.footer-actions {
  display: flex;
  gap: var(--space-3);
}

.ready-btn {
  background: var(--card-bg-soft);
  border: 1px solid var(--border);
  color: var(--text-main);
  font-family: 'Orbitron', sans-serif;
  font-weight: 800;
  padding: 0.6rem 1.4rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.ready-btn.active {
  background: rgba(16, 185, 129, 0.2);
  border-color: #10b981;
  color: #10b981;
}

.start-btn {
  font-family: 'Orbitron', sans-serif;
  font-weight: 800;
  padding: 0.6rem 1.8rem;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.host-start-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.start-hint-msg {
  font-size: 0.75rem;
  color: var(--matchbox-amber);
  font-family: 'Fira Code', monospace;
}

.kick-player-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #f87171;
  font-size: 0.68rem;
  font-family: 'Orbitron', sans-serif;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.kick-player-btn:hover {
  background: #ef4444;
  color: white;
}

/* Modal */
.name-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.name-modal-box {
  background: var(--card-bg);
  border: 2px solid var(--matchbox-orange);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  max-width: 400px;
  width: 90%;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.name-modal-box h3 {
  font-family: 'Orbitron', sans-serif;
  color: var(--matchbox-gold);
  margin: 0;
}

.name-modal-box p {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.name-input {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  color: var(--text-main);
  font-size: 1rem;
}

.name-input:focus {
  outline: none;
  border-color: var(--matchbox-orange);
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

@media (max-width: 768px) {
  .teams-container {
    grid-template-columns: 1fr;
  }
  .vs-center-col {
    padding: var(--space-2) 0;
  }
}
</style>
