<template>
  <div class="caro-lobby-container">
    <!-- VIEW 1: ROOM LIST & CREATION BROWSER (WHEN NOT IN ROOM) -->
    <div v-if="!currentCaroRoom" class="caro-browser-view">
      <div class="lobby-header-bar">
        <div class="header-titles">
          <div class="header-badge">
            <span class="pulse-dot"></span> ĐỐI KHÁNG 1 VS 1 ONLINE
          </div>
          <h2>SẢNH CHỜ CỜ CARO</h2>
          <p class="subtitle">
            Tranh tài đỉnh cao 5 quân liên tiếp thời gian thực • Hỗ trợ luật chặn 2 đầu
          </p>
        </div>

        <div class="header-actions">
          <button class="btn btn-secondary refresh-btn" :disabled="isRefreshing" @click="handleRefresh">
            <LucideRefreshCw class="icon" :class="{ spinning: isRefreshing }" /> LÀM MỚI
          </button>
          <button class="btn btn-primary create-btn" @click="openCreateModal">
            <LucidePlus class="icon" /> TẠO PHÒNG MỚI
          </button>
        </div>
      </div>

      <!-- Room Cards Grid -->
      <div class="rooms-grid">
        <div
          v-for="room in openCaroRooms"
          :key="room.roomCode"
          class="caro-room-card"
        >
          <div class="room-card-top">
            <span class="room-code-tag">{{ room.roomCode }}</span>
            <span class="room-rule-badge" :class="room.rule">
              {{ room.rule === 'caro_vn' ? 'Chặn 2 Đầu' : 'Chuẩn 5 Quân' }}
            </span>
          </div>

          <div class="room-card-body">
            <h3 class="room-title">{{ room.roomName }}</h3>
            <div class="room-meta-item">
              <span class="meta-label">Chủ phòng:</span>
              <span class="meta-value">{{ room.hostName }}</span>
            </div>
            <div class="room-meta-row">
              <span class="meta-pill">
                <LucideClock class="icon" /> {{ room.turnTimeLimit }}s / lượt
              </span>
              <span class="meta-pill">
                <LucideGrid3x3 class="icon" /> {{ room.boardSize }}x{{ room.boardSize }}
              </span>
            </div>
          </div>

          <div class="room-card-bottom">
            <div class="player-capacity-tag" :class="{ full: room.playerCount >= 2 }">
              <LucideUsers class="icon" />
              <span>{{ room.playerCount }}/{{ room.maxPlayers }} người</span>
              <span v-if="room.spectatorCount > 0" class="spec-count">
                ({{ room.spectatorCount }} khán giả)
              </span>
            </div>

            <button
              class="btn btn-join"
              :class="room.playerCount >= 2 ? 'btn-secondary' : 'btn-primary'"
              @click="promptJoinRoom(room.roomCode)"
            >
              {{ room.playerCount >= 2 ? 'XEM TRẬN' : 'VÀO ĐẤU' }}
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="!openCaroRooms.length" class="empty-rooms-box">
          <div class="empty-icon-wrap">⚔️</div>
          <h3>Chưa có phòng cờ nào đang mở</h3>
          <p>Hãy bấm "TẠO PHÒNG MỚI" để bắt đầu trận đấu đầu tiên với bạn bè!</p>
          <button class="btn btn-primary create-btn-empty" @click="openCreateModal">
            <LucidePlus class="icon" /> TẠO PHÒNG NGAY
          </button>
        </div>
      </div>
    </div>

    <!-- VIEW 2: WAITING ROOM (WHEN INSIDE A ROOM IN LOBBY STATE) -->
    <div v-else-if="currentCaroRoom.status === 'LOBBY'" class="waiting-room-view">
      <!-- Top Action Bar -->
      <div class="waiting-top-bar">
        <div class="room-code-display">
          <span class="code-label">MÃ PHÒNG:</span>
          <span class="code-value">{{ currentCaroRoom.roomCode }}</span>
          <button class="copy-code-btn" @click="copyCode" title="Sao chép mã phòng">
            <LucideCheck v-if="copied" class="icon text-green" />
            <LucideCopy v-else class="icon" />
            <span class="btn-text">{{ copied ? 'Đã chép!' : 'Sao chép' }}</span>
          </button>
        </div>

        <div class="waiting-actions">
          <button class="btn btn-secondary leave-btn" @click="handleLeave">
            <LucideLogOut class="icon" /> RỜI PHÒNG
          </button>
        </div>
      </div>

      <!-- Settings Banner -->
      <div class="room-specs-banner">
        <span class="spec-badge">
          <b>Luật chơi:</b> {{ currentCaroRoom.rule === 'caro_vn' ? 'Việt Nam (Chặn 2 đầu không thắng)' : 'Quốc tế (5 quân liên tiếp)' }}
        </span>
        <span class="spec-badge">
          <b>Thời gian:</b> {{ currentCaroRoom.turnTimeLimit }}s mỗi nước
        </span>
        <span class="spec-badge">
          <b>Bàn cờ:</b> {{ currentCaroRoom.boardSize }}x{{ currentCaroRoom.boardSize }} ô
        </span>
      </div>

      <!-- Players Matchup Card (P1 vs P2) -->
      <div class="matchup-container">
        <!-- Player 1 (Host / X) -->
        <div
          class="player-slot-card"
          :class="[
            currentCaroRoom.players[0]?.symbol === 'X' ? 'symbol-x-card' : 'symbol-o-card',
            { 'is-me': currentCaroRoom.players[0]?.id === myPlayerId }
          ]"
        >
          <div class="slot-badge host-badge">CHỦ PHÒNG</div>
          <div class="slot-avatar">
            <div class="avatar-symbol">
              {{ currentCaroRoom.players[0]?.symbol === 'X' ? '✕' : '◯' }}
            </div>
          </div>
          <div class="slot-name">
            {{ currentCaroRoom.players[0]?.name || 'Đang chờ...' }}
            <span v-if="currentCaroRoom.players[0]?.id === myPlayerId" class="me-tag">(Bạn)</span>
          </div>
          <div class="slot-wins">
            Thắng: <b>{{ currentCaroRoom.players[0]?.wins || 0 }}</b> ván
          </div>
          <div class="slot-ready-status ready">
            <LucideCheckCircle2 class="icon" /> ĐÃ SẴN SÀNG
          </div>
        </div>

        <!-- VS Center Divider & Swap Button -->
        <div class="matchup-divider">
          <div class="vs-circle">VS</div>
          <button
            v-if="isHost"
            class="btn btn-secondary switch-symbol-btn"
            @click="switchSymbol"
            title="Đổi bên quân cờ X và O"
          >
            <LucideArrowLeftRight class="icon" /> Đổi quân X / O
          </button>
        </div>

        <!-- Player 2 (Guest / O) -->
        <div
          class="player-slot-card"
          :class="[
            currentCaroRoom.players[1]
              ? (currentCaroRoom.players[1].symbol === 'X' ? 'symbol-x-card' : 'symbol-o-card')
              : 'empty-slot',
            { 'is-me': currentCaroRoom.players[1]?.id === myPlayerId }
          ]"
        >
          <div class="slot-badge guest-badge">ĐỐI THỦ</div>
          <template v-if="currentCaroRoom.players[1]">
            <div class="slot-avatar">
              <div class="avatar-symbol">
                {{ currentCaroRoom.players[1].symbol === 'X' ? '✕' : '◯' }}
              </div>
            </div>
            <div class="slot-name">
              {{ currentCaroRoom.players[1].name }}
              <span v-if="currentCaroRoom.players[1].id === myPlayerId" class="me-tag">(Bạn)</span>
            </div>
            <div class="slot-wins">
              Thắng: <b>{{ currentCaroRoom.players[1].wins || 0 }}</b> ván
            </div>
            <div
              class="slot-ready-status"
              :class="currentCaroRoom.players[1].ready ? 'ready' : 'not-ready'"
            >
              <LucideCheckCircle2 v-if="currentCaroRoom.players[1].ready" class="icon" />
              <LucideClock v-else class="icon" />
              {{ currentCaroRoom.players[1].ready ? 'ĐÃ SẴN SÀNG' : 'CHƯA SẴN SÀNG' }}
            </div>
          </template>

          <template v-else>
            <div class="empty-slot-content">
              <LucideUserPlus class="icon empty-user-icon" />
              <p>Đang chờ đối thủ vào phòng...</p>
              <span class="share-hint">Gửi mã phòng <b>{{ currentCaroRoom.roomCode }}</b> cho bạn bè</span>
            </div>
          </template>
        </div>
      </div>

      <!-- Ready / Start Bottom Controls -->
      <div class="waiting-footer-controls">
        <!-- If Guest: Toggle Ready -->
        <button
          v-if="!isHost && currentCaroRoom.players[1]?.id === myPlayerId"
          class="btn btn-action-large"
          :class="currentCaroRoom.players[1].ready ? 'btn-secondary' : 'btn-primary'"
          @click="toggleReady"
        >
          <LucideCheckCircle2 v-if="!currentCaroRoom.players[1].ready" class="icon" />
          <LucideXCircle v-else class="icon" />
          {{ currentCaroRoom.players[1].ready ? 'HỦY SẴN SÀNG' : 'SẴN SÀNG CHIẾN ĐẤU' }}
        </button>

        <!-- If Host: Start Game button (Enabled when Guest is ready) -->
        <button
          v-if="isHost"
          class="btn btn-primary btn-action-large start-btn"
          :disabled="currentCaroRoom.players.length < 2 || !currentCaroRoom.players[1]?.ready"
          @click="startGame"
        >
          <LucidePlay class="icon" /> BẮT ĐẦU TRẬN ĐẤU
        </button>
      </div>

      <!-- Quick Chat & Emoji Bar -->
      <div class="waiting-chat-section">
        <div class="chat-messages-box">
          <div v-if="!chatMessages.length" class="empty-chat-hint">
            Chưa có tin nhắn nào. Hãy gửi lời chào hoặc biểu cảm!
          </div>
          <div
            v-for="(msg, i) in chatMessages"
            :key="'chat_' + i"
            class="chat-bubble"
            :class="{ 'mine': msg.senderId === myPlayerId }"
          >
            <span class="chat-sender">{{ msg.senderName }}:</span>
            <span class="chat-text">{{ msg.message }}</span>
          </div>
        </div>

        <div class="chat-input-row">
          <input
            v-model="newChatMessage"
            type="text"
            maxlength="100"
            placeholder="Nhập tin nhắn..."
            class="text-input chat-input"
            @keyup.enter="handleSendChat"
          />
          <button class="btn btn-secondary send-chat-btn" @click="handleSendChat">
            <LucideSend class="icon" />
          </button>
        </div>

        <div class="quick-emotes-bar">
          <button
            v-for="emote in quickEmotes"
            :key="emote"
            class="emote-btn"
            @click="handleSendEmote(emote)"
          >
            {{ emote }}
          </button>
        </div>
      </div>
    </div>

    <!-- CREATE ROOM MODAL -->
    <div v-if="showCreateModal" class="modal-backdrop" @click.self="showCreateModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <h3>TẠO PHÒNG CỜ CARO</h3>
          <button class="close-modal-btn" @click="showCreateModal = false">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-field">
            <label>Tên của bạn</label>
            <input
              v-model="formPlayerName"
              type="text"
              maxlength="20"
              placeholder="Nhập tên hiển thị..."
              class="text-input"
            />
          </div>

          <div class="form-field">
            <label>Tên phòng (Tùy chọn)</label>
            <input
              v-model="formRoomName"
              type="text"
              maxlength="30"
              placeholder="VD: Cao thủ solo cờ caro..."
              class="text-input"
            />
          </div>

          <div class="form-field">
            <label>Luật chơi</label>
            <div class="rule-selector-grid">
              <button
                type="button"
                class="rule-card"
                :class="{ active: formRule === 'standard' }"
                @click="formRule = 'standard'"
              >
                <div class="rule-title">Chuẩn Quốc Tế</div>
                <div class="rule-desc">Đạt 5 quân bất kỳ là thắng (không xét chặn 2 đầu)</div>
              </button>

              <button
                type="button"
                class="rule-card"
                :class="{ active: formRule === 'caro_vn' }"
                @click="formRule = 'caro_vn'"
              >
                <div class="rule-title">Luật Việt Nam ⭐</div>
                <div class="rule-desc">5 quân bị đối phương chặn cả 2 đầu KHÔNG tính thắng</div>
              </button>
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-field">
              <label>Thời gian mỗi nước</label>
              <select v-model="formTurnTime" class="select-input">
                <option :value="15">15 giây</option>
                <option :value="30">30 giây (Chuẩn)</option>
                <option :value="45">45 giây</option>
                <option :value="60">60 giây</option>
              </select>
            </div>

            <div class="form-field">
              <label>Kích thước bàn cờ</label>
              <select v-model="formBoardSize" class="select-input">
                <option :value="15">15 x 15 (Tiêu chuẩn)</option>
                <option :value="19">19 x 19 (Rộng lớn)</option>
              </select>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCreateModal = false">HỦY</button>
          <button class="btn btn-primary" :disabled="!formPlayerName.trim()" @click="submitCreateRoom">
            TẠO PHÒNG NGAY
          </button>
        </div>
      </div>
    </div>

    <!-- JOIN ROOM BY NAME MODAL -->
    <div v-if="showJoinModal" class="modal-backdrop" @click.self="showJoinModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <h3>VÀO PHÒNG {{ targetJoinRoomCode }}</h3>
          <button class="close-modal-btn" @click="showJoinModal = false">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-field">
            <label>Tên của bạn</label>
            <input
              v-model="formPlayerName"
              type="text"
              maxlength="20"
              placeholder="Nhập tên hiển thị..."
              class="text-input"
              @keyup.enter="submitJoinRoom"
            />
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showJoinModal = false">HỦY</button>
          <button class="btn btn-primary" :disabled="!formPlayerName.trim()" @click="submitJoinRoom">
            THAM GIA PHÒNG
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  LucidePlus,
  LucideRefreshCw,
  LucideUsers,
  LucideClock,
  LucideGrid3x3,
  LucideLogOut,
  LucideCopy,
  LucideCheck,
  LucideArrowLeftRight,
  LucideCheckCircle2,
  LucideXCircle,
  LucidePlay,
  LucideUserPlus,
  LucideSend
} from '@lucide/vue'
import { useCaroSocket } from '~/composables/useCaroSocket'
import { useCaroSound } from '~/composables/useCaroSound'

