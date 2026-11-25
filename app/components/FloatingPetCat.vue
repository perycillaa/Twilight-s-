<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { getCatMascotThemePalette } from '~/composables/useCatThemeStyle'
import { useSoundEffects } from '~/composables/useSoundEffects'
import { VIBRATION_PATTERNS, useTwilightStorage } from '~/composables/useTwilightStorage'

const props = withDefaults(
  defineProps<{
    inlineMode?: boolean
  }>(),
  {
    inlineMode: false,
  },
)

const {
  theme,
  activeCozyTheme,
  graphicsQuality,
  isPomodoroRunning,
  activeTimerMode,
  isImmersiveZenOpen,
  isMasterAudioMuted,
  masterAudioVolume,
  treatCoins,
  equippedAccessory,
  feedPetCat,
  addCatAffinityXp,
  triggerVibration,
} = useTwilightStorage()

const catStyle = computed(() => getCatMascotThemePalette(activeCozyTheme.value, theme.value))
const showSpecialEffects = computed<boolean>(() => graphicsQuality.value !== 'low')

// Status Co-Working Body Doubling Kucing Mini: ikut fokus ('focus'), santai istirahat ('break'), atau idle
const coWorkingMode = computed<'focus' | 'break' | 'idle'>(() => {
  if (!isPomodoroRunning.value) return 'idle'
  return activeTimerMode.value === 'focus' ? 'focus' : 'break'
})
const {
  playMiniCatTapMew,
  playMiniCatShakeVoice,
  playMiniCatAnnoyedGrowl,
  startCatPurr,
  stopCatPurr,
} = useSoundEffects()

// Daftar emote acak saat anak kucing diklik (baru bangun kaget imut)
const CLICK_EMOTES = ['mew~ 💖', 'mrrp? ✨', '🐟', '😺', '🎵']
const FOCUS_EMOTES = ['📖', '🎧']

// Partikel hati ♥ / ✨ kecil melayang naik saat di-pet-pet / dielus
interface MiniPetHeart {
  id: number
  symbol: string
  left: string
  top: string
  hx: string
}

// State posisi & visibilitas anak kucing (fixed z-40 agar tidak merusak grid utama)
const posX = ref<number>(20)
const posY = ref<number>(20)
const isPositioned = ref<boolean>(false)
const isHidden = ref<boolean>(false)

// State interaksi & ekspresi dinamis Kucing Mini:
// - Idle default: tertidur/mengantuk pulas (- ᴗ -) dengan gelembung 💤
// - Di-pet-pet / Dielus: kursor tangan memantul 🖐️ + purring hangat + wajah nyaman (˘ ◡ ˘) + hati ♥
// - Diklik: mata terbuka lebar kaget menggemaskan (O ω O / ◕ ᴥ ◕) selama ~1.5 detik
// - Digoyang cepat: wajah kesal/protes (ò ω ó / > < + 💢 / 💫) + suara protes meow-growl -> cemberut (- ︵ -) 1 detik
const isDragging = ref<boolean>(false)
const isHoveringMiniCat = ref<boolean>(false)
const isBeingPetted = ref<boolean>(false)
const handLocalX = ref<number>(42)
const handLocalY = ref<number>(22)
const headLeanDeg = ref<number>(0)
const petHearts = ref<MiniPetHeart[]>([])

const isHopping = ref<boolean>(false)
const isAnnoyedShaking = ref<boolean>(false)
const annoyedVariant = ref<'grumpy' | 'squint'>('grumpy')
const isPouting = ref<boolean>(false)
const isStartledAwake = ref<boolean>(false)
const startledVariant = ref<'wide' | 'sparkle'>('wide')
const isSmugSatisfied = ref<boolean>(false)
const isEating = ref<boolean>(false)
const isSleeping = ref<boolean>(true)
const showFeedPrompt = ref<boolean>(false)
const activeEmote = ref<string>('')

// Variabel internal drag, kecepatan guncangan (velocity), & elusan (headpat)
let dragOffsetX = 0
let dragOffsetY = 0
let startClientX = 0
let startClientY = 0
let hasDraggedBeyondThreshold = false
let wasAnnoyedDuringDrag = false

let lastMoveX = 0
let lastMoveY = 0
let lastMoveTime = 0
let lastDirection = 0 // -1 = kiri, 1 = kanan
let shakeTurnTimestamps: number[] = []

let lastHoverX = 0
let lastHoverY = 0
let hoverRubDist = 0
let lastHeartSpawnAt = 0
let petHeartCounter = 0

let lastInteractionAt = Date.now()
let idleCheckInterval: ReturnType<typeof setInterval> | null = null
let emoteTimer: ReturnType<typeof setTimeout> | null = null
let annoyedTimer: ReturnType<typeof setTimeout> | null = null
let poutTimer: ReturnType<typeof setTimeout> | null = null
let hopTimer: ReturnType<typeof setTimeout> | null = null
let startledTimer: ReturnType<typeof setTimeout> | null = null
let smugTimer: ReturnType<typeof setTimeout> | null = null
let petIdleStopTimer: ReturnType<typeof setTimeout> | null = null
let eatTimer: ReturnType<typeof setTimeout> | null = null
let feedPromptTimer: ReturnType<typeof setTimeout> | null = null

const CAT_SIZE = 86

function getEffectiveCatVolume(): number {
  return isMasterAudioMuted.value ? 0 : masterAudioVolume.value
}

// Patuh terhadap tombol mute/volume utama saat sedang mendengkur (purring)
watch([isMasterAudioMuted, masterAudioVolume], () => {
  if (!isBeingPetted.value) return
  const vol = getEffectiveCatVolume()
  if (vol <= 0.005) {
    stopCatPurr()
  } else {
    startCatPurr(vol)
  }
})

// Emote yang ditampilkan di atas kepala anak kucing berdasarkan kondisi saat ini
const displayedEmote = computed<string>(() => {
  if (isEating.value) return '💖'
  if (isAnnoyedShaking.value) return annoyedVariant.value === 'grumpy' ? '💢' : '💫'
  if (isPouting.value) return '💢'
  if (isBeingPetted.value) return 'Purr~ ♥'
  if (isDragging.value && hasDraggedBeyondThreshold) return '💫'
  if (isSmugSatisfied.value) return '💕'
  if (activeEmote.value) return activeEmote.value
  if (coWorkingMode.value === 'focus') return '📖 Fokus...'
  if (coWorkingMode.value === 'break') return '☕ Santai~ ♪'
  if (isSleeping.value) return '💤'
  return ''
})

// Kelas animasi tubuh anak kucing
const bodyAnimationClass = computed<string>(() => {
  if (isEating.value) return 'animate-pet-eat'
  if (isAnnoyedShaking.value) return 'animate-pet-shake'
  if (isBeingPetted.value) return ''
  if (isHopping.value) return 'animate-pet-hop'
  if (isSleeping.value) return 'animate-pet-sleep'
  return 'animate-float-slow'
})

