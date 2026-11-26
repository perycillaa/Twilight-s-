<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { getCatBreedPalette, type CatBreedPalette } from '~/composables/useCatThemeStyle'
import { useSoundEffects } from '~/composables/useSoundEffects'
import {
  CAT_BREEDS_CATALOG,
  GAME_COMPLETION_BASE_COINS,
  GAME_ROUND_DURATION_SECONDS,
  MAX_GAME_DAILY_PLAYS,
  MAX_GAME_DAILY_REWARDS,
  type MascotAccessoryId,
  type MiniGameId,
  useTwilightStorage,
} from '~/composables/useTwilightStorage'

const {
  isMiniGameOpen,
  isZenMode,
  isDarkTheme,
  theme,
  activeCozyTheme,
  graphicsConfig,
  mainCatType,
  mainCatAccessory,
  gameHighScore,
  fishingHighScore,
  catcherPlayCount,
  fishingPlayCount,
  catcherRewardCount,
  fishingRewardCount,
  syncMiniGameDailyQuota,
  consumeMiniGamePlayFor,
  recordMiniGameRoundResult,
  triggerVibration,
} = useTwilightStorage()
const { playGameCatch, playGameZap, playPopTing } = useSoundEffects()

// Jika Starlight Focus ✨ aktif saat modal game terbuka, langsung tutup modal & hentikan animasi
watch(isZenMode, (focusActive) => {
  if (focusActive && isMiniGameOpen.value) {
    isMiniGameOpen.value = false
  }
})

// Ukuran logis kanvas (otomatis diskalakan responsif via CSS untuk PC maupun HP)
const CANVAS_W = 480
const CANVAS_H = 360
const GROUND_Y = CANVAS_H - 22
const ROUND_DURATION_MS = GAME_ROUND_DURATION_SECONDS * 1000 // 50 detik per ronde

type GamePhase = 'ready' | 'playing' | 'finished'
type FallingKind = 'star' | 'fish' | 'storm'
type FishingSubState = 'idle' | 'casting' | 'waiting' | 'bite' | 'caught' | 'missed'
type FishingCatchKind = 'blue-fish' | 'golden-fish' | 'starfish' | 'pearl-shell'

interface FallingObject {
  id: number
  kind: FallingKind
  x: number
  y: number
  speed: number
  radius: number
  rotation: number
  vRot: number
  wobblePhase: number
}

interface FloatingScoreText {
  x: number
  y: number
  text: string
  color: string
  life: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  life: number
  maxLife: number
  kind: 'spark' | 'dust' | 'electric' | 'heart' | 'splash'
}

interface SwimmingSilhouette {
  x: number
  y: number
  vx: number
  size: number
  phase: number
}

interface RoundSummaryData {
  gameId: MiniGameId
  isNewRecord: boolean
  baseRewardCoins: number
  fishBonusCoins: number
  totalCoinsAwarded: number
  affectionGained: number
  fishCaught: number
  starsCollected: number
  claimsUsed: number
  maxClaims: number
  playsUsed: number
  maxPlays: number
  highScore: number
}

// State tab game & tampilan HUD
const activeGame = ref<MiniGameId>('catcher')
const canvasRef = ref<HTMLCanvasElement | null>(null)
const phase = ref<GamePhase>('ready')
const score = ref<number>(0)
const fishCaughtCount = ref<number>(0)
const starsCollectedCount = ref<number>(0)
const remainingSeconds = ref<number>(GAME_ROUND_DURATION_SECONDS)
const roundSummary = ref<RoundSummaryData | null>(null)

// State reaktif kecil untuk tombol aksi Cozy Beach Fishing
const fishingUiState = ref<FishingSubState>('idle')
const fishingHintText = ref<string>('Lempar kail ke laut untuk mulai memancing!')

// Info Ras Kucing Utama yang sedang dipakai
const activeMainCatInfo = computed(() => {
  return (
    CAT_BREEDS_CATALOG.find(item => item.id === mainCatType.value) ?? {
      id: 'snowy-white',
      name: 'Kucing Putih Salju',
      icon: '🐱',
    }
  )
})

// Kuota & Rekor terpisah per game
const currentHighScore = computed<number>(() =>
  activeGame.value === 'fishing' ? fishingHighScore.value : gameHighScore.value,
)
const currentPlayCount = computed<number>(() =>
  activeGame.value === 'fishing' ? fishingPlayCount.value : catcherPlayCount.value,
)
const currentRewardCount = computed<number>(() =>
  activeGame.value === 'fishing' ? fishingRewardCount.value : catcherRewardCount.value,
)
const isPlayQuotaFull = computed<boolean>(() => currentPlayCount.value >= MAX_GAME_DAILY_PLAYS)
const isRewardQuotaFull = computed<boolean>(
  () => currentRewardCount.value >= MAX_GAME_DAILY_REWARDS,
)

// Variabel internal game loop & kunci anti-bug hadiah ganda per ronde
let rafId: number | null = null
let lastFrameTime = 0
let lastRenderedFrameTime = 0
let roundStartTime = 0
let spawnAccumulator = 0
let dustAccumulator = 0
let objectIdCounter = 0
let isRoundRewardProcessed = false

// === STATE GAME 1: STARLIGHT & FISH CATCHER ===
let catX = CANVAS_W / 2
let catVx = 0
let pointerTargetX: number | null = null
let catTilt = 0
let runCycle = 0
let catFacing = 1
let squashTimer = 0
let catHappyUntil = 0
let catShockedUntil = 0
let screenShakeUntil = 0

const keysPressed = { left: false, right: false }
let fallingObjects: FallingObject[] = []
let floatingTexts: FloatingScoreText[] = []
let particles: Particle[] = []

// === STATE GAME 2: COZY BEACH FISHING ===
const PIER_RIGHT_X = 148
const PIER_DECK_Y = 238
const WATER_Y = 248
const FISHING_CAT_X = 96
const FISHING_CAT_Y = PIER_DECK_Y - 2

let fishingState: FishingSubState = 'idle'
let fishingStateStart = 0
let fishingWaitDurationMs = 1700
let bobberX = 320
let bobberY = WATER_Y + 14
let bobberTargetX = 330
let bobberTargetY = WATER_Y + 26
let timingPos = 0.5 // 0..1
let timingDir = 1
let timingSpeed = 1.45
let greenZoneStart = 0.34
let greenZoneEnd = 0.66
let pendingCatchKind: FishingCatchKind = 'blue-fish'
let caughtFlyStart = 0
let caughtFlyEmoji = '🐟'
let caughtFlyFromX = 320
let caughtFlyFromY = WATER_Y + 14
let fishingCatExcitedUntil = 0

const swimmingSilhouettes: SwimmingSilhouette[] = Array.from({ length: 5 }, (_, i) => ({
  x: 185 + i * 56,
  y: WATER_Y + 28 + (i % 3) * 24,
  vx: (i % 2 === 0 ? 1 : -1) * (16 + i * 4),
  size: 10 + (i % 3) * 3,
  phase: i * 1.4,
}))

// Bintang latar berkelip statis di dalam kanvas
const bgStars = Array.from({ length: 34 }, (_, i) => ({
  x: ((i * 67 + 23) % (CANVAS_W - 24)) + 12,
  y: ((i * 43 + 15) % (CANVAS_H - 135)) + 14,
  r: 0.9 + (i % 3) * 0.65,
  phase: i * 0.82,
  isSparkle: i % 7 === 0,
}))

// Awan lembut pantai
const beachClouds = [
  { x: 65, y: 54, scale: 0.95, speed: 7 },
  { x: 220, y: 38, scale: 1.15, speed: 5.5 },
  { x: 375, y: 66, scale: 0.85, speed: 8.2 },
]