const {
  currentCaroRoom,
  myPlayerId,
  openCaroRooms,
  chatMessages,
  isHost,
  fetchRooms,
  createRoom,
  joinRoom,
  toggleReady,
  switchSymbol,
  startGame,
  sendChat,
  sendEmoji,
  leaveRoom
} = useCaroSocket()

const { playEmote } = useCaroSound()

const isRefreshing = ref(false)
const showCreateModal = ref(false)
const showJoinModal = ref(false)
const targetJoinRoomCode = ref('')
const copied = ref(false)
const newChatMessage = ref('')

const formPlayerName = ref('Kỳ Thủ ' + Math.floor(100 + Math.random() * 900))
const formRoomName = ref('')
const formRule = ref<'standard' | 'caro_vn'>('caro_vn')
const formTurnTime = ref(30)
const formBoardSize = ref(15)

const quickEmotes = ['🔥', '⚔️', '👏', '😱', '⏰', '😎', '💀', '👍']

onMounted(() => {
  const savedName = localStorage.getItem('caro_player_name')
  if (savedName) formPlayerName.value = savedName
  fetchRooms()
})

async function handleRefresh() {
  isRefreshing.value = true
  await fetchRooms()
  setTimeout(() => {
    isRefreshing.value = false
  }, 400)
}

