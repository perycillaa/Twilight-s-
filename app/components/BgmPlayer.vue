<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useBackgroundResilience } from '~/composables/useBackgroundResilience'
import {
  type AmbientChannelId,
  useTwilightStorage,
} from '~/composables/useTwilightStorage'

// Tab sumber musik utama: Radio Online (11 stasiun) atau YouTube Lo-Fi Live Stream
// Sementara Suara Alam (Hujan Lembut & Brown Noise) menjadi Ambient Sound Mixer independen
// yang bisa dinyalakan BERSAMAAN dengan Radio maupun YouTube!
type MusicTab = 'radio' | 'youtube'

interface YoutubeStream {
  id: string
  label: string
  videoId: string
}

// Daftar YouTube Lo-Fi Live Stream yang aktif & bisa di-embed
const YOUTUBE_STREAMS: YoutubeStream[] = [
  { id: 'lofi-study', label: 'Lofi Study 📚', videoId: 'rFZHOHl-L8A' },
  { id: 'lofi-sleep', label: 'Sleep Lo-Fi 🌌', videoId: 'VAlMDl00mYY' },
  { id: 'synthwave', label: 'Synthwave 🌆', videoId: '4xDzrJKXOOY' },
  { id: 'asian-lofi', label: 'Asian Lo-Fi ⛩️', videoId: '1Tl2FtV06qo' },
]

interface RadioChannel {
  id: string
  name: string
  shortName: string
  subtitle: string
  moodIcon: string
  url: string
  fallbackUrl?: string
}

// Total 11 stasiun Radio Online: perpaduan lo-fi tenang, fokus mendalam, dan nuansa ceria hangat
const RADIO_CHANNELS: RadioChannel[] = [
  {
    id: 'groove-salad',
    name: 'SomaFM Groove Salad',
    shortName: 'Groove Salad',
    subtitle: 'Tenang • Ambient & Chill Beats',
    moodIcon: '🍃',
    url: '/api/bgm/groove-salad',
  },
  {
    id: 'drone-zone',
    name: 'SomaFM Drone Zone',
    shortName: 'Drone Zone',
    subtitle: 'Fokus • Atmospheric Space Lo-Fi',
    moodIcon: '🌙',
    url: '/api/bgm/drone-zone',
  },
  {
    id: 'lush',
    name: 'SomaFM Lush',
    shortName: 'SomaFM Lush',
    subtitle: 'Lembut • Dreamy Mellow & Chillout',
    moodIcon: '🌸',
    url: '/api/bgm/lush',
  },
  {
    id: 'vaporwaves',
    name: 'SomaFM Vaporwaves',
    shortName: 'Vaporwaves',
    subtitle: 'Santai • Retro Pastel Vaporwave',
    moodIcon: '🎀',
    url: '/api/bgm/vaporwaves',
  },
  {
    id: 'flux-chillhop',
    name: 'FluxFM Chillhop',
    shortName: 'Chillhop',
    subtitle: 'Fokus • Warm Lo-Fi Hip-Hop Radio',
    moodIcon: '🎧',
    url: 'https://streams.fluxfm.de/Chillhop/mp3-128/streams.fluxfm.de/',
  },
  {
    id: 'nightride-chillsynth',
    name: 'Nightride Chillsynth',
    shortName: 'Chillsynth',
    subtitle: 'Malam • Dreamy Night Synthwave',
    moodIcon: '💜',
    url: 'https://stream.nightride.fm/chillsynth.mp3',
  },
  {
    id: 'bossa',
    name: 'SomaFM Bossa Beyond',
    shortName: 'Bossa Café',
    subtitle: 'Ceria & Hangat • Sunny Bossa Nova',
    moodIcon: '☀️',
    url: '/api/bgm/bossa',
  },
  {
    id: 'fluid',
    name: 'SomaFM Fluid',
    shortName: 'Fluid Beats',
    subtitle: 'Ceria & Fokus • Instrumental Future Soul',
    moodIcon: '✨',
    url: '/api/bgm/fluid',
  },
  {
    id: 'beat-blender',
    name: 'SomaFM Beat Blender',
    shortName: 'Beat Blender',
    subtitle: 'Ceria & Santai • Upbeat Downtempo Chill',
    moodIcon: '🎵',
    url: '/api/bgm/beat-blender',
  },
  {
    id: 'deep-space',
    name: 'SomaFM Deep Space One',
    shortName: 'Deep Space',
    subtitle: 'Sangat Tenang • Starry Focus Ambient',
    moodIcon: '🌌',
    url: '/api/bgm/deep-space',
  },
  {
    id: 'flux-lounge',
    name: 'FluxFM Lounge',
    shortName: 'Cozy Lounge',
    subtitle: 'Tenang & Nyaman • Soft Café Lounge',
    moodIcon: '☕',
    url: 'https://streams.fluxfm.de/Lounge/mp3-128/streams.fluxfm.de/',
  },
  // --- 5 Stasiun Tambahan: Menenangkan & Bernuansa Asik ---
  {
    id: 'flux-jazz',
    name: 'FluxFM Jazzradio',
    shortName: 'Smooth Jazz',
    subtitle: 'Menenangkan & Hangat • Smooth Night Jazz',
    moodIcon: '🎷',
    url: 'https://streams.fluxfm.de/Jazzradio/mp3-128/streams.fluxfm.de/',
  },
  {
    id: 'flux-neofm',
    name: 'FluxFM NeoFM',
    shortName: 'Piano Calm',
    subtitle: 'Menenangkan • Soft Neoclassical & Piano',
    moodIcon: '🎹',
    url: 'https://streams.fluxfm.de/NeoFM/mp3-128/streams.fluxfm.de/',
  },
  {
    id: 'secret-agent',
    name: 'SomaFM Secret Agent',
    shortName: 'Secret Lounge',
    subtitle: 'Asik & Keren • Stylish Downtempo Lounge',
    moodIcon: '🕶️',
    url: '/api/bgm/secret-agent',
  },
  {
    id: 'space-station',
    name: 'SomaFM Space Station',
    shortName: 'Space Groove',
    subtitle: 'Asik & Tenang • Mid-Tempo Space Chill',
    moodIcon: '🪐',
    url: '/api/bgm/space-station',
  },
  {
    id: 'nightride-neon',
    name: 'Nightride / Synthwave',
    shortName: 'Nightride / Synthwave',
    subtitle: 'Synthwave • Neon Night Drive Beats',
    moodIcon: '🌃',
    url: 'https://stream.nightride.fm/nightride.mp3',
    fallbackUrl: 'https://ice1.somafm.com/defcon-128-mp3',
  },
]

const {
  isBgmPlaying,
  isRainAmbientOn,
  isMasterAudioMuted,
  masterAudioVolume,
  ambientMixerSettings,
  ambientMixerVersion,
  bgmPlayToggleSignal,
  bgmMuteToggleSignal,
  updateAmbientChannel,
  showMiniToast,
} = useTwilightStorage()
const {
  updateMediaSessionBgm,
  registerMediaSessionHandlers,
  resumeKeepAliveIfNeeded,
} = useBackgroundResilience()

// --- State Sumber Musik Utama (Radio Online / YouTube Lo-Fi) ---
const activeTab = ref<MusicTab>('radio')
const selectedYoutubeId = ref<string>(YOUTUBE_STREAMS[0]?.videoId ?? 'rFZHOHl-L8A')
const customYoutubeInput = ref<string>('')
const youtubeInputError = ref<string>('')
const selectedRadioId = ref<string>(RADIO_CHANNELS[0]?.id ?? 'groove-salad')

