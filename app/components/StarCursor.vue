<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { type ThemeName, useTwilightStorage } from '~/composables/useTwilightStorage'

const { theme, isStarCursorEnabled, graphicsConfig } = useTwilightStorage()

// Deteksi layar sentuh / HP agar kursor kustom otomatis nonaktif dan tidak mengganggu
const isTouchDevice = ref<boolean>(false)
const isVisible = ref<boolean>(false)
const isHoveringClickable = ref<boolean>(false)
const isHoveringPetCat = ref<boolean>(false)
const isPressed = ref<boolean>(false)

// Koordinat kursor mouse (diperbarui langsung ke DOM via RAF agar nol re-render Vue per gerakan mouse!)
const cursorElRef = ref<HTMLElement | null>(null)
let latestMouseX = -100
let latestMouseY = -100
let cursorRafId: number | null = null
let lastHoverTarget: EventTarget | null = null

function flushCursorTransform() {
  cursorRafId = null
  const el = cursorElRef.value
  if (!el) return
  const scale = isPressed.value ? 0.86 : isHoveringClickable.value ? 1.28 : 1
  el.style.transform = `translate3d(${latestMouseX - 14}px, ${latestMouseY - 14}px, 0) scale(${scale})`
}

function scheduleCursorTransform() {
  if (cursorRafId === null) {
    cursorRafId = requestAnimationFrame(flushCursorTransform)
  }
}

// Daftar partikel kilau jejak kursor (Sparkle Trail)
interface TrailParticle {
  id: number
  x: number
  y: number
  size: number
  color: string
}

const trails = ref<TrailParticle[]>([])
let lastTrailTime = 0
let lastTrailX = -100
let lastTrailY = -100
let trailIdCounter = 0

// Warna bintang kursor & kilau mengikuti tema aktif (Twilight Purple / Sakura Dusk / Deep Ocean)
const themeCursorPalette: Record<
  ThemeName,
  { fill: string; stroke: string; glow: string; trailColors: string[] }
> = {
  twilight: {
    fill: '#f9a8d4',
    stroke: '#ffffff',
    glow: 'drop-shadow(0 0 8px rgba(249, 168, 212, 0.9)) drop-shadow(0 0 16px rgba(192, 132, 252, 0.65))',
    trailColors: ['#f9a8d4', '#fbcfe8', '#d8b4fe', '#fef08a'],
  },
  sakura: {
    fill: '#fda4af',
    stroke: '#fff1f2',
    glow: 'drop-shadow(0 0 8px rgba(253, 164, 175, 0.9)) drop-shadow(0 0 16px rgba(244, 114, 182, 0.65))',
    trailColors: ['#fda4af', '#fecdd3', '#fbcfe8', '#fde68a'],
  },
  ocean: {
    fill: '#7dd3fc',
    stroke: '#f0f9ff',
    glow: 'drop-shadow(0 0 8px rgba(125, 211, 252, 0.95)) drop-shadow(0 0 16px rgba(34, 211, 238, 0.65))',
    trailColors: ['#7dd3fc', '#bae6fd', '#a5f3fc', '#e0f2fe'],
  },
}

const activePalette = computed(() => themeCursorPalette[theme.value] ?? themeCursorPalette.twilight)

// Kursor kustom hanya aktif di desktop ketika tombol toggle menyala
const isActive = computed<boolean>(() => isStarCursorEnabled.value && !isTouchDevice.value)

/**
 * Menambahkan/menghapus class `star-cursor-active` pada <html>
 * agar kursor panah standar disembunyikan saat kursor bintang aktif
 */
function syncDocumentCursorClass() {
  if (!import.meta.client) return
  if (isActive.value) {
    document.documentElement.classList.add('star-cursor-active')
  } else {
    document.documentElement.classList.remove('star-cursor-active')
    isVisible.value = false
    trails.value = []
  }
}

watch(isActive, syncDocumentCursorClass)

/**
 * LOGIKA CURSOR TRACKING:
 * Memantau posisi mouse, mendeteksi apakah sedang mengarah ke elemen yang bisa diklik,
 * serta memunculkan partikel jejak kilau (sparkle trail) yang ringan dan halus.
 */
