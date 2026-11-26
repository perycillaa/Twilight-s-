// Tipe 3 pilihan nada dering lembut untuk Kawaii Alarm (Web Audio API)
export type AlarmSoundId = 'music-box' | 'morning-chime' | 'cute-beep'

export interface AlarmSoundOption {
  id: AlarmSoundId
  label: string
  icon: string
}

export const ALARM_SOUND_OPTIONS: AlarmSoundOption[] = [
  { id: 'music-box', label: 'Music Box', icon: '🎵' },
  { id: 'morning-chime', label: 'Morning Chime', icon: '🔔' },
  { id: 'cute-beep', label: 'Cute Beep', icon: '✨' },
]

// Shared AudioContext tunggal agar aman sesuai kebijakan autoplay browser modern
let sharedAudioCtx: AudioContext | null = null
let lastMainMeowIndex = -1
let lastMiniTapIndex = -1
let lastMiniShakeIndex = -1
let lastMiniAnnoyedIndex = -1
let lastNotebookMeowIndex = -1
let lastMiniShakeVoiceAt = 0
let lastMiniAnnoyedAt = 0

// State global untuk dengkuran (purring) kontinu saat kucing sedang di-pet-pet / dielus
interface ActivePurrNodes {
  pulseOsc: OscillatorNode
  subOsc: OscillatorNode
  noiseSource: AudioBufferSourceNode
  purrLfo: OscillatorNode
  breathLfo: OscillatorNode
  masterGain: GainNode
}
let activePurrNodes: ActivePurrNodes | null = null
let purrStopTimer: ReturnType<typeof setTimeout> | null = null

// Cache ketersediaan file audio eksternal opsional di /sounds/*.mp3 agar klik berikutnya 0ms delay
const optionalAudioAvailability = new Map<string, boolean>()

interface FormantMeowOptions {
  pitchCurve: Array<[number, number]>
  duration: number
  f1: [number, number, number]
  f2: [number, number, number]
  volumeScale: number
  vibratoRate?: number
  vibratoDepth?: number
  startDelay?: number
  openingTrill?: boolean
}

/**
 * Composable efek suara berbasis Web Audio API (100% lokal di browser, tanpa file MP3)
 * Digunakan untuk:
 * 1. Bell lembut saat Pomodoro selesai / Pengingat jadwal tiba
 * 2. Suara "pop/ting" manis setiap kali mencentang habit
 * 3. Melodi ceria saat 100% target harian tercapai
 * 4. 3 pilihan nada dering lembut untuk Kawaii Alarm
 * 5. Variasi suara interaktif kedua kucing (Kucing Utama & Kucing Mini) tersinkron dengan mute/volume utama
 */
