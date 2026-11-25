<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useSoundEffects } from '~/composables/useSoundEffects'
import { VIBRATION_PATTERNS, useTwilightStorage } from '~/composables/useTwilightStorage'

const props = withDefaults(
  defineProps<{
    isZenStage?: boolean
  }>(),
  {
    isZenStage: false,
  },
)

const {
  currentMascotMood,
  mascotSpeech,
  isPomodoroRunning,
  activeTimerMode,
  isImmersiveZenOpen,
  isBgmPlaying,
  isMasterAudioMuted,
  masterAudioVolume,
  equippedAccessory,
  activeCozyTheme,
  graphicsQuality,
  catKeyboardInteractSignal,
  triggerMascotReaction,
  addCatAffinityXp,
  triggerVibration,
} = useTwilightStorage()

// Status Co-Working Body Doubling mengikuti timer aktif: 'focus' (meja belajar), 'break' (teh & ikan bakar), atau 'idle'
const coWorkingState = computed<'focus' | 'break' | 'idle'>(() => {
  if (!isPomodoroRunning.value) return 'idle'
  return activeTimerMode.value === 'focus' ? 'focus' : 'break'
})
const { playMainCatMeow, startCatPurr, stopCatPurr } = useSoundEffects()

// Daftar kalimat penyemangat acak ketika kucing utama diklik
const ENCOURAGING_QUOTES = [
  'Cheer your day with me! 🎵',
  'Kamu keren banget hari ini! 💖',
  'Tarik napas sejenak, jangan lupa minum air~ 💧',
  'Meow~ Ide barumu pasti berhasil! ⭐',
  'Pelan-pelan asal konsisten, kamu hebat! ✨',
  'Aku selalu menemani fokusmu di sini~ 🎧',
]

// Variasi ekspresi Idle Kucing Utama (berganti halus tiap 8–12 detik):
// 'calm' (• ᴗ •) | 'music' (˘ ◡ ˘ + ♪) | 'curious' (◕ ω ◕ menoleh)
type MainCatIdleFace = 'calm' | 'music' | 'curious'
// Variasi ekspresi ceria saat diklik selama ~1.5 detik: 'star' (★ ω ★) | 'cheer' (^ o ^)
type MainCatClickFace = 'star' | 'cheer'

// Partikel hati/bintang sementara yang memancar saat kucing diklik
interface ClickParticle {
  id: number
  symbol: string
  tx: string
  ty: string
  left: string
  top: string
}

// Partikel hati kecil ♥ / ✨ yang melayang naik saat di-pet-pet / dielus
interface PetHeart {
  id: number
  symbol: string
  left: string
  top: string
  hx: string
}

const particles = ref<ClickParticle[]>([])
const petHearts = ref<PetHeart[]>([])
const idleFace = ref<MainCatIdleFace>('calm')
const clickBurstFace = ref<MainCatClickFace | null>(null)
const isClickBouncing = ref<boolean>(false)

// State Interaksi Pet-Pet / Headpat (kursor tangan mengelus + purring + menyandar nyaman)
const isHoveringCat = ref<boolean>(false)
const isBeingPetted = ref<boolean>(false)
const handLocalX = ref<number>(90)
const handLocalY = ref<number>(50)
const headLeanDeg = ref<number>(0)

let lastQuoteIndex = -1
let idleCycleTimer: ReturnType<typeof setTimeout> | null = null
let clickFaceTimer: ReturnType<typeof setTimeout> | null = null
let clickBounceTimer: ReturnType<typeof setTimeout> | null = null
let petIdleStopTimer: ReturnType<typeof setTimeout> | null = null
let touchHoldTimer: ReturnType<typeof setTimeout> | null = null
let lastPetX = 0
let lastPetY = 0
let rubAccumulator = 0
let lastHeartSpawnAt = 0
let suppressNextClick = false
let petHeartCounter = 0

function getEffectiveCatVolume(): number {
  return isMasterAudioMuted.value ? 0 : masterAudioVolume.value
}

// Sinkronkan suara dengkuran (purring) jika pengguna menekan Mute atau mengubah volume utama
watch([isMasterAudioMuted, masterAudioVolume], () => {
  if (!isBeingPetted.value) return
  const vol = getEffectiveCatVolume()
  if (vol <= 0.005) {
    stopCatPurr()
  } else {
    startCatPurr(vol)
  }
})

// Jadwalkan pergantian wajah Idle setiap 8–12 detik secara alami (acak)
function scheduleNextIdleFace() {
  if (idleCycleTimer) clearTimeout(idleCycleTimer)
  const delayMs = 8000 + Math.floor(Math.random() * 4001)
  idleCycleTimer = setTimeout(() => {
    const order: MainCatIdleFace[] = ['calm', 'music', 'curious']
    const nextChoices = order.filter(f => f !== idleFace.value)
    idleFace.value = nextChoices[Math.floor(Math.random() * nextChoices.length)] ?? 'calm'
    scheduleNextIdleFace()
  }, delayMs)
}

/** Munculkan partikel hati ♥ / ✨ lembut melayang naik saat sedang dielus */
function spawnPetHeart(xPx: number, yPx: number) {
  const now = Date.now()
  if (now - lastHeartSpawnAt < 340) return
  lastHeartSpawnAt = now

  const id = ++petHeartCounter
  const symbol = id % 3 === 0 ? '✨' : '♥'
  const offsetX = Math.round((Math.random() - 0.5) * 26)
  petHearts.value = [
    ...petHearts.value.slice(-7),
    {
      id,
      symbol,
      left: `${Math.round(xPx)}px`,
      top: `${Math.round(Math.max(12, yPx - 10))}px`,
      hx: `${offsetX}px`,
    },
  ]
  setTimeout(() => {
    petHearts.value = petHearts.value.filter(h => h.id !== id)
  }, 1050)
}

/** Mulai mode pet-pet: nyalakan dengkuran hangat, wajah nyaman & +1 XP kasih sayang tiap ~1.5 dtk */
function beginPettingMode() {
  if (!isBeingPetted.value) {
    isBeingPetted.value = true
    triggerVibration(VIBRATION_PATTERNS.microHaptic)
  }
  startCatPurr(getEffectiveCatVolume())
  addCatAffinityXp(1, 'pet')
  if (petIdleStopTimer) clearTimeout(petIdleStopTimer)
  petIdleStopTimer = setTimeout(() => {
    endPettingMode()
  }, 540)
}

/** Hentikan mode pet-pet & fade-out dengkuran perlahan */
function endPettingMode() {
  if (petIdleStopTimer) {
    clearTimeout(petIdleStopTimer)
    petIdleStopTimer = null
  }
  if (touchHoldTimer) {
    clearTimeout(touchHoldTimer)
    touchHoldTimer = null
  }
  if (isBeingPetted.value) {
    isBeingPetted.value = false
    headLeanDeg.value = 0
    stopCatPurr()
  }
  rubAccumulator = 0
}

function handlePetPointerEnter(event: PointerEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  handLocalX.value = event.clientX - rect.left
  handLocalY.value = event.clientY - rect.top
  lastPetX = event.clientX
  lastPetY = event.clientY
  rubAccumulator = 0
  if (event.pointerType === 'mouse') {
    isHoveringCat.value = true
  }
}