const audioRef = ref<HTMLAudioElement | null>(null)
const youtubeIframeRef = ref<HTMLIFrameElement | null>(null)
const youtubeLoadMuteFlag = ref<0 | 1>(0)
let youtubeLoadSyncTimers: ReturnType<typeof setTimeout>[] = []
const isRadioPlaying = ref<boolean>(false)
const isBuffering = ref<boolean>(false)
const radioVolume = ref<number>(60)
const isRadioMuted = ref<boolean>(false)
const errorMessage = ref<string>('')
const isIntentionalStop = ref<boolean>(false)
const hasTriedFallbackUrl = ref<boolean>(false)

// --- State 5 Saluran Ambient Sound Mixer Independen (Web Audio API - 100% Offline & Persisten) ---
const isRainEnabled = computed<boolean>(() => ambientMixerSettings.value.rain.enabled)
const rainVolume = computed<number>({
  get: () => ambientMixerSettings.value.rain.volume,
  set: val => updateAmbientChannel('rain', { volume: val }),
})

const isBrownEnabled = computed<boolean>(() => ambientMixerSettings.value.brown.enabled)
const brownVolume = computed<number>({
  get: () => ambientMixerSettings.value.brown.volume,
  set: val => updateAmbientChannel('brown', { volume: val }),
})

const isCampfireEnabled = computed<boolean>(() => ambientMixerSettings.value.campfire.enabled)
const campfireVolume = computed<number>({
  get: () => ambientMixerSettings.value.campfire.volume,
  set: val => updateAmbientChannel('campfire', { volume: val }),
})

const isNightWindEnabled = computed<boolean>(() => ambientMixerSettings.value.nightWind.enabled)
const nightWindVolume = computed<number>({
  get: () => ambientMixerSettings.value.nightWind.volume,
  set: val => updateAmbientChannel('nightWind', { volume: val }),
})

const isStreamEnabled = computed<boolean>(() => ambientMixerSettings.value.stream.enabled)
const streamVolume = computed<number>({
  get: () => ambientMixerSettings.value.stream.volume,
  set: val => updateAmbientChannel('stream', { volume: val }),
})

// Node Web Audio API terpisah untuk masing-masing layer suara alam (terhubung lewat mixerMasterGain agar patuh mute utama)
let mixerCtx: AudioContext | null = null
let mixerMasterGain: GainNode | null = null

let rainSource: AudioBufferSourceNode | null = null
let rainGain: GainNode | null = null

let brownSource: AudioBufferSourceNode | null = null
let brownGain: GainNode | null = null

let campfireSource: AudioBufferSourceNode | null = null
let campfireLfo: OscillatorNode | null = null
let campfireGain: GainNode | null = null
let campfireCrackleTimer: ReturnType<typeof setTimeout> | null = null
let campfireCrackleBuffer: AudioBuffer | null = null

let nightWindSource: AudioBufferSourceNode | null = null
let nightWindFreqLfo: OscillatorNode | null = null
let nightWindAmpLfo: OscillatorNode | null = null
let nightWindGain: GainNode | null = null

let streamSource: AudioBufferSourceNode | null = null
let streamLfo1: OscillatorNode | null = null
let streamLfo2: OscillatorNode | null = null
let streamGain: GainNode | null = null

const currentRadio = computed<RadioChannel>(() => {
  return RADIO_CHANNELS.find(c => c.id === selectedRadioId.value) ?? RADIO_CHANNELS[0]!
})

// URL embed YouTube dengan enablejsapi=1 agar mendukung postMessage mute/unMute tanpa reload iframe
const youtubeEmbedUrl = computed<string>(() => {
  const originParam =
    import.meta.client && window.location?.origin
      ? `&origin=${encodeURIComponent(window.location.origin)}`
      : ''
  const muteParam = youtubeLoadMuteFlag.value === 1 ? '&mute=1' : ''
  return `https://www.youtube.com/embed/${selectedYoutubeId.value}?rel=0&modestbranding=1&enablejsapi=1${originParam}${muteParam}`
})

const youtubeWatchUrl = computed<string>(() => {
  return `https://www.youtube.com/watch?v=${selectedYoutubeId.value}`
})

/** Kirim perintah kontrol langsung ke YouTube Lo-Fi iframe via postMessage (enablejsapi=1) */
function sendYoutubeCommand(func: 'mute' | 'unMute' | 'setVolume', args: unknown[] = []) {
  const win = youtubeIframeRef.value?.contentWindow
  if (!win) return
  try {
    win.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      '*',
    )
  } catch {
    // Abaikan jika iframe belum siap menerima pesan
  }
}

/** Sinkronkan status mute/unmute terbaru ke iframe YouTube saat baru selesai dimuat */
function clearYoutubeLoadSyncTimers() {
  for (const timer of youtubeLoadSyncTimers) {
    clearTimeout(timer)
  }
  youtubeLoadSyncTimers = []
}

function handleYoutubeIframeLoad() {
  clearYoutubeLoadSyncTimers()
  const win = youtubeIframeRef.value?.contentWindow
  if (win) {
    try {
      win.postMessage(JSON.stringify({ event: 'listening' }), '*')
    } catch {
      // Abaikan
    }
  }
  const syncNow = () => {
    if (isRadioMuted.value) {
      sendYoutubeCommand('mute')
    } else {
      sendYoutubeCommand('unMute')
    }
  }
  syncNow()
  // Kirim ulang singkat setelah player internal YouTube selesai inisialisasi
  youtubeLoadSyncTimers.push(setTimeout(syncNow, 450))
  youtubeLoadSyncTimers.push(setTimeout(syncNow, 1150))
}

const effectiveRadioVolume = computed<number>(() =>
  isRadioMuted.value ? 0 : radioVolume.value / 100,
)

// Kaset pita berputar jika radio ATAU salah satu dari 5 suara alam sedang menyala
const isAnyAudioSpinning = computed<boolean>(() => {
  return (
    isRadioPlaying.value ||
    isRainEnabled.value ||
    isBrownEnabled.value ||
    isCampfireEnabled.value ||
    isNightWindEnabled.value ||
    isStreamEnabled.value
  )
})

const activeAmbientLabels = computed<string[]>(() => {
  const labels: string[] = []
  if (isRainEnabled.value) labels.push('Hujan')
  if (isBrownEnabled.value) labels.push('Ombak')
  if (isCampfireEnabled.value) labels.push('Api Unggun')
  if (isNightWindEnabled.value) labels.push('Angin Malam')
  if (isStreamEnabled.value) labels.push('Gemericik Air')
  return labels
})

// Sinkronkan status Radio & Ambient Mixer ke Kartu Media Session (Lock Screen HP & Windows Media Overlay)
watch(
  [isRadioPlaying, currentRadio, activeAmbientLabels, isRadioMuted],
  () => {
    updateMediaSessionBgm({
      isRadioPlaying: isRadioPlaying.value,
      radioTitle: currentRadio.value.name,
      radioSubtitle: currentRadio.value.subtitle,
      activeAmbientLabels: activeAmbientLabels.value,
      isMuted: isRadioMuted.value,
    })
  },
  { immediate: true },
)

// Sinkronkan status sakelar Hujan Lembut dengan efek visual hujan di latar belakang
watch(
  isRainEnabled,
  (enabled) => {
    isRainAmbientOn.value = enabled
  },
  { immediate: true },
)

// Sinkronkan status BGM ke maskot kucing agar memakai kacamata & mengangguk saat suara aktif
watch([isAnyAudioSpinning, activeTab], () => {
  isBgmPlaying.value = isAnyAudioSpinning.value || activeTab.value === 'youtube'
})

// Update volume radio HTML5, sinkronkan mute utama ke YouTube Lo-Fi, seluruh saluran Ambient Mixer & kedua kucing
watch(
  [isRadioMuted, radioVolume],
  ([muted, vol]) => {
    isMasterAudioMuted.value = muted
    masterAudioVolume.value = Math.max(0, Math.min(1, vol / 100))
    if (mixerMasterGain && mixerCtx) {
      mixerMasterGain.gain.setTargetAtTime(muted ? 0 : 1, mixerCtx.currentTime, 0.06)
    }
    if (import.meta.client && activeTab.value === 'youtube') {
      sendYoutubeCommand(muted ? 'mute' : 'unMute')
    }
  },
  { immediate: true },
)