/** Jaga agar posisi kucing selalu berada di dalam area layar browser */
function clampPosition(x: number, y: number): { x: number; y: number } {
  if (!import.meta.client) return { x, y }
  const pad = 10
  const maxX = Math.max(pad, window.innerWidth - CAT_SIZE - pad)
  const maxY = Math.max(pad, window.innerHeight - CAT_SIZE - pad)
  return {
    x: Math.min(Math.max(pad, x), maxX),
    y: Math.min(Math.max(pad, y), maxY),
  }
}

/** Catat interaksi terbaru agar kucing bangun dari tidur */
function markInteraction() {
  lastInteractionAt = Date.now()
  if (isSleeping.value) {
    isSleeping.value = false
  }
}

/** Munculkan gelembung emote sementara di atas kepala kucing */
function showTemporaryEmote(emote: string, durationMs = 1800) {
  activeEmote.value = emote
  if (emoteTimer) clearTimeout(emoteTimer)
  emoteTimer = setTimeout(() => {
    activeEmote.value = ''
  }, durationMs)
}

/** Munculkan hati ♥ / ✨ lembut melayang naik saat anak kucing di-pet-pet */
function spawnMiniPetHeart(xPx: number, yPx: number) {
  const now = Date.now()
  if (now - lastHeartSpawnAt < 340) return
  lastHeartSpawnAt = now

  const id = ++petHeartCounter
  const symbol = id % 3 === 0 ? '✨' : '♥'
  const offsetX = Math.round((Math.random() - 0.5) * 20)
  petHearts.value = [
    ...petHearts.value.slice(-6),
    {
      id,
      symbol,
      left: `${Math.round(xPx)}px`,
      top: `${Math.round(Math.max(4, yPx - 8))}px`,
      hx: `${offsetX}px`,
    },
  ]
  setTimeout(() => {
    petHearts.value = petHearts.value.filter(h => h.id !== id)
  }, 1050)
}

/** Mulai mode pet-pet pada kucing mini: dengkuran hangat, wajah nyaman & +1 XP kasih sayang tiap ~1.5 dtk */
function beginMiniPetting() {
  if (!isBeingPetted.value) {
    triggerVibration(VIBRATION_PATTERNS.microHaptic)
  }
  markInteraction()
  isAnnoyedShaking.value = false
  isPouting.value = false
  isStartledAwake.value = false
  isBeingPetted.value = true
  startCatPurr(getEffectiveCatVolume())
  addCatAffinityXp(1, 'pet')

  if (petIdleStopTimer) clearTimeout(petIdleStopTimer)
  petIdleStopTimer = setTimeout(() => {
    endMiniPetting()
  }, 540)
}

/** Hentikan mode pet-pet & fade-out dengkuran perlahan */
function endMiniPetting() {
  if (petIdleStopTimer) {
    clearTimeout(petIdleStopTimer)
    petIdleStopTimer = null
  }
  if (isBeingPetted.value) {
    isBeingPetted.value = false
    headLeanDeg.value = 0
    stopCatPurr()
  }
  hoverRubDist = 0
}

function handleHoverEnter(event: PointerEvent) {
  if (isDragging.value) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  handLocalX.value = event.clientX - rect.left
  handLocalY.value = event.clientY - rect.top
  lastHoverX = event.clientX
  lastHoverY = event.clientY
  hoverRubDist = 0
  if (event.pointerType === 'mouse') {
    isHoveringMiniCat.value = true
  }
}

function handleHoverMove(event: PointerEvent) {
  if (isDragging.value || event.pointerType !== 'mouse') return
  const target = event.target as HTMLElement | null
  if (target?.closest('[data-pet-action]')) {
    isHoveringMiniCat.value = false
    endMiniPetting()
    return
  }

  isHoveringMiniCat.value = true
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const localX = event.clientX - rect.left
  const localY = event.clientY - rect.top
  handLocalX.value = localX
  handLocalY.value = localY

  const stepDist = Math.hypot(event.clientX - lastHoverX, event.clientY - lastHoverY)
  lastHoverX = event.clientX
  lastHoverY = event.clientY

  if (stepDist > 1.2) {
    hoverRubDist += stepDist
    const normX = Math.max(-1, Math.min(1, (localX / Math.max(1, rect.width) - 0.5) * 2))
    headLeanDeg.value = Math.round(normX * 7)

    if (hoverRubDist >= 20) {
      beginMiniPetting()
      spawnMiniPetHeart(localX, localY)
    }
  }
}

function handleHoverLeave() {
  isHoveringMiniCat.value = false
  endMiniPetting()
}

/** Picu ekspresi senyum manja puas (˘ ︶ ˘) selama 1 detik setelah digeser pelan */
function triggerSatisfiedAfterRelease() {
  isAnnoyedShaking.value = false
  isPouting.value = false
  isStartledAwake.value = false
  isSmugSatisfied.value = true

  if (smugTimer) clearTimeout(smugTimer)
  smugTimer = setTimeout(() => {
    isSmugSatisfied.value = false
    if (!isDragging.value && !isEating.value && !isBeingPetted.value) {
      isSleeping.value = true
    }
  }, 1000)
}

/** Picu ekspresi cemberut lucu (- ︵ -) selama ~1 detik setelah digoyang cepat lalu kembali mengantuk */
function triggerPoutAfterShake() {
  isAnnoyedShaking.value = false
  isSmugSatisfied.value = false
  isStartledAwake.value = false
  isPouting.value = true

  if (poutTimer) clearTimeout(poutTimer)
  poutTimer = setTimeout(() => {
    isPouting.value = false
    if (!isDragging.value && !isEating.value && !isBeingPetted.value) {
      isSleeping.value = true
    }
  }, 1100)
}

/**
 * Reaksi Kesal / Protes saat Kucing Mini Digoyang Cepat:
 * - Ubah ekspresi ke ò ω ó atau > < dengan 💢 / 💫
 * - Bunyikan suara kucing kesal (formant meow protes tajam + soft low growl, cooldown ~0.88 dtk)
 */
function triggerAnnoyedShakeReaction() {
  endMiniPetting()
  wasAnnoyedDuringDrag = true
  annoyedVariant.value = annoyedVariant.value === 'grumpy' ? 'squint' : 'grumpy'
  isAnnoyedShaking.value = true
  isPouting.value = false
  isSmugSatisfied.value = false
  isStartledAwake.value = false
  activeEmote.value = ''

  playMiniCatAnnoyedGrowl(getEffectiveCatVolume(), 880)

  if (annoyedTimer) clearTimeout(annoyedTimer)
  annoyedTimer = setTimeout(() => {
    if (!isDragging.value) {
      triggerPoutAfterShake()
    } else {
      isAnnoyedShaking.value = false
    }
  }, 1200)
}