function openCreateModal() {
  showCreateModal.value = true
}

function promptJoinRoom(roomCode: string) {
  targetJoinRoomCode.value = roomCode
  showJoinModal.value = true
}

async function submitCreateRoom() {
  if (!formPlayerName.value.trim()) return
  localStorage.setItem('caro_player_name', formPlayerName.value.trim())

  const res = await createRoom(formPlayerName.value.trim(), {
    roomName: formRoomName.value.trim(),
    rule: formRule.value,
    turnTimeLimit: formTurnTime.value,
    boardSize: formBoardSize.value
  })

  if (res.ok) {
    showCreateModal.value = false
  } else {
    alert(res.message)
  }
}

async function submitJoinRoom() {
  if (!formPlayerName.value.trim() || !targetJoinRoomCode.value) return
  localStorage.setItem('caro_player_name', formPlayerName.value.trim())

  const res = await joinRoom(targetJoinRoomCode.value, formPlayerName.value.trim())
  if (res.ok) {
    showJoinModal.value = false
  } else {
    alert(res.message)
  }
}

function copyCode() {
  if (!currentCaroRoom.value) return
  navigator.clipboard.writeText(currentCaroRoom.value.roomCode)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

async function handleLeave() {
  if (confirm('Bạn có chắc chắn muốn rời phòng?')) {
    await leaveRoom()
  }
}

function handleSendChat() {
  if (!newChatMessage.value.trim()) return
  sendChat(newChatMessage.value.trim())
  newChatMessage.value = ''
}

function handleSendEmote(emote: string) {
  sendEmoji(emote)
  playEmote()
}
</script>

<style scoped>
.caro-lobby-container {
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  padding: var(--space-4) var(--space-3);
}

/* Header */
.lobby-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-5);
  flex-wrap: wrap;
  gap: var(--space-3);
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 3px 12px;
  border-radius: 999px;
  margin-bottom: 6px;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  background: #38bdf8;
  border-radius: 50%;
  box-shadow: 0 0 6px #38bdf8;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.8); }
}