watch(effectiveRadioVolume, (vol) => {
  if (audioRef.value) {
    audioRef.value.volume = vol
  }
})

// Update volume tiap saluran Ambient Sound Mixer secara real-time
watch(rainVolume, (vol) => {
  if (rainGain && mixerCtx && isRainEnabled.value) {
    rainGain.gain.setTargetAtTime((vol / 100) * 0.36, mixerCtx.currentTime, 0.08)
  }
})

watch(brownVolume, (vol) => {
  if (brownGain && mixerCtx && isBrownEnabled.value) {
    brownGain.gain.setTargetAtTime((vol / 100) * 0.42, mixerCtx.currentTime, 0.08)
  }
})

watch(campfireVolume, (vol) => {
  if (campfireGain && mixerCtx && isCampfireEnabled.value) {
    campfireGain.gain.setTargetAtTime((vol / 100) * 0.45, mixerCtx.currentTime, 0.08)
  }
})

watch(nightWindVolume, (vol) => {
  if (nightWindGain && mixerCtx && isNightWindEnabled.value) {
    nightWindGain.gain.setTargetAtTime((vol / 100) * 0.44, mixerCtx.currentTime, 0.08)
  }
})

watch(streamVolume, (vol) => {
  if (streamGain && mixerCtx && isStreamEnabled.value) {
    streamGain.gain.setTargetAtTime((vol / 100) * 0.38, mixerCtx.currentTime, 0.08)
  }
})

// --- LOGIKA AMBIENT SOUND MIXER (5 Saluran 100% Offline via Web Audio API) ---

/** Pastikan AudioContext & Master Gain mixer siap dipakai dan patuh terhadap tombol mute utama */
function ensureMixerContext(): AudioContext | null {
  if (!import.meta.client) return null
  if (!mixerCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return null
    mixerCtx = new AudioCtx()
  }
  if (!mixerMasterGain) {
    mixerMasterGain = mixerCtx.createGain()
    mixerMasterGain.gain.setValueAtTime(isRadioMuted.value ? 0 : 1, mixerCtx.currentTime)
    mixerMasterGain.connect(mixerCtx.destination)
  }
  if (mixerCtx.state === 'suspended') {
    mixerCtx.resume().catch(() => {})
  }
  return mixerCtx
}

/** Mulai layer 1: Hujan Lembut (Rain Ambient) */
function startRainLayer() {
  const ctx = ensureMixerContext()
  if (!ctx || !mixerMasterGain) return
  stopRainLayer()

  const bufferSize = ctx.sampleRate * 4
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate)

  for (let ch = 0; ch < 2; ch++) {
    const output = buffer.getChannelData(ch)
    let b0 = 0
    let b1 = 0
    let b2 = 0
    let b3 = 0
    let b4 = 0
    let b5 = 0
    let b6 = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.96900 * b2 + white * 0.1538520
      b3 = 0.86650 * b3 + white * 0.3104856
      b4 = 0.55000 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.0168980
      const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06
      b6 = white * 0.115926
      const droplet = Math.random() > 0.9985 ? (Math.random() - 0.5) * 0.25 : 0
      output[i] = pink + droplet
    }
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true

  const highpass = ctx.createBiquadFilter()
  highpass.type = 'highpass'
  highpass.frequency.setValueAtTime(220, ctx.currentTime)

  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.setValueAtTime(1650, ctx.currentTime)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.001, ctx.currentTime)
  gain.gain.linearRampToValueAtTime((rainVolume.value / 100) * 0.36, ctx.currentTime + 0.35)

  source.connect(highpass)
  highpass.connect(lowpass)
  lowpass.connect(gain)
  gain.connect(mixerMasterGain)
  source.start()

  rainSource = source
  rainGain = gain
}

function stopRainLayer() {
  if (rainSource) {
    try {
      rainSource.stop()
      rainSource.disconnect()
    } catch {
      // Abaikan jika source sudah berhenti
    }
    rainSource = null
  }
  if (rainGain) {
    rainGain.disconnect()
    rainGain = null
  }
}

/** Mulai layer 2: Brown Noise */
function startBrownLayer() {
  const ctx = ensureMixerContext()
  if (!ctx || !mixerMasterGain) return
  stopBrownLayer()

  const bufferSize = ctx.sampleRate * 4
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate)

  for (let ch = 0; ch < 2; ch++) {
    const output = buffer.getChannelData(ch)
    let lastOut = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      const sample = (lastOut + 0.02 * white) / 1.02
      lastOut = sample
      output[i] = sample * 3.2
    }
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true

  const highpass = ctx.createBiquadFilter()
  highpass.type = 'highpass'
  highpass.frequency.setValueAtTime(45, ctx.currentTime)

  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.setValueAtTime(380, ctx.currentTime)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.001, ctx.currentTime)
  gain.gain.linearRampToValueAtTime((brownVolume.value / 100) * 0.42, ctx.currentTime + 0.35)

  source.connect(highpass)
  highpass.connect(lowpass)
  lowpass.connect(gain)
  gain.connect(mixerMasterGain)
  source.start()

  brownSource = source
  brownGain = gain
}

function stopBrownLayer() {
  if (brownSource) {
    try {
      brownSource.stop()
      brownSource.disconnect()
    } catch {
      // Abaikan jika source sudah berhenti
    }
    brownSource = null
  }
  if (brownGain) {
    brownGain.disconnect()
    brownGain = null
  }
}

/**
 * Mulai layer 3: 🔥 Api Unggun (Campfire)
 * Warm low-pass filtered fire rumble + letupan-letupan halus acak menyerupai kayu terbakar yang hangat
 */
function scheduleCampfireCrackle() {
  if (!mixerCtx || !campfireGain || !isCampfireEnabled.value) return

  const nextDelayMs = 130 + Math.random() * 420
  campfireCrackleTimer = setTimeout(() => {
    if (!mixerCtx || !campfireGain || !isCampfireEnabled.value) return
    const ctx = mixerCtx
    const now = ctx.currentTime

    if (!campfireCrackleBuffer) {
      const len = Math.floor(ctx.sampleRate * 0.035)
      const buf = ctx.createBuffer(1, len, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < len; i++) {
        const decay = Math.exp((-i / len) * 6.5)
        data[i] = (Math.random() * 2 - 1) * decay
      }
      campfireCrackleBuffer = buf
    }

    // 1 hingga 2 letupan mikro lembut berturut-turut agar terasa organik seperti bara kayu
    const burstCount = Math.random() > 0.72 ? 2 : 1
    for (let b = 0; b < burstCount; b++) {
      const offset = b * (0.02 + Math.random() * 0.04)
      const popSrc = ctx.createBufferSource()
      popSrc.buffer = campfireCrackleBuffer
      popSrc.playbackRate.setValueAtTime(0.8 + Math.random() * 0.75, now + offset)

      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.setValueAtTime(1150 + Math.random() * 2100, now + offset)
      bp.Q.setValueAtTime(2.4, now + offset)

      const popGain = ctx.createGain()
      const peak = 0.06 + Math.random() * 0.14
      popGain.gain.setValueAtTime(0.0005, now + offset)
      popGain.gain.linearRampToValueAtTime(peak, now + offset + 0.003)
      popGain.gain.exponentialRampToValueAtTime(0.0004, now + offset + 0.026)

      popSrc.connect(bp)
      bp.connect(popGain)
      popGain.connect(campfireGain)
      popSrc.start(now + offset)
      popSrc.stop(now + offset + 0.032)
    }

    scheduleCampfireCrackle()
  }, nextDelayMs)
}

