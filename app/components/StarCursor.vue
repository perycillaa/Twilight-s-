<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  type CursorStyleId,
  useTwilightStorage,
} from '~/composables/useTwilightStorage'

const { activeCursor, isDarkTheme, graphicsConfig } = useTwilightStorage()

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

interface TrailParticle {
  id: number
  x: number
  y: number
  size: number
  color: string
  rotation: number
  kind: 'star' | 'paw' | 'ripple' | 'leaf' | 'petal' | 'bubble' | 'diamond' | 'bolt'
}

interface TapRipple {
  id: number
  x: number
  y: number
  color: string
  secondaryColor: string
  symbol: string
}

const trails = ref<TrailParticle[]>([])
const tapRipples = ref<TapRipple[]>([])
let lastTrailTime = 0
let lastTrailX = -100
let lastTrailY = -100
let trailIdCounter = 0
let rippleIdCounter = 0

interface CursorVisualSpec {
  fill: string
  stroke: string
  secondary: string
  glow: string
  trailColors: string[]
  trailKind: TrailParticle['kind']
  tapSymbol: string
}

const CURSOR_VISUALS: Record<Exclude<CursorStyleId, 'off'>, CursorVisualSpec> = {
  'starlight-wand': {
    fill: '#f9a8d4',
    stroke: '#ffffff',
    secondary: '#c084fc',
    glow: 'drop-shadow(0 0 7px rgba(249, 168, 212, 0.9)) drop-shadow(0 0 14px rgba(192, 132, 252, 0.6))',
    trailColors: ['#f9a8d4', '#fbcfe8', '#c084fc', '#fef08a'],
    trailKind: 'star',
    tapSymbol: '✦',
  },
  'cat-paw': {
    fill: '#fda4af',
    stroke: '#fff1f2',
    secondary: '#f43f5e',
    glow: 'drop-shadow(0 0 7px rgba(253, 164, 175, 0.85))',
    trailColors: ['#fda4af', '#fbcfe8', '#f9a8d4'],
    trailKind: 'paw',
    tapSymbol: '🐾',
  },
  'raindrop-ripple': {
    fill: '#60a5fa',
    stroke: '#e0f2fe',
    secondary: '#93c5fd',
    glow: 'drop-shadow(0 0 8px rgba(96, 165, 250, 0.92))',
    trailColors: ['#60a5fa', '#93c5fd', '#bae6fd'],
    trailKind: 'ripple',
    tapSymbol: '💧',
  },
  'maple-leaf': {
    fill: '#fb923c',
    stroke: '#fef3c7',
    secondary: '#fbbf24',
    glow: 'drop-shadow(0 0 8px rgba(251, 146, 60, 0.9))',
    trailColors: ['#fb923c', '#fbbf24', '#f59e0b', '#fde68a'],
    trailKind: 'leaf',
    tapSymbol: '🍂',
  },
  'sakura-petal': {
    fill: '#f472b6',
    stroke: '#fff1f2',
    secondary: '#fde68a',
    glow: 'drop-shadow(0 0 8px rgba(244, 114, 182, 0.92))',
    trailColors: ['#f472b6', '#fbcfe8', '#fda4af', '#fde68a'],
    trailKind: 'petal',
    tapSymbol: '🌸',
  },
  'matcha-leaf': {
    fill: '#4ade80',
    stroke: '#ecfdf5',
    secondary: '#15803d',
    glow: 'drop-shadow(0 0 8px rgba(74, 222, 128, 0.9))',
    trailColors: ['#4ade80', '#86efac', '#22c55e', '#bbf7d0'],
    trailKind: 'leaf',
    tapSymbol: '🍃',
  },
  'jellyfish-glow': {
    fill: '#00f5d4',
    stroke: '#ecfeff',
    secondary: '#22d3ee',
    glow: 'drop-shadow(0 0 9px rgba(0, 245, 212, 0.95)) drop-shadow(0 0 16px rgba(34, 211, 238, 0.65))',
    trailColors: ['#00f5d4', '#2dd4bf', '#22d3ee', '#a5f3fc'],
    trailKind: 'bubble',
    tapSymbol: '🫧',
  },
  'golden-quill': {
    fill: '#fcd34d',
    stroke: '#fffbeb',
    secondary: '#b45309',
    glow: 'drop-shadow(0 0 8px rgba(252, 211, 77, 0.9))',
    trailColors: ['#fcd34d', '#fde68a', '#f59e0b', '#fef3c7'],
    trailKind: 'star',
    tapSymbol: '✨',
  },
  'fluffy-cloud': {
    fill: '#bae6fd',
    stroke: '#ffffff',
    secondary: '#93c5fd',
    glow: 'drop-shadow(0 0 8px rgba(147, 197, 253, 0.9))',
    trailColors: ['#93c5fd', '#bae6fd', '#c4b5fd', '#ffffff'],
    trailKind: 'bubble',
    tapSymbol: '☁️',
  },
  'ice-crystal': {
    fill: '#bae6fd',
    stroke: '#ffffff',
    secondary: '#38bdf8',
    glow: 'drop-shadow(0 0 9px rgba(125, 211, 252, 0.95))',
    trailColors: ['#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8'],
    trailKind: 'diamond',
    tapSymbol: '❄️',
  },
  'astral-prism': {
    fill: '#34d399',
    stroke: '#fef08a',
    secondary: '#fde047',
    glow: 'drop-shadow(0 0 9px rgba(52, 211, 153, 0.95)) drop-shadow(0 0 16px rgba(253, 224, 71, 0.65))',
    trailColors: ['#34d399', '#fde047', '#6ee7b7', '#a78bfa'],
    trailKind: 'diamond',
    tapSymbol: '💎',
  },
  'cyber-neon-bolt': {
    fill: '#00f5d4',
    stroke: '#ff2a85',
    secondary: '#ff2a85',
    glow: 'drop-shadow(0 0 8px rgba(0, 245, 212, 0.95)) drop-shadow(0 0 15px rgba(255, 42, 133, 0.8))',
    trailColors: ['#00f5d4', '#ff2a85', '#22d3ee', '#f472b6'],
    trailKind: 'bolt',
    tapSymbol: '⚡',
  },
}