function handlePetPointerDown(event: PointerEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  handLocalX.value = event.clientX - rect.left
  handLocalY.value = event.clientY - rect.top
  lastPetX = event.clientX
  lastPetY = event.clientY
  rubAccumulator = 0
  suppressNextClick = false

  // Pada layar sentuh (HP), tahan lembut ~280ms atau usap jari akan masuk mode pet-pet
  if (event.pointerType !== 'mouse') {
    isHoveringCat.value = true
    if (touchHoldTimer) clearTimeout(touchHoldTimer)
    touchHoldTimer = setTimeout(() => {
      suppressNextClick = true
      beginPettingMode()
      spawnPetHeart(handLocalX.value, handLocalY.value)
    }, 280)
  }
}

function handlePetPointerMove(event: PointerEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const localX = event.clientX - rect.left
  const localY = event.clientY - rect.top
  handLocalX.value = localX
  handLocalY.value = localY

  const dx = event.clientX - lastPetX
  const dy = event.clientY - lastPetY
  const stepDist = Math.hypot(dx, dy)
  lastPetX = event.clientX
  lastPetY = event.clientY

  // Pada mouse, gerakan mengusap lembut di atas kepala memicu pet-pet (tanpa perlu menahan klik)
  // Pada touch, gerakan jari mengusap di atas kucing memicu pet-pet
  const isTouchActive = event.pointerType !== 'mouse' && isHoveringCat.value
  const isMouseHover = event.pointerType === 'mouse'
  if (!isMouseHover && !isTouchActive) return

  if (stepDist > 1.2) {
    rubAccumulator += stepDist
    // Miringkan kepala kucing sedikit menyandar mengikuti posisi elusan kiri/kanan
    const normalizedX = Math.max(-1, Math.min(1, (localX / Math.max(1, rect.width) - 0.5) * 2))
    headLeanDeg.value = Math.round(normalizedX * 6)

    if (rubAccumulator >= 24) {
      if (isTouchActive) suppressNextClick = true
      beginPettingMode()
      spawnPetHeart(localX, localY)
    }
  }
}

function handlePetPointerUp(event: PointerEvent) {
  if (touchHoldTimer) {
    clearTimeout(touchHoldTimer)
    touchHoldTimer = null
  }
  if (event.pointerType !== 'mouse') {
    isHoveringCat.value = false
    endPettingMode()
  }
}

function handlePetPointerLeave() {
  isHoveringCat.value = false
  endPettingMode()
}

// Ekspresi wajah aktif saat ini (prioritas: klik berbinar > sedang dielus nyaman > selebrasi > break rileks > fokus > variasi idle)
const activeFaceMode = computed<'click-star' | 'click-cheer' | 'petted' | 'celebrate' | 'happy' | 'music' | 'curious' | 'calm' | 'focus-serious'>(() => {
  if (clickBurstFace.value === 'star') return 'click-star'
  if (clickBurstFace.value === 'cheer') return 'click-cheer'
  if (isBeingPetted.value) return 'petted'
  if (currentMascotMood.value === 'celebrate') return 'celebrate'
  if (currentMascotMood.value === 'happy') return 'happy'
  if (coWorkingState.value === 'break') return 'music'
  if (coWorkingState.value === 'focus') return 'focus-serious'
  if (currentMascotMood.value === 'idle') return idleFace.value
  return 'calm'
})

// Teks gelembung ucapan otomatis sesuai mood maskot & Co-Working Body Doubling
const displayedSpeech = computed<string>(() => {
  if (isBeingPetted.value) {
    return 'Purrrr~ Nyaman banget dielus~ 💕'
  }
  if (currentMascotMood.value === 'celebrate') {
    return mascotSpeech.value || 'Yeay! Semua target tercapai! ✨'
  }
  if (currentMascotMood.value === 'reminder') {
    return mascotSpeech.value || 'Meow! Ada jadwal yang sudah dekat~ ⏰'
  }
  if (currentMascotMood.value === 'happy') {
    return mascotSpeech.value
  }
  if (coWorkingState.value === 'focus') {
    return 'Fokus bareng yuk! Aku juga ikut ngetik~ 💻📖'
  }
  if (coWorkingState.value === 'break') {
    return 'Istirahat dulu~ Teh hangat & ikan bakar enak banget! ☕🐟'
  }
  if (currentMascotMood.value === 'focus') {
    if (isBgmPlaying.value) return 'Asyik, senandung lo-fi menemani kita~ 🎶'
  }
  return mascotSpeech.value || 'Cheer your day with me! 🎵'
})

// Kelas animasi tubuh maskot berdasarkan mood aktif + efek membal saat diklik
const mascotMotionClass = computed<string>(() => {
  if (isClickBouncing.value) return 'animate-pet-hop'
  if (isBeingPetted.value) return ''
  if (currentMascotMood.value === 'celebrate') return 'animate-mascot-jump'
  if (coWorkingState.value === 'focus') return ''
  if (currentMascotMood.value === 'focus' || activeFaceMode.value === 'music') {
    return 'animate-mascot-nod'
  }
  return 'animate-float-slow'
})

// Label kecil status mood di bawah kucing
const moodBadgeLabel = computed<string>(() => {
  if (isBeingPetted.value) return '🖐️ Purrrr~ Enak banget!'
  if (coWorkingState.value === 'focus') return '💻 Co-Working Fokus Bareng!'
  if (coWorkingState.value === 'break') return '☕ Santai Break • Teh & Ikan Bakar'
  switch (currentMascotMood.value) {
    case 'celebrate':
      return '🎉 Mode Selebrasi!'
    case 'reminder':
      return '⏰ Pengingat Jadwal!'
    case 'happy':
      return '💖 Senang Banget!'
    case 'focus':
      return '👓 Mode Fokus Lo-Fi'
    default:
      return '🐾 Klik atau usap aku untuk semangat!'
  }
})

/**
 * Ketika maskot kucing utama diklik cepat:
 * - Bunyikan 1 dari 5 variasi "Mee-ow!" realistis (tersinkron dengan mute/volume utama)
 * - Ubah ekspresi wajah menjadi berbinar menyemangati (★ ω ★ / ^ o ^) + rona pipi + kilau ✨/♥ selama 1.5 detik
 * - Jalankan animasi membal (bounce) lembut bersamaan dengan pesan penyemangat acak
 */
