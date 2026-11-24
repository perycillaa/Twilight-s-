<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useSoundEffects } from '~/composables/useSoundEffects'
import { MAX_GAME_DAILY_REWARDS, useTwilightStorage } from '~/composables/useTwilightStorage'

const {
  isMiniGameOpen,
  isZenMode,
  gameHighScore,
  gameDailyClaimCount,
  recordMiniGameResult,
} = useTwilightStorage()
const { playGameCatch, playGameZap } = useSoundEffects()

// Jika Starlight Focus ✨ aktif saat modal game terbuka, langsung tutup modal & hentikan animasi
watch(isZenMode, (focusActive) => {
  if (focusActive && isMiniGameOpen.value) {
    isMiniGameOpen.value = false
  }
})

// Ukuran logis kanvas (otomatis diskalakan responsif via CSS untuk PC maupun HP)
const CANVAS_W = 480
const CANVAS_H = 360
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
}

interface FloatingScoreText {
  x: number
  y: number
  text: string
  color: string
  life: number
}

interface CatchSpark {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  life: number
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
} | null>(null)

// Variabel internal game loop (non-reaktif agar 60fps super mulus & hemat baterai)
let rafId: number | null = null
let lastFrameTime = 0
let roundStartTime = 0
let spawnAccumulator = 0
let objectIdCounter = 0

// Posisi & status kucing penangkap di bagian bawah kanvas
let catX = CANVAS_W / 2
let targetCatX = CANVAS_W / 2
let catShockedUntil = 0
let catHappyUntil = 0

// Status tombol panah keyboard (PC)
const keysPressed = { left: false, right: false }

let fallingObjects: FallingObject[] = []
let floatingTexts: FloatingScoreText[] = []
let catchSparks: CatchSpark[] = []

// Bintang latar statis di dalam kanvas
const bgStars = Array.from({ length: 28 }, (_, i) => ({
  x: ((i * 67 + 23) % (CANVAS_W - 20)) + 10,
  y: ((i * 43 + 17) % (CANVAS_H - 90)) + 12,
  r: 1 + (i % 3) * 0.65,
  phase: i * 0.7,
}))

/** Hentikan animasi game loop (penting agar hemat baterai saat modal ditutup) */
function stopGameLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

/** Mulai ronde baru berdurasi 30 detik */
function startNewRound() {
  stopGameLoop()
  score.value = 0
  remainingSeconds.value = 30
  roundSummary.value = null
  phase.value = 'playing'

  catX = CANVAS_W / 2
  targetCatX = CANVAS_W / 2
  catShockedUntil = 0
  catHappyUntil = 0
  fallingObjects = []
  floatingTexts = []
  catchSparks = []
  spawnAccumulator = 0

  const now = performance.now()
  lastFrameTime = now
  roundStartTime = now
  rafId = requestAnimationFrame(gameLoop)
}

/** Selesaikan ronde dan hitung rekor + hadiah koin ikan (+2 🐟 jika skor >= 100, maks 3x/hari) */
function finishRound() {
  stopGameLoop()
  phase.value = 'finished'
  remainingSeconds.value = 0
  roundSummary.value = recordMiniGameResult(score.value)
}

/** Munculkan 1 objek jatuh secara acak: Bintang Pastel (⭐), Ikan Emas (🐟), atau Awan Petir (⚡) */
function spawnFallingObject() {
  const roll = Math.random()
  let kind: FallingKind = 'star'
  if (roll < 0.56) {
    kind = 'star' // +10 poin
  } else if (roll < 0.78) {
    kind = 'fish' // +25 poin (lebih cepat & berkilau)
  } else {
    kind = 'storm' // -15 poin (hindari!)
  }

  const speedBase = kind === 'fish' ? 165 : kind === 'storm' ? 150 : 125
  fallingObjects.push({
    id: ++objectIdCounter,
    kind,
    x: 30 + Math.random() * (CANVAS_W - 60),
    y: -24,
    speed: speedBase + Math.random() * 65,
    radius: kind === 'fish' ? 17 : 18,
    rotation: 0,
    vRot: (Math.random() - 0.5) * 2.2,
  })
}