const isEnabled = computed<boolean>(() => activeCursor.value !== 'off')
const isDesktopCursorActive = computed<boolean>(() => isEnabled.value && !isTouchDevice.value)
const activeSpec = computed<CursorVisualSpec>(() => {
  if (activeCursor.value === 'off') return CURSOR_VISUALS['starlight-wand']
  return CURSOR_VISUALS[activeCursor.value] ?? CURSOR_VISUALS['starlight-wand']
})

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

function spawnTapRipple(x: number, y: number) {
  if (!isEnabled.value || document.hidden) return
  const spec = activeSpec.value
  const id = ++rippleIdCounter
  const next: TapRipple = {
    id,
    x,
    y,
    color: spec.fill,
    secondaryColor: spec.secondary,
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

    const spec = activeSpec.value
    const color =
      spec.trailColors[Math.floor(Math.random() * spec.trailColors.length)] ?? spec.fill

    const id = ++trailIdCounter
    const newParticle: TrailParticle = {
      id,
      x: event.clientX + (Math.random() - 0.5) * 10,
      y: event.clientY + (Math.random() - 0.5) * 10,
      size: spec.trailKind === 'ripple' ? 14 + Math.random() * 6 : 9 + Math.random() * 6,
      color,
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
  // Efek tap ripple bertema (terutama terasa hidup di HP layar sentuh & saat klik di desktop)
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
    <!-- 1. Efek Tap Ripple Bertema (bekerja mulus di HP layar sentuh & klik desktop) -->
    <div
      v-for="ripple in tapRipples"
      :key="ripple.id"
      class="animate-tap-ripple pointer-events-none fixed left-0 top-0 flex items-center justify-center rounded-full border-2"
      :style="{
        left: `${ripple.x - 20}px`,
        top: `${ripple.y - 20}px`,
        width: '40px',
        height: '40px',
        borderColor: ripple.color,
        boxShadow: `0 0 12px ${ripple.color}, inset 0 0 8px ${ripple.secondaryColor}`,
      }"
    >
      <span class="text-xs leading-none">{{ ripple.symbol }}</span>
    </div>

    <!-- 2. Jejak Partikel Kursor (Desktop) -->
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
          <ellipse cx="12" cy="15.5" rx="4.5" ry="3.5" :fill="particle.color" />
          <circle cx="7" cy="10.5" r="2" :fill="particle.color" />
          <circle cx="10.3" cy="8.2" r="2" :fill="particle.color" />
          <circle cx="13.7" cy="8.2" r="2" :fill="particle.color" />
          <circle cx="17" cy="10.5" r="2" :fill="particle.color" />
        </template>
        <template v-else-if="particle.kind === 'ripple'">
          <circle cx="12" cy="12" r="9" :stroke="particle.color" stroke-width="2" />
          <circle cx="12" cy="12" r="4" :stroke="particle.color" stroke-width="1.2" opacity="0.6" />
        </template>
        <template v-else-if="particle.kind === 'leaf'">
          <path d="M5 18 C7 8, 15 5, 20 5 C19 12, 14 19, 5 18 Z" :fill="particle.color" />
        </template>
        <template v-else-if="particle.kind === 'petal'">
          <path d="M12 4 C17 7, 19 14, 12 20 C5 14, 7 7, 12 4 Z" :fill="particle.color" />
        </template>
        <template v-else-if="particle.kind === 'bubble'">
          <circle cx="12" cy="12" r="7.5" :stroke="particle.color" stroke-width="1.8" :fill="particle.color" fill-opacity="0.22" />
          <circle cx="9.5" cy="9.5" r="1.8" fill="#ffffff" opacity="0.85" />
        </template>
        <template v-else-if="particle.kind === 'diamond'">
          <path d="M12 2 L19 12 L12 22 L5 12 Z" :fill="particle.color" />
        </template>
        <template v-else-if="particle.kind === 'bolt'">
          <path d="M14 2 L5 13 H12 L10 22 L19 11 H12 Z" :fill="particle.color" />
        </template>
        <template v-else>
          <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" :fill="particle.color" />
        </template>
      </svg>

      <!-- 3. Ikon Utama Kursor Kustom (12 Gaya Unik, Posisi via RAF Nol Lag) -->
      <div
        ref="cursorElRef"
        v-show="isVisible && !isHoveringPetCat"
        class="pointer-events-none fixed left-0 top-0"
        style="transform: translate3d(-100px, -100px, 0)"
      >
        <svg
          class="pointer-events-none h-7 w-7"
          :class="{ 'animate-cursor-spin': isHoveringClickable && (activeCursor === 'starlight-wand' || activeCursor === 'ice-crystal' || activeCursor === 'astral-prism') }"
          :style="{
            filter: isDarkTheme ? activeSpec.glow : 'drop-shadow(0 2px 4px rgba(15, 23, 42, 0.35))',
          }"
          viewBox="0 0 36 36"
          fill="none"
        >
          <!-- 1. ✦ Starlight Wand -->
          <g v-if="activeCursor === 'starlight-wand'">
            <path
              d="M18 3.5 L21.9 12.6 L31.8 13.6 L24.3 20.1 L26.5 29.8 L18 24.7 L9.5 29.8 L11.7 20.1 L4.2 13.6 L14.1 12.6 Z"
              :fill="activeSpec.fill"
              :stroke="isDarkTheme ? activeSpec.stroke : '#4c1d95'"
              stroke-width="2"
              stroke-linejoin="round"
            />
            <circle cx="15" cy="15" r="2" fill="#ffffff" opacity="0.95" />
          </g>

          <!-- 2. 🐾 Cat Paw -->
          <g v-else-if="activeCursor === 'cat-paw'">
            <ellipse cx="18" cy="23.5" rx="7.8" ry="6" fill="#fda4af" stroke="#881337" stroke-width="1.8" />
            <ellipse cx="9.2" cy="15.5" rx="3.2" ry="4" transform="rotate(-18 9.2 15.5)" fill="#fbcfe8" stroke="#881337" stroke-width="1.6" />
            <ellipse cx="15" cy="11.2" rx="3.2" ry="4.2" transform="rotate(-6 15 11.2)" fill="#fbcfe8" stroke="#881337" stroke-width="1.6" />
            <ellipse cx="21.4" cy="11.2" rx="3.2" ry="4.2" transform="rotate(6 21.4 11.2)" fill="#fbcfe8" stroke="#881337" stroke-width="1.6" />
            <ellipse cx="26.8" cy="15.5" rx="3.2" ry="4" transform="rotate(18 26.8 15.5)" fill="#fbcfe8" stroke="#881337" stroke-width="1.6" />
            <ellipse cx="18" cy="24" rx="3.4" ry="2.2" fill="#fff1f2" opacity="0.7" />
          </g>

          <!-- 3. 🌧️ Raindrop Ripple -->
          <g v-else-if="activeCursor === 'raindrop-ripple'">
            <path
              d="M18 4 C18 4, 29 16.5, 29 22.8 C29 28.8, 24.1 33, 18 33 C11.9 33, 7 28.8, 7 22.8 C7 16.5, 18 4, 18 4 Z"
              fill="#60a5fa"
              stroke="#eff6ff"
              stroke-width="2"
              stroke-linejoin="round"
            />
            <path d="M13.5 22.5 C13.5 19, 15.5 16.5, 17 14" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" opacity="0.85" />
          </g>

          <!-- 4. 🍂 Maple Leaf -->
          <g v-else-if="activeCursor === 'maple-leaf'">
            <path
              d="M18 4 L21 12 L29 10 L24 17 L31 20 L23 24 L25 29 L18 26 L11 29 L13 24 L5 20 L12 17 L7 10 L15 12 Z"
              fill="#fb923c"
              stroke="#7c2d12"
              stroke-width="1.6"
              stroke-linejoin="round"
            />
            <path d="M18 26 V33" stroke="#7c2d12" stroke-width="2.2" stroke-linecap="round" />
            <path d="M18 11 V24" stroke="#fef3c7" stroke-width="1.4" stroke-linecap="round" opacity="0.8" />
          </g>

          <!-- 5. 🌸 Sakura Petal -->
          <g v-else-if="activeCursor === 'sakura-petal'">
            <path
              d="M18 6 C25 8, 30 16, 25 25 C22 29, 18 32, 18 32 C18 32, 14 29, 11 25 C6 16, 11 8, 18 6 Z"
              fill="#f472b6"
              stroke="#fff1f2"
              stroke-width="1.8"
            />
            <path d="M18 6 L16.2 10.5 L18 9.2 L19.8 10.5 Z" fill="#fff1f2" />
            <path d="M18 12 V26" stroke="#fbcfe8" stroke-width="1.6" stroke-linecap="round" />
          </g>

          <!-- 6. 🍵 Matcha Whisk / Leaf -->
          <g v-else-if="activeCursor === 'matcha-leaf'">
            <path
              d="M7 28 C9 12, 20 6, 30 6 C29 18, 22 29, 7 28 Z"
              fill="#4ade80"
              stroke="#064e3b"
              stroke-width="1.8"
              stroke-linejoin="round"
            />
            <path d="M7 28 Q17 18 27 9" stroke="#ecfdf5" stroke-width="1.8" stroke-linecap="round" />
            <path d="M14 22 L19 23 M18 17 L23 18" stroke="#ecfdf5" stroke-width="1.4" stroke-linecap="round" opacity="0.85" />
          </g>

          <!-- 7. 🪼 Jellyfish Glow -->
          <g v-else-if="activeCursor === 'jellyfish-glow'">
            <path
              d="M7 18 C7 9.5, 29 9.5, 29 18 C25 20.5, 11 20.5, 7 18 Z"
              fill="#00f5d4"
              stroke="#083344"
              stroke-width="1.7"
            />
            <path d="M12 20 Q10 25 12 30 M18 20.5 Q18 26 17 31 M24 20 Q26 25 24 30" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" />
            <ellipse cx="14.5" cy="14" rx="3" ry="1.6" fill="#ffffff" opacity="0.75" />
          </g>

          <!-- 8. ✒️ Golden Quill -->
          <g v-else-if="activeCursor === 'golden-quill'">
            <path
              d="M7 30 L13 18 C16 11, 23 6, 30 5 C28 13, 24 20, 17 24 L7 30 Z"
              fill="#fcd34d"
              stroke="#78350f"
              stroke-width="1.7"
              stroke-linejoin="round"
            />
            <path d="M7 30 L27 8" stroke="#78350f" stroke-width="1.8" stroke-linecap="round" />
            <circle cx="9" cy="28" r="1.8" fill="#fef9c3" />
          </g>

          <!-- 9. ☁️ Fluffy Cloud -->
          <g v-else-if="activeCursor === 'fluffy-cloud'">
            <path
              d="M11 26 H25 C28.5 26, 31 23.5, 31 20.2 C31 17.2, 28.8 14.8, 25.8 14.5 C24.8 10.6, 21.3 8, 17.2 8 C12.4 8, 8.6 11.7, 8.5 16.4 C6.2 17.3, 4.8 19.3, 4.8 21.6 C4.8 24.2, 7.2 26, 11 26 Z"
              fill="#e0f2fe"
              stroke="#1d4ed8"
              stroke-width="1.7"
              stroke-linejoin="round"
            />
            <circle cx="15" cy="18.5" r="1.3" fill="#1e3a8a" />
            <circle cx="21" cy="18.5" r="1.3" fill="#1e3a8a" />
            <path d="M16.8 20.5 Q18 22 19.2 20.5" stroke="#1e3a8a" stroke-width="1.3" stroke-linecap="round" />
          </g>

          <!-- 10. ❄️ Ice Crystal -->
          <g v-else-if="activeCursor === 'ice-crystal'">
            <g stroke="#38bdf8" stroke-width="2.4" stroke-linecap="round">
              <line x1="18" y1="4" x2="18" y2="32" />
              <line x1="6" y1="11" x2="30" y2="25" />
              <line x1="30" y1="11" x2="6" y2="25" />
            </g>
            <polygon points="18,12 23,18 18,24 13,18" fill="#ffffff" stroke="#0284c7" stroke-width="1.5" />
          </g>

          <!-- 11. 💎 Astral Prism -->
          <g v-else-if="activeCursor === 'astral-prism'">
            <polygon
              points="18,3 30,14 18,33 6,14"
              fill="#34d399"
              stroke="#fde047"
              stroke-width="2"
              stroke-linejoin="round"
            />
            <polyline points="6,14 18,17 30,14" stroke="#fef08a" stroke-width="1.5" />
            <line x1="18" y1="3" x2="18" y2="33" stroke="#ffffff" stroke-width="1.4" opacity="0.7" />
          </g>

          <!-- 12. ⚡ Cyber Neon Bolt -->
          <g v-else-if="activeCursor === 'cyber-neon-bolt'">
            <path
              d="M21 3 L7 19 H17 L14 33 L29 16 H19 Z"
              fill="#00f5d4"
              stroke="#ff2a85"
              stroke-width="2.2"
              stroke-linejoin="round"
            />
            <path d="M19 8 L12 17 H18" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity="0.85" />
          </g>
        </svg>
      </div>
    </template>
  </div>
</template>