function startCampfireLayer() {
  const ctx = ensureMixerContext()
  if (!ctx || !mixerMasterGain) return
  stopCampfireLayer()

  const bufferSize = ctx.sampleRate * 4
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate)

  for (let ch = 0; ch < 2; ch++) {
    const output = buffer.getChannelData(ch)
    let lastOut = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      const brown = (lastOut + 0.028 * white) / 1.028
      lastOut = brown
      // Tambahkan sedikit tekstur mikro bara lembut
      const microEmber = Math.random() > 0.9992 ? (Math.random() - 0.5) * 0.16 : 0
      output[i] = brown * 2.9 + microEmber
    }
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true

  const highpass = ctx.createBiquadFilter()
  highpass.type = 'highpass'
  highpass.frequency.setValueAtTime(55, ctx.currentTime)

  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.setValueAtTime(320, ctx.currentTime)

  // Modulasi lembut bara api agar bernapas hangat
  const emberModGain = ctx.createGain()
  emberModGain.gain.setValueAtTime(0.72, ctx.currentTime)

  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.setValueAtTime(0.24, ctx.currentTime)
  const lfoDepth = ctx.createGain()
  lfoDepth.gain.setValueAtTime(0.14, ctx.currentTime)
  lfo.connect(lfoDepth)
  lfoDepth.connect(emberModGain.gain)
  lfo.start()

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.001, ctx.currentTime)
  gain.gain.linearRampToValueAtTime((campfireVolume.value / 100) * 0.45, ctx.currentTime + 0.35)

  source.connect(highpass)
  highpass.connect(lowpass)
  lowpass.connect(emberModGain)
  emberModGain.connect(gain)
  gain.connect(mixerMasterGain)
  source.start()

  campfireSource = source
  campfireLfo = lfo
  campfireGain = gain

  scheduleCampfireCrackle()
}

function stopCampfireLayer() {
  if (campfireCrackleTimer) {
    clearTimeout(campfireCrackleTimer)
    campfireCrackleTimer = null
  }
  if (campfireLfo) {
    try {
      campfireLfo.stop()
      campfireLfo.disconnect()
    } catch {
      // Abaikan
    }
    campfireLfo = null
  }
  if (campfireSource) {
    try {
      campfireSource.stop()
      campfireSource.disconnect()
    } catch {
      // Abaikan
    }
    campfireSource = null
  }
  if (campfireGain) {
    campfireGain.disconnect()
    campfireGain = null
  }
}

/**
 * Mulai layer 4: 🌙 Angin Malam (Night Wind)
 * Bandpass-filtered pink noise yang dimodulasi gelombang LFO lambat agar embusan mengalun naik-turun alami
 */
function startNightWindLayer() {
  const ctx = ensureMixerContext()
  if (!ctx || !mixerMasterGain) return
  stopNightWindLayer()

  const bufferSize = ctx.sampleRate * 5
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate)

  for (let ch = 0; ch < 2; ch++) {
    const output = buffer.getChannelData(ch)
    let b0 = 0
    let b1 = 0
    let b2 = 0
    let b3 = 0
    let b4 = 0
    let b5 = 0
    let b6 = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.96900 * b2 + white * 0.1538520
      b3 = 0.86650 * b3 + white * 0.3104856
      b4 = 0.55000 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.0168980
      const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.075
      b6 = white * 0.115926
      output[i] = pink
    }
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true

  const bandpass = ctx.createBiquadFilter()
  bandpass.type = 'bandpass'
  bandpass.frequency.setValueAtTime(360, ctx.currentTime)
  bandpass.Q.setValueAtTime(1.55, ctx.currentTime)

  const softLowpass = ctx.createBiquadFilter()
  softLowpass.type = 'lowpass'
  softLowpass.frequency.setValueAtTime(860, ctx.currentTime)

  // LFO 1: mengalunkan frekuensi embusan angin naik-turun perlahan (~11.8 detik/siklus)
  const freqLfo = ctx.createOscillator()
  freqLfo.type = 'sine'
  freqLfo.frequency.setValueAtTime(0.085, ctx.currentTime)
  const freqDepth = ctx.createGain()
  freqDepth.gain.setValueAtTime(160, ctx.currentTime)
  freqLfo.connect(freqDepth)
  freqDepth.connect(bandpass.frequency)
  freqLfo.start()

  // LFO 2: mengalunkan lembut intensitas embusan angin (~7.7 detik/siklus)
  const swellGain = ctx.createGain()
  swellGain.gain.setValueAtTime(0.78, ctx.currentTime)
  const ampLfo = ctx.createOscillator()
  ampLfo.type = 'sine'
  ampLfo.frequency.setValueAtTime(0.13, ctx.currentTime)
  const ampDepth = ctx.createGain()
  ampDepth.gain.setValueAtTime(0.24, ctx.currentTime)
  ampLfo.connect(ampDepth)
  ampDepth.connect(swellGain.gain)
  ampLfo.start()

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.001, ctx.currentTime)
  gain.gain.linearRampToValueAtTime((nightWindVolume.value / 100) * 0.44, ctx.currentTime + 0.45)

  source.connect(bandpass)
  bandpass.connect(softLowpass)
  softLowpass.connect(swellGain)
  swellGain.connect(gain)
  gain.connect(mixerMasterGain)
  source.start()

  nightWindSource = source
  nightWindFreqLfo = freqLfo
  nightWindAmpLfo = ampLfo
  nightWindGain = gain
}

function stopNightWindLayer() {
  if (nightWindFreqLfo) {
    try {
      nightWindFreqLfo.stop()
      nightWindFreqLfo.disconnect()
    } catch {
      // Abaikan
    }
    nightWindFreqLfo = null
  }
  if (nightWindAmpLfo) {
    try {
      nightWindAmpLfo.stop()
      nightWindAmpLfo.disconnect()
    } catch {
      // Abaikan
    }
    nightWindAmpLfo = null
  }
  if (nightWindSource) {
    try {
      nightWindSource.stop()
      nightWindSource.disconnect()
    } catch {
      // Abaikan
    }
    nightWindSource = null
  }
  if (nightWindGain) {
    nightWindGain.disconnect()
    nightWindGain = null
  }
}

/**
 * Mulai layer 5: 💧 Gemericik Air (Babbling Stream)
 * High-mid resonant filtered noise dengan modulasi riak air halus yang jernih & menenangkan
 */
function startStreamLayer() {
  const ctx = ensureMixerContext()
  if (!ctx || !mixerMasterGain) return
  stopStreamLayer()

  const bufferSize = ctx.sampleRate * 4
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate)

  for (let ch = 0; ch < 2; ch++) {
    const output = buffer.getChannelData(ch)
    let b0 = 0
    let b1 = 0
    let b2 = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.996 * b0 + white * 0.08
      b1 = 0.975 * b1 + white * 0.16
      b2 = 0.85 * b2 + white * 0.28
      const baseWater = (b0 + b1 + b2 + white * 0.22) * 0.12
      const ripple = Math.sin(i * 0.0014 + ch * 1.3) * 0.04
      output[i] = baseWater * (1 + ripple)
    }
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true

  const highpass = ctx.createBiquadFilter()
  highpass.type = 'highpass'
  highpass.frequency.setValueAtTime(340, ctx.currentTime)

  // Jalur 1: aliran sungai kecil utama (high-mid resonant)
  const mainStreamBp = ctx.createBiquadFilter()
  mainStreamBp.type = 'bandpass'
  mainStreamBp.frequency.setValueAtTime(1150, ctx.currentTime)
  mainStreamBp.Q.setValueAtTime(1.5, ctx.currentTime)

  const lfo1 = ctx.createOscillator()
  lfo1.type = 'sine'
  lfo1.frequency.setValueAtTime(0.28, ctx.currentTime)
  const lfo1Depth = ctx.createGain()
  lfo1Depth.gain.setValueAtTime(260, ctx.currentTime)
  lfo1.connect(lfo1Depth)
  lfo1Depth.connect(mainStreamBp.frequency)
  lfo1.start()

  // Jalur 2: kilau riak air jernih di atas batu kecil
  const sparkleBp = ctx.createBiquadFilter()
  sparkleBp.type = 'bandpass'
  sparkleBp.frequency.setValueAtTime(2550, ctx.currentTime)
  sparkleBp.Q.setValueAtTime(2.8, ctx.currentTime)

  const sparkleGain = ctx.createGain()
  sparkleGain.gain.setValueAtTime(0.42, ctx.currentTime)

  const lfo2 = ctx.createOscillator()
  lfo2.type = 'triangle'
  lfo2.frequency.setValueAtTime(0.42, ctx.currentTime)
  const lfo2Depth = ctx.createGain()
  lfo2Depth.gain.setValueAtTime(460, ctx.currentTime)
  lfo2.connect(lfo2Depth)
  lfo2Depth.connect(sparkleBp.frequency)
  lfo2.start()

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.001, ctx.currentTime)
  gain.gain.linearRampToValueAtTime((streamVolume.value / 100) * 0.38, ctx.currentTime + 0.35)

  source.connect(highpass)
  highpass.connect(mainStreamBp)
  mainStreamBp.connect(gain)
  highpass.connect(sparkleBp)
  sparkleBp.connect(sparkleGain)
  sparkleGain.connect(gain)
  gain.connect(mixerMasterGain)
  source.start()

  streamSource = source
  streamLfo1 = lfo1
  streamLfo2 = lfo2
  streamGain = gain
}