function handleCatClick() {
  if (suppressNextClick) {
    suppressNextClick = false
    return
  }

  endPettingMode()
  playMainCatMeow(getEffectiveCatVolume())
  triggerVibration(VIBRATION_PATTERNS.microHaptic)
  // +1 XP Kasih Sayang Kucing saat diklik (cooldown anti-spam 2 detik dikelola composable)
  addCatAffinityXp(1, 'click')

  // Bergantian antara wajah berbinar ★ ω ★ dan ^ o ^ selama 1.5 detik
  clickBurstFace.value = clickBurstFace.value === 'star' ? 'cheer' : 'star'
  if (clickFaceTimer) clearTimeout(clickFaceTimer)
  clickFaceTimer = setTimeout(() => {
    clickBurstFace.value = null
  }, 1500)

  // Efek membal lembut saat diklik
  isClickBouncing.value = false
  requestAnimationFrame(() => {
    isClickBouncing.value = true
  })
  if (clickBounceTimer) clearTimeout(clickBounceTimer)
  clickBounceTimer = setTimeout(() => {
    isClickBouncing.value = false
  }, 520)

  // Pilih kalimat yang berbeda dari kalimat sebelumnya
  let nextIdx = Math.floor(Math.random() * ENCOURAGING_QUOTES.length)
  if (nextIdx === lastQuoteIndex) {
    nextIdx = (nextIdx + 1) % ENCOURAGING_QUOTES.length
  }
  lastQuoteIndex = nextIdx

  const nextQuote = ENCOURAGING_QUOTES[nextIdx] ?? 'Cheer your day with me! 🎵'
  triggerMascotReaction('happy', nextQuote, 3200)

  // Munculkan 6 partikel hati/bintang pastel yang menyebar
  const burstSymbols = ['💖', '✨', '⭐', '💗', '🎵', '♥']
  const nowId = Date.now()
  const newBurst: ClickParticle[] = burstSymbols.map((symbol, i) => {
    const angle = (Math.PI * 2 * i) / burstSymbols.length - Math.PI / 2
    const dist = 42 + (i % 2) * 16
    return {
      id: nowId + i,
      symbol,
      tx: `${Math.round(Math.cos(angle) * dist)}px`,
      ty: `${Math.round(Math.sin(angle) * dist - 14)}px`,
      left: '50%',
      top: '46%',
    }
  })

  particles.value = [...particles.value, ...newBurst]
  setTimeout(() => {
    particles.value = particles.value.filter(p => p.id < nowId || p.id >= nowId + burstSymbols.length)
  }, 800)
}

// Pintasan keyboard [C]: berinteraksi / mengelus Kucing Putih dari keyboard (tanpa suara ganda saat Twilight Focus aktif)
watch(catKeyboardInteractSignal, () => {
  const shouldHandle = isImmersiveZenOpen.value ? props.isZenStage : !props.isZenStage
  if (!shouldHandle) return
  handleCatClick()
})

onMounted(() => {
  scheduleNextIdleFace()
})

onUnmounted(() => {
  endPettingMode()
  if (idleCycleTimer) clearTimeout(idleCycleTimer)
  if (clickFaceTimer) clearTimeout(clickFaceTimer)
  if (clickBounceTimer) clearTimeout(clickBounceTimer)
})
</script>

