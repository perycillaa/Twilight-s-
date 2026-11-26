<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  type CursorStyleId,
  useTwilightStorage,
} from '~/composables/useTwilightStorage'

const { activeCursor, isDarkTheme, theme, activeCozyTheme, graphicsConfig } = useTwilightStorage()

// Deteksi perangkat layar sentuh / HP (tetap tampilkan tap ripple bertema di HP, sembunyikan SVG kursor mengambang)
const isTouchDevice = ref<boolean>(false)
const isVisible = ref<boolean>(false)
const isHoveringClickable = ref<boolean>(false)
const isHoveringPetCat = ref<boolean>(false)
const isPressed = ref<boolean>(false)

// Koordinat kursor mouse (diperbarui langsung ke DOM via RAF agar nol re-render Vue per gerakan mouse)
const cursorElRef = ref<HTMLElement | null>(null)
let latestMouseX = -100
let latestMouseY = -100
let cursorRafId: number | null = null
let lastHoverTarget: EventTarget | null = null

function flushCursorTransform() {
  cursorRafId = null
  const el = cursorElRef.value
  if (!el) return
  const scale = isPressed.value ? 0.84 : isHoveringClickable.value ? 1.24 : 1
  el.style.transform = `translate3d(${latestMouseX - 15}px, ${latestMouseY - 15}px, 0) scale(${scale})`
}

function scheduleCursorTransform() {
  if (cursorRafId === null) {
    cursorRafId = requestAnimationFrame(flushCursorTransform)
  }
}

type TrailTone = 'primary' | 'secondary' | 'stroke'

interface TrailParticle {
  id: number
  x: number
  y: number
  size: number
  tone: TrailTone
  rotation: number
  kind: 'star' | 'paw' | 'ripple' | 'leaf' | 'petal' | 'bubble' | 'diamond' | 'bolt'
}

interface TapRipple {
  id: number
  x: number
  y: number
  symbol: string
}

const trails = ref<TrailParticle[]>([])
const tapRipples = ref<TapRipple[]>([])
let lastTrailTime = 0
let lastTrailX = -100
let lastTrailY = -100
let trailIdCounter = 0
let rippleIdCounter = 0

interface CursorShapeSpec {
  trailKind: TrailParticle['kind']
  tapSymbol: string
}

// Bentuk jejak & simbol tap per jenis kursor (warna 100% dinamis mengikuti variabel CSS tema & mode aktif!)
const CURSOR_SHAPE_SPECS: Record<Exclude<CursorStyleId, 'off'>, CursorShapeSpec> = {
  'starlight-wand': { trailKind: 'star', tapSymbol: '✦' },
  'cat-paw': { trailKind: 'paw', tapSymbol: '🐾' },
  'raindrop-ripple': { trailKind: 'ripple', tapSymbol: '💧' },
  'maple-leaf': { trailKind: 'leaf', tapSymbol: '🍂' },
  'sakura-petal': { trailKind: 'petal', tapSymbol: '🌸' },
  'matcha-leaf': { trailKind: 'leaf', tapSymbol: '🍃' },
  'jellyfish-glow': { trailKind: 'bubble', tapSymbol: '🫧' },
  'golden-quill': { trailKind: 'star', tapSymbol: '✨' },
  'fluffy-cloud': { trailKind: 'bubble', tapSymbol: '☁️' },
  'ice-crystal': { trailKind: 'diamond', tapSymbol: '❄️' },
  'astral-prism': { trailKind: 'diamond', tapSymbol: '💎' },
  'cyber-neon-bolt': { trailKind: 'bolt', tapSymbol: '⚡' },
}

const isEnabled = computed<boolean>(() => activeCursor.value !== 'off')
const isDesktopCursorActive = computed<boolean>(() => isEnabled.value && !isTouchDevice.value)
const activeShapeSpec = computed<CursorShapeSpec>(() => {
  if (activeCursor.value === 'off') return CURSOR_SHAPE_SPECS['starlight-wand']
  return CURSOR_SHAPE_SPECS[activeCursor.value] ?? CURSOR_SHAPE_SPECS['starlight-wand']
})

/**
 * Palet fallback & sinkronisasi real-time berdasarkan (activeCozyTheme, theme, isDarkTheme).
 * Dipadukan dengan CSS variables `--cursor-fill`, `--cursor-stroke`, `--cursor-secondary`, `--cursor-glow`
 * agar langsung berubah seketika saat pengguna mengganti palet Twilight (Ungu / Pink Berry / Biru),
 * tema toko/milestone, maupun Mode Terang / Gelap tanpa perlu refresh!
 */
