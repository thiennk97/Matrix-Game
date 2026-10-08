<template>
  <div class="tank-lobby">
    <!-- Room browser -->
    <section v-if="!currentTankRoom" class="browser">
      <div class="index-header">
        <div class="header-titles">
          <h2>SẢNH CHỜ BATTLE CITY 1990</h2>
          <p class="header-desc">Đối kháng 2 đội thời gian thực (2–4 người chơi)</p>
        </div>
        <button class="btn btn-primary create-room-btn" @click="openCreate">
          <LucidePlus class="icon" /> TẠO PHÒNG MỚI
        </button>
      </div>

      <div class="public-rooms-grid">
        <div v-for="room in openTankRooms" :key="room.roomCode" class="public-room-card">
          <div class="room-info">
            <div class="room-name">Phòng: <strong>{{ room.roomCode }}</strong></div>
            <div class="room-status" :class="room.joinable ? 'lobby' : 'full'">
              {{ room.joinable ? 'Đang chờ' : 'Đã đầy' }}
            </div>
          </div>
          <div class="room-players">
            <LucideUsers class="icon" /> {{ room.playerCount }} / {{ room.maxPlayers }} người chơi
            <div class="room-card-host">Host: {{ room.hostName }}</div>
          </div>
          <div class="room-teams">
            <span class="team-pill blue"><i></i>Xanh {{ room.blueCount }}/2</span>
            <span class="vs">VS</span>
            <span class="team-pill red"><i></i>Đỏ {{ room.redCount }}/2</span>
          </div>
          <div class="room-actions">
            <button class="btn btn-sm btn-green" :disabled="!room.joinable" @click="openJoin(room.roomCode)">
              <LucideLogIn class="icon" /> Tham gia
            </button>
          </div>
        </div>

        <div v-if="!openTankRooms.length" class="empty-state">
          <LucideDoorOpen class="icon" />
          <p>Chưa có phòng nào đang chờ. Hãy bấm "TẠO PHÒNG MỚI" để lập phòng đầu tiên!</p>
        </div>
      </div>
    </section>

    <!-- Waiting room -->
    <section v-else class="waiting">
      <div class="waiting-head">
        <div class="code-block">
          <span class="code-label">MÃ PHÒNG</span>
          <span class="code-value">{{ currentTankRoom.roomCode }}</span>
          <button class="icon-btn" title="Sao chép link mời" @click="copyRoomCode">
            <LucideCheck v-if="copied" class="icon ok" />
            <LucideCopy v-else class="icon" />
          </button>
        </div>
        <button class="btn btn-secondary btn-sm leave-btn" @click="handleLeaveRoom">
          <LucideLogOut class="icon" /> RỜI PHÒNG
        </button>
      </div>

      <div v-if="hasSeriesScore" class="series">
        <LucideTrophy class="icon" />
        <span class="series-text">Tỉ số liên đấu</span>
        <span class="num blue">{{ currentTankRoom.teamScores.blue }}</span>
        <span class="sep">:</span>
        <span class="num red">{{ currentTankRoom.teamScores.red }}</span>
      </div>

      <div class="teams">
        <div v-for="team in TEAMS" :key="team.id" class="team-box" :class="team.id">
          <div class="team-head">
            <div>
              <h3><component :is="LucideShield" class="icon" />{{ team.label }}</h3>
              <span class="team-sub">{{ team.sub }}</span>
            </div>
            <button
              v-if="myPlayer && myPlayer.team !== team.id"
              class="switch-btn"
              :class="team.id"
              :disabled="teamCount(team.id) >= 2"
              @click="handleSwitchTeam(team.id)"
            >
              {{ teamCount(team.id) >= 2 ? 'ĐÃ ĐẦY' : 'CHUYỂN QUA' }}
            </button>
          </div>

          <div class="slots">
            <div
              v-for="slot in 2"
              :key="slot"
              class="slot"
              :class="{ occupied: playerAt(team.id, slot - 1) }"
            >
              <template v-if="playerAt(team.id, slot - 1)">
                <TankIcon :team="team.id" :size="34" />
                <div class="slot-info">
                  <span class="slot-name">
                    {{ playerAt(team.id, slot - 1)!.name }}
                    <span v-if="playerAt(team.id, slot - 1)!.id === currentTankRoom.hostPlayerId" class="badge host"><LucideCrown class="icon" />HOST</span>
                    <span v-if="playerAt(team.id, slot - 1)!.id === myPlayerId" class="badge you">BẠN</span>
                  </span>
                  <span
                    class="slot-state"
                    :class="{
                      ready: playerAt(team.id, slot - 1)!.ready,
                      offline: !playerAt(team.id, slot - 1)!.connected
                    }"
                  >
                    <template v-if="!playerAt(team.id, slot - 1)!.connected"><LucideWifiOff class="icon" />Mất kết nối</template>
                    <template v-else-if="playerAt(team.id, slot - 1)!.ready"><LucideCheck class="icon" />Sẵn sàng</template>
                    <template v-else>Đang chờ...</template>
                  </span>
                </div>
                <button
                  v-if="isHost && playerAt(team.id, slot - 1)!.id !== myPlayerId"
                  class="kick-btn"
                  title="Mời ra khỏi phòng"
                  @click="askKick(playerAt(team.id, slot - 1)!.id, playerAt(team.id, slot - 1)!.name)"
                >
                  <LucideUserX class="icon" />
                </button>
              </template>
              <span v-else class="slot-empty">Vị trí trống</span>
            </div>
          </div>
        </div>
      </div>

      <div class="waiting-foot">
        <div class="foot-info">
          <span class="foot-count"><LucideUsers class="icon" />{{ currentTankRoom.players.length }}/4 người chơi</span>
          <span v-if="isHost && startHint" class="foot-hint">{{ startHint }}</span>
          <span v-else-if="!isHost" class="foot-hint">Chờ chủ phòng bắt đầu trận đấu</span>
        </div>

        <div class="foot-actions">
          <button
            v-if="!isHost"
            class="btn ready-btn"
            :class="{ active: myPlayer?.ready }"
            @click="toggleReady"
          >
            <LucideCheck v-if="myPlayer?.ready" class="icon" />
            {{ myPlayer?.ready ? 'ĐÃ SẴN SÀNG' : 'SẴN SÀNG' }}
          </button>
          <button v-else class="btn btn-primary start-btn" :disabled="!canStartGame" @click="handleStartGame">
            <LucideSwords class="icon" /> BẮT ĐẦU
          </button>
        </div>
      </div>
    </section>

    <!-- Name prompt -->
    <TankModal
      v-if="showNameModal"
      :title="isJoinMode ? 'THAM GIA PHÒNG' : 'TẠO PHÒNG MỚI'"
      :subtitle="isJoinMode ? `Phòng ${targetRoomCode}` : 'Đặt tên hiển thị trên chiến trường'"
      tone="orange"
      @close="closeNameModal"
    >
      <template #icon><component :is="isJoinMode ? LucideDoorOpen : LucidePlus" /></template>
      <form class="name-form" @submit.prevent="submitName">
        <input
          ref="nameInputRef"
          v-model="inputPlayerName"
          type="text"
          class="name-input"
          placeholder="Tên của bạn..."
          maxlength="24"
          autocomplete="off"
        />
        <p v-if="formError" class="form-error"><LucideShieldAlert class="icon" />{{ formError }}</p>
      </form>
      <template #actions>
        <button class="tm-btn" @click="closeNameModal">HỦY</button>
        <button class="tm-btn primary" :disabled="!inputPlayerName.trim() || submitting" @click="submitName">
          <LucideCheck />XÁC NHẬN
        </button>
      </template>
    </TankModal>

    <!-- Kick confirm -->
    <TankModal
      v-if="kickTarget"
      title="MỜI RA KHỎI PHÒNG"
      :subtitle="`Bạn có chắc muốn mời “${kickTarget.name}” ra khỏi phòng?`"
      tone="red"
      @close="kickTarget = null"
    >
      <template #icon><LucideUserX /></template>
      <template #actions>
        <button class="tm-btn" @click="kickTarget = null">HỦY</button>
        <button class="tm-btn danger" @click="confirmKick">XÁC NHẬN</button>
      </template>
    </TankModal>

    <!-- Generic notice (kicked, errors) -->
    <TankModal
      v-if="noticeText"
      title="THÔNG BÁO"
      :subtitle="noticeText"
      tone="neutral"
      @close="dismissNotice"
    >
      <template #icon><LucideShieldAlert /></template>
      <template #actions>
        <button class="tm-btn primary" @click="dismissNotice">ĐÃ HIỂU</button>
      </template>
    </TankModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import {
  LucidePlus,
  LucideUsers,
  LucideCopy,
  LucideCheck,
  LucideLogOut,
  LucideSwords,
  LucideShieldAlert,
  LucideShield,
  LucideUserX,
  LucideDoorOpen,
  LucideLogIn,
  LucideArrowRight,
  LucideTrophy,
  LucideCrown,
  LucideWifiOff
} from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'
import { useTankSocket } from '~/composables/useTankSocket'
import type { Team } from '~/types/tank'