export function useSoundEffects() {
  function getSharedAudioContext(): AudioContext | null {
    if (!import.meta.client) return null
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return null
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx()
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {})
    }
    return sharedAudioCtx
  }

  function createAudioContext(): AudioContext | null {
    if (!import.meta.client) return null
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    return AudioCtx ? new AudioCtx() : null
  }

  /**
   * 1. Nada lonceng / bell lembut (C6 -> E6 -> G6)
   */
  function playBellChime() {
    try {
      const ctx = createAudioContext()
      if (!ctx) return

      const now = ctx.currentTime
      const notes = [1046.5, 1318.5, 1567.98]

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + idx * 0.17)

        gain.gain.setValueAtTime(0.001, now + idx * 0.17)
        gain.gain.exponentialRampToValueAtTime(0.16, now + idx * 0.17 + 0.04)
        gain.gain.exponentialRampToValueAtTime(0.0008, now + idx * 0.17 + 1.05)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now + idx * 0.17)
        osc.stop(now + idx * 0.17 + 1.1)
      })

      setTimeout(() => {
        ctx.close().catch(() => {})
      }, 1900)
    } catch {
      // Abaikan jika browser membatasi autoplay sebelum interaksi pengguna
    }
  }

  /**
   * 2. Bunyi "pop/ting" lembut dan ceria saat mencentang 1 target habit
   */
  function playPopTing() {
    try {
      const ctx = createAudioContext()
      if (!ctx) return

      const now = ctx.currentTime

      const popOsc = ctx.createOscillator()
      const popGain = ctx.createGain()
      popOsc.type = 'triangle'
      popOsc.frequency.setValueAtTime(520, now)
      popOsc.frequency.exponentialRampToValueAtTime(880, now + 0.07)

      popGain.gain.setValueAtTime(0.001, now)
      popGain.gain.exponentialRampToValueAtTime(0.14, now + 0.015)
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11)

      popOsc.connect(popGain)
      popGain.connect(ctx.destination)
      popOsc.start(now)
      popOsc.stop(now + 0.12)

      const tingOsc = ctx.createOscillator()
      const tingGain = ctx.createGain()
      tingOsc.type = 'sine'
      tingOsc.frequency.setValueAtTime(1318.5, now + 0.06)

      tingGain.gain.setValueAtTime(0.001, now + 0.06)
      tingGain.gain.exponentialRampToValueAtTime(0.12, now + 0.08)
      tingGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.42)

      tingOsc.connect(tingGain)
      tingGain.connect(ctx.destination)
      tingOsc.start(now + 0.06)
      tingOsc.stop(now + 0.45)

      setTimeout(() => {
        ctx.close().catch(() => {})
      }, 700)
    } catch {
      // Abaikan jika Web Audio API tidak tersedia
    }
  }

  /**
   * 3. Melodi pendek ceria saat 100% target hari ini tuntas! (C5 -> E5 -> G5 -> C6 -> E6)
   */
  function playVictoryMelody() {
    try {
      const ctx = createAudioContext()
      if (!ctx) return

      const now = ctx.currentTime
      const melody = [
        { freq: 523.25, delay: 0.0, dur: 0.28 },
        { freq: 659.25, delay: 0.11, dur: 0.28 },
        { freq: 783.99, delay: 0.22, dur: 0.28 },
        { freq: 1046.5, delay: 0.34, dur: 0.55 },
        { freq: 1318.5, delay: 0.46, dur: 0.75 },
      ]

      melody.forEach(({ freq, delay, dur }) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, now + delay)

        gain.gain.setValueAtTime(0.001, now + delay)
        gain.gain.exponentialRampToValueAtTime(0.15, now + delay + 0.03)
        gain.gain.exponentialRampToValueAtTime(0.0008, now + delay + dur)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now + delay)
        osc.stop(now + delay + dur + 0.05)
      })

      setTimeout(() => {
        ctx.close().catch(() => {})
      }, 1700)
    } catch {
      // Abaikan jika browser belum mengizinkan audio
    }
  }

  /**
   * 4. Putar salah satu dari 3 melodi lembut Kawaii Alarm via Web Audio API
   */
  function playAlarmMelody(soundId: AlarmSoundId) {
    try {
      const ctx = createAudioContext()
      if (!ctx) return

      const now = ctx.currentTime

      if (soundId === 'music-box') {
        // Arpeggio kotak musik yang manis & berkilau (C6 -> E6 -> G6 -> B6 -> C7 -> G6)
        const notes = [1046.5, 1318.5, 1567.98, 1975.53, 2093.0, 1567.98]
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, now + idx * 0.14)

          gain.gain.setValueAtTime(0.001, now + idx * 0.14)
          gain.gain.exponentialRampToValueAtTime(0.14, now + idx * 0.14 + 0.025)
          gain.gain.exponentialRampToValueAtTime(0.0008, now + idx * 0.14 + 0.85)

          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(now + idx * 0.14)
          osc.stop(now + idx * 0.14 + 0.9)
        })
      } else if (soundId === 'morning-chime') {
        // Lonceng pagi hangat resonan (A5 -> C#6 -> E6 -> A6)
        const notes = [880.0, 1108.73, 1318.51, 1760.0]
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(freq, now + idx * 0.22)

          gain.gain.setValueAtTime(0.001, now + idx * 0.22)
          gain.gain.exponentialRampToValueAtTime(0.15, now + idx * 0.22 + 0.05)
          gain.gain.exponentialRampToValueAtTime(0.0008, now + idx * 0.22 + 1.1)

          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(now + idx * 0.22)
          osc.stop(now + idx * 0.22 + 1.15)
        })
      } else {
        // Cute Beep: bunyi ritmis kawaii yang ramah di telinga (G5 -> B5 -> D6 -> G6)
        const pattern = [
          { freq: 783.99, delay: 0.0, dur: 0.14 },
          { freq: 987.77, delay: 0.18, dur: 0.14 },
          { freq: 1174.66, delay: 0.36, dur: 0.14 },
          { freq: 1567.98, delay: 0.56, dur: 0.3 },
        ]
        pattern.forEach(({ freq, delay, dur }) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(freq, now + delay)

          gain.gain.setValueAtTime(0.001, now + delay)
          gain.gain.exponentialRampToValueAtTime(0.16, now + delay + 0.02)
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur)

          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(now + delay)
          osc.stop(now + delay + dur + 0.03)
        })
      }

      setTimeout(() => {
        ctx.close().catch(() => {})
      }, 2100)
    } catch {
      // Abaikan jika browser belum mengizinkan audio
    }
  }

  /**
   * 5. Efek suara "ting!" manis saat menangkap Bintang Pastel / Ikan Emas di Break Game
   */
  function playGameCatch(isGoldenFish = false) {
    try {
      const ctx = createAudioContext()
      if (!ctx) return

      const now = ctx.currentTime
      const notes = isGoldenFish ? [1046.5, 1318.5, 1760.0] : [987.77, 1479.98]

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + idx * 0.055)

        gain.gain.setValueAtTime(0.001, now + idx * 0.055)
        gain.gain.exponentialRampToValueAtTime(isGoldenFish ? 0.14 : 0.11, now + idx * 0.055 + 0.015)
        gain.gain.exponentialRampToValueAtTime(0.0008, now + idx * 0.055 + 0.28)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + idx * 0.055)
        osc.stop(now + idx * 0.055 + 0.3)
      })

      setTimeout(() => {
        ctx.close().catch(() => {})
      }, 500)
    } catch {
      // Abaikan jika Web Audio API tidak tersedia
    }
  }

  /**
   * 6. Efek suara kaget ringan saat menyentuh Awan Petir Mini (⚡) di Break Game
   */
  function playGameZap() {
    try {
      const ctx = createAudioContext()
      if (!ctx) return

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(240, now)
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.18)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.exponentialRampToValueAtTime(0.09, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.2)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.22)

      setTimeout(() => {
        ctx.close().catch(() => {})
      }, 350)
    } catch {
      // Abaikan jika Web Audio API tidak tersedia
    }
  }

  /**
   * Cek & putar file audio opsional di folder publik (misal /sounds/meow-1.mp3) jika tersedia.
   */
  async function tryPlayOptionalExternalAudio(path: string, volumeScale: number): Promise<boolean> {
    if (!import.meta.client || volumeScale <= 0.005) return false
    const cached = optionalAudioAvailability.get(path)
    if (cached === false) return false

    if (cached === undefined) {
      try {
        const res = await fetch(path, { method: 'HEAD' })
        const contentType = res.headers.get('content-type') || ''
        const exists = res.ok && (contentType.startsWith('audio/') || contentType.includes('octet-stream'))
        optionalAudioAvailability.set(path, exists)
        if (!exists) return false
      } catch {
        optionalAudioAvailability.set(path, false)
        return false
      }
    }

    try {
      const audio = new Audio(path)
      audio.volume = Math.max(0, Math.min(1, volumeScale))
      await audio.play()
      return true
    } catch {
      return false
    }
  }

  /**
   * MESIN SUARA KUCING REALISTIS (Vocal Formant Morphing via Web Audio API):
   * - Sawtooth + triangle lembut + vibrato alami + lapisan napas tipis.
   * - 2 Filter Vokal paralel (Formant F1 & F2 bandpass) bergerak dinamis:
   *   "M" (~300 Hz) -> "EE/AA" (F1 ~800-1000 Hz, F2 ~1600-2200 Hz) -> "OW/UU" (~450-650 Hz).
   * - DynamicsCompressorNode mencegah clipping.
   */
  function synthesizeFormantMeow(opts: FormantMeowOptions) {
    const vol = Math.max(0, Math.min(1, opts.volumeScale))
    if (vol <= 0.005) return

    const ctx = getSharedAudioContext()
    if (!ctx) return

    const now = ctx.currentTime + (opts.startDelay ?? 0)
    const dur = Math.max(0.18, opts.duration)
    const tM = now + dur * 0.15
    const tPeak = now + dur * 0.56
    const tEnd = now + dur

    const sawOsc = ctx.createOscillator()
    sawOsc.type = 'sawtooth'
    const triOsc = ctx.createOscillator()
    triOsc.type = 'triangle'

    const sawGain = ctx.createGain()
    sawGain.gain.setValueAtTime(0.68, now)
    const triGain = ctx.createGain()
    triGain.gain.setValueAtTime(0.32, now)

    opts.pitchCurve.forEach(([ratio, freq], i) => {
      const t = now + dur * Math.max(0, Math.min(1, ratio))
      if (i === 0) {
        sawOsc.frequency.setValueAtTime(freq, t)
        triOsc.frequency.setValueAtTime(freq, t)
      } else {
        sawOsc.frequency.exponentialRampToValueAtTime(freq, t)
        triOsc.frequency.exponentialRampToValueAtTime(freq, t)
      }
    })

    const vibOsc = ctx.createOscillator()
    const vibGain = ctx.createGain()
    vibOsc.type = 'sine'
    vibOsc.frequency.setValueAtTime(opts.vibratoRate ?? 6.2, now)
    vibGain.gain.setValueAtTime(opts.vibratoDepth ?? 10, now)
    vibOsc.connect(vibGain)
    vibGain.connect(sawOsc.frequency)
    vibGain.connect(triOsc.frequency)

    if (opts.openingTrill) {
      const trillOsc = ctx.createOscillator()
      const trillGain = ctx.createGain()
      trillOsc.frequency.setValueAtTime(28, now)
      trillGain.gain.setValueAtTime(26, now)
      trillGain.gain.exponentialRampToValueAtTime(0.5, tM + 0.05)
      trillOsc.connect(trillGain)
      trillGain.connect(sawOsc.frequency)
      trillOsc.start(now)
      trillOsc.stop(tM + 0.08)
    }

    const breathLen = Math.max(1, Math.floor(ctx.sampleRate * (dur + 0.05)))
    const breathBuf = ctx.createBuffer(1, breathLen, ctx.sampleRate)
    const breathData = breathBuf.getChannelData(0)
    if (breathData) {
      for (let i = 0; i < breathLen; i++) {
        breathData[i] = (Math.random() * 2 - 1) * 0.5
      }
    }
    const breathSource = ctx.createBufferSource()
    breathSource.buffer = breathBuf
    const breathGain = ctx.createGain()
    breathGain.gain.setValueAtTime(0.035, now)

    const sourceBus = ctx.createGain()
    sourceBus.gain.setValueAtTime(1, now)
    const preSoftener = ctx.createBiquadFilter()
    preSoftener.type = 'lowpass'
    preSoftener.frequency.setValueAtTime(3400, now)
    preSoftener.Q.setValueAtTime(0.7, now)

    sawOsc.connect(sawGain)
    triOsc.connect(triGain)
    sawGain.connect(sourceBus)
    triGain.connect(sourceBus)
    breathSource.connect(breathGain)
    breathGain.connect(sourceBus)
    sourceBus.connect(preSoftener)

    const f1Filter = ctx.createBiquadFilter()
    f1Filter.type = 'bandpass'
    f1Filter.Q.setValueAtTime(4.2, now)
    f1Filter.frequency.setValueAtTime(opts.f1[0], now)
    f1Filter.frequency.exponentialRampToValueAtTime(opts.f1[0] * 1.15, tM)
    f1Filter.frequency.exponentialRampToValueAtTime(opts.f1[1], tPeak)
    f1Filter.frequency.exponentialRampToValueAtTime(opts.f1[2], tEnd)

    const f1Gain = ctx.createGain()
    f1Gain.gain.setValueAtTime(1.25, now)

    const f2Filter = ctx.createBiquadFilter()
    f2Filter.type = 'bandpass'
    f2Filter.Q.setValueAtTime(5.6, now)
    f2Filter.frequency.setValueAtTime(opts.f2[0], now)
    f2Filter.frequency.exponentialRampToValueAtTime(opts.f2[0] * 1.18, tM)
    f2Filter.frequency.exponentialRampToValueAtTime(opts.f2[1], tPeak)
    f2Filter.frequency.exponentialRampToValueAtTime(opts.f2[2], tEnd)

    const f2Gain = ctx.createGain()
    f2Gain.gain.setValueAtTime(0.28, now)
    f2Gain.gain.linearRampToValueAtTime(0.95, tM + dur * 0.16)
    f2Gain.gain.linearRampToValueAtTime(0.88, tPeak)
    f2Gain.gain.linearRampToValueAtTime(0.32, tEnd)

    const f3Filter = ctx.createBiquadFilter()
    f3Filter.type = 'bandpass'
    f3Filter.Q.setValueAtTime(7.0, now)
    f3Filter.frequency.setValueAtTime(2650, now)
    const f3Gain = ctx.createGain()
    f3Gain.gain.setValueAtTime(0.16, now)

    const envGain = ctx.createGain()
    const peak = 0.36 * vol
    envGain.gain.setValueAtTime(0.0008, now)
    envGain.gain.exponentialRampToValueAtTime(peak * 0.58, tM)
    envGain.gain.exponentialRampToValueAtTime(peak, now + dur * 0.34)
    envGain.gain.exponentialRampToValueAtTime(peak * 0.78, dur > 0.35 ? tPeak + 0.05 : tPeak)
    envGain.gain.exponentialRampToValueAtTime(0.0008, tEnd)

    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.setValueAtTime(-10, now)
    limiter.knee.setValueAtTime(18, now)
    limiter.ratio.setValueAtTime(6, now)
    limiter.attack.setValueAtTime(0.005, now)
    limiter.release.setValueAtTime(0.12, now)

    preSoftener.connect(f1Filter)
    preSoftener.connect(f2Filter)
    preSoftener.connect(f3Filter)

    f1Filter.connect(f1Gain)
    f2Filter.connect(f2Gain)
    f3Filter.connect(f3Gain)

    f1Gain.connect(envGain)
    f2Gain.connect(envGain)
    f3Gain.connect(envGain)

    envGain.connect(limiter)
    limiter.connect(ctx.destination)

    sawOsc.start(now)
    triOsc.start(now)
    vibOsc.start(now)
    breathSource.start(now)

    const stopAt = tEnd + 0.04
    sawOsc.stop(stopAt)
    triOsc.stop(stopAt)
    vibOsc.stop(stopAt)
    breathSource.stop(stopAt)
  }

  /**
   * 7. Kucing Utama: 5 variasi suara "Mee-ow!" dewasa ceria & hangat (~450–620 Hz, 0.45–0.65 dtk)
   */
  function playMainCatMeow(volumeScale = 0.6) {
    const vol = Math.max(0, Math.min(1, volumeScale))
    if (vol <= 0.005) return

    const variations: Array<Omit<FormantMeowOptions, 'volumeScale'>> = [
      {
        pitchCurve: [[0, 465], [0.16, 515], [0.44, 595], [0.74, 510], [1, 435]],
        duration: 0.54,
        f1: [300, 920, 500],
        f2: [1020, 1980, 920],
        vibratoRate: 6.2,
        vibratoDepth: 10,
      },
      {
        pitchCurve: [[0, 480], [0.18, 545], [0.5, 615], [0.78, 520], [1, 445]],
        duration: 0.62,
        f1: [310, 990, 520],
        f2: [1080, 2120, 950],
        vibratoRate: 5.8,
        vibratoDepth: 11,
      },
      {
        pitchCurve: [[0, 455], [0.2, 510], [0.55, 585], [0.85, 610], [1, 560]],
        duration: 0.47,
        f1: [295, 880, 560],
        f2: [1050, 2180, 1180],
        vibratoRate: 6.8,
        vibratoDepth: 9,
      },
      {
        pitchCurve: [[0, 470], [0.16, 530], [0.46, 605], [0.76, 505], [1, 450]],
        duration: 0.56,
        f1: [300, 950, 490],
        f2: [1000, 2040, 880],
        vibratoRate: 6.4,
        vibratoDepth: 10,
        openingTrill: true,
      },
      {
        pitchCurve: [[0, 495], [0.22, 560], [0.52, 575], [0.8, 490], [1, 440]],
        duration: 0.51,
        f1: [320, 840, 470],
        f2: [980, 1740, 840],
        vibratoRate: 5.5,
        vibratoDepth: 9,
      },
    ]

    let idx = Math.floor(Math.random() * variations.length)
    if (idx === lastMainMeowIndex) idx = (idx + 1) % variations.length
    lastMainMeowIndex = idx
    const chosen = variations[idx] ?? variations[0]!

    const optionalPath = `/sounds/meow-${idx + 1}.mp3`
    if (optionalAudioAvailability.get(optionalPath) === true) {
      void tryPlayOptionalExternalAudio(optionalPath, vol)
      return
    }

    try {
      synthesizeFormantMeow({ ...chosen, volumeScale: vol })
    } catch {
      // Abaikan jika audio dibatasi browser
    }
  }

  /**
   * 8. Kucing Mini saat Diklik: 5 variasi anak kucing "Mew!" / "Mii-au?" (~680–920 Hz, 0.30–0.45 dtk)
   */
  function playMiniCatTapMew(volumeScale = 0.6) {
    const vol = Math.max(0, Math.min(1, volumeScale))
    if (vol <= 0.005) return

    const variations: Array<Omit<FormantMeowOptions, 'volumeScale'>> = [
      {
        pitchCurve: [[0, 710], [0.2, 815], [0.52, 865], [1, 690]],
        duration: 0.32,
        f1: [340, 980, 560],
        f2: [1200, 2240, 1080],
        vibratoRate: 7.4,
        vibratoDepth: 11,
      },
      {
        pitchCurve: [[0, 690], [0.22, 790], [0.58, 910], [0.85, 885], [1, 830]],
        duration: 0.38,
        f1: [330, 1020, 620],
        f2: [1250, 2380, 1320],
        vibratoRate: 7.8,
        vibratoDepth: 12,
        openingTrill: true,
      },
      {
        pitchCurve: [[0, 760], [0.25, 895], [0.65, 820], [1, 715]],
        duration: 0.3,
        f1: [350, 960, 580],
        f2: [1260, 2320, 1140],
        vibratoRate: 7.0,
        vibratoDepth: 10,
      },
      {
        pitchCurve: [[0, 685], [0.22, 785], [0.55, 830], [0.82, 740], [1, 665]],
        duration: 0.43,
        f1: [325, 930, 520],
        f2: [1180, 2140, 1020],
        vibratoRate: 6.6,
        vibratoDepth: 11,
      },
      {
        pitchCurve: [[0, 725], [0.18, 840], [0.48, 920], [0.8, 790], [1, 705]],
        duration: 0.36,
        f1: [340, 1010, 570],
        f2: [1220, 2290, 1100],
        vibratoRate: 7.6,
        vibratoDepth: 12,
        openingTrill: true,
      },
    ]

    let idx = Math.floor(Math.random() * variations.length)
    if (idx === lastMiniTapIndex) idx = (idx + 1) % variations.length
    lastMiniTapIndex = idx
    const chosen = variations[idx] ?? variations[0]!

    try {
      synthesizeFormantMeow({ ...chosen, volumeScale: vol * 0.92 })
    } catch {
      // Abaikan jika audio dibatasi browser
    }
  }

  /**
   * 9. Kucing Mini saat Digoyang/Digeser: Purring berirama tarik-hembus napas (~26–27.5 Hz AM)
   *    atau "Mraow~" manja panjang (cooldown 0.9 detik).
   */
  function playMiniCatShakeVoice(volumeScale = 0.6, cooldownMs = 900): boolean {
    const vol = Math.max(0, Math.min(1, volumeScale))
    if (vol <= 0.005) return false

    const nowMs = Date.now()
    if (nowMs - lastMiniShakeVoiceAt < cooldownMs) return false
    lastMiniShakeVoiceAt = nowMs

    try {
      const ctx = getSharedAudioContext()
      if (!ctx) return false

      let variant = Math.floor(Math.random() * 3)
      if (variant === lastMiniShakeIndex) variant = (variant + 1) % 3
      lastMiniShakeIndex = variant

      const now = ctx.currentTime

      if (variant !== 2) {
        const duration = 0.84
        const purrFreq = variant === 0 ? 26 : 27.5

        const pulseOsc = ctx.createOscillator()
        pulseOsc.type = 'sawtooth'
        pulseOsc.frequency.setValueAtTime(52, now)
        pulseOsc.frequency.linearRampToValueAtTime(58, now + 0.36)
        pulseOsc.frequency.linearRampToValueAtTime(48, now + duration)

        const subOsc = ctx.createOscillator()
        subOsc.type = 'triangle'
        subOsc.frequency.setValueAtTime(26.5, now)

        const noiseLen = Math.max(1, Math.floor(ctx.sampleRate * (duration + 0.05)))
        const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate)
        const noiseData = noiseBuf.getChannelData(0)
        if (noiseData) {
          for (let i = 0; i < noiseLen; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * 0.45
          }
        }
        const noiseSource = ctx.createBufferSource()
        noiseSource.buffer = noiseBuf
        const noiseGain = ctx.createGain()
        noiseGain.gain.setValueAtTime(0.32, now)

        const throatFilter = ctx.createBiquadFilter()
        throatFilter.type = 'lowpass'
        throatFilter.frequency.setValueAtTime(310, now)
        throatFilter.Q.setValueAtTime(1.6, now)

        const resonance = ctx.createBiquadFilter()
        resonance.type = 'peaking'
        resonance.frequency.setValueAtTime(155, now)
        resonance.Q.setValueAtTime(2.2, now)
        resonance.gain.setValueAtTime(6, now)

        const purrModGain = ctx.createGain()
        purrModGain.gain.setValueAtTime(0.55, now)
        const purrLfo = ctx.createOscillator()
        purrLfo.type = 'sine'
        purrLfo.frequency.setValueAtTime(purrFreq, now)
        const purrLfoDepth = ctx.createGain()
        purrLfoDepth.gain.setValueAtTime(0.42, now)
        purrLfo.connect(purrLfoDepth)
        purrLfoDepth.connect(purrModGain.gain)

        const breathEnv = ctx.createGain()
        const peak = 0.28 * vol
        breathEnv.gain.setValueAtTime(0.001, now)
        breathEnv.gain.linearRampToValueAtTime(peak * 0.92, now + 0.16)
        breathEnv.gain.linearRampToValueAtTime(peak * 0.42, now + 0.41)
        breathEnv.gain.linearRampToValueAtTime(peak, now + 0.58)
        breathEnv.gain.exponentialRampToValueAtTime(0.0008, now + duration)

        const pulseGain = ctx.createGain()
        pulseGain.gain.setValueAtTime(0.65, now)
        const subGain = ctx.createGain()
        subGain.gain.setValueAtTime(0.45, now)

        pulseOsc.connect(pulseGain)
        subOsc.connect(subGain)
        noiseSource.connect(noiseGain)

        pulseGain.connect(throatFilter)
        subGain.connect(throatFilter)
        noiseGain.connect(throatFilter)

        throatFilter.connect(resonance)
        resonance.connect(purrModGain)
        purrModGain.connect(breathEnv)
        breathEnv.connect(ctx.destination)

        pulseOsc.start(now)
        subOsc.start(now)
        noiseSource.start(now)
        purrLfo.start(now)

        const stopAt = now + duration + 0.04
        pulseOsc.stop(stopAt)
        subOsc.stop(stopAt)
        noiseSource.stop(stopAt)
        purrLfo.stop(stopAt)
      } else {
        synthesizeFormantMeow({
          pitchCurve: [[0, 660], [0.16, 760], [0.46, 855], [0.76, 650], [1, 610]],
          duration: 0.52,
          f1: [320, 980, 510],
          f2: [1150, 2180, 960],
          volumeScale: vol * 0.9,
          vibratoRate: 7.2,
          vibratoDepth: 15,
          openingTrill: true,
        })
      }

      return true
    } catch {
      return false
    }
  }

  /**
   * 10. Maskot Buku Catatan Kucing: kertas dibalik (~80ms) + "Mew!" pendek renyah (4 variasi ~580–750 Hz)
   */
  function playNotebookCatMew(volumeScale = 0.6) {
    const vol = Math.max(0, Math.min(1, volumeScale))
    if (vol <= 0.005) return

    try {
      const ctx = getSharedAudioContext()
      if (!ctx) return

      const now = ctx.currentTime
      const flipDur = 0.085
      const flipLen = Math.max(1, Math.floor(ctx.sampleRate * flipDur))
      const flipBuf = ctx.createBuffer(1, flipLen, ctx.sampleRate)
      const flipData = flipBuf.getChannelData(0)
      if (flipData) {
        for (let i = 0; i < flipLen; i++) {
          flipData[i] = Math.random() * 2 - 1
        }
      }

      const flipSource = ctx.createBufferSource()
      flipSource.buffer = flipBuf

      const flipFilter = ctx.createBiquadFilter()
      flipFilter.type = 'bandpass'
      flipFilter.Q.setValueAtTime(1.5, now)
      flipFilter.frequency.setValueAtTime(1650, now)
      flipFilter.frequency.exponentialRampToValueAtTime(3400, now + flipDur)

      const flipGain = ctx.createGain()
      const flipPeak = 0.16 * vol
      flipGain.gain.setValueAtTime(0.001, now)
      flipGain.gain.exponentialRampToValueAtTime(flipPeak, now + 0.015)
      flipGain.gain.exponentialRampToValueAtTime(0.0008, now + flipDur)

      flipSource.connect(flipFilter)
      flipFilter.connect(flipGain)
      flipGain.connect(ctx.destination)
      flipSource.start(now)
      flipSource.stop(now + flipDur + 0.01)

      const variations: Array<Omit<FormantMeowOptions, 'volumeScale' | 'startDelay'>> = [
        {
          pitchCurve: [[0, 600], [0.22, 705], [0.58, 735], [1, 610]],
          duration: 0.29,
          f1: [320, 940, 540],
          f2: [1160, 2180, 1080],
          vibratoRate: 6.8,
          vibratoDepth: 9,
        },
        {
          pitchCurve: [[0, 585], [0.2, 675], [0.56, 745], [0.85, 720], [1, 680]],
          duration: 0.31,
          f1: [315, 960, 570],
          f2: [1180, 2240, 1180],
          vibratoRate: 7.2,
          vibratoDepth: 10,
        },
        {
          pitchCurve: [[0, 625], [0.24, 730], [0.6, 710], [1, 595]],
          duration: 0.27,
          f1: [325, 910, 520],
          f2: [1140, 2120, 1020],
          vibratoRate: 6.5,
          vibratoDepth: 8,
        },
        {
          pitchCurve: [[0, 595], [0.18, 690], [0.5, 750], [0.82, 665], [1, 605]],
          duration: 0.33,
          f1: [320, 950, 535],
          f2: [1150, 2200, 1060],
          vibratoRate: 7.0,
          vibratoDepth: 10,
          openingTrill: true,
        },
      ]

      let idx = Math.floor(Math.random() * variations.length)
      if (idx === lastNotebookMeowIndex) idx = (idx + 1) % variations.length
      lastNotebookMeowIndex = idx
      const chosen = variations[idx] ?? variations[0]!

      synthesizeFormantMeow({
        ...chosen,
        volumeScale: vol * 0.94,
        startDelay: 0.065,
      })
    } catch {
      // Abaikan jika audio dibatasi browser
    }
  }

  /**
   * 11. Dengkuran Kontinu (Continuous Purring) saat Kucing Sedang Di-Pet-Pet / Dielus:
   *     - Gelombang frekuensi rendah (~52 Hz + 26 Hz) + tekstur napas halus lewat low-pass lembut
   *     - Modulasi amplitudo ~26.5 Hz (getaran purr) + ritme tarik-hembus napas (~0.55 Hz)
   *     - Fade-in hangat saat mulai dielus dan fade-out perlahan saat elusan berhenti.
   */
  function startCatPurr(volumeScale = 0.6) {
    const vol = Math.max(0, Math.min(1, volumeScale))
    if (vol <= 0.005) {
      stopCatPurr()
      return
    }

    try {
      const ctx = getSharedAudioContext()
      if (!ctx) return

      if (purrStopTimer) {
        clearTimeout(purrStopTimer)
        purrStopTimer = null
      }

      // Jika purr sudah aktif, cukup perbarui volumenya dengan mulus
      if (activePurrNodes) {
        const targetGain = 0.25 * vol
        activePurrNodes.masterGain.gain.cancelScheduledValues(ctx.currentTime)
        activePurrNodes.masterGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.08)
        return
      }

      const now = ctx.currentTime

      const pulseOsc = ctx.createOscillator()
      pulseOsc.type = 'sawtooth'
      pulseOsc.frequency.setValueAtTime(53, now)

      const subOsc = ctx.createOscillator()
      subOsc.type = 'triangle'
      subOsc.frequency.setValueAtTime(26.5, now)

      // Buffer noise 2 detik yang di-loop sebagai tekstur napas dengkuran lembut
      const noiseLen = Math.max(1, Math.floor(ctx.sampleRate * 2))
      const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate)
      const noiseData = noiseBuf.getChannelData(0)
      if (noiseData) {
        for (let i = 0; i < noiseLen; i++) {
          noiseData[i] = (Math.random() * 2 - 1) * 0.38
        }
      }
      const noiseSource = ctx.createBufferSource()
      noiseSource.buffer = noiseBuf
      noiseSource.loop = true

      const pulseGain = ctx.createGain()
      pulseGain.gain.setValueAtTime(0.62, now)
      const subGain = ctx.createGain()
      subGain.gain.setValueAtTime(0.45, now)
      const noiseGain = ctx.createGain()
      noiseGain.gain.setValueAtTime(0.28, now)

      const throatFilter = ctx.createBiquadFilter()
      throatFilter.type = 'lowpass'
      throatFilter.frequency.setValueAtTime(295, now)
      throatFilter.Q.setValueAtTime(1.5, now)

      const warmthPeak = ctx.createBiquadFilter()
      warmthPeak.type = 'peaking'
      warmthPeak.frequency.setValueAtTime(150, now)
      warmthPeak.Q.setValueAtTime(2.0, now)
      warmthPeak.gain.setValueAtTime(5.5, now)

      // LFO 1: Getaran purr alami ~26.5 Hz
      const purrModGain = ctx.createGain()
      purrModGain.gain.setValueAtTime(0.58, now)
      const purrLfo = ctx.createOscillator()
      purrLfo.type = 'sine'
      purrLfo.frequency.setValueAtTime(26.5, now)
      const purrLfoDepth = ctx.createGain()
      purrLfoDepth.gain.setValueAtTime(0.38, now)
      purrLfo.connect(purrLfoDepth)
      purrLfoDepth.connect(purrModGain.gain)

      // LFO 2: Irama tarik-dan-hembus napas lembut (~0.55 Hz, ~1.8 detik per siklus)
      const breathModGain = ctx.createGain()
      breathModGain.gain.setValueAtTime(0.76, now)
      const breathLfo = ctx.createOscillator()
      breathLfo.type = 'sine'
      breathLfo.frequency.setValueAtTime(0.55, now)
      const breathLfoDepth = ctx.createGain()
      breathLfoDepth.gain.setValueAtTime(0.24, now)
      breathLfo.connect(breathLfoDepth)
      breathLfoDepth.connect(breathModGain.gain)

      const masterGain = ctx.createGain()
      masterGain.gain.setValueAtTime(0.0008, now)
      masterGain.gain.linearRampToValueAtTime(0.25 * vol, now + 0.24)

      pulseOsc.connect(pulseGain)
      subOsc.connect(subGain)
      noiseSource.connect(noiseGain)

      pulseGain.connect(throatFilter)
      subGain.connect(throatFilter)
      noiseGain.connect(throatFilter)

      throatFilter.connect(warmthPeak)
      warmthPeak.connect(purrModGain)
      purrModGain.connect(breathModGain)
      breathModGain.connect(masterGain)
      masterGain.connect(ctx.destination)

      pulseOsc.start(now)
      subOsc.start(now)
      noiseSource.start(now)
      purrLfo.start(now)
      breathLfo.start(now)

      activePurrNodes = {
        pulseOsc,
        subOsc,
        noiseSource,
        purrLfo,
        breathLfo,
        masterGain,
      }
    } catch {
      // Abaikan jika browser belum membuka AudioContext
    }
  }

  /** Hentikan dengkuran perlahan (smooth fade-out ~380ms) saat elusan berhenti atau web di-mute */
  function stopCatPurr() {
    if (!activePurrNodes) return
    const nodes = activePurrNodes
    activePurrNodes = null

    try {
      const ctx = getSharedAudioContext()
      if (ctx) {
        const now = ctx.currentTime
        nodes.masterGain.gain.cancelScheduledValues(now)
        nodes.masterGain.gain.setValueAtTime(Math.max(0.0008, nodes.masterGain.gain.value), now)
        nodes.masterGain.gain.linearRampToValueAtTime(0.0005, now + 0.36)
      }
    } catch {
      // Abaikan
    }

    if (purrStopTimer) clearTimeout(purrStopTimer)
    purrStopTimer = setTimeout(() => {
      purrStopTimer = null
      try {
        nodes.pulseOsc.stop()
        nodes.subOsc.stop()
        nodes.noiseSource.stop()
        nodes.purrLfo.stop()
        nodes.breathLfo.stop()
      } catch {
        // Abaikan jika sudah berhenti
      }
    }, 400)
  }

  /**
   * 12. Suara Kucing Kesal / Protes (Annoyed Meow-Growl) saat Kucing Mini Digoyang Cepat:
   *     - Kombinasi engeongan protes pendek bernada tajam (formant meow cepat)
   *     - Diakhiri geraman tenggorokan lembut (soft low trill/growl)
   *     - Cooldown ~0.88 detik agar tidak bertumpuk bising saat digoyang cepat.
   */
  function playMiniCatAnnoyedGrowl(volumeScale = 0.6, cooldownMs = 880): boolean {
    const vol = Math.max(0, Math.min(1, volumeScale))
    if (vol <= 0.005) return false

    const nowMs = Date.now()
    if (nowMs - lastMiniAnnoyedAt < cooldownMs) return false
    lastMiniAnnoyedAt = nowMs

    try {
      const ctx = getSharedAudioContext()
      if (!ctx) return false

      let variant = Math.floor(Math.random() * 3)
      if (variant === lastMiniAnnoyedIndex) variant = (variant + 1) % 3
      lastMiniAnnoyedIndex = variant

      // Bagian 1: Engeongan protes pendek & tajam (formant meow cepat)
      const protestCurves: Array<Array<[number, number]>> = [
        [[0, 740], [0.16, 955], [0.48, 860], [0.78, 640], [1, 510]],
        [[0, 780], [0.2, 990], [0.55, 810], [0.85, 610], [1, 520]],
        [[0, 700], [0.15, 920], [0.42, 965], [0.75, 680], [1, 535]],
      ]
      synthesizeFormantMeow({
        pitchCurve: protestCurves[variant] ?? protestCurves[0]!,
        duration: 0.27,
        f1: [330, 1080, 560],
        f2: [1220, 2450, 1120],
        volumeScale: vol * 0.92,
        vibratoRate: 11.5,
        vibratoDepth: 22,
        openingTrill: true,
      })

      // Bagian 2: Geraman tenggorokan lembut (soft low trill/growl) menyambung di akhir
      const now = ctx.currentTime + 0.21
      const growlDur = 0.26

      const growlOsc = ctx.createOscillator()
      growlOsc.type = 'sawtooth'
      growlOsc.frequency.setValueAtTime(148 - variant * 10, now)
      growlOsc.frequency.exponentialRampToValueAtTime(102, now + growlDur)

      // Trill tenggorokan lembut (~34 Hz)
      const trillLfo = ctx.createOscillator()
      const trillDepth = ctx.createGain()
      trillLfo.type = 'sine'
      trillLfo.frequency.setValueAtTime(34, now)
      trillDepth.gain.setValueAtTime(28, now)
      trillLfo.connect(trillDepth)
      trillDepth.connect(growlOsc.frequency)

      const growlFilter = ctx.createBiquadFilter()
      growlFilter.type = 'bandpass'
      growlFilter.frequency.setValueAtTime(420, now)
      growlFilter.frequency.linearRampToValueAtTime(280, now + growlDur)
      growlFilter.Q.setValueAtTime(2.2, now)

      const growlGain = ctx.createGain()
      const peak = 0.22 * vol
      growlGain.gain.setValueAtTime(0.0008, now)
      growlGain.gain.exponentialRampToValueAtTime(peak, now + 0.045)
      growlGain.gain.exponentialRampToValueAtTime(peak * 0.72, now + growlDur * 0.65)
      growlGain.gain.exponentialRampToValueAtTime(0.0008, now + growlDur)

      growlOsc.connect(growlFilter)
      growlFilter.connect(growlGain)
      growlGain.connect(ctx.destination)

      growlOsc.start(now)
      trillLfo.start(now)
      growlOsc.stop(now + growlDur + 0.03)
      trillLfo.stop(now + growlDur + 0.03)

      return true
    } catch {
      return false
    }
  }

  /**
   * 13. 8 Variasi Suara Meow Ringan & Berbeda untuk Perintilan Kucing Dekoratif (Mini Cat Ornaments):
   *     - 0: "Miiw!" tinggi ceria
   *     - 1: "Meow~" sedang hangat
   *     - 2: "Mrrp!" trill pendek ceria
   *     - 3: "Mew..." lembut mengantuk
   *     - 4: "Mew?" nada penasaran naik
   *     - 5: "Mi-ew!" kicau dua puncak imut
   *     - 6: "Mrow~" nada rendah santai
   *     - 7: "Prr-mew~" dengkuran halus ke nada lembut
   *     Menghormati volume/mute utama aplikasi.
   */
  function playOrnamentCatMeow(voiceIndex = 0, volumeScale = 0.55): boolean {
    const vol = Math.max(0, Math.min(1, volumeScale))
    if (vol <= 0.005) return false

    const idx = ((Math.floor(voiceIndex) % 8) + 8) % 8
    const presets: FormantMeowOptions[] = [
      // 0: Tinggi ceria ("Miiw!")
      {
        pitchCurve: [[0, 760], [0.22, 1020], [0.65, 920], [1, 740]],
        duration: 0.24,
        f1: [420, 1180, 620],
        f2: [1600, 2650, 1520],
        volumeScale: vol * 0.72,
        vibratoRate: 8,
        vibratoDepth: 12,
      },
      // 1: Sedang manis ("Meow~")
      {
        pitchCurve: [[0, 520], [0.28, 690], [0.7, 610], [1, 470]],
        duration: 0.34,
        f1: [360, 920, 520],
        f2: [1350, 2220, 1280],
        volumeScale: vol * 0.76,
        vibratoRate: 6.2,
        vibratoDepth: 10,
      },
      // 2: Mrrp pendek ("Mrrp!")
      {
        pitchCurve: [[0, 560], [0.35, 780], [0.75, 860], [1, 820]],
        duration: 0.2,
        f1: [340, 860, 640],
        f2: [1280, 2150, 1680],
        volumeScale: vol * 0.74,
        vibratoRate: 14,
        vibratoDepth: 18,
        openingTrill: true,
      },
      // 3: Mew lembut mengantuk ("Mew...")
      {
        pitchCurve: [[0, 620], [0.3, 660], [0.78, 530], [1, 440]],
        duration: 0.38,
        f1: [380, 820, 480],
        f2: [1420, 2040, 1200],
        volumeScale: vol * 0.64,
        vibratoRate: 4.8,
        vibratoDepth: 7,
      },
      // 4: Nada penasaran naik ("Mew?")
      {
        pitchCurve: [[0, 540], [0.35, 630], [0.72, 820], [1, 940]],
        duration: 0.28,
        f1: [350, 960, 740],
        f2: [1320, 2340, 1820],
        volumeScale: vol * 0.72,
        vibratoRate: 7,
        vibratoDepth: 10,
      },
      // 5: Kicau dua puncak imut ("Mi-ew!")
      {
        pitchCurve: [[0, 680], [0.24, 920], [0.48, 700], [0.74, 880], [1, 640]],
        duration: 0.31,
        f1: [400, 1100, 580],
        f2: [1520, 2500, 1420],
        volumeScale: vol * 0.74,
        vibratoRate: 9,
        vibratoDepth: 12,
      },
      // 6: Rendah santai hangat ("Mrow~")
      {
        pitchCurve: [[0, 410], [0.25, 530], [0.68, 490], [1, 370]],
        duration: 0.36,
        f1: [300, 760, 430],
        f2: [1120, 1880, 1080],
        volumeScale: vol * 0.78,
        vibratoRate: 5.5,
        vibratoDepth: 9,
        openingTrill: true,
      },
      // 7: Panggilan halus berkilau ("Prr-mew~")
      {
        pitchCurve: [[0, 600], [0.22, 740], [0.58, 860], [1, 690]],
        duration: 0.3,
        f1: [370, 1040, 600],
        f2: [1450, 2420, 1480],
        volumeScale: vol * 0.7,
        vibratoRate: 12,
        vibratoDepth: 15,
        openingTrill: true,
      },
    ]

    try {
      const ctx = getSharedAudioContext()
      if (!ctx) return false
      synthesizeFormantMeow(presets[idx] ?? presets[0]!)
      return true
    } catch {
      return false
    }
  }

  return {
    getSharedAudioContext,
    playBellChime,
    playPopTing,
    playVictoryMelody,
    playAlarmMelody,
    playGameCatch,
    playGameZap,
    playMainCatMeow,
    playMiniCatTapMew,
    playMiniCatShakeVoice,
    playNotebookCatMew,
    playOrnamentCatMeow,
    startCatPurr,
    stopCatPurr,
    playMiniCatAnnoyedGrowl,
  }
}