<template>
  <!-- Komponen Karakter Pendamping Kucing Interaktif -->
  <div class="relative flex flex-col items-center">
    <!-- Gelembung Dialog Maskot Kucing -->
    <div
      class="relative mb-2 max-w-[240px] rounded-2xl border border-white/25 bg-white/15 px-3.5 py-2 text-center text-xs font-semibold leading-snug text-pink-50 shadow-md backdrop-blur-sm transition-all duration-300"
    >
      {{ displayedSpeech }}
      <!-- Ekor kecil gelembung dialog -->
      <span
        aria-hidden="true"
        class="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-white/25 bg-[#3a245c]/90"
      />
    </div>

    <!-- Area Klik & Pet-Pet / Headpat Maskot Kucing + Kursor Tangan Mengelus -->
    <button
      type="button"
      data-pet-headpat
      class="group relative select-none rounded-full p-1 outline-none transition-transform duration-200 hover:scale-105 active:scale-95"
      :class="isHoveringCat ? 'cursor-none' : 'cursor-pointer'"
      title="Klik untuk semangat, atau usap kepalanya untuk mengelus (pet-pet)!"
      @click="handleCatClick"
      @pointerenter="handlePetPointerEnter"
      @pointerdown="handlePetPointerDown"
      @pointermove="handlePetPointerMove"
      @pointerup="handlePetPointerUp"
      @pointercancel="handlePetPointerUp"
      @pointerleave="handlePetPointerLeave"
    >
      <!-- Kursor Tangan Mengelus (Animated Hand Pat Cursor) mengikuti kursor di atas kucing -->
      <div
        v-if="isHoveringCat"
        aria-hidden="true"
        class="pointer-events-none absolute z-30 select-none"
        :style="{ left: `${handLocalX}px`, top: `${handLocalY}px` }"
      >
        <div
          class="flex items-center justify-center drop-shadow-[0_4px_8px_rgba(249,168,212,0.55)]"
          :class="isBeingPetted ? 'animate-hand-pat' : '-translate-x-1/2 -translate-y-1/2 -rotate-12'"
        >
          <span class="text-2xl leading-none">🖐️</span>
        </div>
      </div>

      <!-- Partikel Hati ♥ & Kilau ✨ Melayang Naik saat Kucing Dielus -->
      <span
        v-for="heart in petHearts"
        :key="heart.id"
        aria-hidden="true"
        class="animate-heart-rise pointer-events-none absolute z-20 text-sm font-bold text-pink-300 drop-shadow-[0_0_6px_rgba(249,168,212,0.85)]"
        :style="{
          left: heart.left,
          top: heart.top,
          '--hx': heart.hx,
        }"
      >
        {{ heart.symbol }}
      </span>

      <!-- Percikan partikel hati saat diklik -->
      <span
        v-for="p in particles"
        :key="p.id"
        aria-hidden="true"
        class="animate-spark-pop pointer-events-none absolute z-20 text-base"
        :style="{
          left: p.left,
          top: p.top,
          '--tx': p.tx,
          '--ty': p.ty,
        }"
      >
        {{ p.symbol }}
      </span>

      <div
        class="relative transition-transform duration-200 ease-out"
        :class="mascotMotionClass"
        :style="
          isBeingPetted
            ? { transform: `rotate(${headLeanDeg}deg) translateY(3px) scale(1.03, 0.98)` }
            : undefined
        "
      >
        <!-- Not musik & kilau ekspresi di sekitar maskot -->
        <span
          class="animate-float-note font-display pointer-events-none absolute -left-2 top-2 text-lg text-pink-300"
          style="animation-delay: 0.1s"
        >
          {{
            activeFaceMode === 'click-star' || activeFaceMode === 'click-cheer'
              ? '✨'
              : currentMascotMood === 'celebrate'
                ? '★'
                : '♪'
          }}
        </span>
        <span
          class="animate-float-note font-display pointer-events-none absolute -right-2 top-5 text-xl text-purple-200"
          style="animation-delay: 0.9s"
        >
          {{
            activeFaceMode === 'click-star' || activeFaceMode === 'click-cheer'
              ? '♥'
              : currentMascotMood === 'reminder'
                ? '⏰'
                : activeFaceMode === 'music'
                  ? '♪'
                  : '♫'
          }}
        </span>

        <!-- Uap Hangat Tipis Rumah Teh Matcha di sekitar kucing (khusus tema 🍵 Matcha Garden) -->
        <svg
          v-if="activeCozyTheme === 'matcha-garden' && graphicsQuality !== 'low'"
          aria-hidden="true"
          class="pointer-events-none absolute -bottom-1 -left-5 h-16 w-10 opacity-45"
          viewBox="0 0 36 60"
          fill="none"
        >
          <path
            class="animate-steam-rise"
            style="--steam-delay: 0.1s"
            d="M12 52 Q6 38 14 26 Q20 15 12 6"
            stroke="#ecfdf5"
            stroke-width="2.4"
            stroke-linecap="round"
          />
          <path
            class="animate-steam-rise"
            style="--steam-delay: 0.9s"
            d="M24 54 Q29 40 22 28 Q17 18 24 8"
            stroke="#bbf7d0"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
        <svg
          v-if="activeCozyTheme === 'matcha-garden' && graphicsQuality !== 'low'"
          aria-hidden="true"
          class="pointer-events-none absolute -bottom-1 -right-5 h-16 w-10 opacity-40"
          viewBox="0 0 36 60"
          fill="none"
        >
          <path
            class="animate-steam-rise"
            style="--steam-delay: 0.45s"
            d="M14 52 Q20 38 12 26 Q7 15 15 6"
            stroke="#ecfdf5"
            stroke-width="2.2"
            stroke-linecap="round"
          />
          <path
            class="animate-steam-rise"
            style="--steam-delay: 1.25s"
            d="M25 54 Q20 40 26 28 Q31 18 23 8"
            stroke="#a7f3d0"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>

        <!-- SVG Kucing Kawaii Memakai Headphone dengan 5 Ekspresi Dinamis -->
        <svg
          class="h-40 w-40 drop-shadow-[0_12px_22px_rgba(12,8,34,0.45)] sm:h-44 sm:w-44"
          viewBox="0 0 220 220"
          fill="none"
          role="img"
          aria-label="Maskot kucing interaktif Twilight's memakai headphone"
        >
          <!-- Aura lembut di belakang kucing -->
          <circle cx="110" cy="116" r="76" fill="url(#twilightCatAura)" opacity="0.92" />

          <!-- AKSESORIS BELAKANG TUBUH: ✨ Sayap Malaikat & Aura Bintang (Milestone Lv. 20 MAX) -->
          <g v-if="equippedAccessory === 'angel-wings'">
            <!-- Aura bintang keemasan -->
            <circle cx="110" cy="118" r="84" fill="#fef08a" opacity="0.16" />
            <!-- Sayap Kiri -->
            <path
              d="M78 148 C42 134, 16 106, 20 82 C36 88, 52 100, 66 116 C42 108, 22 114, 18 134 C34 138, 54 140, 72 146 C50 148, 32 156, 28 170 C48 172, 66 164, 80 156 Z"
              fill="#fffdf7"
              stroke="#fde68a"
              stroke-width="2"
              stroke-linejoin="round"
            />
            <!-- Sayap Kanan -->
            <path
              d="M142 148 C178 134, 204 106, 200 82 C184 88, 168 100, 154 116 C178 108, 198 114, 202 134 C186 138, 166 140, 148 146 C170 148, 188 156, 192 170 C172 172, 154 164, 140 156 Z"
              fill="#fffdf7"
              stroke="#fde68a"
              stroke-width="2"
              stroke-linejoin="round"
            />
            <!-- Bintang kecil berkilau di sekitar sayap -->
            <path d="M34 68 L36 73 L41 75 L36 77 L34 82 L32 77 L27 75 L32 73 Z" fill="#fef08a" />
            <path d="M186 68 L188 73 L193 75 L188 77 L186 82 L184 77 L179 75 L184 73 Z" fill="#fef08a" />
            <circle cx="24" cy="154" r="2.5" fill="#fbcfe8" />
            <circle cx="196" cy="154" r="2.5" fill="#fbcfe8" />
          </g>

          <!-- AKSESORIS KEPALA MASKOT (hasil tukar koin 🐟, Milestone, atau selebrasi 100%) -->
          <!-- 1. Mahkota Bintang (muncul saat dipakai ATAU saat mode selebrasi 100% jika belum memakai aksesoris lain) -->
          <g
            v-if="
              equippedAccessory === 'star-crown' ||
              (currentMascotMood === 'celebrate' && equippedAccessory === 'none')
            "
          >
            <path
              d="M86 58 L93 35 L110 48 L127 35 L134 58 Z"
              fill="#fde68a"
              stroke="#ffffff"
              stroke-width="2.2"
              stroke-linejoin="round"
            />
            <circle cx="110" cy="34" r="4" fill="#f9a8d4" stroke="#ffffff" stroke-width="1.2" />
            <circle cx="93" cy="35" r="2.8" fill="#c4b5fd" />
            <circle cx="127" cy="35" r="2.8" fill="#c4b5fd" />
          </g>

          <!-- 2. Topi Penyihir Mini Pastel (Witch Hat) -->
          <g v-else-if="equippedAccessory === 'witch-hat'">
            <!-- Pinggiran topi -->
            <ellipse cx="110" cy="60" rx="34" ry="8.5" fill="#4c1d95" stroke="#c4b5fd" stroke-width="2" />
            <!-- Kerucut topi penyihir miring lucu -->
            <path
              d="M86 59 L106 18 C109 12, 118 14, 124 23 L134 59 Z"
              fill="#5b21b6"
              stroke="#c4b5fd"
              stroke-width="2"
              stroke-linejoin="round"
            />
            <!-- Pita pink pastel + gesper bintang emas -->
            <path d="M89 53 Q110 59 131 53 L133 58 Q110 64 87 58 Z" fill="#f9a8d4" />
            <path
              d="M110 50 L111.8 54.4 L116.5 55 L113 58.1 L114 62.6 L110 60.2 L106 62.6 L107 58.1 L103.5 55 L108.2 54.4 Z"
              fill="#fde68a"
            />
          </g>

          <!-- 3. 🌱 Tunas Daun Hijau Lucu di atas kepala -->
          <g v-else-if="equippedAccessory === 'leaf-sprout'">
            <path d="M110 66 Q109 48 111 36" stroke="#4ade80" stroke-width="3.6" stroke-linecap="round" />
            <path
              d="M110 46 C94 42, 86 30, 94 23 C104 20, 110 32, 110 46 Z"
              fill="#4ade80"
              stroke="#dcfce7"
              stroke-width="1.6"
              stroke-linejoin="round"
            />
            <path
              d="M111 42 C125 35, 134 24, 127 18 C117 16, 111 28, 111 42 Z"
              fill="#22c55e"
              stroke="#dcfce7"
              stroke-width="1.6"
              stroke-linejoin="round"
            />
            <path d="M97 29 Q104 35 109 43" stroke="#bbf7d0" stroke-width="1.4" stroke-linecap="round" />
            <path d="M124 24 Q118 31 112 39" stroke="#bbf7d0" stroke-width="1.4" stroke-linecap="round" />
          </g>

          <!-- 4. 📖 Buku Terbuka (halaman krem & sampul ungu-emas) bertengger di atas kepala -->
          <g v-else-if="equippedAccessory === 'open-book'" transform="translate(110, 50)">
            <!-- Sampul ungu-emas -->
            <path
              d="M-34 6 Q-18 -12 0 1 Q18 -12 34 6 L31 14 Q16 0 0 11 Q-16 0 -31 14 Z"
              fill="#5b21b6"
              stroke="#fde68a"
              stroke-width="2"
              stroke-linejoin="round"
            />
            <!-- Halaman krem kiri & kanan -->
            <path
              d="M-30 5 Q-16 -14 0 -1 L0 8 Q-15 -3 -28 10 Z"
              fill="#fffbeb"
              stroke="#f59e0b"
              stroke-width="1.2"
              stroke-linejoin="round"
            />
            <path
              d="M30 5 Q16 -14 0 -1 L0 8 Q15 -3 28 10 Z"
              fill="#fef3c7"
              stroke="#f59e0b"
              stroke-width="1.2"
              stroke-linejoin="round"
            />
            <!-- Garis tulisan mungil & pita pembatas -->
            <path d="M-22 1 Q-13 -5 -6 -1" stroke="#a78bfa" stroke-width="1.3" stroke-linecap="round" />
            <path d="M6 -1 Q13 -5 22 1" stroke="#f472b6" stroke-width="1.3" stroke-linecap="round" />
            <path d="M0 8 L-2 17 L0 15 L2 17 Z" fill="#f472b6" />
          </g>

          <!-- 5. 🎨 Topi Baret Miring (krem / ungu pastel) -->
          <g v-else-if="equippedAccessory === 'beret-hat'" transform="translate(110, 54) rotate(-9)">
            <ellipse cx="0" cy="4" rx="34" ry="15" fill="#ddd6fe" stroke="#ffffff" stroke-width="2" />
            <path d="M-32 8 Q0 18 32 8" stroke="#a78bfa" stroke-width="4.5" stroke-linecap="round" />
            <path d="M-2 -10 Q2 -18 7 -15" stroke="#8b5cf6" stroke-width="3.2" stroke-linecap="round" />
            <circle cx="-18" cy="2" r="3.2" fill="#fde68a" stroke="#ffffff" stroke-width="1" />
          </g>

          <!-- 6. 😇 Halo Bintang (cincin cahaya emas lembut melayang di atas kepala) -->
          <g v-else-if="equippedAccessory === 'star-halo'">
            <ellipse
              cx="110"
              cy="34"
              rx="32"
              ry="9"
              stroke="#fef08a"
              stroke-width="6.5"
              opacity="0.35"
            />
            <ellipse
              cx="110"
              cy="34"
              rx="30"
              ry="8"
              stroke="#fde047"
              stroke-width="3.4"
            />
            <ellipse
              cx="110"
              cy="34"
              rx="30"
              ry="8"
              stroke="#ffffff"
              stroke-width="1.2"
              opacity="0.85"
            />
            <path d="M74 28 L75.6 31.8 L79.5 33.4 L75.6 35 L74 38.8 L72.4 35 L68.5 33.4 L72.4 31.8 Z" fill="#fef08a" />
            <path d="M146 26 L147.4 29.4 L150.8 30.8 L147.4 32.2 L146 35.6 L144.6 32.2 L141.2 30.8 L144.6 29.4 Z" fill="#fbcfe8" />
          </g>

          <!-- Band Headphone Atas (berkilau neon pastel ekstra saat 🎧 Headphone Lo-Fi dipakai) -->
          <path
            d="M46 112 C46 58, 174 58, 174 112"
            :stroke="equippedAccessory === 'lofi-headphones' ? '#c084fc' : '#f9a8d4'"
            :stroke-width="equippedAccessory === 'lofi-headphones' ? '15' : '13'"
            stroke-linecap="round"
          />
          <path
            d="M52 106 C56 66, 164 66, 168 106"
            :stroke="equippedAccessory === 'lofi-headphones' ? '#f9a8d4' : '#fdf2f8'"
            :stroke-width="equippedAccessory === 'lofi-headphones' ? '4.5' : '3'"
            stroke-linecap="round"
            :opacity="equippedAccessory === 'lofi-headphones' ? '0.92' : '0.55'"
          />

          <!-- Tubuh kecil kucing -->
          <path
            d="M72 174 C72 150, 148 150, 148 174 L152 192 C136 198, 84 198, 68 192 Z"
            fill="#f5ecff"
          />
          <!-- Aksesoris Leher: 🧣 Syal Rajut / 💖 Kalung Hati Bintang / Syal Default -->
          <g v-if="equippedAccessory === 'knit-scarf'">
            <!-- Syal rajut hangat bergaris krem & rose -->
            <path
              d="M73 153 Q110 174 147 153 Q145 170 110 176 Q75 170 73 153 Z"
              fill="#fb7185"
              stroke="#ffe4e6"
              stroke-width="1.6"
              stroke-linejoin="round"
            />
            <path d="M88 161 L84 171 M102 165 L100 175 M118 165 L120 175 M132 161 L136 171" stroke="#fef3c7" stroke-width="2.4" stroke-linecap="round" />
            <!-- Ekor syal menggantung di kanan -->
            <path
              d="M126 164 L139 162 L143 189 L128 190 Z"
              fill="#f43f5e"
              stroke="#ffe4e6"
              stroke-width="1.4"
              stroke-linejoin="round"
            />
            <line x1="128" y1="175" x2="141" y2="174" stroke="#fef3c7" stroke-width="2.4" />
            <line x1="129" y1="183" x2="142" y2="182" stroke="#fef3c7" stroke-width="2.4" />
          </g>
          <g v-else-if="equippedAccessory === 'soulmate-collar'">
            <!-- 💖 Kalung Hati Bintang (Milestone Lv. 10) -->
            <path
              d="M76 155 Q110 173 144 155 Q140 167 110 173 Q80 167 76 155 Z"
              fill="#ec4899"
              stroke="#fde68a"
              stroke-width="1.6"
            />
            <!-- Liontin hati bersinar + bintang emas -->
            <path
              d="M110 183 C101 177, 98 169, 104 166 C107 164.5, 109.5 166.5, 110 168.5 C110.5 166.5, 113 164.5, 116 166 C122 169, 119 177, 110 183 Z"
              fill="#f9a8d4"
              stroke="#fef08a"
              stroke-width="1.8"
            />
            <path d="M110 169 L111.2 172 L114.2 173.2 L111.2 174.4 L110 177.4 L108.8 174.4 L105.8 173.2 L108.8 172 Z" fill="#fef08a" />
          </g>
          <g v-else>
            <!-- Syal pastel bawaan -->
            <path
              d="M79 156 Q110 172 141 156 Q137 167 110 172 Q83 167 79 156 Z"
              fill="#c4b5fd"
            />
            <circle cx="110" cy="169" r="5" fill="#fde68a" />
          </g>

          <!-- Telinga Kiri & Kanan -->
          <path
            d="M66 96 L58 58 L93 78 Z"
            fill="#fff7fb"
            stroke="#e9d5ff"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <path d="M68 90 L64 67 L85 79 Z" fill="#fbcfe8" />

          <path
            d="M154 96 L162 58 L127 78 Z"
            fill="#fff7fb"
            stroke="#e9d5ff"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <path d="M152 90 L156 67 L135 79 Z" fill="#fbcfe8" />

          <!-- Kepala Kucing Bulat -->
          <ellipse cx="110" cy="116" rx="54" ry="47" fill="#fff7fb" />

          <!-- Garis dahi lembut -->
          <path d="M110 71 V81" stroke="#e9d5ff" stroke-width="4" stroke-linecap="round" />
          <path d="M99 73 L102 82" stroke="#e9d5ff" stroke-width="3.5" stroke-linecap="round" />
          <path d="M121 73 L118 82" stroke="#e9d5ff" stroke-width="3.5" stroke-linecap="round" />

          <!-- 3. Aksesori Pita Pink Kawaii di dekat telinga kiri kucing -->
          <g v-if="equippedAccessory === 'pink-bow'" transform="translate(76, 76) rotate(-18)">
            <path
              d="M0 0 C-14 -12, -20 4, -2 6 Z"
              fill="#f9a8d4"
              stroke="#ffffff"
              stroke-width="1.6"
              stroke-linejoin="round"
            />
            <path
              d="M0 0 C14 -12, 20 4, 2 6 Z"
              fill="#f472b6"
              stroke="#ffffff"
              stroke-width="1.6"
              stroke-linejoin="round"
            />
            <circle cx="0" cy="2" r="4.2" fill="#fdf2f8" stroke="#f472b6" stroke-width="1.5" />
          </g>

          <!-- Earcup Headphone Kiri & Kanan (cahaya pastel lo-fi ekstra saat 🎧 Headphone Lo-Fi dipakai) -->
          <rect
            x="38"
            y="96"
            width="22"
            height="42"
            rx="11"
            :fill="equippedAccessory === 'lofi-headphones' ? '#9333ea' : '#c084fc'"
            :stroke="equippedAccessory === 'lofi-headphones' ? '#f9a8d4' : 'none'"
            :stroke-width="equippedAccessory === 'lofi-headphones' ? '2.2' : '0'"
          />
          <rect
            x="44"
            y="101"
            width="14"
            height="32"
            rx="7"
            :fill="equippedAccessory === 'lofi-headphones' ? '#f472b6' : '#f9a8d4'"
          />
          <circle cx="49" cy="117" :r="equippedAccessory === 'lofi-headphones' ? '5' : '4'" :fill="equippedAccessory === 'lofi-headphones' ? '#67e8f9' : '#fef9c3'" />

          <rect
            x="160"
            y="96"
            width="22"
            height="42"
            rx="11"
            :fill="equippedAccessory === 'lofi-headphones' ? '#9333ea' : '#c084fc'"
            :stroke="equippedAccessory === 'lofi-headphones' ? '#f9a8d4' : 'none'"
            :stroke-width="equippedAccessory === 'lofi-headphones' ? '2.2' : '0'"
          />
          <rect
            x="162"
            y="101"
            width="14"
            height="32"
            rx="7"
            :fill="equippedAccessory === 'lofi-headphones' ? '#f472b6' : '#f9a8d4'"
          />
          <circle cx="171" cy="117" :r="equippedAccessory === 'lofi-headphones' ? '5' : '4'" :fill="equippedAccessory === 'lofi-headphones' ? '#67e8f9' : '#fef9c3'" />

          <!-- EKSPRESI MATA DINAMIS KUCING UTAMA -->
          <!-- 1. Saat Diklik (Variasi A): Mata Bintang Berbinar (★ ω ★) -->
          <g v-if="activeFaceMode === 'click-star'">
            <path
              d="M90 105 L92.6 111.2 L99.2 111.8 L94.2 116.2 L95.7 122.7 L90 119.2 L84.3 122.7 L85.8 116.2 L80.8 111.8 L87.4 111.2 Z"
              fill="#f59e0b"
              stroke="#3b215c"
              stroke-width="1.4"
              stroke-linejoin="round"
            />
            <path
              d="M130 105 L132.6 111.2 L139.2 111.8 L134.2 116.2 L135.7 122.7 L130 119.2 L124.3 122.7 L125.8 116.2 L120.8 111.8 L127.4 111.2 Z"
              fill="#f59e0b"
              stroke="#3b215c"
              stroke-width="1.4"
              stroke-linejoin="round"
            />
            <circle cx="88.5" cy="112" r="1.6" fill="#ffffff" />
            <circle cx="128.5" cy="112" r="1.6" fill="#ffffff" />
          </g>

          <!-- 2. Saat Diklik (Variasi B) / Happy / Celebrate: Mata melengkung ceria (^ ^) -->
          <g v-else-if="activeFaceMode === 'click-cheer' || activeFaceMode === 'happy' || activeFaceMode === 'celebrate'">
            <path
              d="M81 116 Q90 104 99 116"
              stroke="#3b215c"
              stroke-width="3.6"
              stroke-linecap="round"
            />
            <path
              d="M121 116 Q130 104 139 116"
              stroke="#3b215c"
              stroke-width="3.6"
              stroke-linecap="round"
            />
          </g>

          <!-- 3. Sedang Di-Pet-Pet Nyaman atau Idle Menikmati Musik (˘ ◡ ˘) -->
          <g v-else-if="activeFaceMode === 'petted' || activeFaceMode === 'music'">
            <path
              d="M82 113 Q90 120 98 113"
              stroke="#3b215c"
              stroke-width="3.3"
              stroke-linecap="round"
            />
            <path
              d="M122 113 Q130 120 138 113"
              stroke="#3b215c"
              stroke-width="3.3"
              stroke-linecap="round"
            />
          </g>

          <!-- 4. Idle Variasi Penasaran Menoleh (◕ ω ◕) -->
          <g v-else-if="activeFaceMode === 'curious'" class="animate-cat-blink">
            <circle cx="93" cy="113" r="7.2" fill="#3b215c" />
            <circle cx="95.2" cy="110.5" r="2.5" fill="#ffffff" />
            <circle cx="90.5" cy="115.8" r="1.2" fill="#ffffff" />

            <circle cx="133" cy="113" r="7.2" fill="#3b215c" />
            <circle cx="135.2" cy="110.5" r="2.5" fill="#ffffff" />
            <circle cx="130.5" cy="115.8" r="1.2" fill="#ffffff" />
          </g>

          <!-- 4b. Fokus Co-Working: Mata serius berkonsentrasi menatap buku & laptop -->
          <g v-else-if="activeFaceMode === 'focus-serious'">
            <path d="M81 103 L98 106" stroke="#4c1d95" stroke-width="2.4" stroke-linecap="round" />
            <path d="M139 103 L122 106" stroke="#4c1d95" stroke-width="2.4" stroke-linecap="round" />
            <circle cx="90" cy="115" r="6.2" fill="#3b215c" />
            <circle cx="88.5" cy="113" r="2" fill="#ffffff" />
            <circle cx="130" cy="115" r="6.2" fill="#3b215c" />
            <circle cx="128.5" cy="113" r="2" fill="#ffffff" />
          </g>

          <!-- 5. Idle Tenang Tersenyum (• ᴗ •) / Focus / Reminder: Mata bulat berbinar berkedip alami -->
          <g v-else class="animate-cat-blink">
            <circle cx="90" cy="114" r="6.5" fill="#3b215c" />
            <circle cx="88" cy="111.5" r="2.2" fill="#ffffff" />
            <circle cx="92.5" cy="116" r="1.1" fill="#ffffff" />

            <circle cx="130" cy="114" r="6.5" fill="#3b215c" />
            <circle cx="128" cy="111.5" r="2.2" fill="#ffffff" />
            <circle cx="132.5" cy="116" r="1.1" fill="#ffffff" />
          </g>

          <!-- KACAMATA BULAT (toko 👓 Kacamata Bulat) ATAU KACAMATA FOKUS (saat Pomodoro / BGM aktif) -->
          <g v-if="equippedAccessory === 'round-glasses'">
            <circle cx="90" cy="114" r="14.5" fill="rgba(255,251,235,0.24)" stroke="#f59e0b" stroke-width="2.4" />
            <circle cx="130" cy="114" r="14.5" fill="rgba(255,251,235,0.24)" stroke="#f59e0b" stroke-width="2.4" />
            <path d="M104.5 114 Q110 111 115.5 114" stroke="#f59e0b" stroke-width="2.4" stroke-linecap="round" />
            <line x1="65" y1="112" x2="75.5" y2="113.5" stroke="#f59e0b" stroke-width="2.2" />
            <line x1="144.5" y1="113.5" x2="155" y2="112" stroke="#f59e0b" stroke-width="2.2" />
            <path d="M82 106 Q86 103 90 105" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity="0.7" />
            <path d="M122 106 Q126 103 130 105" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity="0.7" />
          </g>
          <g v-else-if="currentMascotMood === 'focus'">
            <circle
              cx="90"
              cy="114"
              r="14"
              fill="rgba(255,255,255,0.22)"
              stroke="#a78bfa"
              stroke-width="3"
            />
            <circle
              cx="130"
              cy="114"
              r="14"
              fill="rgba(255,255,255,0.22)"
              stroke="#a78bfa"
              stroke-width="3"
            />
            <line x1="104" y1="114" x2="116" y2="114" stroke="#a78bfa" stroke-width="3" />
            <line x1="65" y1="111" x2="76" y2="113" stroke="#a78bfa" stroke-width="2.5" />
            <line x1="144" y1="113" x2="155" y2="111" stroke="#a78bfa" stroke-width="2.5" />
          </g>

          <!-- Pipi Merona Pink Pastel (makin cerah saat dielus / diklik / menyemangati) -->
          <ellipse
            cx="76"
            cy="126"
            rx="10"
            ry="6"
            fill="#f9a8d4"
            :opacity="
              activeFaceMode === 'petted' ||
              activeFaceMode === 'click-star' ||
              activeFaceMode === 'click-cheer' ||
              currentMascotMood === 'happy' ||
              currentMascotMood === 'celebrate'
                ? 0.96
                : 0.6
            "
          />
          <ellipse
            cx="144"
            cy="126"
            rx="10"
            ry="6"
            fill="#f9a8d4"
            :opacity="
              activeFaceMode === 'petted' ||
              activeFaceMode === 'click-star' ||
              activeFaceMode === 'click-cheer' ||
              currentMascotMood === 'happy' ||
              currentMascotMood === 'celebrate'
                ? 0.96
                : 0.6
            "
          />

          <!-- Hidung & Mulut Dinamis -->
          <path d="M107 122 L113 122 L110 126 Z" fill="#f472b6" />
          <!-- Mulut ceria terbuka (^ o ^) saat diklik menyemangati atau selebrasi -->
          <ellipse
            v-if="activeFaceMode === 'click-cheer'"
            cx="110"
            cy="133"
            rx="5.5"
            ry="6.5"
            fill="#f472b6"
            stroke="#3b215c"
            stroke-width="2.2"
          />
          <path
            v-else-if="currentMascotMood === 'celebrate'"
            d="M101 129 Q110 142 119 129 Z"
            fill="#f472b6"
            stroke="#3b215c"
            stroke-width="2.2"
            stroke-linejoin="round"
          />
          <!-- Mulut senyum nyaman (◡) saat di-pet-pet atau menikmati musik -->
          <path
            v-else-if="activeFaceMode === 'petted' || activeFaceMode === 'music'"
            d="M103 130 Q110 137.5 117 130"
            stroke="#3b215c"
            stroke-width="2.7"
            stroke-linecap="round"
          />
          <!-- Mulut kucing klasik (ω) untuk tenang, penasaran & bintang berbinar -->
          <path
            v-else
            d="M101 130 Q105.5 135 110 129 Q114.5 135 119 130"
            stroke="#3b215c"
            stroke-width="2.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- Kumis Halus -->
          <path d="M64 122 L53 120" stroke="#c4b5fd" stroke-width="2.2" stroke-linecap="round" />
          <path d="M65 129 L54 131" stroke="#c4b5fd" stroke-width="2.2" stroke-linecap="round" />
          <path d="M156 122 L167 120" stroke="#c4b5fd" stroke-width="2.2" stroke-linecap="round" />
          <path d="M155 129 L166 131" stroke="#c4b5fd" stroke-width="2.2" stroke-linecap="round" />

          <!-- CO-WORKING BODY DOUBLING: Meja Kayu Belajar (Focus) / Meja Teh & Ikan Bakar (Break) / Pose Siaga Biasa -->
          <!-- A. Mode FOKUS: Meja kayu kecil + buku catatan terbuka + laptop mini menyala + cakar mengetik pelan -->
          <g v-if="coWorkingState === 'focus'">
            <!-- Papan meja kayu estetik hangat -->
            <rect x="20" y="176" width="180" height="16" rx="7" fill="#a47148" stroke="#6f4518" stroke-width="2" />
            <rect x="24" y="178" width="172" height="5" rx="2.5" fill="#d4a373" opacity="0.65" />
            <rect x="34" y="192" width="10" height="20" rx="4" fill="#7f5539" />
            <rect x="176" y="192" width="10" height="20" rx="4" fill="#7f5539" />

            <!-- Buku catatan terbuka di kiri meja -->
            <g transform="translate(32, 161)">
              <path d="M0 15 L22 12 L22 0 L2 3 Z" fill="#fffbeb" stroke="#d97706" stroke-width="1.3" stroke-linejoin="round" />
              <path d="M44 15 L22 12 L22 0 L42 3 Z" fill="#fef3c7" stroke="#d97706" stroke-width="1.3" stroke-linejoin="round" />
              <line x1="6" y1="6" x2="18" y2="5" stroke="#a78bfa" stroke-width="1.2" stroke-linecap="round" />
              <line x1="6" y1="10" x2="18" y2="9" stroke="#a78bfa" stroke-width="1.2" stroke-linecap="round" />
              <line x1="26" y1="5" x2="38" y2="6" stroke="#f472b6" stroke-width="1.2" stroke-linecap="round" />
              <line x1="26" y1="9" x2="36" y2="10" stroke="#f472b6" stroke-width="1.2" stroke-linecap="round" />
              <!-- Pita pembatas buku pink -->
              <path d="M22 12 L20 20 L22 18 L24 20 Z" fill="#f472b6" />
            </g>

            <!-- Laptop mini menyala di kanan-tengah meja -->
            <g transform="translate(106, 146)">
              <!-- Pendar cahaya layar laptop -->
              <ellipse cx="32" cy="14" rx="34" ry="18" fill="#bae6fd" opacity="0.22" />
              <!-- Cangkang & layar laptop -->
              <rect x="6" y="0" width="52" height="30" rx="4.5" fill="#4c1d95" stroke="#e9d5ff" stroke-width="1.6" />
              <rect x="10" y="3.5" width="44" height="22" rx="2.5" fill="#e0f2fe" />
              <!-- Ikon bintang & garis catatan di layar menyala -->
              <path d="M32 7 L33.4 10.6 L37 12 L33.4 13.4 L32 17 L30.6 13.4 L27 12 L30.6 10.6 Z" fill="#f472b6" />
              <line x1="15" y1="21" x2="49" y2="21" stroke="#818cf8" stroke-width="1.8" stroke-linecap="round" opacity="0.7" />
              <!-- Keyboard base -->
              <path d="M2 30 H62 L66 34 H-2 Z" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.2" stroke-linejoin="round" />
            </g>

            <!-- Kedua cakar mungil Kucing Putih sedang mengetik pelan -->
            <g class="animate-cat-typing-left">
              <ellipse cx="116" cy="176" rx="9" ry="6.2" fill="#fff7fb" stroke="#e9d5ff" stroke-width="1.5" />
              <circle cx="116" cy="175" r="2.2" fill="#fbcfe8" />
            </g>
            <g class="animate-cat-typing-right">
              <ellipse cx="144" cy="176" rx="9" ry="6.2" fill="#fff7fb" stroke="#e9d5ff" stroke-width="1.5" />
              <circle cx="144" cy="175" r="2.2" fill="#fbcfe8" />
            </g>
          </g>

          <!-- B. Mode ISTIRAHAT (Break): Meja kayu + cangkir teh/kopi hangat berasap + piring ikan bakar -->
          <g v-else-if="coWorkingState === 'break'">
            <!-- Papan meja kayu estetik hangat -->
            <rect x="20" y="176" width="180" height="16" rx="7" fill="#a47148" stroke="#6f4518" stroke-width="2" />
            <rect x="24" y="178" width="172" height="5" rx="2.5" fill="#d4a373" opacity="0.65" />
            <rect x="34" y="192" width="10" height="20" rx="4" fill="#7f5539" />
            <rect x="176" y="192" width="10" height="20" rx="4" fill="#7f5539" />

            <!-- Secangkir Teh / Kopi Hangat Berasap di kiri meja -->
            <g transform="translate(46, 152)">
              <!-- 3 Uap hangat melayang naik -->
              <path
                class="animate-steam-rise"
                style="--steam-delay: 0s"
                d="M9 -2 Q6 -8 9 -14"
                stroke="#fdf2f8"
                stroke-width="2"
                stroke-linecap="round"
              />
              <path
                class="animate-steam-rise"
                style="--steam-delay: 0.6s"
                d="M16 -4 Q19 -10 16 -16"
                stroke="#fde68a"
                stroke-width="2"
                stroke-linecap="round"
              />
              <path
                class="animate-steam-rise"
                style="--steam-delay: 1.2s"
                d="M23 -2 Q20 -8 23 -14"
                stroke="#fdf2f8"
                stroke-width="1.8"
                stroke-linecap="round"
              />
              <!-- Gagang cangkir -->
              <path d="M30 8 C37 8, 37 19, 30 19" stroke="#f9a8d4" stroke-width="3" fill="none" stroke-linecap="round" />
              <!-- Badan cangkir pastel -->
              <path d="M2 4 H30 L27 24 C26 26, 6 26, 5 24 Z" fill="#fbcfe8" stroke="#f472b6" stroke-width="1.4" />
              <ellipse cx="16" cy="5" rx="13" ry="3.2" fill="#92400e" />
              <path d="M13 13 L16 16 L19 13" stroke="#ec4899" stroke-width="1.4" stroke-linecap="round" fill="none" />
            </g>

            <!-- Piring kecil berisi ikan bakar keemasan di kanan meja -->
            <g transform="translate(114, 158)">
              <!-- Piring putih pastel -->
              <ellipse cx="32" cy="17" rx="30" ry="7.5" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" />
              <ellipse cx="32" cy="16" rx="22" ry="4.5" fill="#f1f5f9" />
              <!-- Ikan bakar hangat -->
              <ellipse cx="29" cy="13" rx="16" ry="6.5" fill="#f59e0b" stroke="#92400e" stroke-width="1.4" />
              <path d="M44 13 L54 7 L52 13 L54 19 Z" fill="#d97706" stroke="#92400e" stroke-width="1.2" stroke-linejoin="round" />
              <!-- Garis panggangan ikan -->
              <path d="M23 9 L26 17 M29 8.5 L32 17.5 M35 9.5 L37.5 16.5" stroke="#78350f" stroke-width="1.4" stroke-linecap="round" />
              <circle cx="19" cy="12" r="1.4" fill="#451a03" />
              <!-- Hiasan daun kecil segar -->
              <ellipse cx="13" cy="16" rx="4" ry="2.2" transform="rotate(-20 13 16)" fill="#4ade80" />
            </g>

            <!-- Cakar rileks bertumpu di tepi meja -->
            <ellipse cx="94" cy="177" rx="9.5" ry="6.5" fill="#fff7fb" stroke="#e9d5ff" stroke-width="1.5" />
            <ellipse cx="114" cy="177" rx="9.5" ry="6.5" fill="#fff7fb" stroke="#e9d5ff" stroke-width="1.5" />
          </g>

          <!-- C. Mode IDLE / PAUSED: Pose siaga ramah seperti biasa tanpa meja kerja -->
          <g v-else>
            <ellipse cx="88" cy="176" rx="11" ry="8" fill="#fff7fb" stroke="#e9d5ff" stroke-width="1.5" />

            <g
              v-if="currentMascotMood === 'reminder' || currentMascotMood === 'celebrate'"
              class="animate-paw-wave"
            >
              <ellipse
                cx="154"
                cy="154"
                rx="10"
                ry="13"
                transform="rotate(24 154 154)"
                fill="#fff7fb"
                stroke="#e9d5ff"
                stroke-width="1.8"
              />
              <circle cx="154" cy="151" r="3" fill="#fbcfe8" />
            </g>
            <ellipse
              v-else
              cx="132"
              cy="176"
              rx="11"
              ry="8"
              fill="#fff7fb"
              stroke="#e9d5ff"
              stroke-width="1.5"
            />
          </g>

          <defs>
            <radialGradient
              id="twilightCatAura"
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(110 116) rotate(90) scale(76)"
            >
              <stop stop-color="#f9a8d4" stop-opacity="0.34" />
              <stop offset="1" stop-color="#c084fc" stop-opacity="0.04" />
            </radialGradient>
          </defs>
        </svg>
      </div>
    </button>

    <!-- Label kecil status maskot -->
    <span class="mt-0.5 text-[11px] font-semibold text-purple-200/80">
      {{ moodBadgeLabel }}
    </span>
  </div>
</template>