/** Buat efek percikan kilau saat menangkap bintang atau ikan emas */
function spawnCatchSparks(x: number, y: number, color: string, count = 10) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3
    const speed = 55 + Math.random() * 95
    catchSparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 25,
      color,
      life: 1,
    })
  }
}

/**
 * GAME LOOP UTAMA (requestAnimationFrame):
 * Memperbarui posisi kucing, objek jatuh, deteksi tabrakan, efek partikel, lalu menggambar ke <canvas>.
 */
function gameLoop(now: number) {
  if (phase.value !== 'playing') {
    stopGameLoop()
    return
  }

  const dt = Math.min(0.05, (now - lastFrameTime) / 1000)
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

  // 2. Gerakkan kucing lewat tombol panah keyboard (PC) atau ikuti posisi mouse/sentuhan secara mulus
  const keySpeed = 340
  if (keysPressed.left) targetCatX -= keySpeed * dt
  if (keysPressed.right) targetCatX += keySpeed * dt
  targetCatX = Math.max(36, Math.min(CANVAS_W - 36, targetCatX))
  catX += (targetCatX - catX) * Math.min(1, dt * 16)

  // 3. Spawn objek jatuh secara berkala (makin sedikit seru di 10 detik terakhir)
  const spawnInterval = leftMs < 10000 ? 0.42 : 0.54
  spawnAccumulator += dt
  while (spawnAccumulator >= spawnInterval) {
    spawnAccumulator -= spawnInterval
    spawnFallingObject()
  }

  // 4. Perbarui posisi objek jatuh & cek tangkapan oleh kucing
  const catY = CANVAS_H - 42
  const catchRadiusX = 36
  const catchRadiusY = 28

  const remaining: FallingObject[] = []
  for (const obj of fallingObjects) {
    obj.y += obj.speed * dt
    obj.rotation += obj.vRot * dt

    const hitX = Math.abs(obj.x - catX) < catchRadiusX + obj.radius * 0.4
    const hitY = Math.abs(obj.y - catY) < catchRadiusY + obj.radius * 0.4

    if (hitX && hitY) {
      if (obj.kind === 'star') {
        score.value += 10
        catHappyUntil = now + 350
        playGameCatch(false)
        spawnCatchSparks(obj.x, obj.y, '#f9a8d4', 8)
        floatingTexts.push({ x: obj.x, y: obj.y - 10, text: '+10 ⭐', color: '#fbcfe8', life: 1 })
      } else if (obj.kind === 'fish') {
        score.value += 25
        catHappyUntil = now + 500
        playGameCatch(true)
        spawnCatchSparks(obj.x, obj.y, '#fde68a', 14)
        floatingTexts.push({ x: obj.x, y: obj.y - 12, text: '+25 🐟✨', color: '#fde68a', life: 1 })
      } else {
        score.value = Math.max(0, score.value - 15)
        catShockedUntil = now + 520
        playGameZap()
        spawnCatchSparks(obj.x, obj.y, '#c084fc', 10)
        floatingTexts.push({ x: obj.x, y: obj.y - 10, text: '-15 ⚡', color: '#fca5a5', life: 1 })
      }
      continue
    }

    if (obj.y < CANVAS_H + 30) {
      remaining.push(obj)
    }
  }
  fallingObjects = remaining

  // 5. Perbarui partikel kilau & teks skor melayang
  catchSparks = catchSparks.filter((p) => {
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vy += 120 * dt
    p.life -= dt * 2.1
    return p.life > 0
  })

  floatingTexts = floatingTexts.filter((ft) => {
    ft.y -= 42 * dt
    ft.life -= dt * 1.4
    return ft.life > 0
  })

  // 6. Gambar seluruh adegan ke kanvas
  drawScene(now)
  rafId = requestAnimationFrame(gameLoop)
}