.header-titles h2 {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.8rem;
  font-weight: 900;
  letter-spacing: 1.5px;
  color: var(--matchbox-gold);
}

.subtitle {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.header-actions {
  display: flex;
  gap: var(--space-3);
}

.spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Room Cards Grid */
.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: var(--space-4);
}

.caro-room-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.25s ease;
  box-shadow: var(--shadow-card);
}

.caro-room-card:hover {
  border-color: rgba(56, 189, 248, 0.5);
  transform: translateY(-3px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
}

.room-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.room-code-tag {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--matchbox-cyan);
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 3px 10px;
  border-radius: var(--radius-sm);
  letter-spacing: 1px;
}

.room-rule-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  font-family: 'Fira Code', monospace;
}

.room-rule-badge.caro_vn {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.room-rule-badge.standard {
  background: rgba(148, 163, 184, 0.15);
  color: #cbd5e1;
  border: 1px solid rgba(148, 163, 184, 0.3);
}

.room-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-main);
  margin-bottom: 6px;
}

.room-meta-item {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.room-meta-item .meta-value {
  color: var(--matchbox-gold);
  font-weight: 600;
}

.room-meta-row {
  display: flex;
  gap: 8px;
  margin-bottom: var(--space-3);
}

.meta-pill {
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: var(--text-faint);
  background: rgba(255, 255, 255, 0.04);
  padding: 3px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.room-card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: var(--space-3);
}

.player-capacity-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  color: var(--matchbox-green);
  font-weight: 600;
}