function stopStreamLayer() {
  if (streamLfo1) {
    try {
      streamLfo1.stop()
      streamLfo1.disconnect()
    } catch {
      // Abaikan
    }
    streamLfo1 = null
  }
  if (streamLfo2) {
    try {
      streamLfo2.stop()
      streamLfo2.disconnect()
    } catch {
      // Abaikan
    }
    streamLfo2 = null
  }
  if (streamSource) {
    try {
      streamSource.stop()
      streamSource.disconnect()
    } catch {
      // Abaikan
    }
    streamSource = null
  }
  if (streamGain) {
    streamGain.disconnect()
    streamGain = null
  }
}

/** Sinkronkan seluruh 5 layer audio Ambient Sound Mixer agar sesuai dengan state tersimpan */
function syncAllAmbientLayers() {
  if (isRainEnabled.value) {
    if (!rainSource) startRainLayer()
  } else {
    stopRainLayer()
  }

  if (isBrownEnabled.value) {
    if (!brownSource) startBrownLayer()
  } else {
    stopBrownLayer()
  }

  if (isCampfireEnabled.value) {
    if (!campfireSource) startCampfireLayer()
  } else {
    stopCampfireLayer()
  }

  if (isNightWindEnabled.value) {
    if (!nightWindSource) startNightWindLayer()
  } else {
    stopNightWindLayer()
  }

  if (isStreamEnabled.value) {
    if (!streamSource) startStreamLayer()
  } else {
    stopStreamLayer()
  }
}

/** Sakelar ON/OFF serbaguna untuk ke-5 saluran Ambient Sound Mixer (tersimpan otomatis di localStorage) */
function toggleAmbientChannel(channel: AmbientChannelId) {
  const nextEnabled = !ambientMixerSettings.value[channel].enabled
  updateAmbientChannel(channel, { enabled: nextEnabled })

  switch (channel) {
    case 'rain':
      if (nextEnabled) startRainLayer()
      else stopRainLayer()
      break
    case 'brown':
      if (nextEnabled) startBrownLayer()
      else stopBrownLayer()
      break
    case 'campfire':
      if (nextEnabled) startCampfireLayer()
      else stopCampfireLayer()
      break
    case 'nightWind':
      if (nextEnabled) startNightWindLayer()
      else stopNightWindLayer()
      break
    case 'stream':
      if (nextEnabled) startStreamLayer()
      else stopStreamLayer()
      break
  }
}

// Saat pengaturan Ambient Mixer dipulihkan dari localStorage atau Restore JSON, sinkronkan layer audio
watch(ambientMixerVersion, () => {
  if (!import.meta.client) return
  syncAllAmbientLayers()
})

// Jika browser menunda autoplay AudioContext saat halaman baru dibuka dengan saluran ON tersimpan,
// aktifkan otomatis begitu pengguna melakukan klik/ketukan pertama di halaman.
function handleFirstAmbientGesture() {
  const hasAnyEnabled =
    isRainEnabled.value ||
    isBrownEnabled.value ||
    isCampfireEnabled.value ||
    isNightWindEnabled.value ||
    isStreamEnabled.value
  if (!hasAnyEnabled) return
  syncAllAmbientLayers()
  if (mixerCtx?.state === 'suspended') {
    mixerCtx.resume().catch(() => {})
  }
}

// --- LOGIKA RADIO ONLINE & YOUTUBE ---

function extractYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed

  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ]

  for (const regex of patterns) {
    const match = trimmed.match(regex)
    if (match?.[1]) return match[1]
  }
  return null
}

function applyCustomYoutubeUrl() {
  const videoId = extractYoutubeVideoId(customYoutubeInput.value)
  if (!videoId) {
    youtubeInputError.value = 'Link YouTube tidak dikenali. Contoh: https://youtu.be/4xDzrJKXOOY'
    return
  }
  youtubeInputError.value = ''
  // Jika status global sedang Mute saat mengganti video YouTube baru, langsung muat dalam keadaan muted
  youtubeLoadMuteFlag.value = isRadioMuted.value ? 1 : 0
  selectedYoutubeId.value = videoId
  customYoutubeInput.value = ''
}

function selectPresetYoutube(videoId: string) {
  youtubeInputError.value = ''
  youtubeLoadMuteFlag.value = isRadioMuted.value ? 1 : 0
  selectedYoutubeId.value = videoId
}

function stopHtmlRadio() {
  const audio = audioRef.value
  if (!audio) return
  isIntentionalStop.value = true
  audio.pause()
  audio.removeAttribute('src')
  audio.load()
}

async function startRadioStream(useFallback = false) {
  const audio = audioRef.value
  if (!audio) return

  if (!useFallback) {
    hasTriedFallbackUrl.value = false
  }

  const chosenUrl =
    useFallback && currentRadio.value.fallbackUrl
      ? currentRadio.value.fallbackUrl
      : currentRadio.value.url

  try {
    isIntentionalStop.value = false
    errorMessage.value = ''
    isBuffering.value = true

    audio.src = chosenUrl.startsWith('/') ? `${chosenUrl}?t=${Date.now()}` : chosenUrl
    audio.volume = effectiveRadioVolume.value
    audio.load()
    await audio.play()
    isRadioPlaying.value = true
  } catch (err) {
    if (isIntentionalStop.value) return
    if (!useFallback && currentRadio.value.fallbackUrl && !hasTriedFallbackUrl.value) {
      hasTriedFallbackUrl.value = true
      await startRadioStream(true)
      return
    }
    console.warn('Radio stream gagal dimuat:', err)
    isRadioPlaying.value = false
    errorMessage.value =
      'Radio sedang tidak dapat dijangkau. Coba stasiun lain, tab YouTube, atau nyalakan Ambient Mixer di bawah~'
  } finally {
    isBuffering.value = false
  }
}

async function toggleRadioPlay() {
  errorMessage.value = ''
  if (isRadioPlaying.value || isBuffering.value) {
    stopHtmlRadio()
    isRadioPlaying.value = false
    isBuffering.value = false
    return
  }
  await startRadioStream()
}

async function selectRadio(id: string) {
  if (selectedRadioId.value === id) return
  const wasPlaying = isRadioPlaying.value || isBuffering.value
  selectedRadioId.value = id
  errorMessage.value = ''

  stopHtmlRadio()
  isRadioPlaying.value = false
  isBuffering.value = false

  if (wasPlaying) {
    await startRadioStream()
  }
}