const {
  currentTankRoom,
  myPlayerId,
  openTankRooms,
  notice,
  listRooms,
  createRoom,
  joinRoom,
  switchTeam,
  toggleReady,
  startGame,
  leaveRoom,
  kickPlayer
} = useTankSocket()

const route = useRoute()
const router = useRouter()

const TEAMS: { id: Team; label: string; sub: string }[] = [
  { id: 'blue', label: 'ĐỘI XANH', sub: 'Thủ thành phía Nam' },
  { id: 'red', label: 'ĐỘI ĐỎ', sub: 'Thủ thành phía Bắc' }
]

const showNameModal = ref(false)
const isJoinMode = ref(false)
const targetRoomCode = ref('')
const inputPlayerName = ref('')
const formError = ref('')
const submitting = ref(false)
const copied = ref(false)
const nameInputRef = ref<HTMLInputElement | null>(null)
const kickTarget = ref<{ id: string; name: string } | null>(null)
const localNotice = ref('')

const noticeText = computed(() => localNotice.value || notice.value || '')

let refreshTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  try {
    const saved = localStorage.getItem('tank_player_name')
    if (saved) inputPlayerName.value = saved
  } catch {
    // ignore
  }
  // Opening a shared link (/tank?room=CODE) goes straight to the name prompt, like Matrix.
  const roomParam = route.query.room
  if (typeof roomParam === 'string' && roomParam.trim() && !currentTankRoom.value) {
    openJoin(roomParam.trim().toUpperCase())
  }
  if (roomParam !== undefined) void router.replace({ query: {} })
  await listRooms()
  // Keep the browser fresh even if a broadcast is missed.
  refreshTimer = setInterval(() => {
    if (!currentTankRoom.value) void listRooms()
  }, 5000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

watch(currentTankRoom, (room) => {
  if (!room) void listRooms()
})

const myPlayer = computed(() => currentTankRoom.value?.players.find((p) => p.id === myPlayerId.value) ?? null)
const isHost = computed(() => !!currentTankRoom.value && currentTankRoom.value.hostPlayerId === myPlayerId.value)
const hasSeriesScore = computed(() => {
  const s = currentTankRoom.value?.teamScores
  return !!s && (s.blue > 0 || s.red > 0)
})

function teamCount(team: Team) {
  return currentTankRoom.value?.players.filter((p) => p.team === team).length ?? 0
}

function playerAt(team: Team, index: number) {
  return currentTankRoom.value?.players.filter((p) => p.team === team)[index] ?? null
}

const startHint = computed(() => {
  const room = currentTankRoom.value
  if (!room || !isHost.value) return ''
  if (room.players.length > 1 && (teamCount('blue') === 0 || teamCount('red') === 0)) {
    return 'Cần có người ở cả hai đội để đối kháng.'
  }
  if (room.players.some((p) => !p.connected)) return 'Đang chờ người chơi kết nối lại...'
  const unready = room.players.filter((p) => p.id !== room.hostPlayerId && !p.ready).length
  return unready > 0 ? `Đang chờ ${unready} người bấm Sẵn sàng...` : ''
})

const canStartGame = computed(() => !!currentTankRoom.value && !startHint.value)

// ---- Name modal -------------------------------------------------------------------

function openCreate() {
  isJoinMode.value = false
  targetRoomCode.value = ''
  openNameModal()
}

function openJoin(code: string) {
  isJoinMode.value = true
  targetRoomCode.value = code
  openNameModal()
}

function openNameModal() {
  formError.value = ''
  showNameModal.value = true
  void nextTick(() => nameInputRef.value?.focus())
}

function closeNameModal() {
  showNameModal.value = false
  formError.value = ''
}

async function submitName() {
  const name = inputPlayerName.value.trim()
  if (!name || submitting.value) return
  submitting.value = true
  formError.value = ''
  try {
    const res = isJoinMode.value ? await joinRoom(targetRoomCode.value, name) : await createRoom(name)
    if (!res.ok) {
      formError.value = res.error?.message || (isJoinMode.value ? 'Không thể tham gia phòng.' : 'Không thể tạo phòng.')
      if (isJoinMode.value) void listRooms()
      return
    }
    showNameModal.value = false
  } finally {
    submitting.value = false
  }
}

// ---- Room actions ----------------------------------------------------------------

async function handleSwitchTeam(team: Team) {
  const res = await switchTeam(team)
  if (res && !res.ok) localNotice.value = res.error?.message || 'Không thể đổi đội.'
}

function askKick(id: string, name: string) {
  kickTarget.value = { id, name }
}

async function confirmKick() {
  const target = kickTarget.value
  kickTarget.value = null
  if (!target) return
  const res = await kickPlayer(target.id)
  if (res && !res.ok) localNotice.value = res.error?.message || 'Không thể mời người chơi ra khỏi phòng.'
}

async function handleStartGame() {
  const res = await startGame()
  if (res && !res.ok) localNotice.value = res.error?.message || 'Không thể bắt đầu trận đấu.'
}

async function handleLeaveRoom() {
  await leaveRoom()
}

function dismissNotice() {
  localNotice.value = ''
  notice.value = null
}

function copyRoomCode() {
  if (!currentTankRoom.value) return
  navigator.clipboard?.writeText(`${location.origin}/tank?room=${currentTankRoom.value.roomCode}`).catch(() => {})
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 1500)
}
</script>