/** Palet kanvas dinamis mengikuti Mode Terang / Gelap + Tema Aktif pengguna */
function getCanvasThemePalette() {
  const dark = isDarkTheme.value
  const cozy = activeCozyTheme.value
  const base = theme.value

  if (!dark) {
    // Mode Terang (Light Mode) yang cerah, hangat & selaras tema aktif
    if (cozy === 'matcha-garden') {
      return {
        skyTop: '#d1fae5',
        skyMid: '#ecfdf5',
        skyBottom: '#fefce8',
        hillBack: 'rgba(52, 211, 153, 0.34)',
        groundTop: '#34d399',
        groundBottom: '#059669',
        groundEdge: '#a7f3d0',
        celestial: '#fbbf24',
        celestialGlow: 'rgba(251, 191, 36, 0.35)',
        starColor: '#10b981',
        oceanTop: '#34d399',
        oceanMid: '#0d9488',
        oceanBottom: '#0f766e',
        foamColor: 'rgba(236, 253, 245, 0.72)',
        pierTop: '#b45309',
        pierDark: '#78350f',
        cloudColor: 'rgba(255, 255, 255, 0.85)',
        accentTint: '#10b981',
        basketTop: '#a7f3d0',
        basketBottom: '#10b981',
      }
    }
    if (cozy === 'autumn-cafe' || cozy === 'honey-library') {
      return {
        skyTop: '#fed7aa',
        skyMid: '#ffedd5',
        skyBottom: '#fef3c7',
        hillBack: 'rgba(217, 119, 6, 0.25)',
        groundTop: '#d97706',
        groundBottom: '#92400e',
        groundEdge: '#fde68a',
        celestial: '#f59e0b',
        celestialGlow: 'rgba(245, 158, 11, 0.36)',
        starColor: '#d97706',
        oceanTop: '#38bdf8',
        oceanMid: '#0284c7',
        oceanBottom: '#0369a1',
        foamColor: 'rgba(255, 247, 237, 0.78)',
        pierTop: '#9a3412',
        pierDark: '#7c2d12',
        cloudColor: 'rgba(255, 251, 235, 0.88)',
        accentTint: '#ea580c',
        basketTop: '#fde68a',
        basketBottom: '#d97706',
      }
    }
    if (cozy === 'sakura-lantern' || base === 'sakura') {
      return {
        skyTop: '#fbcfe8',
        skyMid: '#ffe4e6',
        skyBottom: '#fff1f2',
        hillBack: 'rgba(244, 114, 182, 0.26)',
        groundTop: '#f472b6',
        groundBottom: '#be185d',
        groundEdge: '#fbcfe8',
        celestial: '#fbbf24',
        celestialGlow: 'rgba(251, 191, 36, 0.35)',
        starColor: '#ec4899',
        oceanTop: '#60a5fa',
        oceanMid: '#3b82f6',
        oceanBottom: '#1d4ed8',
        foamColor: 'rgba(255, 241, 242, 0.82)',
        pierTop: '#b45309',
        pierDark: '#78350f',
        cloudColor: 'rgba(255, 255, 255, 0.9)',
        accentTint: '#ec4899',
        basketTop: '#fbcfe8',
        basketBottom: '#ec4899',
      }
    }
    if (cozy === 'biolum-ocean' || cozy === 'winter-frost' || base === 'ocean') {
      return {
        skyTop: '#bae6fd',
        skyMid: '#e0f2fe',
        skyBottom: '#f0f9ff',
        hillBack: 'rgba(14, 165, 233, 0.25)',
        groundTop: '#38bdf8',
        groundBottom: '#0284c7',
        groundEdge: '#bae6fd',
        celestial: '#fbbf24',
        celestialGlow: 'rgba(251, 191, 36, 0.34)',
        starColor: '#0284c7',
        oceanTop: '#22d3ee',
        oceanMid: '#0284c7',
        oceanBottom: '#0369a1',
        foamColor: 'rgba(240, 249, 255, 0.86)',
        pierTop: '#a16207',
        pierDark: '#713f12',
        cloudColor: 'rgba(255, 255, 255, 0.92)',
        accentTint: '#0284c7',
        basketTop: '#bae6fd',
        basketBottom: '#0284c7',
      }
    }
    // Default Light Mode (Twilight / Pastel Cloudland / lainnya)
    return {
      skyTop: '#ddd6fe',
      skyMid: '#ede9fe',
      skyBottom: '#fdf2f8',
      hillBack: 'rgba(167, 139, 250, 0.28)',
      groundTop: '#a78bfa',
      groundBottom: '#6d28d9',
      groundEdge: '#f5d0fe',
      celestial: '#fbbf24',
      celestialGlow: 'rgba(251, 191, 36, 0.34)',
      starColor: '#7c3aed',
      oceanTop: '#38bdf8',
      oceanMid: '#2563eb',
      oceanBottom: '#1e40af',
      foamColor: 'rgba(255, 255, 255, 0.84)',
      pierTop: '#b45309',
      pierDark: '#78350f',
      cloudColor: 'rgba(255, 255, 255, 0.9)',
      accentTint: '#8b5cf6',
      basketTop: '#fbcfe8',
      basketBottom: '#a855f7',
    }
  }

  // Mode Gelap (Dark Mode) — selaras tema aktif
  if (cozy === 'matcha-garden') {
    return {
      skyTop: '#062118',
      skyMid: '#0a3326',
      skyBottom: '#134e3a',
      hillBack: 'rgba(16, 78, 58, 0.72)',
      groundTop: '#166534',
      groundBottom: '#052e16',
      groundEdge: 'rgba(134, 239, 172, 0.45)',
      celestial: '#fef08a',
      celestialGlow: 'rgba(254, 240, 138, 0.32)',
      starColor: '#bbf7d0',
      oceanTop: '#0f766e',
      oceanMid: '#115e59',
      oceanBottom: '#042f2e',
      foamColor: 'rgba(167, 243, 208, 0.45)',
      pierTop: '#78350f',
      pierDark: '#451a03',
      cloudColor: 'rgba(167, 243, 208, 0.16)',
      accentTint: '#4ade80',
      basketTop: '#86efac',
      basketBottom: '#16a34a',
    }
  }
  if (cozy === 'autumn-cafe' || cozy === 'honey-library') {
    return {
      skyTop: '#1f1008',
      skyMid: '#3b1d0c',
      skyBottom: '#572a12',
      hillBack: 'rgba(92, 42, 16, 0.74)',
      groundTop: '#7c2d12',
      groundBottom: '#431407',
      groundEdge: 'rgba(253, 186, 116, 0.48)',
      celestial: '#fde68a',
      celestialGlow: 'rgba(253, 230, 138, 0.34)',
      starColor: '#fed7aa',
      oceanTop: '#1e3a5f',
      oceanMid: '#172554',
      oceanBottom: '#0f172a',
      foamColor: 'rgba(254, 215, 170, 0.4)',
      pierTop: '#78350f',
      pierDark: '#451a03',
      cloudColor: 'rgba(253, 186, 116, 0.14)',
      accentTint: '#fb923c',
      basketTop: '#fed7aa',
      basketBottom: '#ea580c',
    }
  }
  if (cozy === 'biolum-ocean' || cozy === 'winter-frost' || cozy === 'midnight-rain' || base === 'ocean') {
    return {
      skyTop: '#041226',
      skyMid: '#082544',
      skyBottom: '#0d3b66',
      hillBack: 'rgba(12, 54, 92, 0.72)',
      groundTop: '#0e4a7b',
      groundBottom: '#072440',
      groundEdge: 'rgba(103, 232, 249, 0.5)',
      celestial: '#e0f2fe',
      celestialGlow: 'rgba(103, 232, 249, 0.34)',
      starColor: '#a5f3fc',
      oceanTop: '#0369a1',
      oceanMid: '#075985',
      oceanBottom: '#082f49',
      foamColor: 'rgba(103, 232, 249, 0.48)',
      pierTop: '#713f12',
      pierDark: '#422006',
      cloudColor: 'rgba(186, 230, 253, 0.14)',
      accentTint: '#22d3ee',
      basketTop: '#a5f3fc',
      basketBottom: '#0284c7',
    }
  }
  if (cozy === 'neon-night-city') {
    return {
      skyTop: '#09051a',
      skyMid: '#190b38',
      skyBottom: '#2d1157',
      hillBack: 'rgba(49, 16, 86, 0.78)',
      groundTop: '#4c1d95',
      groundBottom: '#1e0b3a',
      groundEdge: 'rgba(34, 211, 238, 0.58)',
      celestial: '#f472b6',
      celestialGlow: 'rgba(244, 114, 182, 0.38)',
      starColor: '#67e8f9',
      oceanTop: '#312e81',
      oceanMid: '#1e1b4b',
      oceanBottom: '#0f0a2a',
      foamColor: 'rgba(34, 211, 238, 0.52)',
      pierTop: '#581c87',
      pierDark: '#2e1065',
      cloudColor: 'rgba(244, 114, 182, 0.16)',
      accentTint: '#22d3ee',
      basketTop: '#67e8f9',
      basketBottom: '#ec4899',
    }
  }
  if (cozy === 'sakura-lantern' || base === 'sakura') {
    return {
      skyTop: '#240c1f',
      skyMid: '#3d1533',
      skyBottom: '#571e46',
      hillBack: 'rgba(84, 26, 66, 0.74)',
      groundTop: '#702459',
      groundBottom: '#3b102d',
      groundEdge: 'rgba(253, 164, 175, 0.48)',
      celestial: '#fef08a',
      celestialGlow: 'rgba(253, 164, 175, 0.35)',
      starColor: '#fecdd3',
      oceanTop: '#3b1e54',
      oceanMid: '#261442',
      oceanBottom: '#160b29',
      foamColor: 'rgba(253, 164, 175, 0.44)',
      pierTop: '#78350f',
      pierDark: '#451a03',
      cloudColor: 'rgba(253, 164, 175, 0.16)',
      accentTint: '#fda4af',
      basketTop: '#fecdd3',
      basketBottom: '#f43f5e',
    }
  }

  // Default Twilight Dark / Astral Palace
  return {
    skyTop: '#130e36',
    skyMid: '#24144a',
    skyBottom: '#361652',
    hillBack: 'rgba(46, 20, 74, 0.72)',
    groundTop: '#4a236b',
    groundBottom: '#261140',
    groundEdge: 'rgba(249, 168, 212, 0.4)',
    celestial: '#fef08a',
    celestialGlow: 'rgba(254, 240, 138, 0.34)',
    starColor: '#fbcfe8',
    oceanTop: '#1d4ed8',
    oceanMid: '#1e3a8a',
    oceanBottom: '#172554',
    foamColor: 'rgba(196, 181, 253, 0.46)',
    pierTop: '#78350f',
    pierDark: '#451a03',
    cloudColor: 'rgba(196, 181, 253, 0.16)',
    accentTint: '#f9a8d4',
    basketTop: '#fbcfe8',
    basketBottom: '#f472b6',
  }
}

/** Sesuaikan resolusi fisik kanvas terhadap batas DPR kualitas grafik */
function syncMiniGameCanvasDpr(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const rawDpr = window.devicePixelRatio || 1
  const cappedDpr = Math.max(1, Math.min(rawDpr, graphicsConfig.value.maxDpr))
  const targetW = Math.round(CANVAS_W * cappedDpr)
  const targetH = Math.round(CANVAS_H * cappedDpr)
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW
    canvas.height = targetH
  }
  ctx.setTransform(cappedDpr, 0, 0, cappedDpr, 0, 0)
}

function stopGameLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

function switchGameTab(nextGame: MiniGameId) {
  if (phase.value === 'playing') return
  if (activeGame.value === nextGame) return
  activeGame.value = nextGame
  phase.value = 'ready'
  roundSummary.value = null
  score.value = 0
  fishCaughtCount.value = 0
  starsCollectedCount.value = 0
  remainingSeconds.value = GAME_ROUND_DURATION_SECONDS
  fishingState = 'idle'
  fishingUiState.value = 'idle'
  fishingHintText.value = 'Lempar kail ke laut untuk mulai memancing!'
  requestAnimationFrame(() => drawCurrentScene(performance.now()))
}

/** Mulai ronde baru berdurasi 50 detik untuk game aktif (batas 3x main/hari per game) */
function startNewRound() {
  syncMiniGameDailyQuota()
  if (isPlayQuotaFull.value) return
  if (!consumeMiniGamePlayFor(activeGame.value)) return

  stopGameLoop()
  isRoundRewardProcessed = false
  score.value = 0
  fishCaughtCount.value = 0
  starsCollectedCount.value = 0
  remainingSeconds.value = GAME_ROUND_DURATION_SECONDS
  roundSummary.value = null
  phase.value = 'playing'

  // Reset state Catcher
  catX = CANVAS_W / 2
  catVx = 0
  pointerTargetX = null
  catTilt = 0
  runCycle = 0
  catFacing = 1
  squashTimer = 0
  catShockedUntil = 0
  catHappyUntil = 0
  screenShakeUntil = 0
  fallingObjects = []
  floatingTexts = []
  particles = []
  spawnAccumulator = 0
  dustAccumulator = 0

  // Reset state Fishing
  fishingState = 'idle'
  fishingUiState.value = 'idle'
  fishingHintText.value = 'Klik / Tap / Spasi untuk lempar kail ke laut!'
  bobberX = 325
  bobberY = WATER_Y + 18
  timingPos = 0.5
  timingDir = 1
  fishingCatExcitedUntil = 0

  const now = performance.now()
  lastFrameTime = now
  lastRenderedFrameTime = 0
  roundStartTime = now
  rafId = requestAnimationFrame(gameLoop)
}

/** Selesaikan ronde (anti-klaim ganda) & hitung hadiah terpadu */
function finishRound() {
  if (isRoundRewardProcessed) return
  isRoundRewardProcessed = true

  stopGameLoop()
  phase.value = 'finished'
  remainingSeconds.value = 0
  const gameId = activeGame.value
  const res = recordMiniGameRoundResult({
    gameId,
    score: score.value,
    fishCaught: fishCaughtCount.value,
    starsCollected: starsCollectedCount.value,
  })
  roundSummary.value = {
    gameId,
    fishCaught: fishCaughtCount.value,
    starsCollected: starsCollectedCount.value,
    ...res,
  }
}

// === AKSI COZY BEACH FISHING (1-Tombol / Tap / Spasi) ===
function triggerFishingAction() {
  if (phase.value !== 'playing' || activeGame.value !== 'fishing') return
  const now = performance.now()

  if (fishingState === 'idle' || fishingState === 'caught' || fishingState === 'missed') {
    // 1. Lempar kail ke laut!
    fishingState = 'casting'
    fishingUiState.value = 'casting'
    fishingStateStart = now
    bobberTargetX = 250 + Math.random() * 175
    bobberTargetY = WATER_Y + 16 + Math.random() * 30
    fishingHintText.value = 'Melempar kail ke laut...'
    playPopTing()
    return
  }

  if (fishingState === 'waiting') {
    // Klik terlalu cepat sebelum ada gigitan
    floatingTexts.push({
      x: bobberX,
      y: bobberY - 18,
      text: 'Sabar, tunggu tanda ! ya~',
      color: '#fde68a',
      life: 0.9,
    })
    return
  }

  if (fishingState === 'bite') {
    // 3. Cek posisi indikator di Zona Hijau!
    const inGreen = timingPos >= greenZoneStart && timingPos <= greenZoneEnd
    if (inGreen) {
      fishingState = 'caught'
      fishingUiState.value = 'caught'
      fishingStateStart = now
      caughtFlyStart = now
      caughtFlyFromX = bobberX
      caughtFlyFromY = bobberY
      fishingCatExcitedUntil = now + 900
      squashTimer = 0.3

      let pts = 20
      let label = '🐟 Ikan Biru +20'
      let textColor = '#7dd3fc'
      let isRare = false

      if (pendingCatchKind === 'blue-fish') {
        pts = 20
        fishCaughtCount.value += 1
        caughtFlyEmoji = '🐟'
        label = '+1 🐟 Ikan Biru (+20)'
        textColor = '#7dd3fc'
      } else if (pendingCatchKind === 'golden-fish') {
        pts = 35
        fishCaughtCount.value += 1
        caughtFlyEmoji = '🐠'
        label = '+1 🐟 Ikan Emas (+35)'
        textColor = '#fde047'
        isRare = true
      } else if (pendingCatchKind === 'starfish') {
        pts = 25
        starsCollectedCount.value += 1
        caughtFlyEmoji = '⭐'
        label = '+1 ⭐ Bintang Laut (+25)'
        textColor = '#fbcfe8'
      } else {
        pts = 30
        starsCollectedCount.value += 1
        caughtFlyEmoji = '🐚'
        label = '+1 🐚 Kerang Berkilau (+30)'
        textColor = '#f9a8d4'
        isRare = true
      }

      score.value += pts
      playGameCatch(isRare)
      triggerVibration(25)
      spawnParticleBurst(bobberX, bobberY, ['#7dd3fc', '#fde68a', '#ffffff'], 14, 'spark')
      spawnSplashBurst(bobberX, bobberY, 10)
      spawnHappyHeart(FISHING_CAT_X, FISHING_CAT_Y - 26)
      floatingTexts.push({ x: bobberX, y: bobberY - 24, text: label, color: textColor, life: 1.25 })
      fishingHintText.value = 'Yeay! Dapat tangkapan! Klik / Spasi untuk lempar lagi~'
    } else {
      fishingState = 'missed'
      fishingUiState.value = 'missed'
      fishingStateStart = now
      playGameZap()
      spawnSplashBurst(bobberX, bobberY, 8)
      floatingTexts.push({
        x: bobberX,
        y: bobberY - 20,
        text: 'Yah, lepas! 💦',
        color: '#fda4af',
        life: 1.0,
      })
      fishingHintText.value = 'Hampir kena! Lempar kail lagi ya~'
    }
  }
}