/** Menggambar latar malam, objek jatuh, efek kilau, dan kucing penangkap di <canvas> */
function drawScene(now: number) {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Latar langit malam gradasi Twilight's
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
  grad.addColorStop(0, '#191442')
  grad.addColorStop(1, '#311042')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Efek getar halus saat kucing kaget terkena awan petir
  ctx.save()
  if (now < catShockedUntil) {
    ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4)
  }

  // Bintang berkedip halus di latar kanvas
  for (const s of bgStars) {
    const alpha = 0.35 + 0.55 * Math.sin(now * 0.003 + s.phase)
    ctx.fillStyle = `rgba(255, 245, 252, ${alpha})`
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fill()
  }

  // Garis tanah pastel lembut di bawah
  ctx.fillStyle = 'rgba(249, 168, 212, 0.14)'
  ctx.fillRect(0, CANVAS_H - 16, CANVAS_W, 16)

  // Gambar semua objek jatuh (Bintang Pastel, Ikan Emas, Awan Petir)
  for (const obj of fallingObjects) {
    ctx.save()
    ctx.translate(obj.x, obj.y)
    if (obj.kind === 'star') {
      ctx.rotate(obj.rotation)
      drawPastelStar(ctx, 14)
    } else if (obj.kind === 'fish') {
      drawGoldenFish(ctx)
    } else {
      drawStormCloud(ctx)
    }
    ctx.restore()
  }

  // Gambar partikel kilau tangkapan
  for (const sp of catchSparks) {
    ctx.save()
    ctx.globalAlpha = Math.max(0, sp.life)
    ctx.fillStyle = sp.color
    ctx.beginPath()
    ctx.arc(sp.x, sp.y, 3.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // Gambar karakter kucing penangkap imut di bawah
  drawCatcherCat(ctx, catX, CANVAS_H - 38, now < catShockedUntil, now < catHappyUntil)

  // Gambar teks skor melayang (+10, +25, -15)
  ctx.font = 'bold 14px Quicksand, sans-serif'
  ctx.textAlign = 'center'
  for (const ft of floatingTexts) {
    ctx.save()
    ctx.globalAlpha = Math.max(0, ft.life)
    ctx.fillStyle = ft.color
    ctx.fillText(ft.text, ft.x, ft.y)
    ctx.restore()
  }

  ctx.restore()
}

function drawPastelStar(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const outer = (Math.PI * 2 * i) / 5 - Math.PI / 2
    const inner = outer + Math.PI / 5
    if (i === 0) ctx.moveTo(Math.cos(outer) * r, Math.sin(outer) * r)
    else ctx.lineTo(Math.cos(outer) * r, Math.sin(outer) * r)
    ctx.lineTo(Math.cos(inner) * (r * 0.48), Math.sin(inner) * (r * 0.48))
  }
  ctx.closePath()
  ctx.fillStyle = '#f9a8d4'
  ctx.shadowColor = '#f9a8d4'
  ctx.shadowBlur = 10
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.4
  ctx.stroke()
}

