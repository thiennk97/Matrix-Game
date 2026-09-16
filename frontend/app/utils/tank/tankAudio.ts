import { getAudioContext } from '~/utils/common/audioContext'

// Web Audio API Synthesizer for 8-bit Battle City / Tank 1990 retro sounds
class SoundSynthesizer {
  public enabled: boolean = true

  private getContext(): AudioContext | null {
    if (!this.enabled) return null
    return getAudioContext()
  }

  public shoot() {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'square'
    osc.frequency.setValueAtTime(320, now)
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08)

    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.08)
  }

  public hitSteel() {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(1200, now)
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.06)

    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.06)
  }

  public explodeSmall() {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime
    const bufferSize = Math.floor(ctx.sampleRate * 0.12)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(800, now)
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.12)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.25, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    noise.start(now)
    noise.stop(now + 0.12)
  }

  public explodeLarge() {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime
    const duration = 0.35
    const bufferSize = Math.floor(ctx.sampleRate * duration)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(450, now)
    filter.frequency.exponentialRampToValueAtTime(60, now + duration)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.4, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    noise.start(now)
    noise.stop(now + duration)
  }

  // Realistic heavy cannon / tank death boom with sub-bass punch
  public boom() {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime
    this.explodeLarge()

    // Sub-bass heavy thump
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(150, now)
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.45)

    gain.gain.setValueAtTime(0.55, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.45)
  }

  public powerup() {
    const ctx = this.getContext()
    if (!ctx) return
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]
    const noteDuration = 0.05

    notes.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * noteDuration
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'square'
      osc.frequency.setValueAtTime(freq, now)

      gain.gain.setValueAtTime(0.15, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + noteDuration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + noteDuration)
    })
  }

  public stageStart() {
    const ctx = this.getContext()
    if (!ctx) return
    const melody = [
      { f: 293.66, d: 0.1 },
      { f: 392.00, d: 0.1 },
      { f: 440.00, d: 0.1 },
      { f: 587.33, d: 0.2 },
      { f: 440.00, d: 0.1 },
      { f: 587.33, d: 0.35 }
    ]

    let time = ctx.currentTime
    melody.forEach((note) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(note.f, time)
      gain.gain.setValueAtTime(0.2, time)
      gain.gain.exponentialRampToValueAtTime(0.01, time + note.d)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(time)
      osc.stop(time + note.d)
      time += note.d
    })
  }

  public gameOver() {
    const ctx = this.getContext()
    if (!ctx) return
    const notes = [440, 415.3, 392, 369.99, 349.23, 220]
    let time = ctx.currentTime

    notes.forEach((freq) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, time)
      gain.gain.setValueAtTime(0.18, time)
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.18)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(time)
      osc.stop(time + 0.18)
      time += 0.18
    })
  }
}

export const tankAudio = new SoundSynthesizer()