const activeThemeColors = computed(() => {
  const dark = isDarkTheme.value
  const cozy = activeCozyTheme.value
  const base = theme.value

  if (cozy !== 'classic') {
    switch (cozy) {
      case 'matcha-garden':
        return dark
          ? { fill: '#4ade80', secondary: '#86efac', stroke: '#ecfdf5', glow: 'rgba(74, 222, 128, 0.82)' }
          : { fill: '#bbf7d0', secondary: '#86efac', stroke: '#166534', glow: 'rgba(255, 255, 255, 0.9)' }
      case 'autumn-cafe':
        return dark
          ? { fill: '#fb923c', secondary: '#fbbf24', stroke: '#fef3c7', glow: 'rgba(251, 146, 60, 0.84)' }
          : { fill: '#fed7aa', secondary: '#fdba74', stroke: '#9a3412', glow: 'rgba(255, 255, 255, 0.9)' }
      case 'honey-library':
        return dark
          ? { fill: '#fcd34d', secondary: '#fde68a', stroke: '#fffbeb', glow: 'rgba(252, 211, 77, 0.84)' }
          : { fill: '#fef08a', secondary: '#fde047', stroke: '#92400e', glow: 'rgba(255, 255, 255, 0.9)' }
      case 'sakura-lantern':
        return dark
          ? { fill: '#f472b6', secondary: '#fda4af', stroke: '#fff1f2', glow: 'rgba(244, 114, 182, 0.84)' }
          : { fill: '#fbcfe8', secondary: '#fda4af', stroke: '#9d174d', glow: 'rgba(255, 255, 255, 0.9)' }
      case 'midnight-rain':
        return dark
          ? { fill: '#60a5fa', secondary: '#93c5fd', stroke: '#eff6ff', glow: 'rgba(96, 165, 250, 0.84)' }
          : { fill: '#bfdbfe', secondary: '#93c5fd', stroke: '#1e40af', glow: 'rgba(255, 255, 255, 0.9)' }
      case 'biolum-ocean':
        return dark
          ? { fill: '#00f5d4', secondary: '#22d3ee', stroke: '#ecfeff', glow: 'rgba(0, 245, 212, 0.88)' }
          : { fill: '#99f6e4', secondary: '#a5f3fc', stroke: '#115e59', glow: 'rgba(255, 255, 255, 0.9)' }
      case 'winter-frost':
        return dark
          ? { fill: '#7dd3fc', secondary: '#bae6fd', stroke: '#ffffff', glow: 'rgba(125, 211, 252, 0.86)' }
          : { fill: '#e0f2fe', secondary: '#bae6fd', stroke: '#075985', glow: 'rgba(255, 255, 255, 0.9)' }
      case 'pastel-cloudland':
        return dark
          ? { fill: '#93c5fd', secondary: '#c4b5fd', stroke: '#ffffff', glow: 'rgba(147, 197, 253, 0.84)' }
          : { fill: '#dbeafe', secondary: '#e9d5ff', stroke: '#1d4ed8', glow: 'rgba(255, 255, 255, 0.9)' }
      case 'astral-palace':
        return dark
          ? { fill: '#34d399', secondary: '#fde047', stroke: '#fef9c3', glow: 'rgba(52, 211, 153, 0.88)' }
          : { fill: '#a7f3d0', secondary: '#ddd6fe', stroke: '#065f46', glow: 'rgba(255, 255, 255, 0.9)' }
      case 'neon-night-city':
        return dark
          ? { fill: '#00f5d4', secondary: '#ff2a85', stroke: '#f0fdfa', glow: 'rgba(0, 245, 212, 0.9)' }
          : { fill: '#f5d0fe', secondary: '#a5f3fc', stroke: '#86198f', glow: 'rgba(255, 255, 255, 0.9)' }
    }
  }

  // 3 Pilihan Palet Tema Default Twilight (Ungu / Pink Berry / Biru)
  if (base === 'sakura') {
    return dark
      ? { fill: '#f472b6', secondary: '#fbcfe8', stroke: '#fff1f2', glow: 'rgba(244, 114, 182, 0.82)' }
      : { fill: '#fbcfe8', secondary: '#f9a8d4', stroke: '#9d174d', glow: 'rgba(255, 255, 255, 0.9)' }
  }
  if (base === 'ocean') {
    return dark
      ? { fill: '#38bdf8', secondary: '#7dd3fc', stroke: '#f0f9ff', glow: 'rgba(56, 189, 248, 0.84)' }
      : { fill: '#bae6fd', secondary: '#7dd3fc', stroke: '#0369a1', glow: 'rgba(255, 255, 255, 0.9)' }
  }
  // Palet Ungu Default Twilight
  return dark
    ? { fill: '#a78bfa', secondary: '#c4b5fd', stroke: '#f5f3ff', glow: 'rgba(167, 139, 250, 0.8)' }
    : { fill: '#c4b5fd', secondary: '#ddd6fe', stroke: '#5b21b6', glow: 'rgba(255, 255, 255, 0.9)' }
})

