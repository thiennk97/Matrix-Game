<template>
  <Teleport to="body">
    <div class="tm-overlay" @click.self="closable && emit('close')">
      <div class="tm-card" :class="`tone-${tone}`" role="dialog" aria-modal="true">
        <button v-if="closable" class="tm-close" aria-label="Đóng" @click="emit('close')">
          <LucideX class="icon" />
        </button>

        <div class="tm-head">
          <div v-if="$slots.icon" class="tm-icon"><slot name="icon" /></div>
          <h3 class="tm-title">{{ title }}</h3>
          <p v-if="subtitle" class="tm-subtitle">{{ subtitle }}</p>
        </div>

        <div class="tm-body"><slot /></div>

        <div v-if="$slots.actions" class="tm-actions"><slot name="actions" /></div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { LucideX } from '@lucide/vue'

withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    tone?: 'neutral' | 'blue' | 'red' | 'orange'
    closable?: boolean
  }>(),
  { subtitle: '', tone: 'neutral', closable: true }
)
const emit = defineEmits<{ (e: 'close'): void }>()
</script>

<style>
/* Intentionally global: action buttons are rendered through the "actions" slot. */
.tm-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(3, 7, 18, 0.78);
  backdrop-filter: blur(6px);
  animation: tm-fade 0.18s ease-out;
}

.tm-card {
  --tm-accent: var(--matchbox-orange, #f97316);
  position: relative;
  width: min(100%, 440px);
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 28px 24px 22px;
  background: linear-gradient(180deg, #162036 0%, #0f172a 100%);
  border: 1px solid color-mix(in srgb, var(--tm-accent) 55%, transparent);
  border-radius: 18px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), 0 0 40px color-mix(in srgb, var(--tm-accent) 22%, transparent);
  animation: tm-pop 0.22s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}

.tm-card.tone-blue { --tm-accent: #38bdf8; }
.tm-card.tone-red { --tm-accent: #ef4444; }
.tm-card.tone-orange { --tm-accent: #f97316; }
.tm-card.tone-neutral { --tm-accent: #94a3b8; }

.tm-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(30, 41, 59, 0.7);
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s;
}
.tm-close:hover { color: #f1f5f9; border-color: var(--tm-accent); }

.tm-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.tm-icon {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  color: var(--tm-accent);
  background: color-mix(in srgb, var(--tm-accent) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--tm-accent) 40%, transparent);
}
.tm-icon svg { width: 28px; height: 28px; }

.tm-title {
  margin: 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--tm-accent);
  line-height: 1.3;
}

.tm-subtitle {
  margin: 0;
  font-size: 0.88rem;
  color: #94a3b8;
  line-height: 1.5;
}

.tm-body { display: flex; flex-direction: column; gap: 14px; }

.tm-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tm-btn {
  flex: 1 1 140px;
  min-height: 46px;
  padding: 0 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  white-space: nowrap;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  border-radius: 12px;
  border: 1.5px solid rgba(148, 163, 184, 0.35);
  background: rgba(30, 41, 59, 0.8);
  color: #e2e8f0;
  cursor: pointer;
  transition: transform 0.12s, background 0.15s, border-color 0.15s, box-shadow 0.15s;
}
.tm-btn svg { width: 16px; height: 16px; flex-shrink: 0; }
.tm-btn:hover:not(:disabled) { transform: translateY(-1px); border-color: #94a3b8; background: rgba(51, 65, 85, 0.9); }
.tm-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.tm-btn.primary {
  background: linear-gradient(135deg, #f97316, #fb923c);
  border-color: #fb923c;
  color: #1a0f05;
  box-shadow: 0 6px 20px rgba(249, 115, 22, 0.35);
}
.tm-btn.primary:hover:not(:disabled) { background: linear-gradient(135deg, #fb923c, #fdba74); border-color: #fdba74; }

.tm-btn.danger { color: #fca5a5; border-color: rgba(239, 68, 68, 0.5); background: rgba(239, 68, 68, 0.1); }
.tm-btn.danger:hover:not(:disabled) { background: #ef4444; border-color: #ef4444; color: #fff; }

@keyframes tm-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes tm-pop { from { opacity: 0; transform: translateY(10px) scale(0.96); } to { opacity: 1; transform: none; } }

@media (max-width: 480px) {
  .tm-card { padding: 24px 16px 18px; }
  .tm-btn { flex-basis: 100%; }
}
</style>