/** Pindah ke stasiun Radio berikutnya/sebelumnya (dipicu tombol Next/Prev di Lock Screen HP atau Windows Media Control) */
async function selectRelativeRadio(step: 1 | -1) {
  const currentIdx = RADIO_CHANNELS.findIndex(c => c.id === selectedRadioId.value)
  const safeIdx = currentIdx >= 0 ? currentIdx : 0
  const nextIdx = (safeIdx + step + RADIO_CHANNELS.length) % RADIO_CHANNELS.length
  const nextChannel = RADIO_CHANNELS[nextIdx]
  if (!nextChannel) return
  selectedRadioId.value = nextChannel.id
  errorMessage.value = ''
  stopHtmlRadio()
  isRadioPlaying.value = false
  isBuffering.value = false
  await startRadioStream()
}

/** Jaga agar Ambient Sound Mixer (Web Audio API) & media anchor tidak dibekukan saat pindah ke Home Screen HP */
function handleBgmVisibilityChange() {
  if (activeAmbientLabels.value.length > 0 && mixerCtx?.state === 'suspended') {
    mixerCtx.resume().catch(() => {})
  }
  if (activeAmbientLabels.value.length > 0 || isRadioPlaying.value) {
    resumeKeepAliveIfNeeded()
  }
}

function switchTab(tab: MusicTab) {
  if (activeTab.value === tab) return
  // Saat pindah ke YouTube, jeda radio saja & pertahankan status mute global pada video YouTube
  if (tab === 'youtube') {
    youtubeLoadMuteFlag.value = isRadioMuted.value ? 1 : 0
    if (isRadioPlaying.value || isBuffering.value) {
      stopHtmlRadio()
      isRadioPlaying.value = false
      isBuffering.value = false
    }
  }
  errorMessage.value = ''
  activeTab.value = tab
}

function toggleRadioMute(showToast = false) {
  isRadioMuted.value = !isRadioMuted.value
  if (activeTab.value === 'youtube') {
    sendYoutubeCommand(isRadioMuted.value ? 'mute' : 'unMute')
  }
  if (showToast) {
    showMiniToast(
      isRadioMuted.value
        ? '🔇 Semua Audio Senyap (Radio, YouTube & Mixer)'
        : '🔊 Semua Audio Aktif',
    )
  }
}

// Pintasan keyboard [M]: Mute / Unmute seluruh audio (BGM Player + Ambient Sound Mixer)
watch(bgmMuteToggleSignal, () => {
  toggleRadioMute(true)
})

// Pintasan keyboard [P]: Play / Pause pemutar musik BGM Player
watch(bgmPlayToggleSignal, () => {
  if (activeTab.value === 'radio') {
    void toggleRadioPlay()
  } else {
    showMiniToast('Mode YouTube aktif — pindah ke tab Radio untuk Play/Pause [P] 📻')
  }
})

function handleAudioError() {
  if (isIntentionalStop.value || (!isRadioPlaying.value && !isBuffering.value)) return
  if (currentRadio.value.fallbackUrl && !hasTriedFallbackUrl.value) {
    hasTriedFallbackUrl.value = true
    void startRadioStream(true)
    return
  }
  isRadioPlaying.value = false
  isBuffering.value = false
  errorMessage.value = 'Koneksi radio terputus. Coba stasiun lain atau nikmati Ambient Mixer di bawah~'
}

onMounted(() => {
  if (import.meta.client) {
    window.addEventListener('pointerdown', handleFirstAmbientGesture, { passive: true })
    window.addEventListener('keydown', handleFirstAmbientGesture, { passive: true })
    document.addEventListener('visibilitychange', handleBgmVisibilityChange)
    registerMediaSessionHandlers({
      onToggleRadio: () => {
        if (activeTab.value === 'radio') {
          void toggleRadioPlay()
        }
      },
      onNextRadio: () => {
        if (activeTab.value === 'radio') {
          void selectRelativeRadio(1)
        }
      },
      onPrevRadio: () => {
        if (activeTab.value === 'radio') {
          void selectRelativeRadio(-1)
        }
      },
    })
  }
})

onUnmounted(() => {
  clearYoutubeLoadSyncTimers()
  if (import.meta.client) {
    window.removeEventListener('pointerdown', handleFirstAmbientGesture)
    window.removeEventListener('keydown', handleFirstAmbientGesture)
    document.removeEventListener('visibilitychange', handleBgmVisibilityChange)
  }
  stopHtmlRadio()
  stopRainLayer()
  stopBrownLayer()
  stopCampfireLayer()
  stopNightWindLayer()
  stopStreamLayer()
  if (mixerMasterGain) {
    mixerMasterGain.disconnect()
    mixerMasterGain = null
  }
  if (mixerCtx) {
    mixerCtx.close().catch(() => {})
    mixerCtx = null
  }
  updateMediaSessionBgm({
    isRadioPlaying: false,
    activeAmbientLabels: [],
  })
  isBgmPlaying.value = false
  isRainAmbientOn.value = false
})
</script>

