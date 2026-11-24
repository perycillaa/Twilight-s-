<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  type CozyThemeId,
  type ThemeName,
  useTwilightStorage,
} from '~/composables/useTwilightStorage'

// Ambil tema header, Tema Latar Belakang Beranimasi (Cozy Theme), status Hujan Lembut, & Mode Hemat Baterai
const { theme, activeCozyTheme, isRainAmbientOn, isBatterySaverMode } = useTwilightStorage()

interface BgPalette {
  gradient: string
  orb1: string
  orb2: string
  orb3: string
  moon: string
  charmAccent: string
  cloudFill: string
  tailGradient: string
}

const themeBgConfig: Record<ThemeName, BgPalette> = {
  twilight: {
    gradient: 'from-[#1e1b4b] via-[#261647] to-[#311042]',
    orb1: 'bg-pink-400/20',
    orb2: 'bg-purple-500/20',
    orb3: 'bg-indigo-400/15',
    moon: '#fef08a',
    charmAccent: '#f9a8d4',
    cloudFill: '#e9d5ff',
    tailGradient: 'from-white via-pink-200 to-transparent',
  },
  sakura: {
    gradient: 'from-[#3b153e] via-[#6b2458] to-[#8f3858]',
    orb1: 'bg-rose-300/25',
    orb2: 'bg-pink-400/20',
    orb3: 'bg-amber-200/15',
    moon: '#fde68a',
    charmAccent: '#fda4af',
    cloudFill: '#fecdd3',
    tailGradient: 'from-white via-rose-200 to-transparent',
  },
  ocean: {
    gradient: 'from-[#091630] via-[#0e2a4a] to-[#133b5c]',
    orb1: 'bg-sky-400/20',
    orb2: 'bg-cyan-400/20',
    orb3: 'bg-indigo-400/15',
    moon: '#e0f2fe',
    charmAccent: '#7dd3fc',
    cloudFill: '#bae6fd',
    tailGradient: 'from-white via-sky-200 to-transparent',
  },
}

const cozyBgConfig: Record<Exclude<CozyThemeId, 'classic'>, BgPalette> = {
  'midnight-rain': {
    gradient: 'from-[#070b22] via-[#10183d] to-[#1a224d]',
    orb1: 'bg-indigo-500/20',
    orb2: 'bg-sky-500/15',
    orb3: 'bg-amber-400/10',
    moon: '#e0f2fe',
    charmAccent: '#93c5fd',
    cloudFill: '#94a3b8',
    tailGradient: 'from-white via-sky-200 to-transparent',
  },
  'autumn-cafe': {
    gradient: 'from-[#28150d] via-[#4a2617] to-[#7c3d1e]',
    orb1: 'bg-amber-500/20',
    orb2: 'bg-orange-400/20',
    orb3: 'bg-yellow-300/15',
    moon: '#fde68a',
    charmAccent: '#fdba74',
    cloudFill: '#fed7aa',
    tailGradient: 'from-[#fff7ed] via-amber-200 to-transparent',
  },
  'sakura-lantern': {
    gradient: 'from-[#240e38] via-[#4b174d] to-[#7a2356]',
    orb1: 'bg-fuchsia-400/20',
    orb2: 'bg-pink-400/20',
    orb3: 'bg-amber-300/18',
    moon: '#fef08a',
    charmAccent: '#f9a8d4',
    cloudFill: '#fbcfe8',
    tailGradient: 'from-white via-pink-200 to-transparent',
  },
  'astral-palace': {
    gradient: 'from-[#04071a] via-[#0b1336] to-[#1b1042]',
    orb1: 'bg-emerald-400/15',
    orb2: 'bg-cyan-400/15',
    orb3: 'bg-amber-300/15',
    moon: '#f1f5f9',
    charmAccent: '#fde047',
    cloudFill: '#cbd5e1',
    tailGradient: 'from-[#fef9c3] via-amber-200 to-transparent',
  },
}

const activeBg = computed<BgPalette>(() => {
  if (activeCozyTheme.value !== 'classic') {
    return cozyBgConfig[activeCozyTheme.value]
  }
  return themeBgConfig[theme.value] ?? themeBgConfig.twilight
})

// Tampilkan hujan apabila tema Midnight Rainy Window aktif ATAU sakelar Hujan Lembut di BGM Player menyala
const showRainLayer = computed<boolean>(() => {
  if (isBatterySaverMode.value) return false
  return activeCozyTheme.value === 'midnight-rain' || isRainAmbientOn.value
})