function drawGoldenFish(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = '#fde68a'
  ctx.shadowBlur = 12
  // Ekor ikan emas
  ctx.fillStyle = '#fbbf24'
  ctx.beginPath()
  ctx.moveTo(10, 0)
  ctx.lineTo(20, -8)
  ctx.lineTo(20, 8)
  ctx.closePath()
  ctx.fill()
  // Badan ikan emas
  ctx.fillStyle = '#fde68a'
  ctx.beginPath()
  ctx.ellipse(-1, 0, 14, 9, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#f59e0b'
  ctx.lineWidth = 1.4
  ctx.stroke()
  // Mata mungil
  ctx.shadowBlur = 0
  ctx.fillStyle = '#311042'
  ctx.beginPath()
  ctx.arc(-7, -2, 2, 0, Math.PI * 2)
  ctx.fill()
}

function drawStormCloud(ctx: CanvasRenderingContext2D) {
  // Awan ungu gelap
  ctx.fillStyle = '#6d28d9'
  ctx.beginPath()
  ctx.arc(-9, -2, 10, 0, Math.PI * 2)
  ctx.arc(0, -7, 12, 0, Math.PI * 2)
  ctx.arc(10, -2, 9, 0, Math.PI * 2)
  ctx.fill()
  // Petir kuning mini
  ctx.fillStyle = '#fde047'
  ctx.beginPath()
  ctx.moveTo(2, -1)
  ctx.lineTo(-5, 9)
  ctx.lineTo(0, 9)
  ctx.lineTo(-3, 19)
  ctx.lineTo(7, 6)
  ctx.lineTo(1, 6)
  ctx.closePath()
  ctx.fill()
}

function drawCatcherCat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  shocked: boolean,
  happy: boolean,
) {
  ctx.save()
  ctx.translate(x, y)

  // Telinga kiri & kanan
  ctx.fillStyle = '#fff7fb'
  ctx.beginPath()
  ctx.moveTo(-22, -8)
  ctx.lineTo(-26, -28)
  ctx.lineTo(-9, -18)
  ctx.closePath()
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(22, -8)
  ctx.lineTo(26, -28)
  ctx.lineTo(9, -18)
  ctx.closePath()
  ctx.fill()

  // Dalam telinga pink
  ctx.fillStyle = '#fbcfe8'
  ctx.beginPath()
  ctx.moveTo(-20, -11)
  ctx.lineTo(-22, -23)
  ctx.lineTo(-12, -17)
  ctx.closePath()
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(20, -11)
  ctx.lineTo(22, -23)
  ctx.lineTo(12, -17)
  ctx.closePath()
  ctx.fill()

  // Kepala bulat kawaii
  ctx.fillStyle = '#fff7fb'
  ctx.beginPath()
  ctx.ellipse(0, 0, 27, 22, 0, 0, Math.PI * 2)
  ctx.fill()

  // Pipi merona
  ctx.fillStyle = 'rgba(249, 168, 212, 0.7)'
  ctx.beginPath()
  ctx.ellipse(-15, 5, 5, 3, 0, 0, Math.PI * 2)
  ctx.ellipse(15, 5, 5, 3, 0, 0, Math.PI * 2)
  ctx.fill()

  // Ekspresi mata (Kaget / Bahagia / Normal)
  ctx.strokeStyle = '#3b215c'
  ctx.fillStyle = '#3b215c'
  ctx.lineWidth = 2.4
  ctx.lineCap = 'round'

  if (shocked) {
    ctx.beginPath()
    ctx.arc(-9, -2, 4.5, 0, Math.PI * 2)
    ctx.arc(9, -2, 4.5, 0, Math.PI * 2)
    ctx.stroke()
    // Mulut kaget (o)
    ctx.beginPath()
    ctx.arc(0, 8, 3.5, 0, Math.PI * 2)
    ctx.fillStyle = '#f472b6'
    ctx.fill()
  } else if (happy) {
    ctx.beginPath()
    ctx.arc(-9, 0, 5, Math.PI * 1.1, Math.PI * 1.9)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(9, 0, 5, Math.PI * 1.1, Math.PI * 1.9)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0, 6, 4, 0, Math.PI)
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.arc(-9, -2, 3.4, 0, Math.PI * 2)
    ctx.arc(9, -2, 3.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-4, 6)
    ctx.quadraticCurveTo(0, 10, 4, 6)
    ctx.stroke()
  }

  // Keranjang bintang mini di depan kucing
  ctx.fillStyle = '#f9a8d4'
  ctx.beginPath()
  ctx.roundRect(-24, 14, 48, 12, 6)
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.4
  ctx.stroke()

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
  targetCatX = Math.max(36, Math.min(CANVAS_W - 36, relX))
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