<style scoped>
.tank-lobby {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

/* Browser (mirrors the Matrix lobby) */
.index-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-2) var(--space-5);
  width: 100%;
}
.header-titles h2 {
  font-family: 'Orbitron', sans-serif;
  color: var(--matchbox-gold);
  font-size: 1.5rem;
  margin: 0;
}
.header-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 4px;
}
.create-room-btn {
  flex-shrink: 0;
  font-family: 'Orbitron', sans-serif;
  font-weight: 800;
  font-size: 0.85rem;
}

.public-rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-4);
  width: 100%;
}

.public-room-card {
  background: var(--card-bg-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  transition: transform 0.2s, box-shadow 0.2s;
}
.public-room-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(56, 189, 248, 0.1);
  border-color: rgba(56, 189, 248, 0.3);
}
.room-info { display: flex; justify-content: space-between; align-items: center; }
.room-name { font-family: 'Orbitron', sans-serif; font-weight: 800; font-size: 1.15rem; color: var(--matchbox-gold); }
.room-status {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.room-status.lobby { color: var(--matchbox-green); background: rgba(16, 185, 129, 0.12); }
.room-status.full { color: var(--text-faint); background: rgba(148, 163, 184, 0.12); }
.room-players { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: var(--text-muted); }
.room-card-host {
  font-size: 0.85rem;
  color: var(--text-faint);
  margin-left: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}
.room-teams {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(2, 6, 23, 0.35);
  border-radius: 10px;
  font-size: 0.78rem;
}
.team-pill { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; white-space: nowrap; }
.team-pill i { width: 8px; height: 8px; border-radius: 50%; }
.team-pill.blue i { background: #38bdf8; }
.team-pill.red i { background: #ef4444; }
.vs { font-family: 'Orbitron', sans-serif; font-size: 0.68rem; font-weight: 800; color: var(--text-faint); }
.room-actions { display: flex; justify-content: flex-end; }
.public-room-card .btn { font-size: 0.82rem; padding: 0.65rem 0.9rem; }

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  text-align: center;
  color: var(--text-muted);
  padding: var(--space-6);
  background: var(--card-bg-soft);
  border-radius: var(--radius-md);
  border: 1px dashed var(--border);
}
.empty-state p { font-size: 0.95rem; }
.empty-state .icon { width: 40px; height: 40px; color: var(--text-faint); }

/* Waiting room */
.waiting {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 18px;
}
.waiting-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
.code-block { display: flex; align-items: center; gap: 12px; min-width: 0; }
.code-label { font-family: 'Orbitron', sans-serif; font-size: 0.72rem; color: var(--text-muted); letter-spacing: 0.08em; }
.code-value { font-family: 'Orbitron', sans-serif; font-size: 1.6rem; font-weight: 800; letter-spacing: 0.1em; color: var(--matchbox-cyan); }
.icon-btn {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--card-bg-soft);
  color: var(--text-main);
  cursor: pointer;
}
.icon-btn:hover { background: rgba(255, 255, 255, 0.08); }
.icon-btn .ok { color: #10b981; }
.leave-btn { white-space: nowrap; }

.series {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(2, 6, 23, 0.5);
  border: 1px solid #334155;
  border-radius: 12px;
  font-family: 'Orbitron', sans-serif;
}
.series .icon { color: var(--matchbox-gold); width: 16px; height: 16px; }
.series-text { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.06em; color: var(--matchbox-gold); }
.series .num { font-size: 1.2rem; font-weight: 900; }
.num.blue { color: #38bdf8; }
.num.red { color: #ef4444; }
.series .sep { color: var(--text-faint); }

.teams { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.team-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  background: rgba(15, 23, 42, 0.7);
  border: 1.5px solid var(--border);
  border-radius: 14px;
}
.team-box.blue { border-color: rgba(56, 189, 248, 0.45); }
.team-box.red { border-color: rgba(239, 68, 68, 0.45); }
.team-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; padding-bottom: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.07); }
.team-head h3 { display: flex; align-items: center; gap: 8px; margin: 0; font-family: 'Orbitron', sans-serif; font-size: 1rem; }
.team-box.blue h3 { color: #38bdf8; }
.team-box.red h3 { color: #ef4444; }
.team-head h3 .icon { width: 18px; height: 18px; }
.team-sub { font-size: 0.72rem; color: var(--text-faint); }
.switch-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.68rem;
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s;
}
.switch-btn.blue { color: #38bdf8; background: rgba(56, 189, 248, 0.12); border-color: rgba(56, 189, 248, 0.4); }
.switch-btn.red { color: #ef4444; background: rgba(239, 68, 68, 0.12); border-color: rgba(239, 68, 68, 0.4); }
.switch-btn:hover:not(:disabled) { filter: brightness(1.3); }
.switch-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.slots { display: flex; flex-direction: column; gap: 8px; }
.slot {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 62px;
  padding: 10px 12px;
  background: var(--card-bg-soft);
  border: 1px dashed var(--border);
  border-radius: 10px;
}
.slot.occupied { border-style: solid; border-color: rgba(255, 255, 255, 0.14); }
.slot-empty { margin: 0 auto; font-size: 0.8rem; color: var(--text-faint); }
.slot-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
.slot-name { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-weight: 700; font-size: 0.9rem; }
.badge { display: inline-flex; align-items: center; gap: 3px; padding: 1px 6px; border-radius: 5px; font-family: 'Orbitron', sans-serif; font-size: 0.6rem; font-weight: 800; }
.badge .icon { width: 10px; height: 10px; }
.badge.host { background: var(--matchbox-gold); color: #000; }
.badge.you { color: var(--matchbox-cyan); border: 1px solid rgba(56, 189, 248, 0.5); }
.slot-state { display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem; color: var(--text-faint); }
.slot-state .icon { width: 12px; height: 12px; }
.slot-state.ready { color: #10b981; font-weight: 600; }
.slot-state.offline { color: #f59e0b; }
.kick-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 8px;
  border: 1px solid rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
  cursor: pointer;
}
.kick-btn:hover { background: #ef4444; color: #fff; }

.waiting-foot { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
.foot-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.foot-count { display: inline-flex; align-items: center; gap: 6px; font-size: 0.85rem; color: var(--text-muted); }
.foot-hint { font-size: 0.78rem; color: var(--matchbox-amber); }
.foot-actions { flex-shrink: 0; }
.start-btn, .ready-btn { min-width: 170px; white-space: nowrap; }
.ready-btn { background: var(--card-bg-soft); border-color: var(--border); color: var(--text-main); }
.ready-btn.active { background: rgba(16, 185, 129, 0.18); border-color: #10b981; color: #10b981; }

/* Modal form */
.name-form { display: flex; flex-direction: column; gap: 10px; }
.name-input {
  width: 100%;
  padding: 13px 14px;
  font-size: 1rem;
  color: var(--text-main);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
}
.name-input:focus { outline: none; border-color: var(--matchbox-orange); }
.form-error { display: flex; align-items: center; gap: 6px; font-size: 0.82rem; color: #f87171; }
.form-error .icon { width: 14px; height: 14px; }

@media (max-width: 720px) {
  .index-header { flex-direction: column; gap: var(--space-3); align-items: flex-start; }
  .teams { grid-template-columns: 1fr; }
  .waiting { padding: 16px; }
  .waiting-foot { flex-direction: column; align-items: stretch; }
  .foot-actions .btn { width: 100%; }
  .code-value { font-size: 1.3rem; }
}
</style>