.player-capacity-tag.full {
  color: #f87171;
}

.spec-count {
  font-size: 0.75rem;
  color: var(--text-faint);
}

.btn-join {
  padding: 6px 14px;
  font-size: 0.8rem;
}

/* Empty Rooms */
.empty-rooms-box {
  grid-column: 1 / -1;
  text-align: center;
  padding: var(--space-6) var(--space-4);
  background: var(--card-bg-soft);
  border: 1px dashed var(--border);
  border-radius: var(--radius-lg);
}

.empty-icon-wrap {
  font-size: 3rem;
  margin-bottom: var(--space-3);
}

.empty-rooms-box h3 {
  font-family: 'Orbitron', sans-serif;
  color: var(--text-main);
  margin-bottom: 6px;
}

.empty-rooms-box p {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: var(--space-4);
}

/* WAITING ROOM VIEW */
.waiting-room-view {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: var(--shadow-card);
}

.waiting-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}

.room-code-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.code-label {
  font-family: 'Fira Code', monospace;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.code-value {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.5rem;
  font-weight: 900;
  color: var(--matchbox-cyan);
  letter-spacing: 2px;
}

.copy-code-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border);
  color: var(--text-main);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-code-btn:hover {
  background: rgba(56, 189, 248, 0.15);
  border-color: #38bdf8;
}

.room-specs-banner {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-5);
}

.spec-badge {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.spec-badge b {
  color: var(--text-main);
}

/* Matchup Cards */
.matchup-container {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: var(--space-4);
  align-items: center;
  margin-bottom: var(--space-5);
}

.player-slot-card {
  position: relative;
  background: rgba(15, 23, 42, 0.8);
  border: 2px solid rgba(148, 163, 184, 0.15);
  border-radius: var(--radius-md);
  padding: var(--space-5) var(--space-4);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-height: 220px;
  transition: all 0.3s;
}

.player-slot-card.symbol-x-card {
  border-color: rgba(220, 38, 38, 0.45);
  box-shadow: 0 0 20px rgba(220, 38, 38, 0.15);
}

.player-slot-card.symbol-o-card {
  border-color: rgba(2, 132, 199, 0.45);
  box-shadow: 0 0 20px rgba(2, 132, 199, 0.15);
}

.player-slot-card.is-me {
  border-width: 2px;
}

.slot-badge {
  position: absolute;
  top: 10px;
  right: 12px;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 4px;
}

.host-badge {
  background: rgba(252, 211, 77, 0.15);
  color: #fcd34d;
  border: 1px solid rgba(252, 211, 77, 0.3);
}

.guest-badge {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.3);
}

