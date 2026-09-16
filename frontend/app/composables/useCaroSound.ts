import { ref } from 'vue'

const soundEnabled = ref<boolean>(true)
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

export function useCaroSound() {
  function toggleSound() {
    soundEnabled.value = !soundEnabled.value
  }

  // 1. Crisp stone clack sound (wood / jade acoustic strike)
  function playPlaceStone() {
    if (!soundEnabled.value) return
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // 1. Tactile Snap Click
    const snapOsc = ctx.createOscillator()
    const snapGain = ctx.createGain()
    snapOsc.type = 'sine'
    snapOsc.frequency.setValueAtTime(3200, now)
    snapOsc.frequency.exponentialRampToValueAtTime(600, now + 0.02)

    snapGain.gain.setValueAtTime(0.45, now)
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035)

    snapOsc.connect(snapGain)
    snapGain.connect(ctx.destination)

    snapOsc.start(now)
    snapOsc.stop(now + 0.035)

    // 2. Resonant Body Thump (Deep wood resonance)
    const bodyOsc = ctx.createOscillator()
    const bodyGain = ctx.createGain()
    bodyOsc.type = 'triangle'
    bodyOsc.frequency.setValueAtTime(260, now)
    bodyOsc.frequency.exponentialRampToValueAtTime(90, now + 0.06)

    bodyGain.gain.setValueAtTime(0.35, now)
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07)

    bodyOsc.connect(bodyGain)
    bodyGain.connect(ctx.destination)

    bodyOsc.start(now)
    bodyOsc.stop(now + 0.07)
  }

  // 2. Turn alert ping
  function playTurnPing() {
    if (!soundEnabled.value) return
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now) // A5
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12) // E6

    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.25)
  }

  // 3. Countdown tick (warning < 5s)
  function playCountdownTick() {
    if (!soundEnabled.value) return
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(1100, now)

    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.05)
  }

  // 4. Victory Fanfare
  function playWin() {
    if (!soundEnabled.value) return
    const ctx = getAudioContext()
    if (!ctx) return

    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
    const start = ctx.currentTime

    notes.forEach((freq, idx) => {
      const time = start + idx * 0.1
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, time)

      gain.gain.setValueAtTime(0.25, time)
      gain.gain.exponentialRampToValueAtTime(0.001, time + (idx === notes.length - 1 ? 0.6 : 0.2))

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(time)
      osc.stop(time + (idx === notes.length - 1 ? 0.6 : 0.2))
    })
  }

  // 5. Defeat tone
  function playLose() {
    if (!soundEnabled.value) return
    const ctx = getAudioContext()
    if (!ctx) return

    const notes = [440, 415.3, 392, 349.23] // A4, Ab4, G4, F4
    const start = ctx.currentTime

    notes.forEach((freq, idx) => {
      const time = start + idx * 0.15
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, time)

      gain.gain.setValueAtTime(0.2, time)
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(time)
      osc.stop(time + 0.3)
    })
  }

  // 6. Emote pop
  function playEmote() {
    if (!soundEnabled.value) return
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(350, now)
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.08)

    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.12)
  }

  return {
    soundEnabled,
    toggleSound,
    playPlaceStone,
    playTurnPing,
    playCountdownTick,
    playWin,
    playLose,
    playEmote
  }
}
