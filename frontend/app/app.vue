<template>
  <div id="app">
    <header>
      <div class="logo app-logo" @click="handleLogoClick">
        <LogoSvg />
      </div>
    </header>

    <NuxtPage v-if="!store.isRestoring" :transition="{ name: 'page', mode: 'out-in' }" />
    <div v-else class="restoring-msg" />
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '~/stores/game'
import { useLobbyNav } from '~/composables/useLobbyNav'

const store = useGameStore()
const { goToIndex } = useLobbyNav()

const handleLogoClick = () => {
  if (!store.hasJoinedRoom) goToIndex()
}
</script>

<style scoped>
.app-logo {
  cursor: pointer;
}
.restoring-msg {
  color: white;
  text-align: center;
  padding: 2rem;
}
</style>