.slot-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-3);
  background: rgba(0, 0, 0, 0.4);
}

.symbol-x-card .slot-avatar {
  border: 2px solid #dc2626;
  box-shadow: 0 0 16px rgba(220, 38, 38, 0.5);
}

.symbol-o-card .slot-avatar {
  border: 2px solid #0284c7;
  box-shadow: 0 0 16px rgba(2, 132, 199, 0.5);
}

.avatar-symbol {
  font-family: 'Orbitron', sans-serif;
  font-size: 2.2rem;
  font-weight: 900;
}

.symbol-x-card .avatar-symbol {
  color: #dc2626;
  text-shadow: 0 0 10px rgba(220, 38, 38, 0.6);
}

.symbol-o-card .avatar-symbol {
  color: #0284c7;
  text-shadow: 0 0 10px rgba(2, 132, 199, 0.6);
}

.slot-name {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-main);
  margin-bottom: 4px;
}

.me-tag {
  color: var(--matchbox-cyan);
  font-size: 0.8rem;
  font-weight: normal;
}

.slot-wins {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: var(--space-3);
}

.slot-ready-status {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
}

.slot-ready-status.ready {
  color: #34d399;
  background: rgba(52, 211, 153, 0.12);
  border: 1px solid rgba(52, 211, 153, 0.3);
}

.slot-ready-status.not-ready {
  color: #facc15;
  background: rgba(250, 204, 21, 0.12);
  border: 1px solid rgba(250, 204, 21, 0.3);
}

/* Empty Slot */
.empty-slot {
  border-style: dashed;
  justify-content: center;
}

.empty-slot-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--text-faint);
}

.empty-user-icon {
  font-size: 2rem;
  opacity: 0.5;
}

.share-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.share-hint b {
  color: var(--matchbox-cyan);
}

/* Divider & Swap */
.matchup-divider {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.vs-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  color: var(--matchbox-gold);
}

.switch-symbol-btn {
  font-size: 0.75rem;
  padding: 6px 12px;
}

/* Waiting Controls */
.waiting-footer-controls {
  display: flex;
  justify-content: center;
  margin-bottom: var(--space-5);
}

.btn-action-large {
  padding: 1rem 2.5rem;
  font-size: 1.05rem;
  letter-spacing: 1px;
}

/* Quick Chat */
.waiting-chat-section {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.chat-messages-box {
  height: 100px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: var(--space-3);
  padding: 4px;
}

.empty-chat-hint {
  font-size: 0.8rem;
  color: var(--text-faint);
  text-align: center;
  margin: auto;
}

.chat-bubble {
  font-size: 0.85rem;
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 8px;
  border-radius: 4px;
  width: fit-content;
}

.chat-bubble.mine {
  margin-left: auto;
  background: rgba(56, 189, 248, 0.15);
  border-left: 2px solid #38bdf8;
}

.chat-sender {
  font-weight: 700;
  color: var(--matchbox-cyan);
  margin-right: 6px;
}

.chat-input-row {
  display: flex;
  gap: 8px;
  margin-bottom: var(--space-2);
}

.chat-input {
  text-align: left;
}

.quick-emotes-bar {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.emote-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: transform 0.15s;
}

.emote-btn:hover {
  transform: scale(1.2);
}

/* Modals */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-3);
}

.modal-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  max-width: 480px;
  width: 100%;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
  overflow: hidden;
}

.modal-header {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  font-family: 'Orbitron', sans-serif;
  color: var(--matchbox-gold);
  font-size: 1.1rem;
}

.close-modal-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.2rem;
  cursor: pointer;
}

.modal-body {
  padding: var(--space-4) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.rule-selector-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.rule-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  color: inherit;
}

.rule-card.active {
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.12);
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.2);
}

.rule-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--text-main);
  margin-bottom: 4px;
}

.rule-desc {
  font-size: 0.72rem;
  color: var(--text-muted);
  line-height: 1.3;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.modal-footer {
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

@media (max-width: 650px) {
  .matchup-container {
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }
  .matchup-divider {
    flex-direction: row;
    justify-content: center;
  }
}
</style>
