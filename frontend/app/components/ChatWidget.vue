<template>
  <div class="panel-section chat-panel">
    <div class="panel-title chat-header">
      <span><LucideMessageCircle class="icon" /> Chat Nhóm</span>
    </div>
    <div class="chat-body">
      <div ref="messagesRef" class="chat-messages">
        <div
          v-for="(msg, i) in store.chatMessages"
          :key="i"
          class="chat-msg"
          :class="msg.playerId === store.myPlayerId ? 'me' : 'other'"
          :style="{ borderLeftColor: getPlayerColor(getPlayerIndex(msg.playerId)) }"
        >
          <div
            v-if="msg.playerId !== store.myPlayerId"
            class="chat-msg-author"
            :style="{ color: getPlayerColor(getPlayerIndex(msg.playerId)) }"
          >
            {{ msg.sender }}
          </div>
          <div>{{ msg.msg }}</div>
        </div>
      </div>
      <div v-if="!store.isSpectating" class="chat-input-row">
        <input
          v-model="inputMsg"
          type="text"
          placeholder="Nhập tin nhắn..."
          autocomplete="off"
          maxlength="100"
          @keyup.enter="sendChat"
        >
        <button aria-label="Gửi" @click="sendChat">
          <LucideSend class="icon" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useGameStore } from '~/stores/game'
import { useSocket } from '~/composables/useSocket'
import { getPlayerColor } from '~/config/constants'
import { LucideMessageCircle, LucideSend } from '@lucide/vue'
import type { Player } from '~/types'

const store = useGameStore()
const { emitAck } = useSocket()
const inputMsg = ref('')
const messagesRef = ref<HTMLDivElement | null>(null)

const getPlayerIndex = (id: string) => {
  if (!store.localRoomState?.players) return -1
  return store.localRoomState.players.findIndex((p: Player) => p.id === id)
}

const sendChat = () => {
  if (store.isSpectating || !inputMsg.value.trim()) return
  emitAck('chat_message', inputMsg.value.trim())
  inputMsg.value = ''
}

watch(() => store.chatMessages.length, () => {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
})
</script>

<style scoped>

.panel-section.chat-panel {
  padding: 0;
  overflow: hidden;
  gap: 0;
  height: 0;
  min-height: 100%;
}

.chat-header {
  padding: 0.8rem 1.1rem;
  border-bottom: 1px solid var(--border);
  margin: 0;
}

.chat-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.chat-messages {
  flex: 1;
  padding: var(--space-3);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.85rem;
}

.chat-msg {
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  max-width: 90%;
  word-wrap: break-word;
}

.chat-msg.system {
  align-self: center;
  background: transparent;
  color: var(--text-faint);
  font-size: 0.75rem;
  text-align: center;
}

.chat-msg.other {
  align-self: flex-start;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border);
  color: #fff;
}

.chat-msg.me {
  align-self: flex-end;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #fff;
}

.chat-msg-author {
  font-weight: 700;
  font-size: 0.7rem;
  color: var(--matchbox-gold);
  margin-bottom: 2px;
}

.chat-msg.me .chat-msg-author {
  display: none;
}

.chat-input-row {
  display: flex;
  padding: var(--space-3);
  border-top: 1px solid var(--border);
  gap: 6px;
}

.chat-input-row input {
  flex: 1;
  min-width: 0;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
}

.chat-input-row input:focus {
  outline: none;
  border-color: var(--matchbox-orange);
}

.chat-input-row button {
  background: var(--matchbox-orange);
  color: #000;
  border: none;
  border-radius: 6px;
  padding: 0 14px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-input-row button:hover {
  background: #ff8c00;
}

@media (max-width: 1180px) {

  .chat-panel {
    order: 3;
    width: 100%;
  }

  .chat-panel {
    position: static;
    height: auto;
    max-height: none;
    min-height: 0;
  }

  .chat-body {
    height: 220px;
  }
}

@media (min-width: 769px) and (max-width: 1180px) {

  .chat-body {
    height: 280px;
  }
}
</style>