// Hentikan otomatis game loop jika modal ditutup dari luar agar baterai tetap hemat
watch(isMiniGameOpen, (open) => {
  if (!open) {
    stopGameLoop()
    phase.value = 'ready'
    keysPressed.left = false
    keysPressed.right = false
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
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
  <!-- Modal Kawaii Mini-Game: "Starlight & Fish Catcher" (30 Detik) -->
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
        <!-- Header Modal Game -->
        <div class="flex items-center justify-between border-b border-white/15 bg-white/5 px-5 py-3.5">
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

          <button
            type="button"
            aria-label="Tutup Break Game"
            class="btn-bouncy flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-xs font-bold text-pink-100 hover:bg-pink-400 hover:text-[#1e1b4b]"
            @click="closeMiniGame"
          >
            ✕
          </button>
        </div>

        <!-- Bar HUD: Skor, Sisa Waktu, High Score, & Kuota Hadiah Harian (maks 3/hari) -->
        <div class="grid grid-cols-2 gap-2 border-b border-white/10 bg-black/25 px-4 py-2.5 text-center sm:grid-cols-4">
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
            <p class="font-display text-base font-bold text-emerald-200">
              🐟 {{ gameDailyClaimCount }}/{{ MAX_GAME_DAILY_REWARDS }}
            </p>
          </div>
        </div>

        <!-- Area Kanvas Permainan + Overlay Mulai / Hasil Ronde -->
        <div class="relative p-4">
          <div class="relative overflow-hidden rounded-2xl border border-white/20 bg-[#191442] shadow-inner">
            <canvas
              ref="canvasRef"
              :width="CANVAS_W"
              :height="CANVAS_H"
              class="block aspect-[4/3] w-full touch-none select-none"
              @pointerdown="updateTargetFromPointer"
              @pointermove="updateTargetFromPointer"
            />

            <!-- Overlay 1: Layar Awal Sebelum Mulai -->
            <div
              v-if="phase === 'ready'"
              class="absolute inset-0 flex flex-col items-center justify-center bg-[#181038]/85 p-5 text-center backdrop-blur-xs"
            >
              <p class="font-display text-xl font-bold text-pink-200">
                Tangkap Bintang &amp; Ikan Emas! ✨
              </p>

              <div class="mt-3 flex flex-wrap justify-center gap-2 text-xs font-semibold">
                <span class="rounded-full bg-pink-300/20 px-3 py-1 text-pink-100">⭐ Bintang +10</span>
                <span class="rounded-full bg-amber-300/20 px-3 py-1 text-amber-100">🐟 Ikan Emas +25</span>
                <span class="rounded-full bg-purple-400/25 px-3 py-1 text-rose-200">⚡ Petir -15</span>
              </div>

              <p class="mt-3 max-w-xs text-xs text-purple-200/85">
                Gerakkan kucing pakai <strong>mouse / tombol panah (← →)</strong> di PC, atau <strong>geser jari</strong> di HP!
              </p>

              <button
                type="button"
                class="btn-bouncy font-display mt-5 cursor-pointer rounded-full bg-gradient-to-r from-[#f9a8d4] to-[#c4b5fd] px-7 py-2.5 text-sm font-bold text-[#311042] shadow-lg shadow-pink-500/30"
                @click="startNewRound"
              >
                ▶ Mulai Main (30 Detik)
              </button>
            </div>

            <!-- Overlay 2: Layar Selesai Ronde -->
            <div
              v-else-if="phase === 'finished'"
              class="absolute inset-0 flex flex-col items-center justify-center bg-[#181038]/88 p-5 text-center backdrop-blur-xs"
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
                v-else-if="score >= 100 && gameDailyClaimCount >= MAX_GAME_DAILY_REWARDS"
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

              <div class="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  class="btn-bouncy font-display cursor-pointer rounded-full bg-gradient-to-r from-[#f9a8d4] to-[#c4b5fd] px-6 py-2 text-xs font-bold text-[#311042]"
                  @click="startNewRound"
                >
                  🔄 Main Lagi
                </button>
                <button
                  type="button"
                  class="btn-bouncy cursor-pointer rounded-full border border-white/25 bg-white/10 px-5 py-2 text-xs font-bold text-pink-100 hover:bg-white/20"
                  @click="closeMiniGame"
                >
                  Kembali Fokus ✨
                </button>
              </div>
            </div>
          </div>

          <p class="mt-2.5 text-center text-[11px] font-medium text-purple-200/75">
            Hadiah Game Hari Ini: <strong>{{ gameDailyClaimCount }}/{{ MAX_GAME_DAILY_REWARDS }}</strong> • Maksimal 3 klaim per hari agar tetap fokus 🐱
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>
