<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { type ThemeName, useTwilightStorage } from '~/composables/useTwilightStorage'

const { theme, isStarCursorEnabled, isBatterySaverMode } = useTwilightStorage()

// Deteksi layar sentuh / HP agar kursor kustom otomatis nonaktif dan tidak mengganggu
const isTouchDevice = ref<boolean>(false)
const isVisible = ref<boolean>(false)
const isHoveringClickable = ref<boolean>(false)
const isHoveringPetCat = ref<boolean>(false)
const isPressed = ref<boolean>(false)

// Koordinat kursor mouse secara real-time
const cursorX = ref<number>(-100)
const cursorY = ref<number>(-100)

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

  cursorX.value = event.clientX
  cursorY.value = event.clientY
  isVisible.value = true

  // Cek apakah kursor sedang berada di atas kucing yang mendukung kursor tangan elus (headpat)
  const target = event.target as HTMLElement | null
  isHoveringPetCat.value = Boolean(target?.closest('[data-pet-headpat]'))
  isHoveringClickable.value = Boolean(
    target?.closest(
      'a, button, input, textarea, select, label, [role="button"], [role="checkbox"], [data-clickable]',
    ),
  )

  // Batasi pembuatan partikel (throttle tiap ~35ms & jarak > 12px) — jeda jika Mode Hemat Baterai aktif
  if (isBatterySaverMode.value) return
  const now = performance.now()
  const dist = Math.hypot(event.clientX - lastTrailX, event.clientY - lastTrailY)

  if (now - lastTrailTime > 36 && dist > 12) {
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

    // Simpan maksimal 16 partikel sekaligus supaya hemat memori
    trails.value = [...trails.value.slice(-15), newParticle]

    setTimeout(() => {
      trails.value = trails.value.filter(p => p.id !== id)
    }, 660)
  }
}

function handleMouseDown() {
  if (!isActive.value) return
  isPressed.value = true
}

function handleMouseUp() {
  isPressed.value = false
}

function handleMouseLeave() {
  isVisible.value = false
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
  document.addEventListener('mouseleave', handleMouseLeave)
})

onUnmounted(() => {
  if (import.meta.client) {
    document.documentElement.classList.remove('star-cursor-active')
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mousedown', handleMouseDown)
    window.removeEventListener('mouseup', handleMouseUp)
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

    <!-- 2. Ikon Utama Kursor Bintang Pastel Bercahaya (sembunyi sementara saat kursor tangan headpat aktif) -->
    <div
      v-show="isVisible && !isHoveringPetCat"
      class="pointer-events-none fixed left-0 top-0 transition-transform duration-75 ease-out"
      :style="{
        transform: `translate3d(${cursorX - 14}px, ${cursorY - 14}px, 0) scale(${
          isPressed ? 0.86 : isHoveringClickable ? 1.28 : 1
        })`,
      }"
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
