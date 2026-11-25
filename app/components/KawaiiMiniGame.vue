<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useSoundEffects } from '~/composables/useSoundEffects'
import {
  MAX_GAME_DAILY_PLAYS,
  MAX_GAME_DAILY_REWARDS,
  type MascotAccessoryId,
  useTwilightStorage,
} from '~/composables/useTwilightStorage'

const {
  isMiniGameOpen,
  isZenMode,
  graphicsConfig,
  equippedAccessory,
  gameHighScore,
  gameDailyClaimCount,
  gameDailyPlayCount,
  syncMiniGameDailyQuota,
  consumeMiniGamePlay,
  recordMiniGameResult,
  triggerVibration,
} = useTwilightStorage()
const { playGameCatch, playGameZap } = useSoundEffects()

// Jika Starlight Focus ✨ aktif saat modal game terbuka, langsung tutup modal & hentikan animasi
watch(isZenMode, (focusActive) => {
  if (focusActive && isMiniGameOpen.value) {
    isMiniGameOpen.value = false
  }
})

// Pilihan warna kucing di Break Game: Kucing Putih (default) atau Kucing Hitam (disimpan di localStorage)
type GameCatCoat = 'white' | 'black'
const CAT_COAT_STORAGE_KEY = 'twilights_game_cat_coat_v1'
const selectedCatCoat = ref<GameCatCoat>('white')

function setCatCoat(coat: GameCatCoat) {
  selectedCatCoat.value = coat
  if (import.meta.client) {
    try {
      localStorage.setItem(CAT_COAT_STORAGE_KEY, coat)
    } catch {
      // Abaikan jika penyimpanan terbatas
    }
  }
  if (phase.value !== 'playing') {
    drawScene(performance.now())
  }
}

// Ukuran logis kanvas (otomatis diskalakan responsif via CSS untuk PC maupun HP)
const CANVAS_W = 480
const CANVAS_H = 360
const GROUND_Y = CANVAS_H - 22
const ROUND_DURATION_MS = 30000 // 30 detik per ronde

type GamePhase = 'ready' | 'playing' | 'finished'
type FallingKind = 'star' | 'fish' | 'storm'

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
  kind: 'spark' | 'dust' | 'electric' | 'heart'
}

// State tampilan HUD
const canvasRef = ref<HTMLCanvasElement | null>(null)
const phase = ref<GamePhase>('ready')
const score = ref<number>(0)
const remainingSeconds = ref<number>(30)
const roundSummary = ref<{
  isNewRecord: boolean
  coinsAwarded: number
  claimsUsed: number
  maxClaims: number
  playsUsed: number
  maxPlays: number
} | null>(null)