function handleMouseMove(event: MouseEvent) {
  if (!isActive.value) return

  latestMouseX = event.clientX
  latestMouseY = event.clientY
  if (!isVisible.value) isVisible.value = true

  // Cache target agar tidak memanggil DOM .closest() ratusan kali/detik pada elemen yang sama
  if (event.target !== lastHoverTarget) {
    lastHoverTarget = event.target
    const target = event.target as HTMLElement | null
    isHoveringPetCat.value = Boolean(target?.closest('[data-pet-headpat]'))
    isHoveringClickable.value = Boolean(
      target?.closest(
        'a, button, input, textarea, select, label, [role="button"], [role="checkbox"], [data-clickable]',
      ),
    )
  }

  scheduleCursorTransform()

  // Jejak debu bintang kursor hanya aktif di kualitas Grafik Tinggi (mati di Ringan & Sedang)
  if (!graphicsConfig.value.enableCursorDust || document.hidden) return
  const now = performance.now()
  const dist = Math.hypot(event.clientX - lastTrailX, event.clientY - lastTrailY)

  if (now - lastTrailTime > 48 && dist > 14) {
    lastTrailTime = now
    lastTrailX = event.clientX
    lastTrailY = event.clientY

    const paletteColors = activePalette.value.trailColors
    const color =
      paletteColors[Math.floor(Math.random() * paletteColors.length)] ?? activePalette.value.fill

    const id = ++trailIdCounter
    const newParticle: TrailParticle = {
      id,
      x: event.clientX + (Math.random() - 0.5) * 10,
      y: event.clientY + (Math.random() - 0.5) * 10,
      size: 7 + Math.random() * 6,
      color,
    }

    // Simpan maksimal 10 partikel sekaligus supaya super ringan
    trails.value = [...trails.value.slice(-9), newParticle]

    setTimeout(() => {
      trails.value = trails.value.filter(p => p.id !== id)
    }, 640)
  }
}

function handleMouseDown() {
  if (!isActive.value) return
  isPressed.value = true
  scheduleCursorTransform()
}

function handleMouseUp() {
  isPressed.value = false
  scheduleCursorTransform()
}

function handleMouseLeave() {
  isVisible.value = false
  lastHoverTarget = null
  trails.value = []
}

function handleWindowBlur() {
  isVisible.value = false
  lastHoverTarget = null
  trails.value = []
}

onMounted(() => {
  // Deteksi perangkat layar sentuh / HP (@media pointer: coarse) agar kursor kustom nonaktif penuh di HP
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const finePointer = window.matchMedia('(pointer: fine)').matches
  isTouchDevice.value = coarsePointer || !finePointer

  syncDocumentCursorClass()

  window.addEventListener('mousemove', handleMouseMove, { passive: true })
  window.addEventListener('mousedown', handleMouseDown, { passive: true })
  window.addEventListener('mouseup', handleMouseUp, { passive: true })
  window.addEventListener('blur', handleWindowBlur)
  document.addEventListener('mouseleave', handleMouseLeave)
})

onUnmounted(() => {
  if (cursorRafId !== null) cancelAnimationFrame(cursorRafId)
  if (import.meta.client) {
    document.documentElement.classList.remove('star-cursor-active')
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mousedown', handleMouseDown)
    window.removeEventListener('mouseup', handleMouseUp)
    window.removeEventListener('blur', handleWindowBlur)
    document.removeEventListener('mouseleave', handleMouseLeave)
  }
})
</script>

<template>
  <!-- Layer Kursor Bintang & Jejak Kilau: pointer-events-none + otomatis tersembunyi di @media (pointer: coarse) -->
  <div
    v-if="isActive"
    aria-hidden="true"
    class="star-cursor-layer pointer-events-none fixed inset-0 z-[9999] overflow-hidden"
  >
    <!-- 1. Jejak Partikel Bintang Kilau (Sparkle Trail) -->
    <svg
      v-for="particle in trails"
      :key="particle.id"
      class="animate-trail-fade pointer-events-none fixed left-0 top-0"
      :style="{
        left: `${particle.x}px`,
        top: `${particle.y}px`,
        width: `${particle.size}px`,
        height: `${particle.size}px`,
      }"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
        :fill="particle.color"
      />
    </svg>

    <!-- 2. Ikon Utama Kursor Bintang Pastel Bercahaya (posisi diupdate langsung via RAF tanpa Vue re-render) -->
    <div
      ref="cursorElRef"
      v-show="isVisible && !isHoveringPetCat"
      class="pointer-events-none fixed left-0 top-0"
      style="transform: translate3d(-100px, -100px, 0)"
    >
      <svg
        class="pointer-events-none h-7 w-7"
        :class="{ 'animate-cursor-spin': isHoveringClickable }"
        :style="{ filter: activePalette.glow }"
        viewBox="0 0 36 36"
        fill="none"
      >
        <path
          d="M18 3.5 L21.9 12.6 L31.8 13.6 L24.3 20.1 L26.5 29.8 L18 24.7 L9.5 29.8 L11.7 20.1 L4.2 13.6 L14.1 12.6 Z"
          :fill="activePalette.fill"
          :stroke="activePalette.stroke"
          stroke-width="2"
          stroke-linejoin="round"
        />
        <!-- Kilau mungil di tengah bintang -->
        <circle cx="15" cy="15" r="2" fill="#ffffff" opacity="0.9" />
      </svg>
    </div>
  </div>
</template>
