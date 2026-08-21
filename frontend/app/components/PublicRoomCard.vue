<template>
  <div class="public-room-card">
    <div class="room-info">
      <div class="room-name">Phòng: <strong>{{ room.roomCode }}</strong></div>
      <div
        class="room-status"
        :class="{ playing: !isLobby, lobby: isLobby }"
      >
        {{ isLobby ? 'Đang chờ' : 'Đang chơi' }}
      </div>
    </div>
    <div class="room-players">
      <LucideUsers class="icon" /> {{ room.playerCount }} / {{ room.maxPlayers }} người chơi
      <div class="room-card-host">Host: {{ room.hostName }}</div>
    </div>
    <div class="room-actions">
      <button
        v-if="isLobby"
        class="btn btn-sm btn-green"
        @click="$emit('join', room.roomCode)"
      >
        <LucideLogIn class="icon" /> Tham gia
      </button>
      <button v-else class="btn btn-sm btn-cyan" @click="$emit('spectate', room.roomCode)">
        <LucideEye class="icon" /> Xem trận
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LucideUsers, LucideEye, LucideLogIn } from '@lucide/vue'
import { isLobbyStatus } from '~/utils/roomStatus'
import type { PublicRoom } from '~/types'

const props = defineProps<{
  room: PublicRoom
}>()

defineEmits(['join', 'spectate'])

const isLobby = computed(() => isLobbyStatus(props.room.status))
</script>

<style scoped>

.public-room-card {
  background: var(--card-bg-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  transition: transform 0.2s, box-shadow 0.2s;
}

.public-room-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(56, 189, 248, 0.1);
  border-color: rgba(56, 189, 248, 0.3);
}

.room-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.room-name {
  font-family: 'Orbitron', sans-serif;
  font-weight: 800;
  font-size: 1.15rem;
  color: var(--matchbox-gold);
}

.room-status {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.room-status.lobby {
  color: var(--matchbox-green);
  background: rgba(16, 185, 129, 0.12);
}

.room-status.playing {
  color: var(--matchbox-cyan);
  background: rgba(56, 189, 248, 0.1);
}

.room-players {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.room-card-host {
  font-size: 0.85rem;
  color: var(--text-faint);
  margin-left: auto;
}

.room-actions {
  display: flex;
  justify-content: flex-end;
}

.public-room-card .btn {
  font-size: 0.82rem;
  padding: 0.65rem 0.9rem;
}

@media (max-width: 1180px) {

  .public-room-card {
    padding: var(--space-4);
  }
}
</style>