/** LOGIKA DRAG & DROP (Mulai Menggeser — dinonaktifkan pada inlineMode di Mode Zen agar tetap rapi di panggung) */
function handlePointerDown(event: PointerEvent) {
  if ((event.target as HTMLElement | null)?.closest('[data-pet-action]')) return

  if (props.inlineMode) {
    handlePetClick()
    return
  }

  markInteraction()
  endMiniPetting()
  isHoveringMiniCat.value = false
  isSmugSatisfied.value = false
  isPouting.value = false
  isDragging.value = true
  hasDraggedBeyondThreshold = false
  wasAnnoyedDuringDrag = false

  startClientX = event.clientX
  startClientY = event.clientY
  lastMoveX = event.clientX
  lastMoveY = event.clientY
  lastMoveTime = performance.now()
  lastDirection = 0
  shakeTurnTimestamps = []

  dragOffsetX = event.clientX - posX.value
  dragOffsetY = event.clientY - posY.value

  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
  window.addEventListener('pointercancel', handlePointerUp)
}

/**
 * LOGIKA DRAG & DETEKSI KECEPATAN GUNCANGAN (Fast Shake Velocity Detection):
 * - Hitung velocity (px/ms) & pergantian arah cepat.
 * - Jika digoyang cepat -> reaksi kesal/protes (ò ω ó / > < + 💢/💫 + suara Annoyed Meow-Growl).
 * - Jika digeser pelan -> suara dengkuran / "Mraow~" manja lembut.
 */
function handlePointerMove(event: PointerEvent) {
  if (!isDragging.value) return

  const now = performance.now()
  const dt = Math.max(8, now - lastMoveTime)
  const dx = event.clientX - lastMoveX
  const dy = event.clientY - lastMoveY
  const stepDist = Math.hypot(dx, dy)
  const velocity = stepDist / dt

  const movedDist = Math.hypot(event.clientX - startClientX, event.clientY - startClientY)
  if (movedDist > 6) {
    hasDraggedBeyondThreshold = true
  }

  const clamped = clampPosition(event.clientX - dragOffsetX, event.clientY - dragOffsetY)
  posX.value = clamped.x
  posY.value = clamped.y

  // --- DETEKSI GOYANGAN CEPAT BERBASIS KECEPATAN (VELOCITY) & PERUBAHAN ARAH ---
  if (Math.abs(dx) >= 10) {
    const currentDir = dx > 0 ? 1 : -1
    if (lastDirection !== 0 && currentDir !== lastDirection) {
      shakeTurnTimestamps.push(now)
      shakeTurnTimestamps = shakeTurnTimestamps.filter(t => now - t < 550)

      if (velocity >= 0.95 || shakeTurnTimestamps.length >= 2) {
        shakeTurnTimestamps = []
        triggerAnnoyedShakeReaction()
      }
    }
    lastDirection = currentDir
  }

  if (velocity >= 1.9 && movedDist > 36) {
    triggerAnnoyedShakeReaction()
  } else if (hasDraggedBeyondThreshold && !wasAnnoyedDuringDrag && !isAnnoyedShaking.value) {
    playMiniCatShakeVoice(getEffectiveCatVolume(), 900)
  }

  lastMoveX = event.clientX
  lastMoveY = event.clientY
  lastMoveTime = now
}

/** Selesai drag — tampilkan cemberut (- ︵ -) jika habis digoyang cepat, senyum manja jika digeser pelan, atau klik biasa */
function handlePointerUp() {
  if (!isDragging.value) return
  isDragging.value = false

  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('pointercancel', handlePointerUp)

  if (wasAnnoyedDuringDrag || isAnnoyedShaking.value) {
    if (annoyedTimer) clearTimeout(annoyedTimer)
    triggerPoutAfterShake()
    return
  }

  if (hasDraggedBeyondThreshold) {
    triggerSatisfiedAfterRelease()
    return
  }

  handlePetClick()
}

/** Interaksi Klik Cepat (Tap): bangunkan kucing dengan suara "Mew!" & mata kaget imut (O ω O) */
function handlePetClick() {
  markInteraction()
  isSmugSatisfied.value = false
  isAnnoyedShaking.value = false
  isPouting.value = false
  playMiniCatTapMew(getEffectiveCatVolume())
  triggerVibration(VIBRATION_PATTERNS.microHaptic)
  addCatAffinityXp(1, 'click')

  startledVariant.value = startledVariant.value === 'wide' ? 'sparkle' : 'wide'
  isStartledAwake.value = true
  if (startledTimer) clearTimeout(startledTimer)
  startledTimer = setTimeout(() => {
    isStartledAwake.value = false
  }, 1500)

  isHopping.value = false
  requestAnimationFrame(() => {
    isHopping.value = true
  })

  if (hopTimer) clearTimeout(hopTimer)
  hopTimer = setTimeout(() => {
    isHopping.value = false
  }, 500)

  showFeedPrompt.value = true
  if (feedPromptTimer) clearTimeout(feedPromptTimer)
  feedPromptTimer = setTimeout(() => {
    showFeedPrompt.value = false
  }, 4500)

  const randomEmote = CLICK_EMOTES[Math.floor(Math.random() * CLICK_EMOTES.length)] ?? 'mew~ 💖'
  showTemporaryEmote(randomEmote, 1600)
}

/** Interaksi "Beri Makan Ikan (🐟 5)" */
function handleFeedFish() {
  markInteraction()
  const result = feedPetCat(5)

  if (!result.ok) {
    showTemporaryEmote('🐟 kurang~', 2000)
    return
  }

  playMiniCatTapMew(getEffectiveCatVolume())
  triggerVibration(VIBRATION_PATTERNS.microHaptic)
  isAnnoyedShaking.value = false
  isPouting.value = false
  isStartledAwake.value = false
  isSmugSatisfied.value = false
  isEating.value = true
  showFeedPrompt.value = false

  if (eatTimer) clearTimeout(eatTimer)
  eatTimer = setTimeout(() => {
    isEating.value = false
    triggerSatisfiedAfterRelease()
  }, 2600)
}

function handleResize() {
  const clamped = clampPosition(posX.value, posY.value)
  posX.value = clamped.x
  posY.value = clamped.y
}

watch([isPomodoroRunning, activeTimerMode], ([running]) => {
  if (running) {
    markInteraction()
  }
})

onMounted(() => {
  posX.value = 20
  posY.value = Math.max(20, window.innerHeight - CAT_SIZE - 22)
  isPositioned.value = true
  isSleeping.value = !isPomodoroRunning.value

  window.addEventListener('resize', handleResize)

  idleCheckInterval = setInterval(() => {
    if (
      isPomodoroRunning.value ||
      isDragging.value ||
      isBeingPetted.value ||
      isAnnoyedShaking.value ||
      isPouting.value ||
      isStartledAwake.value ||
      isSmugSatisfied.value ||
      isEating.value ||
      isHidden.value
    ) {
      return
    }
    if (Date.now() - lastInteractionAt > 6500) {
      isSleeping.value = true
    }
  }, 2300)
})