<template>
  <!-- Kolom Tengah Bawah: BGM PLAYER + Ambient Sound Mixer Independen -->
  <section class="glass-card flex flex-col justify-between gap-4 p-5 sm:p-6">
    <!-- Header + Toggle Sumber Musik (Radio Online vs YouTube Lo-Fi) -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span class="text-lg">🎧</span>
        <h2 class="font-display text-lg font-semibold tracking-wide text-pink-200">
          BGM PLAYER
        </h2>
        <!-- Tombol Mute / Unmute Serentak (Radio, YouTube Lo-Fi & Ambient Mixer) selalu terlihat di kedua tab -->
        <button
          type="button"
          class="btn-bouncy inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold transition"
          :class="
            isRadioMuted
              ? 'border-pink-300/75 bg-pink-400/25 text-pink-100 shadow-sm'
              : 'border-white/15 bg-white/10 text-purple-100 hover:bg-white/20'
          "
          :title="
            isRadioMuted
              ? 'Nyalakan semua suara: Radio, YouTube & Mixer (M)'
              : 'Bisukan semua suara: Radio, YouTube & Mixer (M)'
          "
          @click="toggleRadioMute(true)"
        >
          <span>{{ isRadioMuted ? '🔇' : '🔊' }}</span>
          <span class="hidden sm:inline">{{ isRadioMuted ? 'Senyap' : 'Aktif' }}</span>
        </button>
      </div>

      <div class="flex rounded-full border border-white/15 bg-black/25 p-0.5 text-[11px]">
        <button
          type="button"
          class="cursor-pointer rounded-full px-3 py-1 font-semibold transition"
          :class="
            activeTab === 'radio'
              ? 'cozy-active-btn bg-[#7dd3fc] text-[#0c1e3a] shadow'
              : 'cozy-tab-inactive'
          "
          @click="switchTab('radio')"
        >
          📻 Radio ({{ RADIO_CHANNELS.length }})
        </button>
        <button
          type="button"
          class="cursor-pointer rounded-full px-3 py-1 font-semibold transition"
          :class="
            activeTab === 'youtube'
              ? 'cozy-active-btn bg-[#c4b5fd] text-[#1e1b4b] shadow'
              : 'cozy-tab-inactive'
          "
          @click="switchTab('youtube')"
        >
          ▶ YouTube Lo-Fi
        </button>
      </div>
    </div>

    <!-- Elemen <audio> HTML5 untuk Radio Online (mendukung pemutaran latar belakang HP & Media Session) -->
    <audio
      ref="audioRef"
      preload="none"
      playsinline
      x-webkit-airplay="allow"
      @waiting="isBuffering = true"
      @playing="isBuffering = false"
      @canplay="isBuffering = false"
      @error="handleAudioError"
    />

    <!-- BAGIAN 1: PEMUTAR MUSIK UTAMA (Tab Radio Online atau Tab YouTube) -->
    <div v-if="activeTab === 'radio'" class="flex flex-col gap-3">
      <!-- Baris Kaset Pita Retro + Label Stasiun Aktif + Tombol Play/Pause -->
      <div class="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-3.5">
        <div class="shrink-0">
          <svg
            class="h-16 w-24 drop-shadow-[0_4px_10px_rgba(0,0,0,0.28)]"
            viewBox="0 0 120 78"
            fill="none"
            role="img"
            aria-label="Ilustrasi kaset pita retro"
          >
            <rect
              x="4"
              y="4"
              width="112"
              height="70"
              rx="12"
              fill="var(--accent-cassette-body, #4c1d95)"
              stroke="var(--accent-cassette-stroke, #f9a8d4)"
              stroke-width="2.5"
            />
            <rect x="13" y="12" width="94" height="34" rx="6" fill="var(--accent-cassette-label, #fbcfe8)" />
            <rect x="13" y="12" width="94" height="9" rx="4" fill="var(--accent-cassette-stripe, #c4b5fd)" />
            <line x1="20" y1="26" x2="100" y2="26" stroke="var(--accent-cassette-body, #a855f7)" stroke-width="1.5" opacity="0.4" />
            <rect x="28" y="29" width="64" height="14" rx="7" fill="var(--accent-cassette-window, #1e1b4b)" />

            <!-- Roda Pita Kiri (berputar saat Radio atau Ambient Mixer aktif) -->
            <g
              style="transform-origin: 41px 36px"
              :class="{ 'animate-spin-tape': isAnyAudioSpinning }"
            >
              <circle cx="41" cy="36" r="5.5" fill="var(--accent-cassette-reel, var(--accent-cassette-stroke, #f9a8d4))" />
              <circle cx="41" cy="36" r="2.2" fill="var(--accent-cassette-window, #1e1b4b)" />
              <line x1="41" y1="30.5" x2="41" y2="33" stroke="var(--accent-cassette-window, #1e1b4b)" stroke-width="1.5" />
              <line x1="41" y1="39" x2="41" y2="41.5" stroke="var(--accent-cassette-window, #1e1b4b)" stroke-width="1.5" />
              <line x1="35.5" y1="36" x2="38" y2="36" stroke="var(--accent-cassette-window, #1e1b4b)" stroke-width="1.5" />
            </g>

            <!-- Roda Pita Kanan -->
            <g
              style="transform-origin: 79px 36px"
              :class="{ 'animate-spin-tape': isAnyAudioSpinning }"
            >
              <circle cx="79" cy="36" r="5.5" fill="var(--accent-cassette-reel, var(--accent-cassette-stroke, #f9a8d4))" />
              <circle cx="79" cy="36" r="2.2" fill="var(--accent-cassette-window, #1e1b4b)" />
              <line x1="79" y1="30.5" x2="79" y2="33" stroke="var(--accent-cassette-window, #1e1b4b)" stroke-width="1.5" />
              <line x1="79" y1="39" x2="79" y2="41.5" stroke="var(--accent-cassette-window, #1e1b4b)" stroke-width="1.5" />
              <line x1="82" y1="36" x2="84.5" y2="36" stroke="var(--accent-cassette-window, #1e1b4b)" stroke-width="1.5" />
            </g>

            <path d="M26 74 L32 58 H88 L94 74 Z" fill="var(--accent-cassette-bottom, #311042)" />
            <circle cx="43" cy="66" r="2.5" fill="var(--accent-cassette-label, #e9d5ff)" />
            <circle cx="77" cy="66" r="2.5" fill="var(--accent-cassette-label, #e9d5ff)" />
            <circle cx="12" cy="66" r="1.8" fill="var(--accent-cassette-stroke, #fbcfe8)" opacity="0.7" />
            <circle cx="108" cy="66" r="1.8" fill="var(--accent-cassette-stroke, #fbcfe8)" opacity="0.7" />
          </svg>
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            <span
              class="h-2 w-2 rounded-full"
              :class="
                isRadioPlaying
                  ? 'cozy-dot animate-pulse bg-pink-300'
                  : 'cozy-dot-idle bg-purple-300/40'
              "
            />
            <span class="text-[10px] font-bold uppercase tracking-wider text-pink-200/90">
              {{ isBuffering ? 'Menghubungkan...' : isRadioPlaying ? 'Radio Diputar' : 'Radio Siap' }}
            </span>
          </div>

          <p class="font-display mt-0.5 truncate text-base font-semibold text-white">
            {{ currentRadio.name }}
          </p>
          <p class="truncate text-xs text-purple-200/80">
            {{ currentRadio.subtitle }}
          </p>
        </div>

        <button
          type="button"
          :aria-label="isRadioPlaying ? 'Jeda Radio' : 'Putar Radio'"
          class="cozy-active-btn btn-bouncy flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-[#f9a8d4] to-[#c084fc] text-[#1e1b4b] shadow-lg shadow-pink-500/25"
          @click="toggleRadioPlay"
        >
          <span
            v-if="isBuffering"
            class="h-4 w-4 animate-spin rounded-full border-2 border-[#1e1b4b] border-t-transparent"
          />
          <svg
            v-else-if="isRadioPlaying"
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <rect x="6" y="5" width="4" height="14" rx="1.5" />
            <rect x="14" y="5" width="4" height="14" rx="1.5" />
          </svg>
          <svg
            v-else
            class="ml-0.5 h-5 w-5"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M8 5.5v13l11-6.5-11-6.5z" />
          </svg>
        </button>
      </div>

      <!-- Pilihan 11 Stasiun Radio Online -->
      <div class="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">
        <button
          v-for="channel in RADIO_CHANNELS"
          :key="channel.id"
          type="button"
          class="btn-bouncy cursor-pointer rounded-full border px-2.5 py-1 text-xs font-semibold"
          :class="
            selectedRadioId === channel.id
              ? 'cozy-pill-btn border-sky-300/75 bg-sky-300/25 text-sky-100'
              : 'border-white/15 bg-white/5 text-purple-200/80 hover:bg-white/15 hover:text-white'
          "
          @click="selectRadio(channel.id)"
        >
          {{ channel.moodIcon }} {{ channel.shortName }}
        </button>
      </div>

      <!-- Slider Volume Radio -->
      <div class="flex items-center gap-3 rounded-2xl bg-black/20 px-3.5 py-2">
        <button
          type="button"
          class="cursor-pointer text-base transition hover:scale-110"
          :title="isRadioMuted ? 'Nyalakan seluruh suara (M)' : 'Bisukan seluruh suara (M)'"
          @click="toggleRadioMute(true)"
        >
          {{ isRadioMuted || radioVolume === 0 ? '🔇' : radioVolume < 45 ? '🔉' : '🔊' }}
        </button>

        <input
          v-model.number="radioVolume"
          type="range"
          min="0"
          max="100"
          aria-label="Pengatur volume radio"
          class="kawaii-slider flex-1"
          @input="isRadioMuted = false"
        >

        <span class="w-9 text-right text-xs font-bold text-pink-200">
          {{ isRadioMuted ? 0 : radioVolume }}%
        </span>
      </div>

      <p
        v-if="errorMessage"
        class="rounded-xl border border-pink-300/30 bg-pink-500/15 px-3 py-2 text-xs text-pink-100"
      >
        {{ errorMessage }}
      </p>
    </div>

    <!-- TAB YOUTUBE LO-FI LIVE STREAM -->
    <div v-else class="flex flex-col gap-2.5">
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="yt in YOUTUBE_STREAMS"
            :key="yt.id"
            type="button"
            class="btn-bouncy cursor-pointer rounded-full border px-2.5 py-1 text-xs font-semibold"
            :class="
              selectedYoutubeId === yt.videoId
                ? 'cozy-pill-btn border-purple-300/70 bg-purple-300/25 text-purple-100'
                : 'border-white/15 bg-white/5 text-purple-200/80 hover:bg-white/15'
            "
            @click="selectPresetYoutube(yt.videoId)"
          >
            ✦ {{ yt.label }}
          </button>
        </div>

        <a
          :href="youtubeWatchUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-pink-200 transition hover:bg-white/20"
          title="Buka langsung di tab YouTube"
        >
          ↗ YouTube
        </a>
      </div>

      <div class="overflow-hidden rounded-2xl border border-white/20 bg-black/40 shadow-inner">
        <iframe
          ref="youtubeIframeRef"
          :key="selectedYoutubeId"
          class="aspect-video w-full"
          :src="youtubeEmbedUrl"
          title="YouTube Lo-Fi Live Stream"
          frameborder="0"
          referrerpolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          @load="handleYoutubeIframeLoad"
        />
      </div>

      <form class="flex items-center gap-2" @submit.prevent="applyCustomYoutubeUrl">
        <input
          v-model="customYoutubeInput"
          type="text"
          placeholder="Atau tempel link YouTube favoritmu..."
          class="min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs text-white placeholder-purple-200/60 outline-none transition focus:border-purple-300/70 focus:bg-white/15"
        >
        <button
          type="submit"
          class="cozy-active-btn btn-bouncy shrink-0 cursor-pointer rounded-full bg-[#c4b5fd] px-3.5 py-1.5 text-xs font-bold text-[#1e1b4b]"
        >
          Putar
        </button>
      </form>

      <p
        v-if="youtubeInputError"
        class="rounded-xl border border-pink-300/30 bg-pink-500/15 px-3 py-1.5 text-[11px] text-pink-100"
      >
        {{ youtubeInputError }}
      </p>
    </div>

    <!-- BAGIAN 2: AMBIENT SOUND MIXER INDEPENDEN (100% Offline Web Audio — Bisa Digabung dengan Radio & YouTube!) -->
    <div class="rounded-2xl border border-white/15 bg-black/25 p-3">
      <div class="mb-2 flex items-center justify-between gap-2">
        <span class="font-display text-xs font-semibold text-pink-200">
          🎚️ Ambient Sound Mixer
        </span>
        <span class="text-[10px] font-semibold text-emerald-200/85">
          Bisa digabung dgn musik ✦ Offline
        </span>
      </div>

      <div class="flex flex-col gap-2">
        <!-- Layer 1: Hujan Lembut (Rain Ambient) -->
        <div class="flex items-center gap-2.5">
          <button
            type="button"
            class="btn-bouncy w-36 shrink-0 cursor-pointer rounded-full border px-2.5 py-1 text-left text-[11px] font-semibold"
            :class="
              isRainEnabled
                ? 'cozy-pill-btn border-pink-300/75 bg-pink-300/25 text-pink-100'
                : 'border-white/15 bg-white/5 text-purple-200/75 hover:bg-white/15'
            "
            @click="toggleAmbientChannel('rain')"
          >
            🌧️ Hujan {{ isRainEnabled ? 'ON' : 'OFF' }}
          </button>

          <input
            v-model.number="rainVolume"
            type="range"
            min="0"
            max="100"
            aria-label="Volume Hujan Lembut"
            class="kawaii-slider flex-1"
            :class="{ 'opacity-45': !isRainEnabled }"
          >

          <span class="w-8 text-right text-[11px] font-bold text-pink-200/90">
            {{ rainVolume }}%
          </span>
        </div>

        <!-- Layer 2: Ombak (tetap memakai key penyimpanan 'brown' agar volume tersimpan tidak ter-reset) -->
        <div class="flex items-center gap-2.5">
          <button
            type="button"
            class="btn-bouncy w-36 shrink-0 cursor-pointer rounded-full border px-2.5 py-1 text-left text-[11px] font-semibold"
            :class="
              isBrownEnabled
                ? 'border-sky-300/75 bg-sky-300/25 text-sky-100'
                : 'border-white/15 bg-white/5 text-purple-200/75 hover:bg-white/15'
            "
            @click="toggleAmbientChannel('brown')"
          >
            🌊 Ombak {{ isBrownEnabled ? 'ON' : 'OFF' }}
          </button>

          <input
            v-model.number="brownVolume"
            type="range"
            min="0"
            max="100"
            aria-label="Volume Ombak"
            class="kawaii-slider flex-1"
            :class="{ 'opacity-45': !isBrownEnabled }"
          >

          <span class="w-8 text-right text-[11px] font-bold text-sky-200/90">
            {{ brownVolume }}%
          </span>
        </div>

        <!-- Layer 3: Api Unggun (Campfire Crackle & Warm Rumble) -->
        <div class="flex items-center gap-2.5">
          <button
            type="button"
            class="btn-bouncy w-36 shrink-0 cursor-pointer rounded-full border px-2.5 py-1 text-left text-[11px] font-semibold"
            :class="
              isCampfireEnabled
                ? 'border-amber-300/75 bg-amber-400/25 text-amber-100'
                : 'border-white/15 bg-white/5 text-purple-200/75 hover:bg-white/15'
            "
            @click="toggleAmbientChannel('campfire')"
          >
            🔥 Api Unggun {{ isCampfireEnabled ? 'ON' : 'OFF' }}
          </button>

          <input
            v-model.number="campfireVolume"
            type="range"
            min="0"
            max="100"
            aria-label="Volume Api Unggun"
            class="kawaii-slider flex-1"
            :class="{ 'opacity-45': !isCampfireEnabled }"
          >

          <span class="w-8 text-right text-[11px] font-bold text-amber-200/90">
            {{ campfireVolume }}%
          </span>
        </div>

        <!-- Layer 4: Angin Malam (Soft LFO-Modulated Night Wind) -->
        <div class="flex items-center gap-2.5">
          <button
            type="button"
            class="btn-bouncy w-36 shrink-0 cursor-pointer rounded-full border px-2.5 py-1 text-left text-[11px] font-semibold"
            :class="
              isNightWindEnabled
                ? 'border-purple-300/75 bg-purple-400/25 text-purple-100'
                : 'border-white/15 bg-white/5 text-purple-200/75 hover:bg-white/15'
            "
            @click="toggleAmbientChannel('nightWind')"
          >
            🌙 Angin Malam {{ isNightWindEnabled ? 'ON' : 'OFF' }}
          </button>

          <input
            v-model.number="nightWindVolume"
            type="range"
            min="0"
            max="100"
            aria-label="Volume Angin Malam"
            class="kawaii-slider flex-1"
            :class="{ 'opacity-45': !isNightWindEnabled }"
          >

          <span class="w-8 text-right text-[11px] font-bold text-purple-200/90">
            {{ nightWindVolume }}%
          </span>
        </div>

        <!-- Layer 5: Gemericik Air (Gentle Babbling Stream) -->
        <div class="flex items-center gap-2.5">
          <button
            type="button"
            class="btn-bouncy w-36 shrink-0 cursor-pointer rounded-full border px-2.5 py-1 text-left text-[11px] font-semibold"
            :class="
              isStreamEnabled
                ? 'border-cyan-300/75 bg-cyan-400/25 text-cyan-100'
                : 'border-white/15 bg-white/5 text-purple-200/75 hover:bg-white/15'
            "
            @click="toggleAmbientChannel('stream')"
          >
            💧 Gemericik Air {{ isStreamEnabled ? 'ON' : 'OFF' }}
          </button>

          <input
            v-model.number="streamVolume"
            type="range"
            min="0"
            max="100"
            aria-label="Volume Gemericik Air"
            class="kawaii-slider flex-1"
            :class="{ 'opacity-45': !isStreamEnabled }"
          >

          <span class="w-8 text-right text-[11px] font-bold text-cyan-200/90">
            {{ streamVolume }}%
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