const cursorFilterStyle = computed<string>(() => {
  const glow = activeThemeColors.value.glow
  if (isDarkTheme.value) {
    return `drop-shadow(0 0 6px var(--cursor-glow, ${glow})) drop-shadow(0 0 13px var(--cursor-glow, ${glow}))`
  }
  return 'drop-shadow(0 1px 2px rgba(255, 255, 255, 0.9)) drop-shadow(0 1px 1.5px rgba(15, 23, 42, 0.14))'
})

// Ketebalan outline: 1.8px rapi di Vibe Terang, 2.0px tajam di Vibe Gelap
const cursorStrokeWidth = computed<number>(() => (isDarkTheme.value ? 2 : 1.8))

// CSS var strings dengan fallback reaktif agar selalu sinkron di setiap render
const cursorFillVar = computed(() => `var(--cursor-fill, ${activeThemeColors.value.fill})`)
const cursorSecondaryVar = computed(() => `var(--cursor-secondary, ${activeThemeColors.value.secondary})`)
const cursorStrokeVar = computed(() => `var(--cursor-stroke, ${activeThemeColors.value.stroke})`)
const cursorHighlightFill = computed(() => (isDarkTheme.value ? '#ffffff' : '#ffffff'))

function resolveTrailFill(tone: TrailTone): string {
  if (tone === 'secondary') return cursorSecondaryVar.value
  if (tone === 'stroke') return cursorStrokeVar.value
  return cursorFillVar.value
}

function syncDocumentCursorClass() {
  if (!import.meta.client) return
  if (isDesktopCursorActive.value) {
    document.documentElement.classList.add('star-cursor-active')
  } else {
    document.documentElement.classList.remove('star-cursor-active')
    isVisible.value = false
    trails.value = []
  }
}

watch(isDesktopCursorActive, syncDocumentCursorClass)

// Pastikan saat tema, palet Twilight, mode gelap/terang, atau gaya kursor diganti, tampilan langsung segar
watch([theme, activeCozyTheme, isDarkTheme, activeCursor], () => {
  scheduleCursorTransform()
})

function spawnTapRipple(x: number, y: number) {
  if (!isEnabled.value || document.hidden) return
  const spec = activeShapeSpec.value
  const id = ++rippleIdCounter
  const next: TapRipple = {
    id,
    x,
    y,
    symbol: spec.tapSymbol,
  }
  tapRipples.value = [...tapRipples.value.slice(-4), next]
  setTimeout(() => {
    tapRipples.value = tapRipples.value.filter(r => r.id !== id)
  }, 580)
}

function handleMouseMove(event: MouseEvent) {
  if (!isDesktopCursorActive.value) return

  latestMouseX = event.clientX
  latestMouseY = event.clientY
  if (!isVisible.value) isVisible.value = true

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

  // Jejak partikel kursor aktif pada kualitas grafik Sedang/Tinggi (ringan & dibatasi maks 10)
  if (graphicsConfig.value.particleScale <= 0 || document.hidden) return
  const now = performance.now()
  const minInterval = graphicsConfig.value.enableCursorDust ? 48 : 88
  const dist = Math.hypot(event.clientX - lastTrailX, event.clientY - lastTrailY)

  if (now - lastTrailTime > minInterval && dist > 14) {
    lastTrailTime = now
    lastTrailX = event.clientX
    lastTrailY = event.clientY

    const spec = activeShapeSpec.value
    const tones: TrailTone[] = isDarkTheme.value
      ? ['primary', 'secondary', 'primary', 'stroke']
      : ['primary', 'secondary']
    const tone = tones[Math.floor(Math.random() * tones.length)] ?? 'primary'

    const id = ++trailIdCounter
    const newParticle: TrailParticle = {
      id,
      x: event.clientX + (Math.random() - 0.5) * 10,
      y: event.clientY + (Math.random() - 0.5) * 10,
      size: spec.trailKind === 'ripple' ? 14 + Math.random() * 6 : 9 + Math.random() * 6,
      tone,
      rotation: Math.round((Math.random() - 0.5) * 56),
      kind: spec.trailKind,
    }

    trails.value = [...trails.value.slice(-9), newParticle]

    setTimeout(() => {
      trails.value = trails.value.filter(p => p.id !== id)
    }, 640)
  }
}