onUnmounted(() => {
  endMiniPetting()
  if (import.meta.client) {
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
    window.removeEventListener('pointercancel', handlePointerUp)
  }
  if (idleCheckInterval) clearInterval(idleCheckInterval)
  if (emoteTimer) clearTimeout(emoteTimer)
  if (annoyedTimer) clearTimeout(annoyedTimer)
  if (poutTimer) clearTimeout(poutTimer)
  if (hopTimer) clearTimeout(hopTimer)
  if (startledTimer) clearTimeout(startledTimer)
  if (smugTimer) clearTimeout(smugTimer)
  if (eatTimer) clearTimeout(eatTimer)
  if (feedPromptTimer) clearTimeout(feedPromptTimer)
})
</script>

<template>
  <!-- Tombol mungil untuk memunculkan kembali teman kucing saat sedang disembunyikan (hanya di mode melayang) -->
  <button
    v-if="!props.inlineMode && !isImmersiveZenOpen && isHidden"
    type="button"
    title="Munculkan kembali teman kucing kecil"
    class="btn-bouncy fixed bottom-4 left-4 z-40 flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-md"
    :style="{
      backgroundColor: catStyle.bubbleBg,
      borderColor: catStyle.bubbleBorder,
      color: catStyle.bubbleText,
    }"
    @click="isHidden = false; markInteraction()"
  >
    <span>🐱</span>
    <span class="hidden sm:inline">Panggil Kucing</span>
  </button>

  <!-- Karakter Teman Kucing Interaktif (melayang di pojok kiri bawah, atau inline berdampingan di Mode Zen) -->
  <div
    v-else-if="props.inlineMode || (isPositioned && !isImmersiveZenOpen)"
    data-clickable
    data-pet-headpat
    class="group select-none touch-none"
    :class="
      props.inlineMode
        ? 'relative inline-flex items-center justify-center scale-115'
        : 'fixed z-40 origin-bottom-left scale-75 md:scale-100'
    "
    :style="
      props.inlineMode
        ? { cursor: isHoveringMiniCat ? 'none' : 'pointer' }
        : {
            left: `${posX}px`,
            top: `${posY}px`,
            cursor: isDragging ? 'grabbing' : isHoveringMiniCat ? 'none' : 'grab',
          }
    "
    title="Usap kepalanya untuk mengelus (purring), klik untuk membangunkan, atau geser/goyang!"
    @pointerenter="handleHoverEnter"
    @pointermove="handleHoverMove"
    @pointerleave="handleHoverLeave"
    @pointerdown="handlePointerDown"
  >
    <!-- Kursor Tangan Mengelus (Animated Hand Pat Cursor) mengikuti mouse saat mengusap kucing mini -->
    <div
      v-if="isHoveringMiniCat && !isDragging"
      aria-hidden="true"
      class="pointer-events-none absolute z-30 select-none"
      :style="{ left: `${handLocalX}px`, top: `${handLocalY}px` }"
    >
      <div
        class="flex items-center justify-center drop-shadow-[0_4px_8px_rgba(249,168,212,0.55)]"
        :class="isBeingPetted ? 'animate-hand-pat' : '-translate-x-1/2 -translate-y-1/2 -rotate-12'"
      >
        <span class="text-xl leading-none">🖐️</span>
      </div>
    </div>

    <!-- Partikel Hati ♥ & Kilau ✨ Melayang Naik saat Kucing Mini Dielus -->
    <span
      v-for="heart in petHearts"
      :key="heart.id"
      aria-hidden="true"
      class="animate-heart-rise pointer-events-none absolute z-20 text-xs font-bold"
      :style="{
        left: heart.left,
        top: heart.top,
        color: catStyle.notePrimary,
        textShadow: `0 0 6px ${catStyle.notePrimary}`,
        '--hx': heart.hx,
      }"
    >
      {{ heart.symbol }}
    </span>
    <!-- Gelembung Emote di Atas Kepala Kucing (selaras warna & efek tema aktif) -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0 scale-75"
      enter-to-class="translate-y-0 opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-75"
    >
      <div
        v-if="displayedEmote"
        class="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border shadow-md backdrop-blur-sm"
        :class="
          isEating
            ? '-top-12 animate-bounce px-3 py-1 text-2xl'
            : displayedEmote === '💤'
              ? '-top-9 animate-float-note px-2.5 py-0.5 text-sm'
              : '-top-9 px-2.5 py-0.5 text-xs font-bold'
        "
        :style="{
          backgroundColor: catStyle.bubbleBg,
          borderColor: catStyle.bubbleBorder,
          color: catStyle.bubbleText,
          boxShadow:
            catStyle.specialMode === 'neon'
              ? '0 0 12px rgba(0, 245, 212, 0.35), 0 0 8px rgba(255, 42, 133, 0.28)'
              : catStyle.specialMode === 'astral'
                ? '0 0 12px rgba(253, 224, 71, 0.35)'
                : undefined,
        }"
      >
        {{ displayedEmote }}
      </div>
    </Transition>

    <!-- Tombol Sembunyikan (✕): hanya tampil pada mode melayang -->
    <button
      v-if="!props.inlineMode"
      type="button"
      data-pet-action
      aria-label="Sembunyikan teman kucing sementara"
      title="Sembunyikan sementara"
      class="absolute -right-1.5 -top-1.5 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border text-[11px] font-bold opacity-90 shadow-md transition md:-right-1 md:-top-1 md:h-5 md:w-5 md:text-[10px] md:opacity-0 md:group-hover:opacity-100"
      :style="{
        backgroundColor: catStyle.bubbleBg,
        borderColor: catStyle.bubbleBorder,
        color: catStyle.bubbleText,
      }"
      @click.stop="isHidden = true"
    >
      ✕
    </button>

    <!-- Tombol Mini "Beri Ikan (🐟 5)" muncul saat hover atau setelah kucing diklik -->
    <button
      type="button"
      data-pet-action
      :title="`Beri makan ikan (-5 🐟, koinmu: ${treatCoins} 🐟)`"
      class="btn-bouncy absolute -bottom-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-bold shadow-lg backdrop-blur-md transition"
      :class="showFeedPrompt ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
      :style="
        treatCoins >= 5
          ? {
              backgroundColor: catStyle.bubbleBg,
              borderColor: catStyle.bubbleBorder,
              color: catStyle.bubbleText,
            }
          : {
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              color: 'rgba(255, 255, 255, 0.55)',
            }
      "
      @click.stop="handleFeedFish"
    >
      Beri Ikan (🐟 5)
    </button>

    <!-- Ilustrasi SVG Anak Kucing Kawaii Abu-Abu / Krem -->
    <div
      class="transition-transform duration-150 ease-out"
      :class="bodyAnimationClass"
      :style="
        isBeingPetted
          ? { transform: `rotate(${headLeanDeg}deg) translateY(2px) scale(1.04, 0.96)` }
          : undefined
      "
    >
      <svg
        class="h-[82px] w-[82px] drop-shadow-[0_8px_16px_rgba(10,6,28,0.5)] transition-transform duration-150"
        :class="{ 'scale-108': isDragging }"
        viewBox="0 0 110 110"
        fill="none"
        role="img"
        aria-label="Teman anak kucing kawaii abu-abu krem"
      >
        <!-- Bayangan lembut di bawah anak kucing -->
        <ellipse cx="55" cy="96" rx="28" ry="6" fill="#0f0a26" opacity="0.35" />

        <!-- === EFEK SPESIAL MINI CAT: 👑 ASTRAL CRYSTAL PALACE === -->
        <g v-if="catStyle.specialMode === 'astral'">
          <circle cx="55" cy="56" r="44" fill="url(#miniCatSpecialAura)" opacity="0.88" />
          <g :class="{ 'animate-astral-orbit': showSpecialEffects }">
            <circle cx="55" cy="56" r="45" stroke="#fde047" stroke-width="1.3" stroke-dasharray="5 6" opacity="0.75" />
            <circle cx="55" cy="11" r="2.2" fill="#fef08a" />
            <circle cx="55" cy="101" r="2" fill="#34d399" />
          </g>
          <g v-if="showSpecialEffects">
            <path class="animate-crystal-float" style="--crystal-dur: 3s" d="M12 36 L16 42 L12 48 L8 42 Z" fill="#34d399" stroke="#fef08a" stroke-width="1" />
            <path class="animate-crystal-float" style="--crystal-dur: 3.4s; --crystal-delay: 0.7s" d="M98 34 L102 40 L98 46 L94 40 Z" fill="#fde047" stroke="#ffffff" stroke-width="1" />
          </g>
        </g>

        <!-- === EFEK SPESIAL MINI CAT: 🌃 NEON NIGHT CITY === -->
        <g v-else-if="catStyle.specialMode === 'neon'">
          <circle cx="55" cy="56" r="44" fill="url(#miniCatSpecialAura)" opacity="0.92" />
          <g :class="{ 'animate-astral-orbit': showSpecialEffects }">
            <circle cx="55" cy="56" r="46" stroke="#00f5d4" stroke-width="1.6" stroke-dasharray="14 7 4 7" opacity="0.82" />
          </g>
          <circle
            cx="55"
            cy="56"
            r="41"
            stroke="#ff2a85"
            stroke-width="1.5"
            stroke-dasharray="9 6"
            :class="{ 'animate-neon-ring-pulse': showSpecialEffects }"
            opacity="0.78"
          />
          <g v-if="showSpecialEffects">
            <rect class="animate-neon-eq" style="--eq-dur: 0.9s" x="6" y="48" width="3" height="16" rx="1.5" fill="#00f5d4" />
            <rect class="animate-neon-eq" style="--eq-dur: 1.1s; --eq-delay: 0.25s" x="10.5" y="42" width="3" height="22" rx="1.5" fill="#ff2a85" />
            <rect class="animate-neon-eq" style="--eq-dur: 1.0s; --eq-delay: 0.15s" x="96.5" y="42" width="3" height="22" rx="1.5" fill="#ff2a85" />
            <rect class="animate-neon-eq" style="--eq-dur: 0.85s; --eq-delay: 0.4s" x="101" y="48" width="3" height="16" rx="1.5" fill="#00f5d4" />
          </g>
        </g>

        <!-- === EFEK ATMOSFER MINI HALUS TEMA TOKO REGULER === -->
        <g v-else-if="showSpecialEffects && catStyle.ambientAccent === 'matcha'">
          <ellipse class="animate-crystal-float" style="--crystal-dur: 3.4s" cx="14" cy="40" rx="4" ry="2.2" transform="rotate(-30 14 40)" fill="#4ade80" opacity="0.82" />
          <ellipse class="animate-crystal-float" style="--crystal-dur: 3.1s; --crystal-delay: 0.8s" cx="96" cy="36" rx="3.8" ry="2" transform="rotate(28 96 36)" fill="#86efac" opacity="0.82" />
        </g>
        <g v-else-if="showSpecialEffects && catStyle.ambientAccent === 'ocean'">
          <circle class="animate-crystal-float" style="--crystal-dur: 3.2s" cx="14" cy="38" r="3.4" fill="none" stroke="#5eead4" stroke-width="1.3" opacity="0.85" />
          <circle class="animate-crystal-float" style="--crystal-dur: 3.6s; --crystal-delay: 0.7s" cx="96" cy="34" r="3.8" fill="none" stroke="#22d3ee" stroke-width="1.3" opacity="0.85" />
        </g>
        <g v-else-if="showSpecialEffects && catStyle.ambientAccent === 'autumn'">
          <ellipse class="animate-crystal-float" style="--crystal-dur: 3.5s" cx="14" cy="38" rx="4.2" ry="2.2" transform="rotate(-25 14 38)" fill="#fb923c" opacity="0.85" />
          <ellipse class="animate-crystal-float" style="--crystal-dur: 3.2s; --crystal-delay: 0.7s" cx="96" cy="40" rx="4" ry="2.1" transform="rotate(30 96 40)" fill="#fbbf24" opacity="0.85" />
        </g>
        <g v-else-if="showSpecialEffects && catStyle.ambientAccent === 'frost'">
          <circle class="animate-crystal-float" style="--crystal-dur: 3.3s" cx="14" cy="36" r="2.6" fill="#e0f2fe" opacity="0.88" />
          <circle class="animate-crystal-float" style="--crystal-dur: 3.7s; --crystal-delay: 0.8s" cx="96" cy="36" r="2.6" fill="#bae6fd" opacity="0.88" />
        </g>

        <!-- AKSESORIS BELAKANG TUBUH: ✨ Sayap Malaikat & Aura Bintang (Milestone Lv. 20 MAX) -->
        <g v-if="equippedAccessory === 'angel-wings'">
          <circle cx="55" cy="58" r="44" fill="#fef08a" opacity="0.16" />
          <path
            d="M36 72 C18 65, 6 52, 8 40 C17 44, 26 51, 32 58 C20 55, 10 58, 9 67 C18 70, 27 71, 35 74 C24 75, 16 80, 15 86 C25 87, 34 82, 40 78 Z"
            fill="#fffdf7"
            stroke="#fde68a"
            stroke-width="1.3"
            stroke-linejoin="round"
          />
          <path
            d="M74 72 C92 65, 104 52, 102 40 C93 44, 84 51, 78 58 C90 55, 100 58, 101 67 C92 70, 83 71, 75 74 C86 75, 94 80, 95 86 C85 87, 76 82, 70 78 Z"
            fill="#fffdf7"
            stroke="#fde68a"
            stroke-width="1.3"
            stroke-linejoin="round"
          />
          <path d="M16 32 L17.2 35 L20.2 36.2 L17.2 37.4 L16 40.4 L14.8 37.4 L11.8 36.2 L14.8 35 Z" fill="#fef08a" />
          <path d="M94 32 L95.2 35 L98.2 36.2 L95.2 37.4 L94 40.4 L92.8 37.4 L89.8 36.2 L92.8 35 Z" fill="#fef08a" />
        </g>

        <!-- Ekor melengkung lucu -->
        <path
          d="M78 78 C96 76, 98 56, 86 52"
          stroke="#cbd5e1"
          stroke-width="8"
          stroke-linecap="round"
        />
        <path
          d="M86 52 C88 53, 91 55, 92 58"
          stroke="#94a3b8"
          stroke-width="8"
          stroke-linecap="round"
        />

        <!-- Badan bulat kecil berwarna abu-abu krem hangat -->
        <ellipse cx="55" cy="76" rx="26" ry="20" fill="#e7e5e4" />
        <!-- Perut krem lembut -->
        <ellipse cx="55" cy="79" rx="15" ry="12" fill="#fef3c7" />
        <!-- Aksesoris Leher Sinkron: 🧣 Syal Rajut / 💖 Kalung Hati Bintang / Kalung Bawaan -->
        <g v-if="equippedAccessory === 'knit-scarf'">
          <path
            d="M36 63 Q55 74 74 63 Q72 72 55 75 Q38 72 36 63 Z"
            fill="#fb7185"
            stroke="#ffe4e6"
            stroke-width="1.1"
            stroke-linejoin="round"
          />
          <path d="M44 67 L42 73 M55 70 L55 75 M66 67 L68 73" stroke="#fef3c7" stroke-width="1.5" stroke-linecap="round" />
          <path d="M63 68 L71 67 L73 83 L64 84 Z" fill="#f43f5e" stroke="#ffe4e6" stroke-width="1" stroke-linejoin="round" />
          <line x1="64" y1="75" x2="72" y2="74" stroke="#fef3c7" stroke-width="1.5" />
        </g>
        <g v-else-if="equippedAccessory === 'soulmate-collar'">
          <path d="M38 64 Q55 73 72 64" stroke="#ec4899" stroke-width="4.8" stroke-linecap="round" />
          <path
            d="M55 79 C50 75.5, 48 71, 51.5 69.2 C53.2 68.4, 54.6 69.5, 55 70.8 C55.4 69.5, 56.8 68.4, 58.5 69.2 C62 71, 60 75.5, 55 79 Z"
            fill="#f9a8d4"
            stroke="#fef08a"
            stroke-width="1.2"
          />
        </g>
        <g v-else>
          <!-- Pita kalung mungil bawaan (menyesuaikan palet tema aktif + permata/cyber core di tema spesial) -->
          <path d="M40 65 Q55 72 70 65" :stroke="catStyle.collarFill" stroke-width="4.2" stroke-linecap="round" />
          <path
            v-if="catStyle.specialMode === 'astral'"
            d="M55 66.5 L58.5 71 L55 75.5 L51.5 71 Z"
            fill="#34d399"
            stroke="#fde047"
            stroke-width="1.2"
          />
          <g v-else-if="catStyle.specialMode === 'neon'">
            <rect x="50.5" y="67.5" width="9" height="6" rx="3" fill="#090514" stroke="#00f5d4" stroke-width="1.2" />
            <circle cx="55" cy="70.5" r="1.8" fill="#ff2a85" />
          </g>
          <circle v-else cx="55" cy="70" r="3.2" :fill="catStyle.bellFill" />
        </g>

        <!-- Telinga Kiri & Kanan (bagian dalam selaras tema) -->
        <path d="M33 44 L29 22 L47 33 Z" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.5" stroke-linejoin="round" />
        <path d="M34 40 L32 27 L43 34 Z" :fill="catStyle.earInner" />

        <path d="M77 44 L81 22 L63 33 Z" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.5" stroke-linejoin="round" />
        <path d="M76 40 L78 27 L67 34 Z" :fill="catStyle.earInner" />

        <!-- Kepala bulat anak kucing -->
        <ellipse cx="55" cy="50" rx="28" ry="23" fill="#e7e5e4" />

        <!-- Corak dahi (Bulan Sabit Emas di Astral, Lambang Cyber di Neon, atau Corak Tabby Bawaan) -->
        <g v-if="catStyle.specialMode === 'astral'">
          <path d="M56.5 29 A3.6 3.6 0 1 0 56.5 35.8 A2.8 2.8 0 1 1 56.5 29 Z" fill="#fde047" stroke="#b45309" stroke-width="0.6" />
        </g>
        <g v-else-if="catStyle.specialMode === 'neon'">
          <path d="M51 32.5 L55 29.5 L59 32.5" stroke="#00f5d4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="55" cy="35" r="1.3" fill="#ff2a85" />
        </g>
        <g v-else>
          <path d="M55 28 V35" stroke="#94a3b8" stroke-width="3" stroke-linecap="round" />
          <path d="M48 29 L50 35" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" />
          <path d="M62 29 L60 35" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" />
        </g>

        <!-- SINKRONISASI AKSESORI KEPALA REAL-TIME (mengikuti Kucing Putih utama: Pita Pink, Topi Penyihir, Mahkota Bintang) -->
        <!-- 1. Mahkota Bintang -->
        <g v-if="equippedAccessory === 'star-crown'">
          <path
            d="M41 29 L45 14 L55 22 L65 14 L69 29 Z"
            fill="#fde68a"
            stroke="#ffffff"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
          <circle cx="55" cy="13" r="2.6" fill="#f9a8d4" stroke="#ffffff" stroke-width="0.9" />
          <circle cx="45" cy="14" r="1.9" fill="#c4b5fd" />
          <circle cx="65" cy="14" r="1.9" fill="#c4b5fd" />
        </g>

        <!-- 2. Topi Penyihir Pastel -->
        <g v-else-if="equippedAccessory === 'witch-hat'">
          <ellipse cx="55" cy="29" rx="21" ry="5.5" fill="#4c1d95" stroke="#c4b5fd" stroke-width="1.4" />
          <path
            d="M40 28 L52 5 C54 2, 60 3, 64 9 L70 28 Z"
            fill="#5b21b6"
            stroke="#c4b5fd"
            stroke-width="1.4"
            stroke-linejoin="round"
          />
          <path d="M42 24.5 Q55 28.5 68 24.5 L69 27.5 Q55 31.5 41 27.5 Z" fill="#f9a8d4" />
          <path
            d="M55 22.8 L56.1 25.4 L59 25.8 L56.9 27.7 L57.5 30.5 L55 29 L52.5 30.5 L53.1 27.7 L51 25.8 L53.9 25.4 Z"
            fill="#fde68a"
          />
        </g>

        <!-- 3. Pita Pink Pastel di dekat telinga kiri -->
        <g v-else-if="equippedAccessory === 'pink-bow'" transform="translate(36, 31) rotate(-22)">
          <path
            d="M0 0 C-7 -7, -14 -5, -13 1 C-12 7, -5 6, 0 1 Z"
            fill="#f472b6"
            stroke="#fdf2f8"
            stroke-width="1.2"
            stroke-linejoin="round"
          />
          <path
            d="M0 0 C7 -7, 14 -5, 13 1 C12 7, 5 6, 0 1 Z"
            fill="#f9a8d4"
            stroke="#fdf2f8"
            stroke-width="1.2"
            stroke-linejoin="round"
          />
          <path d="M-2 2 L-5 10 L-1 8 Z" fill="#ec4899" />
          <path d="M2 2 L5 10 L1 8 Z" fill="#f472b6" />
          <circle cx="0" cy="0.5" r="3" fill="#fbcfe8" stroke="#ffffff" stroke-width="1.1" />
        </g>

        <!-- 4. 🌱 Tunas Daun -->
        <g v-else-if="equippedAccessory === 'leaf-sprout'">
          <path d="M55 29 Q54.5 20 55.5 13" stroke="#4ade80" stroke-width="2.2" stroke-linecap="round" />
          <path d="M55 20 C46 18, 42 11, 46 7 C52 6, 55 12, 55 20 Z" fill="#4ade80" stroke="#dcfce7" stroke-width="1" />
          <path d="M55.5 18 C63 14, 68 8, 64 5 C59 4, 55.5 11, 55.5 18 Z" fill="#22c55e" stroke="#dcfce7" stroke-width="1" />
        </g>

        <!-- 5. 📖 Buku Terbuka -->
        <g v-else-if="equippedAccessory === 'open-book'" transform="translate(55, 22)">
          <path d="M-18 4 Q-9 -6 0 1 Q9 -6 18 4 L16 8 Q8 1 0 6 Q-8 1 -16 8 Z" fill="#5b21b6" stroke="#fde68a" stroke-width="1.2" />
          <path d="M-16 3 Q-8 -7 0 -1 L0 4 Q-8 -1 -14 6 Z" fill="#fffbeb" stroke="#f59e0b" stroke-width="0.9" />
          <path d="M16 3 Q8 -7 0 -1 L0 4 Q8 -1 14 6 Z" fill="#fef3c7" stroke="#f59e0b" stroke-width="0.9" />
          <path d="M0 4 L-1.2 9.5 L0 8.2 L1.2 9.5 Z" fill="#f472b6" />
        </g>

        <!-- 6. 🎨 Topi Baret Pastel -->
        <g v-else-if="equippedAccessory === 'beret-hat'" transform="translate(55, 24) rotate(-10)">
          <ellipse cx="0" cy="3" rx="20" ry="8.5" fill="#ddd6fe" stroke="#ffffff" stroke-width="1.3" />
          <path d="M-18 5 Q0 11 18 5" stroke="#a78bfa" stroke-width="2.6" stroke-linecap="round" />
          <path d="M-1 -5 Q1 -10 4 -8" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" />
          <circle cx="-10" cy="1.5" r="2" fill="#fde68a" />
        </g>

        <!-- 7. 😇 Halo Bintang -->
        <g v-else-if="equippedAccessory === 'star-halo'">
          <ellipse cx="55" cy="13" rx="18" ry="5" stroke="#fef08a" stroke-width="4" opacity="0.35" />
          <ellipse cx="55" cy="13" rx="17" ry="4.5" stroke="#fde047" stroke-width="2.1" />
          <path d="M34 10 L35 12.2 L37.2 13.2 L35 14.2 L34 16.4 L33 14.2 L30.8 13.2 L33 12.2 Z" fill="#fef08a" />
        </g>

        <!-- 8. 🎧 Headphone Lo-Fi Pastel (Band & Earcup di telinga Kucing Mini!) -->
        <g v-else-if="equippedAccessory === 'lofi-headphones'">
          <path d="M25 48 C25 18, 85 18, 85 48" stroke="#c084fc" stroke-width="5.5" stroke-linecap="round" />
          <path d="M28 45 C30 22, 80 22, 82 45" stroke="#f9a8d4" stroke-width="2" stroke-linecap="round" />
          <rect x="20" y="40" width="10" height="20" rx="5" fill="#9333ea" stroke="#f9a8d4" stroke-width="1.2" />
          <rect x="23" y="43" width="6" height="14" rx="3" fill="#f472b6" />
          <circle cx="25.5" cy="50" r="2" fill="#67e8f9" />
          <rect x="80" y="40" width="10" height="20" rx="5" fill="#9333ea" stroke="#f9a8d4" stroke-width="1.2" />
          <rect x="81" y="43" width="6" height="14" rx="3" fill="#f472b6" />
          <circle cx="84.5" cy="50" r="2" fill="#67e8f9" />
        </g>

        <!-- EKSPRESI MATA ANAK KUCING MINI (DINAMIS) -->
        <!-- 1. Kesal / Protes (ò ω ó atau > <) saat digoyang cepat -->
        <g v-if="isAnnoyedShaking">
          <template v-if="annoyedVariant === 'grumpy'">
            <!-- Alis menukik kesal menggemaskan (ò ó) -->
            <path d="M38 44 L49 48" stroke="#334155" stroke-width="2.6" stroke-linecap="round" />
            <path d="M72 44 L61 48" stroke="#334155" stroke-width="2.6" stroke-linecap="round" />
            <circle cx="44" cy="51" r="3.4" fill="#334155" />
            <circle cx="66" cy="51" r="3.4" fill="#334155" />
          </template>
          <template v-else>
            <!-- Mata terpejam kesal/pusing (> <) -->
            <path d="M39 46 L48 50 L39 54" stroke="#334155" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M71 46 L62 50 L71 54" stroke="#334155" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
          </template>
        </g>

        <!-- 2. Cemberut Lucu (- ︵ -) selama ~1 detik setelah digoyang cepat lalu dilepas -->
        <g v-else-if="isPouting">
          <line x1="39" y1="50" x2="49" y2="51.5" stroke="#334155" stroke-width="2.5" stroke-linecap="round" />
          <line x1="71" y1="50" x2="61" y2="51.5" stroke="#334155" stroke-width="2.5" stroke-linecap="round" />
        </g>

        <!-- 3. Sedang Digeser (Drag) Pelan (> <) -->
        <g v-else-if="isDragging">
          <path d="M40 46 L48 50 L40 54" stroke="#334155" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M70 46 L62 50 L70 54" stroke="#334155" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </g>

        <!-- 4. Sangat Menikmati Elusan (Pet-Pet: ˘ ◡ ˘), Senyum Manja Puas, atau Santai Saat Break Timer -->
        <g v-else-if="isBeingPetted || isSmugSatisfied || coWorkingMode === 'break'">
          <path d="M39 50 Q44 54.8 49 50" stroke="#334155" stroke-width="2.6" stroke-linecap="round" />
          <path d="M61 50 Q66 54.8 71 50" stroke="#334155" stroke-width="2.6" stroke-linecap="round" />
        </g>

        <!-- 5. Terbuka Lebar Kaget Menggemaskan (O ω O / ◕ ᴥ ◕) selama ~1.5 detik saat diklik -->
        <g v-else-if="isStartledAwake">
          <template v-if="startledVariant === 'wide'">
            <circle cx="44" cy="49.5" r="5.5" fill="#ffffff" stroke="#334155" stroke-width="2.2" />
            <circle cx="44" cy="49.5" r="2.7" fill="#334155" />
            <circle cx="43" cy="48.2" r="1.1" fill="#ffffff" />

            <circle cx="66" cy="49.5" r="5.5" fill="#ffffff" stroke="#334155" stroke-width="2.2" />
            <circle cx="66" cy="49.5" r="2.7" fill="#334155" />
            <circle cx="65" cy="48.2" r="1.1" fill="#ffffff" />
          </template>
          <template v-else>
            <circle cx="44" cy="49.5" r="5.6" fill="#334155" />
            <circle cx="42.2" cy="47.5" r="2.1" fill="#ffffff" />
            <circle cx="45.8" cy="51.2" r="1" fill="#ffffff" />

            <circle cx="66" cy="49.5" r="5.6" fill="#334155" />
            <circle cx="64.2" cy="47.5" r="2.1" fill="#ffffff" />
            <circle cx="67.8" cy="51.2" r="1" fill="#ffffff" />
          </template>
        </g>

        <!-- 6. Makan Ikan dengan Senang (^ ^) -->
        <g v-else-if="isEating">
          <path d="M39 51 Q44 45 49 51" stroke="#334155" stroke-width="2.6" stroke-linecap="round" />
          <path d="M61 51 Q66 45 71 51" stroke="#334155" stroke-width="2.6" stroke-linecap="round" />
        </g>

        <!-- 7. Tertidur / Mengantuk Pulas (- ᴗ -) saat Idle -->
        <g v-else-if="isSleeping">
          <line x1="39" y1="51" x2="49" y2="51" stroke="#334155" stroke-width="2.5" stroke-linecap="round" />
          <line x1="61" y1="51" x2="71" y2="51" stroke="#334155" stroke-width="2.5" stroke-linecap="round" />
        </g>

        <!-- 8. Terbangun Santai (mata bulat berbinar berkedip lembut) -->
        <g v-else class="animate-cat-blink">
          <circle cx="44" cy="50" r="4" fill="#334155" />
          <circle cx="42.8" cy="48.5" r="1.4" fill="#ffffff" />
          <circle cx="66" cy="50" r="4" fill="#334155" />
          <circle cx="64.8" cy="48.5" r="1.4" fill="#ffffff" />
        </g>

        <!-- Mini Visor Hologram Cyber Neon (khusus 🌃 Neon Night City, transparan agar ekspresi tetap 100% imut!) -->
        <g v-if="catStyle.specialMode === 'neon' && equippedAccessory !== 'round-glasses'">
          <path
            d="M34 44.5 H76 C77.5 44.5, 78 46.8, 77 50.5 L74.5 54.5 C73 56, 69 56, 66 55 L57.5 52.5 H52.5 L44 55 C41 56, 37 56, 35.5 54.5 L33 50.5 C32 46.8, 32.5 44.5, 34 44.5 Z"
            fill="url(#miniNeonVisorGrad)"
            stroke="#00f5d4"
            stroke-width="1.4"
            stroke-linejoin="round"
          />
          <path d="M38 46.5 L43 52.5" stroke="#ffffff" stroke-width="1.1" stroke-linecap="round" opacity="0.6" />
        </g>

        <!-- 9. 👓 Kacamata Bulat Tipis di Wajah Kucing Mini -->
        <g v-if="equippedAccessory === 'round-glasses'">
          <circle cx="44" cy="50" r="7.5" fill="rgba(255,251,235,0.22)" stroke="#f59e0b" stroke-width="1.6" />
          <circle cx="66" cy="50" r="7.5" fill="rgba(255,251,235,0.22)" stroke="#f59e0b" stroke-width="1.6" />
          <path d="M51.5 50 Q55 48.2 58.5 50" stroke="#f59e0b" stroke-width="1.6" stroke-linecap="round" />
          <line x1="30" y1="48.5" x2="36.5" y2="49.5" stroke="#f59e0b" stroke-width="1.4" />
          <line x1="73.5" y1="49.5" x2="80" y2="48.5" stroke="#f59e0b" stroke-width="1.4" />
        </g>

        <!-- Pipi Merona (selaras tema, makin cerah saat di-pet-pet / nyaman) -->
        <ellipse
          cx="37"
          cy="56"
          rx="5"
          ry="3.1"
          :fill="catStyle.cheekColor"
          :opacity="isBeingPetted || isSmugSatisfied || isStartledAwake || isEating ? 0.96 : 0.65"
        />
        <ellipse
          cx="73"
          cy="56"
          rx="5"
          ry="3.1"
          :fill="catStyle.cheekColor"
          :opacity="isBeingPetted || isSmugSatisfied || isStartledAwake || isEating ? 0.96 : 0.65"
        />

        <!-- Hidung & Mulut Mungil Dinamis -->
        <path d="M53 54 H57 L55 56.5 Z" fill="#f472b6" />
        <!-- Mulut cemberut lucu (︵) saat pout setelah digoyang cepat -->
        <path
          v-if="isPouting"
          d="M50.5 61.5 Q55 57.5 59.5 61.5"
          stroke="#334155"
          stroke-width="2.2"
          stroke-linecap="round"
        />
        <circle v-else-if="isEating" cx="55" cy="60.5" r="3" fill="#f472b6" opacity="0.9" />
        <!-- Senyum nyaman (◡ / ︶ / ᴗ) saat dielus, manja puas, istirahat break, atau tidur pulas -->
        <path
          v-else-if="isBeingPetted || isSmugSatisfied || coWorkingMode === 'break' || isSleeping"
          d="M50.5 58.5 Q55 62.5 59.5 58.5"
          stroke="#334155"
          stroke-width="2.2"
          stroke-linecap="round"
        />
        <!-- Mulut kucing klasik (ω) saat protes kesal, kaget bangun, atau santai -->
        <path
          v-else
          d="M50 58.5 Q52.5 61.5 55 58.2 Q57.5 61.5 60 58.5"
          stroke="#334155"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- Ikan mungil lucu di dekat cakar saat kucing sedang makan! -->
        <g v-if="isEating" transform="translate(55, 76)">
          <ellipse cx="0" cy="0" rx="8" ry="4.5" fill="#7dd3fc" stroke="#0284c7" stroke-width="1.2" />
          <path d="M7 0 L13 -4 L13 4 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="1" stroke-linejoin="round" />
          <circle cx="-3.5" cy="-1" r="1.1" fill="#0f172a" />
        </g>

        <!-- Cakar Depan Mungil -->
        <ellipse cx="44" cy="91" rx="6.5" ry="4.5" fill="#f5f5f4" stroke="#cbd5e1" stroke-width="1.2" />
        <ellipse cx="66" cy="91" rx="6.5" ry="4.5" fill="#f5f5f4" stroke="#cbd5e1" stroke-width="1.2" />

        <defs>
          <radialGradient id="miniCatSpecialAura" cx="55" cy="56" r="44" gradientUnits="userSpaceOnUse">
            <stop :stop-color="catStyle.auraInner" stop-opacity="0.34" />
            <stop offset="1" :stop-color="catStyle.auraOuter" stop-opacity="0.04" />
          </radialGradient>
          <linearGradient id="miniNeonVisorGrad" x1="34" y1="44" x2="76" y2="55" gradientUnits="userSpaceOnUse">
            <stop stop-color="#00f5d4" stop-opacity="0.28" />
            <stop offset="1" stop-color="#ff2a85" stop-opacity="0.3" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  </div>
</template>
