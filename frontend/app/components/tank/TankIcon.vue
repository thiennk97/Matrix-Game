<template>
  <svg class="tank-icon" :style="{ width: `${size}px`, height: `${size}px` }" viewBox="0 0 32 32" aria-hidden="true">
    <rect x="1" y="5" width="9" height="23" rx="2" :fill="tread" />
    <rect x="22" y="5" width="9" height="23" rx="2" :fill="tread" />
    <g :fill="dark" opacity="0.8">
      <rect x="2.5" y="8" width="6" height="1.6" />
      <rect x="2.5" y="13" width="6" height="1.6" />
      <rect x="2.5" y="18" width="6" height="1.6" />
      <rect x="2.5" y="23" width="6" height="1.6" />
      <rect x="23.5" y="8" width="6" height="1.6" />
      <rect x="23.5" y="13" width="6" height="1.6" />
      <rect x="23.5" y="18" width="6" height="1.6" />
      <rect x="23.5" y="23" width="6" height="1.6" />
    </g>
    <rect x="8" y="7" width="16" height="20" rx="2.5" :fill="dark" />
    <rect x="9.5" y="8.5" width="13" height="17" rx="2" :fill="primary" />
    <rect x="13.5" y="1" width="5" height="12" rx="1.2" :fill="primary" />
    <rect x="12.5" y="1" width="7" height="3" rx="1" :fill="light" />
    <circle cx="16" cy="17" r="6.5" :fill="light" />
    <circle cx="16" cy="17" r="4.2" :fill="primary" />
    <circle cx="17.2" cy="18.2" r="1.6" fill="#0f172a" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Team } from '~/types/tank'

const props = withDefaults(defineProps<{ team: Team; size?: number }>(), { size: 28 })

const palette = computed(() =>
  props.team === 'blue'
    ? { primary: '#0ea5e9', dark: '#075985', light: '#7dd3fc' }
    : { primary: '#ef4444', dark: '#991b1b', light: '#fca5a5' }
)
const primary = computed(() => palette.value.primary)
const dark = computed(() => palette.value.dark)
const light = computed(() => palette.value.light)
const tread = '#1e293b'
</script>

<style scoped>
.tank-icon {
  display: block;
  flex-shrink: 0;
}
</style>
