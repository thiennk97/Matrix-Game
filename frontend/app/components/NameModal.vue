<template>
  <div id="name-modal" class="modal-overlay active">
    <div class="modal-card">
      <button class="modal-close-btn" @click="$emit('close')">
        <LucideX class="icon" />
      </button>
      <div class="modal-title">{{ isCreate ? 'TẠO PHÒNG MỚI' : 'THAM GIA PHÒNG' }}</div>
      <p class="name-modal-desc">
        Vui lòng nhập tên của bạn
      </p>
      <div class="form-field">
        <input
          ref="inputRef"
          v-model="name"
          type="text"
          class="text-input"
          placeholder="Nhập tên của bạn..."
          autocomplete="off"
          maxlength="24"
          @keyup.enter="submit"
        >
      </div>
      <button class="btn btn-cyan btn-lg" @click="submit">
        <LucideCheck class="icon" /> XÁC NHẬN
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { LucideX, LucideCheck } from '@lucide/vue'

const props = defineProps<{
  isCreate: boolean
}>()

const emit = defineEmits(['close', 'submit'])

const name = ref(localStorage.getItem('matrix-game-player-name') || '')
const inputRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
  inputRef.value?.focus()
})

const submit = () => {
  if (!name.value.trim()) return
  localStorage.setItem('matrix-game-player-name', name.value.trim())
  emit('submit', name.value.trim(), props.isCreate)
}
</script>

<style scoped>

@keyframes modalSlideUp {
  from {
    opacity: 0;
    transform: translateY(15px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.name-modal-desc {
  color: var(--text-muted);
  margin-bottom: 1rem;
  font-size: 0.9rem;
  text-align: center;
}

.modal-overlay.active {
  display: flex;
}

.modal-card {
  background: var(--card-bg);
  border: 1.5px solid var(--border-strong);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  text-align: center;
  max-width: 520px;
  width: 100%;
  box-shadow: 0 0 60px rgba(249, 115, 22, 0.3);
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  align-items: center;
}

.modal-close-btn {
  position: absolute;
  top: 12px;
  right: 14px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  line-height: 1;
  padding: 6px;
  border-radius: 6px;
  font-size: 1.5rem;
  transition: all 0.2s ease;
}

.modal-card .form-field {
  width: 100%;
}

.modal-card .text-input {
  font-size: 1.15rem;
  padding: 1rem;
}

.modal-card .btn {
  width: 100%;
}

.modal-card .modal-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: var(--space-4);
  width: 100%;
}

.modal-card .modal-buttons .btn {
  width: auto;
  flex: 1;
  font-size: 1rem;
  padding: 0.75rem 1rem;
  white-space: nowrap;
}

.modal-card .modal-buttons .btn .icon {
  width: 1.2em;
  height: 1.2em;
}

.modal-close-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

.modal-card .modal-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.3rem;
  font-weight: 900;
  color: var(--matchbox-gold);
  margin-bottom: var(--space-4);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.victory-modal-card .modal-title {
  font-size: 1.45rem;
  justify-content: center;
  margin-bottom: 0;
  padding: 0 var(--space-6);
  width: 100%;
}

.victory-modal-card .modal-title .icon {
  height: 1.5em;
  width: 1.5em;
}

@media (max-width: 1180px) {

  .modal-card,
  .lobby-card {
    padding: 1.2rem;
    width: 92%;
  }

  .victory-modal-card .modal-title {
    font-size: 1.05rem;
    padding: 0 var(--space-5);
  }
}

@media (max-width: 480px) {

  .lobby-room-buttons,
  .modal-card .modal-buttons {
    flex-direction: column;
  }
}
</style>