const isPlayQuotaFull = computed<boolean>(() => gameDailyPlayCount.value >= MAX_GAME_DAILY_PLAYS)
const isRewardQuotaFull = computed<boolean>(
  () => gameDailyClaimCount.value >= MAX_GAME_DAILY_REWARDS,
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

// Fisika & animasi karakter kucing penangkap
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

// Status tombol panah keyboard (PC)
const keysPressed = { left: false, right: false }

let fallingObjects: FallingObject[] = []
let floatingTexts: FloatingScoreText[] = []
let particles: Particle[] = []

// Bintang latar berkelip statis di dalam kanvas
const bgStars = Array.from({ length: 34 }, (_, i) => ({
  x: ((i * 67 + 23) % (CANVAS_W - 24)) + 12,
  y: ((i * 43 + 15) % (CANVAS_H - 115)) + 14,
  r: 0.9 + (i % 3) * 0.65,
  phase: i * 0.82,
  isSparkle: i % 7 === 0,
}))

/** Sesuaikan resolusi fisik kanvas terhadap batas DPR kualitas grafik (Ringan 1x, Sedang 1.35x, Tinggi penuh) */
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

/** Hentikan animasi game loop (penting agar hemat baterai saat modal ditutup) */
function stopGameLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

/** Mulai ronde baru berdurasi 30 detik (dengan validasi ketat batas 5x main/hari) */
function startNewRound() {
  syncMiniGameDailyQuota()
  if (isPlayQuotaFull.value) return
  if (!consumeMiniGamePlay()) return

  stopGameLoop()
  isRoundRewardProcessed = false
  score.value = 0
  remainingSeconds.value = 30
  roundSummary.value = null
  phase.value = 'playing'

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

  const now = performance.now()
  lastFrameTime = now
  lastRenderedFrameTime = 0
  roundStartTime = now
  rafId = requestAnimationFrame(gameLoop)
}

/**
 * Selesaikan ronde (dilindungi kunci `isRoundRewardProcessed` agar mustahil klaim ganda dalam 1 ronde)
 * lalu hitung rekor & hadiah koin ikan (+2 🐟 jika skor >= 100 dan kuota hadiah < 3).
 */
function finishRound() {
  if (isRoundRewardProcessed) return
  isRoundRewardProcessed = true

  stopGameLoop()
  phase.value = 'finished'
  remainingSeconds.value = 0
  roundSummary.value = recordMiniGameResult(score.value)
}

/** Munculkan 1 objek jatuh secara acak: Bintang Cahaya (+10), Ikan Emas (+30), atau Awan Petir (-20) */
function spawnFallingObject() {
  const roll = Math.random()
  let kind: FallingKind = 'star'
  if (roll < 0.56) {
    kind = 'star' // +10 poin
  } else if (roll < 0.78) {
    kind = 'fish' // +30 poin (lebih cepat & berkilau)
  } else {
    kind = 'storm' // -20 poin (hindari!)
  }

  const speedBase = kind === 'fish' ? 168 : kind === 'storm' ? 152 : 124
  fallingObjects.push({
    id: ++objectIdCounter,
    kind,
    x: 34 + Math.random() * (CANVAS_W - 68),
    y: -26,
    speed: speedBase + Math.random() * 62,
    radius: kind === 'fish' ? 18 : 19,
    rotation: Math.random() * Math.PI * 2,
    vRot: (Math.random() > 0.5 ? 1 : -1) * (1.1 + Math.random() * 1.4),
    wobblePhase: Math.random() * Math.PI * 2,
  })
}

/** Buat ledakan partikel kilau / listrik saat tangkapan (skala mengikuti Kualitas Grafik) */
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

/** Munculkan hati/kilau mini di atas kepala kucing saat berhasil menangkap item */
function spawnHappyHeart(x: number, y: number) {
  if (graphicsConfig.value.particleScale <= 0) return
  particles.push({
    x: x + (Math.random() - 0.5) * 18,
    y: y - 42,
    vx: (Math.random() - 0.5) * 18,
    vy: -42,
    size: 11,
    color: Math.random() > 0.4 ? '#f9a8d4' : '#fde68a',
    life: 0.55,
    maxLife: 0.55,
    kind: 'heart',
  })
}

/** Munculkan partikel debu bintang kecil di dekat kaki kucing saat berlari cepat */
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

/**
 * GAME LOOP UTAMA (requestAnimationFrame):
 * Memperbarui fisika mulus (velocity/acceleration/friction), objek jatuh, efek juicy, lalu menggambar ke <canvas>.
 */
function gameLoop(now: number) {
  if (phase.value !== 'playing') {
    stopGameLoop()
    return
  }

  // Batasi frame rate sesuai Kualitas Grafik (Ringan ~28 FPS, Sedang ~40 FPS, Tinggi 60 FPS)
  const minFrameMs = 1000 / Math.max(24, graphicsConfig.value.targetFps)
  if (lastRenderedFrameTime > 0 && now - lastRenderedFrameTime < minFrameMs * 0.9) {
    rafId = requestAnimationFrame(gameLoop)
    return
  }
  lastRenderedFrameTime = now

  const dt = Math.min(0.05, Math.max(0.004, (now - lastFrameTime) / 1000))
  lastFrameTime = now

  // 1. Hitung sisa waktu ronde (30 detik)
  const elapsed = now - roundStartTime
  const leftMs = Math.max(0, ROUND_DURATION_MS - elapsed)
  remainingSeconds.value = Math.ceil(leftMs / 1000)
  if (leftMs <= 0) {
    drawScene(now)
    finishRound()
    return
  }

  // 2. Fisika Pergerakan Halus (Velocity + Acceleration + Friction/Lerp)
  const minX = 36
  const maxX = CANVAS_W - 36
  const keyDir = (keysPressed.right ? 1 : 0) - (keysPressed.left ? 1 : 0)

  if (keyDir !== 0) {
    // Kontrol keyboard (← → atau A D): akselerasi mulus dengan batas kecepatan maksimal
    pointerTargetX = null
    const accel = 2500
    const maxSpeed = 480
    catVx += keyDir * accel * dt
    catVx = Math.max(-maxSpeed, Math.min(maxSpeed, catVx))
    catX += catVx * dt
  } else if (pointerTargetX !== null) {
    // Kontrol sentuh / mouse: lerp halus yang tetap menghitung velocity akurat untuk tilt & animasi kaki
    const prevX = catX
    const smoothFactor = 1 - Math.exp(-16 * dt)
    catX += (pointerTargetX - catX) * smoothFactor
    const instVx = (catX - prevX) / dt
    catVx += (instVx - catVx) * Math.min(1, dt * 18)
    if (Math.abs(pointerTargetX - catX) < 0.8 && Math.abs(catVx) < 8) {
      catVx = 0
    }
  } else {
    // Gesekan (friction) eksponensial saat tombol dilepas
    catVx *= Math.exp(-10.5 * dt)
    if (Math.abs(catVx) < 5) catVx = 0
    catX += catVx * dt
  }

  // Batasi agar kucing tidak keluar dinding kanvas
  if (catX < minX) {
    catX = minX
    catVx = Math.max(0, catVx * -0.2)
  } else if (catX > maxX) {
    catX = maxX
    catVx = Math.min(0, catVx * -0.2)
  }

  // Arah hadap, kemiringan tubuh (±8°–11°), siklus lari kaki, & jejak debu bintang
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

  // 3. Spawn objek jatuh secara berkala (makin seru di 10 detik terakhir)
  const spawnInterval = leftMs < 10000 ? 0.42 : 0.54
  spawnAccumulator += dt
  while (spawnAccumulator >= spawnInterval) {
    spawnAccumulator -= spawnInterval
    spawnFallingObject()
  }

  // 4. Perbarui posisi objek jatuh & cek tangkapan oleh kucing
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
        catHappyUntil = now + 400
        squashTimer = 0.28
        playGameCatch(false)
        spawnParticleBurst(obj.x, obj.y, ['#f9a8d4', '#fdf2f8', '#fde68a'], 10, 'spark')
        spawnHappyHeart(catX, catCenterY)
        floatingTexts.push({ x: obj.x, y: obj.y - 10, text: '+10 ✨', color: '#fbcfe8', life: 1 })
      } else if (obj.kind === 'fish') {
        score.value += 30
        catHappyUntil = now + 420
        squashTimer = 0.32
        playGameCatch(true)
        spawnParticleBurst(obj.x, obj.y, ['#fde68a', '#fb923c', '#ffffff'], 15, 'spark')
        spawnHappyHeart(catX, catCenterY)
        floatingTexts.push({ x: obj.x, y: obj.y - 12, text: '+30 🐟', color: '#fde68a', life: 1 })
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

  // 5. Perbarui partikel kilau, debu lari, & teks skor melayang
  particles = particles.filter((p) => {
    p.x += p.vx * dt
    p.y += p.vy * dt
    if (p.kind === 'spark') {
      p.vy += 135 * dt
    } else if (p.kind === 'dust') {
      p.vx *= Math.exp(-3 * dt)
    }
    p.life -= dt
    return p.life > 0
  })

  floatingTexts = floatingTexts.filter((ft) => {
    ft.y -= 44 * dt
    ft.life -= dt * 1.45
    return ft.life > 0
  })

  // 6. Gambar seluruh adegan ke kanvas
  drawScene(now)
  rafId = requestAnimationFrame(gameLoop)
}

/** Gambar bintang 4-sisi kecil */
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

/** Menggambar latar langit malam berlapis, objek jatuh hidup, partikel, & maskot kucing beranimasi penuh */
function drawScene(now: number) {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  syncMiniGameCanvasDpr(canvas, ctx)

  const isLow = graphicsConfig.value.particleScale <= 0

  // 1. Latar Langit Malam Berlapis
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
  grad.addColorStop(0, '#130e36')
  grad.addColorStop(0.62, '#24144a')
  grad.addColorStop(1, '#361652')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Micro screen-shake (4px selama 150ms) saat terkena awan petir
  ctx.save()
  if (now < screenShakeUntil) {
    const progress = (screenShakeUntil - now) / 150
    const amp = 4 * progress
    ctx.translate((Math.random() - 0.5) * 2 * amp, (Math.random() - 0.5) * 2 * amp)
  }

  // 2. Bulan Sabit Bersinar Lembut di Pojok Kanan Atas
  ctx.save()
  const moonGlow = ctx.createRadialGradient(CANVAS_W - 58, 48, 6, CANVAS_W - 58, 48, 52)
  moonGlow.addColorStop(0, 'rgba(254, 240, 138, 0.34)')
  moonGlow.addColorStop(1, 'rgba(254, 240, 138, 0)')
  ctx.fillStyle = moonGlow
  ctx.beginPath()
  ctx.arc(CANVAS_W - 58, 48, 52, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#fef08a'
  ctx.beginPath()
  ctx.arc(CANVAS_W - 58, 48, 17, 0.35, Math.PI * 1.65)
  ctx.arc(CANVAS_W - 50, 44, 14, Math.PI * 1.55, 0.45, true)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // 3. Bintang Berkelip (Twinkling) di Kejauhan
  const visibleStars = isLow ? bgStars.slice(0, 14) : bgStars
  for (const s of visibleStars) {
    const alpha = 0.28 + 0.65 * (0.5 + 0.5 * Math.sin(now * 0.0032 + s.phase))
    if (s.isSparkle && !isLow) {
      drawMiniFourStar(ctx, s.x, s.y, s.r * 2.2, '#fbcfe8', alpha)
    } else {
      ctx.fillStyle = `rgba(255, 245, 252, ${alpha.toFixed(2)})`
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // 4. Siluet Bukit Malam & Pijakan Lembut di Bagian Bawah
  ctx.fillStyle = 'rgba(46, 20, 74, 0.72)'
  ctx.beginPath()
  ctx.moveTo(0, CANVAS_H)
  ctx.lineTo(0, GROUND_Y - 12)
  ctx.quadraticCurveTo(95, GROUND_Y - 34, 210, GROUND_Y - 10)
  ctx.quadraticCurveTo(335, GROUND_Y + 4, CANVAS_W, GROUND_Y - 22)
  ctx.lineTo(CANVAS_W, CANVAS_H)
  ctx.closePath()
  ctx.fill()

  const groundGrad = ctx.createLinearGradient(0, GROUND_Y - 6, 0, CANVAS_H)
  groundGrad.addColorStop(0, '#4a236b')
  groundGrad.addColorStop(1, '#261140')
  ctx.fillStyle = groundGrad
  ctx.beginPath()
  ctx.moveTo(0, CANVAS_H)
  ctx.lineTo(0, GROUND_Y + 2)
  ctx.quadraticCurveTo(CANVAS_W * 0.28, GROUND_Y - 7, CANVAS_W * 0.55, GROUND_Y + 1)
  ctx.quadraticCurveTo(CANVAS_W * 0.8, GROUND_Y + 7, CANVAS_W, GROUND_Y - 3)
  ctx.lineTo(CANVAS_W, CANVAS_H)
  ctx.closePath()
  ctx.fill()

  // Garis tepi cahaya pastel tipis di puncak tanah
  ctx.strokeStyle = 'rgba(249, 168, 212, 0.35)'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(0, GROUND_Y + 2)
  ctx.quadraticCurveTo(CANVAS_W * 0.28, GROUND_Y - 7, CANVAS_W * 0.55, GROUND_Y + 1)
  ctx.quadraticCurveTo(CANVAS_W * 0.8, GROUND_Y + 7, CANVAS_W, GROUND_Y - 3)
  ctx.stroke()

  // 5. Gambar Semua Objek Jatuh yang Hidup
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

  // 6. Gambar Partikel Debu Lari (di belakang kucing)
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

  // 7. Gambar Karakter Kucing Utuh Beranimasi Penuh + Aksesoris Sinkron
  const isShocked = now < catShockedUntil
  const isHappy = now < catHappyUntil
  drawAnimatedCatcherCat(ctx, catX, GROUND_Y, now, isShocked, isHappy)

  // 8. Gambar Ledakan Partikel Kilau, Listrik, & Hati
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
    } else {
      drawMiniFourStar(ctx, p.x, p.y, p.size * 1.5, p.color, ratio)
    }
    ctx.restore()
  }

  // 9. Gambar Teks Skor Melayang (+10 ✨, +30 🐟, -20 ⚡)
  ctx.font = 'bold 14px Fredoka, Quicksand, sans-serif'
  ctx.textAlign = 'center'
  for (const ft of floatingTexts) {
    ctx.save()
    ctx.globalAlpha = Math.max(0, ft.life)
    ctx.fillStyle = 'rgba(18, 8, 36, 0.72)'
    ctx.fillText(ft.text, ft.x + 1, ft.y + 1.5)
    ctx.fillStyle = ft.color
    ctx.fillText(ft.text, ft.x, ft.y)
    ctx.restore()
  }

  ctx.restore()
}

/** Bintang Cahaya (+10): berputar perlahan dengan pendaran pink-putih + ekor cahaya tipis */
function drawLivingStar(ctx: CanvasRenderingContext2D, rotation: number, isLow: boolean) {
  // Ekor cahaya tipis vertikal di atas bintang
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
  ctx.fillStyle = '#fbcfe8'
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.6
  ctx.stroke()
  ctx.restore()
}

/** Ikan Emas (+30): emas-jingga berkilau dengan gerakan sirip ekor halus */
function drawLivingGoldenFish(
  ctx: CanvasRenderingContext2D,
  now: number,
  phase: number,
  isLow: boolean,
) {
  const tailWag = Math.sin(now * 0.016 + phase) * 3.5
  if (!isLow) {
    ctx.shadowColor = '#fbbf24'
    ctx.shadowBlur = 14
  }
  // Sirip ekor bergoyang halus
  ctx.fillStyle = '#f97316'
  ctx.beginPath()
  ctx.moveTo(10, 0)
  ctx.lineTo(22, -8 + tailWag)
  ctx.lineTo(20, tailWag * 0.4)
  ctx.lineTo(22, 8 + tailWag)
  ctx.closePath()
  ctx.fill()

  // Badan ikan emas-jingga gradasi
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

  // Sirip punggung & kilau sisik
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

  // Mata mungil
  ctx.fillStyle = '#311042'
  ctx.beginPath()
  ctx.arc(-8, -1.5, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(-8.6, -2.1, 0.7, 0, Math.PI * 2)
  ctx.fill()
}

/** Awan Petir (-20): awan badai ungu gelap dengan petir kuning berdenyut & percikan listrik kecil */
function drawLivingStormCloud(
  ctx: CanvasRenderingContext2D,
  now: number,
  phase: number,
  isLow: boolean,
) {
  const pulse = 0.7 + 0.3 * Math.sin(now * 0.018 + phase)

  // Awan badai ungu gelap berlapis
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

  // Kilatan petir kuning berdenyut
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

  // Percikan listrik kecil di sisi awan
  if (!isLow && Math.sin(now * 0.025 + phase) > 0.35) {
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

/** Gambar aksesoris kepala / wajah / leher / sayap sinkron pada karakter kucing mini-game */
function drawGameCatBackWings(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.fillStyle = '#fffdf7'
  ctx.strokeStyle = '#fde68a'
  ctx.lineWidth = 1.6
  ctx.lineJoin = 'round'
  // Sayap kiri
  ctx.beginPath()
  ctx.moveTo(-14, -14)
  ctx.bezierCurveTo(-34, -22, -44, -36, -40, -46)
  ctx.bezierCurveTo(-31, -42, -24, -34, -18, -26)
  ctx.bezierCurveTo(-30, -30, -40, -26, -41, -17)
  ctx.bezierCurveTo(-32, -14, -24, -13, -16, -11)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  // Sayap kanan
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

/** Karakter Kucing Utuh Prosedural (Canvas 2D): Badan Gemoy, Kaki Lari, Ekor Lentur, Tilt, Squash & Stretch, 12 Aksesoris */
function drawAnimatedCatcherCat(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  now: number,
  shocked: boolean,
  happy: boolean,
) {
  const isBlack = selectedCatCoat.value === 'black'
  const furMain = isBlack ? '#2b223d' : '#fff7fb'
  const furBody = isBlack ? '#231b33' : '#f5ecff'
  const furStroke = isBlack ? '#6d5b93' : '#e9d5ff'
  const bellyFill = isBlack ? '#3b2e54' : '#fdf2f8'
  const earInner = isBlack ? '#f472b6' : '#fbcfe8'
  const faceInk = isBlack ? '#fde68a' : '#3b215c'
  const whiskerColor = isBlack ? '#a78bfa' : '#c4b5fd'

  // Idle breathing + Elastic Squash & Stretch saat menangkap item
  const breath = Math.sin(now * 0.005) * 0.028
  let scaleX = 1 - breath * 0.7
  let scaleY = 1 + breath
  if (squashTimer > 0) {
    const t = squashTimer / 0.28
    const wave = Math.sin(t * Math.PI * 2) * 0.14 * t
    scaleX += wave
    scaleY -= wave
  }

  // Kedip transparan singkat saat kaget terkena awan petir
  const shockAlpha = shocked ? (Math.floor(now / 70) % 2 === 0 ? 0.55 : 0.96) : 1
  const legSwing = Math.sin(runCycle * 5.2) * Math.min(1, Math.abs(catVx) / 140)
  const tailWag =
    Math.sin(now * 0.007 + runCycle * 1.8) * 6 - Math.max(-12, Math.min(12, catVx * 0.03))

  // Bayangan lembut di tanah
  ctx.save()
  ctx.fillStyle = 'rgba(10, 5, 24, 0.42)'
  ctx.beginPath()
  ctx.ellipse(x, groundY + 2, 24 * scaleX, 5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = shockAlpha
  ctx.translate(x, groundY)
  ctx.rotate(catTilt)
  ctx.scale(scaleX, scaleY)

  // Sayap Malaikat di belakang tubuh jika dipakai di halaman utama
  if (equippedAccessory.value === 'angel-wings') {
    drawGameCatBackWings(ctx)
  }

  // 1. Ekor Lentur Bergoyang Mengikuti Kecepatan Gerak
  const tailSide = -catFacing
  ctx.strokeStyle = furMain
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

  // 2. Kaki Kecil Bergerak Bergantian Saat Berlari
  ctx.fillStyle = furMain
  ctx.strokeStyle = furStroke
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

  // 3. Badan Gemoy Bulat
  ctx.fillStyle = furBody
  ctx.strokeStyle = furStroke
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.ellipse(0, -17, 19.5, 14.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Perut lembut
  ctx.fillStyle = bellyFill
  ctx.beginPath()
  ctx.ellipse(0, -15, 11.5, 8.5, 0, 0, Math.PI * 2)
  ctx.fill()

  // 4. Telinga Runcing dengan Bagian Dalam Pink
  ctx.fillStyle = furMain
  ctx.strokeStyle = furStroke
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

  // Telinga kanan
  ctx.fillStyle = furMain
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
  ctx.fillStyle = furMain
  ctx.strokeStyle = furStroke
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.ellipse(0, -39, 23, 18.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // 6. Pipi Merona (lebih cerah saat menangkap bintang/ikan)
  ctx.fillStyle = happy ? 'rgba(244, 114, 182, 0.92)' : 'rgba(249, 168, 212, 0.62)'
  ctx.beginPath()
  ctx.ellipse(-13.5, -34, 4.6, 2.7, 0, 0, Math.PI * 2)
  ctx.ellipse(13.5, -34, 4.6, 2.7, 0, 0, Math.PI * 2)
  ctx.fill()

  // 7. Ekspresi Wajah Dinamis (Normal / Happy ^ω^ / Shocked >﹏<)
  ctx.strokeStyle = faceInk
  ctx.fillStyle = faceInk
  ctx.lineWidth = 2.1
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (shocked) {
    // Ekspresi kaget/pusing (> <)
    ctx.beginPath()
    ctx.moveTo(-12.5, -42)
    ctx.lineTo(-6.5, -39)
    ctx.lineTo(-12.5, -36)
    ctx.moveTo(12.5, -42)
    ctx.lineTo(6.5, -39)
    ctx.lineTo(12.5, -36)
    ctx.stroke()
    // Mulut bergelombang kaget (﹏)
    ctx.beginPath()
    ctx.moveTo(-5, -32)
    ctx.quadraticCurveTo(-2.5, -35, 0, -32)
    ctx.quadraticCurveTo(2.5, -29, 5, -32)
    ctx.stroke()
  } else if (happy) {
    // Ekspresi senang (^ ^) + mulut ω ceria
    ctx.beginPath()
    ctx.moveTo(-12.5, -38.5)
    ctx.quadraticCurveTo(-8.5, -44, -4.5, -38.5)
    ctx.moveTo(4.5, -38.5)
    ctx.quadraticCurveTo(8.5, -44, 12.5, -38.5)
    ctx.stroke()
    // Hidung & mulut ω
    ctx.fillStyle = '#f472b6'
    ctx.beginPath()
    ctx.moveTo(-2.2, -35.5)
    ctx.lineTo(2.2, -35.5)
    ctx.lineTo(0, -33.2)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-5.2, -31.8)
    ctx.quadraticCurveTo(-2.6, -28.8, 0, -32.2)
    ctx.quadraticCurveTo(2.6, -28.8, 5.2, -31.8)
    ctx.stroke()
  } else {
    // Normal / Berlari: mata bulat berbinar + senyum kucing ω
    ctx.beginPath()
    ctx.arc(-8.5, -39.5, 3.2, 0, Math.PI * 2)
    ctx.arc(8.5, -39.5, 3.2, 0, Math.PI * 2)
    ctx.fill()
    // Kilau mata putih
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(-9.5, -40.7, 1.1, 0, Math.PI * 2)
    ctx.arc(7.5, -40.7, 1.1, 0, Math.PI * 2)
    ctx.fill()
    // Hidung pink & mulut kucing ω
    ctx.fillStyle = '#f472b6'
    ctx.beginPath()
    ctx.moveTo(-2, -35.5)
    ctx.lineTo(2, -35.5)
    ctx.lineTo(0, -33.4)
    ctx.closePath()
    ctx.fill()
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

  // 8. Sinkronisasi Aksesoris yang Dipakai Pemain di Halaman Utama
  drawGameCatAccessory(ctx, equippedAccessory.value)

  // 9. Keranjang Bintang Pastel yang Dipegang Kucing
  const basketGrad = ctx.createLinearGradient(0, -19, 0, -7)
  basketGrad.addColorStop(0, '#fbcfe8')
  basketGrad.addColorStop(1, '#f472b6')
  ctx.fillStyle = basketGrad
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.roundRect(-21, -18, 42, 11, 5.5)
  ctx.fill()
  ctx.stroke()
  drawMiniFourStar(ctx, 0, -12.5, 4, '#fef08a', 0.95)

  ctx.restore()
}

/** Kontrol Mouse (PC) & Sentuhan Geser/Tap (HP) pada kanvas */
function updateTargetFromPointer(event: PointerEvent) {
  if (phase.value !== 'playing') return
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

// Sinkronkan kuota harian saat modal dibuka & hentikan loop saat ditutup agar hemat baterai
watch(isMiniGameOpen, (open) => {
  if (open) {
    syncMiniGameDailyQuota()
    requestAnimationFrame(() => {
      drawScene(performance.now())
    })
  } else {
    stopGameLoop()
    phase.value = 'ready'
    keysPressed.left = false
    keysPressed.right = false
  }
})

onMounted(() => {
  if (import.meta.client) {
    const savedCoat = localStorage.getItem(CAT_COAT_STORAGE_KEY)
    if (savedCoat === 'white' || savedCoat === 'black') {
      selectedCatCoat.value = savedCoat
    }
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
  <!-- Modal Kawaii Mini-Game: "Starlight & Fish Catcher" (30 Detik, maks 5x main/hari & 3x hadiah/hari) -->
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
      aria-label="Kawaii Break Game — Starlight & Fish Catcher"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0822]/80 p-3 backdrop-blur-sm sm:p-5"
      @click.self="closeMiniGame"
    >
      <div
        class="flex w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-white/25 bg-[#221444]/95 shadow-2xl shadow-pink-500/25 backdrop-blur-xl"
      >
        <!-- Header Modal Game + Pilihan Warna Kucing (Putih / Hitam) -->
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 bg-white/5 px-5 py-3.5">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">🎮</span>
            <div>
              <h2 class="font-display text-lg font-bold text-pink-200">
                Starlight &amp; Fish Catcher
              </h2>
              <p class="text-[11px] font-semibold text-purple-200/80">
                Selingan istirahat 30 detik • Capai 100 poin dapat +2 🐟
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- Pemilih Warna Kucing: Putih / Hitam (sinkron dengan aksesoris utama!) -->
            <div class="inline-flex rounded-full border border-white/15 bg-black/30 p-0.5 text-[10px]">
              <button
                type="button"
                class="cursor-pointer rounded-full px-2 py-0.5 font-bold transition"
                :class="
                  selectedCatCoat === 'white'
                    ? 'cozy-active-btn bg-[#f9a8d4] text-[#311042]'
                    : 'text-purple-200/80 hover:text-white'
                "
                @click="setCatCoat('white')"
              >
                🐱 Putih
              </button>
              <button
                type="button"
                class="cursor-pointer rounded-full px-2 py-0.5 font-bold transition"
                :class="
                  selectedCatCoat === 'black'
                    ? 'cozy-active-btn bg-[#c4b5fd] text-[#1e1b4b]'
                    : 'text-purple-200/80 hover:text-white'
                "
                @click="setCatCoat('black')"
              >
                🐈‍⬛ Hitam
              </button>
            </div>

            <button
              type="button"
              aria-label="Tutup Break Game"
              class="btn-bouncy flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-xs font-bold text-pink-100 hover:bg-pink-400 hover:text-[#1e1b4b]"
              @click="closeMiniGame"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Bar HUD: Skor, Waktu, Rekor, Hadiah Hari Ini (3/3), & Main Hari Ini (5/5) -->
        <div class="grid grid-cols-3 gap-1.5 border-b border-white/10 bg-black/25 px-4 py-2.5 text-center sm:grid-cols-5">
          <div class="rounded-xl bg-white/5 px-2 py-1.5">
            <p class="text-[10px] font-semibold text-purple-200/75">Skor</p>
            <p class="font-display text-base font-bold text-pink-200">{{ score }}</p>
          </div>

          <div class="rounded-xl bg-white/5 px-2 py-1.5">
            <p class="text-[10px] font-semibold text-purple-200/75">Waktu</p>
            <p
              class="font-display text-base font-bold"
              :class="remainingSeconds <= 5 && phase === 'playing' ? 'animate-pulse text-rose-300' : 'text-amber-200'"
            >
              {{ remainingSeconds }}d
            </p>
          </div>

          <div class="rounded-xl bg-white/5 px-2 py-1.5">
            <p class="text-[10px] font-semibold text-purple-200/75">Rekor 🏆</p>
            <p class="font-display text-base font-bold text-purple-200">{{ gameHighScore }}</p>
          </div>

          <div class="rounded-xl bg-white/5 px-2 py-1.5">
            <p class="text-[10px] font-semibold text-purple-200/75">Hadiah Hari Ini</p>
            <p
              class="font-display text-base font-bold"
              :class="isRewardQuotaFull ? 'text-amber-200' : 'text-emerald-200'"
            >
              🐟 {{ gameDailyClaimCount }}/{{ MAX_GAME_DAILY_REWARDS }}
            </p>
          </div>

          <div class="col-span-2 rounded-xl bg-white/5 px-2 py-1.5 sm:col-span-1">
            <p class="text-[10px] font-semibold text-purple-200/75">Main Hari Ini</p>
            <p
              class="font-display text-base font-bold"
              :class="isPlayQuotaFull ? 'text-rose-300' : 'text-sky-200'"
            >
              🎮 {{ gameDailyPlayCount }}/{{ MAX_GAME_DAILY_PLAYS }}
            </p>
          </div>
        </div>

        <!-- Area Kanvas Permainan + Overlay Mulai / Kuota Penuh / Hasil Ronde -->
        <div class="relative p-4">
          <div class="relative overflow-hidden rounded-2xl border border-white/20 bg-[#130e36] shadow-inner">
            <canvas
              ref="canvasRef"
              :width="CANVAS_W"
              :height="CANVAS_H"
              class="block aspect-[4/3] w-full touch-none select-none"
              @pointerdown="updateTargetFromPointer"
              @pointermove="updateTargetFromPointer"
            />

            <!-- Overlay 1: Layar Awal Sebelum Mulai (atau Pesan Kuota Bermain 5/5 Penuh) -->
            <div
              v-if="phase === 'ready'"
              class="absolute inset-0 flex flex-col items-center justify-center bg-[#150d34]/82 p-5 text-center backdrop-blur-xs"
            >
              <template v-if="isPlayQuotaFull">
                <p class="text-3xl">🐾</p>
                <p class="font-display mt-2 max-w-sm text-base font-bold leading-relaxed text-pink-100">
                  🐾 Kuota istirahat hari ini sudah penuh (5/5)! Ayo lanjutkan fokusmu dulu, besok kita tangkap bintang lagi~ ✨
                </p>
                <button
                  type="button"
                  class="btn-bouncy font-display mt-4 cursor-pointer rounded-full border border-white/25 bg-white/10 px-6 py-2 text-xs font-bold text-pink-100 hover:bg-white/20"
                  @click="closeMiniGame"
                >
                  Kembali Fokus ✨
                </button>
              </template>

              <template v-else>
                <p class="font-display text-xl font-bold text-pink-200">
                  Tangkap Bintang &amp; Ikan Emas! ✨
                </p>

                <div class="mt-3 flex flex-wrap justify-center gap-2 text-xs font-semibold">
                  <span class="rounded-full bg-pink-300/20 px-3 py-1 text-pink-100">⭐ Bintang +10</span>
                  <span class="rounded-full bg-amber-300/20 px-3 py-1 text-amber-100">🐟 Ikan Emas +30</span>
                  <span class="rounded-full bg-purple-400/25 px-3 py-1 text-rose-200">⚡ Petir -20</span>
                </div>

                <p class="mt-3 max-w-xs text-xs text-purple-200/85">
                  Gerakkan kucing pakai <strong>mouse / tombol panah (← → / A D)</strong> di PC, atau <strong>geser jari</strong> di HP!
                </p>

                <button
                  type="button"
                  class="cozy-active-btn btn-bouncy font-display mt-5 cursor-pointer rounded-full bg-gradient-to-r from-[#f9a8d4] to-[#c4b5fd] px-7 py-2.5 text-sm font-bold text-[#311042] shadow-lg shadow-pink-500/30"
                  @click="startNewRound"
                >
                  ▶ Mulai Main ({{ gameDailyPlayCount }}/{{ MAX_GAME_DAILY_PLAYS }})
                </button>
              </template>
            </div>

            <!-- Overlay 2: Layar Selesai Ronde -->
            <div
              v-else-if="phase === 'finished'"
              class="absolute inset-0 flex flex-col items-center justify-center bg-[#150d34]/88 p-5 text-center backdrop-blur-xs"
            >
              <span
                v-if="roundSummary?.isNewRecord"
                class="mb-1.5 rounded-full border border-amber-200/60 bg-amber-300/25 px-3 py-0.5 text-[11px] font-bold text-amber-100"
              >
                🏆 Rekor Baru!
              </span>

              <p class="font-display text-2xl font-bold text-white">
                Waktu Habis! Skor: {{ score }}
              </p>

              <!-- Info Hadiah Koin Ikan (+2 🐟 maks 3x/hari) -->
              <p
                v-if="roundSummary && roundSummary.coinsAwarded > 0"
                class="mt-2 rounded-2xl border border-emerald-300/40 bg-emerald-400/20 px-4 py-1.5 text-xs font-bold text-emerald-100"
              >
                🎉 Yeay! Skor ≥ 100 — Bonus +2 Ikan Kering (🐟) ditambahkan!
              </p>
              <p
                v-else-if="score >= 100 && isRewardQuotaFull"
                class="mt-2 rounded-2xl border border-purple-200/30 bg-white/10 px-4 py-1.5 text-xs font-semibold text-purple-100"
              >
                Kuota hadiah game hari ini sudah penuh (3/3) — yuk lanjut fokus lagi ✨
              </p>
              <p
                v-else
                class="mt-2 text-xs font-medium text-purple-200/85"
              >
                Capai minimal <strong>100 poin</strong> untuk hadiah +2 Ikan Kering (🐟)!
              </p>

              <!-- Pesan ramah bila sesi ini menghabiskan kuota bermain 5/5 hari ini -->
              <p
                v-if="isPlayQuotaFull"
                class="mt-2.5 max-w-sm rounded-2xl border border-pink-200/35 bg-pink-400/15 px-3.5 py-2 text-xs font-semibold leading-snug text-pink-100"
              >
                🐾 Kuota istirahat hari ini sudah penuh (5/5)! Ayo lanjutkan fokusmu dulu, besok kita tangkap bintang lagi~ ✨
              </p>

              <div class="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  :disabled="isPlayQuotaFull"
                  class="cozy-active-btn btn-bouncy font-display rounded-full px-6 py-2 text-xs font-bold transition"
                  :class="
                    isPlayQuotaFull
                      ? 'cursor-not-allowed bg-white/10 text-purple-200/45 opacity-55'
                      : 'cursor-pointer bg-gradient-to-r from-[#f9a8d4] to-[#c4b5fd] text-[#311042]'
                  "
                  @click="startNewRound"
                >
                  {{ isPlayQuotaFull ? '🔒 Kuota Penuh (5/5)' : '🔄 Main Lagi' }}
                </button>
                <button
                  type="button"
                  class="btn-bouncy font-display cursor-pointer rounded-full border border-white/25 bg-white/10 px-5 py-2 text-xs font-bold text-pink-100 hover:bg-white/20"
                  @click="closeMiniGame"
                >
                  Kembali Fokus ✨
                </button>
              </div>
            </div>
          </div>

          <p class="mt-2.5 text-center text-[11px] font-medium text-purple-200/75">
            Main Hari Ini: <strong>{{ gameDailyPlayCount }}/{{ MAX_GAME_DAILY_PLAYS }}</strong> • Hadiah: <strong>{{ gameDailyClaimCount }}/{{ MAX_GAME_DAILY_REWARDS }}</strong> • Reset otomatis 00:00 waktu lokal 🐱
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>