// Daftar bintang kecil berkedip statis (aman untuk SSR tanpa hydration mismatch)
const tinyStars = [
  { top: '6%', left: '8%', size: 3, duration: '3.2s', delay: '0.2s' },
  { top: '12%', left: '24%', size: 2, duration: '4.1s', delay: '1.1s' },
  { top: '8%', left: '42%', size: 3, duration: '3.7s', delay: '0.5s' },
  { top: '16%', left: '61%', size: 2, duration: '4.5s', delay: '1.7s' },
  { top: '9%', left: '78%', size: 3, duration: '3.4s', delay: '0.8s' },
  { top: '19%', left: '91%', size: 2, duration: '4.0s', delay: '2.0s' },
  { top: '28%', left: '14%', size: 2, duration: '3.9s', delay: '1.4s' },
  { top: '34%', left: '36%', size: 3, duration: '4.8s', delay: '0.3s' },
  { top: '31%', left: '53%', size: 2, duration: '3.3s', delay: '2.2s' },
  { top: '27%', left: '84%', size: 3, duration: '4.2s', delay: '0.9s' },
  { top: '46%', left: '6%', size: 2, duration: '3.6s', delay: '1.6s' },
  { top: '52%', left: '95%', size: 3, duration: '4.4s', delay: '0.4s' },
  { top: '63%', left: '18%', size: 2, duration: '3.8s', delay: '1.9s' },
  { top: '71%', left: '44%', size: 2, duration: '4.6s', delay: '0.7s' },
  { top: '68%', left: '75%', size: 3, duration: '3.5s', delay: '1.3s' },
  { top: '82%', left: '10%', size: 3, duration: '4.3s', delay: '2.1s' },
  { top: '88%', left: '31%', size: 2, duration: '3.1s', delay: '0.6s' },
  { top: '85%', left: '66%', size: 2, duration: '4.7s', delay: '1.5s' },
  { top: '91%', left: '88%', size: 3, duration: '3.9s', delay: '1.0s' },
  { top: '42%', left: '70%', size: 2, duration: '4.1s', delay: '2.4s' },
  { top: '22%', left: '48%', size: 2, duration: '3.5s', delay: '1.1s' },
  { top: '58%', left: '82%', size: 3, duration: '4.2s', delay: '0.7s' },
]

// Bintang sparkle 4-sisi menggemaskan
const sparkles = [
  { top: '11%', left: '17%', size: 16, delay: '0.4s', color: '#fbcfe8' },
  { top: '14%', left: '72%', size: 18, delay: '1.2s', color: '#e9d5ff' },
  { top: '39%', left: '92%', size: 14, delay: '0.9s', color: '#fde68a' },
  { top: '77%', left: '5%', size: 16, delay: '1.8s', color: '#f9a8d4' },
  { top: '89%', left: '52%', size: 15, delay: '0.2s', color: '#bae6fd' },
]

// Bintang Jatuh (Shooting Stars) — lebih sering & dramatis saat tema Astral Crystal Palace aktif
const baseShootingStars = [
  { top: '6%', left: '32%', width: '150px', duration: '6.2s', delay: '0.3s' },
  { top: '12%', left: '74%', width: '175px', duration: '7.4s', delay: '1.8s' },
  { top: '26%', left: '92%', width: '160px', duration: '6.8s', delay: '3.2s' },
  { top: '44%', left: '58%', width: '140px', duration: '8.2s', delay: '4.5s' },
  { top: '18%', left: '52%', width: '155px', duration: '7.8s', delay: '5.7s' },
  { top: '58%', left: '88%', width: '145px', duration: '9.0s', delay: '2.6s' },
]

const astralExtraShootingStars = [
  { top: '9%', left: '86%', width: '190px', duration: '5.2s', delay: '0.9s' },
  { top: '21%', left: '64%', width: '170px', duration: '5.8s', delay: '2.4s' },
  { top: '34%', left: '82%', width: '165px', duration: '6.0s', delay: '3.9s' },
]

const displayedShootingStars = computed(() =>
  activeCozyTheme.value === 'astral-palace'
    ? [...baseShootingStars, ...astralExtraShootingStars]
    : baseShootingStars,
)

// 44 Rintik Hujan Miring Halus (untuk Midnight Rainy Window & sakelar Hujan BGM)
const rainDrops = Array.from({ length: 44 }, (_, idx) => ({
  left: `${(idx * 2.4 + (idx % 5) * 1.2) % 100}%`,
  height: `${18 + (idx % 4) * 10}px`,
  duration: `${0.95 + (idx % 5) * 0.2}s`,
  delay: `${(idx % 11) * 0.18}s`,
}))

