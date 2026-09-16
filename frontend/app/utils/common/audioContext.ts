// Shared Web Audio Context helper for all games
let globalAudioCtx: AudioContext | null = null

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!globalAudioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AudioCtx) {
      globalAudioCtx = new AudioCtx()
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume().catch(() => {})
  }
  return globalAudioCtx
}