/** Munculkan 1 objek jatuh pada Starlight & Fish Catcher */
function spawnFallingObject() {
  const roll = Math.random()
  let kind: FallingKind = 'star'
  if (roll < 0.56) {
    kind = 'star'
  } else if (roll < 0.8) {
    kind = 'fish'
  } else {
    kind = 'storm'
  }

  const speedBase = kind === 'fish' ? 166 : kind === 'storm' ? 150 : 122
  fallingObjects.push({
    id: ++objectIdCounter,
    kind,
    x: 34 + Math.random() * (CANVAS_W - 68),
    y: -26,
    speed: speedBase + Math.random() * 60,
    radius: kind === 'fish' ? 18 : 19,
    rotation: Math.random() * Math.PI * 2,
    vRot: (Math.random() > 0.5 ? 1 : -1) * (1.1 + Math.random() * 1.4),
    wobblePhase: Math.random() * Math.PI * 2,
  })
}

function spawnParticleBurst(
  x: number,
  y: number,
  colors: string[],
  count: number,
  kind: 'spark' | 'electric',
) {
  const scale = graphicsConfig.value.particleScale
  const scaledCount = scale <= 0 ? 3 : Math.max(4, Math.round(count * scale))
  for (let i = 0; i < scaledCount; i++) {
    const angle = (Math.PI * 2 * i) / scaledCount + (Math.random() - 0.5) * 0.35
    const speed = (kind === 'electric' ? 80 : 60) + Math.random() * 95
    const maxLife = 0.42 + Math.random() * 0.25
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (kind === 'spark' ? 28 : 10),
      size: kind === 'electric' ? 2.4 + Math.random() * 2 : 2.6 + Math.random() * 2.6,
      color: colors[i % colors.length] ?? '#fde68a',
      life: maxLife,
      maxLife,
      kind,
    })
  }
}

function spawnSplashBurst(x: number, y: number, count: number) {
  const scale = graphicsConfig.value.particleScale
  const scaledCount = scale <= 0 ? 3 : Math.max(4, Math.round(count * scale))
  for (let i = 0; i < scaledCount; i++) {
    const angle = -Math.PI * (0.15 + Math.random() * 0.7)
    const speed = 55 + Math.random() * 75
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 15,
      size: 2.5 + Math.random() * 2.5,
      color: i % 2 === 0 ? '#e0f2fe' : '#7dd3fc',
      life: 0.48,
      maxLife: 0.48,
      kind: 'splash',
    })
  }
}

function spawnHappyHeart(x: number, y: number) {
  if (graphicsConfig.value.particleScale <= 0) return
  particles.push({
    x: x + (Math.random() - 0.5) * 18,
    y: y - 42,
    vx: (Math.random() - 0.5) * 18,
    vy: -42,
    size: 12,
    color: Math.random() > 0.4 ? '#f9a8d4' : '#fde68a',
    life: 0.6,
    maxLife: 0.6,
    kind: 'heart',
  })
}

function spawnRunDust(x: number, vx: number) {
  const scale = graphicsConfig.value.particleScale
  if (scale <= 0) return
  const dir = vx > 0 ? -1 : 1
  particles.push({
    x: x + dir * (14 + Math.random() * 8),
    y: GROUND_Y - 2 - Math.random() * 4,
    vx: dir * (22 + Math.random() * 28),
    vy: -14 - Math.random() * 18,
    size: 2.2 + Math.random() * 2.2,
    color: Math.random() > 0.5 ? '#fbcfe8' : '#e9d5ff',
    life: 0.36,
    maxLife: 0.36,
    kind: 'dust',
  })
}

/** GAME LOOP UTAMA (mendukung kedua mini-game secara bergantian) */
function gameLoop(now: number) {
  if (phase.value !== 'playing') {
    stopGameLoop()
    return
  }

  const minFrameMs = 1000 / Math.max(24, graphicsConfig.value.targetFps)
  if (lastRenderedFrameTime > 0 && now - lastRenderedFrameTime < minFrameMs * 0.9) {
    rafId = requestAnimationFrame(gameLoop)
    return
  }
  lastRenderedFrameTime = now

  const dt = Math.min(0.05, Math.max(0.004, (now - lastFrameTime) / 1000))
  lastFrameTime = now

  // Hitung sisa waktu ronde (50 detik)
  const elapsed = now - roundStartTime
  const leftMs = Math.max(0, ROUND_DURATION_MS - elapsed)
  remainingSeconds.value = Math.ceil(leftMs / 1000)
  if (leftMs <= 0) {
    drawCurrentScene(now)
    finishRound()
    return
  }

  if (activeGame.value === 'catcher') {
    updateCatcherFrame(now, dt, leftMs)
  } else {
    updateFishingFrame(now, dt)
  }

  // Perbarui partikel & teks melayang (bersama)
  particles = particles.filter((p) => {
    p.x += p.vx * dt
    p.y += p.vy * dt
    if (p.kind === 'spark' || p.kind === 'splash') {
      p.vy += 175 * dt
    } else if (p.kind === 'dust') {
      p.vx *= Math.exp(-3 * dt)
    }
    p.life -= dt
    return p.life > 0
  })

  floatingTexts = floatingTexts.filter((ft) => {
    ft.y -= 38 * dt
    ft.life -= dt * 1.25
    return ft.life > 0
  })

  drawCurrentScene(now)
  rafId = requestAnimationFrame(gameLoop)
}

function updateCatcherFrame(now: number, dt: number, leftMs: number) {
  const minX = 36
  const maxX = CANVAS_W - 36
  const keyDir = (keysPressed.right ? 1 : 0) - (keysPressed.left ? 1 : 0)

  if (keyDir !== 0) {
    pointerTargetX = null
    const accel = 2500
    const maxSpeed = 480
    catVx += keyDir * accel * dt
    catVx = Math.max(-maxSpeed, Math.min(maxSpeed, catVx))
    catX += catVx * dt
  } else if (pointerTargetX !== null) {
    const prevX = catX
    const smoothFactor = 1 - Math.exp(-16 * dt)
    catX += (pointerTargetX - catX) * smoothFactor
    const instVx = (catX - prevX) / dt
    catVx += (instVx - catVx) * Math.min(1, dt * 18)
    if (Math.abs(pointerTargetX - catX) < 0.8 && Math.abs(catVx) < 8) {
      catVx = 0
    }
  } else {
    catVx *= Math.exp(-10.5 * dt)
    if (Math.abs(catVx) < 5) catVx = 0
    catX += catVx * dt
  }

  if (catX < minX) {
    catX = minX
    catVx = Math.max(0, catVx * -0.2)
  } else if (catX > maxX) {
    catX = maxX
    catVx = Math.min(0, catVx * -0.2)
  }

  const absSpeed = Math.abs(catVx)
  if (absSpeed > 18) {
    catFacing = catVx > 0 ? 1 : -1
    runCycle += (absSpeed / 34) * dt
  } else {
    runCycle *= Math.exp(-8 * dt)
  }

  const targetTilt = Math.max(-1, Math.min(1, catVx / 440)) * (11 * (Math.PI / 180))
  catTilt += (targetTilt - catTilt) * Math.min(1, dt * 14)

  if (squashTimer > 0) {
    squashTimer = Math.max(0, squashTimer - dt)
  }

  if (absSpeed > 115) {
    dustAccumulator += dt
    const dustInterval = graphicsConfig.value.particleScale >= 1 ? 0.055 : 0.1
    if (dustAccumulator >= dustInterval) {
      dustAccumulator = 0
      spawnRunDust(catX, catVx)
    }
  } else {
    dustAccumulator = 0
  }

  const spawnInterval = leftMs < 12000 ? 0.43 : 0.55
  spawnAccumulator += dt
  while (spawnAccumulator >= spawnInterval) {
    spawnAccumulator -= spawnInterval
    spawnFallingObject()
  }

  const catCenterY = GROUND_Y - 26
  const catchRadiusX = 36
  const catchRadiusY = 30

  const remaining: FallingObject[] = []
  for (const obj of fallingObjects) {
    obj.y += obj.speed * dt
    obj.rotation += obj.vRot * dt

    const hitX = Math.abs(obj.x - catX) < catchRadiusX + obj.radius * 0.42
    const hitY = Math.abs(obj.y - catCenterY) < catchRadiusY + obj.radius * 0.42

    if (hitX && hitY) {
      if (obj.kind === 'star') {
        score.value += 10
        starsCollectedCount.value += 1
        catHappyUntil = now + 400
        squashTimer = 0.28
        playGameCatch(false)
        spawnParticleBurst(obj.x, obj.y, ['#f9a8d4', '#fdf2f8', '#fde68a'], 10, 'spark')
        spawnHappyHeart(catX, catCenterY)
        floatingTexts.push({ x: obj.x, y: obj.y - 10, text: '+10 ⭐', color: '#fbcfe8', life: 1 })
      } else if (obj.kind === 'fish') {
        score.value += 30
        fishCaughtCount.value += 1
        catHappyUntil = now + 420
        squashTimer = 0.32
        playGameCatch(true)
        spawnParticleBurst(obj.x, obj.y, ['#fde68a', '#fb923c', '#ffffff'], 15, 'spark')
        spawnHappyHeart(catX, catCenterY)
        floatingTexts.push({ x: obj.x, y: obj.y - 12, text: '+30 🐟 (+1)', color: '#fde68a', life: 1 })
      } else {
        score.value = Math.max(0, score.value - 20)
        catShockedUntil = now + 500
        screenShakeUntil = now + 150
        squashTimer = 0.22
        playGameZap()
        triggerVibration(80)
        spawnParticleBurst(obj.x, obj.y, ['#fde047', '#c084fc', '#f472b6'], 12, 'electric')
        floatingTexts.push({ x: obj.x, y: obj.y - 10, text: '-20 ⚡', color: '#fca5a5', life: 1 })
      }
      continue
    }

    if (obj.y < CANVAS_H + 34) {
      remaining.push(obj)
    }
  }
  fallingObjects = remaining
}

function updateFishingFrame(now: number, dt: number) {
  if (squashTimer > 0) {
    squashTimer = Math.max(0, squashTimer - dt)
  }

  // Gerakkan awan & siluet ikan bawah laut
  for (const c of beachClouds) {
    c.x += c.speed * dt
    if (c.x > CANVAS_W + 60) c.x = -60
  }
  for (const s of swimmingSilhouettes) {
    s.x += s.vx * dt
    if (s.x > CANVAS_W + 25) s.x = 165
    if (s.x < 160) s.x = CANVAS_W + 20
  }

  const stateElapsed = now - fishingStateStart

  if (fishingState === 'casting') {
    const t = Math.min(1, stateElapsed / 340)
    const rodTipX = FISHING_CAT_X + 76
    const rodTipY = FISHING_CAT_Y - 58
    bobberX = rodTipX + (bobberTargetX - rodTipX) * t
    bobberY = rodTipY + (bobberTargetY - rodTipY) * t - Math.sin(t * Math.PI) * 58
    if (t >= 1) {
      fishingState = 'waiting'
      fishingUiState.value = 'waiting'
      fishingStateStart = now
      fishingWaitDurationMs = 950 + Math.random() * 1450
      spawnSplashBurst(bobberX, bobberY, 7)
      fishingHintText.value = 'Menunggu ikan menyambar kail...'
    }
  } else if (fishingState === 'waiting') {
    bobberY = bobberTargetY + Math.sin(now * 0.0055) * 3
    if (stateElapsed >= fishingWaitDurationMs) {
      // Ikan menyambar! Buka Zona Hijau timing bar
      fishingState = 'bite'
      fishingUiState.value = 'bite'
      fishingStateStart = now
      timingPos = Math.random() > 0.5 ? 0.08 : 0.92
      timingDir = timingPos < 0.5 ? 1 : -1

      // Acak jenis tangkapan (60% ikan, 40% bintang laut / kerang)
      const roll = Math.random()
      if (roll < 0.36) {
        pendingCatchKind = 'blue-fish'
        timingSpeed = 1.25
        greenZoneStart = 0.33
        greenZoneEnd = 0.67
      } else if (roll < 0.6) {
        pendingCatchKind = 'golden-fish'
        timingSpeed = 1.55
        greenZoneStart = 0.36
        greenZoneEnd = 0.64
      } else if (roll < 0.82) {
        pendingCatchKind = 'starfish'
        timingSpeed = 1.32
        greenZoneStart = 0.34
        greenZoneEnd = 0.66
      } else {
        pendingCatchKind = 'pearl-shell'
        timingSpeed = 1.48
        greenZoneStart = 0.35
        greenZoneEnd = 0.65
      }

      spawnSplashBurst(bobberX, bobberY, 9)
      playPopTing()
      triggerVibration(30)
      fishingHintText.value = '❗ ADA GIGITAN! Klik / Tap / Spasi di Zona Hijau!'
    }
  } else if (fishingState === 'bite') {
    bobberY = bobberTargetY + Math.sin(now * 0.032) * 5.5 + 3
    timingPos += timingDir * timingSpeed * dt
    if (timingPos >= 1) {
      timingPos = 1
      timingDir = -1
    } else if (timingPos <= 0) {
      timingPos = 0
      timingDir = 1
    }
    // Jika terlalu lama tidak ditarik (> 3.8 detik), ikan lepas otomatis
    if (stateElapsed > 3800) {
      fishingState = 'missed'
      fishingUiState.value = 'missed'
      fishingStateStart = now
      floatingTexts.push({
        x: bobberX,
        y: bobberY - 20,
        text: 'Ikannya kabur~ 💦',
        color: '#fda4af',
        life: 0.95,
      })
      fishingHintText.value = 'Ikannya kabur! Klik / Spasi untuk lempar lagi~'
    }
  } else if (fishingState === 'caught' || fishingState === 'missed') {
    if (stateElapsed > 780) {
      fishingState = 'idle'
      fishingUiState.value = 'idle'
      fishingHintText.value = 'Klik / Tap / Spasi untuk lempar kail lagi!'
    }
  }
}