// 14 Titik Lampu Kota Blur (Bokeh Emas & Biru Lembut) khusus Midnight Rainy Window
const cityBokehLights = [
  { bottom: '8%', left: '6%', size: 58, color: 'bg-amber-300/35', opacity: 0.34, duration: '6.8s', delay: '0s', dx: '10px' },
  { bottom: '18%', left: '14%', size: 34, color: 'bg-sky-300/35', opacity: 0.3, duration: '7.5s', delay: '1.1s', dx: '-8px' },
  { bottom: '12%', left: '25%', size: 72, color: 'bg-yellow-200/30', opacity: 0.28, duration: '8.4s', delay: '0.6s', dx: '12px' },
  { bottom: '28%', left: '31%', size: 28, color: 'bg-blue-300/40', opacity: 0.35, duration: '6.2s', delay: '2.0s', dx: '-6px' },
  { bottom: '9%', left: '42%', size: 46, color: 'bg-amber-400/35', opacity: 0.32, duration: '7.1s', delay: '1.5s', dx: '9px' },
  { bottom: '22%', left: '53%', size: 64, color: 'bg-sky-400/25', opacity: 0.28, duration: '9.0s', delay: '0.4s', dx: '-10px' },
  { bottom: '14%', left: '62%', size: 38, color: 'bg-amber-200/40', opacity: 0.36, duration: '6.5s', delay: '2.4s', dx: '7px' },
  { bottom: '32%', left: '71%', size: 50, color: 'bg-indigo-300/30', opacity: 0.3, duration: '7.9s', delay: '0.9s', dx: '-9px' },
  { bottom: '10%', left: '78%', size: 78, color: 'bg-amber-300/30', opacity: 0.3, duration: '8.6s', delay: '1.7s', dx: '11px' },
  { bottom: '24%', left: '88%', size: 42, color: 'bg-cyan-300/35', opacity: 0.34, duration: '6.9s', delay: '0.3s', dx: '-7px' },
  { bottom: '6%', left: '93%', size: 56, color: 'bg-yellow-300/30', opacity: 0.32, duration: '7.7s', delay: '2.2s', dx: '8px' },
  { bottom: '38%', left: '19%', size: 26, color: 'bg-amber-200/35', opacity: 0.26, duration: '8.2s', delay: '1.3s', dx: '6px' },
  { bottom: '42%', left: '84%', size: 30, color: 'bg-sky-200/35', opacity: 0.28, duration: '7.3s', delay: '2.6s', dx: '-8px' },
  { bottom: '16%', left: '4%', size: 32, color: 'bg-blue-400/30', opacity: 0.28, duration: '6.4s', delay: '1.8s', dx: '9px' },
]

// 16 Daun Musim Gugur (Oranye, Karamel & Emas) khusus Cozy Autumn Cafe
const autumnLeaves = Array.from({ length: 16 }, (_, idx) => {
  const colors = ['#fb923c', '#f59e0b', '#fde047', '#ea580c', '#fdba74']
  return {
    left: `${(idx * 6.4 + (idx % 3) * 2.1) % 96}%`,
    size: 16 + (idx % 4) * 5,
    color: colors[idx % colors.length] ?? '#fb923c',
    duration: `${11.5 + (idx % 5) * 2.1}s`,
    delay: `${(idx % 8) * 1.4}s`,
    sway: `${(idx % 2 === 0 ? 1 : -1) * (28 + (idx % 4) * 12)}px`,
    endX: `${(idx % 2 === 0 ? -1 : 1) * (20 + (idx % 3) * 14)}px`,
  }
})

// 14 Partikel Cahaya Sore Hangat khusus Cozy Autumn Cafe
const cafeWarmMotes = Array.from({ length: 14 }, (_, idx) => ({
  top: `${12 + (idx * 7.2) % 78}%`,
  left: `${6 + (idx * 8.1) % 88}%`,
  size: 4 + (idx % 4) * 3,
  duration: `${6.2 + (idx % 5) * 1.4}s`,
  delay: `${(idx % 7) * 0.9}s`,
}))

// 18 Kelopak Bunga Sakura Pink Melayang Berputar khusus Sakura Lantern Festival
const sakuraPetals = Array.from({ length: 18 }, (_, idx) => {
  const fills = ['#fbcfe8', '#f9a8d4', '#fda4af', '#fce7f3']
  return {
    left: `${(idx * 5.7 + (idx % 4) * 1.8) % 98}%`,
    size: 12 + (idx % 3) * 4,
    fill: fills[idx % fills.length] ?? '#f9a8d4',
    duration: `${9.8 + (idx % 5) * 1.9}s`,
    delay: `${(idx % 9) * 1.15}s`,
    sway: `${(idx % 2 === 0 ? -1 : 1) * (34 + (idx % 4) * 10)}px`,
    endX: `${-40 - (idx % 4) * 18}px`,
  }
})

// 10 Lentera Kertas Emas Bercahaya Melayang ke Atas khusus Sakura Lantern Festival
const skyLanterns = Array.from({ length: 10 }, (_, idx) => ({
  left: `${6 + (idx * 9.6) % 88}%`,
  size: 24 + (idx % 3) * 8,
  duration: `${16 + (idx % 4) * 3.2}s`,
  delay: `${(idx % 5) * 2.8}s`,
  sway: `${(idx % 2 === 0 ? 1 : -1) * (16 + (idx % 3) * 8)}px`,
}))

// Partikel Debu Bintang Emas (Golden Stardust) mengikuti kursor khusus 👑 Astral Crystal Palace
interface GoldenDustParticle {
  id: number
  x: number
  y: number
  size: number
  gdx: string
  gdy: string
  isStar: boolean
}

const goldenDustTrail = ref<GoldenDustParticle[]>([])
let dustCounter = 0
let lastDustSpawnAt = 0