function handlePointerDown(event: PointerEvent) {
  if (!isEnabled.value) return
  if (event.pointerType === 'mouse') {
    isPressed.value = true
    scheduleCursorTransform()
  }
  if (event.pointerType !== 'mouse' || graphicsConfig.value.enableCursorDust) {
    spawnTapRipple(event.clientX, event.clientY)
  }
}

function handlePointerUp() {
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
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const finePointer = window.matchMedia('(pointer: fine)').matches
  isTouchDevice.value = coarsePointer || !finePointer

  syncDocumentCursorClass()

  window.addEventListener('mousemove', handleMouseMove, { passive: true })
  window.addEventListener('pointerdown', handlePointerDown, { passive: true })
  window.addEventListener('pointerup', handlePointerUp, { passive: true })
  window.addEventListener('blur', handleWindowBlur)
  document.addEventListener('mouseleave', handleMouseLeave)
})

onUnmounted(() => {
  if (cursorRafId !== null) cancelAnimationFrame(cursorRafId)
  if (import.meta.client) {
    document.documentElement.classList.remove('star-cursor-active')
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('pointerdown', handlePointerDown)
    window.removeEventListener('pointerup', handlePointerUp)
    window.removeEventListener('blur', handleWindowBlur)
    document.removeEventListener('mouseleave', handleMouseLeave)
  }
})
</script>