function drawCurrentScene(now: number) {
  if (activeGame.value === 'fishing') {
    drawBeachFishingScene(now)
  } else {
    drawCatcherScene(now)
  }
}

function drawMiniFourStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  alpha = 0.9,
) {
  const ir = r * 0.34
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const rad = i % 2 === 0 ? r : ir
    const a = (Math.PI / 4) * i - Math.PI / 2
    const x = cx + Math.cos(a) * rad
    const y = cy + Math.sin(a) * rad
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** ADEGAN 1: STARLIGHT & FISH CATCHER (Sinkron Tema & Mode Terang/Gelap + Kucing Utama) */
function drawCatcherScene(now: number) {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  syncMiniGameCanvasDpr(canvas, ctx)
  const pal = getCanvasThemePalette()
  const isLow = graphicsConfig.value.particleScale <= 0
  const dark = isDarkTheme.value

  // 1. Latar Langit Berlapis
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
  grad.addColorStop(0, pal.skyTop)
  grad.addColorStop(0.62, pal.skyMid)
  grad.addColorStop(1, pal.skyBottom)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  ctx.save()
  if (now < screenShakeUntil) {
    const progress = (screenShakeUntil - now) / 150
    const amp = 4 * progress
    ctx.translate((Math.random() - 0.5) * 2 * amp, (Math.random() - 0.5) * 2 * amp)
  }

  // 2. Matahari (Vibe Terang) atau Bulan Sabit (Vibe Gelap)
  ctx.save()
  const glow = ctx.createRadialGradient(CANVAS_W - 58, 48, 6, CANVAS_W - 58, 48, 52)
  glow.addColorStop(0, pal.celestialGlow)
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(CANVAS_W - 58, 48, 52, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = pal.celestial
  ctx.beginPath()
  if (dark) {
    ctx.arc(CANVAS_W - 58, 48, 17, 0.35, Math.PI * 1.65)
    ctx.arc(CANVAS_W - 50, 44, 14, Math.PI * 1.55, 0.45, true)
  } else {
    ctx.arc(CANVAS_W - 58, 48, 17, 0, Math.PI * 2)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // 3. Bintang Berkelip (Gelap) atau Kilau Lembut + Awan Pastel (Terang)
  if (dark) {
    const visibleStars = isLow ? bgStars.slice(0, 14) : bgStars
    for (const s of visibleStars) {
      const alpha = 0.28 + 0.65 * (0.5 + 0.5 * Math.sin(now * 0.0032 + s.phase))
      if (s.isSparkle && !isLow) {
        drawMiniFourStar(ctx, s.x, s.y, s.r * 2.2, pal.starColor, alpha)
      } else {
        ctx.fillStyle = `rgba(255, 245, 252, ${alpha.toFixed(2)})`
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  } else {
    for (const c of beachClouds) {
      drawSoftCloud(ctx, c.x, c.y + 8, c.scale * 0.9, pal.cloudColor)
    }
    for (const s of bgStars.slice(0, 10)) {
      const alpha = 0.18 + 0.32 * (0.5 + 0.5 * Math.sin(now * 0.003 + s.phase))
      drawMiniFourStar(ctx, s.x, s.y, s.r * 2, pal.starColor, alpha)
    }
  }

  // 4. Siluet Bukit & Pijakan
  ctx.fillStyle = pal.hillBack
  ctx.beginPath()
  ctx.moveTo(0, CANVAS_H)
  ctx.lineTo(0, GROUND_Y - 12)
  ctx.quadraticCurveTo(95, GROUND_Y - 34, 210, GROUND_Y - 10)
  ctx.quadraticCurveTo(335, GROUND_Y + 4, CANVAS_W, GROUND_Y - 22)
  ctx.lineTo(CANVAS_W, CANVAS_H)
  ctx.closePath()
  ctx.fill()

  const groundGrad = ctx.createLinearGradient(0, GROUND_Y - 6, 0, CANVAS_H)
  groundGrad.addColorStop(0, pal.groundTop)
  groundGrad.addColorStop(1, pal.groundBottom)
  ctx.fillStyle = groundGrad
  ctx.beginPath()
  ctx.moveTo(0, CANVAS_H)
  ctx.lineTo(0, GROUND_Y + 2)
  ctx.quadraticCurveTo(CANVAS_W * 0.28, GROUND_Y - 7, CANVAS_W * 0.55, GROUND_Y + 1)
  ctx.quadraticCurveTo(CANVAS_W * 0.8, GROUND_Y + 7, CANVAS_W, GROUND_Y - 3)
  ctx.lineTo(CANVAS_W, CANVAS_H)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = pal.groundEdge
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(0, GROUND_Y + 2)
  ctx.quadraticCurveTo(CANVAS_W * 0.28, GROUND_Y - 7, CANVAS_W * 0.55, GROUND_Y + 1)
  ctx.quadraticCurveTo(CANVAS_W * 0.8, GROUND_Y + 7, CANVAS_W, GROUND_Y - 3)
  ctx.stroke()

  // 5. Objek Jatuh
  for (const obj of fallingObjects) {
    ctx.save()
    ctx.translate(obj.x, obj.y)
    if (obj.kind === 'star') {
      drawLivingStar(ctx, obj.rotation, isLow)
    } else if (obj.kind === 'fish') {
      drawLivingGoldenFish(ctx, now, obj.wobblePhase, isLow)
    } else {
      drawLivingStormCloud(ctx, now, obj.wobblePhase, isLow)
    }
    ctx.restore()
  }

  // 6. Partikel Debu Lari
  for (const p of particles) {
    if (p.kind !== 'dust') continue
    const ratio = Math.max(0, p.life / p.maxLife)
    ctx.save()
    ctx.globalAlpha = ratio * 0.72
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * (0.6 + (1 - ratio) * 0.6), 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // 7. Karakter Kucing Utama (Ras + Aksesoris sinkron!)
  const isShocked = now < catShockedUntil
  const isHappy = now < catHappyUntil
  drawMainCatProcedural(ctx, {
    x: catX,
    groundY: GROUND_Y,
    now,
    shocked: isShocked,
    happy: isHappy,
    tilt: catTilt,
    vx: catVx,
    facing: catFacing,
    withBasket: true,
    basketTop: pal.basketTop,
    basketBottom: pal.basketBottom,
  })

  // 8. Partikel Kilau, Listrik, Hati & Teks Skor
  drawForegroundParticlesAndTexts(ctx)
  ctx.restore()
}

/** ADEGAN 2: COZY BEACH FISHING (Dermaga Pantai + Laut Berombak + Kucing Utama + Timing Bar) */
function drawBeachFishingScene(now: number) {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  syncMiniGameCanvasDpr(canvas, ctx)
  const pal = getCanvasThemePalette()
  const dark = isDarkTheme.value
  const isLow = graphicsConfig.value.particleScale <= 0

  // 1. Langit Pantai (menyesuaikan Light/Dark + Tema Aktif)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, WATER_Y)
  skyGrad.addColorStop(0, pal.skyTop)
  skyGrad.addColorStop(0.55, pal.skyMid)
  skyGrad.addColorStop(1, pal.skyBottom)
  ctx.fillStyle = skyGrad
  ctx.fillRect(0, 0, CANVAS_W, WATER_Y + 4)

  // 2. Matahari / Bulan & Bintang
  ctx.save()
  const sunX = CANVAS_W - 76
  const sunY = 58
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 64)
  sunGlow.addColorStop(0, pal.celestialGlow)
  sunGlow.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = sunGlow
  ctx.beginPath()
  ctx.arc(sunX, sunY, 64, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = pal.celestial
  ctx.beginPath()
  if (dark) {
    ctx.arc(sunX, sunY, 18, 0.35, Math.PI * 1.65)
    ctx.arc(sunX + 8, sunY - 4, 15, Math.PI * 1.55, 0.45, true)
  } else {
    ctx.arc(sunX, sunY, 20, 0, Math.PI * 2)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  if (dark) {
    const visibleStars = isLow ? bgStars.slice(0, 12) : bgStars.slice(0, 22)
    for (const s of visibleStars) {
      if (s.y > WATER_Y - 36) continue
      const alpha = 0.25 + 0.65 * (0.5 + 0.5 * Math.sin(now * 0.003 + s.phase))
      ctx.fillStyle = `rgba(255, 250, 255, ${alpha.toFixed(2)})`
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Awan lembut melayang
  for (const c of beachClouds) {
    drawSoftCloud(ctx, c.x, c.y, c.scale, pal.cloudColor)
  }

  // Pulau kecil di cakrawala kanan
  ctx.fillStyle = pal.hillBack
  ctx.beginPath()
  ctx.moveTo(295, WATER_Y)
  ctx.quadraticCurveTo(375, WATER_Y - 42, 460, WATER_Y - 8)
  ctx.lineTo(CANVAS_W, WATER_Y)
  ctx.closePath()
  ctx.fill()

  // 3. Lautan Pantai Bergradasi + Pantulan Cahaya
  const seaGrad = ctx.createLinearGradient(0, WATER_Y, 0, CANVAS_H)
  seaGrad.addColorStop(0, pal.oceanTop)
  seaGrad.addColorStop(0.5, pal.oceanMid)
  seaGrad.addColorStop(1, pal.oceanBottom)
  ctx.fillStyle = seaGrad
  ctx.fillRect(0, WATER_Y, CANVAS_W, CANVAS_H - WATER_Y)

  // Pantulan sinar matahari/bulan di permukaan air
  ctx.save()
  ctx.fillStyle = pal.celestialGlow
  for (let i = 0; i < 4; i++) {
    const rw = 34 - i * 6 + Math.sin(now * 0.004 + i) * 5
    ctx.beginPath()
    ctx.ellipse(sunX, WATER_Y + 12 + i * 13, rw, 2.5, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // Siluet ikan berenang santai di dalam laut
  ctx.save()
  ctx.fillStyle = dark ? 'rgba(186, 230, 253, 0.16)' : 'rgba(7, 89, 133, 0.22)'
  for (const s of swimmingSilhouettes) {
    const dir = s.vx >= 0 ? 1 : -1
    const sy = s.y + Math.sin(now * 0.004 + s.phase) * 3
    ctx.beginPath()
    ctx.ellipse(s.x, sy, s.size, s.size * 0.45, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(s.x - dir * s.size * 0.85, sy)
    ctx.lineTo(s.x - dir * (s.size + 6), sy - 4)
    ctx.lineTo(s.x - dir * (s.size + 6), sy + 4)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()

  // 3 Lapisan Ombak Beranimasi Halus
  for (let layer = 0; layer < 3; layer++) {
    const baseY = WATER_Y + 6 + layer * 24
    const amp = 3.2 - layer * 0.5
    const freq = 0.026 + layer * 0.007
    const speed = (layer % 2 === 0 ? 1 : -1) * (0.0022 + layer * 0.0008)
    ctx.strokeStyle = pal.foamColor
    ctx.lineWidth = layer === 0 ? 2.2 : 1.4
    ctx.beginPath()
    for (let x = 0; x <= CANVAS_W; x += 14) {
      const y = baseY + Math.sin(x * freq + now * speed + layer * 1.7) * amp
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  // 4. Dermaga Kayu Cozy di Sisi Kiri
  // Tiang penyangga dermaga masuk ke air
  ctx.fillStyle = pal.pierDark
  ctx.fillRect(22, PIER_DECK_Y + 8, 12, CANVAS_H - PIER_DECK_Y)
  ctx.fillRect(82, PIER_DECK_Y + 8, 12, CANVAS_H - PIER_DECK_Y)
  ctx.fillRect(130, PIER_DECK_Y + 8, 12, CANVAS_H - PIER_DECK_Y)

  // Papan dek kayu dermaga
  ctx.fillStyle = pal.pierTop
  ctx.beginPath()
  ctx.roundRect(-8, PIER_DECK_Y - 4, PIER_RIGHT_X + 10, 16, [0, 8, 8, 0])
  ctx.fill()
  ctx.strokeStyle = pal.pierDark
  ctx.lineWidth = 1.6
  ctx.stroke()

  // Garis sambungan papan kayu
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)'
  ctx.lineWidth = 1.2
  for (let px = 18; px < PIER_RIGHT_X - 4; px += 22) {
    ctx.beginPath()
    ctx.moveTo(px, PIER_DECK_Y - 3)
    ctx.lineTo(px, PIER_DECK_Y + 11)
    ctx.stroke()
  }

  // 5. Kucing Utama Duduk Memancing di Dermaga + Joran Pancing
  const isCatHappy = now < fishingCatExcitedUntil || fishingState === 'caught'
  const isCatAlert = fishingState === 'bite'

  drawMainCatProcedural(ctx, {
    x: FISHING_CAT_X,
    groundY: FISHING_CAT_Y,
    now,
    shocked: false,
    happy: isCatHappy,
    tilt: isCatAlert ? 0.08 : 0,
    vx: 0,
    facing: 1,
    withBasket: false,
    basketTop: pal.basketTop,
    basketBottom: pal.basketBottom,
  })

  // Joran Pancing Melengkung (sedikit melengkung saat ikan menyambar!)
  const rodBaseX = FISHING_CAT_X + 14
  const rodBaseY = FISHING_CAT_Y - 16
  const bend = fishingState === 'bite' ? 16 + Math.sin(now * 0.03) * 5 : fishingState === 'casting' ? -8 : 0
  const rodTipX = FISHING_CAT_X + 82
  const rodTipY = FISHING_CAT_Y - 62 + bend

  ctx.save()
  ctx.strokeStyle = '#92400e'
  ctx.lineWidth = 3.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(rodBaseX, rodBaseY)
  ctx.quadraticCurveTo(rodBaseX + 42, rodBaseY - 46 + bend * 0.4, rodTipX, rodTipY)
  ctx.stroke()

  // Pegangan & ring kecil joran
  ctx.strokeStyle = '#fde68a'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(rodTipX, rodTipY, 2.2, 0, Math.PI * 2)
  ctx.stroke()

  // Senar pancing & pelampung (saat kail berada di udara/air)
  if (fishingState === 'casting' || fishingState === 'waiting' || fishingState === 'bite') {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.lineWidth = 1.3
    ctx.beginPath()
    ctx.moveTo(rodTipX, rodTipY)
    ctx.quadraticCurveTo(
      (rodTipX + bobberX) * 0.5,
      Math.max(rodTipY, bobberY) - (fishingState === 'bite' ? 6 : 24),
      bobberX,
      bobberY - 4,
    )
    ctx.stroke()

    // Riak air konsentris di sekitar pelampung
    if (fishingState === 'waiting' || fishingState === 'bite') {
      const rippleR =
        fishingState === 'bite'
          ? 12 + ((now * 0.06) % 18)
          : 8 + ((now * 0.018) % 14)
      ctx.strokeStyle =
        fishingState === 'bite' ? 'rgba(254, 240, 138, 0.82)' : 'rgba(255, 255, 255, 0.55)'
      ctx.lineWidth = fishingState === 'bite' ? 2 : 1.3
      ctx.beginPath()
      ctx.ellipse(bobberX, bobberY + 2, rippleR, rippleR * 0.35, 0, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Pelampung merah-putih lucu
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(bobberX, bobberY - 2, 6, Math.PI, 0)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(bobberX, bobberY - 2, 6, 0, Math.PI)
    ctx.fill()
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(bobberX, bobberY - 2, 6, 0, Math.PI * 2)
    ctx.stroke()

    // Tanda seru '!' melompat saat ikan menyambar!
    if (fishingState === 'bite') {
      const bounceY = Math.abs(Math.sin(now * 0.018)) * 9
      ctx.save()
      ctx.translate(bobberX, bobberY - 34 - bounceY)
      ctx.fillStyle = '#fde047'
      ctx.strokeStyle = '#78350f'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, 14, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#78350f'
      ctx.font = 'bold 18px Fredoka, Quicksand, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('!', 0, 1)
      ctx.restore()
    }
  } else if (fishingState === 'idle') {
    // Senar menggantung santai di dekat ujung joran
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(rodTipX, rodTipY)
    ctx.lineTo(rodTipX + Math.sin(now * 0.003) * 4, rodTipY + 34)
    ctx.stroke()
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(rodTipX + Math.sin(now * 0.003) * 4, rodTipY + 36, 4.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // Animasi ikan/bintang laut terbang ke arah kucing saat berhasil ditarik!
  if (fishingState === 'caught') {
    const flyT = Math.min(1, (now - caughtFlyStart) / 560)
    const fx = caughtFlyFromX + (FISHING_CAT_X + 20 - caughtFlyFromX) * flyT
    const fy = caughtFlyFromY + (FISHING_CAT_Y - 40 - caughtFlyFromY) * flyT - Math.sin(flyT * Math.PI) * 90
    ctx.save()
    ctx.font = '28px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(caughtFlyEmoji, fx, fy)
    ctx.restore()
  }

  // 6. TIMING BAR ZONA HIJAU (muncul jelas saat ikan menyambar!)
  if (fishingState === 'bite' && phase.value === 'playing') {
    const barW = 248
    const barH = 22
    const barX = (CANVAS_W - barW) / 2
    const barY = CANVAS_H - 42

    ctx.save()
    // Panel latar bar kontras tinggi
    ctx.fillStyle = 'rgba(15, 23, 42, 0.86)'
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(barX - 8, barY - 22, barW + 16, barH + 30, 14)
    ctx.fill()
    ctx.stroke()

    // Label kecil di atas bar
    ctx.fillStyle = '#fef08a'
    ctx.font = 'bold 11px Fredoka, Quicksand, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('⚡ TEKAN KLIK / SPASI DI ZONA HIJAU!', CANVAS_W / 2, barY - 8)

    // Track abu gelap
    ctx.fillStyle = '#1e293b'
    ctx.beginPath()
    ctx.roundRect(barX, barY, barW, barH, 11)
    ctx.fill()

    // Zona Hijau (Target Tangkap!)
    const gzX = barX + greenZoneStart * barW
    const gzW = (greenZoneEnd - greenZoneStart) * barW
    const gzGrad = ctx.createLinearGradient(gzX, barY, gzX + gzW, barY)
    gzGrad.addColorStop(0, '#10b981')
    gzGrad.addColorStop(0.5, '#4ade80')
    gzGrad.addColorStop(1, '#10b981')
    ctx.fillStyle = gzGrad
    ctx.beginPath()
    ctx.roundRect(gzX, barY + 2, gzW, barH - 4, 8)
    ctx.fill()

    // Penanda jarum bergerak
    const markerX = barX + timingPos * barW
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(markerX - 5, barY - 3, 10, barH + 6, 5)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }

  // 7. Partikel & Teks Skor
  drawForegroundParticlesAndTexts(ctx)
}

function drawSoftCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, color: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(-16, 4, 13, 0, Math.PI * 2)
  ctx.arc(0, -3, 17, 0, Math.PI * 2)
  ctx.arc(17, 4, 12, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawForegroundParticlesAndTexts(ctx: CanvasRenderingContext2D) {
  for (const p of particles) {
    if (p.kind === 'dust') continue
    const ratio = Math.max(0, p.life / p.maxLife)
    ctx.save()
    ctx.globalAlpha = ratio
    if (p.kind === 'heart') {
      ctx.font = `bold ${Math.round(p.size)}px Quicksand, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillStyle = p.color
      ctx.fillText('♥', p.x, p.y)
    } else if (p.kind === 'electric') {
      ctx.strokeStyle = p.color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04)
      ctx.stroke()
    } else if (p.kind === 'splash') {
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    } else {
      drawMiniFourStar(ctx, p.x, p.y, p.size * 1.5, p.color, ratio)
    }
    ctx.restore()
  }

  ctx.font = 'bold 13.5px Fredoka, Quicksand, sans-serif'
  ctx.textAlign = 'center'
  for (const ft of floatingTexts) {
    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, ft.life))
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)'
    ctx.fillText(ft.text, ft.x + 1, ft.y + 1.5)
    ctx.fillStyle = ft.color
    ctx.fillText(ft.text, ft.x, ft.y)
    ctx.restore()
  }
}

/** Bintang Cahaya (+10) */
function drawLivingStar(ctx: CanvasRenderingContext2D, rotation: number, isLow: boolean) {
  const tailGrad = ctx.createLinearGradient(0, -4, 0, -34)
  tailGrad.addColorStop(0, 'rgba(249, 168, 212, 0.55)')
  tailGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.strokeStyle = tailGrad
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, -4)
  ctx.lineTo(0, -32)
  ctx.stroke()

  ctx.save()
  ctx.rotate(rotation)
  const r = 13.5
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const outer = (Math.PI * 2 * i) / 5 - Math.PI / 2
    const inner = outer + Math.PI / 5
    if (i === 0) ctx.moveTo(Math.cos(outer) * r, Math.sin(outer) * r)
    else ctx.lineTo(Math.cos(outer) * r, Math.sin(outer) * r)
    ctx.lineTo(Math.cos(inner) * (r * 0.46), Math.sin(inner) * (r * 0.46))
  }
  ctx.closePath()
  if (!isLow) {
    ctx.shadowColor = '#f9a8d4'
    ctx.shadowBlur = 12
  }
  ctx.fillStyle = '#fde047'
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.6
  ctx.stroke()
  ctx.restore()
}

/** Ikan Emas (+30) */
function drawLivingGoldenFish(
  ctx: CanvasRenderingContext2D,
  now: number,
  phaseVal: number,
  isLow: boolean,
) {
  const tailWag = Math.sin(now * 0.016 + phaseVal) * 3.5
  if (!isLow) {
    ctx.shadowColor = '#fbbf24'
    ctx.shadowBlur = 14
  }
  ctx.fillStyle = '#f97316'
  ctx.beginPath()
  ctx.moveTo(10, 0)
  ctx.lineTo(22, -8 + tailWag)
  ctx.lineTo(20, tailWag * 0.4)
  ctx.lineTo(22, 8 + tailWag)
  ctx.closePath()
  ctx.fill()

  const bodyGrad = ctx.createLinearGradient(-15, -8, 13, 8)
  bodyGrad.addColorStop(0, '#fef08a')
  bodyGrad.addColorStop(0.55, '#fbbf24')
  bodyGrad.addColorStop(1, '#f97316')
  ctx.fillStyle = bodyGrad
  ctx.beginPath()
  ctx.ellipse(-1, 0, 14.5, 9, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#fef3c7'
  ctx.lineWidth = 1.3
  ctx.stroke()

  ctx.shadowBlur = 0
  ctx.fillStyle = '#fb923c'
  ctx.beginPath()
  ctx.moveTo(-4, -8)
  ctx.quadraticCurveTo(2, -14, 6, -7)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.globalAlpha = 0.65
  ctx.beginPath()
  ctx.ellipse(-5, -3.5, 4, 1.8, -0.25, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  ctx.fillStyle = '#311042'
  ctx.beginPath()
  ctx.arc(-8, -1.5, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(-8.6, -2.1, 0.7, 0, Math.PI * 2)
  ctx.fill()
}

/** Awan Petir (-20) */
function drawLivingStormCloud(
  ctx: CanvasRenderingContext2D,
  now: number,
  phaseVal: number,
  isLow: boolean,
) {
  const pulse = 0.7 + 0.3 * Math.sin(now * 0.018 + phaseVal)

  ctx.fillStyle = '#3b1578'
  ctx.beginPath()
  ctx.arc(-10, -2, 10.5, 0, Math.PI * 2)
  ctx.arc(0, -8, 12.5, 0, Math.PI * 2)
  ctx.arc(10.5, -2, 9.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#5b21b6'
  ctx.beginPath()
  ctx.arc(-7, -4, 7.5, 0, Math.PI * 2)
  ctx.arc(2, -9, 8.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.save()
  if (!isLow) {
    ctx.shadowColor = '#fde047'
    ctx.shadowBlur = 10 * pulse
  }
  ctx.globalAlpha = pulse
  ctx.fillStyle = '#fde047'
  ctx.beginPath()
  ctx.moveTo(2, -2)
  ctx.lineTo(-5.5, 9)
  ctx.lineTo(0.5, 9)
  ctx.lineTo(-3, 20)
  ctx.lineTo(7.5, 6)
  ctx.lineTo(1.5, 6)
  ctx.closePath()
  ctx.fill()

  if (!isLow && Math.sin(now * 0.025 + phaseVal) > 0.35) {
    ctx.strokeStyle = '#fef08a'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(-14, 6)
    ctx.lineTo(-18, 10)
    ctx.lineTo(-15, 13)
    ctx.moveTo(14, 5)
    ctx.lineTo(18, 9)
    ctx.stroke()
  }
  ctx.restore()
}

/** Sayap Malaikat di belakang tubuh kucing */
function drawGameCatBackWings(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.fillStyle = '#fffdf7'
  ctx.strokeStyle = '#fde68a'
  ctx.lineWidth = 1.6
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(-14, -14)
  ctx.bezierCurveTo(-34, -22, -44, -36, -40, -46)
  ctx.bezierCurveTo(-31, -42, -24, -34, -18, -26)
  ctx.bezierCurveTo(-30, -30, -40, -26, -41, -17)
  ctx.bezierCurveTo(-32, -14, -24, -13, -16, -11)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(14, -14)
  ctx.bezierCurveTo(34, -22, 44, -36, 40, -46)
  ctx.bezierCurveTo(31, -42, 24, -34, 18, -26)
  ctx.bezierCurveTo(30, -30, 40, -26, 41, -17)
  ctx.bezierCurveTo(32, -14, 24, -13, 16, -11)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  drawMiniFourStar(ctx, -36, -50, 4.5, '#fef08a', 0.95)
  drawMiniFourStar(ctx, 36, -50, 4.5, '#fef08a', 0.95)
  ctx.restore()
}

/** 12 Aksesoris Kucing Utama di Canvas */
function drawGameCatAccessory(ctx: CanvasRenderingContext2D, accessory: MascotAccessoryId) {
  if (accessory === 'none' || accessory === 'angel-wings') return
  ctx.save()

  if (accessory === 'star-crown') {
    ctx.fillStyle = '#fde68a'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.4
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(-13, -53)
    ctx.lineTo(-10, -66)
    ctx.lineTo(0, -59)
    ctx.lineTo(10, -66)
    ctx.lineTo(13, -53)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#f9a8d4'
    ctx.beginPath()
    ctx.arc(0, -67, 2.5, 0, Math.PI * 2)
    ctx.fill()
  } else if (accessory === 'witch-hat') {
    ctx.fillStyle = '#4c1d95'
    ctx.strokeStyle = '#c4b5fd'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.ellipse(0, -54, 21, 5.2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#5b21b6'
    ctx.beginPath()
    ctx.moveTo(-14, -55)
    ctx.lineTo(-2, -77)
    ctx.quadraticCurveTo(3, -80, 8, -73)
    ctx.lineTo(14, -55)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = '#f9a8d4'
    ctx.lineWidth = 3.2
    ctx.beginPath()
    ctx.moveTo(-12, -57)
    ctx.quadraticCurveTo(0, -53, 12, -57)
    ctx.stroke()
  } else if (accessory === 'pink-bow') {
    ctx.save()
    ctx.translate(-15, -51)
    ctx.rotate(-0.35)
    ctx.fillStyle = '#f472b6'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.ellipse(-7, 0, 7, 4.5, -0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#f9a8d4'
    ctx.beginPath()
    ctx.ellipse(7, 0, 7, 4.5, 0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#fdf2f8'
    ctx.beginPath()
    ctx.arc(0, 0, 2.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  } else if (accessory === 'round-glasses') {
    ctx.strokeStyle = '#f59e0b'
    ctx.fillStyle = 'rgba(255, 251, 235, 0.22)'
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.arc(-8.5, -39, 6.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(8.5, -39, 6.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-2.3, -39)
    ctx.lineTo(2.3, -39)
    ctx.stroke()
  } else if (accessory === 'leaf-sprout') {
    ctx.strokeStyle = '#4ade80'
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, -54)
    ctx.quadraticCurveTo(-1, -63, 1, -69)
    ctx.stroke()
    ctx.fillStyle = '#4ade80'
    ctx.beginPath()
    ctx.ellipse(-6, -65, 6.5, 3.6, -0.55, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#22c55e'
    ctx.beginPath()
    ctx.ellipse(6.5, -67, 6.5, 3.6, 0.55, 0, Math.PI * 2)
    ctx.fill()
  } else if (accessory === 'open-book') {
    ctx.fillStyle = '#5b21b6'
    ctx.strokeStyle = '#fde68a'
    ctx.lineWidth = 1.3
    ctx.beginPath()
    ctx.moveTo(-16, -56)
    ctx.quadraticCurveTo(-8, -66, 0, -59)
    ctx.quadraticCurveTo(8, -66, 16, -56)
    ctx.lineTo(14, -52)
    ctx.quadraticCurveTo(7, -58, 0, -53)
    ctx.quadraticCurveTo(-7, -58, -14, -52)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#fffbeb'
    ctx.beginPath()
    ctx.moveTo(-14, -56.5)
    ctx.quadraticCurveTo(-7, -64.5, 0, -59.5)
    ctx.lineTo(0, -55)
    ctx.quadraticCurveTo(-7, -59, -12.5, -53.5)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#fef3c7'
    ctx.beginPath()
    ctx.moveTo(14, -56.5)
    ctx.quadraticCurveTo(7, -64.5, 0, -59.5)
    ctx.lineTo(0, -55)
    ctx.quadraticCurveTo(7, -59, 12.5, -53.5)
    ctx.closePath()
    ctx.fill()
  } else if (accessory === 'lofi-headphones') {
    ctx.strokeStyle = '#c084fc'
    ctx.lineWidth = 4.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(0, -39, 25, Math.PI, 0)
    ctx.stroke()
    ctx.fillStyle = '#9333ea'
    ctx.beginPath()
    ctx.roundRect(-29, -46, 8, 16, 4)
    ctx.roundRect(21, -46, 8, 16, 4)
    ctx.fill()
    ctx.fillStyle = '#67e8f9'
    ctx.beginPath()
    ctx.arc(-25, -38, 2.2, 0, Math.PI * 2)
    ctx.arc(25, -38, 2.2, 0, Math.PI * 2)
    ctx.fill()
  } else if (accessory === 'knit-scarf') {
    ctx.strokeStyle = '#fb7185'
    ctx.lineWidth = 6.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-16, -23)
    ctx.quadraticCurveTo(0, -16, 16, -23)
    ctx.stroke()
    ctx.fillStyle = '#f43f5e'
    ctx.beginPath()
    ctx.roundRect(8, -21, 7, 15, 3)
    ctx.fill()
    ctx.strokeStyle = '#fef3c7'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(9, -14)
    ctx.lineTo(14, -14)
    ctx.moveTo(9, -10)
    ctx.lineTo(14, -10)
    ctx.stroke()
  } else if (accessory === 'beret-hat') {
    ctx.save()
    ctx.translate(0, -57)
    ctx.rotate(-0.15)
    ctx.fillStyle = '#ddd6fe'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.ellipse(0, 0, 19, 8, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = '#8b5cf6'
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(-1, -7)
    ctx.quadraticCurveTo(1, -12, 4, -10)
    ctx.stroke()
    ctx.restore()
  } else if (accessory === 'star-halo') {
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.35)'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.ellipse(0, -66, 17, 4.5, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = '#fde047'
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.ellipse(0, -66, 16, 4, 0, 0, Math.PI * 2)
    ctx.stroke()
    drawMiniFourStar(ctx, -18, -66, 4, '#fef08a', 0.95)
  } else if (accessory === 'soulmate-collar') {
    ctx.strokeStyle = '#ec4899'
    ctx.lineWidth = 4.6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-15, -23)
    ctx.quadraticCurveTo(0, -17, 15, -23)
    ctx.stroke()
    ctx.fillStyle = '#f9a8d4'
    ctx.strokeStyle = '#fef08a'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(0, -16, 4.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    drawMiniFourStar(ctx, 0, -16, 3.2, '#fef08a', 1)
  }

  ctx.restore()
}

/**
 * Karakter Kucing Utama Prosedural (Canvas 2D) — 100% Sinkron dengan `mainCatType` (7 Ras) & `mainCatAccessory` (12 Aksesoris)
 */
function drawMainCatProcedural(
  ctx: CanvasRenderingContext2D,
  opts: {
    x: number
    groundY: number
    now: number
    shocked: boolean
    happy: boolean
    tilt: number
    vx: number
    facing: number
    withBasket: boolean
    basketTop: string
    basketBottom: string
  },
) {
  const breed: CatBreedPalette = getCatBreedPalette(mainCatType.value)
  const accessory = mainCatAccessory.value
  const earInner = breed.earInnerOverride ?? '#fbcfe8'
  const faceInk = breed.isDarkFur ? '#fde68a' : breed.eyeInk
  const whiskerColor = breed.isDarkFur ? '#94a3b8' : breed.foreheadStripe

  const breath = Math.sin(opts.now * 0.005) * 0.028
  let scaleX = 1 - breath * 0.7
  let scaleY = 1 + breath
  if (squashTimer > 0) {
    const t = squashTimer / 0.28
    const wave = Math.sin(t * Math.PI * 2) * 0.14 * t
    scaleX += wave
    scaleY -= wave
  }

  const shockAlpha = opts.shocked ? (Math.floor(opts.now / 70) % 2 === 0 ? 0.55 : 0.96) : 1
  const legSwing = Math.sin(runCycle * 5.2) * Math.min(1, Math.abs(opts.vx) / 140)
  const tailWag =
    Math.sin(opts.now * 0.007 + runCycle * 1.8) * 6 - Math.max(-12, Math.min(12, opts.vx * 0.03))

  // Bayangan lembut
  ctx.save()
  ctx.fillStyle = 'rgba(10, 5, 24, 0.32)'
  ctx.beginPath()
  ctx.ellipse(opts.x, opts.groundY + 2, 23 * scaleX, 5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = shockAlpha
  ctx.translate(opts.x, opts.groundY)
  ctx.rotate(opts.tilt)
  ctx.scale(scaleX, scaleY)

  if (accessory === 'angel-wings') {
    drawGameCatBackWings(ctx)
  }

  // 1. Ekor Lentur sesuai ras
  const tailSide = -opts.facing
  ctx.strokeStyle = breed.tailFill
  ctx.lineWidth = 6.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(tailSide * 14, -14)
  ctx.bezierCurveTo(
    tailSide * 30,
    -15 + tailWag * 0.4,
    tailSide * 32 + tailWag * 0.3,
    -32,
    tailSide * 22 + tailWag * 0.6,
    -38,
  )
  ctx.stroke()
  // Ujung ekor ras
  ctx.fillStyle = breed.tailTipFill
  ctx.beginPath()
  ctx.arc(tailSide * 22 + tailWag * 0.6, -38, 3.6, 0, Math.PI * 2)
  ctx.fill()

  // 2. Kaki Kecil
  ctx.fillStyle = breed.pawFill
  ctx.strokeStyle = breed.pawStroke
  ctx.lineWidth = 1.3
  const leftFootY = -5 - Math.max(0, legSwing) * 5.5
  const rightFootY = -5 - Math.max(0, -legSwing) * 5.5
  ctx.beginPath()
  ctx.ellipse(-10 + legSwing * 4, leftFootY, 6.2, 4.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(10 - legSwing * 4, rightFootY, 6.2, 4.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // 3. Badan Gemoy
  ctx.fillStyle = breed.bodyFill
  ctx.strokeStyle = breed.earOuterStroke
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.ellipse(0, -17, 19.5, 14.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Perut / Dada Tuxedo
  ctx.fillStyle = breed.tuxedoChestFill ?? breed.bellyFill
  ctx.beginPath()
  ctx.ellipse(0, -15, 11.5, 8.5, 0, 0, Math.PI * 2)
  ctx.fill()

  // 4. Telinga Runcing
  ctx.fillStyle = breed.earOuterFill
  ctx.strokeStyle = breed.earOuterStroke
  ctx.lineWidth = 1.4
  ctx.lineJoin = 'round'
  // Telinga kiri
  ctx.beginPath()
  ctx.moveTo(-18, -44)
  ctx.lineTo(-22, -62)
  ctx.lineTo(-7, -53)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = earInner
  ctx.beginPath()
  ctx.moveTo(-16.5, -46.5)
  ctx.lineTo(-19, -58)
  ctx.lineTo(-10, -52)
  ctx.closePath()
  ctx.fill()

  // Telinga kanan (untuk Calico: satu telinga oranye, satu cokelat tua!)
  ctx.fillStyle = breed.calicoPatch2 ?? breed.earOuterFill
  ctx.beginPath()
  ctx.moveTo(18, -44)
  ctx.lineTo(22, -62)
  ctx.lineTo(7, -53)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = earInner
  ctx.beginPath()
  ctx.moveTo(16.5, -46.5)
  ctx.lineTo(19, -58)
  ctx.lineTo(10, -52)
  ctx.closePath()
  ctx.fill()

  // 5. Kepala Kucing Bulat
  ctx.fillStyle = breed.headFill
  ctx.strokeStyle = breed.earOuterStroke
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.ellipse(0, -39, 23, 18.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Pola khas Ras: Calico patches / Siamese mask / Tuxedo muzzle / Tabby stripes
  if (breed.calicoPatch1 && breed.calicoPatch2) {
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(0, -39, 22.2, 17.8, 0, 0, Math.PI * 2)
    ctx.clip()
    ctx.fillStyle = breed.calicoPatch1
    ctx.beginPath()
    ctx.ellipse(-15, -49, 10, 8, -0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = breed.calicoPatch2
    ctx.beginPath()
    ctx.ellipse(16, -48, 9, 7.5, 0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  if (breed.siameseMaskFill) {
    ctx.fillStyle = breed.siameseMaskFill
    ctx.globalAlpha = 0.85
    ctx.beginPath()
    ctx.ellipse(0, -37, 13.5, 9.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  if (breed.muzzleFill) {
    ctx.fillStyle = breed.muzzleFill
    ctx.beginPath()
    ctx.ellipse(0, -33.5, 11.5, 6.5, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Garis dahi khas kucing
  ctx.strokeStyle = breed.foreheadStripe
  ctx.lineWidth = 1.7
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-4, -55)
  ctx.lineTo(-3.5, -50)
  ctx.moveTo(0, -56)
  ctx.lineTo(0, -49.5)
  ctx.moveTo(4, -55)
  ctx.lineTo(3.5, -50)
  ctx.stroke()

  // Garis pipi untuk ras tabby/ginger/lilac
  if (breed.cheekStripeColor) {
    ctx.strokeStyle = breed.cheekStripeColor
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(-18, -40)
    ctx.lineTo(-14, -39)
    ctx.moveTo(18, -40)
    ctx.lineTo(14, -39)
    ctx.stroke()
  }

  // 6. Pipi Merona
  ctx.fillStyle = opts.happy ? 'rgba(244, 114, 182, 0.92)' : 'rgba(249, 168, 212, 0.62)'
  ctx.beginPath()
  ctx.ellipse(-13.5, -34, 4.5, 2.6, 0, 0, Math.PI * 2)
  ctx.ellipse(13.5, -34, 4.5, 2.6, 0, 0, Math.PI * 2)
  ctx.fill()

  // 7. Ekspresi Wajah
  ctx.strokeStyle = faceInk
  ctx.fillStyle = faceInk
  ctx.lineWidth = 2.1
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (opts.shocked) {
    ctx.beginPath()
    ctx.moveTo(-12.5, -42)
    ctx.lineTo(-6.5, -39)
    ctx.lineTo(-12.5, -36)
    ctx.moveTo(12.5, -42)
    ctx.lineTo(6.5, -39)
    ctx.lineTo(12.5, -36)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-5, -32)
    ctx.quadraticCurveTo(-2.5, -35, 0, -32)
    ctx.quadraticCurveTo(2.5, -29, 5, -32)
    ctx.stroke()
  } else if (opts.happy) {
    ctx.beginPath()
    ctx.moveTo(-12.5, -38.5)
    ctx.quadraticCurveTo(-8.5, -44, -4.5, -38.5)
    ctx.moveTo(4.5, -38.5)
    ctx.quadraticCurveTo(8.5, -44, 12.5, -38.5)
    ctx.stroke()
    ctx.fillStyle = breed.noseFill
    ctx.beginPath()
    ctx.moveTo(-2.2, -35.5)
    ctx.lineTo(2.2, -35.5)
    ctx.lineTo(0, -33.2)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = breed.muzzleFill ? '#1f2937' : faceInk
    ctx.beginPath()
    ctx.moveTo(-5.2, -31.8)
    ctx.quadraticCurveTo(-2.6, -28.8, 0, -32.2)
    ctx.quadraticCurveTo(2.6, -28.8, 5.2, -31.8)
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.arc(-8.5, -39.5, 3.2, 0, Math.PI * 2)
    ctx.arc(8.5, -39.5, 3.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(-9.5, -40.7, 1.1, 0, Math.PI * 2)
    ctx.arc(7.5, -40.7, 1.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = breed.noseFill
    ctx.beginPath()
    ctx.moveTo(-2, -35.5)
    ctx.lineTo(2, -35.5)
    ctx.lineTo(0, -33.4)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = breed.muzzleFill ? '#1f2937' : faceInk
    ctx.beginPath()
    ctx.moveTo(-4.8, -32)
    ctx.quadraticCurveTo(-2.4, -29.4, 0, -32.4)
    ctx.quadraticCurveTo(2.4, -29.4, 4.8, -32)
    ctx.stroke()
  }

  // Kumis halus
  ctx.strokeStyle = whiskerColor
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(-19, -36)
  ctx.lineTo(-26, -37)
  ctx.moveTo(-19, -33)
  ctx.lineTo(-26, -32)
  ctx.moveTo(19, -36)
  ctx.lineTo(26, -37)
  ctx.moveTo(19, -33)
  ctx.lineTo(26, -32)
  ctx.stroke()

  // 8. Aksesoris Kucing Utama yang sedang dipakai
  drawGameCatAccessory(ctx, accessory)

  // 9. Keranjang Bintang (hanya pada Starlight & Fish Catcher)
  if (opts.withBasket) {
    const basketGrad = ctx.createLinearGradient(0, -19, 0, -7)
    basketGrad.addColorStop(0, opts.basketTop)
    basketGrad.addColorStop(1, opts.basketBottom)
    ctx.fillStyle = basketGrad
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.roundRect(-21, -18, 42, 11, 5.5)
    ctx.fill()
    ctx.stroke()
    drawMiniFourStar(ctx, 0, -12.5, 4, '#fef08a', 0.95)
  }

  ctx.restore()
}

/** Kontrol Pointer / Tap di Canvas (Catcher = geser kucing, Fishing = aksi lempar/tarik!) */
function handleCanvasPointerDown(event: PointerEvent) {
  if (phase.value !== 'playing') return
  if (activeGame.value === 'fishing') {
    triggerFishingAction()
    return
  }
  updateTargetFromPointer(event)
}

function updateTargetFromPointer(event: PointerEvent) {
  if (phase.value !== 'playing' || activeGame.value !== 'catcher') return
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  if (rect.width <= 0) return

  const relX = ((event.clientX - rect.left) / rect.width) * CANVAS_W
  pointerTargetX = Math.max(36, Math.min(CANVAS_W - 36, relX))
}

function handleKeyDown(event: KeyboardEvent) {
  if (!isMiniGameOpen.value) return
  if (event.key === 'Escape') {
    closeMiniGame()
    return
  }
  if (activeGame.value === 'fishing' && event.code === 'Space') {
    event.preventDefault()
    if (phase.value === 'playing') {
      triggerFishingAction()
    } else if (phase.value === 'ready' && !isPlayQuotaFull.value) {
      startNewRound()
    }
    return
  }
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
    keysPressed.left = true
  }
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
    keysPressed.right = true
  }
}

function handleKeyUp(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
    keysPressed.left = false
  }
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
    keysPressed.right = false
  }
}

function closeMiniGame() {
  stopGameLoop()
  phase.value = 'ready'
  isMiniGameOpen.value = false
}

// Redraw pratinjau kanvas saat modal dibuka, tema/mode berubah, atau kucing utama diganti
watch([isMiniGameOpen, isDarkTheme, activeCozyTheme, theme, mainCatType, mainCatAccessory], ([open]) => {
  if (open) {
    syncMiniGameDailyQuota()
    if (phase.value !== 'playing') {
      requestAnimationFrame(() => drawCurrentScene(performance.now()))
    }
  } else {
    stopGameLoop()
    phase.value = 'ready'
    keysPressed.left = false
    keysPressed.right = false
  }
})

onMounted(() => {
  if (import.meta.client) {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
  }
})

onUnmounted(() => {
  stopGameLoop()
  if (import.meta.client) {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
  }
})
</script>

<template>
  <!-- Modal Break Game (Sinkron Tema & Mode Terang/Gelap • 2 Game: Starlight Catcher & Cozy Beach Fishing) -->
  <Transition
    enter-active-class="transition duration-250 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="isMiniGameOpen"
      role="dialog"
      aria-modal="true"
      aria-label="Break Game Twilight's"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-md sm:p-5"
      @click.self="closeMiniGame"
    >
      <div
        class="relative flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border-[1.5px] shadow-2xl backdrop-blur-xl"
        style="
          background: var(--card-bg-solid);
          border-color: var(--border-strong);
          color: var(--text-primary);
          box-shadow: 0 24px 60px -12px var(--twilight-glow);
        "
      >
        <!-- Nuansa partikel lembut selaras tema aktif -->
        <div
          aria-hidden="true"
          class="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full opacity-25 blur-3xl"
          style="background: var(--accent-primary)"
        />
        <div
          aria-hidden="true"
          class="pointer-events-none absolute -bottom-14 -left-14 h-40 w-40 rounded-full opacity-20 blur-3xl"
          style="background: var(--accent-secondary)"
        />

        <!-- Header Modal Break Game -->
        <div
          class="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-5"
          style="border-color: var(--border-subtle); background: var(--surface-subtle)"
        >
          <div class="flex items-center gap-2.5">
            <span class="text-xl">{{ activeGame === 'fishing' ? '🎣' : '🎮' }}</span>
            <div>
              <h2 class="font-display text-base font-bold sm:text-lg" style="color: var(--title-color)">
                {{ activeGame === 'fishing' ? 'Cozy Beach Fishing' : 'Starlight & Fish Catcher' }}
              </h2>
              <p class="text-[11px] font-semibold" style="color: var(--text-secondary)">
                Selingan {{ GAME_ROUND_DURATION_SECONDS }} detik • +{{ GAME_COMPLETION_BASE_COINS }} 🐟/ronde • 1 Ikan = +1 🐟 • 3 Item = +1 💖
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- Badge Kucing Utama Sinkron (tanpa tombol Putih/Hitam lama) -->
            <span
              class="hidden items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] font-bold sm:inline-flex"
              style="
                background: var(--accent-soft);
                border-color: var(--border-strong);
                color: var(--text-primary);
              "
              title="Karakter game otomatis mengikuti Kucing Utama & aksesoris yang sedang dipakai"
            >
              <span>{{ activeMainCatInfo.icon }}</span>
              <span class="max-w-[110px] truncate">{{ activeMainCatInfo.name }}</span>
            </span>

            <button
              type="button"
              aria-label="Tutup Break Game"
              class="cozy-secondary-btn btn-bouncy flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-xs font-bold"
              @click="closeMiniGame"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Tab Switcher 2 Game -->
        <div
          class="relative z-10 flex items-center gap-2 border-b px-4 py-2"
          style="border-color: var(--border-subtle); background: var(--card-bg-solid)"
        >
          <button
            type="button"
            :disabled="phase === 'playing'"
            class="flex-1 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-65"
            :class="activeGame === 'catcher' ? 'cozy-active-btn border-transparent shadow-sm' : 'cozy-tab-inactive'"
            @click="switchGameTab('catcher')"
          >
            ✨ Starlight &amp; Fish Catcher ({{ catcherPlayCount }}/{{ MAX_GAME_DAILY_PLAYS }})
          </button>
          <button
            type="button"
            :disabled="phase === 'playing'"
            class="flex-1 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-65"
            :class="activeGame === 'fishing' ? 'cozy-active-btn border-transparent shadow-sm' : 'cozy-tab-inactive'"
            @click="switchGameTab('fishing')"
          >
            🎣 Cozy Beach Fishing ({{ fishingPlayCount }}/{{ MAX_GAME_DAILY_PLAYS }})
          </button>
        </div>

        <!-- Bar HUD: Skor, Waktu (50d), Rekor, Hadiah Hari Ini (3/3), Main Hari Ini (3/3) -->
        <div
          class="relative z-10 grid grid-cols-3 gap-1.5 border-b px-4 py-2 text-center sm:grid-cols-5"
          style="border-color: var(--border-subtle); background: var(--surface-subtle)"
        >
          <div
            class="rounded-xl border px-2 py-1"
            style="background: var(--card-bg-solid); border-color: var(--border-subtle)"
          >
            <p class="text-[10px] font-semibold" style="color: var(--text-secondary)">Skor</p>
            <p class="font-display text-sm font-bold sm:text-base" style="color: var(--accent-primary)">
              {{ score }}
            </p>
          </div>

          <div
            class="rounded-xl border px-2 py-1"
            style="background: var(--card-bg-solid); border-color: var(--border-subtle)"
          >
            <p class="text-[10px] font-semibold" style="color: var(--text-secondary)">Waktu</p>
            <p
              class="font-display text-sm font-bold sm:text-base"
              :class="remainingSeconds <= 8 && phase === 'playing' ? 'animate-pulse text-rose-500' : ''"
              :style="remainingSeconds <= 8 && phase === 'playing' ? undefined : { color: 'var(--text-primary)' }"
            >
              {{ remainingSeconds }}d
            </p>
          </div>

          <div
            class="rounded-xl border px-2 py-1"
            style="background: var(--card-bg-solid); border-color: var(--border-subtle)"
          >
            <p class="text-[10px] font-semibold" style="color: var(--text-secondary)">Rekor 🏆</p>
            <p class="font-display text-sm font-bold sm:text-base" style="color: var(--text-primary)">
              {{ currentHighScore }}
            </p>
          </div>

          <div
            class="rounded-xl border px-2 py-1"
            style="background: var(--card-bg-solid); border-color: var(--border-subtle)"
          >
            <p class="text-[10px] font-semibold" style="color: var(--text-secondary)">Hadiah</p>
            <p
              class="font-display text-sm font-bold sm:text-base"
              :style="{ color: isRewardQuotaFull ? 'var(--text-secondary)' : 'var(--accent-primary)' }"
            >
              🐟 {{ currentRewardCount }}/{{ MAX_GAME_DAILY_REWARDS }}
            </p>
          </div>

          <div
            class="col-span-2 rounded-xl border px-2 py-1 sm:col-span-1"
            style="background: var(--card-bg-solid); border-color: var(--border-subtle)"
          >
            <p class="text-[10px] font-semibold" style="color: var(--text-secondary)">Main</p>
            <p
              class="font-display text-sm font-bold sm:text-base"
              :class="isPlayQuotaFull ? 'text-rose-500' : ''"
              :style="isPlayQuotaFull ? undefined : { color: 'var(--text-primary)' }"
            >
              🎮 {{ currentPlayCount }}/{{ MAX_GAME_DAILY_PLAYS }}
            </p>
          </div>
        </div>

        <!-- Area Kanvas Permainan + Overlay Mulai / Kuota Penuh / Hasil Ronde -->
        <div class="relative z-10 overflow-y-auto p-3.5 sm:p-4">
          <!-- Pill Penghitung Tangkapan Ronde Berjalan -->
          <div class="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold">
            <div class="flex items-center gap-2">
              <span
                class="rounded-full border px-2.5 py-0.5"
                style="
                  background: var(--accent-soft);
                  border-color: var(--border-subtle);
                  color: var(--text-primary);
                "
              >
                🐟 Ikan: {{ fishCaughtCount }} (+{{ fishCaughtCount }} Koin)
              </span>
              <span
                class="rounded-full border px-2.5 py-0.5"
                style="
                  background: var(--accent-soft);
                  border-color: var(--border-subtle);
                  color: var(--text-primary);
                "
              >
                {{ activeGame === 'fishing' ? '⭐/🐚 Item' : '⭐ Bintang' }}: {{ starsCollectedCount }} (+{{ Math.floor(starsCollectedCount / 3) }} 💖)
              </span>
            </div>
            <span class="text-[10.5px] font-semibold" style="color: var(--text-secondary)">
              Reset kuota 00:00
            </span>
          </div>

          <div
            class="relative overflow-hidden rounded-2xl border-[1.5px] shadow-inner"
            style="border-color: var(--border-strong); background: var(--surface-subtle)"
          >
            <canvas
              ref="canvasRef"
              :width="CANVAS_W"
              :height="CANVAS_H"
              class="block aspect-[4/3] w-full cursor-pointer touch-none select-none"
              @pointerdown="handleCanvasPointerDown"
              @pointermove="updateTargetFromPointer"
            />

            <!-- OVERLAY 1: LAYAR AWAL SEBELUM MULAI / KUOTA PENUH (3/3) -->
            <div
              v-if="phase === 'ready'"
              class="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto p-4 text-center backdrop-blur-sm"
              style="background: var(--card-bg-solid); opacity: 0.96; color: var(--text-primary)"
            >
              <!-- Pesan Jika Kuota Game Ini Sudah Habis (3/3) -->
              <template v-if="isPlayQuotaFull">
                <p class="text-3xl">⏳</p>
                <p
                  class="font-display mt-2 max-w-sm text-sm font-bold leading-relaxed sm:text-base"
                  style="color: var(--text-primary)"
                >
                  ⏳ Kuota main game ini hari ini sudah habis (3/3). Kembali lagi besok ya, meow~
                </p>
                <p class="mt-1.5 max-w-xs text-[11px] font-semibold" style="color: var(--text-secondary)">
                  {{
                    activeGame === 'catcher' && fishingPlayCount < MAX_GAME_DAILY_PLAYS
                      ? 'Psst! Kuota 🎣 Cozy Beach Fishing kamu masih tersedia hari ini loh~'
                      : activeGame === 'fishing' && catcherPlayCount < MAX_GAME_DAILY_PLAYS
                        ? 'Psst! Kuota ✨ Starlight & Fish Catcher kamu masih tersedia hari ini loh~'
                        : 'Ayo lanjutkan sesi fokusmu dulu, besok kuota kembali 0/3 pada pukul 00:00 ✨'
                  }}
                </p>
                <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled
                    class="cozy-secondary-btn cursor-not-allowed rounded-full px-5 py-2 text-xs font-bold opacity-55"
                  >
                    {{ activeGame === 'fishing' ? '🎣 Mulai Mancing (3/3)' : '▶ Mulai Main (3/3)' }}
                  </button>
                  <button
                    type="button"
                    class="cozy-active-btn btn-bouncy cursor-pointer rounded-full px-5 py-2 text-xs font-bold shadow"
                    @click="closeMiniGame"
                  >
                    Kembali Fokus ✨
                  </button>
                </div>
              </template>

              <!-- Layar Siap Main: Starlight & Fish Catcher -->
              <template v-else-if="activeGame === 'catcher'">
                <p class="font-display text-lg font-bold sm:text-xl" style="color: var(--title-color)">
                  Tangkap Bintang &amp; Ikan Emas! ✨
                </p>

                <div class="mt-2.5 flex flex-wrap justify-center gap-1.5 text-[11px] font-bold">
                  <span
                    class="rounded-full border px-2.5 py-1"
                    style="background: var(--accent-soft); border-color: var(--border-subtle)"
                  >
                    ⭐ Bintang +10 (3⭐ = +1 💖)
                  </span>
                  <span
                    class="rounded-full border px-2.5 py-1"
                    style="background: var(--accent-soft); border-color: var(--border-subtle)"
                  >
                    🐟 Ikan Emas +30 (+1 🐟)
                  </span>
                  <span
                    class="rounded-full border px-2.5 py-1"
                    style="background: var(--surface-subtle); border-color: var(--border-subtle)"
                  >
                    ⚡ Petir -20
                  </span>
                </div>

                <p class="mt-2.5 max-w-xs text-xs font-medium" style="color: var(--text-secondary)">
                  Gerakkan <strong>{{ activeMainCatInfo.name }}</strong> pakai <strong>mouse / panah (← → / A D)</strong> di PC, atau <strong>geser jari</strong> di HP selama <strong>{{ GAME_ROUND_DURATION_SECONDS }} detik</strong>!
                </p>

                <button
                  type="button"
                  class="cozy-active-btn btn-bouncy font-display mt-4 cursor-pointer rounded-full px-7 py-2.5 text-sm font-bold shadow-lg"
                  @click="startNewRound"
                >
                  ▶ Mulai Main ({{ currentPlayCount }}/{{ MAX_GAME_DAILY_PLAYS }})
                </button>
              </template>

              <!-- Layar Siap Main + Panduan Singkat: Cozy Beach Fishing -->
              <template v-else>
                <p class="font-display text-lg font-bold sm:text-xl" style="color: var(--title-color)">
                  🎣 Cozy Beach Fishing
                </p>

                <!-- Kartu Panduan Singkat 3 Langkah -->
                <div
                  class="mt-2.5 w-full max-w-sm rounded-2xl border p-3 text-left text-[11.5px] font-semibold"
                  style="
                    background: var(--surface-subtle);
                    border-color: var(--border-strong);
                    color: var(--text-primary);
                  "
                >
                  <p class="mb-1.5 text-center text-[11px] font-extrabold uppercase tracking-wider" style="color: var(--accent-primary)">
                    📖 Panduan Singkat
                  </p>
                  <ol class="space-y-1 leading-snug">
                    <li><strong>1.</strong> Klik / Tap / tekan <strong>Spasi</strong> untuk melempar kail.</li>
                    <li><strong>2.</strong> Tunggu pelampung bergoyang &amp; muncul tanda <strong>!</strong>.</li>
                    <li><strong>3.</strong> Klik / Tap / <strong>Spasi</strong> saat indikator di <strong>Zona Hijau</strong> untuk menarik 🐟 Ikan (+1 Koin) &amp; ⭐/🐚 Bintang Laut (+💖)!</li>
                  </ol>
                </div>

                <button
                  type="button"
                  class="cozy-active-btn btn-bouncy font-display mt-4 cursor-pointer rounded-full px-7 py-2.5 text-sm font-bold shadow-lg"
                  @click="startNewRound"
                >
                  🎣 Mulai Mancing ({{ currentPlayCount }}/{{ MAX_GAME_DAILY_PLAYS }})
                </button>
              </template>
            </div>

            <!-- OVERLAY 2: LAYAR SELESAI RONDE -->
            <div
              v-else-if="phase === 'finished'"
              class="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto p-4 text-center backdrop-blur-sm"
              style="background: var(--card-bg-solid); opacity: 0.97; color: var(--text-primary)"
            >
              <span
                v-if="roundSummary?.isNewRecord"
                class="cozy-active-btn mb-1 rounded-full px-3 py-0.5 text-[10.5px] font-extrabold shadow"
              >
                🏆 REKOR BARU!
              </span>

              <p class="font-display text-lg font-bold sm:text-xl" style="color: var(--title-color)">
                Ronde Selesai! Skor: {{ score }}
              </p>

              <!-- Rincian Hadiah Ronde -->
              <div
                v-if="roundSummary"
                class="mt-2.5 w-full max-w-sm space-y-1.5 rounded-2xl border p-3 text-left text-xs font-semibold"
                style="
                  background: var(--surface-subtle);
                  border-color: var(--border-strong);
                  color: var(--text-primary);
                "
              >
                <div class="flex items-center justify-between">
                  <span>🎁 Hadiah Selesai Ronde ({{ roundSummary.claimsUsed }}/{{ roundSummary.maxClaims }})</span>
                  <strong style="color: var(--accent-primary)">
                    {{ roundSummary.baseRewardCoins > 0 ? `+${roundSummary.baseRewardCoins} 🐟` : 'Kuota 3/3 Penuh' }}
                  </strong>
                </div>
                <div class="flex items-center justify-between">
                  <span>🐟 Ikan Tertangkap ({{ roundSummary.fishCaught }})</span>
                  <strong style="color: var(--accent-primary)">+{{ roundSummary.fishBonusCoins }} 🐟</strong>
                </div>
                <div class="flex items-center justify-between">
                  <span>{{ roundSummary.gameId === 'fishing' ? '⭐/🐚 Bintang & Kerang' : '⭐ Bintang Terkumpul' }} ({{ roundSummary.starsCollected }})</span>
                  <strong style="color: var(--accent-primary)">
                    {{ roundSummary.affectionGained > 0 ? `+${roundSummary.affectionGained} 💖` : '0 💖 (tiap 3 item)' }}
                  </strong>
                </div>
                <div
                  class="flex items-center justify-between border-t pt-1.5 text-[12.5px] font-extrabold"
                  style="border-color: var(--border-subtle)"
                >
                  <span>Total Masuk Saldo</span>
                  <span style="color: var(--title-color)">
                    +{{ roundSummary.totalCoinsAwarded }} 🐟{{ roundSummary.affectionGained > 0 ? ` • +${roundSummary.affectionGained} 💖` : '' }}
                  </span>
                </div>
              </div>

              <p
                v-if="isPlayQuotaFull"
                class="mt-2.5 max-w-sm text-[11px] font-bold"
                style="color: var(--text-secondary)"
              >
                ⏳ Kuota main game ini hari ini sudah habis (3/3). Kembali lagi besok ya, meow~
              </p>

              <div class="mt-3.5 flex flex-wrap items-center justify-center gap-2">
                <button
                  v-if="!isPlayQuotaFull"
                  type="button"
                  class="cozy-active-btn btn-bouncy font-display cursor-pointer rounded-full px-5 py-2 text-xs font-bold shadow"
                  @click="startNewRound"
                >
                  🔄 Main Lagi ({{ currentPlayCount }}/{{ MAX_GAME_DAILY_PLAYS }})
                </button>

                <button
                  type="button"
                  class="cozy-secondary-btn btn-bouncy font-display cursor-pointer rounded-full px-5 py-2 text-xs font-bold"
                  @click="closeMiniGame"
                >
                  Kembali Fokus ✨
                </button>
              </div>
            </div>
          </div>

          <!-- Tombol Aksi 1-Tap Besar untuk Cozy Beach Fishing saat sedang bermain (ramah HP & PC!) -->
          <div
            v-if="activeGame === 'fishing' && phase === 'playing'"
            class="mt-3 flex flex-col items-center gap-1.5"
          >
            <button
              type="button"
              class="btn-bouncy font-display w-full cursor-pointer rounded-2xl border-2 px-5 py-2.5 text-sm font-bold shadow-md transition"
              :class="
                fishingUiState === 'bite'
                  ? 'animate-pulse border-emerald-400 bg-emerald-500 text-white shadow-emerald-500/40'
                  : 'cozy-active-btn border-transparent'
              "
              @click="triggerFishingAction"
            >
              <template v-if="fishingUiState === 'bite'">
                ⚡ TARIK SEKARANG! (Klik / Spasi di Zona Hijau)
              </template>
              <template v-else-if="fishingUiState === 'waiting'">
                🌊 Menunggu Ikan Menyambar...
              </template>
              <template v-else-if="fishingUiState === 'casting'">
                🎣 Melempar Kail...
              </template>
              <template v-else>
                🎣 Lempar Kail ke Laut (Klik / Spasi)
              </template>
            </button>
            <p class="text-[11px] font-semibold" style="color: var(--text-secondary)">
              {{ fishingHintText }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