function handleAstralMouseMove(event: MouseEvent) {
  if (activeCozyTheme.value !== 'astral-palace' || isBatterySaverMode.value) return
  const now = performance.now()
  if (now - lastDustSpawnAt < 42) return
  lastDustSpawnAt = now

  const id = ++dustCounter
  const gdx = `${Math.round((Math.random() - 0.5) * 26)}px`
  const gdy = `${Math.round(10 + Math.random() * 20)}px`
  const size = id % 3 === 0 ? 12 : 6 + (id % 3) * 2

  goldenDustTrail.value = [
    ...goldenDustTrail.value.slice(-16),
    {
      id,
      x: event.clientX,
      y: event.clientY,
      size,
      gdx,
      gdy,
      isStar: id % 3 === 0,
    },
  ]

  setTimeout(() => {
    goldenDustTrail.value = goldenDustTrail.value.filter(p => p.id !== id)
  }, 920)
}

onMounted(() => {
  if (import.meta.client && window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('mousemove', handleAstralMouseMove, { passive: true })
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('mousemove', handleAstralMouseMove)
  }
})
</script>

<template>
  <!-- LAPISAN 1 (z-0): Langit gradasi & efek atmosfer 5 Cozy Themes (pointer-events-none di belakang kartu utama) -->
  <div
    aria-hidden="true"
    class="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-gradient-to-br transition-colors duration-700"
    :class="activeBg.gradient"
  >
    <!-- Cahaya kabut pastel / suasana kamar malam -->
    <div
      class="absolute -left-24 -top-24 h-80 w-80 rounded-full blur-3xl transition-colors duration-700"
      :class="activeBg.orb1"
    />
    <div
      class="absolute -right-24 top-1/4 h-96 w-96 rounded-full blur-3xl transition-colors duration-700"
      :class="activeBg.orb2"
    />
    <div
      class="absolute bottom-0 left-1/3 h-80 w-80 rounded-full blur-3xl transition-colors duration-700"
      :class="activeBg.orb3"
    />

    <!-- === EFEK KHUSUS TEMA 5: 👑 ASTRAL CRYSTAL PALACE (Aurora Borealis + Bulan Sabit Perak Besar) === -->
    <Transition
      enter-active-class="transition duration-700 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-500 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="activeCozyTheme === 'astral-palace'"
        class="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <!-- Pita Aurora Borealis Hijau Zamrud, Biru Cyan, & Ungu Kristal -->
        <div
          class="animate-aurora-wave absolute -left-[15%] -top-10 h-[44vh] w-[130%] rounded-full bg-gradient-to-r from-emerald-400/25 via-cyan-300/25 to-purple-500/25 blur-3xl"
          style="--aurora-duration: 14s; --aurora-delay: 0s"
        />
        <div
          class="animate-aurora-wave absolute -left-[10%] top-[10%] h-[36vh] w-[120%] rounded-full bg-gradient-to-r from-purple-500/20 via-emerald-300/25 to-cyan-400/25 blur-3xl"
          style="--aurora-duration: 18s; --aurora-delay: 3.5s"
        />
        <div
          class="animate-aurora-wave absolute left-[5%] top-[2%] h-[28vh] w-[90%] rounded-full bg-gradient-to-r from-cyan-300/20 via-fuchsia-400/18 to-amber-200/15 blur-2xl"
          style="--aurora-duration: 12s; --aurora-delay: 1.8s"
        />

        <!-- Bulan Sabit Perak Bercahaya Megah di Sudut Langit Atas -->
        <div class="absolute right-[8%] top-[7%] sm:right-[11%] sm:top-[6%]">
          <div class="relative flex items-center justify-center">
            <div class="absolute h-28 w-28 rounded-full bg-sky-100/15 blur-2xl sm:h-36 sm:w-36" />
            <svg
              class="relative h-20 w-20 drop-shadow-[0_0_24px_rgba(226,232,240,0.85)] sm:h-24 sm:w-24"
              viewBox="0 0 80 80"
              fill="none"
            >
              <path
                d="M52 10C37 12.5 26 25.5 26 41C26 54 34.5 65 46.5 69.5C31 70.5 16 58 14.5 42C12.8 25 25 10 42.5 8.5C45.8 8.2 49 8.8 52 10Z"
                fill="url(#astralSilverMoon)"
              />
              <path
                d="M50 24 L51.8 29 L56.8 30.8 L51.8 32.6 L50 37.6 L48.2 32.6 L43.2 30.8 L48.2 29 Z"
                fill="#fef08a"
              />
              <circle cx="58" cy="44" r="2.2" fill="#e0f2fe" opacity="0.9" />
              <defs>
                <linearGradient id="astralSilverMoon" x1="14" y1="8" x2="52" y2="70" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#ffffff" />
                  <stop offset="0.55" stop-color="#e2e8f0" />
                  <stop offset="1" stop-color="#cbd5e1" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </Transition>

    <!-- === EFEK KHUSUS TEMA 2: 🌧️ MIDNIGHT RAINY WINDOW (Lampu Kota Bokeh Emas & Biru) === -->
    <Transition
      enter-active-class="transition duration-700 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-500 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="activeCozyTheme === 'midnight-rain'"
        class="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <!-- Kilau tipis kaca jendela malam di tepi atas -->
        <div class="absolute inset-0 bg-gradient-to-b from-sky-200/[0.04] via-transparent to-amber-300/[0.06]" />
        <!-- Lampu kota blur (bokeh emas & biru lembut) di kejauhan -->
        <span
          v-for="(bokeh, idx) in cityBokehLights"
          :key="`bokeh-${idx}`"
          class="animate-bokeh-float absolute rounded-full blur-md"
          :class="bokeh.color"
          :style="{
            bottom: bokeh.bottom,
            left: bokeh.left,
            width: `${bokeh.size}px`,
            height: `${bokeh.size}px`,
            '--bokeh-opacity': bokeh.opacity,
            '--bokeh-duration': bokeh.duration,
            '--bokeh-delay': bokeh.delay,
            '--bokeh-dx': bokeh.dx,
          }"
        />
      </div>
    </Transition>

    <!-- === EFEK KHUSUS TEMA 3: 🍂 COZY AUTUMN CAFE (Daun Gugur Berputar & Partikel Cahaya Sore) === -->
    <Transition
      enter-active-class="transition duration-700 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-500 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="activeCozyTheme === 'autumn-cafe'"
        class="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <!-- Sorot sinar mentari sore hangat dari sudut kiri atas -->
        <div
          class="absolute -left-24 -top-24 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-amber-300/20 via-orange-400/10 to-transparent blur-3xl"
        />

        <!-- Partikel cahaya kafe sore lembut -->
        <span
          v-for="(mote, idx) in cafeWarmMotes"
          :key="`mote-${idx}`"
          class="animate-warm-mote absolute rounded-full bg-amber-200/80 shadow-[0_0_10px_rgba(251,191,36,0.75)] blur-[0.5px]"
          :style="{
            top: mote.top,
            left: mote.left,
            width: `${mote.size}px`,
            height: `${mote.size}px`,
            '--mote-duration': mote.duration,
            '--mote-delay': mote.delay,
          }"
        />

        <!-- Daun musim gugur melayang berputar perlahan -->
        <template v-if="!isBatterySaverMode">
          <svg
            v-for="(leaf, idx) in autumnLeaves"
            :key="`leaf-${idx}`"
            class="animate-leaf-fall absolute top-0 opacity-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.28)]"
            :style="{
              left: leaf.left,
              width: `${leaf.size}px`,
              height: `${leaf.size}px`,
              '--leaf-duration': leaf.duration,
              '--leaf-delay': leaf.delay,
              '--leaf-sway': leaf.sway,
              '--leaf-end-x': leaf.endX,
            }"
            viewBox="0 0 28 28"
            fill="none"
          >
            <path
              d="M14 2 C18 7, 24 10, 23 16 C22 21, 17 23, 14 25 C11 23, 6 21, 5 16 C4 10, 10 7, 14 2 Z"
              :fill="leaf.color"
            />
            <path d="M14 5 V26" stroke="#7c2d12" stroke-width="1.2" stroke-linecap="round" opacity="0.55" />
          </svg>
        </template>
      </div>
    </Transition>

    <!-- === EFEK KHUSUS TEMA 4: 🌸 SAKURA LANTERN FESTIVAL (Kelopak Sakura + Lentera Kertas Emas) === -->
    <Transition
      enter-active-class="transition duration-700 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-500 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="activeCozyTheme === 'sakura-lantern'"
        class="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <template v-if="!isBatterySaverMode">
          <!-- Lentera kertas emas bercahaya terbang perlahan ke atas -->
          <div
            v-for="(lantern, idx) in skyLanterns"
            :key="`lantern-${idx}`"
            class="animate-lantern-rise absolute bottom-0 opacity-0"
            :style="{
              left: lantern.left,
              '--lantern-duration': lantern.duration,
              '--lantern-delay': lantern.delay,
              '--lantern-sway': lantern.sway,
            }"
          >
            <svg
              :style="{ width: `${lantern.size}px`, height: `${Math.round(lantern.size * 1.25)}px` }"
              class="drop-shadow-[0_0_14px_rgba(251,191,36,0.75)]"
              viewBox="0 0 36 46"
              fill="none"
            >
              <!-- Cahaya halo hangat di sekitar lentera -->
              <ellipse cx="18" cy="22" rx="15" ry="18" fill="#fbbf24" opacity="0.22" />
              <!-- Badan lentera kertas emas -->
              <path
                d="M9 11 C9 6, 27 6, 27 11 L29 29 C29 34, 24 37, 18 37 C12 37, 7 34, 7 29 Z"
                fill="url(#sakuraLanternGlow)"
                stroke="#fef08a"
                stroke-width="1"
              />
              <!-- Lidah api hangat di bagian bawah lentera -->
              <ellipse cx="18" cy="31" rx="4.2" ry="5" fill="#fffbeb" opacity="0.92" />
              <line x1="12" y1="37" x2="24" y2="37" stroke="#b45309" stroke-width="1.6" stroke-linecap="round" />
              <defs>
                <linearGradient id="sakuraLanternGlow" x1="18" y1="6" x2="18" y2="37" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#f59e0b" />
                  <stop offset="0.55" stop-color="#fbbf24" />
                  <stop offset="1" stop-color="#fef08a" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <!-- Kelopak bunga sakura pink melayang berputar -->
          <svg
            v-for="(petal, idx) in sakuraPetals"
            :key="`petal-${idx}`"
            class="animate-petal-fall absolute top-0 opacity-0 drop-shadow-[0_0_6px_rgba(249,168,212,0.55)]"
            :style="{
              left: petal.left,
              width: `${petal.size}px`,
              height: `${petal.size}px`,
              '--petal-duration': petal.duration,
              '--petal-delay': petal.delay,
              '--petal-sway': petal.sway,
              '--petal-end-x': petal.endX,
            }"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M12 2 C15 6, 20 11, 18 17 C16.5 21, 13.5 21.5, 12 18.8 C10.5 21.5, 7.5 21, 6 17 C4 11, 9 6, 12 2 Z"
              :fill="petal.fill"
            />
          </svg>
        </template>
      </div>
    </Transition>

    <!-- Awan Malam Lembut Mengambang -->
    <svg
      class="animate-cloud-drift absolute -left-8 top-[30%] w-48 opacity-25 drop-shadow-[0_4px_16px_rgba(233,213,255,0.2)] sm:w-64"
      style="--drift-x: 32px; --drift-duration: 15s; --drift-delay: 0s"
      viewBox="0 0 200 90"
      fill="none"
    >
      <path
        d="M42 74 H158 C174 74 186 63 186 49 C186 36 176 26 162 25 C158 11 144 4 128 8 C118 2 102 2 92 12 C78 6 60 14 56 30 C40 31 28 42 28 54 C28 65 34 74 42 74 Z"
        :fill="activeBg.cloudFill"
      />
      <circle cx="72" cy="48" r="2.5" fill="#ffffff" opacity="0.85" />
      <circle cx="136" cy="36" r="2" fill="#fef08a" opacity="0.9" />
    </svg>

    <svg
      class="animate-cloud-drift absolute -right-10 bottom-[10%] w-56 opacity-25 drop-shadow-[0_4px_16px_rgba(233,213,255,0.2)] sm:w-72"
      style="--drift-x: -36px; --drift-duration: 18s; --drift-delay: 2s"
      viewBox="0 0 220 96"
      fill="none"
    >
      <path
        d="M36 78 H182 C198 78 208 67 208 54 C208 42 198 33 184 32 C178 16 160 8 144 15 C132 6 112 6 100 18 C84 10 64 19 59 35 C42 36 30 47 30 59 C30 70 33 78 36 78 Z"
        :fill="activeBg.cloudFill"
      />
      <path d="M114 44 L116 49 L121 51 L116 53 L114 58 L112 53 L107 51 L112 49 Z" fill="#ffffff" opacity="0.9" />
    </svg>

    <svg
      class="animate-cloud-drift absolute bottom-[3%] left-[10%] hidden w-52 opacity-20 md:block"
      style="--drift-x: 26px; --drift-duration: 16s; --drift-delay: 4s"
      viewBox="0 0 200 84"
      fill="none"
    >
      <path
        d="M34 68 H164 C178 68 188 59 188 47 C188 36 178 27 166 26 C160 13 144 7 130 13 C118 6 101 8 92 18 C78 13 61 21 57 35 C42 36 30 45 30 55 C30 63 32 68 34 68 Z"
        :fill="activeBg.cloudFill"
      />
    </svg>

    <!-- Efek Visual Rintik Hujan Miring Halus (aktif di Midnight Rainy Window ATAU saat Hujan BGM menyala) -->
    <Transition
      enter-active-class="transition duration-700 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-500 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showRainLayer" class="pointer-events-none absolute inset-0 overflow-hidden">
        <span
          v-for="(drop, idx) in rainDrops"
          :key="`rain-${idx}`"
          class="animate-rain-drop absolute top-0 w-[1.5px] rounded-full bg-gradient-to-b"
          :class="
            activeCozyTheme === 'midnight-rain'
              ? 'from-transparent via-sky-200/80 to-blue-100/95'
              : 'from-transparent via-sky-100/75 to-pink-100/90'
          "
          :style="{
            left: drop.left,
            height: drop.height,
            '--rain-duration': drop.duration,
            '--rain-delay': drop.delay,
          }"
        />
      </div>
    </Transition>

    <!-- Titik-titik bintang kecil berkelip halus -->
    <span
      v-for="(star, index) in tinyStars"
      :key="`dot-${index}`"
      class="animate-twinkle absolute rounded-full bg-white/95 shadow-[0_0_6px_rgba(255,255,255,0.85)]"
      :class="activeCozyTheme === 'autumn-cafe' ? 'opacity-45' : 'opacity-100'"
      :style="{
        top: star.top,
        left: star.left,
        width: `${star.size}px`,
        height: `${star.size}px`,
        '--twinkle-duration': star.duration,
        '--twinkle-delay': star.delay,
      }"
    />

    <!-- Bintang sparkle 4-sisi -->
    <svg
      v-for="(sparkle, index) in sparkles"
      :key="`sparkle-${index}`"
      class="animate-twinkle absolute"
      :style="{
        top: sparkle.top,
        left: sparkle.left,
        width: `${sparkle.size}px`,
        height: `${sparkle.size}px`,
        '--twinkle-duration': '4s',
        '--twinkle-delay': sparkle.delay,
      }"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"
        :fill="activeCozyTheme === 'astral-palace' ? '#fef08a' : sparkle.color"
      />
    </svg>
  </div>

  <!-- LAPISAN 2 (z-20, tembus klik / pointer-events-none): Bintang Jatuh, Hiasan Gantung & Debu Bintang Emas -->
  <div
    aria-hidden="true"
    class="pointer-events-none fixed inset-0 z-20 overflow-hidden"
  >
    <!-- 1. Hiasan Gantung Kiri Atas (Bulan Sabit + Bintang + Awan Mungil) -->
    <div class="absolute left-2 top-0 flex items-start gap-3 opacity-90 sm:left-5 sm:gap-5">
      <div
        class="animate-gentle-sway flex flex-col items-center"
        style="--sway-duration: 5.4s; --sway-delay: 0.2s"
      >
        <div class="h-6 w-[1.5px] bg-gradient-to-b from-white/70 to-pink-200 sm:h-10" />
        <svg class="-mt-1 h-8 w-8 drop-shadow-[0_0_12px_rgba(254,240,138,0.75)] sm:h-9 sm:w-9" viewBox="0 0 40 40" fill="none">
          <path
            d="M25 6C17.5 7.5 12 14 12 21.5C12 28 16.5 33.5 22.5 35.5C14.8 36 7.5 29.8 6.5 22C5.5 13.5 11.8 6 20.5 5.2C22.2 5 23.8 5.4 25 6Z"
            :fill="activeBg.moon"
          />
          <path d="M27 18 L28.4 21.6 L32 23 L28.4 24.4 L27 28 L25.6 24.4 L22 23 L25.6 21.6 Z" :fill="activeBg.charmAccent" />
        </svg>
      </div>

      <div
        class="animate-gentle-sway hidden flex-col items-center sm:flex"
        style="--sway-duration: 4.6s; --sway-delay: 1.1s"
      >
        <div class="h-5 w-[1.5px] bg-gradient-to-b from-white/60 to-pink-200" />
        <svg class="-mt-0.5 h-6 w-6 drop-shadow-[0_0_10px_rgba(249,168,212,0.85)]" viewBox="0 0 32 32" fill="none">
          <path
            d="M16 3 L19.4 11.2 L28.2 12 L21.5 17.8 L23.5 26.5 L16 21.9 L8.5 26.5 L10.5 17.8 L3.8 12 L12.6 11.2 Z"
            :fill="activeBg.charmAccent"
            stroke="#ffffff"
            stroke-width="1.2"
            stroke-linejoin="round"
          />
        </svg>
      </div>

      <div
        class="animate-gentle-sway hidden flex-col items-center xl:flex"
        style="--sway-duration: 6.1s; --sway-delay: 0.7s"
      >
        <div class="h-12 w-[1.5px] bg-gradient-to-b from-white/60 to-white/85" />
        <svg class="-mt-1 h-9 w-12 drop-shadow-[0_0_10px_rgba(233,213,255,0.65)]" viewBox="0 0 56 42" fill="none">
          <path
            d="M12 24 H44 C49 24 52 21 52 17 C52 13 49 10 45 10 C43 5 38 3 33 5 C29 2 23 3 20 7 C15 6 10 9 10 14 C7 15 6 17 6 19 C6 22 8.5 24 12 24 Z"
            :fill="activeBg.cloudFill"
          />
          <circle cx="19" cy="31" r="2.2" :fill="activeBg.charmAccent" />
          <circle cx="28" cy="35" r="2.4" :fill="activeBg.moon" />
          <circle cx="37" cy="31" r="2.2" :fill="activeBg.charmAccent" />
        </svg>
      </div>
    </div>

    <!-- 2. Hiasan Gantung Kanan Atas -->
    <div class="absolute right-2 top-0 flex items-start gap-3 opacity-90 sm:right-5 sm:gap-5">
      <div
        class="animate-gentle-sway hidden flex-col items-center xl:flex"
        style="--sway-duration: 5.8s; --sway-delay: 1.4s"
      >
        <div class="h-9 w-[1.5px] bg-gradient-to-b from-white/60 to-white/85" />
        <svg class="-mt-1 h-8 w-11 drop-shadow-[0_0_10px_rgba(233,213,255,0.65)]" viewBox="0 0 56 42" fill="none">
          <path
            d="M12 24 H44 C49 24 52 21 52 17 C52 13 49 10 45 10 C43 5 38 3 33 5 C29 2 23 3 20 7 C15 6 10 9 10 14 C7 15 6 17 6 19 C6 22 8.5 24 12 24 Z"
            :fill="activeBg.cloudFill"
          />
          <path d="M28 28 L29.2 31.3 L32.5 32.5 L29.2 33.7 L28 37 L26.8 33.7 L23.5 32.5 L26.8 31.3 Z" :fill="activeBg.moon" />
        </svg>
      </div>

      <div
        class="animate-gentle-sway hidden flex-col items-center sm:flex"
        style="--sway-duration: 4.9s; --sway-delay: 0.5s"
      >
        <div class="h-11 w-[1.5px] bg-gradient-to-b from-white/65 to-pink-200" />
        <svg class="-mt-1 h-6 w-6 drop-shadow-[0_0_10px_rgba(249,168,212,0.85)]" viewBox="0 0 32 32" fill="none">
          <path
            d="M16 3 L19.4 11.2 L28.2 12 L21.5 17.8 L23.5 26.5 L16 21.9 L8.5 26.5 L10.5 17.8 L3.8 12 L12.6 11.2 Z"
            :fill="activeBg.charmAccent"
            stroke="#ffffff"
            stroke-width="1.2"
            stroke-linejoin="round"
          />
        </svg>
      </div>

      <div
        class="animate-gentle-sway flex flex-col items-center"
        style="--sway-duration: 6.2s; --sway-delay: 0.1s"
      >
        <div class="h-5 w-[1.5px] bg-gradient-to-b from-white/70 to-amber-100 sm:h-8" />
        <svg
          class="-mt-1 h-11 w-11 drop-shadow-[0_0_16px_rgba(253,230,138,0.75)] sm:h-12 sm:w-12"
          viewBox="0 0 64 64"
          fill="none"
        >
          <path
            d="M42 8C30 10 21 20.5 21 33C21 43.5 27.8 52.5 37.5 56C25 56.8 13 46.8 11.5 34C10 20.2 20 8 34 6.8C36.8 6.5 39.5 7 42 8Z"
            :fill="activeBg.moon"
          />
          <line x1="36" y1="15" x2="36" y2="27" stroke="#ffffff" stroke-width="1.4" opacity="0.85" />
          <path
            d="M36 25 L37.8 29.8 L42.8 31.5 L37.8 33.2 L36 38 L34.2 33.2 L29.2 31.5 L34.2 29.8 Z"
            :fill="activeBg.charmAccent"
          />
        </svg>
      </div>
    </div>

    <!-- 3. EFEK BINTANG JATUH (dijeda saat Mode Hemat Baterai aktif) -->
    <template v-if="!isBatterySaverMode">
      <div
        v-for="(meteor, idx) in displayedShootingStars"
        :key="`meteor-${idx}`"
        class="animate-shooting-star absolute flex items-center opacity-0"
        :style="{
          top: meteor.top,
          left: meteor.left,
          width: meteor.width,
          '--shoot-duration': meteor.duration,
          '--shoot-delay': meteor.delay,
        }"
      >
        <svg
          class="-mr-1 h-4 w-4 shrink-0 drop-shadow-[0_0_10px_rgba(255,255,255,0.95)]"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
            :fill="activeCozyTheme === 'astral-palace' ? '#fef08a' : '#ffffff'"
          />
        </svg>
        <span
          class="h-[3px] flex-1 rounded-full bg-gradient-to-r shadow-[0_0_10px_rgba(249,168,212,0.8)]"
          :class="activeBg.tailGradient"
        />
      </div>
    </template>

    <!-- 4. PARTIKEL DEBU BINTANG EMAS (Golden Stardust) mengikuti kursor di tema 👑 Astral Crystal Palace -->
    <template v-if="activeCozyTheme === 'astral-palace' && !isBatterySaverMode">
      <div
        v-for="dust in goldenDustTrail"
        :key="dust.id"
        class="animate-gold-dust pointer-events-none fixed"
        :style="{
          left: `${dust.x}px`,
          top: `${dust.y}px`,
          '--gdx': dust.gdx,
          '--gdy': dust.gdy,
        }"
      >
        <svg
          v-if="dust.isStar"
          :style="{ width: `${dust.size}px`, height: `${dust.size}px` }"
          class="drop-shadow-[0_0_8px_rgba(253,224,71,0.95)]"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="#fde047" />
        </svg>
        <span
          v-else
          class="block rounded-full bg-amber-200 shadow-[0_0_8px_rgba(253,224,71,0.9)]"
          :style="{ width: `${dust.size}px`, height: `${dust.size}px` }"
        />
      </div>
    </template>
  </div>
</template>