<template>
  <!-- Layer Kursor Bertema Dinamis (Desktop) + Efek Tap Ripple Bertema (HP & Desktop) -->
  <div
    v-if="isEnabled"
    aria-hidden="true"
    class="pointer-events-none fixed inset-0 z-[9999] overflow-hidden"
  >
    <!-- 1. Efek Tap Ripple Bertema (100% mengikuti variabel warna tema & mode aktif) -->
    <div
      v-for="ripple in tapRipples"
      :key="ripple.id"
      class="animate-tap-ripple pointer-events-none fixed left-0 top-0 flex items-center justify-center rounded-full border-2"
      :style="{
        left: `${ripple.x - 20}px`,
        top: `${ripple.y - 20}px`,
        width: '40px',
        height: '40px',
        borderColor: cursorFillVar,
        color: cursorStrokeVar,
        boxShadow: `0 0 12px ${cursorFillVar}, inset 0 0 8px ${cursorSecondaryVar}`,
      }"
    >
      <span class="text-xs leading-none">{{ ripple.symbol }}</span>
    </div>

    <!-- 2. Jejak Partikel Kursor (Desktop — 100% mengikuti variabel warna tema & kontras mode aktif) -->
    <template v-if="isDesktopCursorActive">
      <svg
        v-for="particle in trails"
        :key="particle.id"
        class="animate-trail-fade pointer-events-none fixed left-0 top-0"
        :style="{
          left: `${particle.x - particle.size / 2}px`,
          top: `${particle.y - particle.size / 2}px`,
          width: `${particle.size}px`,
          height: `${particle.size}px`,
          transform: `rotate(${particle.rotation}deg)`,
        }"
        viewBox="0 0 24 24"
        fill="none"
      >
        <template v-if="particle.kind === 'paw'">
          <ellipse cx="12" cy="15.5" rx="4.5" ry="3.5" :fill="resolveTrailFill(particle.tone)" :stroke="isDarkTheme ? 'none' : cursorStrokeVar" stroke-width="0.9" />
          <circle cx="7" cy="10.5" r="2" :fill="resolveTrailFill(particle.tone)" />
          <circle cx="10.3" cy="8.2" r="2" :fill="resolveTrailFill(particle.tone)" />
          <circle cx="13.7" cy="8.2" r="2" :fill="resolveTrailFill(particle.tone)" />
          <circle cx="17" cy="10.5" r="2" :fill="resolveTrailFill(particle.tone)" />
        </template>
        <template v-else-if="particle.kind === 'ripple'">
          <circle cx="12" cy="12" r="9" :stroke="resolveTrailFill(particle.tone)" stroke-width="2.1" />
          <circle cx="12" cy="12" r="4" :stroke="cursorStrokeVar" stroke-width="1.2" opacity="0.7" />
        </template>
        <template v-else-if="particle.kind === 'leaf'">
          <path d="M5 18 C7 8, 15 5, 20 5 C19 12, 14 19, 5 18 Z" :fill="resolveTrailFill(particle.tone)" :stroke="isDarkTheme ? 'none' : cursorStrokeVar" stroke-width="0.9" />
        </template>
        <template v-else-if="particle.kind === 'petal'">
          <path d="M12 4 C17 7, 19 14, 12 20 C5 14, 7 7, 12 4 Z" :fill="resolveTrailFill(particle.tone)" :stroke="isDarkTheme ? 'none' : cursorStrokeVar" stroke-width="0.9" />
        </template>
        <template v-else-if="particle.kind === 'bubble'">
          <circle cx="12" cy="12" r="7.5" :stroke="isDarkTheme ? resolveTrailFill(particle.tone) : cursorStrokeVar" stroke-width="1.8" :fill="resolveTrailFill(particle.tone)" fill-opacity="0.28" />
          <circle cx="9.5" cy="9.5" r="1.8" fill="#ffffff" opacity="0.9" />
        </template>
        <template v-else-if="particle.kind === 'diamond'">
          <path d="M12 2 L19 12 L12 22 L5 12 Z" :fill="resolveTrailFill(particle.tone)" :stroke="isDarkTheme ? 'none' : cursorStrokeVar" stroke-width="0.9" />
        </template>
        <template v-else-if="particle.kind === 'bolt'">
          <path d="M14 2 L5 13 H12 L10 22 L19 11 H12 Z" :fill="resolveTrailFill(particle.tone)" :stroke="isDarkTheme ? 'none' : cursorStrokeVar" stroke-width="0.9" />
        </template>
        <template v-else>
          <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" :fill="resolveTrailFill(particle.tone)" :stroke="isDarkTheme ? 'none' : cursorStrokeVar" stroke-width="0.9" />
        </template>
      </svg>

      <!-- 3. Ikon Utama Kursor Kustom (12 Gaya — 100% Terikat Variabel Warna Tema & Kontras Terang/Gelap) -->
      <div
        ref="cursorElRef"
        v-show="isVisible && !isHoveringPetCat"
        class="pointer-events-none fixed left-0 top-0"
        style="transform: translate3d(-100px, -100px, 0)"
      >
        <svg
          class="pointer-events-none h-7 w-7"
          :class="{ 'animate-cursor-spin': isHoveringClickable && (activeCursor === 'starlight-wand' || activeCursor === 'ice-crystal' || activeCursor === 'astral-prism') }"
          :style="{ filter: cursorFilterStyle }"
          viewBox="0 0 36 36"
          fill="none"
        >
          <!-- 1. ✦ Starlight Wand -->
          <g v-if="activeCursor === 'starlight-wand'">
            <path
              d="M18 3.5 L21.9 12.6 L31.8 13.6 L24.3 20.1 L26.5 29.8 L18 24.7 L9.5 29.8 L11.7 20.1 L4.2 13.6 L14.1 12.6 Z"
              :fill="cursorFillVar"
              :stroke="cursorStrokeVar"
              :stroke-width="cursorStrokeWidth"
              stroke-linejoin="round"
            />
            <circle cx="15" cy="15" r="2.2" :fill="cursorHighlightFill" opacity="0.96" />
          </g>

          <!-- 2. 🐾 Cat Paw -->
          <g v-else-if="activeCursor === 'cat-paw'">
            <ellipse cx="18" cy="23.5" rx="7.8" ry="6" :fill="cursorFillVar" :stroke="cursorStrokeVar" :stroke-width="cursorStrokeWidth" />
            <ellipse cx="9.2" cy="15.5" rx="3.2" ry="4" transform="rotate(-18 9.2 15.5)" :fill="cursorSecondaryVar" :stroke="cursorStrokeVar" :stroke-width="cursorStrokeWidth - 0.1" />
            <ellipse cx="15" cy="11.2" rx="3.2" ry="4.2" transform="rotate(-6 15 11.2)" :fill="cursorSecondaryVar" :stroke="cursorStrokeVar" :stroke-width="cursorStrokeWidth - 0.1" />
            <ellipse cx="21.4" cy="11.2" rx="3.2" ry="4.2" transform="rotate(6 21.4 11.2)" :fill="cursorSecondaryVar" :stroke="cursorStrokeVar" :stroke-width="cursorStrokeWidth - 0.1" />
            <ellipse cx="26.8" cy="15.5" rx="3.2" ry="4" transform="rotate(18 26.8 15.5)" :fill="cursorSecondaryVar" :stroke="cursorStrokeVar" :stroke-width="cursorStrokeWidth - 0.1" />
            <ellipse cx="18" cy="24" rx="3.3" ry="2.1" :fill="cursorHighlightFill" opacity="0.88" />
          </g>

          <!-- 3. 🌧️ Raindrop Ripple -->
          <g v-else-if="activeCursor === 'raindrop-ripple'">
            <path
              d="M18 4 C18 4, 29 16.5, 29 22.8 C29 28.8, 24.1 33, 18 33 C11.9 33, 7 28.8, 7 22.8 C7 16.5, 18 4, 18 4 Z"
              :fill="cursorFillVar"
              :stroke="cursorStrokeVar"
              :stroke-width="cursorStrokeWidth"
              stroke-linejoin="round"
            />
            <path d="M13.5 22.5 C13.5 19, 15.5 16.5, 17 14" :stroke="cursorHighlightFill" stroke-width="2.2" stroke-linecap="round" opacity="0.95" />
          </g>

          <!-- 4. 🍂 Maple Leaf -->
          <g v-else-if="activeCursor === 'maple-leaf'">
            <path
              d="M18 4 L21 12 L29 10 L24 17 L31 20 L23 24 L25 29 L18 26 L11 29 L13 24 L5 20 L12 17 L7 10 L15 12 Z"
              :fill="cursorFillVar"
              :stroke="cursorStrokeVar"
              :stroke-width="cursorStrokeWidth"
              stroke-linejoin="round"
            />
            <path d="M18 26 V33" :stroke="cursorStrokeVar" :stroke-width="cursorStrokeWidth" stroke-linecap="round" />
            <path d="M18 11 V24" :stroke="cursorHighlightFill" stroke-width="1.5" stroke-linecap="round" opacity="0.92" />
          </g>

          <!-- 5. 🌸 Sakura Petal -->
          <g v-else-if="activeCursor === 'sakura-petal'">
            <path
              d="M18 6 C25 8, 30 16, 25 25 C22 29, 18 32, 18 32 C18 32, 14 29, 11 25 C6 16, 11 8, 18 6 Z"
              :fill="cursorFillVar"
              :stroke="cursorStrokeVar"
              :stroke-width="cursorStrokeWidth"
            />
            <path d="M18 6 L16.2 10.5 L18 9.2 L19.8 10.5 Z" :fill="cursorHighlightFill" />
            <path d="M18 12 V26" :stroke="isDarkTheme ? cursorSecondaryVar : cursorHighlightFill" stroke-width="1.6" stroke-linecap="round" />
          </g>

          <!-- 6. 🍵 Matcha Whisk / Leaf -->
          <g v-else-if="activeCursor === 'matcha-leaf'">
            <path
              d="M7 28 C9 12, 20 6, 30 6 C29 18, 22 29, 7 28 Z"
              :fill="cursorFillVar"
              :stroke="cursorStrokeVar"
              :stroke-width="cursorStrokeWidth"
              stroke-linejoin="round"
            />
            <path d="M7 28 Q17 18 27 9" :stroke="cursorHighlightFill" stroke-width="1.8" stroke-linecap="round" />
            <path d="M14 22 L19 23 M18 17 L23 18" :stroke="cursorHighlightFill" stroke-width="1.4" stroke-linecap="round" opacity="0.92" />
          </g>

          <!-- 7. 🪼 Jellyfish Glow -->
          <g v-else-if="activeCursor === 'jellyfish-glow'">
            <path
              d="M7 18 C7 9.5, 29 9.5, 29 18 C25 20.5, 11 20.5, 7 18 Z"
              :fill="cursorFillVar"
              :stroke="cursorStrokeVar"
              :stroke-width="cursorStrokeWidth"
            />
            <path d="M12 20 Q10 25 12 30 M18 20.5 Q18 26 17 31 M24 20 Q26 25 24 30" :stroke="isDarkTheme ? cursorSecondaryVar : cursorStrokeVar" :stroke-width="cursorStrokeWidth" stroke-linecap="round" />
            <ellipse cx="14.5" cy="14" rx="3" ry="1.6" :fill="cursorHighlightFill" opacity="0.9" />
          </g>

          <!-- 8. ✒️ Golden Quill -->
          <g v-else-if="activeCursor === 'golden-quill'">
            <path
              d="M7 30 L13 18 C16 11, 23 6, 30 5 C28 13, 24 20, 17 24 L7 30 Z"
              :fill="cursorFillVar"
              :stroke="cursorStrokeVar"
              :stroke-width="cursorStrokeWidth"
              stroke-linejoin="round"
            />
            <path d="M7 30 L27 8" :stroke="cursorStrokeVar" :stroke-width="cursorStrokeWidth" stroke-linecap="round" />
            <circle cx="9" cy="28" r="1.8" :fill="cursorHighlightFill" />
          </g>

          <!-- 9. ☁️ Fluffy Cloud -->
          <g v-else-if="activeCursor === 'fluffy-cloud'">
            <path
              d="M11 26 H25 C28.5 26, 31 23.5, 31 20.2 C31 17.2, 28.8 14.8, 25.8 14.5 C24.8 10.6, 21.3 8, 17.2 8 C12.4 8, 8.6 11.7, 8.5 16.4 C6.2 17.3, 4.8 19.3, 4.8 21.6 C4.8 24.2, 7.2 26, 11 26 Z"
              :fill="isDarkTheme ? cursorSecondaryVar : cursorFillVar"
              :stroke="cursorStrokeVar"
              :stroke-width="cursorStrokeWidth"
              stroke-linejoin="round"
            />
            <circle cx="15" cy="18.5" r="1.35" :fill="isDarkTheme ? '#0f172a' : cursorStrokeVar" />
            <circle cx="21" cy="18.5" r="1.35" :fill="isDarkTheme ? '#0f172a' : cursorStrokeVar" />
            <path d="M16.8 20.5 Q18 22 19.2 20.5" :stroke="isDarkTheme ? '#0f172a' : cursorStrokeVar" stroke-width="1.4" stroke-linecap="round" />
          </g>

          <!-- 10. ❄️ Ice Crystal -->
          <g v-else-if="activeCursor === 'ice-crystal'">
            <g :stroke="isDarkTheme ? cursorFillVar : cursorStrokeVar" stroke-width="2.2" stroke-linecap="round">
              <line x1="18" y1="4" x2="18" y2="32" />
              <line x1="6" y1="11" x2="30" y2="25" />
              <line x1="30" y1="11" x2="6" y2="25" />
            </g>
            <polygon points="18,12 23,18 18,24 13,18" :fill="cursorFillVar" :stroke="cursorStrokeVar" :stroke-width="cursorStrokeWidth" />
          </g>

          <!-- 11. 💎 Astral Prism -->
          <g v-else-if="activeCursor === 'astral-prism'">
            <polygon
              points="18,3 30,14 18,33 6,14"
              :fill="cursorFillVar"
              :stroke="cursorStrokeVar"
              :stroke-width="cursorStrokeWidth"
              stroke-linejoin="round"
            />
            <polyline points="6,14 18,17 30,14" :stroke="isDarkTheme ? cursorSecondaryVar : cursorStrokeVar" stroke-width="1.5" opacity="0.85" />
            <line x1="18" y1="3" x2="18" y2="33" :stroke="cursorHighlightFill" stroke-width="1.5" opacity="0.85" />
          </g>

          <!-- 12. ⚡ Cyber Neon Bolt -->
          <g v-else-if="activeCursor === 'cyber-neon-bolt'">
            <path
              d="M21 3 L7 19 H17 L14 33 L29 16 H19 Z"
              :fill="cursorFillVar"
              :stroke="cursorStrokeVar"
              :stroke-width="cursorStrokeWidth"
              stroke-linejoin="round"
            />
            <path d="M19 8 L12 17 H18" :stroke="cursorHighlightFill" stroke-width="1.6" stroke-linecap="round" opacity="0.95" />
          </g>
        </svg>
      </div>
    </template>
  </div>
</template>
